/**
 * Minimal SubtleCrypto for HTTP / IP (no native crypto.subtle).
 * Covers algorithms used by supra-crypto.js.
 */
const forge = require('node-forge');

function u8(buf) {
	if (buf instanceof Uint8Array) return buf;
	if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
	if (typeof buf === 'string') {
		const out = new Uint8Array(buf.length);
		for (let i = 0; i < buf.length; i++) out[i] = buf.charCodeAt(i) & 0xff;
		return out;
	}
	return new Uint8Array(buf);
}

/** Forge AES/RSA expect binary string (one char = one byte), not TypedArray. */
function rawToBinary(raw) {
	const bytes = u8(raw);
	let s = '';
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return s;
}

function ab(bytes) {
	const b = u8(bytes);
	return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

function pbkdf2(password, salt, iterations, lengthBits) {
	const md = forge.md.sha256.create();
	const key = forge.pkcs5.pbkdf2(password, salt, iterations, lengthBits / 8, md);
	return ab(key);
}

function hkdfSha256(ikm, salt, info, lengthBits) {
	const hmac = (key, data) => {
		const h = forge.hmac.create();
		h.start('sha256', key);
		h.update(data);
		return h.digest().getBytes();
	};
	const saltBuf = salt && salt.length ? salt : String.fromCharCode(0).repeat(32);
	const prk = hmac(saltBuf, ikm);
	const len = lengthBits / 8;
	let prev = '';
	let out = '';
	for (let i = 1; out.length < len; i++) {
		prev = hmac(prk, prev + info + String.fromCharCode(i));
		out += prev;
	}
	return ab(out.slice(0, len));
}

function aesGcmEncrypt(keyRaw, ivRaw, plain) {
	const key = rawToBinary(keyRaw);
	if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
		throw new Error(`AES-GCM: invalid key length ${key.length}`);
	}
	const iv = rawToBinary(ivRaw);
	const plainStr = typeof plain === 'string' ? plain : rawToBinary(plain);
	const cipher = forge.cipher.createCipher('AES-GCM', key);
	cipher.start({ iv, tagLength: 128 });
	cipher.update(forge.util.createBuffer(plainStr));
	if (!cipher.finish()) throw new Error('AES-GCM encrypt failed');
	const ct = cipher.output.getBytes();
	const tag = cipher.mode.tag.getBytes();
	return ab(ct + tag);
}

function aesGcmDecrypt(keyRaw, ivRaw, data) {
	const key = rawToBinary(keyRaw);
	const iv = rawToBinary(ivRaw);
	const buf = forge.util.createBuffer(typeof data === 'string' ? data : rawToBinary(data));
	const tagLen = 16;
	const ct = buf.getBytes(buf.length() - tagLen);
	const tag = buf.getBytes(tagLen);
	const cipher = forge.cipher.createDecipher('AES-GCM', key);
	cipher.start({ iv, tag, tagLength: 128 });
	cipher.update(forge.util.createBuffer(ct));
	const ok = cipher.finish();
	if (!ok) throw new Error('AES-GCM decrypt failed');
	return ab(cipher.output.getBytes());
}

function rsaOaepEncrypt(publicKey, data) {
	const plain = typeof data === 'string' ? data : rawToBinary(data);
	return ab(publicKey.encrypt(plain, 'RSA-OAEP', {
		md: forge.md.sha256.create(),
		mgf1: { md: forge.md.sha256.create() },
	}));
}

function rsaOaepDecrypt(privateKey, data) {
	const cipher = typeof data === 'string' ? data : rawToBinary(data);
	return ab(privateKey.decrypt(cipher, 'RSA-OAEP', {
		md: forge.md.sha256.create(),
		mgf1: { md: forge.md.sha256.create() },
	}));
}

function exportSpki(publicKey) {
	return ab(forge.asn1.toDer(forge.pki.publicKeyToAsn1(publicKey)).getBytes());
}

function exportPkcs8(privateKey) {
	return ab(forge.asn1.toDer(forge.pki.privateKeyToAsn1(privateKey)).getBytes());
}

function importSpki(buf) {
	return forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(rawToBinary(buf)));
}

function importPkcs8(buf) {
	return forge.pki.privateKeyFromAsn1(forge.asn1.fromDer(rawToBinary(buf)));
}

function makeKey(handle) {
	return { __supra: true, ...handle };
}

function getKey(key) {
	if (!key?.__supra) throw new TypeError('Not a CryptoKey');
	return key;
}

