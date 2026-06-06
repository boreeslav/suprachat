/**
 * Персистентное шифрованное хранилище секретов в браузере.
 *
 * Идея (современный безопасный паттерн для HTTPS):
 *  - В IndexedDB кладётся НЕэкспортируемый (extractable:false) AES-GCM CryptoKey.
 *    Браузер позволяет хранить CryptoKey через structured clone, но никакой JS —
 *    включая возможный XSS — не может прочитать сырой материал ключа обратно,
 *    только использовать его для encrypt/decrypt.
 *  - Секрет (например, мастер-пароль сессии) шифруется этим ключом и сохраняется
 *    рядом в виде {iv, ct}. После перезапуска браузера данные восстанавливаются
 *    без повторного ввода пароля.
 *
 * Требует secure context + нативный Web Crypto (см. SupraEnv.secure).
 * В legacy-режиме (HTTP) не используется.
 */
(function (global) {
	const DB_NAME = 'SupraSecureStore';
	const DB_VERSION = 1;
	const STORE_KEYS = 'keys';
	const STORE_VAULT = 'vault';
	const WRAP_KEY_ID = 'wrap-v1';
	/** Резерв зашифрованного vault в localStorage (на части PWA IndexedDB очищается раньше). */
	const LS_DEVICE_SECRET = 'supra-device-secret-v1';
	const LS_VAULT_PREFIX = 'supra-vault-backup:';

	function available() {
		return !!(global.SupraEnv?.secure && global.indexedDB);
	}

	let persistencePromise = null;

	/**
	 * Запросить «постоянное» хранилище у браузера.
	 *
	 * Без этого IndexedDB/Cache считаются «best-effort»: на части телефонов
	 * (Android под нехваткой памяти, агрессивные «очистители», Samsung Internet
	 * и т.п.) данные origin'а вычищаются после закрытия приложения — и тогда
	 * пропадает закешированный мастер-пароль, из-за чего приложение снова
	 * просит его при входе, хотя пользователь залогинен.
	 *
	 * Для установленного PWA разрешение обычно выдаётся без запроса. Вызов
	 * идемпотентен и безопасен (любые ошибки/неподдержку проглатываем).
	 */
	function ensurePersistence() {
		if (persistencePromise) return persistencePromise;
		persistencePromise = (async () => {
			try {
				const storage = global.navigator?.storage;
				if (!storage || typeof storage.persist !== 'function') return false;
				if (typeof storage.persisted === 'function') {
					try {
						if (await storage.persisted()) return true;
					} catch (_) { /* ignore */ }
				}
				return await storage.persist();
			} catch (_) {
				return false;
			}
		})();
		return persistencePromise;
	}

	function subtle() {
		return global.crypto.subtle;
	}

	function openDb() {
		return new Promise((resolve, reject) => {
			const req = global.indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains(STORE_KEYS)) db.createObjectStore(STORE_KEYS);
				if (!db.objectStoreNames.contains(STORE_VAULT)) db.createObjectStore(STORE_VAULT);
			};
			req.onsuccess = (e) => resolve(e.target.result);
			req.onerror = (e) => reject(e.target.error);
		});
	}

	async function idbGet(store, key) {
		const db = await openDb();
		try {
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(store, 'readonly');
				const rq = tx.objectStore(store).get(key);
				rq.onsuccess = () => resolve(rq.result);
				rq.onerror = () => reject(rq.error);
			});
		} finally {
			db.close();
		}
	}

	async function idbPut(store, key, value) {
		const db = await openDb();
		try {
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(store, 'readwrite');
				tx.objectStore(store).put(value, key);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
		} finally {
			db.close();
		}
	}

	async function idbDelete(store, key) {
		const db = await openDb();
		try {
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(store, 'readwrite');
				tx.objectStore(store).delete(key);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
		} finally {
			db.close();
		}
	}

	let wrapKeyPromise = null;

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	function b64FromBytes(bytes) {
		let s = '';
		for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
		return btoa(s);
	}

	function bytesFromB64(b64) {
		const bin = atob(b64);
		const out = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
		return out;
	}

	function getOrCreateDeviceSecret() {
		try {
			let secret = global.localStorage.getItem(LS_DEVICE_SECRET);
			if (secret) return secret;
			const bytes = global.crypto.getRandomValues(new Uint8Array(32));
			secret = b64FromBytes(bytes);
			global.localStorage.setItem(LS_DEVICE_SECRET, secret);
			return secret;
		} catch (e) {
			console.warn('[SupraSecureStore] device secret unavailable', e);
			return null;
		}
	}

	/** Ключ шифрования vault: 32 байта device secret импортируются как AES-256-GCM raw key. */
	async function deriveWrapKeyFromDevice() {
		const secret = getOrCreateDeviceSecret();
		if (!secret) throw new Error('device secret unavailable');
		const raw = bytesFromB64(secret);
		if (raw.length !== 32) throw new Error('invalid device secret length');
		return subtle().importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, [
			'encrypt',
			'decrypt',
		]);
	}

	function lsVaultKey(id) {
		return LS_VAULT_PREFIX + id;
	}

	function readVaultBackup(id) {
		try {
			const raw = global.localStorage.getItem(lsVaultKey(id));
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed?.iv || !parsed?.ct) return null;
			return { iv: bytesFromB64(parsed.iv), ct: bytesFromB64(parsed.ct) };
		} catch (_) {
			return null;
		}
	}

	function writeVaultBackup(id, rec) {
		try {
			global.localStorage.setItem(
				lsVaultKey(id),
				JSON.stringify({ iv: b64FromBytes(rec.iv), ct: b64FromBytes(rec.ct) })
			);
		} catch (e) {
			console.warn('[SupraSecureStore] localStorage vault backup failed', e);
		}
	}

	function removeVaultBackup(id) {
		try {
			global.localStorage.removeItem(lsVaultKey(id));
		} catch (_) { /* ignore */ }
	}

	function getWrapKey() {
		if (wrapKeyPromise) return wrapKeyPromise;
		wrapKeyPromise = deriveWrapKeyFromDevice().catch((e) => {
			wrapKeyPromise = null;
			throw e;
		});
		return wrapKeyPromise;
	}

	/** Расшифровка vault, сохранённого старой схемой (случайный CryptoKey только в IndexedDB). */
	async function tryDecryptWithLegacyIdbKey(rec) {
		try {
			const legacyKey = await idbGet(STORE_KEYS, WRAP_KEY_ID);
			if (!legacyKey) return null;
			const plain = await subtle().decrypt({ name: 'AES-GCM', iv: rec.iv }, legacyKey, rec.ct);
			return JSON.parse(decoder.decode(plain));
		} catch (_) {
			return null;
		}
	}

	async function writeVaultRecord(id, value) {
		if (!available()) return false;
		await ensurePersistence();
		getOrCreateDeviceSecret();
		const key = await getWrapKey();
		const iv = global.crypto.getRandomValues(new Uint8Array(12));
		const plain = encoder.encode(JSON.stringify(value));
		const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, plain));
		const rec = { iv, ct };
		try {
			await idbPut(STORE_VAULT, id, rec);
		} catch (e) {
			console.warn('[SupraSecureStore] IDB vault write failed', e);
		}
		writeVaultBackup(id, rec);
		return true;
	}

	const SupraSecureStore = {
		available,
		ensurePersistence,

		/** Зашифровать и сохранить произвольный JSON-сериализуемый объект под идентификатором id. */
		async write(id, value) {
			return writeVaultRecord(id, value);
		},

		/** Прочитать и расшифровать объект. Возвращает null, если данных нет или ключ сменился. */
		async read(id) {
			if (!available()) return null;
			await ensurePersistence();
			let rec = null;
			try {
				rec = await idbGet(STORE_VAULT, id);
			} catch (e) {
				console.warn('[SupraSecureStore] IDB vault read failed', e);
			}
			if (!rec || !rec.iv || !rec.ct) rec = readVaultBackup(id);
			if (!rec || !rec.iv || !rec.ct) return null;
			try {
				const key = await getWrapKey();
				const plain = await subtle().decrypt({ name: 'AES-GCM', iv: rec.iv }, key, rec.ct);
				return JSON.parse(decoder.decode(plain));
			} catch (e) {
				const legacy = await tryDecryptWithLegacyIdbKey(rec);
				if (legacy != null) {
					writeVaultRecord(id, legacy).catch((err) => {
						console.warn('[SupraSecureStore] legacy vault migration failed', err);
					});
					return legacy;
				}
				console.warn('[SupraSecureStore] decrypt failed', e);
				return null;
			}
		},

		/** Удалить один секрет. */
		async remove(id) {
			removeVaultBackup(id);
			if (!global.indexedDB) return;
			try {
				await idbDelete(STORE_VAULT, id);
			} catch (e) {
				console.warn('[SupraSecureStore] remove failed', e);
			}
		},

		/** Полностью очистить хранилище (секреты и ключ шифрования). */
		async clearAll() {
			wrapKeyPromise = null;
			try {
				global.localStorage.removeItem(LS_DEVICE_SECRET);
				const toRemove = [];
				for (let i = 0; i < global.localStorage.length; i++) {
					const k = global.localStorage.key(i);
					if (k && k.startsWith(LS_VAULT_PREFIX)) toRemove.push(k);
				}
				toRemove.forEach((k) => global.localStorage.removeItem(k));
			} catch (_) { /* ignore */ }
			if (!global.indexedDB) return;
			try {
				const db = await openDb();
				try {
					await new Promise((resolve, reject) => {
						const tx = db.transaction([STORE_KEYS, STORE_VAULT], 'readwrite');
						tx.objectStore(STORE_KEYS).clear();
						tx.objectStore(STORE_VAULT).clear();
						tx.oncomplete = () => resolve();
						tx.onerror = () => reject(tx.error);
					});
				} finally {
					db.close();
				}
			} catch (e) {
				console.warn('[SupraSecureStore] clearAll failed', e);
			}
		},
	};

	global.SupraSecureStore = SupraSecureStore;
})(typeof window !== 'undefined' ? window : globalThis);
