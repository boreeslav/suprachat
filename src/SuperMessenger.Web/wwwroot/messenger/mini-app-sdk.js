(function (global) {
	'use strict';

	const PROTO = 1;
	const pending = new Map();
	const pendingData = new Map();
	const dataListeners = new Set();

	let ws = null;
	let wsAfterSeq = 0;
	let wsConnectPromise = null;
	let wsReconnectTimer = null;

	function cfg() {
		return global.__SUPRA_MINI_APP__ || {};
	}

	function post(type, payload, requestId) {
		global.parent.postMessage({
			v: PROTO,
			type,
			requestId: requestId || null,
			payload: payload ?? null,
		}, global.location.origin);
	}

	function request(type, payload) {
		return new Promise((resolve, reject) => {
			const requestId = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2);
			pending.set(requestId, { resolve, reject });
			post(type, payload, requestId);
			setTimeout(() => {
				if (pending.has(requestId)) {
					pending.delete(requestId);
					reject(new Error('timeout'));
				}
			}, 15000);
		});
	}

	function sleepMs(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function parsePayload(raw) {
		if (raw == null || raw === '') return null;
		if (typeof raw === 'object') return raw;
		try {
			return JSON.parse(String(raw));
		} catch {
			return raw;
		}
	}

	function wsUrl() {
		const token = cfg().token;
		if (!token) throw new Error('no session token');
		const scheme = global.location.protocol === 'https:' ? 'wss' : 'ws';
		return scheme + '://' + global.location.host + '/ws/mini-app?token=' + encodeURIComponent(token);
	}

	function scheduleReconnect() {
		if (wsReconnectTimer || dataListeners.size === 0) return;
		wsReconnectTimer = setTimeout(() => {
			wsReconnectTimer = null;
			if (dataListeners.size > 0) {
				ensureWs().catch(() => scheduleReconnect());
			}
		}, 1500);
	}

	function handleWsMessage(msg) {
		if (!msg || typeof msg !== 'object') return;

		if (msg.type === 'data') {
			if (typeof msg.seq === 'number' && msg.seq > wsAfterSeq) {
				wsAfterSeq = msg.seq;
			}
			const payload = msg.payload != null ? msg.payload : parsePayload(msg.payloadJson);
			for (const cb of dataListeners) {
				try {
					cb(payload, {
						seq: msg.seq,
						payload: payload,
						timestamp: msg.timestamp,
					});
				} catch (err) {
					console.warn('[SupraMiniApp] onData', err);
				}
			}
			return;
		}

		if (msg.type === 'dataAck' && msg.requestId) {
			const slot = pendingData.get(msg.requestId);
			if (!slot) return;
			pendingData.delete(msg.requestId);
			if (msg.success) slot.resolve({ ok: true });
			else slot.reject(new Error(msg.error || 'send failed'));
		}
	}

	function ensureWs() {
		if (ws && ws.readyState === WebSocket.OPEN) {
			return Promise.resolve();
		}

		if (wsConnectPromise) return wsConnectPromise;

		wsConnectPromise = new Promise((resolve, reject) => {
			try {
				ws = new WebSocket(wsUrl());
			} catch (err) {
				wsConnectPromise = null;
				reject(err);
				return;
			}

			ws.onopen = () => {
				wsConnectPromise = null;
				resolve();
			};

			ws.onerror = () => {
				// onclose will handle cleanup
			};

			ws.onclose = () => {
				wsConnectPromise = null;
				ws = null;
				scheduleReconnect();
			};

			ws.onmessage = (event) => {
				let msg;
				try {
					msg = JSON.parse(String(event.data || ''));
				} catch {
					return;
				}
				handleWsMessage(msg);
			};
		});

		return wsConnectPromise;
	}

	async function sendDataViaWs(payload) {
		await ensureWs();
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			throw new Error('websocket not connected');
		}

		const requestId = 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2);
		return new Promise((resolve, reject) => {
			pendingData.set(requestId, { resolve, reject });
			ws.send(JSON.stringify({ type: 'data', requestId, payload: payload ?? {} }));
			setTimeout(() => {
				if (pendingData.has(requestId)) {
					pendingData.delete(requestId);
					reject(new Error('timeout'));
				}
			}, 15000);
		});
	}

	async function pollDataInternal(afterSeq, timeoutMs) {
		const token = cfg().token;
		if (!token) throw new Error('no session token');

		const url = '/api/mini-app/poll?token=' + encodeURIComponent(token)
			+ '&afterSeq=' + encodeURIComponent(String(afterSeq ?? 0))
			+ '&timeoutMs=' + encodeURIComponent(String(timeoutMs ?? 25000));

		const res = await fetch(url);
		const data = await res.json().catch(() => ({}));
		if (!res.ok || !data.success) {
			throw new Error(data.error || 'poll failed');
		}

		const messages = (data.messages || []).map((msg) => ({
			seq: msg.seq,
			payload: parsePayload(msg.payloadJson ?? msg.payload),
			timestamp: msg.timestamp,
		}));
		return {
			messages,
			lastSeq: data.lastSeq ?? afterSeq ?? 0,
		};
	}

	global.addEventListener('message', (event) => {
		if (event.source !== global.parent) return;
		const data = event.data;
		if (!data || data.v !== PROTO || !data.requestId) return;
		const slot = pending.get(data.requestId);
		if (!slot) return;
		pending.delete(data.requestId);
		if (data.error) slot.reject(new Error(data.error));
		else slot.resolve(data.payload);
	});

	global.SupraMiniApp = {
		ready() {
			post('ready');
			if (dataListeners.size > 0) {
				ensureWs().catch(() => scheduleReconnect());
			}
		},
		close() {
			if (wsReconnectTimer) {
				clearTimeout(wsReconnectTimer);
				wsReconnectTimer = null;
			}
			if (ws) {
				try { ws.close(); } catch { /* ignore */ }
				ws = null;
			}
			post('close');
		},
		async sendData(payload) {
			try {
				return await sendDataViaWs(payload);
			} catch {
				return request('sendData', payload);
			}
		},
		getUser() { return request('getUser'); },
		getContext() { return request('getContext'); },
		getInitData() { return cfg().initData ?? null; },
		/** Fallback long-poll (если WebSocket недоступен). */
		async pollData(options) {
			const afterSeq = options?.afterSeq ?? wsAfterSeq;
			const timeoutMs = options?.timeoutMs ?? 25000;
			const result = await pollDataInternal(afterSeq, timeoutMs);
			if (result.messages.length) wsAfterSeq = result.lastSeq;
			return result;
		},
		/** Подписка на сообщения от бота через WebSocket. */
		onData(callback) {
			if (typeof callback !== 'function') throw new Error('callback required');
			dataListeners.add(callback);
			ensureWs().catch(() => scheduleReconnect());
			return () => {
				dataListeners.delete(callback);
			};
		},
	};
})(typeof window !== 'undefined' ? window : globalThis);
