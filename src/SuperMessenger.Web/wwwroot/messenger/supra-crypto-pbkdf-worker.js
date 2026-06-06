'use strict';

function ub64(str) {
	const bin = atob(str);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function concat(a, b) {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}

self.onmessage = async (e) => {
	const { reqId, password, saltB64, userId, iterations } = e.data || {};
	try {
		if (!reqId || !password || !saltB64 || !userId) {
			throw new Error('invalid pbkdf request');
		}
		const salt = ub64(saltB64);
		const enc = new TextEncoder();
		const baseKey = await crypto.subtle.importKey(
			'raw',
			enc.encode(password),
			'PBKDF2',
			false,
			['deriveBits']
		);
		const bits = await crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt: concat(salt, enc.encode(userId)),
				iterations: iterations || 310000,
				hash: 'SHA-256',
			},
			baseKey,
			256
		);
		self.postMessage({ reqId, bits }, [bits]);
	} catch (err) {
		self.postMessage({ reqId, error: err?.message || String(err) });
	}
};
