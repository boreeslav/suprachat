(function () {

	const container = document.querySelector('#chat');

	if (window.__smIntegrationStarted) return;

	if (!container) return;

	window.__smIntegrationStarted = true;



	const GROUP_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;



	function showError(message) {

		if (window.AppSplash) AppSplash.hide();

		container.innerHTML =

			'<div class="mc-boot-error">' +

			'<div><p>' + message + '</p>' +

			'<p><a href="/login.html">Войти</a></p></div></div>';

	}



	function safeReturnUrl() {

		try {

			const raw = window.location.pathname + window.location.search;

			if (!raw.startsWith('/') || raw.startsWith('//')) return '/';

			return raw;

		} catch {

			return '/';

		}

	}



	function loginWithReturn() {

		return '/login.html?returnUrl=' + encodeURIComponent(safeReturnUrl());

	}



	async function tryRestoreCryptoSession(me) {

		const sess = SupraAuthCrypto.getSession();

		if (
			!sess
			|| SupraCrypto.normalizeUserId(sess.userId) !== SupraCrypto.normalizeUserId(me.id)
		) {
			return null;
		}

		const crypto = new SupraCrypto();

		try {

			const salt = me.encryptionSalt || sess.salt;

			const verifier = me.encryptionVerifier || sess.verifier;

			await crypto.initSession(sess.password, me.id, salt, verifier);

			return crypto;

		} catch (e) {

			console.warn('[SuperMessenger] crypto unlock failed', e);

			const msg = String(e?.message || '');

			if (/мастер-парол/i.test(msg) || /Неверный/i.test(msg)) {
				SupraAuthCrypto.clearSession();
			} else {
				SupraAuthCrypto.clearSessionMemory();
			}

			return null;

		}

	}



	function attachCrypto(crypto) {

		window.supraCrypto = crypto;

		if (window.supraMessenger?.setCrypto) {

			window.supraMessenger.setCrypto(crypto);

		}

		if (crypto?.ensurePrivateKeyBackupOnServer) {
			void crypto.ensurePrivateKeyBackupOnServer().catch(() => {});
		}

	}



	function waitForMessengerCss(timeoutMs) {
		return new Promise((resolve) => {
			const links = [...document.querySelectorAll('link[href*="supra-messenger.css"]')];
			const isActive = () => links.some((l) => {
				if (l.disabled) return false;
				if (l.media && l.media !== 'all' && l.media !== '') return false;
				try { return !!l.sheet; } catch { return l.rel === 'stylesheet'; }
			});
			if (isActive()) {
				resolve();
				return;
			}
			let pending = 0;
			const finish = () => {
				pending -= 1;
				if (pending <= 0) resolve();
			};
			links.forEach((l) => {
				pending += 1;
				l.addEventListener('load', finish, { once: true });
				l.addEventListener('error', finish, { once: true });
			});
			if (!pending) {
				resolve();
				return;
			}
			setTimeout(resolve, timeoutMs);
		});
	}



	function boot() {

		try {

			window.supraMessenger = new Messenger('#chat', Messenger.MODE_APP, {

				locale: 'ru',

				fileTransferTypes: ['file'],

			});

			if (window.supraCrypto) {

				attachCrypto(window.supraCrypto);

			}

			return window.supraMessenger;

		} catch (e) {

			console.error('[SuperMessenger] init failed', e);

			showError('Не удалось запустить мессенджер: ' + (e.message || e));

			return null;

		}

	}



	function deepLinkSlug() {

		const m = window.location.pathname.match(/^\/@([^/?#]+)$/i);

		return m ? decodeURIComponent(m[1]) : null;

	}



	function loginUrl() {

		const ret = window.location.pathname + window.location.search;

		return '/login.html?returnUrl=' + encodeURIComponent(ret);

	}



	function gotoLogin() {

		if (window.AppSplash) AppSplash.hide();

		window.location.href = loginUrl();

	}



	function avatarColor(seed) {

		const palette = [

			'#5b8dd9', '#57a87a', '#c47fb0', '#d4875e', '#7b7fd4',

			'#5baab0', '#c4a44a', '#8a6db5', '#6aab8e', '#c46b6b',

			'#6b8fc4', '#a89060', '#5b9ea6', '#b07850', '#7a9e5b',

		];

		let hash = 0;

		const s = seed || 'x';

		for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;

		return palette[hash % palette.length];

	}



	function initials(name) {

		const p = (name || '?').trim().split(/\s+/);

		return p.length >= 2

			? (p[0][0] + p[1][0]).toUpperCase()

			: (name || '?').slice(0, 2).toUpperCase();

	}



	function ensureStyles() {

		if (document.getElementById('supra-preview-styles')) return;

		const style = document.createElement('style');

		style.id = 'supra-preview-styles';

		style.textContent = `

			.supra-preview-root {

				min-height: 100vh;

				display: flex;

				align-items: center;

				justify-content: center;

				padding: 24px;

				box-sizing: border-box;

				background: #f0f2f5;

				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;

			}

			.supra-preview-card {

				background: #fff;

				border-radius: 16px;

				box-shadow: 0 8px 40px rgba(0,0,0,.10);

				width: 100%;

				max-width: 360px;

				padding: 32px 28px 28px;

				text-align: center;

				box-sizing: border-box;

			}

			.supra-preview-avatar {

				width: 96px;

				height: 96px;

				border-radius: 50%;

				margin: 0 auto 16px;

				display: flex;

				align-items: center;

				justify-content: center;

				color: #fff;

				font-size: 34px;

				font-weight: 600;

				overflow: hidden;

				user-select: none;

				background: var(--mc-avatar-bg, #5b8dd9);

			}

			.supra-preview-avatar img {

				width: 100%;

				height: 100%;

				object-fit: cover;

				display: block;

			}

			.supra-preview-name {

				font-size: 20px;

				font-weight: 700;

				color: #1a1a1a;

				word-break: break-word;

			}

			.supra-preview-sub {

				font-size: 14px;

				color: #6b7280;

				margin-top: 4px;

				word-break: break-word;

			}

			.supra-preview-status {

				font-size: 14px;

				color: #374151;

				margin-top: 14px;

				line-height: 1.4;

				word-break: break-word;

				white-space: pre-wrap;

			}

			.supra-preview-btn {

				display: block;

				width: 100%;

				margin-top: 24px;

				padding: 13px;

				background: #4a7fc1;

				color: #fff;

				border: none;

				border-radius: 10px;

				font-size: 16px;

				font-weight: 600;

				cursor: pointer;

				box-sizing: border-box;

			}

			.supra-preview-btn:hover { background: #3f70ad; }

			.supra-preview-hint {

				margin-top: 14px;

				font-size: 13px;

				color: #9ca3af;

			}

			.supra-preview-hint a { color: #4a7fc1; text-decoration: none; }

		`;

		document.head.appendChild(style);

	}



	function buildAvatar(name, avatarUrl, seed) {

		const el = document.createElement('div');

		el.className = 'supra-preview-avatar';

		if (avatarUrl) {

			const img = document.createElement('img');

			img.alt = name || '';

			img.src = avatarUrl;

			img.onerror = () => {

				el.innerHTML = '';

				el.style.setProperty('--mc-avatar-bg', avatarColor(seed));

				el.textContent = initials(name);

			};

			el.appendChild(img);

		} else {

			el.style.background = avatarColor(seed);

			el.textContent = initials(name);

		}

		return el;

	}



	function renderPreview(preview) {

		ensureStyles();

		const isGroup = preview.type === 'group';



		const root = document.createElement('div');

		root.className = 'supra-preview-root';

		const card = document.createElement('div');

		card.className = 'supra-preview-card';



		const name = isGroup ? (preview.name || '') : (preview.displayName || '');

		const seed = isGroup ? (preview.chatId || name) : (preview.id || preview.login || name);

		card.appendChild(buildAvatar(name, preview.avatar || null, seed));



		const nameEl = document.createElement('div');

		nameEl.className = 'supra-preview-name';

		nameEl.textContent = name || (isGroup ? 'Группа' : '');

		card.appendChild(nameEl);



		const subEl = document.createElement('div');

		subEl.className = 'supra-preview-sub';

		if (isGroup) {

			const n = preview.memberCount || 0;

			subEl.textContent = n > 0 ? memberCountLabel(n) : 'Группа';

		} else {

			subEl.textContent = '@' + (preview.login || '');

		}

		card.appendChild(subEl);



		if (!isGroup && preview.statusText) {

			const statusEl = document.createElement('div');

			statusEl.className = 'supra-preview-status';

			statusEl.textContent = preview.statusText;

			card.appendChild(statusEl);

		}



		const btn = document.createElement('button');

		btn.type = 'button';

		btn.className = 'supra-preview-btn';

		btn.textContent = isGroup ? 'Вступить' : 'Написать';

		btn.addEventListener('click', gotoLogin);

		card.appendChild(btn);



		const hint = document.createElement('div');

		hint.className = 'supra-preview-hint';

		hint.innerHTML = 'Уже есть аккаунт? <a href="' + loginUrl() + '">Войти</a>';

		card.appendChild(hint);



		root.appendChild(card);

		container.innerHTML = '';

		container.appendChild(root);

		if (window.AppSplash) AppSplash.hide();

		if (typeof window.normalizeAppUrl === 'function') {

			window.normalizeAppUrl();

		} else if (/^\/@[^/]+/i.test(window.location.pathname)) {

			history.replaceState(null, '', '/');

		}

	}



	function memberCountLabel(n) {

		const mod10 = n % 10;

		const mod100 = n % 100;

		let word = 'участников';

		if (mod10 === 1 && mod100 !== 11) word = 'участник';

		else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = 'участника';

		return n + ' ' + word;

	}



	function fetchPublicPreview(url) {

		return fetch(url, { credentials: 'same-origin' })

			.then((r) => (r.ok ? r.json() : null));

	}



	function mountPublicChannelView() {

		if (window.AppSplash) AppSplash.hide();

		fetch('/channel-view.html', { credentials: 'same-origin' })

			.then((r) => (r.ok ? r.text() : Promise.reject(new Error('channel view'))))

			.then((html) => {

				document.open();

				document.write(html);

				document.close();

			})

			.catch(() => gotoLogin());

	}



	function showDeepLinkPreview(slug) {

		const isGroup = GROUP_ID_RE.test(slug);

		if (isGroup) {

			fetchPublicPreview('/api/public/group/' + encodeURIComponent(slug))

				.then((preview) => {

					if (preview && preview.found) renderPreview(preview);

					else gotoLogin();

				})

				.catch(() => gotoLogin());

			return;

		}



		fetchPublicPreview('/api/public/channel/' + encodeURIComponent(slug))

			.then((channelPreview) => {

				if (channelPreview && channelPreview.found) {

					mountPublicChannelView();

					return null;

				}

				return fetchPublicPreview('/api/public/profile/' + encodeURIComponent(slug));

			})

			.then((preview) => {

				if (preview === null) return;

				if (preview && preview.found) renderPreview(preview);

				else gotoLogin();

			})

			.catch(() => gotoLogin());

	}



	function handleUnauthenticated() {

		const slug = deepLinkSlug();

		if (slug) {

			showDeepLinkPreview(slug);

		} else {

			if (window.AppSplash) AppSplash.hide();

			window.location.href = '/login.html';

		}

	}



	function loadOfflineUser() {
		try {
			const raw = localStorage.getItem('sm-offline-user-v1');
			if (!raw) return null;
			const cached = JSON.parse(raw);
			if (cached?.id) {
				globalThis.__authMeOffline = true;
				return cached;
			}
		} catch (_) { /* ignore */ }
		return null;
	}

	function isNetworkFetchError(err) {
		const msg = String(err?.message || err || '');
		return err instanceof TypeError && /failed to fetch|networkerror|network error|load failed|connection/i.test(msg);
	}

	function authMePromise() {
		if (window.__authMePromise) {
			return window.__authMePromise.then((user) => {
				if (user === null) return null;
				if (user?.id) return user;
				const cached = loadOfflineUser();
				if (cached) return cached;
				if (window.__authMeError) throw window.__authMeError;
				return user;
			});
		}
		const controller = new AbortController();
		const authTimeoutMs = 8000;
		const authTimer = setTimeout(() => controller.abort(), authTimeoutMs);
		return fetch('/api/auth/me', { credentials: 'same-origin', signal: controller.signal })
			.then((r) => {
				if (r.status === 401 || r.status === 403) return null;
				if (!r.ok) throw new Error('HTTP ' + r.status);
				const ct = r.headers.get('content-type') || '';
				if (!ct.includes('application/json')) throw new Error('Unexpected response type');
				return r.json();
			})
			.then((user) => {
				if (user?.id) {
					try { localStorage.setItem('sm-offline-user-v1', JSON.stringify(user)); } catch (_) {}
				}
				return user;
			})
			.catch((e) => {
				const cached = loadOfflineUser();
				if (cached) return cached;
				throw e;
			})
			.finally(() => clearTimeout(authTimer));
	}

	let appBootPromise = null;

	function beginAuthenticatedBoot(user) {
		if (!user?.id) return null;
		if (!appBootPromise) {
			appBootPromise = startAuthenticatedApp(user);
		}
		return appBootPromise;
	}

	function patchBootUser(user) {
		if (!user?.id) return;
		globalThis.__smBootUser = user;
		try { localStorage.setItem('sm-offline-user-v1', JSON.stringify(user)); } catch (_) {}
	}



	async function startAuthenticatedApp(user) {
		if (!user?.id) return;

		let needsMasterUnlock = false;

		try {

			globalThis.__smBootUser = user;

			void (window.AppBranding?.loadAppearance?.().catch(() => null));
			void (window.MessengerChatPreferences?.loadFromServer?.().catch(() => null));
			if (window.SupraSecureStore?.ensurePersistence) {
				void SupraSecureStore.ensurePersistence().catch(() => {});
			}

			let pendingLoginPassword = SupraAuthCrypto.peekPendingLoginPassword();

			if (window.__bootMark) __bootMark('chats-load-start');

			// Разблокировка крипты параллельно с отрисовкой оболочки (PBKDF — в worker).
			const cryptoPromise = (async () => {
				if (window.__bootMark) __bootMark('crypto-unlock-start');
				await SupraAuthCrypto.restoreSession(user.id);
				let crypto = await tryRestoreCryptoSession(user);
				if (!crypto && pendingLoginPassword) {
					const attempt = await SupraAuthCrypto.tryUnlockWithLoginPassword(
						user,
						pendingLoginPassword
					);
					crypto = attempt.crypto;
					if (crypto) {
						SupraAuthCrypto.consumePendingLoginPassword();
						pendingLoginPassword = null;
					} else if (attempt.mismatch) {
						user.masterPasswordMatchesLogin = false;
					}
				}
				return crypto;
			})();

			const messenger = boot();

			if (window.AppBranding?.syncMessengerThemes) {
				AppBranding.syncMessengerThemes();
			}

			if (window.__bootMark) __bootMark('messenger-constructed');

			if (messenger) {
				// Сплэш скрываем по готовности оболочки (кэш чатов уже в сайдбаре);
				// полный sync bundle догружается в фоне через whenChatsLoaded / whenReady.
				await Promise.all([
					messenger.whenRendered?.(),
					waitForMessengerCss(4000),
				]);
			}

			// Мгновенное снятие сплэша до attachCrypto (RSA unwrap может блокировать main thread).
			if (window.AppSplash) {
				AppSplash.hide(true);
			}

			if (window.AppSplash?.yieldToMain) {
				await AppSplash.yieldToMain();
			}

			if (window.__bootMark) __bootMark('splash-ui-ready');

			const cryptoReady = cryptoPromise.then((crypto) => {
				if (crypto) attachCrypto(crypto);
				if (window.__bootMark) __bootMark('crypto-ready');
				return crypto;
			});

			if (window.__bootReport) __bootReport('app-ready');

			void messenger?.whenReady?.().then(() => {
				if (window.__bootMark) __bootMark('app-data-ready');
			}).catch(() => {});

			const crypto = await cryptoReady;

			if (window.AppScriptCache?.loadDeferredScripts) {
				AppScriptCache.loadDeferredScripts().then(() => {
					if (window.SupraPush?.syncOnLoad) SupraPush.syncOnLoad();
				}).catch(() => {});
			}

			if (crypto) return;

			needsMasterUnlock = true;

			if (window.AppScriptCache?.ensureDeferredScripts) {
				await AppScriptCache.ensureDeferredScripts();
			}

			const appRoot = typeof globalThis !== 'undefined' ? globalThis : window;

			void appRoot.AppBranding?.loadAppearance?.().catch(() => null);

			const branding = appRoot.__appBranding || {};

			const welcomeHtml = appRoot.AppBranding?.formatLoginWelcomeHtml
				? appRoot.AppBranding.formatLoginWelcomeHtml(
					branding.loginWelcomeHtml,
					branding.appName
				)
				: branding.loginWelcomeHtml;

			SupraMasterUnlock.show(user, (unlocked) => {

				SupraAuthCrypto.consumePendingLoginPassword();

				attachCrypto(unlocked);

				if (window.AppSplash) AppSplash.hide();

			}, {
				loginWelcomeHtml: welcomeHtml,
				masterPasswordMatchesLogin: user.masterPasswordMatchesLogin !== false,
				forceSeparateMaster: SupraAuthCrypto.hasMasterMismatchFlag(),
				pendingLoginPassword:
					pendingLoginPassword || SupraAuthCrypto.peekPendingLoginPassword(),
			});

		} finally {

			if (!needsMasterUnlock && window.AppSplash) AppSplash.hide();

		}
	}



	const cachedOfflineUser = loadOfflineUser();
	if (cachedOfflineUser) {
		beginAuthenticatedBoot(cachedOfflineUser);
	}

	authMePromise()

		.then((user) => {

			if (user === null) {

				if (!appBootPromise) handleUnauthenticated();

				return null;

			}

			if (!user?.id) {
				const cached = loadOfflineUser();
				if (cached) {
					if (!appBootPromise) beginAuthenticatedBoot(cached);
					return cached;
				}
				if (!appBootPromise) handleUnauthenticated();
				return null;
			}

			if (appBootPromise) {
				patchBootUser(user);
				return user;
			}

			beginAuthenticatedBoot(user);
			return user;

		})

		.catch(async (e) => {

			const cached = loadOfflineUser();
			if (cached && (isNetworkFetchError(e) || e?.name === 'AbortError')) {
				if (!appBootPromise) {
					console.warn('[SuperMessenger] offline boot from cache', e);
					beginAuthenticatedBoot(cached);
				}
				return;
			}

			if (appBootPromise) {
				console.warn('[SuperMessenger] auth check failed (background)', e);
				return;
			}

			console.error('[SuperMessenger] auth check failed', e);

			showError(
				cached
					? 'Ошибка загрузки. Проверьте вход в систему.'
					: 'Нет соединения с сервером. Откройте приложение онлайн хотя бы один раз, чтобы сохранить данные для офлайн-режима.'
			);

		});

})();