const subtle = {
	async importKey(format, keyData, algorithm, extractable, keyUsages) {
		const algo = typeof algorithm === 'string' ? { name: algorithm } : algorithm;
		if (format === 'raw' && algo.name === 'PBKDF2') {
			return makeKey({ kind: 'pbkdf2', raw: u8(keyData), extractable, usages: keyUsages });
		}
		if (format === 'raw' && algo.name === 'HKDF') {
			return makeKey({ kind: 'hkdf', raw: u8(keyData), extractable, usages: keyUsages });
		}
		if (format === 'raw' && algo.name === 'AES-GCM') {
			return makeKey({ kind: 'aes', raw: u8(keyData), extractable, usages: keyUsages });
		}
		if (format === 'spki' && algo.name === 'RSA-OAEP') {
			return makeKey({ kind: 'rsa-pub', key: importSpki(keyData), extractable, usages: keyUsages });
		}
		if (format === 'pkcs8' && algo.name === 'RSA-OAEP') {
			return makeKey({ kind: 'rsa-priv', key: importPkcs8(keyData), extractable, usages: keyUsages });
		}
		throw new Error(`importKey unsupported: ${format} ${algo.name}`);
	},

	async exportKey(format, key) {
		const k = getKey(key);
		if (format === 'raw' && k.kind === 'aes') return ab(k.raw);
		if (format === 'spki' && k.kind === 'rsa-pub') return exportSpki(k.key);
		if (format === 'pkcs8' && k.kind === 'rsa-priv') return exportPkcs8(k.key);
		throw new Error(`exportKey unsupported: ${format} ${k.kind}`);
	},

	async generateKey(algorithm, extractable, keyUsages) {
		if (algorithm.name !== 'RSA-OAEP') throw new Error('generateKey: only RSA-OAEP');
		const pair = forge.pki.rsa.generateKeyPair({ bits: algorithm.modulusLength || 2048, e: 0x10001 });
		return {
			publicKey: makeKey({ kind: 'rsa-pub', key: pair.publicKey, extractable, usages: ['encrypt'] }),
			privateKey: makeKey({ kind: 'rsa-priv', key: pair.privateKey, extractable, usages: ['decrypt'] }),
		};
	},

	async deriveBits(algorithm, baseKey, length) {
		const k = getKey(baseKey);
		if (algorithm.name === 'PBKDF2') {
			const pwd = rawToBinary(k.raw);
			const salt = rawToBinary(algorithm.salt);
			return pbkdf2(pwd, salt, algorithm.iterations, length);
		}
		if (algorithm.name === 'HKDF') {
			const ikm = rawToBinary(k.raw);
			const salt = algorithm.salt ? rawToBinary(algorithm.salt) : '';
			const info = rawToBinary(algorithm.info);
			return hkdfSha256(ikm, salt, info, length);
		}
		throw new Error(`deriveBits: ${algorithm.name}`);
	},

	async encrypt(algorithm, key, data) {
		const k = getKey(key);
		if (algorithm.name === 'AES-GCM') {
			return aesGcmEncrypt(k.raw, algorithm.iv, u8(data));
		}
		if (algorithm.name === 'RSA-OAEP') {
			return rsaOaepEncrypt(k.key, u8(data));
		}
		throw new Error(`encrypt: ${algorithm.name}`);
	},

	async decrypt(algorithm, key, data) {
		const k = getKey(key);
		if (algorithm.name === 'AES-GCM') {
			return aesGcmDecrypt(k.raw, algorithm.iv, u8(data));
		}
		if (algorithm.name === 'RSA-OAEP') {
			return rsaOaepDecrypt(k.key, u8(data));
		}
		throw new Error(`decrypt: ${algorithm.name}`);
	},
};

/** PRNG с фиксированным seed — одинаковая RSA-пара на всех устройствах при том же seed. */
function createSeededPrng(seedU8) {
	let pool = rawToBinary(seedU8);
	let pos = pool.length;
	return {
		getBytesSync(n) {
			let out = '';
			while (out.length < n) {
				if (pos >= pool.length) {
					const md = forge.md.sha256.create();
					md.update(pool);
					pool = md.digest().getBytes();
					pos = 0;
				}
				out += pool.charAt(pos++);
			}
			return out.substring(0, n);
		},
	};
}

/**
 * Детерминированная RSA-2048 из seed (мастер-пароль + salt + userId).
 * @returns {{ publicKeySpki: ArrayBuffer, privateKeyPkcs8: ArrayBuffer, publicKeyB64: string }}
 */
function generateDeterministicRsaKeyPair(seedU8, bits = 2048) {
	const prng = createSeededPrng(seedU8);
	const pair = forge.pki.rsa.generateKeyPair({
		bits,
		e: 0x10001,
		prng,
		workerScript: false,
	});
	const spki = exportSpki(pair.publicKey);
	const pkcs8 = exportPkcs8(pair.privateKey);
	const spkiU8 = new Uint8Array(spki);
	let publicKeyB64 = '';
	for (let i = 0; i < spkiU8.length; i++) publicKeyB64 += String.fromCharCode(spkiU8[i]);
	publicKeyB64 = btoa(publicKeyB64);
	return {
		publicKeySpki: ab(spki),
		privateKeyPkcs8: ab(pkcs8),
		publicKeyB64,
	};
}

/** @param {{ force?: boolean }} [options] force=true — всегда subtle forge (RSA из node-forge иначе DataError в native). */
function install(options) {
	const force = options?.force === true;
	if (!force && globalThis.crypto?.subtle) return true;
	const base = globalThis.crypto || {};
	const poly = {
		getRandomValues(arr) {
			const bytes = forge.random.getBytesSync(arr.length);
			for (let i = 0; i < arr.length; i++) arr[i] = bytes.charCodeAt(i);
			return arr;
		},
		subtle,
	};
	if (!base.getRandomValues) {
		base.getRandomValues = (a) => poly.getRandomValues(a);
	}
	Object.defineProperty(base, 'subtle', { value: subtle, configurable: true, enumerable: true });
	globalThis.crypto = base;
	return !!globalThis.crypto.subtle;
}

const keygen = { generateDeterministicRsaKeyPair };
globalThis.SupraForgeKeygen = keygen;

install();
module.exports = { install, subtle, generateDeterministicRsaKeyPair };
