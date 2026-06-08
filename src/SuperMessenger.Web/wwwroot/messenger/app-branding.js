(function (global) {
	const API = '/api/app/appearance';
	const LOGO_SELECTORS = '[data-app-logo]';

	const THEME_BG_DB = 'ThemeChatBgCacheDB';
	const THEME_BG_STORE = 'images';
	const THEME_BG_BUILD_KEY = 'sm-theme-bg-build';
	let themeBgDbPromise = null;
	let offlineBlobUrl = null;

	function openThemeBgDb() {
		if (themeBgDbPromise) return themeBgDbPromise;
		themeBgDbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(THEME_BG_DB, 1);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains(THEME_BG_STORE)) {
					db.createObjectStore(THEME_BG_STORE, { keyPath: 'url' });
				}
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = (e) => reject(e.target.error);
		});
		return themeBgDbPromise;
	}

	async function readThemeBgBlob(url) {
		try {
			const db = await openThemeBgDb();
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(THEME_BG_STORE, 'readonly');
				const req = tx.objectStore(THEME_BG_STORE).get(url);
				req.onsuccess = () => resolve(req.result?.blob ?? null);
				req.onerror = () => reject(req.error);
			});
		} catch {
			return null;
		}
	}

	async function writeThemeBgBlob(url, blob) {
		try {
			const db = await openThemeBgDb();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(THEME_BG_STORE, 'readwrite');
				tx.objectStore(THEME_BG_STORE).put({ url, blob, savedAt: Date.now() });
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
		} catch { /* best-effort */ }
	}

	function absoluteThemeBgUrl(url) {
		if (!url) return '';
		try {
			return new URL(url, global.location?.origin || '').href;
		} catch {
			return url;
		}
	}

	function cssUrlValue(url) {
		return `url("${String(url || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
	}

	function revokeOfflineBlobUrl() {
		if (offlineBlobUrl?.startsWith('blob:')) {
			URL.revokeObjectURL(offlineBlobUrl);
		}
		offlineBlobUrl = null;
	}

	function ensureWrapLayer(wrap) {
		if (!wrap?.classList?.contains('mc-messages-wrap')) return;
		const show = ThemeChatBg.enabled && ThemeChatBg.displayUrl;
		let layer = wrap.querySelector(':scope > .mc-theme-bg-layer');
		if (!show) {
			layer?.remove();
			return;
		}
		if (!layer) {
			layer = document.createElement('div');
			layer.className = 'mc-theme-bg-layer';
			layer.setAttribute('aria-hidden', 'true');
			wrap.insertBefore(layer, wrap.firstChild);
		}
		const msg = wrap.querySelector(':scope > .mc-messages');
		if (msg) {
			msg.style.position = 'relative';
			msg.style.zIndex = '1';
			msg.style.background = 'transparent';
		}
	}

	function scanNodeForMessageWraps(node) {
		if (!node || node.nodeType !== 1) return;
		if (node.classList?.contains('mc-messages-wrap')) ensureWrapLayer(node);
		node.querySelectorAll?.('.mc-messages-wrap')?.forEach(ensureWrapLayer);
	}

	function startMessageWrapObserver() {
		if (ThemeChatBg._observer || typeof MutationObserver === 'undefined') return;
		const root = document.documentElement;
		if (!root) return;
		ThemeChatBg._observer = new MutationObserver((mutations) => {
			for (const m of mutations) {
				for (const node of m.addedNodes) scanNodeForMessageWraps(node);
			}
		});
		ThemeChatBg._observer.observe(root, { childList: true, subtree: true });
	}

	/** Единый кеш и отрисовка фона темы для всех чатов. */
	const ThemeChatBg = {
		apiUrl: null,
		displayUrl: null,
		enabled: false,
		loading: null,
		_observer: null,

		getDisplayUrl() {
			return this.enabled && this.displayUrl ? this.displayUrl : null;
		},

		ensureWrapLayer,

		paint() {
			const show = this.enabled && this.displayUrl;
			document.documentElement.style.setProperty(
				'--m-chat-bg-image',
				show ? cssUrlValue(this.displayUrl) : 'none',
			);
			document.querySelectorAll('.mc-messages-wrap').forEach(ensureWrapLayer);
		},

		async _loadOnce(apiUrl) {
			const abs = absoluteThemeBgUrl(apiUrl);
			const cached = await readThemeBgBlob(apiUrl);
			if (cached && global.navigator?.onLine === false) {
				revokeOfflineBlobUrl();
				offlineBlobUrl = URL.createObjectURL(cached);
				return offlineBlobUrl;
			}
			if (cached) return abs;
			const response = await fetch(apiUrl, { credentials: 'same-origin' });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			await writeThemeBgBlob(apiUrl, await response.blob());
			return abs;
		},

		/** Загрузить фон один раз; повторный вызов с тем же URL — только paint. */
		async sync(apiUrl, enabled) {
			this.enabled = !!enabled;
			const next = this.enabled && apiUrl ? String(apiUrl).trim() : '';
			if (!next) {
				this.apiUrl = null;
				this.displayUrl = null;
				this.loading = null;
				revokeOfflineBlobUrl();
				this.paint();
				return null;
			}
			if (next === this.apiUrl && this.displayUrl) {
				this.paint();
				return this.displayUrl;
			}
			if (next === this.apiUrl && this.loading) {
				await this.loading;
				this.paint();
				return this.displayUrl;
			}
			if (next !== this.apiUrl) {
				revokeOfflineBlobUrl();
			}
			this.apiUrl = next;
			this.displayUrl = null;
			this.loading = this._loadOnce(next);
			try {
				this.displayUrl = await this.loading;
			} catch {
				const cached = await readThemeBgBlob(next);
				if (cached) {
					revokeOfflineBlobUrl();
					offlineBlobUrl = URL.createObjectURL(cached);
					this.displayUrl = offlineBlobUrl;
				} else {
					this.displayUrl = absoluteThemeBgUrl(next);
				}
			} finally {
				this.loading = null;
			}
			this.paint();
			return this.displayUrl;
		},

		/** Сброс кеша: команда админа, обновление приложения, «очистить весь кеш». */
		async invalidate() {
			this.apiUrl = null;
			this.displayUrl = null;
			this.enabled = false;
			this.loading = null;
			revokeOfflineBlobUrl();
			try {
				const db = await openThemeBgDb();
				await new Promise((resolve, reject) => {
					const tx = db.transaction(THEME_BG_STORE, 'readwrite');
					tx.objectStore(THEME_BG_STORE).clear();
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			} catch { /* best-effort */ }
			this.paint();
		},

		checkAppBuild() {
			let build = '';
			try {
				build = String(document.querySelector('meta[name="sm-build"]')?.content || '');
			} catch { /* ignore */ }
			if (!build || build === '0') return;
			const prev = localStorage.getItem(THEME_BG_BUILD_KEY);
			if (prev && prev !== build) void this.invalidate();
			localStorage.setItem(THEME_BG_BUILD_KEY, build);
		},
	};

	global.ThemeChatBg = ThemeChatBg;
	global.ThemeChatBgCache = ThemeChatBg;
	ThemeChatBg.checkAppBuild();
	if (document.body) startMessageWrapObserver();
	else document.addEventListener('DOMContentLoaded', startMessageWrapObserver);

	const THEME_KEYS = [
		'name', 'bodyBg', 'headerBg', 'chatBg', 'chatBgImageFileName', 'chatBgImageUrl', 'myBubbleBg', 'myBubbleText',
		'otherBubbleBg', 'otherBubbleText', 'accent', 'inputBg', 'inputFieldBg',
		'inputFieldBorder', 'inputText', 'inputPlaceholder', 'headerText', 'headerSubText',
		'headerBorder', 'inputAreaBorder', 'scrollThumb', 'senderName', 'menuBg',
		'menuText', 'menuBorder', 'menuHover', 'dotsColor',
	];

	let loadPromise = null;

	function themeFromApi(t) {
		if (!t) return null;
		const out = {};
		THEME_KEYS.forEach((k) => {
			if (t[k] != null && t[k] !== '') out[k] = t[k];
		});
		return out.name ? out : null;
	}

	function clearLegacyAccentInlineStyles() {
		document.querySelectorAll('button[data-brand-accent]').forEach((btn) => {
			delete btn.dataset.brandAccent;
			btn.style.removeProperty('background');
		});
		document.querySelectorAll('a[data-brand-accent]').forEach((a) => {
			delete a.dataset.brandAccent;
			a.style.removeProperty('color');
		});
	}

	function applyBaseColors(base) {
		if (!base) return;
		clearLegacyAccentInlineStyles();
		const root = document.documentElement;
		const map = {
			'--brand-accent': base.accent,
			'--brand-sidebar-bg': base.sidebarBg,
			'--brand-content-bg': base.contentBg,
			'--brand-text': base.text,
			'--brand-sub-text': base.subText,
			'--brand-border': base.border,
			'--brand-hover': base.hover,
		};
		Object.entries(map).forEach(([k, v]) => {
			if (v) root.style.setProperty(k, v);
		});
		if (base.contentBg) document.body.style.background = base.contentBg;
	}

	function resolveAppName(data) {
		return (data?.appName || global.__appBranding?.appName || '').trim();
	}

	function applyDocumentTitle(name) {
		if (!name) return;
		const titleEl = document.querySelector('title');
		if (!titleEl) return;
		if (titleEl.hasAttribute('data-app-title')) {
			const prefix = (titleEl.getAttribute('data-app-title') || '').trim();
			document.title = prefix ? `${prefix} — ${name}` : name;
			return;
		}
		const current = (document.title || '').trim();
		if (!current) document.title = name;
	}

	function applyAppName(name) {
		if (!name) return;
		document.querySelectorAll('[data-app-name]').forEach((el) => {
			el.textContent = name;
		});
		document.querySelectorAll(LOGO_SELECTORS).forEach((img) => {
			if (!img.closest('#app-splash-root')) img.alt = name;
		});
		applyDocumentTitle(name);
		if (global.AppSplash?.applyBrandingHints) {
			global.AppSplash.applyBrandingHints(global.__appBranding || { appName: name });
		}
	}

	function applyAppTagline(tagline) {
		const text = (tagline || '').trim();
		document.querySelectorAll('[data-app-tagline]').forEach((el) => {
			if (text) {
				el.textContent = text;
				el.hidden = false;
			} else {
				el.textContent = '';
				el.hidden = true;
			}
		});
	}

	function applyAppDescription(description) {
		const text = (description || '').trim();
		document.querySelectorAll('[data-app-description]').forEach((el) => {
			if (text) {
				el.textContent = text;
				el.hidden = false;
			} else {
				el.textContent = '';
				el.hidden = true;
			}
		});
	}

	function applyRegisterWelcome(welcome) {
		const text = (welcome || '').trim();
		document.querySelectorAll('[data-register-welcome]').forEach((el) => {
			el.textContent = text || el.dataset.defaultWelcome || '';
		});
	}

	const LOGIN_WELCOME_DEFAULT =
		'<p>Добро пожаловать в <strong>{{appName}}</strong>. ' +
		'Для доступа к зашифрованным сообщениям введите мастер-пароль шифрования.</p>';

	function escapeHtmlText(text) {
		return String(text)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/** Подставляет название приложения в приветствие перед мастер-паролем. */
	function formatLoginWelcomeHtml(html, appName) {
		const name = (appName || resolveAppName(global.__appBranding) || 'SuperMessenger').trim();
		const escaped = escapeHtmlText(name);
		let tpl = (html || '').trim() || LOGIN_WELCOME_DEFAULT;
		tpl = tpl.replace(/\{\{appName\}\}/gi, escaped);
		// Старые настройки с жёстким SuperMessenger без плейсхолдера
		if (name !== 'SuperMessenger' && !/\{\{appName\}\}/i.test(html || '')) {
			tpl = tpl.replace(/\bSuperMessenger\b/g, escaped);
		}
		return tpl;
	}

	function resetBrandLogo(img) {
		img.classList.remove('sm-brand-logo-ready');
		img.hidden = true;
		img.removeAttribute('src');
	}

	function revealBrandLogo(img) {
		if (img.naturalWidth > 0) {
			img.hidden = false;
			img.classList.add('sm-brand-logo-ready');
		} else {
			resetBrandLogo(img);
		}
	}

	function applySvgFillColor(svgText, color) {
		if (!color) return svgText;
		let s = svgText;
		s = s.replace(/currentColor/gi, color);
		s = s.replace(/fill="(?!none|transparent|url\(#)[^"]*"/gi, `fill="${color}"`);
		s = s.replace(/fill='(?!none|transparent|url\(#)[^']*'/gi, `fill='${color}'`);
		s = s.replace(/stroke="(?!none|transparent|url\(#)[^"]*"/gi, `stroke="${color}"`);
		s = s.replace(/stroke='(?!none|transparent|url\(#)[^']*'/gi, `stroke='${color}'`);
		return s;
	}

	async function logoUrlWithColor(logoUrl, logoSvgColor) {
		if (!logoUrl || !logoSvgColor) return logoUrl;
		try {
			const bust = logoUrl + (logoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
			const r = await fetch(bust, { credentials: 'same-origin' });
			if (!r.ok) return logoUrl;
			const svgText = applySvgFillColor(await r.text(), logoSvgColor);
			return URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
		} catch {
			return logoUrl;
		}
	}

	function applyLogo(logoUrl, appName, logoSvgColor) {
		document.querySelectorAll(LOGO_SELECTORS).forEach((img) => {
			if (img.closest('#app-splash-root')) return;
			resetBrandLogo(img);
			if (appName) img.alt = appName;
			if (!logoUrl) return;
			(async () => {
				const colored = await logoUrlWithColor(logoUrl, logoSvgColor);
				const revoke = colored !== logoUrl;
				img.onload = () => {
					revealBrandLogo(img);
					if (revoke) URL.revokeObjectURL(colored);
				};
				img.onerror = () => {
					resetBrandLogo(img);
					if (revoke) URL.revokeObjectURL(colored);
				};
				img.src = colored;
				if (img.complete) revealBrandLogo(img);
			})();
		});
	}

	function configureMessengerThemes(data) {
		if (!data) return false;
		const themes = (data.themes || []).map(themeFromApi).filter(Boolean);
		if (!themes.length || !global.MessengerThemeManager?.configure) return false;
		global.MessengerThemeManager.configure({
			themes,
			defaultThemeName: data.defaultThemeName,
			useThemeChatBg: data.useThemeChatBg !== false,
		});
		global.MessengerThemeManager?.refreshThemeChatBg?.();
		return true;
	}

	function syncMessengerThemes() {
		return configureMessengerThemes(global.__appBranding);
	}

	function applyDocumentBranding(data) {
		if (!data) return data;
		global.__appBranding = data;
		const name = resolveAppName(data);
		if (name) applyAppName(name);
		if (data.appVersion && global.AppUpdateNotifier?.setLocalAppVersion) {
			global.AppUpdateNotifier.setLocalAppVersion(data.appVersion);
		}
		applyAppTagline(data.appTagline);
		applyAppDescription(data.appDescription);
		applyRegisterWelcome(data.registerWelcome);
		applyBaseColors(data.base);
		applyLogo(data.logoUrl, name, (data.logoSvgColor || '').trim() || null);
		configureMessengerThemes(data);
		if (global.MessengerMessageSounds?.configure) {
			global.MessengerMessageSounds.configure(data);
		}
		return data;
	}

	async function fetchAppearanceData() {
		if (global.__appAppearancePromise) {
			return global.__appAppearancePromise;
		}
		const promise = fetch(API, { credentials: 'same-origin' })
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null);
		global.__appAppearancePromise = promise;
		return promise;
	}

	async function loadAppearance() {
		if (!loadPromise) {
			loadPromise = (async () => {
				try {
					const data = await fetchAppearanceData();
					if (data) return applyDocumentBranding(data);
					return null;
				} catch {
					return null;
				}
			})();
		}
		const result = await loadPromise;
		if (result) configureMessengerThemes(result);
		return result;
	}

	async function reloadAppearance() {
		loadPromise = (async () => {
			try {
				const bust = `${API}?t=${Date.now()}`;
				const data = await fetch(bust, { credentials: 'same-origin' })
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null);
				global.__appAppearancePromise = Promise.resolve(data);
				if (data) return applyDocumentBranding(data);
				return null;
			} catch {
				return null;
			}
		})();
		const result = await loadPromise;
		if (result) configureMessengerThemes(result);
		return result;
	}

	global.AppBranding = {
		loadAppearance,
		reloadAppearance,
		syncMessengerThemes,
		applyDocumentBranding,
		applyAppName,
		applyBaseColors,
		applyAppTagline,
		applyAppDescription,
		applyRegisterWelcome,
		formatLoginWelcomeHtml,
		themeFromApi,
		THEME_KEYS,
	};

	if (document.body) loadAppearance();
	else document.addEventListener('DOMContentLoaded', () => loadAppearance());
})(typeof window !== 'undefined' ? window : globalThis);
