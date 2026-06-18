(function (global) {
	'use strict';

	const PROTO = 1;
	const pending = new Map();
	let pollAfterSeq = 0;
	let pollLoopActive = false;
	const dataListeners = new Set();

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

	function normalizePollMessage(msg) {
		return {
			seq: msg.seq,
			payload: parsePayload(msg.payloadJson ?? msg.payload),
			timestamp: msg.timestamp,
		};
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

		const messages = (data.messages || []).map(normalizePollMessage);
		return {
			messages,
			lastSeq: data.lastSeq ?? afterSeq ?? 0,
		};
	}

	function deliverPollMessages(messages) {
		if (!messages.length) return;
		for (const msg of messages) {
			for (const cb of dataListeners) {
				try { cb(msg.payload, msg); } catch (err) { console.warn('[SupraMiniApp] onData', err); }
			}
		}
	}

	function startPollLoop() {
		if (pollLoopActive) return;
		pollLoopActive = true;

		(async function loop() {
			while (pollLoopActive) {
				try {
					const result = await pollDataInternal(pollAfterSeq, 25000);
					if (result.messages.length) {
						pollAfterSeq = result.lastSeq;
						deliverPollMessages(result.messages);
					}
				} catch (err) {
					if (dataListeners.size === 0) {
						pollLoopActive = false;
						break;
					}
					await sleepMs(1000);
				}
			}
		})();
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
		ready() { post('ready'); },
		close() { post('close'); },
		sendData(payload) { return request('sendData', payload); },
		getUser() { return request('getUser'); },
		getContext() { return request('getContext'); },
		getInitData() { return cfg().initData ?? null; },
		/** Long-poll сообщений от бота. afterSeq — с какого seq продолжать (default: последний полученный). */
		async pollData(options) {
			const afterSeq = options?.afterSeq ?? pollAfterSeq;
			const timeoutMs = options?.timeoutMs ?? 25000;
			const result = await pollDataInternal(afterSeq, timeoutMs);
			if (result.messages.length) pollAfterSeq = result.lastSeq;
			return result;
		},
		/** Подписка на сообщения от бота (фоновый long-poll). Возвращает функцию отписки. */
		onData(callback) {
			if (typeof callback !== 'function') throw new Error('callback required');
			dataListeners.add(callback);
			startPollLoop();
			return () => {
				dataListeners.delete(callback);
				if (dataListeners.size === 0) pollLoopActive = false;
			};
		},
	};
})(typeof window !== 'undefined' ? window : globalThis);
