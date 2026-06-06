/**
 * Уведомление о новой версии приложения: сравнивает локальный BUILD_NUMBER,
 * appVersion и SW с сервером; показывает баннер «Обновить / Позже».
 */
(function (global) {
	const BUILD_URL = '/api/app/build';
	const SNOOZE_KEY = 'sm-update-snooze-until';
	const LS_BUILD_KEY = 'sm-client-build';
	const LS_VERSION_KEY = 'sm-client-app-version';
	const BANNER_ID = 'sm-update-banner';
	const STYLE_ID = 'sm-update-banner-css';
	const CHECK_INTERVAL_MS = 30_000;
	const SNOOZE_MS = 60_000;

	let localBuild = 0;
	let localAppVersion = '';
	let started = false;
	let checkTimer = null;
	let snoozeTimer = null;

	function isValidAppVersion(version) {
		const v = (version || '').trim();
		if (!v || v.length > 32) return false;
		if (/[<{]/.test(v) || /--/.test(v) || /SM_/.test(v)) return false;
		return true;
	}

	function readStoredBuild() {
		try {
			const v = Number(sessionStorage.getItem(LS_BUILD_KEY) || 0);
			return Number.isFinite(v) && v > 0 ? v : 0;
		} catch {
			return 0;
		}
	}

	function readMetaBuild() {
		try {
			const v = Number((document.querySelector('meta[name="sm-build"]') || {}).content || 0);
			return Number.isFinite(v) && v > 0 ? v : 0;
		} catch {
			return 0;
		}
	}

	function resolveClientBuild() {
		return Math.max(localBuild, readStoredBuild(), readMetaBuild());
	}

	function readStoredAppVersion() {
		try {
			return (sessionStorage.getItem(LS_VERSION_KEY) || '').trim();
		} catch {
			return '';
		}
	}

	function persistClientState() {
		try {
			if (localBuild > 0) sessionStorage.setItem(LS_BUILD_KEY, String(localBuild));
			if (localAppVersion) sessionStorage.setItem(LS_VERSION_KEY, localAppVersion);
		} catch { /* ignore */ }
	}

	function resolveLocalAppVersion() {
		const candidates = [
			localAppVersion,
			global.__appBranding?.appVersion,
			readStoredAppVersion(),
			(document.querySelector('meta[name="sm-app-version"]') || {}).content,
		];
		for (const raw of candidates) {
			const v = (raw || '').trim();
			if (isValidAppVersion(v)) return v;
		}
		return '';
	}

	function setLocalAppVersion(version) {
		const v = (version || '').trim();
		if (!v) return;
		localAppVersion = v;
		persistClientState();
		if (started) checkForUpdate();
	}

	function isSnoozed() {
		try {
			const until = Number(sessionStorage.getItem(SNOOZE_KEY) || 0);
			return until > Date.now();
		} catch {
			return false;
		}
	}

	function setSnooze() {
		try {
			sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
		} catch { /* ignore */ }
	}

	function clearSnoozeTimer() {
		if (snoozeTimer != null) {
			clearTimeout(snoozeTimer);
			snoozeTimer = null;
		}
	}

	function scheduleSnoozeRecheck() {
		clearSnoozeTimer();
		if (!started || localBuild <= 0) return;
		let delay = SNOOZE_MS;
		try {
			const until = Number(sessionStorage.getItem(SNOOZE_KEY) || 0);
			delay = Math.max(0, until - Date.now());
		} catch { /* ignore */ }
		if (delay <= 0) return;
		snoozeTimer = setTimeout(() => {
			snoozeTimer = null;
			checkForUpdate();
		}, delay);
	}

	function ensureStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = [
			'#sm-update-banner{',
			'position:fixed;left:0;right:0;bottom:0;z-index:2147483640;',
			'display:flex;align-items:center;justify-content:center;',
			'padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));',
			'background:#1c1c1e;color:#fff;',
			'box-shadow:0 -4px 24px rgba(0,0,0,.25);',
			'font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;',
			'animation:sm-update-banner-in .25s ease;',
			'}',
			'@keyframes sm-update-banner-in{',
			'from{transform:translateY(100%);opacity:0}',
			'to{transform:translateY(0);opacity:1}',
			'}',
			'.sm-update-banner-inner{',
			'width:100%;max-width:720px;display:flex;flex-wrap:wrap;',
			'align-items:center;gap:12px 16px;',
			'}',
			'.sm-update-banner-text{flex:1 1 200px;margin:0;font-size:14px;line-height:1.4}',
			'.sm-update-banner-actions{display:flex;flex-wrap:wrap;gap:8px}',
			'.sm-update-banner-btn{',
			'appearance:none;border:none;border-radius:8px;padding:10px 16px;',
			'font:inherit;font-weight:600;cursor:pointer;white-space:nowrap;',
			'}',
			'.sm-update-banner-btn--primary{background:#4a7fc1;color:#fff}',
			'.sm-update-banner-btn--primary:hover{background:#3d6da8}',
			'.sm-update-banner-btn--secondary{background:rgba(255,255,255,.12);color:#fff}',
			'.sm-update-banner-btn--secondary:hover{background:rgba(255,255,255,.2)}',
		].join('');
		document.head.appendChild(style);
	}

	function hideBanner() {
		const el = document.getElementById(BANNER_ID);
		if (el) el.remove();
	}

	function showBanner(serverVersion) {
		if (document.getElementById(BANNER_ID)) return;
		ensureStyles();

		const banner = document.createElement('div');
		banner.id = BANNER_ID;
		banner.setAttribute('role', 'status');
		banner.setAttribute('aria-live', 'polite');

		const inner = document.createElement('div');
		inner.className = 'sm-update-banner-inner';

		const text = document.createElement('p');
		text.className = 'sm-update-banner-text';
		const verHint = serverVersion ? ' (версия ' + serverVersion + ')' : '';
		text.textContent =
			'Доступна новая версия приложения' + verHint;

		const actions = document.createElement('div');
		actions.className = 'sm-update-banner-actions';

		const laterBtn = document.createElement('button');
		laterBtn.type = 'button';
		laterBtn.className = 'sm-update-banner-btn sm-update-banner-btn--secondary';
		laterBtn.textContent = 'Позже';
		laterBtn.addEventListener('click', () => {
			hideBanner();
			setSnooze();
			scheduleSnoozeRecheck();
		});

		const updateBtn = document.createElement('button');
		updateBtn.type = 'button';
		updateBtn.className = 'sm-update-banner-btn sm-update-banner-btn--primary';
		updateBtn.textContent = 'Обновить';
		updateBtn.addEventListener('click', () => {
			updateBtn.disabled = true;
			laterBtn.disabled = true;
			applyUpdate();
		});

		actions.append(laterBtn, updateBtn);
		inner.append(text, actions);
		banner.appendChild(inner);
		document.body.appendChild(banner);
	}

	async function fetchServerVersion() {
		const res = await fetch(BUILD_URL + '?_=' + Date.now(), {
			credentials: 'same-origin',
			cache: 'no-store',
		});
		if (!res.ok) throw new Error('HTTP ' + res.status);
		const data = await res.json();
		const build = Number(data && data.build);
		const swVersion = Number(data && data.swVersion);
		const appVersion = String((data && data.appVersion) || '').trim();
		if (!Number.isFinite(build) || build < 0) throw new Error('invalid build');
		return {
			build,
			swVersion: Number.isFinite(swVersion) ? swVersion : build,
			appVersion,
		};
	}

	function isUpdateAvailable(server) {
		const clientBuild = resolveClientBuild();
		if (server.build > clientBuild) return true;
		if (server.swVersion > clientBuild) return true;
		const clientVersion = resolveLocalAppVersion();
		if (
			isValidAppVersion(clientVersion)
			&& isValidAppVersion(server.appVersion)
			&& clientVersion !== server.appVersion
		) {
			return true;
		}
		return false;
	}

	function syncClientState(server) {
		if (server.build >= localBuild) {
			localBuild = Math.max(localBuild, server.build, readMetaBuild());
		}
		if (isValidAppVersion(server.appVersion)) {
			localAppVersion = server.appVersion;
		}
		persistClientState();
	}

	function markBootComplete() {
		if (!started) return;
		const metaBuild = readMetaBuild();
		if (metaBuild > localBuild) localBuild = metaBuild;
		persistClientState();
		hideBanner();
		checkForUpdate();
	}

	async function checkForUpdate() {
		if (!started || localBuild <= 0 || isSnoozed()) return;
		try {
			const server = await fetchServerVersion();
			if (isUpdateAvailable(server)) {
				showBanner(server.appVersion || null);
			} else {
				hideBanner();
				syncClientState(server);
			}
		} catch (err) {
			console.warn('[AppUpdateNotifier] check failed', err);
		}
	}

	async function applyUpdate() {
		try {
			if (global.AppScriptCache?.clear) global.AppScriptCache.clear();
		} catch { /* ignore */ }

		try {
			if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
				const regs = await navigator.serviceWorker.getRegistrations();
				await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
			}
		} catch { /* ignore */ }

		try {
			if (global.caches?.keys) {
				const names = await global.caches.keys();
				await Promise.all(
					names.filter((n) => n.startsWith('sm-static-v')).map((n) => global.caches.delete(n))
				);
			}
		} catch { /* ignore */ }

		try {
			sessionStorage.removeItem(SNOOZE_KEY);
		} catch { /* ignore */ }

		const url = new URL(global.location.href);
		url.searchParams.set('_sm_reload', String(Date.now()));
		global.location.replace(url.toString());
	}

	function watchServiceWorker() {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

		navigator.serviceWorker.addEventListener('message', (event) => {
			if (event.data && event.data.type === 'sm-update-available') {
				checkForUpdate();
			}
		});

		navigator.serviceWorker.ready.then((reg) => {
			reg.addEventListener('updatefound', () => {
				const sw = reg.installing;
				if (!sw) return;
				sw.addEventListener('statechange', () => {
					if (sw.state === 'installed' && navigator.serviceWorker.controller) {
						checkForUpdate();
					}
				});
			});
		}).catch(() => { /* ignore */ });

		navigator.serviceWorker.addEventListener('controllerchange', () => {
			checkForUpdate();
		});
	}

	function onVisibilityChange() {
		if (document.visibilityState === 'visible') checkForUpdate();
	}

	function hookAppearanceReady() {
		const applyVersion = () => {
			const v = (global.__appBranding?.appVersion || '').trim();
			if (isValidAppVersion(v)) {
				setLocalAppVersion(v);
				return;
			}
			localAppVersion = resolveLocalAppVersion();
			if (started) checkForUpdate();
		};
		const p = global.AppSplash?.whenAppearanceReady?.();
		if (p && typeof p.then === 'function') {
			p.then(applyVersion).catch(() => { /* ignore */ });
			return;
		}
		applyVersion();
	}

	function start(buildNumber) {
		localBuild = Math.max(Number(buildNumber) || 0, readMetaBuild());
		if (started || localBuild <= 0) return;
		started = true;

		localAppVersion = resolveLocalAppVersion();
		persistClientState();

		watchServiceWorker();
		hookAppearanceReady();
		document.addEventListener('visibilitychange', onVisibilityChange);

		if (isSnoozed()) scheduleSnoozeRecheck();
		else {
			checkForUpdate();
			checkTimer = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
		}
	}

	function stop() {
		started = false;
		if (checkTimer != null) {
			clearInterval(checkTimer);
			checkTimer = null;
		}
		clearSnoozeTimer();
		document.removeEventListener('visibilitychange', onVisibilityChange);
		hideBanner();
	}

	global.AppUpdateNotifier = {
		start,
		stop,
		checkForUpdate,
		applyUpdate,
		setLocalAppVersion,
		markBootComplete,
	};
})(typeof window !== 'undefined' ? window : globalThis);
