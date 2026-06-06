/**
 * Общая логика мастер-пароля для login / register / настроек.
 */
function supraNormalizeAuthUserId(userId) {
	if (typeof SupraCrypto?.normalizeUserId === 'function') {
		return SupraCrypto.normalizeUserId(userId);
	}
	return String(userId ?? '').trim().toLowerCase();
}

window.SupraAuthCrypto = {
	MASTER_MIN_LENGTH: 6,
	GROUP_EXTRA_MIN_LENGTH: 4,
	SESSION_KEY: 'supra-master-session',
	SECURE_VAULT_ID: 'master-session-v1',
	PENDING_LOGIN_PASSWORD_KEY: 'supra-pending-login-password',
	MASTER_MISMATCH_KEY: 'supra-master-password-mismatch',

	/**
	 * Доступно ли персистентное шифрованное хранилище (HTTPS/secure context).
	 * В legacy-режиме (HTTP) мастер-пароль живёт только в sessionStorage.
	 */
	usesSecureStore() {
		return !!(window.SupraEnv?.secure && window.SupraSecureStore?.available?.());
	},

	/**
	 * Восстановить сессию мастер-пароля из персистентного хранилища (secure mode).
	 * Вызывается на старте приложения ДО синхронных чтений getSession().
	 * Гидрирует sessionStorage, чтобы остальной код работал без изменений.
	 */
	async restoreSession(userId) {
		if (!SupraAuthCrypto.usesSecureStore()) return;
		try {
			await window.SupraSecureStore.ensurePersistence();
			const current = SupraAuthCrypto.getSession();
			if (
				current &&
				(!userId ||
					supraNormalizeAuthUserId(current.userId) ===
						supraNormalizeAuthUserId(userId))
			) {
				return;
			}
			const data = await window.SupraSecureStore.read(SupraAuthCrypto.SECURE_VAULT_ID);
			if (!data || !data.password) return;
			if (
				userId &&
				supraNormalizeAuthUserId(data.userId) !== supraNormalizeAuthUserId(userId)
			) {
				return;
			}
			sessionStorage.setItem(SupraAuthCrypto.SESSION_KEY, JSON.stringify(data));
		} catch (e) {
			console.warn('[SupraAuthCrypto] restoreSession failed', e);
		}
	},

	stashPendingLoginPassword(password) {
		if (!password) return;
		try {
			sessionStorage.setItem(SupraAuthCrypto.PENDING_LOGIN_PASSWORD_KEY, String(password));
		} catch (_) { /* ignore */ }
	},

	peekPendingLoginPassword() {
		try {
			return sessionStorage.getItem(SupraAuthCrypto.PENDING_LOGIN_PASSWORD_KEY) || null;
		} catch (_) {
			return null;
		}
	},

	consumePendingLoginPassword() {
		try {
			const p = sessionStorage.getItem(SupraAuthCrypto.PENDING_LOGIN_PASSWORD_KEY);
			sessionStorage.removeItem(SupraAuthCrypto.PENDING_LOGIN_PASSWORD_KEY);
			return p || null;
		} catch (_) {
			return null;
		}
	},

	setMasterMismatchFlag() {
		try {
			sessionStorage.setItem(SupraAuthCrypto.MASTER_MISMATCH_KEY, '1');
		} catch (_) { /* ignore */ }
	},

	hasMasterMismatchFlag() {
		try {
			return sessionStorage.getItem(SupraAuthCrypto.MASTER_MISMATCH_KEY) === '1';
		} catch (_) {
			return false;
		}
	},

	clearMasterMismatchFlag() {
		try {
			sessionStorage.removeItem(SupraAuthCrypto.MASTER_MISMATCH_KEY);
		} catch (_) { /* ignore */ }
	},

	async setMasterPasswordMatchesLogin(matchesLogin) {
		const res = await fetch('/api/profile/master-password-link', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ matchesLogin: !!matchesLogin }),
		});
		if (!res.ok) {
			const j = await res.json().catch(() => ({}));
			throw new Error(j.error || 'Не удалось сохранить настройку');
		}
		return res.json().catch(() => ({}));
	},

	/** Пробует разблокировать шифрование паролем входа (если он совпадает с мастер-паролем). */
	async tryUnlockWithLoginPassword(me, loginPassword) {
		if (!loginPassword || me?.masterPasswordMatchesLogin === false) {
			return { crypto: null, mismatch: false };
		}
		try {
			const crypto = await SupraAuthCrypto.unlockToCrypto(me, loginPassword);
			SupraAuthCrypto.clearMasterMismatchFlag();
			await SupraAuthCrypto.setMasterPasswordMatchesLogin(true);
			return { crypto, mismatch: false };
		} catch (e) {
			console.warn('[SupraAuthCrypto] login password unlock failed', e);
			SupraAuthCrypto.setMasterMismatchFlag();
			try {
				await SupraAuthCrypto.setMasterPasswordMatchesLogin(false);
			} catch (_) { /* ignore */ }
			return { crypto: null, mismatch: true };
		}
	},

	getSession() {
		try {
			let raw = sessionStorage.getItem(SupraAuthCrypto.SESSION_KEY);
			if (!raw) {
				raw = localStorage.getItem(SupraAuthCrypto.SESSION_KEY);
				if (raw) {
					sessionStorage.setItem(SupraAuthCrypto.SESSION_KEY, raw);
					localStorage.removeItem(SupraAuthCrypto.SESSION_KEY);
				}
			}
			return JSON.parse(raw || 'null');
		} catch (_) {
			return null;
		}
	},

	clearSessionMemory() {
		try {
			sessionStorage.removeItem(SupraAuthCrypto.SESSION_KEY);
			localStorage.removeItem(SupraAuthCrypto.SESSION_KEY);
		} catch (_) { /* ignore */ }
	},

	async saveSession(userId, salt, verifier, password) {
		const data = { userId, salt, verifier, password };
		sessionStorage.setItem(SupraAuthCrypto.SESSION_KEY, JSON.stringify(data));
		try {
			localStorage.removeItem(SupraAuthCrypto.SESSION_KEY);
		} catch (_) { /* ignore legacy */ }
		if (!SupraAuthCrypto.usesSecureStore()) return;
		try {
			const persisted = await window.SupraSecureStore.ensurePersistence();
			if (!persisted) {
				console.warn(
					'[SupraAuthCrypto] persistent storage not granted — master session may be lost after closing the app'
				);
			}
			const ok = await window.SupraSecureStore.write(SupraAuthCrypto.SECURE_VAULT_ID, data);
			if (!ok) {
				console.warn('[SupraAuthCrypto] persist session failed: secure store unavailable');
				return;
			}
			const verify = await window.SupraSecureStore.read(SupraAuthCrypto.SECURE_VAULT_ID);
			if (!verify?.password) {
				console.warn('[SupraAuthCrypto] persist session verify failed after write');
			}
		} catch (e) {
			console.warn('[SupraAuthCrypto] persist session failed', e);
		}
	},

	clearSession() {
		SupraAuthCrypto.clearSessionMemory();
		if (window.SupraSecureStore?.remove) {
			window.SupraSecureStore
				.remove(SupraAuthCrypto.SECURE_VAULT_ID)
				.catch(() => { /* ignore */ });
		}
	},

	clearAllLocalStorage() {
		try {
			localStorage.clear();
		} catch (_) { /* ignore */ }
	},

	/** Доп. пароли групп и флаги — сбрасываем при выходе; RSA-ключи остаются (зашифрованы мастер-паролем). */
	clearUserGroupSecrets(userId) {
		if (!userId) return;
		const norm = SupraCrypto.normalizeUserId(userId);
		const prefixPwd = `supra-custom-pwd:${userId}:`;
		const prefixPwdNorm = `supra-custom-pwd:${norm}:`;
		const prefixExtra = `supra-extra-on:${userId}:`;
		const prefixExtraNorm = `supra-extra-on:${norm}:`;
		try {
			const toRemove = [];
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (!k) continue;
				if (
					k.startsWith(prefixPwd) ||
					k.startsWith(prefixPwdNorm) ||
					k.startsWith(prefixExtra) ||
					k.startsWith(prefixExtraNorm) ||
					/^supra-custom-pwd:[0-9a-f-]{36}$/i.test(k) ||
					/^supra-extra-on:[0-9a-f-]{36}$/i.test(k)
				) {
					toRemove.push(k);
				}
			}
			toRemove.forEach((k) => localStorage.removeItem(k));
		} catch (_) { /* ignore */ }
	},

	/** Выход: мастер-пароль и локальные ключи удаляются; на сервере остаётся только зашифрованная копия ключа. */
	clearOnLogout(userId) {
		if (window.AppBootLog?.clear) AppBootLog.clear();
		SupraAuthCrypto.clearSession();
		SupraAuthCrypto.clearUserCryptoLocal(userId);
		// secure mode: стираем зашифрованную сессию вместе с ключом-обёрткой
		if (window.SupraSecureStore?.clearAll) {
			window.SupraSecureStore.clearAll().catch(() => { /* ignore */ });
		}
	},

	clearUserCryptoLocal(userId) {
		if (!userId) return;
		SupraAuthCrypto.clearUserGroupSecrets(userId);
		try {
			for (const key of SupraCrypto.listPrivKeyStorageKeys(userId)) {
				localStorage.removeItem(key);
			}
			for (const key of SupraCrypto.listPubKeyStorageKeys(userId)) {
				localStorage.removeItem(key);
			}
		} catch (_) { /* ignore */ }
	},

	validateMasterPassword(password) {
		if (!password || password.length < SupraAuthCrypto.MASTER_MIN_LENGTH) {
			return `Мастер-пароль: минимум ${SupraAuthCrypto.MASTER_MIN_LENGTH} символов`;
		}
		return null;
	},

	async setupEncryption(masterPassword, userId) {
		const setup = await SupraCrypto.setupMasterPassword(masterPassword, userId);
		const res = await fetch('/api/encryption/setup', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				salt: setup.salt,
				verifier: setup.verifier,
				publicKey: setup.publicKey,
				privateKeyBlob: setup.privateKeyBlob,
			}),
		});
		if (!res.ok) {
			const j = await res.json().catch(() => ({}));
			throw new Error(j.error || 'Ошибка настройки шифрования');
		}
		return setup;
	},

	async updateMasterVerifier(salt, verifier, privateKeyBlob = null) {
		const res = await fetch('/api/encryption/setup', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ salt, verifier, publicKey: null, privateKeyBlob }),
		});
		if (!res.ok) {
			const j = await res.json().catch(() => ({}));
			throw new Error(j.error || 'Ошибка сохранения мастер-пароля');
		}
	},

	async resetMasterOnServer() {
		const res = await fetch('/api/encryption/reset', {
			method: 'POST',
			credentials: 'same-origin',
		});
		if (!res.ok) {
			const j = await res.json().catch(() => ({}));
			throw new Error(j.error || 'Не удалось сбросить шифрование');
		}
	},

	/**
	 * Разблокировка или первичная настройка мастер-пароля.
	 * @returns {string?} текст ошибки или null при успехе
	 */
	async applyMasterAfterAuth(me, masterPassword) {
		try {
			const lenErr = SupraAuthCrypto.validateMasterPassword(masterPassword);
			if (lenErr) return lenErr;
			if (me.encryptionConfigured) {
				if (!me.encryptionSalt || !me.encryptionVerifier) {
					return 'Данные шифрования на сервере неполные. Сбросьте шифрование или обратитесь к администратору.';
				}
				const ok = await SupraCrypto.verifyMasterPassword(
					masterPassword,
					me.id,
					me.encryptionSalt,
					me.encryptionVerifier
				);
				if (!ok) return 'Неверный мастер-пароль шифрования';
				await SupraAuthCrypto.saveSession(me.id, me.encryptionSalt, me.encryptionVerifier, masterPassword);
				return null;
			}
			const setup = await SupraAuthCrypto.setupEncryption(masterPassword, me.id);
			await SupraAuthCrypto.saveSession(me.id, setup.salt, setup.verifier, masterPassword);
			return null;
		} catch (e) {
			console.warn('[SupraAuthCrypto] applyMasterAfterAuth', e);
			return e?.message || 'Ошибка настройки шифрования';
		}
	},

	async unlockToCrypto(me, masterPassword) {
		const err = await SupraAuthCrypto.applyMasterAfterAuth(me, masterPassword);
		if (err) throw new Error(err);
		const crypto = new SupraCrypto();
		await crypto.initSession(
			masterPassword,
			me.id,
			me.encryptionSalt || SupraAuthCrypto.getSession()?.salt,
			me.encryptionVerifier || SupraAuthCrypto.getSession()?.verifier
		);
		return crypto;
	},

	async resetMasterAndSetup(me, newMasterPassword) {
		const lenErr = SupraAuthCrypto.validateMasterPassword(newMasterPassword);
		if (lenErr) throw new Error(lenErr);
		SupraAuthCrypto.clearSession();
		SupraAuthCrypto.clearUserCryptoLocal(me.id);
		await SupraAuthCrypto.resetMasterOnServer();
		me.encryptionConfigured = false;
		me.encryptionSalt = null;
		me.encryptionVerifier = null;
		const setup = await SupraAuthCrypto.setupEncryption(newMasterPassword, me.id);
		me.encryptionConfigured = true;
		me.encryptionSalt = setup.salt;
		me.encryptionVerifier = setup.verifier;
		await SupraAuthCrypto.saveSession(me.id, setup.salt, setup.verifier, newMasterPassword);
		const crypto = new SupraCrypto();
		await crypto.initSession(newMasterPassword, me.id, setup.salt, setup.verifier);
		return crypto;
	},
};
