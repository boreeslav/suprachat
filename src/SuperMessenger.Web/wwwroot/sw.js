/**
 * Service Worker для кеширования статики приложения (только secure mode / HTTPS).
 *
 * Стратегия:
 *  - Кешируются ТОЛЬКО статические ассеты приложения (скрипты модулей, css,
 *    vendor-бандлы, html-оболочки, иконки, шрифты) — по белому списку.
 *  - API (/api/*), SignalR-хабы (/hubs/*), server-sent events и любые
 *    приватные/динамические запросы НИКОГДА не кешируются (network-only).
 *  - Для статики используется stale-while-revalidate: мгновенная отдача из
 *    кеша + фоновое обновление. Это даёт быстрый запуск и работу офлайн.
 *  - При новом деплое меняется SW_VERSION → старый кеш удаляется на activate.
 *
 * SW_VERSION подставляется деплоем (deploy.ps1).
 */
const SW_VERSION = 0;
const CACHE_NAME = 'sm-static-v' + SW_VERSION;

/** Статика для мгновенного cold start PWA (пути без query — версия добавляется при precache). */
const PRECACHE_PATHS = [
	'/',
	'/index.html',
	'/messenger/app-boot-timing.js',
	'/messenger/app-boot-timing.min.js',
	'/messenger/app-mobile-viewport.js',
	'/messenger/app-splash.js',
	'/messenger/app-splash.min.js',
	'/messenger/app-script-cache.js',
	'/messenger/app-script-cache.min.js',
	'/messenger/app-branding.js',
	'/messenger/app-branding.min.js',
	'/messenger/file-uploader.js',
	'/messenger/file-uploader.min.js',
	'/messenger/supra-qr.js',
	'/messenger/supra-qr.min.js',
	'/messenger/supra-secure-store.js',
	'/messenger/supra-secure-store.min.js',
	'/messenger/supra-crypto.js',
	'/messenger/supra-crypto.min.js',
	'/messenger/supra-auth-crypto.js',
	'/messenger/supra-auth-crypto.min.js',
	'/messenger/supra-messenger.js',
	'/messenger/supra-messenger.min.js',
	'/messenger/supra-integration.js',
	'/messenger/supra-integration.min.js',
	'/messenger/supra-push.js',
	'/messenger/supra-push.min.js',
	'/messenger/supra-master-unlock.js',
	'/messenger/supra-master-unlock.min.js',
	'/messenger/supra-messenger.css',
	'/messenger/vendor/signalr.min.js',
	'/messenger/vendor/qrcode.min.js',
	'/messenger/vendor/supra-markdown.bundle.js',
	'/messenger/vendor/supra-webcrypto.bundle.js',
	'/api/app/icons/icon-192.png',
	'/api/app/icons/icon-512.png',
];

const STATIC_EXT = /\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico|map|wasm)$/i;

/** Загрузчик и ядро — всегда с сети, иначе stale-while-revalidate отдаёт старый loader. */
const NETWORK_FIRST_PATHS = [
	'/sw.js',
	'/messenger/app-script-cache.js',
	'/messenger/app-script-cache.min.js',
	'/messenger/app-update-notifier.js',
	'/messenger/app-update-notifier.min.js',
	'/messenger/supra-messenger.js',
	'/messenger/supra-messenger.min.js',
	'/messenger/supra-integration.js',
	'/messenger/supra-integration.min.js',
];

function isHtmlRequest(req, url) {
	if (req.mode === 'navigate') return true;
	if (url.pathname === '/' || url.pathname.endsWith('.html')) return true;
	return false;
}

function isStaticAsset(url) {
	if (url.pathname.startsWith('/messenger/')) return STATIC_EXT.test(url.pathname);
	return STATIC_EXT.test(url.pathname);
}

function isBypassed(url) {
	const p = url.pathname;
	return (
		p.startsWith('/api/') ||
		p.startsWith('/hubs/') ||
		p.startsWith('/files/') ||
		p.startsWith('/uploads/') ||
		p.startsWith('/avatar') ||
		p === '/manifest.webmanifest' ||
		p.includes('/negotiate')
	);
}

function isNetworkFirstAsset(url) {
	const path = url.pathname;
	return NETWORK_FIRST_PATHS.some((p) => path === p || path.endsWith(p));
}

