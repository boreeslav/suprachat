'use strict';

const MarkdownIt = require('markdown-it');
const createDOMPurify = require('dompurify');

function messengerCopyTagPlugin(md) {
	const TAG_OPEN = '[copy]';
	const TAG_CLOSE = '[/copy]';

	md.inline.ruler.before('text', 'messenger_copy', (state, silent) => {
		const start = state.pos;
		if (state.src.slice(start, start + TAG_OPEN.length) !== TAG_OPEN) return false;

		let pos = start + TAG_OPEN.length;
		let depth = 1;
		const contentStart = pos;

		while (pos < state.posMax) {
			if (state.src.slice(pos, pos + TAG_CLOSE.length) === TAG_CLOSE) {
				depth -= 1;
				if (depth === 0) {
					if (!silent) {
						const token = state.push('messenger_copy', '', 0);
						token.content = state.src.slice(contentStart, pos);
						token.markup = TAG_OPEN;
					}
					state.pos = pos + TAG_CLOSE.length;
					return true;
				}
				pos += TAG_CLOSE.length;
				continue;
			}
			if (state.src.slice(pos, pos + TAG_OPEN.length) === TAG_OPEN) {
				depth += 1;
				pos += TAG_OPEN.length;
				continue;
			}
			pos += 1;
		}
		return false;
	});

	md.renderer.rules.messenger_copy = (tokens, idx) => {
		const content = tokens[idx].content || '';
		const inner = md.renderInline(content);
		return `<span class="mc-msg-copy" role="button" tabindex="-1">${inner}</span>`;
	};
}

const md = new MarkdownIt({
	html: false,
	linkify: false,
	breaks: true,
	typographer: false,
}).enable(['table']).use(messengerCopyTagPlugin);

const ALLOWED_TAGS = [
	'p', 'br', 'strong', 'b', 'em', 'i', 'del', 's', 'code', 'pre',
	'ul', 'ol', 'li', 'blockquote',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'a', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
];
const ALLOWED_ATTR = ['href', 'class', 'role', 'tabindex'];

function renderMarkdownSource(text) {
	if (!text) return '';
	const purifier = createDOMPurify(typeof window !== 'undefined' ? window : globalThis);
	const raw = md.render(String(text));
	return purifier.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR });
}

const api = { render: renderMarkdownSource };

if (typeof globalThis !== 'undefined') {
	globalThis.SupraMarkdown = api;
}

module.exports = api;
