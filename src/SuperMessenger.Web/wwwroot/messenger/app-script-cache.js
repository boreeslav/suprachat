(function (global) {

	/** Подставляется автоматически в deploy.ps1 при каждом деплое. */

	const BUILD_NUMBER = 0;



	const LS_BUILD_KEY = 'supra-scripts-build';

	const LS_SCRIPT_PREFIX = 'supra-script:';



	const USE_MINIFIED = BUILD_NUMBER > 0;



	function resolveScriptPath(url) {

		if (!USE_MINIFIED || !url.endsWith('.js')) return url;

		if (url.includes('/vendor/')) return url;

		return url.replace(/\.js$/, '.min.js');

	}



	/** Волны параллельной загрузки (зависимости между волнами, внутри волны — параллельно). */

	const SCRIPT_WAVES = [

		[

			'/messenger/vendor/signalr.min.js',

			'/messenger/vendor/qrcode.min.js',

			'/messenger/file-uploader.js',

			'/messenger/app-branding.js',

			'/messenger/vendor/supra-webcrypto.bundle.js',

		],

		[

			'/messenger/supra-qr.js',

			'/messenger/supra-secure-store.js',

			'/messenger/supra-crypto.js',

			'/messenger/supra-auth-crypto.js',

		],

		[

			'/messenger/supra-messenger.js',

		],

		[

			'/messenger/supra-integration.js',

		],

	];

	const DEFERRED_SCRIPTS = [

		'/messenger/supra-push.js',

		'/messenger/supra-master-unlock.js',

	];

	const SCRIPTS = [...SCRIPT_WAVES.flat(), ...DEFERRED_SCRIPTS].map(resolveScriptPath);



	const scriptPrefetch = new Map();

	const injectedScripts =
		global.__smInjectedScripts instanceof Set
			? global.__smInjectedScripts
			: new Set();

	global.__smInjectedScripts = injectedScripts;

	const injectInflight = new Map();



	function hasScriptTag(resolved) {

		return !!document.querySelector('script[data-sm-script="' + resolved.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');

	}



	function removeInjectedScriptTags() {

		document.querySelectorAll('script[data-sm-script]').forEach((el) => {

			const key = el.getAttribute('data-sm-script');

			if (key) injectedScripts.delete(key);

			el.remove();

		});

	}



	function shouldSkipScript(resolved) {

		if (resolved.includes('supra-messenger') && global.Messenger) return true;

		if (resolved.includes('supra-integration') && global.__smIntegrationStarted) return true;

		return false;

	}



	function isScriptInjected(url) {

		return injectedScripts.has(resolveScriptPath(url));

	}



	function markScriptInjected(url) {

		injectedScripts.add(resolveScriptPath(url));

	}



	function isSecureMode() {

		return !!(global.SupraEnv && global.SupraEnv.secure);

	}



	function scriptStorageKey(url) {

		try {

			const parsed = new URL(url, global.location.origin);

			return LS_SCRIPT_PREFIX + parsed.pathname;

		} catch {

			return LS_SCRIPT_PREFIX + url;

		}

	}



	function fetchUrl(url) {

		const resolved = resolveScriptPath(url);

		const sep = resolved.includes('?') ? '&' : '?';

		return resolved + sep + 'v=' + BUILD_NUMBER;

	}



	function prefetchScript(url) {

		const key = resolveScriptPath(url);

		if (scriptPrefetch.has(key)) return scriptPrefetch.get(key);

		const p = fetch(fetchUrl(url), { credentials: 'same-origin' })

			.then((r) => {

				if (!r.ok) throw new Error('[AppScriptCache] HTTP ' + r.status + ' for ' + key);

				return r.text();

			})

			.catch((err) => {

				scriptPrefetch.delete(key);

				throw err;

			});

		scriptPrefetch.set(key, p);

		return p;

	}



	function prefetchWave(urls) {

		urls.forEach((url) => prefetchScript(url));

	}



	function getStoredBuild() {

		try {

			return localStorage.getItem(LS_BUILD_KEY);

		} catch {

			return null;

		}

	}



	function listScriptCacheKeys() {

		const keys = new Set();

		try {

			for (let i = 0; i < localStorage.length; i++) {

				const key = localStorage.key(i);

				if (key && key.startsWith(LS_SCRIPT_PREFIX)) keys.add(key);

			}

		} catch { /* ignore */ }

		return keys;

	}



	function hasAllScripts() {

		const keys = listScriptCacheKeys();

		return SCRIPTS.every((url) => keys.has(scriptStorageKey(url)));

	}



	function isCacheValid() {

		return String(BUILD_NUMBER) === getStoredBuild() && hasAllScripts();

	}



	function injectScript(code, url) {

		const resolved = resolveScriptPath(url);

		if (shouldSkipScript(resolved)) {

			injectedScripts.add(resolved);

			return Promise.resolve();

		}

		if (injectedScripts.has(resolved) || hasScriptTag(resolved)) {

			injectedScripts.add(resolved);

			return Promise.resolve();

		}

		const pending = injectInflight.get(resolved);

		if (pending) return pending;

		let settle;

		const promise = new Promise((resolve, reject) => {

			settle = { resolve, reject };

		});

		injectInflight.set(resolved, promise);

		injectedScripts.add(resolved);

		const el = document.createElement('script');

		el.dataset.smScript = resolved;

		if (code != null) {

			const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' });

			const blobUrl = URL.createObjectURL(blob);

			el.src = blobUrl;

			el.onload = () => {

				URL.revokeObjectURL(blobUrl);

				settle.resolve();

			};

			el.onerror = () => {

				URL.revokeObjectURL(blobUrl);

				injectedScripts.delete(resolved);

				el.remove();

				settle.reject(new Error('[AppScriptCache] failed to execute cached ' + resolved));

			};

			document.body.appendChild(el);

		} else {

			el.src = fetchUrl(url);

			el.onload = () => settle.resolve();

			el.onerror = () => {

				injectedScripts.delete(resolved);

				el.remove();

				settle.reject(new Error('[AppScriptCache] failed to load ' + resolved));

			};

			document.body.appendChild(el);

		}

		promise.finally(() => injectInflight.delete(resolved));

		return promise;

	}



	function injectScriptFast(url) {

		const key = resolveScriptPath(url);

		const prefetched = scriptPrefetch.get(key);

		if (prefetched) {

			return prefetched.then((code) => injectScript(code, url));

		}

		return injectScript(null, url);

	}



	function tryStoreScript(url, code) {

		const key = resolveScriptPath(url);

		try {

			localStorage.setItem(scriptStorageKey(key), code);

			return true;

		} catch (err) {

			console.warn('[AppScriptCache] cannot store', key, err);

			return false;

		}

	}



	function fetchScript(url) {

		return prefetchScript(url);

	}



	function loadScriptFromServer(url) {

		return fetchScript(url).then((code) => {

			const stored = tryStoreScript(url, code);

			return injectScript(code, url).then(() => stored);

		});

	}



	function setWaveLoadStatus(waveIndex, waveSize, totalIndex) {
		if (global.__bootMark) {
			global.__bootMark(
				'module-' + (waveIndex + 1) + '/' + SCRIPT_WAVES.length + '-' + totalIndex + '/' + SCRIPT_WAVES.flat().length
			);
		}
	}



	let deferredLoadPromise = null;



	function loadDeferredScripts() {

		if (!deferredLoadPromise) {

			deferredLoadPromise = (async () => {

				if (isSecureMode()) {

					await Promise.all(DEFERRED_SCRIPTS.map((url) => injectScriptFast(url)));

					return;

				}

				if (isCacheValid()) {

					await Promise.all(DEFERRED_SCRIPTS.map((url) => {

						const key = resolveScriptPath(url);

						const code = localStorage.getItem(scriptStorageKey(key));

						if (!code) return loadScriptFromServer(url);

						return injectScript(code, url);

					}));

					return;

				}

				await Promise.all(DEFERRED_SCRIPTS.map((url) => loadScriptFromServer(url)));

			})().catch((err) => {

				deferredLoadPromise = null;

				console.warn('[AppScriptCache] deferred scripts load error', err);

				throw err;

			});

		}

		return deferredLoadPromise;

	}



	function ensureDeferredScripts() {

		return loadDeferredScripts();

	}



	async function loadWaveFromCache(wave, waveIndex, startIndex) {

		await Promise.all(wave.map((url, i) => {

			setWaveLoadStatus(waveIndex, wave.length, startIndex + i + 1);

			const key = resolveScriptPath(url);

			const code = localStorage.getItem(scriptStorageKey(key));

			if (!code) throw new Error('[AppScriptCache] missing cached script ' + key);

			return injectScript(code, url);

		}));

	}



	async function loadWaves(loader) {

		const flatCount = SCRIPT_WAVES.flat().length;

		let index = 0;

		for (let w = 0; w < SCRIPT_WAVES.length; w++) {

			const wave = SCRIPT_WAVES[w];

			if (w + 1 < SCRIPT_WAVES.length) prefetchWave(SCRIPT_WAVES[w + 1]);

			await loader(wave, w, index);

			index += wave.length;

		}

		loadDeferredScripts();

	}



	async function loadFromCache() {

		await loadWaves((wave, w, index) => loadWaveFromCache(wave, w, index));

	}



	async function loadFromServer() {

		let allStored = true;

		await loadWaves(async (wave, w, index) => {

			const storedFlags = await Promise.all(wave.map((url, i) => {

				setWaveLoadStatus(w, wave.length, index + i + 1);

				return loadScriptFromServer(url);

			}));

			if (storedFlags.some((ok) => !ok)) allStored = false;

		});

		if (allStored) {

			try {

				localStorage.setItem(LS_BUILD_KEY, String(BUILD_NUMBER));

			} catch (err) {

				console.warn('[AppScriptCache] cannot store build number', err);

			}

		}

	}



	async function loadViaNetwork() {

		prefetchWave(SCRIPT_WAVES[0]);

		await loadWaves(async (wave, w, index) => {

			await Promise.all(wave.map((url, i) => {

				setWaveLoadStatus(w, wave.length, index + i + 1);

				return injectScriptFast(url);

			}));

		});

	}



	async function unregisterStaleWorkers() {

		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

		const regs = await navigator.serviceWorker.getRegistrations();

		await Promise.all(regs.map((r) => r.unregister().catch(() => false)));

		if (global.caches?.keys) {

			const names = await global.caches.keys();

			await Promise.all(

				names.filter((n) => n.startsWith('sm-static-v')).map((n) => global.caches.delete(n))

			);

		}

	}



	async function registerServiceWorker() {

		if (!global.SupraEnv || !global.SupraEnv.serviceWorkerEnabled) return;

		if (!BUILD_NUMBER) {

			try { await unregisterStaleWorkers(); } catch (_) { /* ignore */ }

			return;

		}

		if (navigator.serviceWorker.controller) return;

		try {

			const reg = await navigator.serviceWorker.register('/sw.js?v=' + BUILD_NUMBER);

			if (reg.waiting) reg.waiting.postMessage('skipWaiting');

		} catch (err) {

			console.warn('[AppScriptCache] service worker registration failed', err);

		}

	}



	function clear() {

		try {

			localStorage.removeItem(LS_BUILD_KEY);

			const toRemove = [];

			for (let i = 0; i < localStorage.length; i++) {

				const key = localStorage.key(i);

				if (key && key.startsWith(LS_SCRIPT_PREFIX)) toRemove.push(key);

			}

			toRemove.forEach((key) => localStorage.removeItem(key));

			removeInjectedScriptTags();

		} catch (err) {

			console.warn('[AppScriptCache] clear failed', err);

		}

	}



	function startUpdateNotifier() {

		const tryStart = () => {

			if (!global.AppUpdateNotifier?.start) return false;

			global.AppUpdateNotifier.start(BUILD_NUMBER);

			return true;

		};

		if (tryStart()) return;

		let attempts = 0;

		const timer = global.setInterval(() => {

			attempts += 1;

			if (tryStart() || attempts >= 200) global.clearInterval(timer);

		}, 50);

	}



	async function bootstrap() {

		if (global.__smScriptBootstrapPromise) {

			return global.__smScriptBootstrapPromise;

		}

		global.__smScriptBootstrapPromise = bootstrapInner();

		return global.__smScriptBootstrapPromise;

	}



	function notifyBootComplete() {

		try {

			global.AppUpdateNotifier?.markBootComplete?.();

		} catch (_) { /* ignore */ }

	}



	async function bootstrapInner() {

		if (global.__bootMark) global.__bootMark('bootstrap-start');

		startUpdateNotifier();



		if (isSecureMode()) {

			registerServiceWorker();

			clear();

			try {

				await loadViaNetwork();

			} catch (err) {

				console.warn('[AppScriptCache] network load error', err);

				if (global.Messenger) return;

				if (!global.__smScriptReloadAttempted) {

					global.__smScriptReloadAttempted = true;

					global.location.reload();

					return;

				}

				throw err;

			}

			if (global.__bootMark) global.__bootMark('modules-ready');

			notifyBootComplete();

			return;

		}



		try {

			if (isCacheValid()) await loadFromCache();

			else await loadFromServer();

		} catch (err) {

			console.warn('[AppScriptCache] cache miss or load error, reloading from server', err);

			if (global.Messenger) return;

			clear();

			scriptPrefetch.clear();

			await loadFromServer();

		}

		if (global.__bootMark) global.__bootMark('modules-ready');

		notifyBootComplete();

	}



	prefetchWave(SCRIPT_WAVES[0]);



	global.AppScriptCache = {

		BUILD_NUMBER,

		clear,

		bootstrap,

		loadDeferredScripts,

		ensureDeferredScripts,

	};



	bootstrap();

})(typeof window !== 'undefined' ? window : globalThis);

