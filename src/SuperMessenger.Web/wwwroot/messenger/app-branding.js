(function (global) {
	const API = '/api/app/appearance';
	const LOGO_SELECTORS = '[data-app-logo]';

	const THEME_KEYS = [
		'name', 'bodyBg', 'headerBg', 'chatBg', 'myBubbleBg', 'myBubbleText',
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

	function applyLogo(logoUrl, appName) {
		document.querySelectorAll(LOGO_SELECTORS).forEach((img) => {
			if (img.closest('#app-splash-root')) return;
			resetBrandLogo(img);
			if (appName) img.alt = appName;
			if (!logoUrl) return;
			const bust = logoUrl + (logoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
			img.onload = () => revealBrandLogo(img);
			img.onerror = () => resetBrandLogo(img);
			img.src = bust;
			if (img.complete) revealBrandLogo(img);
		});
	}

	function configureMessengerThemes(data) {
		const themes = (data.themes || []).map(themeFromApi).filter(Boolean);
		if (global.MessengerThemeManager?.configure && themes.length) {
			global.MessengerThemeManager.configure({
				themes,
				defaultThemeName: data.defaultThemeName,
			});
		}
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
		applyLogo(data.logoUrl, name);
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
		if (loadPromise) return loadPromise;
		loadPromise = (async () => {
			try {
				const data = await fetchAppearanceData();
				if (data) return applyDocumentBranding(data);
				return null;
			} catch {
				return null;
			}
		})();
		return loadPromise;
	}

	global.AppBranding = {
		loadAppearance,
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
