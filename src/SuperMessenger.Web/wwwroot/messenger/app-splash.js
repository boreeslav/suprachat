(function (global) {
	const API = '/api/app/appearance';
	const ROOT_ID = 'app-splash-root';
	const STYLE_ID = 'app-splash-css';
	const FALLBACK_STYLE_ID = 'app-splash-fallback-css';
	const NAV_KEY = 'supra-splash-navigating';
	/** Минимальная пауза перед тяжёлой работой (модули грузятся параллельно со сплэшем). */
	const MIN_SPLASH_DELAY_MS = 0;
	/** Запас поверх длительности CSS-анимации (10%). */
	const ANIM_BUFFER = 1.1;
	const DEFAULT_SPLASH_ANIM_MS = 750;

	let splashShownAt = 0;
	let splashAnimateStarted = false;
	let splashAnimDone = false;
	let splashHtmlApplied = '';
	let appearanceReadyResolve = null;
	const appearanceReady = new Promise((resolve) => {
		appearanceReadyResolve = resolve;
	});

	const FALLBACK_CSS = `
		.sm-splash-overlay {
			position: fixed;
			inset: 0;
			z-index: 2147483646;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 16px;
			background: #ffffff;
			overflow: hidden;
			touch-action: none;
		}
		.sm-splash-fallback-logo {
			font-size: 28px;
			font-weight: 700;
			color: #1c1c1e;
			opacity: 1;
			transform: translateY(0);
		}
		.sm-splash-overlay.sm-splash-animate .sm-splash-fallback-logo {
			animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
		}
		.sm-splash-overlay.sm-splash-no-replay,
		.sm-splash-overlay.sm-splash-no-replay * {
			animation: none !important;
		}
		@keyframes sm-splash-rise {
			from { transform: translateY(120vh); opacity: 0; }
			to { transform: translateY(0); opacity: 1; }
		}
		.sm-splash-overlay.sm-splash-hiding {
			opacity: 0;
			transition: opacity 0.35s ease;
			pointer-events: none;
		}
		html.sm-splash-active, html.sm-splash-active body { overflow: hidden; }
	`;

	let root = null;
	let enabled = true;
	let hiding = false;
	let appearancePromise = null;

	function yieldToMain() {
		return new Promise((resolve) => {
			requestAnimationFrame(() => requestAnimationFrame(resolve));
		});
	}

	function markSplashShown() {
		if (splashShownAt) return;
		splashShownAt = performance.now();
	}

	function startSplashAnimation() {
		if (splashAnimateStarted || !root) return;
		splashAnimateStarted = true;
		markSplashShown();
		root.classList.add('sm-splash-animate');
	}

	function measureMaxAnimationMs(container) {
		if (!container) return DEFAULT_SPLASH_ANIM_MS;
		let max = 0;
		const nodes = [container, ...container.querySelectorAll('*')];
		for (const el of nodes) {
			const cs = global.getComputedStyle(el);
			const names = (cs.animationName || '').split(',').map((s) => s.trim());
			if (!names.length || names.every((n) => !n || n === 'none')) continue;
			const durs = (cs.animationDuration || '0s').split(',').map((s) => {
				const v = parseFloat(s);
				return Number.isFinite(v) ? v * 1000 : 0;
			});
			const delays = (cs.animationDelay || '0s').split(',').map((s) => {
				const v = parseFloat(s);
				return Number.isFinite(v) ? v * 1000 : 0;
			});
			const iterEnds = (cs.animationIterationCount || '1').split(',').map((s) => {
				if (s.trim() === 'infinite') return Infinity;
				const v = parseFloat(s);
				return Number.isFinite(v) && v > 0 ? v : 1;
			});
			for (let i = 0; i < names.length; i++) {
				const name = names[i];
				if (!name || name === 'none') continue;
				const end = ((durs[i] ?? durs[0] ?? 0) + (delays[i] ?? delays[0] ?? 0))
					* (iterEnds[i] ?? iterEnds[0] ?? 1);
				if (Number.isFinite(end)) max = Math.max(max, end);
			}
		}
		return max > 0 ? max : DEFAULT_SPLASH_ANIM_MS;
	}

	function splashDelayMs() {
		const animMs = measureMaxAnimationMs(root);
		return Math.max(MIN_SPLASH_DELAY_MS, Math.ceil(animMs * ANIM_BUFFER));
	}

	function waitForAnimationEnd(container, timeoutMs) {
		return new Promise((resolve) => {
			if (!container) {
				resolve();
				return;
			}
			const animated = [...container.querySelectorAll('*')].filter((el) => {
				const cs = global.getComputedStyle(el);
				return cs.animationName && cs.animationName !== 'none';
			});
			if (!animated.length) {
				resolve();
				return;
			}
			let pending = animated.length;
			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				global.clearTimeout(timer);
				resolve();
			};
			let timer;
			timer = global.setTimeout(finish, timeoutMs);
			animated.forEach((el) => {
				el.addEventListener('animationend', () => {
					pending -= 1;
					if (pending <= 0) finish();
				}, { once: true });
			});
		});
	}

	async function waitForSplashAnimation() {
		if (splashAnimDone) return;
		await yieldToMain();
		startSplashAnimation();
		const delayMs = splashDelayMs();
		const deadline = splashShownAt + delayMs;
		await waitForAnimationEnd(root, delayMs + 150);
		const left = deadline - performance.now();
		if (left > 0) {
			await new Promise((resolve) => global.setTimeout(resolve, left));
		}
		await yieldToMain();
		splashAnimDone = true;
	}

	function isLoginPage() {
		return /login\.html$/i.test(global.location.pathname || '');
	}

	function navigationType() {
		try {
			const entry = performance.getEntriesByType('navigation')[0];
			return entry?.type || '';
		} catch {
			return '';
		}
	}

	function ensureRoot() {
		if (root) return root;
		root = document.getElementById(ROOT_ID);
		if (!root) {
			root = document.createElement('div');
			root.id = ROOT_ID;
			root.className = 'sm-splash-overlay';
			root.setAttribute('role', 'status');
			root.setAttribute('aria-live', 'polite');
			root.setAttribute('aria-label', 'Загрузка приложения');
			document.body.insertBefore(root, document.body.firstChild);
		}
		document.documentElement.classList.add('sm-splash-active');
		return root;
	}

	function ensureFallbackStyles() {
		if (document.getElementById(FALLBACK_STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = FALLBACK_STYLE_ID;
		style.textContent = FALLBACK_CSS;
		document.head.appendChild(style);
	}

	function setSplashCss(css) {
		let style = document.getElementById(STYLE_ID);
		if (!css) {
			if (style) style.remove();
			return;
		}
		if (!style) {
			style = document.createElement('style');
			style.id = STYLE_ID;
			document.head.appendChild(style);
		}
		style.textContent = css;
	}

	function resetSplashLogo(img) {
		img.classList.remove('sm-splash-logo-ready');
		img.hidden = true;
		img.removeAttribute('src');
	}

	function revealSplashLogo(img) {
		if (img.naturalWidth > 0) {
			img.hidden = false;
			img.classList.add('sm-splash-logo-ready');
		} else {
			resetSplashLogo(img);
			setSplashFallbackTextHidden(false);
		}
	}

	const SPLASH_NAME_SELECTORS =
		'[data-app-name], .sm-splash-app-name, .sm-splash-logo-fallback, .sm-splash-fallback-logo';

	/** Текстовый фолбэк, который проигрывает entrance-анимацию до загрузки лого. */
	const SPLASH_FALLBACK_TEXT_SELECTORS =
		'.sm-splash-logo-fallback, .sm-splash-fallback-logo';

	function setSplashFallbackTextHidden(hidden) {
		if (!root) return;
		root.querySelectorAll(SPLASH_FALLBACK_TEXT_SELECTORS).forEach((el) => {
			if (hidden) el.style.display = 'none';
			else el.style.removeProperty('display');
		});
	}

	function resolveAppName(data) {
		return (data?.appName || global.__appBranding?.appName || '').trim();
	}

	function applyAppNameToSplash(data) {
		if (!root) return;
		const name = resolveAppName(data);
		if (!name) return;
		root.querySelectorAll(SPLASH_NAME_SELECTORS).forEach((el) => {
			el.textContent = name;
		});
		root.querySelectorAll('[data-app-logo]').forEach((img) => {
			img.alt = name;
		});
	}

	function applyBrandingHints(data) {
		if (!data || !root) return;
		global.__appBranding = global.__appBranding || data;
		applyAppNameToSplash(data);
		const logos = root.querySelectorAll('[data-app-logo]');
		const logoUrl = data.logoUrl || '';
		// Если задан логотип и есть куда его показать — прячем текстовый фолбэк,
		// чтобы он не проигрывал отдельную entrance-анимацию до появления лого
		// (иначе сплэш визуально «появляется дважды»: сначала текст, потом лого).
		const willShowLogo = !!logoUrl && logos.length > 0;
		setSplashFallbackTextHidden(willShowLogo);
		logos.forEach((img) => {
			// Тот же логотип уже применён/грузится — не перезапускаем загрузку,
			// иначе reveal проигрывает entrance-анимацию повторно (двойной сплэш).
			if (img.dataset.splashLogoSrc === logoUrl && (img.getAttribute('src') || !logoUrl)) {
				return;
			}
			img.dataset.splashLogoSrc = logoUrl;
			resetSplashLogo(img);
			if (!logoUrl) return;
			const bust = logoUrl + (logoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
			img.onload = () => revealSplashLogo(img);
			img.onerror = () => {
				resetSplashLogo(img);
				setSplashFallbackTextHidden(false);
			};
			img.src = bust;
			if (img.complete) revealSplashLogo(img);
		});
	}

	function applySplash(data) {
		const html = (data?.splashHtml || '').trim();
		if (!html) {
			const pending = readNavMessage();
			if (pending) {
				enabled = true;
				showFallback();
				return;
			}
			enabled = false;
			removeSplash(true);
			return;
		}
		enabled = true;
		ensureRoot();
		ensureFallbackStyles();
		setSplashCss((data.splashCss || '').trim());
		if (splashHtmlApplied !== html) {
			if (splashAnimateStarted) root.classList.add('sm-splash-no-replay');
			root.innerHTML = html;
			splashHtmlApplied = html;
		}
		applyBrandingHints(data);
	}

	function readSsrAppearance() {
		const el = document.getElementById('sm-appearance-ssr');
		if (!el?.textContent?.trim()) return null;
		try {
			return JSON.parse(el.textContent);
		} catch {
			return null;
		}
	}

	function ensureAppearanceNetworkPromise() {
		if (!global.__appAppearancePromise) {
			global.__appAppearancePromise = fetch(API, { credentials: 'same-origin' })
				.then((r) => (r.ok ? r.json() : null))
				.catch(() => null);
		}
		return global.__appAppearancePromise;
	}

	function fetchAppearance() {
		if (!appearancePromise) {
			const ssr = isServerRendered() ? readSsrAppearance() : null;
			const network = ensureAppearanceNetworkPromise();
			if (ssr) {
				appearancePromise = Promise.resolve(ssr);
				network.then((data) => {
					if (data) global.__appBranding = data;
				}).catch(() => {});
			} else {
				appearancePromise = network;
			}
		}
		return appearancePromise;
	}

	function readNavMessage() {
		try {
			return sessionStorage.getItem(NAV_KEY) || '';
		} catch {
			return '';
		}
	}

	function showFallback() {
		enabled = true;
		hiding = false;
		ensureRoot();
		ensureFallbackStyles();
		const recreated = !root.querySelector('.sm-splash-fallback-logo, [data-app-name], [data-app-logo]');
		if (recreated) {
			if (splashAnimateStarted) root.classList.add('sm-splash-no-replay');
			root.innerHTML = '<div class="sm-splash-fallback-logo" data-app-name></div>';
			splashHtmlApplied = '';
		}
		applyAppNameToSplash(global.__appBranding);
	}

	function show(message) {
		splashAnimDone = false;
		splashAnimateStarted = false;
		if (root) {
			root.classList.remove('sm-splash-animate', 'sm-splash-no-replay');
		}
		showFallback();
		if (message && global.__bootMark) global.__bootMark(message);
		return waitForSplashAnimation();
	}

	function isServerRendered() {
		return document.documentElement.dataset.splashSsr === '1';
	}

	function setBusy(message) {
		if (message && global.__bootMark) global.__bootMark(message);
	}

	function clearBusy() { /* no visible status on splash */ }

	function prepareNavigation(message) {
		try {
			sessionStorage.setItem(NAV_KEY, '1');
		} catch { /* ignore */ }
		if (message && global.__bootMark) global.__bootMark(message);
		ensureRoot();
		ensureFallbackStyles();
		return Promise.resolve();
	}

	function clearNavFlag() {
		try {
			sessionStorage.removeItem(NAV_KEY);
		} catch { /* ignore */ }
	}

	function removeSplash(immediate) {
		if (!root || hiding) {
			if (!root) document.documentElement.classList.remove('sm-splash-active');
			return;
		}
		hiding = true;
		const el = root;
		const finish = () => {
			el.remove();
			root = null;
			hiding = false;
			document.documentElement.classList.remove('sm-splash-active');
		};
		if (immediate) {
			finish();
			return;
		}
		el.classList.add('sm-splash-hiding');
		const onEnd = () => {
			el.removeEventListener('transitionend', onEnd);
			finish();
		};
		el.addEventListener('transitionend', onEnd);
		setTimeout(finish, 450);
	}

	function hide(immediateOrOptions) {
		clearNavFlag();
		const immediate = immediateOrOptions === true
			|| (immediateOrOptions && immediateOrOptions.immediate === true)
			|| !enabled;
		removeSplash(immediate);
	}

	function shouldShowOnInit() {
		if (readNavMessage()) return true;
		if (navigationType() === 'reload') return true;
		if (document.getElementById(ROOT_ID)) return true;
		return false;
	}

	async function init() {
		const existing = document.getElementById(ROOT_ID);
		const pending = readNavMessage();
		const ssr = isServerRendered();

		try {
			if (existing) {
				root = existing;
				document.documentElement.classList.add('sm-splash-active');
				if (existing.classList.contains('sm-splash-animate')) {
					splashAnimateStarted = true;
					markSplashShown();
				} else if (ssr) {
					// SSR: контент виден с первого кадра (critical CSS), без entrance-анимации.
					splashAnimateStarted = true;
					splashAnimDone = true;
					markSplashShown();
				} else {
					startSplashAnimation();
				}
			} else if (shouldShowOnInit()) {
				showFallback();
			}

			const cachedBranding = global.__appBranding || ssr;
			if (cachedBranding) {
				global.__appBranding = cachedBranding;
				if (ssr) {
					if (global.__bootMark) global.__bootMark('appearance-ssr-skip-dom');
				} else if (cachedBranding.splashHtml?.trim()) {
					applySplash(cachedBranding);
				} else if (!root && (pending || shouldShowOnInit())) {
					showFallback();
				} else if (root) {
					applyBrandingHints(cachedBranding);
				}
			}
			void fetchAppearance().then((data) => {
				if (!data) return;
				global.__appBranding = data;
				if (ssr) return;
				if (data.splashHtml?.trim()) {
					applySplash(data);
				} else if (!root && (pending || shouldShowOnInit())) {
					showFallback();
				} else if (root) {
					applyBrandingHints(data);
				}
			}).catch(() => {});
			if (!cachedBranding && !root && !ssr && (pending || shouldShowOnInit())) {
				showFallback();
			}
		} finally {
			appearanceReadyResolve();
			if (global.__appBranding?.appVersion && global.AppUpdateNotifier?.setLocalAppVersion) {
				global.AppUpdateNotifier.setLocalAppVersion(global.__appBranding.appVersion);
			}
			if (global.__bootMark) global.__bootMark('splash-ready');
		}
	}

	global.addEventListener('pageshow', (ev) => {
		if (!ev.persisted) return;
		if (readNavMessage() || !isLoginPage()) show();
	});

	if (document.body) init();
	else document.addEventListener('DOMContentLoaded', init);

	global.AppSplash = {
		hide,
		show,
		setBusy,
		clearBusy,
		prepareNavigation,
		yieldToMain,
		whenAppearanceReady: () => appearanceReady,
		waitForSplashAnimation,
		applySplash,
		fetchAppearance,
		applyBrandingHints,
	};
})(typeof window !== 'undefined' ? window : globalThis);
