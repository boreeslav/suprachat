(function (global) {
	'use strict';

	const PROTO = 1;
	let overlay = null;
	let iframe = null;
	let navHandle = null;
	let session = null;

	function resolveOrigin(baseOrigin) {
		const custom = (baseOrigin || '').trim().replace(/\/+$/, '');
		if (custom) return custom;
		return global.location.origin;
	}

	function ensureHostScripts() {
		const loads = [];
		if (!global.MiniAppCache) {
			loads.push(loadScript('/messenger/mini-app-cache.js'));
		}
		return Promise.all(loads);
	}

	function loadScript(src) {
		return new Promise((resolve, reject) => {
			const el = document.createElement('script');
			el.src = src;
			el.onload = () => resolve();
			el.onerror = () => reject(new Error('script load failed: ' + src));
			document.head.appendChild(el);
		});
	}

	async function createSession(messageId) {
		const res = await fetch('/api/mini-app/session', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messageId }),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok || !data.success) {
			throw new Error(data.error || 'Не удалось открыть mini app');
		}
		return data;
	}

	function buildFrameUrl(token, baseOrigin) {
		const origin = resolveOrigin(baseOrigin);
		return origin + '/api/mini-app/frame?token=' + encodeURIComponent(token);
	}

	function hideLoading() {
		overlay?.querySelector('.mini-app-host-loading')?.classList.add('mini-app-host-loading--hidden');
	}

	function isTrustedIframeMessage(event) {
		if (!iframe || event.source !== iframe.contentWindow) return false;
		const expected = resolveOrigin(session?.baseOrigin);
		const appOrigin = global.location.origin;
		return event.origin === expected
			|| event.origin === appOrigin
			|| event.origin === 'null';
	}

	function onIframeMessage(event) {
		if (!isTrustedIframeMessage(event)) return;

		const data = event.data;
		if (!data || data.v !== PROTO || !data.type) return;

		if (data.type === 'ready') {
			hideLoading();
			return;
		}
		if (data.type === 'close') {
			MiniAppHost.close(false);
			return;
		}
		if (data.type === 'sendData') {
			handleSendData(data.payload, data.requestId);
			return;
		}
		if (data.type === 'getUser' || data.type === 'getContext') {
			handleContextRequest(data.type, data.requestId);
		}
	}

	async function handleSendData(payload, requestId) {
		try {
			const res = await fetch('/api/mini-app/data', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: session?.token, payload }),
			});
			const data = await res.json().catch(() => ({}));
			replyIframe(requestId, null, data.success ? { ok: true } : null, data.error || 'send failed');
		} catch (err) {
			replyIframe(requestId, null, null, err?.message || 'send failed');
		}
	}

	async function handleContextRequest(type, requestId) {
		try {
			const res = await fetch('/api/mini-app/context?token=' + encodeURIComponent(session?.token || ''), {
				credentials: 'same-origin',
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error('context failed');
			if (type === 'getUser') {
				replyIframe(requestId, null, {
					userId: data.userId,
					displayName: data.displayName,
					avatarUrl: data.avatarUrl,
				});
			} else {
				replyIframe(requestId, null, {
					chatId: data.chatId,
					chatType: data.chatType,
					messageId: data.messageId,
					initData: data.initData,
					theme: document.documentElement.classList.contains('mapp-theme-dark') ? 'dark' : 'light',
				});
			}
		} catch (err) {
			replyIframe(requestId, null, null, err?.message || 'context failed');
		}
	}

	function replyIframe(requestId, type, payload, error) {
		if (!iframe?.contentWindow || !requestId) return;
		const origin = resolveOrigin(session?.baseOrigin);
		iframe.contentWindow.postMessage({
			v: PROTO,
			type,
			requestId,
			payload: payload ?? null,
			error: error || null,
		}, origin);
	}

	function teardown() {
		global.removeEventListener('message', onIframeMessage);
		overlay?.remove();
		overlay = null;
		iframe = null;
		session = null;
		navHandle = null;
	}

	const MiniAppHost = {
		async open(messageId, { title, baseOrigin, botName } = {}) {
			await ensureHostScripts();
			if (overlay) MiniAppHost.close(false);

			session = await createSession(messageId);
			session.title = title || session.title;
			session.baseOrigin = baseOrigin || session.baseOrigin;

			overlay = document.createElement('div');
			overlay.className = 'mapp-modal-overlay mapp-modal-overlay--fullscreen mini-app-host-overlay';

			const dialog = document.createElement('div');
			dialog.className = 'mini-app-host-dialog';

			const header = document.createElement('div');
			header.className = 'mini-app-host-header';
			const titleEl = document.createElement('div');
			titleEl.className = 'mini-app-host-title';
			titleEl.textContent = session.title || 'Mini App';
			const sub = document.createElement('div');
			sub.className = 'mini-app-host-sub';
			if (botName) sub.textContent = botName;
			const closeBtn = document.createElement('button');
			closeBtn.type = 'button';
			closeBtn.className = 'mini-app-host-close';
			closeBtn.setAttribute('aria-label', 'Закрыть');
			closeBtn.textContent = '×';
			closeBtn.addEventListener('click', () => MiniAppHost.close(true));
			header.append(titleEl, sub, closeBtn);

			const body = document.createElement('div');
			body.className = 'mini-app-host-body';
			const loading = document.createElement('div');
			loading.className = 'mini-app-host-loading';
			loading.textContent = 'Загрузка…';

			iframe = document.createElement('iframe');
			iframe.className = 'mini-app-host-frame';
			iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
			iframe.setAttribute('referrerpolicy', 'no-referrer');
			iframe.addEventListener('load', () => hideLoading());
			iframe.src = buildFrameUrl(session.token, session.baseOrigin);

			body.append(loading, iframe);
			dialog.append(header, body);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			global.addEventListener('message', onIframeMessage);

			if (global.MessengerNavigation?.pushOverlay) {
				navHandle = global.MessengerNavigation.pushOverlay(() => teardown(), {
					overlayKind: 'mini-app',
				});
			}
		},

		close(fromUser = false) {
			if (!overlay && !navHandle) return;
			if (navHandle) {
				if (fromUser) navHandle.close(true);
				else navHandle.closeImmediate();
				return;
			}
			teardown();
		},

		tryAutoOpen(msg, ctx) {
			if (!msg?.id || !msg?.text) return;
			const parsed = global.MessengerCustomMessage?.parse?.(msg.text);
			if (!parsed || parsed.contentType !== 'mini_app') return;
			const manifest = parsed.payload || {};
			if (!manifest.autoOpen) return;
			if (typeof global.MessengerNavigation?.hasOverlayLayers === 'function'
				&& global.MessengerNavigation.hasOverlayLayers()) return;
			if (ctx?.chatId && msg.chatId && ctx.chatId !== msg.chatId) return;
			MiniAppHost.open(msg.id, {
				title: manifest.title,
				baseOrigin: manifest.baseOrigin,
				botName: msg.senderName,
			}).catch(err => console.warn('[MiniAppHost] autoOpen', err));
		},
	};

	global.MiniAppHost = MiniAppHost;
})(typeof window !== 'undefined' ? window : globalThis);
