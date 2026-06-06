/**
 * Экран разблокировки мастер-пароля после входа (без редиректа на login.html).
 */

async function supraRunCryptoBusy(message, work, submitBtn) {
	const prevLabel = submitBtn?.textContent;
	if (submitBtn) {
		submitBtn.disabled = true;
		if (message) submitBtn.textContent = message;
	}
	try {
		return await work();
	} finally {
		if (submitBtn) {
			submitBtn.disabled = false;
			if (prevLabel) submitBtn.textContent = prevLabel;
		}
	}
}

function supraHasPendingLoginPassword(pendingFromOptions) {
	if (pendingFromOptions) return true;
	return !!(
		typeof SupraAuthCrypto?.peekPendingLoginPassword === 'function' &&
		SupraAuthCrypto.peekPendingLoginPassword()
	);
}

window.SupraMasterUnlock = {

	_overlay: null,

	show(me, onUnlocked, options = {}) {
		if (SupraMasterUnlock._overlay) return;

		const MessengerDialog = window.MessengerDialog;
		if (!MessengerDialog) {
			console.error('[SupraMasterUnlock] MessengerDialog is not available');
			return;
		}

		const setup = !me.encryptionConfigured;
		const welcomeHtml = (options.loginWelcomeHtml || '').trim();
		const forceSeparate = !!options.forceSeparateMaster;
		let useLoginAsMaster = options.masterPasswordMatchesLogin !== false && !forceSeparate;
		let pendingLoginPassword = options.pendingLoginPassword || null;

		const unlockOptions = {
			loginWelcomeHtml: options.loginWelcomeHtml,
			masterPasswordMatchesLogin: options.masterPasswordMatchesLogin,
			forceSeparateMaster: options.forceSeparateMaster,
			pendingLoginPassword: options.pendingLoginPassword,
		};

		const reopenUnlock = () => SupraMasterUnlock.show(me, onUnlocked, unlockOptions);

		const overlay = document.createElement('div');
		overlay.className = 'supra-master-unlock-overlay';
		overlay.innerHTML = `
			<div class="supra-master-unlock-card">
				<h2 class="supra-master-unlock-title">${setup ? 'Настройка шифрования' : 'Мастер-пароль'}</h2>
				<div class="supra-master-unlock-welcome" id="supraMasterWelcome" hidden></div>
				<p class="supra-master-unlock-hint" id="supraMasterHint"></p>
				<div class="supra-master-unlock-err" id="supraMasterErr" hidden></div>
				<form id="supraMasterForm" class="supra-master-unlock-form">
					<label class="supra-master-unlock-same" id="supraMasterSameWrap">
						<input type="checkbox" id="supraMasterSameLogin" checked />
						<span id="supraMasterSameLabel">Мастер-пароль совпадает с паролем входа</span>
					</label>
					<div class="supra-master-unlock-field" id="supraMasterFieldWrap"></div>
					<button type="submit" class="supra-master-unlock-submit" id="supraMasterSubmit">
						${setup ? 'Настроить' : 'Разблокировать'}
					</button>
				</form>
				<button type="button" class="supra-master-unlock-reset" id="supraMasterReset" hidden>
					Не помню мастер-пароль — сбросить шифрование
				</button>
			</div>`;

		document.body.appendChild(overlay);
		SupraMasterUnlock._overlay = overlay;

		const welcomeEl = overlay.querySelector('#supraMasterWelcome');
		const hint = overlay.querySelector('#supraMasterHint');
		const errEl = overlay.querySelector('#supraMasterErr');
		const form = overlay.querySelector('#supraMasterForm');
		form.noValidate = true;
		const resetBtn = overlay.querySelector('#supraMasterReset');
		const fieldWrap = overlay.querySelector('#supraMasterFieldWrap');
		const sameCheckbox = overlay.querySelector('#supraMasterSameLogin');
		const submitBtn = overlay.querySelector('#supraMasterSubmit');
		const minLen = SupraAuthCrypto.MASTER_MIN_LENGTH;

		if (welcomeHtml && welcomeEl) {
			const sanitize = typeof sanitizeAppHtml === 'function'
				? sanitizeAppHtml
				: (html) => html;
			welcomeEl.innerHTML = sanitize(welcomeHtml);
			welcomeEl.hidden = false;
		}

		sameCheckbox.checked = useLoginAsMaster;
		if (forceSeparate) {
			sameCheckbox.checked = false;
			useLoginAsMaster = false;
		}

		const field = MessengerDialog.createPasswordField({
			placeholder: 'Мастер-пароль',
			minLength: minLen,
			required: false,
		});
		fieldWrap.appendChild(field.wrap);

		const updateUi = () => {
			const same = sameCheckbox.checked;
			const hasPending = supraHasPendingLoginPassword(pendingLoginPassword);
			const showPasswordField = !same || !hasPending;
			fieldWrap.hidden = !showPasswordField;
			field.input.disabled = false;
			field.input.placeholder = same ? 'Пароль входа' : 'Мастер-пароль';

			if (same) {
				if (hasPending) {
					hint.textContent = setup
						? 'Будет использован пароль входа. Отдельный мастер-пароль не нужен.'
						: 'Будет использован пароль входа с этой сессии. Снимите галочку, если задавали другой мастер-пароль.';
				} else {
					hint.textContent = setup
						? `Введите пароль входа (мин. ${minLen} символов) — он будет использоваться для шифрования.`
						: `Введите пароль входа (мин. ${minLen} символов) для разблокировки шифрования.`;
				}
			} else {
				hint.textContent = setup
					? `Придумайте мастер-пароль (мин. ${minLen} символов). Без него переписку не расшифровать.`
					: `Введите мастер-пароль (мин. ${minLen} символов).`;
			}

			if (forceSeparate && same) {
				hint.textContent =
					'Пароль входа не подошёл для расшифровки. Введите отдельный мастер-пароль или сбросьте шифрование.';
			}
		};

		updateUi();
		sameCheckbox.addEventListener('change', updateUi);

		if (!setup) resetBtn.hidden = false;

		const showErr = (text) => {
			errEl.textContent = text;
			errEl.hidden = !text;
		};

		const resolvePassword = () => {
			if (sameCheckbox.checked) {
				const p =
					pendingLoginPassword ||
					SupraAuthCrypto.peekPendingLoginPassword?.() ||
					field.input.value;
				if (!p || p.length < minLen) {
					const hasPending = supraHasPendingLoginPassword(pendingLoginPassword);
					showErr(
						hasPending
							? 'Введите пароль входа (мин. ' + minLen + ' символов) или снимите галочку'
							: 'Введите пароль входа (мин. ' + minLen + ' символов)'
					);
					return null;
				}
				return p;
			}

			const pwd = field.input.value;
			if (pwd.length < minLen) {
				showErr(`Минимум ${minLen} символов`);
				return null;
			}
			return pwd;
		};

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			showErr('');

			const pwd = resolvePassword();
			if (!pwd) return;

			const matchesLogin = sameCheckbox.checked;
			const busyMsg = setup ? 'Настройка шифрования…' : 'Разблокировка…';

			try {
				const crypto = await supraRunCryptoBusy(busyMsg, async () => {
					if (setup) {
						const setupErr = await SupraAuthCrypto.applyMasterAfterAuth(me, pwd);
						if (setupErr) throw new Error(setupErr);

						const sess = SupraAuthCrypto.getSession() || {};
						const c = new SupraCrypto();
						await c.initSession(pwd, me.id, sess.salt, sess.verifier);
						me.encryptionConfigured = true;
						me.encryptionSalt = sess.salt;
						me.encryptionVerifier = sess.verifier;
						return c;
					}

					return SupraAuthCrypto.unlockToCrypto(me, pwd);
				}, submitBtn);

				SupraAuthCrypto.consumePendingLoginPassword();
				pendingLoginPassword = null;

				await SupraAuthCrypto.setMasterPasswordMatchesLogin(matchesLogin);
				me.masterPasswordMatchesLogin = matchesLogin;

				if (matchesLogin) SupraAuthCrypto.clearMasterMismatchFlag();

				SupraMasterUnlock.hide();

				if (window.AppSplash) AppSplash.hide();

				onUnlocked?.(crypto);
			} catch (ex) {
				showErr(ex?.message || 'Ошибка');
			}
		});

		resetBtn.addEventListener('click', async () => {
			const ok = await MessengerDialog.confirm({
				title: 'Сброс мастер-пароля',
				message:
					'Все ключи шифрования на сервере и на этом устройстве будут удалены. ' +
					'Старые сообщения в группах станут нечитаемы, пока участники не выдадут вам ключи заново. ' +
					'В группах с доп. паролем его нужно будет ввести снова. Продолжить?',
				confirmLabel: 'Сбросить',
				cancelLabel: 'Отмена',
				type: MessengerDialog.TYPE_DANGER,
			});
			if (!ok) return;

			SupraMasterUnlock.hide();

			const useLoginPassword = await MessengerDialog.confirm({
				title: 'Пароль шифрования',
				message:
					'Использовать для шифрования тот же пароль, что и для входа в систему? ' +
					'(рекомендуется — не нужно запоминать два пароля)',
				confirmLabel: 'Да, один пароль',
				cancelLabel: 'Отдельный мастер-пароль',
			});

			let newPwd = null;
			let matchesLogin = false;

			if (useLoginPassword) {
				newPwd =
					pendingLoginPassword ||
					SupraAuthCrypto.peekPendingLoginPassword?.() ||
					null;
				if (!newPwd || newPwd.length < minLen) {
					newPwd = await MessengerDialog.promptPassword({
						title: 'Пароль входа',
						message: `Введите пароль входа — он будет использоваться для шифрования (мин. ${minLen} символов).`,
						placeholder: 'Пароль входа',
						minLength: minLen,
						confirmLabel: 'Сохранить',
						cancelLabel: 'Отмена',
					});
				}
				matchesLogin = true;
			} else {
				newPwd = await MessengerDialog.promptPassword({
					title: 'Новый мастер-пароль',
					message: `Задайте мастер-пароль (мин. ${minLen} символов).`,
					placeholder: 'Мастер-пароль',
					minLength: minLen,
					confirmLabel: 'Сохранить',
					cancelLabel: 'Отмена',
				});
				matchesLogin = false;
			}

			if (!newPwd) {
				reopenUnlock();
				return;
			}

			try {
				const crypto = await supraRunCryptoBusy('Сброс шифрования…', () =>
					SupraAuthCrypto.resetMasterAndSetup(me, newPwd)
				);

				SupraAuthCrypto.consumePendingLoginPassword();
				await SupraAuthCrypto.setMasterPasswordMatchesLogin(matchesLogin);
				me.masterPasswordMatchesLogin = matchesLogin;
				SupraAuthCrypto.clearMasterMismatchFlag();

				if (window.AppSplash) AppSplash.hide();

				onUnlocked?.(crypto);
			} catch (ex) {
				await MessengerDialog.alert({
					title: 'Ошибка сброса',
					message: ex?.message || 'Ошибка сброса',
				});
				reopenUnlock();
			}
		});

		if (!useLoginAsMaster || !supraHasPendingLoginPassword(pendingLoginPassword)) {
			field.input.focus();
		}
	},

	hide() {
		SupraMasterUnlock._overlay?.remove();
		SupraMasterUnlock._overlay = null;
	},
};
