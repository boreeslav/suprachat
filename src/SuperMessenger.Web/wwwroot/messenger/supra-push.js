/**
 * Web Push на клиенте: подписка/отписка устройства на пуш-уведомления.
 *
 * Работает только в secure-режиме (HTTPS + Service Worker). Из-за E2E-шифрования
 * сам пуш не содержит текста — сервер шлёт общий сигнал "Новое сообщение", а
 * реальный контент расшифровывается уже в открытом приложении.
 *
 * Разрешение (Notification.requestPermission) запрашивается ТОЛЬКО по действию
 * пользователя (тумблер в настройках), а не автоматически при загрузке.
 */
(function (global) {
	const VAPID_URL = '/api/push/vapid-public-key';
	const SUBSCRIBE_URL = '/api/push/subscribe';
	const UNSUBSCRIBE_URL = '/api/push/unsubscribe';
	const PREFS_URL = '/api/push/preferences';
	const PREFS_GLOBAL_URL = '/api/push/preferences/global';
	const PREFS_CHAT_URL = '/api/push/preferences/chat';
	const LS_ENABLED_KEY = 'sm-push-enabled';

	let vapidKeyPromise = null;
	// Локальный кеш настроек уведомлений (нужен для синхронной проверки при показе
	// локального уведомления). Источник истины — сервер.
	let prefs = { globalMuted: false, mutedChatIds: [] };

	function isSupported() {
		return !!(
			global.SupraEnv &&
			global.SupraEnv.serviceWorkerEnabled &&
			typeof global.Notification !== 'undefined' &&
			'PushManager' in global &&
			navigator.serviceWorker
		);
	}

	function getPermission() {
		try {
			return typeof Notification !== 'undefined' ? Notification.permission : 'default';
		} catch (_) {
			return 'default';
		}
	}

	function urlBase64ToUint8Array(base64String) {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = global.atob(base64);
		const out = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
		return out;
	}

	function arrayBufferToBase64Url(buffer) {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
		return global.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	}

	async function fetchVapidKey() {
		if (vapidKeyPromise) return vapidKeyPromise;
		vapidKeyPromise = fetch(VAPID_URL, { credentials: 'same-origin' })
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => (d && d.publicKey ? d.publicKey : null))
			.catch(() => null);
		return vapidKeyPromise;
	}

	async function getRegistration() {
		if (!navigator.serviceWorker) return null;
		try {
			return await navigator.serviceWorker.ready;
		} catch (_) {
			return null;
		}
	}

	function subscriptionToPayload(sub) {
		const json = sub.toJSON ? sub.toJSON() : null;
		if (json && json.keys) {
			return { endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
		}
		const p256 = sub.getKey ? sub.getKey('p256dh') : null;
		const auth = sub.getKey ? sub.getKey('auth') : null;
		return {
			endpoint: sub.endpoint,
			p256dh: p256 ? arrayBufferToBase64Url(p256) : '',
			auth: auth ? arrayBufferToBase64Url(auth) : '',
		};
	}

	async function postSubscription(sub) {
		const payload = subscriptionToPayload(sub);
		if (!payload.endpoint || !payload.p256dh || !payload.auth) return false;
		try {
			const r = await fetch(SUBSCRIBE_URL, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			return r.ok;
		} catch (_) {
			return false;
		}
	}

	async function postUnsubscribe(endpoint) {
		try {
			await fetch(UNSUBSCRIBE_URL, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ endpoint }),
			});
		} catch (_) { /* ignore */ }
	}

	function setEnabledFlag(on) {
		try { localStorage.setItem(LS_ENABLED_KEY, on ? '1' : '0'); } catch (_) { /* ignore */ }
	}

	function getEnabledFlag() {
		try { return localStorage.getItem(LS_ENABLED_KEY); } catch (_) { return null; }
	}

	async function ensureSubscribed() {
		const reg = await getRegistration();
		if (!reg || !reg.pushManager) return null;
		let sub = await reg.pushManager.getSubscription();
		if (!sub) {
			const key = await fetchVapidKey();
			if (!key) return null;
			sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(key),
			});
		}
		await postSubscription(sub);
		return sub;
	}

	/** Включить уведомления: запросить разрешение и подписаться. По жесту пользователя. */
	async function enable() {
		if (!isSupported()) return { ok: false, reason: 'unsupported' };
		let permission = getPermission();
		if (permission === 'default') {
			try {
				permission = await Notification.requestPermission();
			} catch (_) {
				permission = getPermission();
			}
		}
		if (permission !== 'granted') {
			setEnabledFlag(false);
			return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' };
		}
		const sub = await ensureSubscribed();
		if (!sub) {
			setEnabledFlag(false);
			return { ok: false, reason: 'subscribe-failed' };
		}
		setEnabledFlag(true);
		// Снимаем глобальный mute на сервере: включение уведомлений = глобально вкл.
		setGlobalMuted(false).catch(() => {});
		return { ok: true };
	}

	/** Выключить уведомления на этом устройстве. */
	async function disable() {
		setEnabledFlag(false);
		// Глобальное отключение фиксируем и на сервере, чтобы прекратить серверный пуш.
		setGlobalMuted(true).catch(() => {});
		const reg = await getRegistration();
		if (!reg || !reg.pushManager) return { ok: true };
		try {
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				const endpoint = sub.endpoint;
				await sub.unsubscribe().catch(() => false);
				await postUnsubscribe(endpoint);
			}
		} catch (_) { /* ignore */ }
		return { ok: true };
	}

	// ===== Настройки уведомлений (глобально + по чатам) =====

	function normalizeMutedList(list) {
		if (!Array.isArray(list)) return [];
		return list.map((c) => String(c)).filter(Boolean);
	}

	/** Загрузить настройки уведомлений с сервера в локальный кеш. */
	async function loadPreferences() {
		try {
			const r = await fetch(PREFS_URL, { credentials: 'same-origin' });
			if (!r.ok) return prefs;
			const d = await r.json();
			prefs = {
				globalMuted: !!(d && d.globalMuted),
				mutedChatIds: normalizeMutedList(d && d.mutedChatIds),
			};
		} catch (_) { /* оставляем прежний кеш */ }
		return prefs;
	}

	function getPreferences() {
		return { globalMuted: prefs.globalMuted, mutedChatIds: prefs.mutedChatIds.slice() };
	}

	function isGlobalMuted() {
		return !!prefs.globalMuted;
	}

	function isChatMuted(chatId) {
		if (!chatId) return false;
		const id = String(chatId);
		return prefs.mutedChatIds.indexOf(id) !== -1;
	}

	/** Можно ли показывать уведомление о сообщении в данном чате (с учётом mute). */
	function shouldNotify(chatId) {
		if (prefs.globalMuted) return false;
		return !isChatMuted(chatId);
	}

	function notifyPrefsChanged() {
		try {
			global.dispatchEvent(new CustomEvent('sm-notify-prefs-changed'));
		} catch (_) { /* ignore */ }
	}

	async function setGlobalMuted(muted) {
		prefs.globalMuted = !!muted;
		try {
			await fetch(PREFS_GLOBAL_URL, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ muted: !!muted }),
			});
		} catch (_) { /* ignore */ }
		notifyPrefsChanged();
		return { ok: true };
	}

	async function setChatMuted(chatId, muted) {
		if (!chatId) return { ok: false };
		const id = String(chatId);
		const idx = prefs.mutedChatIds.indexOf(id);
		if (muted && idx === -1) prefs.mutedChatIds.push(id);
		if (!muted && idx !== -1) prefs.mutedChatIds.splice(idx, 1);
		try {
			await fetch(PREFS_CHAT_URL, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chatId: id, muted: !!muted }),
			});
		} catch (_) { /* ignore */ }
		notifyPrefsChanged();
		return { ok: true };
	}

	/** Текущий статус для UI. */
	async function getStatus() {
		const supported = isSupported();
		const permission = getPermission();
		let subscribed = false;
		if (supported && permission === 'granted') {
			const reg = await getRegistration();
			if (reg && reg.pushManager) {
				try {
					subscribed = !!(await reg.pushManager.getSubscription());
				} catch (_) { subscribed = false; }
			}
		}
		return { supported, permission, subscribed };
	}

	/**
	 * Тихая синхронизация при загрузке: если пользователь ранее включал пуши и
	 * разрешение всё ещё выдано — переотправляем подписку на сервер (она могла
	 * протухнуть/обновиться, плюс могла смениться учётная запись).
	 */
	async function syncOnLoad() {
		// Настройки уведомлений нужны даже без активной подписки (для локальных
		// уведомлений и для пунктов меню), поэтому грузим их всегда.
		loadPreferences().catch(() => {});
		if (!isSupported()) return;
		if (getPermission() !== 'granted') return;
		if (getEnabledFlag() === '0') return;
		try {
			await ensureSubscribed();
		} catch (e) {
			console.warn('[SupraPush] sync failed', e);
		}
	}

	global.SupraPush = {
		isSupported,
		getPermission,
		getStatus,
		enable,
		disable,
		syncOnLoad,
		loadPreferences,
		getPreferences,
		isGlobalMuted,
		isChatMuted,
		shouldNotify,
		setGlobalMuted,
		setChatMuted,
	};
})(typeof window !== 'undefined' ? window : globalThis);
