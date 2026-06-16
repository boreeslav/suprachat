(function (global) {
	'use strict';

	const DB_NAME = 'MiniAppCacheDB';
	const STORE = 'bundles';

	let dbPromise = null;

	function openDb() {
		if (!dbPromise) {
			dbPromise = new Promise((resolve, reject) => {
				const req = indexedDB.open(DB_NAME, 1);
				req.onupgradeneeded = () => {
					const db = req.result;
					if (!db.objectStoreNames.contains(STORE)) {
						db.createObjectStore(STORE, { keyPath: 'messageId' });
					}
				};
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
		}
		return dbPromise;
	}

	async function get(messageId) {
		try {
			const db = await openDb();
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(STORE, 'readonly');
				const req = tx.objectStore(STORE).get(String(messageId));
				req.onsuccess = () => resolve(req.result || null);
				req.onerror = () => reject(req.error);
			});
		} catch {
			return null;
		}
	}

	async function put(entry) {
		try {
			const db = await openDb();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(STORE, 'readwrite');
				tx.objectStore(STORE).put(entry);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
			return true;
		} catch (err) {
			console.warn('[MiniAppCache] put failed', err);
			return false;
		}
	}

	async function remove(messageId) {
		try {
			const db = await openDb();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(STORE, 'readwrite');
				tx.objectStore(STORE).delete(String(messageId));
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
		} catch { /* ignore */ }
	}

	async function removeByChat(chatId) {
		try {
			const db = await openDb();
			const all = await new Promise((resolve, reject) => {
				const tx = db.transaction(STORE, 'readonly');
				const req = tx.objectStore(STORE).getAll();
				req.onsuccess = () => resolve(req.result || []);
				req.onerror = () => reject(req.error);
			});
			for (const row of all) {
				if (row.chatId === chatId) await remove(row.messageId);
			}
		} catch { /* ignore */ }
	}

	async function fetchFileBlob(url) {
		const res = await fetch(url, { credentials: 'same-origin' });
		if (!res.ok) throw new Error('HTTP ' + res.status);
		return res.blob();
	}

	async function cacheFromManifest(messageId, chatId, manifest, getFileUrl) {
		if (!manifest?.reusable || !manifest.files?.length) return null;
		const files = {};
		for (const f of manifest.files) {
			const url = getFileUrl(f.fileId);
			files[f.path] = await fetchFileBlob(url);
		}
		const entry = {
			messageId: String(messageId),
			chatId: String(chatId),
			bundleHash: manifest.bundleHash || '',
			manifest,
			files,
			cachedAt: Date.now(),
		};
		await put(entry);
		return entry;
	}

	global.MiniAppCache = {
		get,
		put,
		remove,
		removeByChat,
		cacheFromManifest,
	};
})(typeof window !== 'undefined' ? window : globalThis);
