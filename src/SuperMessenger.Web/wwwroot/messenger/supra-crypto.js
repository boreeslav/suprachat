/**
 * E2EE для SuperMessenger: мастер-пароль, direct HKDF, группы (авто + опциональный пароль).
 */
(function (global) {
if (global.SupraCrypto) return;

class SupraCrypto {
	static PREFIX = 'E1:';
	static LOCAL_PREFIX = 'L1:';
	static VERIFY_PLAIN = 'SUPRA-MASTER-VERIFY-v1';
	static RSA_KEYPAIR_SEED = 'supra-rsa-keypair-v1';
	static PBKDF2_ITERATIONS = 310000;
	static MASTER_KEY_CACHE_PREFIX = 'supra-mk-cache:';
	static PRIVATE_KEY_CACHE_PREFIX = 'supra-pk-cache:';
	static CHAT_KEY_CACHE_PREFIX = 'supra-ck-cache:';
	static LOCKED_PREVIEW = '🔒 Сообщение';
	static LOCKED_OTHER = '🔒 Не удалось расшифровать. Укажите доп. пароль в меню «Шифрование».';
	static SUBTLE_UNAVAILABLE_MSG =
		'Шифрование недоступно: не загружен скрипт /messenger/vendor/supra-webcrypto.bundle.js. Пересоберите деплой (deploy.cmd).';

	#masterKey = null;
	#privateKey = null;
	#userId = null;
	#unlockPassword = null;
	#encryptionSaltB64 = null;
	#verifierB64 = null;
	#localDataKey = null;
	#chatKeys = new Map();
	#customPasswords = new Map();
	#sessionSendBasicOnly = new Set();

	get isUnlocked() { return this.#masterKey != null; }

	static customStorageKey(chatId, userId) {
		return `supra-custom-pwd:${userId}:${chatId}`;
	}
	static extraEnabledKey(chatId, userId) {
		return `supra-extra-on:${userId}:${chatId}`;
	}
	static #isLegacyCustomKey(k) {
		return /^supra-custom-pwd:[0-9a-f-]{36}$/i.test(k);
	}
	static #isLegacyExtraKey(k) {
		return /^supra-extra-on:[0-9a-f-]{36}$/i.test(k);
	}

	async loadCustomPasswordsFromStorage() {
		this.#customPasswords.clear();
		this.#purgePersistedCustomPasswords();
	}

	#purgePersistedCustomPasswords() {
		if (!this.#userId) return;
		const scopedPrefix = `supra-custom-pwd:${this.#userId}:`;
		const toRemove = [];
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (!k) continue;
				if (k.startsWith(scopedPrefix) || SupraCrypto.#isLegacyCustomKey(k)) {
					toRemove.push(k);
				}
			}
			toRemove.forEach(k => localStorage.removeItem(k));
		} catch (_) { /* ignore */ }
	}

	setSessionCustomPassword(chatId, password) {
		if (!password) {
			this.#customPasswords.delete(chatId);
		} else {
			this.#customPasswords.set(chatId, password);
		}
		this.invalidateChatKey(chatId);
	}

	clearSessionCustomPassword(chatId) {
		this.#customPasswords.delete(chatId);
		this.invalidateChatKey(chatId);
	}

	clearSessionSendBasicOnly(chatId) {
		this.#sessionSendBasicOnly.delete(chatId);
	}

	isSessionSendBasicOnly(chatId) {
		return this.#sessionSendBasicOnly.has(chatId);
	}

	setSessionSendBasicOnly(chatId, enabled = true) {
		if (enabled) this.#sessionSendBasicOnly.add(chatId);
		else this.#sessionSendBasicOnly.delete(chatId);
	}

	clearChatSession(chatId) {
		this.clearSessionCustomPassword(chatId);
		this.clearSessionSendBasicOnly(chatId);
	}

	async setCustomPassword(chatId, password) {
		if (!this.#userId) return;
		this.setSessionCustomPassword(chatId, password || null);
		if (!password) {
			this.setExtraEncryptionEnabled(chatId, false);
			this.clearSessionSendBasicOnly(chatId);
		} else {
			this.clearSessionSendBasicOnly(chatId);
			this.setExtraEncryptionEnabled(chatId, true);
		}
	}

	getCustomPassword(chatId) {
		return this.#customPasswords.get(chatId) || null;
	}

	isExtraEncryptionEnabled(chatId) {
		if (!this.#userId) return false;
		const v = localStorage.getItem(SupraCrypto.extraEnabledKey(chatId, this.#userId));
		if (v === null) return !!this.getCustomPassword(chatId);
		return v === '1';
	}

	setExtraEncryptionEnabled(chatId, enabled) {
		if (!this.#userId) return;
		localStorage.setItem(
			SupraCrypto.extraEnabledKey(chatId, this.#userId),
			enabled ? '1' : '0'
		);
		this.invalidateChatKey(chatId);
	}

	clearChatEncryption(chatId) {
		this.setCustomPassword(chatId, null);
		this.setExtraEncryptionEnabled(chatId, false);
	}

	clearSession() {
		this.#masterKey = null;
		this.#privateKey = null;
		this.#userId = null;
		this.#unlockPassword = null;
		this.#encryptionSaltB64 = null;
		this.#verifierB64 = null;
		this.#localDataKey = null;
		this.#chatKeys.clear();
		this.#customPasswords.clear();
		this.#sessionSendBasicOnly.clear();
		SupraCrypto.#releaseRsaWorker();
	}

	static isEncrypted(text) {
		return typeof text === 'string' && text.startsWith(SupraCrypto.PREFIX);
	}

	static isLocalEncrypted(text) {
		return typeof text === 'string' && text.startsWith(SupraCrypto.LOCAL_PREFIX);
	}

	async #getLocalDataKey() {
		if (this.#localDataKey) return this.#localDataKey;
		if (!this.#unlockPassword || !this.#userId || !this.#encryptionSaltB64) return null;
		const salt = SupraCrypto.#ub64(this.#encryptionSaltB64);
		const localSalt = SupraCrypto.#concat(
			salt,
			new TextEncoder().encode('supra-local-storage-v1')
		);
		this.#localDataKey = await SupraCrypto.#deriveMasterKey(
			this.#unlockPassword,
			localSalt,
			this.#userId
		);
		return this.#localDataKey;
	}

	async encryptLocal(plaintext) {
		if (plaintext == null || plaintext === '') return plaintext;
		const key = await this.#getLocalDataKey();
		if (!key) throw new Error('Локальное шифрование недоступно');
		return this.#encryptWithKey(plaintext, key, SupraCrypto.LOCAL_PREFIX);
	}

	async decryptLocal(ciphertext) {
		if (!ciphertext || !SupraCrypto.isLocalEncrypted(ciphertext)) return ciphertext;
		const key = await this.#getLocalDataKey();
		if (!key) return null;
		return this.#decryptWithKey(ciphertext, key, SupraCrypto.LOCAL_PREFIX);
	}

	async #readStoredSecret(stored) {
		if (!stored) return null;
		if (SupraCrypto.isLocalEncrypted(stored)) {
			try {
				return await this.decryptLocal(stored);
			} catch (_) {
				return null;
			}
		}
		return stored;
	}

	async #writeStoredSecret(storageKey, secret) {
		const sealed = await this.encryptLocal(String(secret));
		localStorage.setItem(storageKey, sealed);
	}

	static async sealForStorage(crypto, value) {
		if (!crypto?.isUnlocked) return null;
		return crypto.encryptLocal(value);
	}

	static async openFromStorage(crypto, sealed) {
		if (!sealed) return null;
		if (!SupraCrypto.isLocalEncrypted(sealed)) return sealed;
		if (!crypto?.isUnlocked) return null;
		try {
			return await crypto.decryptLocal(sealed);
		} catch (_) {
			return null;
		}
	}

	static #installSubtlePolyfill() {
		globalThis.SupraWebCryptoPolyfill?.install?.({ force: true });
	}

	static #webCrypto() {
		SupraCrypto.#installSubtlePolyfill();
		const c = globalThis.crypto;
		if (!c?.getRandomValues) throw new Error(SupraCrypto.SUBTLE_UNAVAILABLE_MSG);
		return c;
	}

	static #subtle() {
		SupraCrypto.#installSubtlePolyfill();
		const s = SupraCrypto.#webCrypto().subtle;
		if (!s) throw new Error(SupraCrypto.SUBTLE_UNAVAILABLE_MSG);
		return s;
	}

	static randomBytes(length) {
		return SupraCrypto.#webCrypto().getRandomValues(new Uint8Array(length));
	}

	static async setupMasterPassword(masterPassword, userId) {
		const salt = SupraCrypto.randomBytes(16);
		const masterKey = await SupraCrypto.#deriveMasterKey(masterPassword, salt, userId);
		const verifier = await SupraCrypto.#makeVerifier(masterKey);
		const { privateKey, publicKeyB64 } = await SupraCrypto.#generateIdentityKeyPair(
			masterPassword,
			salt,
			userId
		);
		const pkcs8 = await SupraCrypto.#subtle().exportKey('pkcs8', privateKey);
		const privateKeyBlob = await SupraCrypto.#savePrivateKey(userId, pkcs8, masterKey);
		SupraCrypto.#savePublicKeyLocal(userId, publicKeyB64);
		return {
			salt: SupraCrypto.#b64(salt),
			verifier,
			publicKey: publicKeyB64,
			privateKeyBlob,
		};
	}

	static async unlock(masterPassword, userId, saltB64) {
		const salt = SupraCrypto.#ub64(saltB64);
		const masterKey = await SupraCrypto.#deriveMasterKey(masterPassword, salt, userId);
		const privateKey = await SupraCrypto.#unlockPrivateKey(
			userId,
			masterKey,
			masterPassword,
			saltB64
		);
		return { masterKey, privateKey };
	}

	static async verifyMasterPassword(masterPassword, userId, saltB64, verifierB64) {
		try {
			const salt = SupraCrypto.#ub64(saltB64);
			const masterKey = await SupraCrypto.#deriveMasterKey(masterPassword, salt, userId);
			const expected = await SupraCrypto.#makeVerifier(masterKey);
			return expected === verifierB64;
		} catch (_) {
			return false;
		}
	}

	/** Смена мастер-пароля: тот же RSA-ключ, новый salt/verifier и обёртка в localStorage. */
	static async changeMasterPassword(oldPassword, newPassword, userId, saltB64, verifierB64) {
		const salt = SupraCrypto.#ub64(saltB64);
		const oldMasterKey = await SupraCrypto.#deriveMasterKey(oldPassword, salt, userId);
		const expected = await SupraCrypto.#makeVerifier(oldMasterKey);
		if (expected !== verifierB64) throw new Error('Неверный текущий мастер-пароль');
		const privateKey = await SupraCrypto.#unlockPrivateKey(
			userId,
			oldMasterKey,
			oldPassword,
			saltB64
		);
		const pkcs8 = await SupraCrypto.#subtle().exportKey('pkcs8', privateKey);
		const newSalt = SupraCrypto.randomBytes(16);
		const newMasterKey = await SupraCrypto.#deriveMasterKey(newPassword, newSalt, userId);
		const verifier = await SupraCrypto.#makeVerifier(newMasterKey);
		const privateKeyBlob = await SupraCrypto.#savePrivateKey(userId, pkcs8, newMasterKey);
		SupraCrypto.clearMasterKeyCache(userId);
		return {
			salt: SupraCrypto.#b64(newSalt),
			verifier,
			privateKeyBlob,
		};
	}

	static #masterKeyCacheStorageKey(userId, verifierB64) {
		const v = String(verifierB64 || '').slice(0, 32);
		return `${SupraCrypto.MASTER_KEY_CACHE_PREFIX}${SupraCrypto.normalizeUserId(userId)}:${v}`;
	}

	static async #loadCachedMasterKey(userId, verifierB64) {
		try {
			const b64 = sessionStorage.getItem(
				SupraCrypto.#masterKeyCacheStorageKey(userId, verifierB64)
			);
			if (!b64) return null;
			const bits = SupraCrypto.#ub64(b64);
			return SupraCrypto.#subtle().importKey(
				'raw',
				bits,
				{ name: 'AES-GCM' },
				false,
				['encrypt', 'decrypt']
			);
		} catch (_) {
			return null;
		}
	}

	static async #saveCachedMasterKey(userId, verifierB64, masterKey) {
		try {
			const raw = await SupraCrypto.#subtle().exportKey('raw', masterKey);
			sessionStorage.setItem(
				SupraCrypto.#masterKeyCacheStorageKey(userId, verifierB64),
				SupraCrypto.#b64(new Uint8Array(raw))
			);
		} catch (_) { /* ignore */ }
	}

	static clearMasterKeyCache(userId) {
		try {
			const mkPrefix = userId
				? `${SupraCrypto.MASTER_KEY_CACHE_PREFIX}${SupraCrypto.normalizeUserId(userId)}:`
				: SupraCrypto.MASTER_KEY_CACHE_PREFIX;
			const pkPrefix = userId
				? `${SupraCrypto.PRIVATE_KEY_CACHE_PREFIX}${SupraCrypto.normalizeUserId(userId)}:`
				: SupraCrypto.PRIVATE_KEY_CACHE_PREFIX;
			const ckPrefix = userId
				? `${SupraCrypto.CHAT_KEY_CACHE_PREFIX}${SupraCrypto.normalizeUserId(userId)}:`
				: SupraCrypto.CHAT_KEY_CACHE_PREFIX;
			const toRemove = [];
			for (let i = 0; i < sessionStorage.length; i++) {
				const k = sessionStorage.key(i);
				if (k?.startsWith(mkPrefix) || k?.startsWith(pkPrefix) || k?.startsWith(ckPrefix)) {
					toRemove.push(k);
				}
			}
			toRemove.forEach((k) => sessionStorage.removeItem(k));
		} catch (_) { /* ignore */ }
	}

	static #privateKeyCacheStorageKey(userId, verifierB64) {
		const v = String(verifierB64 || '').slice(0, 32);
		return `${SupraCrypto.PRIVATE_KEY_CACHE_PREFIX}${SupraCrypto.normalizeUserId(userId)}:${v}`;
	}

	static async #loadCachedPrivateKey(userId, verifierB64, masterKey) {
		try {
			const b64 = sessionStorage.getItem(
				SupraCrypto.#privateKeyCacheStorageKey(userId, verifierB64)
			);
			if (!b64) return null;
			const bytes = SupraCrypto.#ub64(b64);
			const iv = bytes.slice(0, 12);
			const ct = bytes.slice(12);
			const pkcs8 = await SupraCrypto.#subtle().decrypt({ name: 'AES-GCM', iv }, masterKey, ct);
			return SupraCrypto.#subtle().importKey(
				'pkcs8',
				pkcs8,
				{ name: 'RSA-OAEP', hash: 'SHA-256' },
				false,
				['decrypt']
			);
		} catch (_) {
			return null;
		}
	}

	static async #saveCachedPrivateKey(userId, verifierB64, masterKey, privateKey) {
		try {
			const pkcs8 = await SupraCrypto.#subtle().exportKey('pkcs8', privateKey);
			const iv = SupraCrypto.randomBytes(12);
			const ct = await SupraCrypto.#subtle().encrypt(
				{ name: 'AES-GCM', iv },
				masterKey,
				pkcs8
			);
			sessionStorage.setItem(
				SupraCrypto.#privateKeyCacheStorageKey(userId, verifierB64),
				SupraCrypto.#b64(SupraCrypto.#concat(iv, new Uint8Array(ct)))
			);
		} catch (_) { /* ignore */ }
	}

	static yieldToMain() {
		return new Promise((resolve) => {
			requestAnimationFrame(() => requestAnimationFrame(resolve));
		});
	}

	async initSession(masterPassword, userId, saltB64, verifierB64) {
		let masterKey = await SupraCrypto.#loadCachedMasterKey(userId, verifierB64);
		if (masterKey) {
			if (typeof globalThis !== 'undefined' && globalThis.__bootMark) {
				globalThis.__bootMark('master-key-cache-hit');
			}
		} else {
			const salt = SupraCrypto.#ub64(saltB64);
			masterKey = await SupraCrypto.#deriveMasterKey(masterPassword, salt, userId);
			const expected = await SupraCrypto.#makeVerifier(masterKey);
			if (expected !== verifierB64) throw new Error('Неверный мастер-пароль');
			await SupraCrypto.#saveCachedMasterKey(userId, verifierB64, masterKey);
		}
		let privateKey = await SupraCrypto.#loadCachedPrivateKey(userId, verifierB64, masterKey);
		if (privateKey) {
			if (typeof globalThis !== 'undefined' && globalThis.__bootMark) {
				globalThis.__bootMark('private-key-cache-hit');
			}
		} else {
			privateKey = await SupraCrypto.#unlockPrivateKey(
				userId,
				masterKey,
				masterPassword,
				saltB64
			);
			await SupraCrypto.#saveCachedPrivateKey(userId, verifierB64, masterKey, privateKey);
		}
		this.#masterKey = masterKey;
		this.#privateKey = privateKey;
		this.#userId = userId;
		this.#unlockPassword = masterPassword;
		this.#encryptionSaltB64 = saltB64;
		this.#verifierB64 = verifierB64;
		this.#localDataKey = null;
		await this.loadCustomPasswordsFromStorage();
		void SupraCrypto.#initRsaWorker(privateKey);
	}

	#chatKeyCacheStorageKey(chatId, tier) {
		const v = String(this.#verifierB64 || '').slice(0, 32);
		return `${SupraCrypto.CHAT_KEY_CACHE_PREFIX}${SupraCrypto.normalizeUserId(this.#userId)}:${v}:${tier}:${chatId}`;
	}

	async #loadCachedChatKey(chatId, tier) {
		if (!this.#masterKey || !this.#userId || !chatId) return null;
		try {
			const b64 = sessionStorage.getItem(this.#chatKeyCacheStorageKey(chatId, tier));
			if (!b64) return null;
			const bytes = SupraCrypto.#ub64(b64);
			const iv = bytes.slice(0, 12);
			const ct = bytes.slice(12);
			const raw = await SupraCrypto.#subtle().decrypt({ name: 'AES-GCM', iv }, this.#masterKey, ct);
			return SupraCrypto.#subtle().importKey(
				'raw',
				raw,
				{ name: 'AES-GCM' },
				tier === 'auto',
				['encrypt', 'decrypt']
			);
		} catch (_) {
			return null;
		}
	}

	async #saveCachedChatKey(chatId, tier, key) {
		if (!this.#masterKey || !this.#userId || !chatId || !key) return;
		try {
			const raw = await SupraCrypto.#subtle().exportKey('raw', key);
			const iv = SupraCrypto.randomBytes(12);
			const ct = await SupraCrypto.#subtle().encrypt(
				{ name: 'AES-GCM', iv },
				this.#masterKey,
				raw
			);
			sessionStorage.setItem(
				this.#chatKeyCacheStorageKey(chatId, tier),
				SupraCrypto.#b64(SupraCrypto.#concat(iv, new Uint8Array(ct)))
			);
		} catch (_) { /* ignore */ }
	}

	#clearCachedChatKey(chatId, tier) {
		if (!this.#userId || !chatId) return;
		try {
			sessionStorage.removeItem(this.#chatKeyCacheStorageKey(chatId, tier));
		} catch (_) { /* ignore */ }
	}

	/** Дозагружает RSA public key на сервер, если есть salt/verifier, но ключ не сохранён. */
	async ensureServerPublicKey() {
		if (!this.#userId) return false;
		const pubLocal = SupraCrypto.#getPublicKeyLocal(this.#userId);
		if (!pubLocal) return false;
		let sess = SupraAuthCrypto.getSession();
		if (!sess?.salt || !sess?.verifier) return false;
		if (SupraCrypto.normalizeUserId(sess.userId) !== SupraCrypto.normalizeUserId(this.#userId)) {
			return false;
		}
		try {
			const check = await fetch('/api/encryption/public-keys', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userIds: [this.#userId] }),
			});
			if (check.ok) {
				const { keys } = await check.json();
				if (SupraCrypto.lookupPublicKey(keys, this.#userId)) return true;
			}
			const privBlob = SupraCrypto.#findPrivKeyBlob(this.#userId);
			const res = await fetch('/api/encryption/setup', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					salt: sess.salt,
					verifier: sess.verifier,
					publicKey: pubLocal,
					privateKeyBlob: privBlob || null,
				}),
			});
			return res.ok;
		} catch (_) {
			return false;
		}
	}

	/** Копия зашифрованного приватного ключа на сервер (для входа с другого устройства). */
	async ensurePrivateKeyBackupOnServer() {
		if (!this.#userId || !this.#encryptionSaltB64) return false;
		const blob = SupraCrypto.#findPrivKeyBlob(this.#userId);
		if (!blob) return false;
		const sess = SupraAuthCrypto.getSession();
		if (!sess?.salt || !sess?.verifier) return false;
		if (SupraCrypto.normalizeUserId(sess.userId) !== SupraCrypto.normalizeUserId(this.#userId)) {
			return false;
		}
		try {
			const check = await fetch('/api/encryption/private-key-backup', { credentials: 'same-origin' });
			if (check.ok) {
				const j = await check.json();
				if (j.found) return true;
			}
			const res = await fetch('/api/encryption/setup', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					salt: sess.salt || this.#encryptionSaltB64,
					verifier: sess.verifier,
					publicKey: null,
					privateKeyBlob: blob,
				}),
			});
			return res.ok;
		} catch (_) {
			return false;
		}
	}

	static generateGroupAutoPassword() {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
		const bytes = SupraCrypto.randomBytes(20);
		let s = '';
		for (let i = 0; i < 20; i++) s += chars[bytes[i] % chars.length];
		return s.slice(0, 5) + '-' + s.slice(5, 10) + '-' + s.slice(10, 15) + '-' + s.slice(15, 20);
	}

	static normalizeUserId(userId) {
		return String(userId || '').trim().toLowerCase();
	}

	static listPrivKeyStorageKeys(userId) {
		const keys = new Set([
			`supra-privkey:${userId}`,
			`supra-privkey:${SupraCrypto.normalizeUserId(userId)}`,
		]);
		const want = SupraCrypto.normalizeUserId(userId);
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (!k?.startsWith('supra-privkey:')) continue;
				const id = k.slice('supra-privkey:'.length);
				if (SupraCrypto.normalizeUserId(id) === want) keys.add(k);
			}
		} catch (_) { /* ignore */ }
		return [...keys];
	}

	static listPubKeyStorageKeys(userId) {
		const keys = new Set([
			`supra-pubkey:${userId}`,
			`supra-pubkey:${SupraCrypto.normalizeUserId(userId)}`,
		]);
		const want = SupraCrypto.normalizeUserId(userId);
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (!k?.startsWith('supra-pubkey:')) continue;
				const id = k.slice('supra-pubkey:'.length);
				if (SupraCrypto.normalizeUserId(id) === want) keys.add(k);
			}
		} catch (_) { /* ignore */ }
		return [...keys];
	}

	static #findPrivKeyBlob(userId) {
		for (const storageKey of SupraCrypto.listPrivKeyStorageKeys(userId)) {
			const blob = localStorage.getItem(storageKey);
			if (blob) return blob;
		}
		return null;
	}

	static lookupPublicKey(publicKeysByUserId, userId) {
		if (!publicKeysByUserId || !userId) return null;
		const direct = publicKeysByUserId[userId];
		if (direct) return direct;
		const want = SupraCrypto.normalizeUserId(userId);
		for (const [k, v] of Object.entries(publicKeysByUserId)) {
			if (SupraCrypto.normalizeUserId(k) === want) return v;
		}
		return null;
	}

	static #savePublicKeyLocal(userId, publicKeyB64) {
		try {
			localStorage.setItem(
				`supra-pubkey:${SupraCrypto.normalizeUserId(userId)}`,
				publicKeyB64
			);
		} catch (_) { /* ignore */ }
	}

	static #getPublicKeyLocal(userId) {
		try {
			for (const storageKey of SupraCrypto.listPubKeyStorageKeys(userId)) {
				const v = localStorage.getItem(storageKey);
				if (v) return v;
			}
		} catch (_) {
			return null;
		}
		return null;
	}

	static async wrapAutoPasswordForUsers(autoPassword, recipientUserIds, publicKeysByUserId) {
		const plain = new TextEncoder().encode(autoPassword);
		const out = [];
		for (let i = 0; i < recipientUserIds.length; i++) {
			const uid = recipientUserIds[i];
			const pubB64 = SupraCrypto.lookupPublicKey(publicKeysByUserId, uid);
			if (!pubB64) continue;
			const pubKey = await SupraCrypto.#subtle().importKey(
				'spki',
				SupraCrypto.#ub64(pubB64),
				{ name: 'RSA-OAEP', hash: 'SHA-256' },
				false,
				['encrypt']
			);
			const wrapped = await SupraCrypto.#subtle().encrypt({ name: 'RSA-OAEP' }, pubKey, plain);
			out.push({ userId: uid, wrappedAutoPassword: SupraCrypto.#b64(new Uint8Array(wrapped)) });
			// На мобильных длинная синхронная цепочка RSA блокирует event loop и рвёт fetch.
			if (i < recipientUserIds.length - 1) {
				await new Promise(r => setTimeout(r, 0));
			}
		}
		return out;
	}

	async unwrapGroupAutoPassword(wrappedB64) {
		if (!this.#privateKey) throw new Error('Сессия шифрования не разблокирована');
		const fromWorker = await SupraCrypto.#unwrapRsaInWorker(wrappedB64);
		if (fromWorker != null) return fromWorker;
		const plain = await SupraCrypto.#subtle().decrypt(
			{ name: 'RSA-OAEP' },
			this.#privateKey,
			SupraCrypto.#ub64(wrappedB64)
		);
		return new TextDecoder().decode(plain);
	}

	#cacheKey(chatId, tier) {
		return `${chatId}:${tier}`;
	}

	async getAutoChatKey(chat, options = {}) {
		const chatId = chat.id || chat.chatId;
		if (!chatId || !this.#masterKey) return null;
		const ck = this.#cacheKey(chatId, 'auto');
		if (this.#chatKeys.has(ck)) return this.#chatKeys.get(ck);
		const sessionCached = await this.#loadCachedChatKey(chatId, 'auto');
		if (sessionCached) {
			this.#chatKeys.set(ck, sessionCached);
			return sessionCached;
		}

		const type = (chat.type || '').toLowerCase();
		if (type !== 'direct' && type !== 'group' && type !== 'public_group' && type !== 'group_branch') return null;
		if (type === 'direct' && !chat.contactUserId) return null;

		let wrapped = options.wrappedAutoPassword;
		if (!wrapped && options.fetchWrapped) {
			const r = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}`, {
				credentials: 'same-origin',
			});
			if (r.ok) {
				const j = await r.json();
				if (j.found) wrapped = j.wrappedAutoPassword;
			}
		}
		if (!wrapped) return null;
		const autoPassword = await this.unwrapGroupAutoPassword(wrapped);
		const key = await SupraCrypto.#deriveGroupAutoKey(autoPassword, chatId);
		this.#chatKeys.set(ck, key);
		void this.#saveCachedChatKey(chatId, 'auto', key);
		return key;
	}

	async getProtectedChatKey(chat, options = {}) {
		const chatId = chat.id || chat.chatId;
		if (!chatId || !this.getCustomPassword(chatId)) return null;
		const ck = this.#cacheKey(chatId, 'protected');
		if (this.#chatKeys.has(ck)) return this.#chatKeys.get(ck);
		const sessionCached = await this.#loadCachedChatKey(chatId, 'protected');
		if (sessionCached) {
			this.#chatKeys.set(ck, sessionCached);
			return sessionCached;
		}

		const autoKey = await this.getAutoChatKey(chat, options);
		if (!autoKey) return null;
		const custom = this.getCustomPassword(chatId);
		const key = await SupraCrypto.#combineCustomKey(autoKey, custom, chatId);
		this.#chatKeys.set(ck, key);
		void this.#saveCachedChatKey(chatId, 'protected', key);
		return key;
	}

	/** @deprecated use getAutoChatKey / getProtectedChatKey */
	async getChatKey(chat, options = {}) {
		if (this.getCustomPassword(chat.id || chat.chatId)) {
			return this.getProtectedChatKey(chat, options);
		}
		return this.getAutoChatKey(chat, options);
	}

	invalidateChatKey(chatId) {
		this.#chatKeys.delete(this.#cacheKey(chatId, 'auto'));
		this.#chatKeys.delete(this.#cacheKey(chatId, 'protected'));
		this.#clearCachedChatKey(chatId, 'auto');
		this.#clearCachedChatKey(chatId, 'protected');
	}

	async encryptText(plaintext, chatKey) {
		if (!chatKey || plaintext == null) return plaintext;
		return this.#encryptWithKey(plaintext, chatKey, SupraCrypto.PREFIX);
	}

	async decryptText(ciphertext, chatKey) {
		if (!ciphertext || !SupraCrypto.isEncrypted(ciphertext)) return ciphertext;
		if (!chatKey) return SupraCrypto.LOCKED_PREVIEW;
		try {
			return await this.#decryptWithKey(ciphertext, chatKey, SupraCrypto.PREFIX);
		} catch (_) {
			return SupraCrypto.LOCKED_PREVIEW;
		}
	}

	async #encryptWithKey(plaintext, key, prefix) {
		const iv = SupraCrypto.randomBytes(12);
		const ct = await SupraCrypto.#subtle().encrypt(
			{ name: 'AES-GCM', iv },
			key,
			new TextEncoder().encode(String(plaintext))
		);
		const payload = {
			iv: SupraCrypto.#b64(iv),
			ct: SupraCrypto.#b64(new Uint8Array(ct)),
		};
		return prefix + btoa(JSON.stringify(payload));
	}

	async #decryptWithKey(ciphertext, key, prefix) {
		const payload = JSON.parse(atob(ciphertext.slice(prefix.length)));
		const plain = await SupraCrypto.#subtle().decrypt(
			{ name: 'AES-GCM', iv: SupraCrypto.#ub64(payload.iv) },
			key,
			SupraCrypto.#ub64(payload.ct)
		);
		return new TextDecoder().decode(plain);
	}

	async encryptPreview(text, chatKey) {
		if (!text || !chatKey) return null;
		const short = text.length > 120 ? text.slice(0, 120) + '…' : text;
		return this.encryptText(short, chatKey);
	}

	static async #deriveMasterKey(password, salt, userId) {
		const saltBytes = typeof salt === 'string' ? SupraCrypto.#ub64(salt) : salt;
		if (typeof globalThis !== 'undefined' && globalThis.__bootMark) {
			globalThis.__bootMark('pbkdf-start');
		}
		const bits = await SupraCrypto.#derivePbkdf2Bits(
			password,
			SupraCrypto.#concat(saltBytes, new TextEncoder().encode(userId)),
			SupraCrypto.PBKDF2_ITERATIONS,
			256
		);
		if (typeof globalThis !== 'undefined' && globalThis.__bootMark) {
			globalThis.__bootMark('pbkdf-done');
		}
		return SupraCrypto.#subtle().importKey(
			'raw',
			bits,
			{ name: 'AES-GCM' },
			false,
			['encrypt', 'decrypt']
		);
	}

	static #pbkdfWorker = null;
	static #pbkdfWorkerBroken = false;
	static #pbkdfReqId = 0;
	static #pbkdfInflight = new Map();
	static #rsaWorker = null;
	static #rsaWorkerBroken = false;
	static #rsaWorkerReady = false;
	static #rsaReqId = 0;
	static #rsaInflight = new Map();

	static prewarmPbkdfWorker() {
		SupraCrypto.#ensurePbkdfWorker();
	}

	static #releaseRsaWorker() {
		SupraCrypto.#rsaWorkerReady = false;
		if (SupraCrypto.#rsaWorker) {
			try { SupraCrypto.#rsaWorker.terminate(); } catch (_) { /* ignore */ }
			SupraCrypto.#rsaWorker = null;
		}
		for (const pending of SupraCrypto.#rsaInflight.values()) {
			pending.reject(new Error('rsa worker released'));
		}
		SupraCrypto.#rsaInflight.clear();
	}

	static #ensureRsaWorker() {
		if (SupraCrypto.#rsaWorkerBroken || typeof Worker === 'undefined') return null;
		if (SupraCrypto.#rsaWorker) return SupraCrypto.#rsaWorker;
		try {
			const w = new Worker('/messenger/supra-crypto-rsa-worker.js');
			w.onmessage = (ev) => {
				const { reqId, text, ok, error } = ev.data || {};
				const pending = SupraCrypto.#rsaInflight.get(reqId);
				if (!pending) return;
				SupraCrypto.#rsaInflight.delete(reqId);
				if (error) pending.reject(new Error(error));
				else if (ok) pending.resolve(true);
				else pending.resolve(text);
			};
			w.onerror = () => {
				SupraCrypto.#rsaWorkerBroken = true;
				SupraCrypto.#rsaWorkerReady = false;
				try { w.terminate(); } catch (_) { /* ignore */ }
				SupraCrypto.#rsaWorker = null;
			};
			SupraCrypto.#rsaWorker = w;
			return w;
		} catch (_) {
			SupraCrypto.#rsaWorkerBroken = true;
			return null;
		}
	}

	static async #initRsaWorker(privateKey) {
		SupraCrypto.#releaseRsaWorker();
		const worker = SupraCrypto.#ensureRsaWorker();
		if (!worker || !privateKey) return false;
		try {
			const pkcs8 = await SupraCrypto.#subtle().exportKey('pkcs8', privateKey);
			const reqId = ++SupraCrypto.#rsaReqId;
			await new Promise((resolve, reject) => {
				SupraCrypto.#rsaInflight.set(reqId, {
					resolve: (v) => (v === true ? resolve() : reject(new Error('rsa init failed'))),
					reject,
				});
				worker.postMessage({ kind: 'init', reqId, pkcs8 }, [pkcs8]);
			});
			SupraCrypto.#rsaWorkerReady = true;
			return true;
		} catch (e) {
			console.warn('[SupraCrypto] RSA worker init failed', e);
			SupraCrypto.#rsaWorkerReady = false;
			return false;
		}
	}

	static async #unwrapRsaInWorker(wrappedB64) {
		if (!SupraCrypto.#rsaWorkerReady) return null;
		const worker = SupraCrypto.#ensureRsaWorker();
		if (!worker) return null;
		const reqId = ++SupraCrypto.#rsaReqId;
		try {
			return await new Promise((resolve, reject) => {
				SupraCrypto.#rsaInflight.set(reqId, { resolve, reject });
				worker.postMessage({ kind: 'unwrap', reqId, wrappedB64 });
			});
		} catch (e) {
			console.warn('[SupraCrypto] RSA worker unwrap failed', e);
			return null;
		}
	}

	static #ensurePbkdfWorker() {
		if (SupraCrypto.#pbkdfWorkerBroken || typeof Worker === 'undefined') return null;
		if (SupraCrypto.#pbkdfWorker) return SupraCrypto.#pbkdfWorker;
		try {
			const w = new Worker('/messenger/supra-crypto-pbkdf-worker.js');
			w.onmessage = (ev) => {
				const { reqId, bits, error } = ev.data || {};
				const pending = SupraCrypto.#pbkdfInflight.get(reqId);
				if (!pending) return;
				SupraCrypto.#pbkdfInflight.delete(reqId);
				if (error) pending.reject(new Error(error));
				else pending.resolve(bits);
			};
			w.onerror = () => {
				SupraCrypto.#pbkdfWorkerBroken = true;
				try { w.terminate(); } catch (_) { /* ignore */ }
				SupraCrypto.#pbkdfWorker = null;
			};
			SupraCrypto.#pbkdfWorker = w;
			return w;
		} catch (_) {
			SupraCrypto.#pbkdfWorkerBroken = true;
			return null;
		}
	}

	static #derivePbkdf2BitsInWorker(password, saltBytes, iterations, bitLength) {
		const worker = SupraCrypto.#ensurePbkdfWorker();
		if (!worker) return null;
		const reqId = ++SupraCrypto.#pbkdfReqId;
		return new Promise((resolve, reject) => {
			SupraCrypto.#pbkdfInflight.set(reqId, {
				resolve: (bits) => resolve(bits instanceof Uint8Array ? bits : new Uint8Array(bits)),
				reject,
			});
			worker.postMessage({
				kind: 'deriveBits',
				reqId,
				password,
				saltB64: SupraCrypto.#b64(saltBytes),
				iterations,
				bits: bitLength,
			});
		});
	}

	static async #derivePbkdf2BitsMainThread(password, saltBytes, iterations, bitLength) {
		const baseKey = await SupraCrypto.#subtle().importKey(
			'raw',
			new TextEncoder().encode(password),
			'PBKDF2',
			false,
			['deriveBits']
		);
		const bits = await SupraCrypto.#subtle().deriveBits(
			{
				name: 'PBKDF2',
				salt: saltBytes,
				iterations,
				hash: 'SHA-256',
			},
			baseKey,
			bitLength
		);
		return new Uint8Array(bits);
	}

	static async #derivePbkdf2Bits(password, saltBytes, iterations, bitLength) {
		const worker = SupraCrypto.#ensurePbkdfWorker();
		if (worker) {
			try {
				return await SupraCrypto.#derivePbkdf2BitsInWorker(
					password,
					saltBytes,
					iterations,
					bitLength
				);
			} catch (e) {
				console.warn('[SupraCrypto] PBKDF worker failed, fallback to main thread', e);
			}
		}
		if (typeof globalThis !== 'undefined' && globalThis.__bootMark) {
			globalThis.__bootMark('pbkdf-main-thread');
		}
		return SupraCrypto.#derivePbkdf2BitsMainThread(password, saltBytes, iterations, bitLength);
	}

	static async #deriveGroupAutoKey(autoPassword, chatId) {
		const bits = await SupraCrypto.#derivePbkdf2Bits(
			autoPassword,
			new TextEncoder().encode(`group-auto|${chatId}`),
			120000,
			256
		);
		return SupraCrypto.#subtle().importKey('raw', bits, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
	}

	static async #combineCustomKey(autoKey, customPassword, chatId) {
		const raw = await SupraCrypto.#subtle().exportKey('raw', autoKey);
		const customBytes = await SupraCrypto.#deriveCustomBytes(customPassword, chatId);
		const combined = new Uint8Array(raw.byteLength);
		combined.set(new Uint8Array(raw));
		for (let i = 0; i < combined.length; i++)
			combined[i] ^= customBytes[i % customBytes.length];
		return SupraCrypto.#subtle().importKey('raw', combined, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
	}

	static async #deriveCustomBytes(customPassword, chatId) {
		return SupraCrypto.#derivePbkdf2Bits(
			customPassword,
			new TextEncoder().encode(`group-custom|${chatId}`),
			120000,
			256
		);
	}

	static async #makeVerifier(masterKey) {
		const iv = new Uint8Array(12);
		const ct = await SupraCrypto.#subtle().encrypt(
			{ name: 'AES-GCM', iv },
			masterKey,
			new TextEncoder().encode(SupraCrypto.VERIFY_PLAIN)
		);
		return SupraCrypto.#b64(SupraCrypto.#concat(iv, new Uint8Array(ct)));
	}

	static #storePrivKeyBlob(userId, blob) {
		if (!blob) return;
		localStorage.setItem(`supra-privkey:${SupraCrypto.normalizeUserId(userId)}`, blob);
	}

	static async #fetchPrivateKeyBackupFromServer() {
		try {
			const res = await fetch('/api/encryption/private-key-backup', { credentials: 'same-origin' });
			if (!res.ok) return null;
			const j = await res.json();
			return j.found && j.blob ? j.blob : null;
		} catch (_) {
			return null;
		}
	}

	static async #fetchUserPublicKeyB64(userId) {
		const local = SupraCrypto.#getPublicKeyLocal(userId);
		if (local) return local;
		try {
			const res = await fetch('/api/encryption/public-keys', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userIds: [userId] }),
			});
			if (!res.ok) return null;
			const { keys } = await res.json();
			return SupraCrypto.lookupPublicKey(keys, userId);
		} catch (_) {
			return null;
		}
	}

	static #normalizeB64(b64) {
		return String(b64 || '').replace(/\s+/g, '');
	}

	static #b64Equals(a, b) {
		return SupraCrypto.#normalizeB64(a) === SupraCrypto.#normalizeB64(b);
	}

	static async #deriveRsaSeedBytes(masterPassword, salt, userId) {
		const rsaSalt = SupraCrypto.#concat(
			salt,
			new TextEncoder().encode(SupraCrypto.RSA_KEYPAIR_SEED),
			new TextEncoder().encode(String(userId))
		);
		return SupraCrypto.#derivePbkdf2Bits(
			masterPassword,
			rsaSalt,
			SupraCrypto.PBKDF2_ITERATIONS,
			512
		);
	}

	static async #generateIdentityKeyPair(masterPassword, salt, userId) {
		const keygen = globalThis.SupraForgeKeygen;
		if (!keygen?.generateDeterministicRsaKeyPair) {
			throw new Error(SupraCrypto.SUBTLE_UNAVAILABLE_MSG);
		}
		const seed = await SupraCrypto.#deriveRsaSeedBytes(masterPassword, salt, userId);
		const { publicKeySpki, privateKeyPkcs8, publicKeyB64 } =
			keygen.generateDeterministicRsaKeyPair(seed, 2048);
		const privateKey = await SupraCrypto.#subtle().importKey(
			'pkcs8',
			privateKeyPkcs8,
			{ name: 'RSA-OAEP', hash: 'SHA-256' },
			false,
			['decrypt']
		);
		return { privateKey, publicKeyB64, publicKeySpki };
	}

	static async #unlockPrivateKeyFromBlob(userId, masterKey) {
		let blob = SupraCrypto.#findPrivKeyBlob(userId);
		if (!blob) {
			blob = await SupraCrypto.#fetchPrivateKeyBackupFromServer();
			if (blob) SupraCrypto.#storePrivKeyBlob(userId, blob);
		}
		if (!blob) return null;
		const bytes = SupraCrypto.#ub64(blob);
		const iv = bytes.slice(0, 12);
		const ct = bytes.slice(12);
		const pkcs8 = await SupraCrypto.#subtle().decrypt({ name: 'AES-GCM', iv }, masterKey, ct);
		return SupraCrypto.#subtle().importKey(
			'pkcs8',
			pkcs8,
			{ name: 'RSA-OAEP', hash: 'SHA-256' },
			false,
			['decrypt']
		);
	}

	/**
	 * Приватный ключ: локальный blob → детерминированный RSA → blob с сервера.
	 */
	static async #unlockPrivateKey(userId, masterKey, masterPassword, saltB64) {
		if (SupraCrypto.#findPrivKeyBlob(userId)) {
			const fromLocalBlob = await SupraCrypto.#unlockPrivateKeyFromBlob(userId, masterKey);
			if (fromLocalBlob) return fromLocalBlob;
		}
		if (masterPassword && saltB64 && globalThis.SupraForgeKeygen) {
			try {
				const salt = SupraCrypto.#ub64(saltB64);
				const derived = await SupraCrypto.#generateIdentityKeyPair(
					masterPassword,
					salt,
					userId
				);
				const expectedPub = await SupraCrypto.#fetchUserPublicKeyB64(userId);
				if (!expectedPub || SupraCrypto.#b64Equals(derived.publicKeyB64, expectedPub)) {
					SupraCrypto.#savePublicKeyLocal(userId, derived.publicKeyB64);
					return derived.privateKey;
				}
			} catch (e) {
				console.warn('[SupraCrypto] deterministic RSA unlock', e);
			}
		}
		const legacy = await SupraCrypto.#unlockPrivateKeyFromBlob(userId, masterKey);
		if (legacy) return legacy;
		throw new Error(
			'Не удалось восстановить ключ шифрования. ' +
			'Проверьте мастер-пароль. Если шифрование настраивали с паролем входа — введите его. ' +
			'Иначе используйте «Сбросить шифрование» и задайте пароль заново.'
		);
	}

	static async #savePrivateKey(userId, pkcs8, masterKey) {
		const iv = SupraCrypto.randomBytes(12);
		const ct = await SupraCrypto.#subtle().encrypt(
			{ name: 'AES-GCM', iv },
			masterKey,
			pkcs8
		);
		const blob = SupraCrypto.#b64(SupraCrypto.#concat(iv, new Uint8Array(ct)));
		SupraCrypto.#storePrivKeyBlob(userId, blob);
		return blob;
	}

	static #b64(bytes) {
		let s = '';
		for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
		return btoa(s);
	}

	static #ub64(b64) {
		const bin = atob(b64);
		const out = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
		return out;
	}

	static #concat(a, b) {
		const out = new Uint8Array(a.length + b.length);
		out.set(a, 0);
		out.set(b, a.length);
		return out;
	}
}

global.SupraCrypto = SupraCrypto;

if (typeof requestIdleCallback === 'function') {
	requestIdleCallback(() => SupraCrypto.prewarmPbkdfWorker(), { timeout: 500 });
} else {
	setTimeout(() => SupraCrypto.prewarmPbkdfWorker(), 0);
}
})(typeof window !== 'undefined' ? window : globalThis);
