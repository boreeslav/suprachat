'use strict';

const MarkdownIt = require('markdown-it');
const createDOMPurify = require('dompurify');

const md = new MarkdownIt({
	html: false,
	linkify: false,
	breaks: true,
	typographer: false,
}).enable(['table']);

const ALLOWED_TAGS = [
	'p', 'br', 'strong', 'b', 'em', 'i', 'del', 's', 'code', 'pre',
	'ul', 'ol', 'li', 'blockquote',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
];
const ALLOWED_ATTR = ['href', 'class'];

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
