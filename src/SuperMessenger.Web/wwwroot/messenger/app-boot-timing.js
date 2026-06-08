(function (global) {
	const STORAGE_KEY = 'sm-boot-log';
	const marks = loadStored();

	function loadStored() {
		try {
			const raw = global.sessionStorage?.getItem(STORAGE_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	function persist() {
		try {
			global.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(marks));
		} catch { /* ignore */ }
	}

	function bootMark(label, extra) {
		const ms = Math.round(performance.now());
		const entry = { label: String(label), ms, extra: extra ?? null, at: Date.now() };
		marks.push(entry);
		persist();
		return entry;
	}

	function bootDump() {
		return marks.slice();
	}

	function bootClear() {
		marks.length = 0;
		try { global.sessionStorage?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
	}

	function formatBootText(eventName) {
		const build = (global.document?.querySelector('meta[name="sm-build"]') || {}).content || '';
		const lines = [
			'Boot log' + (eventName ? ': ' + eventName : ''),
			'build: ' + build,
			'path: ' + (global.location?.pathname || ''),
			'ua: ' + (global.navigator?.userAgent || ''),
			'---',
		];
		if (!marks.length) {
			lines.push('(empty)');
			return lines.join('\n');
		}
		for (const m of marks) {
			if (m.label === 'push-debug' && m.extra && typeof m.extra === 'object') {
				lines.push('---');
				lines.push(formatPushDebugText(m.extra));
				continue;
			}
			let line = m.ms + 'ms\t' + m.label;
			if (m.extra != null) {
				try { line += '\t' + JSON.stringify(m.extra); } catch (_) { /* ignore */ }
			}
			lines.push(line);
		}
		return lines.join('\n');
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
				' connected=' + !!r.isConnected + ' action=' + (r.action || '?'));
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
		const entry = bootMark(label || 'push-debug', trace);
		return entry;
	}

	function copyText(text) {
		if (global.navigator?.clipboard?.writeText) {
			return global.navigator.clipboard.writeText(text);
		}
		return new Promise((resolve, reject) => {
			try {
				const ta = global.document.createElement('textarea');
				ta.value = text;
				ta.setAttribute('readonly', '');
				ta.style.position = 'fixed';
				ta.style.left = '-9999px';
				global.document.body.appendChild(ta);
				ta.select();
				const ok = global.document.execCommand('copy');
				ta.remove();
				ok ? resolve() : reject(new Error('copy failed'));
			} catch (e) {
				reject(e);
			}
		});
	}

	function ensureModalStyles() {
		if (global.document.getElementById('sm-boot-log-css')) return;
		const style = global.document.createElement('style');
		style.id = 'sm-boot-log-css';
		style.textContent = [
			'.sm-boot-log-textarea{width:100%;min-height:min(50vh,320px);max-height:60vh;box-sizing:border-box;',
			'padding:10px 12px;border:1px solid var(--mc-border,#ddd);border-radius:10px;resize:vertical;',
			'font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--mc-input-bg,#fafafa);',
			'color:var(--mc-text,#1c1c1e)}',
			'.mc-dialog--boot-log{width:min(92vw,520px)}',
			'.mc-dialog--boot-log .mc-dialog-actions--stack .mc-dialog-btn{flex:none;width:100%}',
		].join('');
		global.document.head.appendChild(style);
	}

	function t(i18n, key, fallback) {
		try { return i18n?.t?.(key) || fallback; } catch { return fallback; }
	}

	function openModal(opts = {}) {
		const { themeManager, i18n } = opts;
		ensureModalStyles();

		const overlay = global.document.createElement('div');
		overlay.className = 'mc-dialog-overlay';

		const dialog = global.document.createElement('div');
		dialog.className = 'mc-dialog mc-dialog--boot-log';
		if (themeManager?.applyChatVars) themeManager.applyChatVars(dialog);

		const titleEl = global.document.createElement('div');
		titleEl.className = 'mc-dialog-title';
		titleEl.textContent = t(i18n, 'debugLogTitle', 'Журнал загрузки');

		const textarea = global.document.createElement('textarea');
		textarea.className = 'sm-boot-log-textarea';
		textarea.readOnly = true;
		textarea.spellcheck = false;
		textarea.value = formatBootText('settings');

		const actions = global.document.createElement('div');
		actions.className = 'mc-dialog-actions mc-dialog-actions--stack';

		const copyBtn = global.document.createElement('button');
		copyBtn.type = 'button';
		copyBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
		copyBtn.textContent = t(i18n, 'debugLogCopy', 'Скопировать');

		const clearBtn = global.document.createElement('button');
		clearBtn.type = 'button';
		clearBtn.className = 'mc-dialog-btn';
		clearBtn.textContent = t(i18n, 'debugLogClear', 'Очистить');

		const closeBtn = global.document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'mc-dialog-btn';
		closeBtn.textContent = t(i18n, 'debugLogClose', 'Закрыть');

		actions.append(copyBtn, clearBtn, closeBtn);
		dialog.append(titleEl, textarea, actions);
		overlay.appendChild(dialog);
		global.document.body.appendChild(overlay);

		const close = () => overlay.remove();
		closeBtn.addEventListener('click', close);
		overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
		global.document.addEventListener('keydown', function onKey(e) {
			if (e.key === 'Escape') {
				global.document.removeEventListener('keydown', onKey);
				close();
			}
		});

		copyBtn.addEventListener('click', () => {
			const text = textarea.value || formatBootText('settings');
			copyText(text)
				.then(() => {
					copyBtn.textContent = t(i18n, 'debugLogCopied', 'Скопировано');
					global.setTimeout(() => {
						copyBtn.textContent = t(i18n, 'debugLogCopy', 'Скопировать');
					}, 1500);
				})
				.catch(() => {
					textarea.focus();
					textarea.select();
				});
		});

		clearBtn.addEventListener('click', () => {
			bootClear();
			textarea.value = t(i18n, 'debugLogEmpty', 'Записей пока нет');
		});
	}

	function openPushDebugModal(opts = {}) {
		const { themeManager, i18n, trace } = opts;
		logPushDebug(trace, 'push-debug');
		openModal({ themeManager, i18n });
	}

	function bootReport(eventName) {
		bootMark(eventName || 'boot-complete');
		return Promise.resolve(null);
	}

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

	bootMark('timing-init');
})(typeof window !== 'undefined' ? window : globalThis);
