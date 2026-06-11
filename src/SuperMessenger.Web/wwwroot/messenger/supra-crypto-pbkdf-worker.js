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

async function deriveBits(password, saltBytes, iterations, bitLength) {
	const enc = new TextEncoder();
	const baseKey = await crypto.subtle.importKey(
		'raw',
		enc.encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	return crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: saltBytes,
			iterations: iterations || 310000,
			hash: 'SHA-256',
		},
		baseKey,
		bitLength || 256
	);
}

self.onmessage = async (e) => {
	const { reqId, kind, password, saltB64, userId, iterations, bits } = e.data || {};
	try {
		if (!reqId || !password || !saltB64) {
			throw new Error('invalid pbkdf request');
		}
		const salt = ub64(saltB64);
		const enc = new TextEncoder();
		let pbkdfSalt = salt;
		if (kind === 'masterKey' || (!kind && userId)) {
			if (!userId) throw new Error('invalid masterKey pbkdf request');
			pbkdfSalt = concat(salt, enc.encode(userId));
		}
		const derived = await deriveBits(password, pbkdfSalt, iterations, bits || 256);
		self.postMessage({ reqId, bits: new Uint8Array(derived) }, [derived]);
	} catch (err) {
		self.postMessage({ reqId, error: err?.message || String(err) });
	}
};
