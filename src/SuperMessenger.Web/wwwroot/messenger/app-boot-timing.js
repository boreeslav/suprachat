(function (global) {
	const STORAGE_KEY = 'sm-boot-log';

	function bootClearLegacy() {
		try { global.sessionStorage?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
	}

	/** Boot timing больше не пишется — no-op для совместимости с __bootMark по всему приложению. */
	function bootMark(_label, _extra) {
		return null;
	}

	function bootDump() {
		return [];
	}

	function bootClear() {
		bootClearLegacy();
		try { global.MessengerNavDebugLog?.clear?.(); } catch { /* ignore */ }
	}

	function formatPushDebugText(trace) {
		const lines = ['Push debug', 'at: ' + new Date().toISOString()];
		if (!trace || typeof trace !== 'object') {
			lines.push('(no data)');
			return lines.join('\n');
		}
		if (trace.chatId) lines.push('chatId: ' + trace.chatId);
		if (trace.messageId) lines.push('messageId: ' + trace.messageId);
		lines.push('---');
		const recipients = Array.isArray(trace.recipients) ? trace.recipients : [];
		if (!recipients.length) {
			lines.push('(no recipients)');
			return lines.join('\n');
		}
		for (const r of recipients) {
			const name = r.displayName || r.userId || '?';
			lines.push('[' + name + '] presence=' + (r.presenceStatus || '?') +
				' connected=' + !!r.isConnected + ' foreground=' + (r.isForeground !== false) +
				' action=' + (r.action || '?'));
			if (r.skipReason) lines.push('  skip: ' + r.skipReason);
			if (r.globalMuted) lines.push('  globalMuted: true');
			if (r.chatMuted) lines.push('  chatMuted: true');
			if (r.subscriptionCount != null) lines.push('  subscriptions: ' + r.subscriptionCount);
			if (r.anyDelivered != null) lines.push('  delivered: ' + r.anyDelivered);
			const attempts = Array.isArray(r.attempts) ? r.attempts : [];
			for (const a of attempts) {
				let al = '  endpoint …' + (a.endpointSuffix || '?') + ' → ' + (a.outcome || '?');
				if (a.httpStatus != null) al += ' HTTP ' + a.httpStatus;
				if (a.error) al += ' (' + a.error + ')';
				lines.push(al);
			}
		}
		return lines.join('\n');
	}

	function logPushDebug(trace, label) {
		if (global.MessengerNavDebugLog?.append) {
			global.MessengerNavDebugLog.append(label || 'push-debug', { trace });
		}
	}

	/** UI отключён; данные в MessengerNavDebugLog (sessionStorage). */
	function openModal(_opts = {}) {}

	function openPushDebugModal(opts = {}) {
		logPushDebug(opts?.trace, 'push-debug');
	}

	function bootReport(_eventName) {
		return Promise.resolve(null);
	}

	function formatBootText() {
		try {
			if (typeof global.MessengerNavDebugLog?.formatText === 'function') {
				return global.MessengerNavDebugLog.formatText();
			}
		} catch { /* ignore */ }
		return '(empty)';
	}

	bootClearLegacy();

	global.AppBootLog = {
		mark: bootMark,
		dump: bootDump,
		clear: bootClear,
		format: formatBootText,
		formatPushDebug: formatPushDebugText,
		logPushDebug,
		openModal,
		openPushDebugModal,
	};

	global.__bootMark = bootMark;
	global.__bootDump = bootDump;
	global.__bootReport = bootReport;
	global.__bootFormat = formatBootText;
	global.__bootClear = bootClear;
})(typeof window !== 'undefined' ? window : globalThis);
