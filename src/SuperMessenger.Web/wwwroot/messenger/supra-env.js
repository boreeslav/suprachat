/**
 * Единая точка определения режима работы приложения.
 *
 * secure  — современный путь: HTTPS/secure context + нативный Web Crypto.
 *           Включает персистентное шифрованное хранилище (IndexedDB +
 *           non-extractable CryptoKey) и кеширование статики через Service Worker.
 * legacy  — запасной путь для HTTP без TLS (origin вида http://192.168.x.x):
 *           node-forge полифилл, мастер-пароль только в sessionStorage,
 *           кеш скриптов в localStorage, без Service Worker.
 *
 * DEPLOY_PROTOCOL подставляется деплоем (deploy.ps1): 'auto' | 'http' | 'https'.
 * 'http' принудительно отключает secure-режим даже на localhost.
 * При 'auto' решение принимается во время выполнения по isSecureContext.
 */
(function (global) {
	const DEPLOY_PROTOCOL = 'auto';

	function hasNativeSubtle() {
		try {
			const c = global.crypto;
			return !!(c && c.subtle && typeof c.subtle.generateKey === 'function');
		} catch (_) {
			return false;
		}
	}

	function isSecureContext() {
		return global.isSecureContext === true;
	}

	const env = {
		deployProtocol: DEPLOY_PROTOCOL,
		hasNativeSubtle: hasNativeSubtle(),
		isSecureContext: isSecureContext(),

		/** Доступен ли современный защищённый путь. */
		get secure() {
			if (this.deployProtocol === 'http') return false;
			return this.isSecureContext && this.hasNativeSubtle;
		},

		/** Можно ли регистрировать Service Worker. */
		get serviceWorkerEnabled() {
			return this.secure && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
		},
	};

	global.SupraEnv = env;
})(typeof window !== 'undefined' ? window : globalThis);
