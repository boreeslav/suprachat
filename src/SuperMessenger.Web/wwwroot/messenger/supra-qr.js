/**
 * QR codes with centered logo overlay (PNG/JPEG/WebP/GIF/SVG).
 * Requires node-qrcode browser build (global QRCode.toCanvas).
 */
(function (global) {
	'use strict';

	function isSvgSource(src) {
		if (!src || typeof src !== 'string') return false;
		const s = src.trim();
		return /\.svg(\?|#|$)/i.test(s) || /^data:image\/svg\+xml/i.test(s);
	}

	function loadRasterImage(src) {
		return new Promise((resolve) => {
			const img = new Image();
			img.decoding = 'async';
			if (!/^data:/i.test(src)) img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
			img.onerror = () => resolve(null);
			img.src = src;
		});
	}

	async function loadSvgAsImage(src) {
		try {
			if (/^data:image\/svg\+xml/i.test(src)) {
				return loadRasterImage(src);
			}
			const r = await fetch(src, { credentials: 'same-origin' });
			if (!r.ok) return loadRasterImage(src);
			const svgText = await r.text();
			const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			try {
				return await loadRasterImage(url);
			} finally {
				URL.revokeObjectURL(url);
			}
		} catch {
			return loadRasterImage(src);
		}
	}

	async function loadLogoImage(logoUrl) {
		if (!logoUrl) return null;
		const src = String(logoUrl).trim();
		if (!src) return null;
		if (isSvgSource(src)) return loadSvgAsImage(src);
		return loadRasterImage(src);
	}

	function roundRect(ctx, x, y, w, h, r) {
		const rad = Math.min(r, w / 2, h / 2);
		ctx.beginPath();
		ctx.moveTo(x + rad, y);
		ctx.arcTo(x + w, y, x + w, y + h, rad);
		ctx.arcTo(x + w, y + h, x, y + h, rad);
		ctx.arcTo(x, y + h, x, y, rad);
		ctx.arcTo(x, y, x + w, y, rad);
		ctx.closePath();
	}

	function getQrApi() {
		const raw = global.QRCode;
		if (!raw) return null;
		if (typeof raw.toCanvas === 'function') return raw;
		if (raw.default && typeof raw.default.toCanvas === 'function') return raw.default;
		return null;
	}

	function getAppLogoUrl() {
		const url = global.__appBranding?.logoUrl;
		return url && String(url).trim() ? String(url).trim() : null;
	}

	function toCanvasAsync(canvas, text, opts) {
		const QRCode = getQrApi();
		return new Promise((resolve, reject) => {
			QRCode.toCanvas(canvas, text, opts, (err) => (err ? reject(err) : resolve(canvas)));
		});
	}

	/**
	 * @param {HTMLElement|null} container
	 * @param {{ text: string, size?: number, logoUrl?: string|null|false, logoScale?: number, colorDark?: string, colorLight?: string }} options
	 * @returns {Promise<HTMLCanvasElement>}
	 */
	async function render(container, options = {}) {
		if (!getQrApi()) throw new Error('QR library not loaded');

		const text = options.text != null ? String(options.text) : '';
		if (!text) throw new Error('QR text is empty');

		const size = Math.max(120, Math.min(512, Number(options.size) || 220));
		const logoUrl = options.logoUrl !== undefined ? options.logoUrl : getAppLogoUrl();
		const dark = options.colorDark || '#000000';
		const light = options.colorLight || '#ffffff';
		const logoScale = options.logoScale != null ? Number(options.logoScale) : 0.22;

		if (container) container.replaceChildren();

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		canvas.setAttribute('role', 'img');
		canvas.setAttribute('aria-label', 'QR code');

		await toCanvasAsync(canvas, text, {
			width: size,
			margin: 2,
			errorCorrectionLevel: 'H',
			color: { dark, light },
		});

		const logo = logoUrl === false ? null : await loadLogoImage(logoUrl);
		if (logo) {
			const ctx = canvas.getContext('2d');
			const logoSize = Math.round(size * logoScale);
			const pad = Math.max(4, Math.round(logoSize * 0.15));
			const boxSize = logoSize + pad * 2;
			const bx = (size - boxSize) / 2;
			const by = (size - boxSize) / 2;

			ctx.fillStyle = light;
			roundRect(ctx, bx, by, boxSize, boxSize, Math.round(boxSize * 0.14));
			ctx.fill();

			const lx = bx + pad;
			const ly = by + pad;
			ctx.save();
			roundRect(ctx, lx, ly, logoSize, logoSize, Math.round(logoSize * 0.1));
			ctx.clip();
			ctx.drawImage(logo, lx, ly, logoSize, logoSize);
			ctx.restore();
		}

		if (container) container.appendChild(canvas);
		return canvas;
	}

	global.SupraQr = {
		render,
		getAppLogoUrl,
		loadLogoImage,
		isAvailable: () => !!getQrApi(),
	};
})(typeof window !== 'undefined' ? window : globalThis);