self.addEventListener('install', (event) => {
	if (!SW_VERSION) {
		self.skipWaiting();
		return;
	}
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			const versioned = PRECACHE_PATHS.map((p) => p + '?v=' + SW_VERSION);
			await Promise.allSettled(versioned.map((url) => cache.add(url)));
			try {
				const shellRes = await fetch('/index.html?v=' + SW_VERSION);
				if (shellRes && shellRes.ok) {
					await cache.put('/index.html', shellRes.clone());
					await cache.put(new Request(self.location.origin + '/'), shellRes.clone());
				}
			} catch (_) { /* ignore */ }
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys();
			await Promise.all(
				names
					.filter((n) => n.startsWith('sm-static-v') && n !== CACHE_NAME)
					.map((n) => caches.delete(n))
			);
			await self.clients.claim();
			const clients = await self.clients.matchAll({ type: 'window' });
			for (const client of clients) {
				try {
					client.postMessage({ type: 'sm-update-available' });
				} catch (_) { /* ignore */ }
			}
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data === 'skipWaiting') self.skipWaiting();
});

/**
 * Web Push: приложение свёрнуто/закрыто. Из-за E2E-шифрования сервер не знает
 * текста сообщения, поэтому payload общий — показываем нейтральное уведомление.
 * Реальный контент пользователь увидит после открытия приложения.
 */
self.addEventListener('push', (event) => {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch (_) {
		data = {};
	}

	const title = data.title || 'Новое сообщение';
	const chatId = (data && data.chatId) ? String(data.chatId) : '';
	const options = {
		body: data.body || 'Откройте приложение, чтобы прочитать.',
		icon: '/api/app/icons/icon-192.png',
		badge: '/api/app/icons/badge-72.png',
		tag: chatId ? ('sm-chat-' + chatId) : 'sm-new-message',
		renotify: true,
		data: { url: (data && data.url) || '/', chatId: chatId || null },
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = (event.notification.data && event.notification.data.url) || '/';

	event.waitUntil(
		(async () => {
			const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of all) {
				try {
					const u = new URL(client.url);
					if (u.origin === self.location.origin && 'focus' in client) {
						return client.focus();
					}
				} catch (_) { /* ignore */ }
			}
			if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
			return undefined;
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;

	let url;
	try {
		url = new URL(req.url);
	} catch (_) {
		return;
	}

	if (url.origin !== self.location.origin) return;
	if (isBypassed(url)) return;
	if ((req.headers.get('accept') || '').includes('text/event-stream')) return;

	// HTML-оболочка: мгновенно из кеша (PWA cold start), фоновое обновление после деплоя.
	if (isHtmlRequest(req, url)) {
		event.respondWith(staleWhileRevalidate(req));
		return;
	}

	// Версионированная статика: мгновенно из кеша + фоновое обновление.
	if (isStaticAsset(url)) {
		if (isNetworkFirstAsset(url)) {
			event.respondWith(networkFirst(req));
			return;
		}
		event.respondWith(staleWhileRevalidate(req));
	}
});

async function networkFirst(req) {
	const cache = await caches.open(CACHE_NAME);
	try {
		const res = await fetch(req);
		if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
			cache.put(req, res.clone()).catch(() => { /* ignore quota */ });
		}
		return res;
	} catch (_) {
		const cached = await cache.match(req);
		if (cached) return cached;
		return new Response('Offline', { status: 503, statusText: 'Offline' });
	}
}

async function matchCachedHtml(req, cache) {
	let cached = await cache.match(req);
	if (cached) return cached;
	if (req.mode !== 'navigate') return null;
	const url = new URL(req.url);
	const path = url.pathname;
	if (path === '/' || path.endsWith('.html') || /^\/@[^/]+$/i.test(path)) {
		cached = await cache.match('/index.html');
		if (cached) return cached;
		cached = await cache.match(new Request(url.origin + '/'));
	}
	return cached || null;
}

async function staleWhileRevalidate(req) {
	const cache = await caches.open(CACHE_NAME);
	const cached = (await matchCachedHtml(req, cache)) || (await cache.match(req));

	const network = fetch(req)
		.then((res) => {
			if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
				cache.put(req, res.clone()).catch(() => { /* ignore quota */ });
			}
			return res;
		})
		.catch(() => null);

	if (cached) {
		network.catch(() => { /* ignore background errors */ });
		return cached;
	}

	const fresh = await network;
	if (fresh) return fresh;
	return new Response('Offline', { status: 503, statusText: 'Offline' });
}
