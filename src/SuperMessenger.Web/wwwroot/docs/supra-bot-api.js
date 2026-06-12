/**
 * SupraMessenger Bot API — клиент для REST и WebSocket.
 * @see /docs/bots.html
 */
(function (global) {
	'use strict';

	function joinUrl(base, path) {
		return String(base || '').replace(/\/+$/, '') + '/' + String(path || '').replace(/^\/+/, '');
	}

	function wsUrlFromBase(base) {
		const u = new URL(String(base || window.location.origin));
		u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
		u.pathname = '/ws/bot';
		u.search = '';
		u.hash = '';
		return u.toString().replace(/\/$/, '');
	}

	class SupraBotApi {
		/**
		 * @param {{ baseUrl?: string, login: string, token: string }} options
		 */
		constructor(options) {
			if (!options || !options.login || !options.token) {
				throw new Error('SupraBotApi: login и token обязательны');
			}
			this.baseUrl = options.baseUrl || (typeof location !== 'undefined' ? location.origin : '');
			this.login = options.login;
			this.token = options.token;
			this._ws = null;
			this._wsHandlers = null;
			this._wsOptions = null;
			this._wsManualClose = false;
			this._wsReconnectTimer = null;
			this._wsReconnectAttempt = 0;
			this._wsLastInboxId = null;
			this._wsSeenIds = new Set();
			this._wsSyncing = false;
			this._wsPendingMessages = [];
		}

		_authQuery() {
			return new URLSearchParams({ login: this.login, token: this.token }).toString();
		}

		async _request(path, params, method) {
			const m = (method || 'GET').toUpperCase();
			let url = joinUrl(this.baseUrl, 'api/bot-api/' + path) + '?' + this._authQuery();

			const init = { method: m, headers: {} };
			const payload = params || {};

			if (m === 'GET') {
				const qs = new URLSearchParams();
				Object.keys(payload).forEach((k) => {
					if (payload[k] != null && payload[k] !== '') qs.set(k, String(payload[k]));
				});
				const extra = qs.toString();
				if (extra) url += '&' + extra;
			} else {
				init.headers['Content-Type'] = 'application/json';
				init.body = JSON.stringify(payload);
			}

			const res = await fetch(url, init);
			const data = await res.json().catch(() => ({}));
			if (!res.ok && data && data.error) {
				const err = new Error(data.error);
				err.response = data;
				err.status = res.status;
				throw err;
			}
			return data;
		}

		getMe() {
			return this._request('me', {}, 'GET');
		}

		/**
		 * @param {{ text: string, userLogin?: string, chatId?: string }} params
		 */
		sendMessage(params) {
			return this._request('sendMessage', params, 'POST');
		}

		/**
		 * @param {{ count?: number, offset?: number, afterMessageId?: string }} params
		 */
		getMessages(params) {
			return this._request('getMessages', params || {}, 'GET');
		}

		_clearWsReconnectTimer() {
			if (this._wsReconnectTimer) {
				clearTimeout(this._wsReconnectTimer);
				this._wsReconnectTimer = null;
			}
		}

		_scheduleWsReconnect() {
			if (this._wsManualClose || !this._wsOptions || !this._wsOptions.reconnect) return;
			this._clearWsReconnectTimer();
			const minDelay = this._wsOptions.reconnectMinDelay || 1000;
			const maxDelay = this._wsOptions.reconnectMaxDelay || 30000;
			const attempt = ++this._wsReconnectAttempt;
			const delay = Math.min(maxDelay, minDelay * Math.pow(2, attempt - 1));
			const handlers = this._wsHandlers;
			if (handlers && handlers.onReconnect) handlers.onReconnect(attempt, delay);
			this._wsReconnectTimer = setTimeout(() => {
				this._wsReconnectTimer = null;
				this._openWebSocket();
			}, delay);
		}

		_noteInboxMessage(update) {
			if (!update || !update.id) return;
			this._wsLastInboxId = update.id;
			this._wsSeenIds.add(update.id);
		}

		_deliverInboxMessage(update, envelope) {
			const handlers = this._wsHandlers;
			if (!handlers || !handlers.onMessage || !update) return;
			if (update.id && this._wsSeenIds.has(update.id)) return;
			this._noteInboxMessage(update);
			handlers.onMessage(update, envelope);
		}

		_flushPendingWsMessages() {
			const pending = this._wsPendingMessages;
			this._wsPendingMessages = [];
			for (const item of pending) {
				this._deliverInboxMessage(item.update, item.envelope);
			}
		}

		async _syncMissedMessages() {
			const handlers = this._wsHandlers;
			const options = this._wsOptions;
			if (!options || !options.syncMissed || !handlers || !handlers.onMessage) return;
			if (!this._wsLastInboxId) return;

			this._wsSyncing = true;
			if (handlers.onSyncStart) handlers.onSyncStart();
			let synced = 0;
			let afterId = this._wsLastInboxId;

			try {
				while (true) {
					const r = await this.getMessages({ count: 100, afterMessageId: afterId });
					const messages = (r && r.messages) || [];
					if (!messages.length) break;
					for (const update of messages) {
						if (update && update.id && !this._wsSeenIds.has(update.id)) {
							this._noteInboxMessage(update);
							handlers.onMessage(update, { type: 'sync' });
							synced++;
						}
						if (update && update.id) afterId = update.id;
					}
					if (messages.length < 100) break;
				}
			} catch (e) {
				if (handlers.onSyncError) handlers.onSyncError(e);
			} finally {
				this._wsSyncing = false;
				if (handlers.onSyncComplete) handlers.onSyncComplete(synced);
				this._flushPendingWsMessages();
			}
		}

		_openWebSocket() {
			if (this._ws) {
				try {
					this._ws.onopen = null;
					this._ws.onmessage = null;
					this._ws.onerror = null;
					this._ws.onclose = null;
					this._ws.close();
				} catch (_) {}
				this._ws = null;
			}

			const handlers = this._wsHandlers;
			const u = new URL(wsUrlFromBase(this.baseUrl));
			u.searchParams.set('login', this.login);
			u.searchParams.set('token', this.token);

			const ws = new WebSocket(u.toString());
			this._ws = ws;
			let connectedHandled = false;

			ws.onopen = () => {
				this._wsReconnectAttempt = 0;
			};

			ws.onmessage = (ev) => {
				let msg;
				try {
					msg = JSON.parse(ev.data);
				} catch {
					return;
				}

				if (msg.type === 'connected') {
					if (!connectedHandled) {
						connectedHandled = true;
						if (handlers && handlers.onConnected) handlers.onConnected(msg);
						this._syncMissedMessages();
					}
					return;
				}

				if (msg.type === 'message' && msg.update) {
					if (this._wsSyncing) {
						this._wsPendingMessages.push({ update: msg.update, envelope: msg });
						return;
					}
					this._deliverInboxMessage(msg.update, msg);
				}
			};

			ws.onerror = (e) => {
				if (handlers && handlers.onError) handlers.onError(e);
			};

			ws.onclose = (e) => {
				if (handlers && handlers.onClose) handlers.onClose(e);
				if (this._ws === ws) this._ws = null;
				if (!this._wsManualClose) this._scheduleWsReconnect();
			};
		}

		/**
		 * @param {{
		 *   onMessage?: Function,
		 *   onConnected?: Function,
		 *   onError?: Function,
		 *   onClose?: Function,
		 *   onReconnect?: Function,
		 *   onSyncStart?: Function,
		 *   onSyncComplete?: Function,
		 *   onSyncError?: Function
		 * }} handlers
		 * @param {{
		 *   reconnect?: boolean,
		 *   reconnectMinDelay?: number,
		 *   reconnectMaxDelay?: number,
		 *   syncMissed?: boolean,
		 *   lastInboxId?: string|null
		 * }} [options]
		 */
		connectWebSocket(handlers, options) {
			this.disconnectWebSocket();
			this._wsManualClose = false;
			this._wsHandlers = handlers || {};
			this._wsOptions = Object.assign({
				reconnect: true,
				reconnectMinDelay: 1000,
				reconnectMaxDelay: 30000,
				syncMissed: true,
			}, options || {});

			if (this._wsOptions.lastInboxId) {
				this._wsLastInboxId = this._wsOptions.lastInboxId;
				this._wsSeenIds.add(this._wsOptions.lastInboxId);
			} else {
				this._wsLastInboxId = null;
				this._wsSeenIds = new Set();
			}

			this._wsReconnectAttempt = 0;
			this._wsSyncing = false;
			this._wsPendingMessages = [];
			this._openWebSocket();
			return this._ws;
		}

		disconnectWebSocket() {
			this._wsManualClose = true;
			this._clearWsReconnectTimer();
			if (this._ws) {
				try {
					this._ws.onopen = null;
					this._ws.onmessage = null;
					this._ws.onerror = null;
					this._ws.onclose = null;
					this._ws.close();
				} catch (_) {}
				this._ws = null;
			}
		}

		pingWebSocket() {
			if (this._ws && this._ws.readyState === WebSocket.OPEN) {
				this._ws.send(JSON.stringify({ action: 'ping' }));
			}
		}

		/** Последний обработанный inbox-id (для сохранения между перезапусками). */
		getLastInboxId() {
			return this._wsLastInboxId;
		}
	}

	global.SupraBotApi = SupraBotApi;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
