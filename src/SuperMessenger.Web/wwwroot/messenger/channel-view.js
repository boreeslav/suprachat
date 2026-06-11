(function () {
	'use strict';

	const MC_TAG = 'mc-content';
	const MAX_COLLAGE = 6;
	const AVATAR_COLORS = [
		'#5b8dd9', '#57a87a', '#c47fb0', '#d4875e', '#7b7fd4',
		'#5baab0', '#c4a44a', '#8a6db5', '#6aab8e', '#c46b6b',
	];

	function slugFromPath() {
		const m = location.pathname.match(/^\/@([^/?#]+)$/i);
		return m ? decodeURIComponent(m[1]) : null;
	}

	function escapeHtml(s) {
		return String(s || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function avatarColor(seed) {
		let hash = 0;
		const s = String(seed || 'x');
		for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
		return AVATAR_COLORS[hash % AVATAR_COLORS.length];
	}

	function initials(name) {
		const p = String(name || '?').trim().split(/\s+/);
		return p.length >= 2
			? (p[0][0] + p[1][0]).toUpperCase()
			: String(name || '?').slice(0, 2).toUpperCase();
	}

	function formatTime(ts) {
		try {
			const d = new Date(ts);
			return d.toLocaleString(undefined, {
				day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
			});
		} catch (_) {
			return '';
		}
	}

	function channelFileUrl(fileId) {
		return `/api/files/channel-public/${encodeURIComponent(fileId)}`;
	}

	function parseCustomMessage(text) {
		if (!text || !text.includes(`<${MC_TAG}`)) return null;
		const re = new RegExp(
			`<${MC_TAG}[^>]*type="([^"]+)"[^>]*>([\\s\\S]*?)<\\/${MC_TAG}>`
		);
		const m = text.match(re);
		if (!m) return null;
		try {
			return { contentType: m[1], payload: JSON.parse(m[2]) };
		} catch {
			return null;
		}
	}

	function markImageReady(img) {
		if (!img) return;
		img.classList.remove('mc-image-slot--pending');
		img.classList.add('mc-image-slot--ready');
		const slot = img.closest('.mc-image-slot');
		if (slot) {
			slot.classList.remove('mc-image-slot--pending');
			slot.classList.add('mc-image-slot--ready');
		}
	}

	function bindImageLoad(img) {
		if (!img) return;
		const onReady = () => markImageReady(img);
		img.addEventListener('load', onReady, { once: true });
		img.addEventListener('error', () => {
			img.classList.add('mc-image-slot--error');
		}, { once: true });
		if (img.complete && img.naturalWidth > 0) onReady();
	}

	function createImageElement(fileId, fileName) {
		const wrap = document.createElement('div');
		wrap.className = 'mc-image-slot-wrap mc-image-slot mc-image-slot--pending';
		const img = document.createElement('img');
		img.className = 'mc-bubble-image mc-image-slot--pending';
		img.alt = fileName || '';
		img.loading = 'lazy';
		img.decoding = 'async';
		img.dataset.viewerUrl = channelFileUrl(fileId);
		img.src = channelFileUrl(fileId);
		bindImageLoad(img);
		wrap.appendChild(img);
		return wrap;
	}

	function createCollageElement(fileIds, fileNames) {
		const count = Math.min(fileIds.length, MAX_COLLAGE);
		if (!count) return null;
		const collage = document.createElement('div');
		collage.className = `mc-photo-collage mc-photo-collage--count-${count}`;
		for (let i = 0; i < count; i++) {
			const fileId = fileIds[i];
			if (!fileId) continue;
			const cell = document.createElement('div');
			cell.className = 'mc-photo-collage-cell mc-image-slot mc-image-slot--pending';
			const img = document.createElement('img');
			img.className = 'mc-photo-collage-item mc-image-slot--pending';
			img.alt = fileNames?.[i] || '';
			img.loading = 'lazy';
			img.decoding = 'async';
			img.dataset.viewerUrl = channelFileUrl(fileId);
			img.src = channelFileUrl(fileId);
			bindImageLoad(img);
			cell.appendChild(img);
			collage.appendChild(cell);
		}
		return collage;
	}

	function appendCaption(bubble, caption) {
		const cap = String(caption || '').trim();
		if (!cap) return;
		const capEl = document.createElement('div');
		capEl.className = 'mc-msg-text mc-photo-album-caption';
		capEl.textContent = cap;
		bubble.appendChild(capEl);
	}

	function appendTimeFooter(bubble, ts) {
		const footer = document.createElement('div');
		footer.className = 'mc-msg-footer';
		const time = document.createElement('span');
		time.className = 'mc-msg-time cv-msg-time';
		time.textContent = formatTime(ts);
		footer.appendChild(time);
		bubble.appendChild(footer);
	}

	function buildMessageBubble(msg, channelName) {
		const row = document.createElement('div');
		row.className = 'cv-msg-row mc-msg-row mc-msg-row--other';
		row.dataset.msgId = msg.id || '';

		const bubble = document.createElement('div');
		bubble.className = 'mc-bubble';

		const parsed = parseCustomMessage(msg.text);
		if (!parsed) {
			const text = String(msg.text || '').trim();
			if (text) {
				const textEl = document.createElement('div');
				textEl.className = 'mc-msg-text';
				textEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
				bubble.appendChild(textEl);
			}
			appendTimeFooter(bubble, msg.timestamp);
			row.appendChild(bubble);
			return row;
		}

		if (parsed.contentType === 'image' && parsed.payload?.fileId) {
			bubble.classList.add('mc-image-bubble', 'mc-bubble--media-no-caption');
			bubble.appendChild(createImageElement(parsed.payload.fileId, parsed.payload.fileName));
			appendTimeFooter(bubble, msg.timestamp);
			row.appendChild(bubble);
			return row;
		}

		if (parsed.contentType === 'photo_album') {
			const fileIds = parsed.payload?.fileIds || [];
			const collage = createCollageElement(fileIds, parsed.payload?.fileNames);
			if (collage) {
				bubble.classList.add('mc-photo-album-bubble');
				bubble.appendChild(collage);
				appendCaption(bubble, parsed.payload?.caption);
				if (!parsed.payload?.caption?.trim()) {
					bubble.classList.add('mc-bubble--media-no-caption');
				}
			} else {
				const textEl = document.createElement('div');
				textEl.className = 'mc-msg-text';
				textEl.textContent = 'Фото';
				bubble.appendChild(textEl);
			}
			appendTimeFooter(bubble, msg.timestamp);
			row.appendChild(bubble);
			return row;
		}

		const textEl = document.createElement('div');
		textEl.className = 'mc-msg-text';
		textEl.textContent = 'Вложение';
		bubble.appendChild(textEl);
		appendTimeFooter(bubble, msg.timestamp);
		row.appendChild(bubble);
		return row;
	}

	function buildHeaderAvatar(name, chatId, avatarUrl) {
		const wrap = document.createElement('div');
		wrap.className = 'cv-header-avatar';
		wrap.style.setProperty('--cv-avatar-bg', avatarColor(chatId || name));
		if (avatarUrl) {
			const img = document.createElement('img');
			img.alt = name || '';
			img.src = avatarUrl;
			img.addEventListener('error', () => {
				img.remove();
				wrap.textContent = initials(name);
			}, { once: true });
			wrap.appendChild(img);
		} else {
			wrap.textContent = initials(name);
		}
		return wrap;
	}

	const CvImageViewer = {
		_overlay: null,
		_gallery: [],
		_index: 0,
		_img: null,
		_counter: null,
		_prev: null,
		_next: null,

		open(url, gallery) {
			const urls = (gallery && gallery.length ? gallery : [url]).filter(Boolean);
			if (!urls.length) return;
			this._gallery = urls;
			this._index = Math.max(0, urls.indexOf(url));
			if (this._index < 0) this._index = 0;
			if (!this._overlay) this._create();
			this._overlay.hidden = false;
			document.body.style.overflow = 'hidden';
			this._show();
		},

		close() {
			if (!this._overlay) return;
			this._overlay.hidden = true;
			document.body.style.overflow = '';
		},

		_create() {
			const overlay = document.createElement('div');
			overlay.className = 'cv-viewer';
			overlay.hidden = true;

			const toolbar = document.createElement('div');
			toolbar.className = 'cv-viewer-toolbar';
			const closeBtn = document.createElement('button');
			closeBtn.type = 'button';
			closeBtn.className = 'cv-viewer-close';
			closeBtn.innerHTML = '&times;';
			closeBtn.setAttribute('aria-label', 'Закрыть');
			closeBtn.addEventListener('click', () => this.close());
			const counter = document.createElement('div');
			counter.className = 'cv-viewer-counter';
			toolbar.append(closeBtn, counter);

			const stage = document.createElement('div');
			stage.className = 'cv-viewer-stage';
			const prev = document.createElement('button');
			prev.type = 'button';
			prev.className = 'cv-viewer-nav cv-viewer-nav--prev';
			prev.innerHTML = '&#8249;';
			prev.setAttribute('aria-label', 'Назад');
			const next = document.createElement('button');
			next.type = 'button';
			next.className = 'cv-viewer-nav cv-viewer-nav--next';
			next.innerHTML = '&#8250;';
			next.setAttribute('aria-label', 'Вперёд');
			const img = document.createElement('img');
			img.className = 'cv-viewer-img';
			img.alt = '';
			stage.append(prev, img, next);

			overlay.append(toolbar, stage);
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay || e.target === stage) this.close();
			});
			prev.addEventListener('click', (e) => { e.stopPropagation(); this._step(-1); });
			next.addEventListener('click', (e) => { e.stopPropagation(); this._step(1); });

			document.addEventListener('keydown', (e) => {
				if (overlay.hidden) return;
				if (e.key === 'Escape') this.close();
				if (e.key === 'ArrowLeft') this._step(-1);
				if (e.key === 'ArrowRight') this._step(1);
			});

			document.body.appendChild(overlay);
			this._overlay = overlay;
			this._img = img;
			this._counter = counter;
			this._prev = prev;
			this._next = next;
		},

		_show() {
			const url = this._gallery[this._index];
			if (!url || !this._img) return;
			this._img.src = url;
			const multi = this._gallery.length > 1;
			this._counter.textContent = multi ? `${this._index + 1} / ${this._gallery.length}` : '';
			this._prev.disabled = !multi || this._index <= 0;
			this._next.disabled = !multi || this._index >= this._gallery.length - 1;
		},

		_step(delta) {
			const next = this._index + delta;
			if (next < 0 || next >= this._gallery.length) return;
			this._index = next;
			this._show();
		},
	};

	function collectGalleryFromBubble(bubble) {
		const urls = [];
		bubble?.querySelectorAll('[data-viewer-url]').forEach((el) => {
			const u = el.dataset.viewerUrl;
			if (u && !urls.includes(u)) urls.push(u);
		});
		return urls;
	}

	function bindMessageInteractions(msgsEl) {
		msgsEl.addEventListener('click', (e) => {
			const img = e.target.closest('.mc-bubble-image, .mc-photo-collage-item');
			if (!img) return;
			const url = img.dataset.viewerUrl || img.src;
			if (!url) return;
			e.preventDefault();
			e.stopPropagation();
			const bubble = img.closest('.mc-bubble');
			const gallery = collectGalleryFromBubble(bubble);
			CvImageViewer.open(url, gallery.length ? gallery : [url]);
		});
	}

	function highlightMessage(id) {
		const el = document.querySelector(`[data-msg-id="${CSS.escape(id)}"]`);
		if (!el) return false;
		el.classList.add('cv-msg-row--highlight');
		el.scrollIntoView({ block: 'center', behavior: 'smooth' });
		setTimeout(() => el.classList.remove('cv-msg-row--highlight'), 2000);
		return true;
	}

	async function fetchChannelData(slug, messageId) {
		if (messageId) {
			const params = new URLSearchParams({ messageId, before: '25', after: '25' });
			const r = await fetch(`/api/public/channel/${encodeURIComponent(slug)}/messages/around?${params}`);
			const data = await r.json();
			if (data?.found && data.messages?.length) return data;
		}
		const r = await fetch(`/api/public/channel/${encodeURIComponent(slug)}/messages?limit=50`);
		return r.json();
	}

	function renderPage(data) {
		const root = document.getElementById('root');
		root.replaceChildren();

		const header = document.createElement('header');
		header.className = 'cv-header';
		header.appendChild(buildHeaderAvatar(data.name, data.chatId, data.avatar || null));
		const headerText = document.createElement('div');
		headerText.className = 'cv-header-text';
		const h1 = document.createElement('h1');
		h1.textContent = data.name || 'Канал';
		headerText.appendChild(h1);
		if (data.description) {
			const p = document.createElement('p');
			p.textContent = data.description;
			headerText.appendChild(p);
		}
		header.appendChild(headerText);

		const msgsEl = document.createElement('div');
		msgsEl.className = 'cv-messages';
		msgsEl.id = 'msgs';
		const messages = data.messages || [];
		if (!messages.length) {
			const empty = document.createElement('div');
			empty.className = 'cv-loading';
			empty.textContent = 'Нет сообщений';
			msgsEl.appendChild(empty);
		} else {
			for (const m of messages) {
				msgsEl.appendChild(buildMessageBubble(m, data.name));
			}
		}

		const footer = document.createElement('footer');
		footer.className = 'cv-footer';
		const loginLink = document.createElement('a');
		loginLink.href = '/login.html';
		loginLink.textContent = 'Войти для подписки';
		footer.appendChild(loginLink);

		root.append(header, msgsEl, footer);
		bindMessageInteractions(msgsEl);

		if (messages.length) {
			const msgId = new URLSearchParams(location.search).get('m');
			if (msgId && highlightMessage(msgId)) {
				/* scrolled to anchor */
			} else {
				msgsEl.scrollTop = msgsEl.scrollHeight;
			}
		}
	}

	async function load() {
		const root = document.getElementById('root');
		const slug = slugFromPath();
		if (!slug) {
			root.innerHTML = '<div class="cv-error">Канал не найден</div>';
			return;
		}
		try {
			const msgId = new URLSearchParams(location.search).get('m');
			const data = await fetchChannelData(slug, msgId);
			if (!data?.found) {
				root.innerHTML = '<div class="cv-error">Канал не найден</div>';
				return;
			}
			document.title = data.name || 'Канал';
			renderPage(data);
		} catch (e) {
			root.innerHTML = `<div class="cv-error">Ошибка загрузки: ${escapeHtml(e.message)}</div>`;
		}
	}

	load();
})();
