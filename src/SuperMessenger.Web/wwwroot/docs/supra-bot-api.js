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

		/**
		 * @param {{ onMessage?: Function, onConnected?: Function, onError?: Function, onClose?: Function }} handlers
		 */
		connectWebSocket(handlers) {
			this.disconnectWebSocket();
			const u = new URL(wsUrlFromBase(this.baseUrl));
			u.searchParams.set('login', this.login);
			u.searchParams.set('token', this.token);

			const ws = new WebSocket(u.toString());
			this._ws = ws;

			ws.onopen = () => {
				if (handlers && handlers.onConnected) handlers.onConnected();
			};

			ws.onmessage = (ev) => {
				let msg;
				try {
					msg = JSON.parse(ev.data);
				} catch {
					return;
				}
				if (msg.type === 'message' && msg.update && handlers && handlers.onMessage) {
					handlers.onMessage(msg.update, msg);
				}
				if (msg.type === 'connected' && handlers && handlers.onConnected) {
					handlers.onConnected(msg);
				}
			};

			ws.onerror = (e) => {
				if (handlers && handlers.onError) handlers.onError(e);
			};

			ws.onclose = (e) => {
				if (handlers && handlers.onClose) handlers.onClose(e);
				if (this._ws === ws) this._ws = null;
			};

			return ws;
		}

		disconnectWebSocket() {
			if (this._ws) {
				try {
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
	}

	global.SupraBotApi = SupraBotApi;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
