'use strict';

let privateKey = null;

function ub64(b64) {
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

self.onmessage = async (e) => {
	const { kind, reqId, pkcs8, wrappedB64 } = e.data || {};
	try {
		if (kind === 'init') {
			if (!pkcs8?.byteLength) throw new Error('missing pkcs8');
			privateKey = await crypto.subtle.importKey(
				'pkcs8',
				pkcs8,
				{ name: 'RSA-OAEP', hash: 'SHA-256' },
				false,
				['decrypt']
			);
			self.postMessage({ reqId, ok: true });
			return;
		}
		if (kind === 'unwrap') {
			if (!privateKey) throw new Error('rsa worker not initialized');
			if (!wrappedB64) throw new Error('missing wrapped');
			const plain = await crypto.subtle.decrypt(
				{ name: 'RSA-OAEP' },
				privateKey,
				ub64(wrappedB64)
			);
			self.postMessage({ reqId, text: new TextDecoder().decode(plain) });
			return;
		}
		throw new Error('unknown rsa worker kind');
	} catch (err) {
		self.postMessage({ reqId, error: err?.message || String(err) });
	}
};
