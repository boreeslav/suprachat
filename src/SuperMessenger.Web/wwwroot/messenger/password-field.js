/**
 * Поле пароля с кнопкой «показать» для страниц входа/регистрации (без supra-messenger.js).
 */
(function (global) {
	function eyeSvg() {
		return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
			<circle cx="12" cy="12" r="3"/>
		</svg>`;
	}

	function eyeOffSvg() {
		return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
			<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
			<line x1="1" y1="1" x2="23" y2="23"/>
		</svg>`;
	}

	/**
	 * Оборачивает существующий <input type="password"> в контейнер с кнопкой показа.
	 * @param {HTMLInputElement|string} inputOrSelector
	 * @returns {{ wrap: HTMLElement, input: HTMLInputElement, toggle: HTMLButtonElement }|null}
	 */
	function enhance(inputOrSelector) {
		const input = typeof inputOrSelector === 'string'
			? document.querySelector(inputOrSelector)
			: inputOrSelector;
		if (!input || input.type !== 'password' || input.closest('.sm-password-field')) {
			return null;
		}

		const wrap = document.createElement('div');
		wrap.className = 'sm-password-field';
		input.parentNode.insertBefore(wrap, input);
		wrap.appendChild(input);

		const toggle = document.createElement('button');
		toggle.type = 'button';
		toggle.className = 'sm-password-toggle';
		toggle.setAttribute('aria-label', 'Показать пароль');
		toggle.innerHTML = eyeSvg();

		let visible = false;
		toggle.addEventListener('click', () => {
			visible = !visible;
			input.type = visible ? 'text' : 'password';
			toggle.innerHTML = visible ? eyeOffSvg() : eyeSvg();
			toggle.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
		});

		wrap.appendChild(toggle);
		return { wrap, input, toggle };
	}

	global.SupraPasswordField = { enhance };
})(typeof window !== 'undefined' ? window : globalThis);
