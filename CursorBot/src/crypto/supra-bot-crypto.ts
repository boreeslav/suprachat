/**
 * E2EE для CursorBot — порт схемы `wwwroot/messenger/supra-crypto.js` на Node.
 *
 * Совместимость с веб-клиентом критична: те же параметры PBKDF2/AES-GCM/RSA-OAEP
 * и тот же детерминированный вывод RSA-пары через node-forge с seeded PRNG.
 *
 * Нативный WebCrypto (`globalThis.crypto.subtle`, Node 20+) используется для
 * PBKDF2 / AES-GCM / RSA-OAEP. node-forge — только для детерминированной генерации
 * RSA-пары (нативный generateKey недетерминирован) и экспорта SPKI/PKCS8.
 */
import forge from "node-forge";

const PREFIX = "E1:";
const VERIFY_PLAIN = "SUPRA-MASTER-VERIFY-v1";
const RSA_KEYPAIR_SEED = "supra-rsa-keypair-v1";
const PBKDF2_ITERATIONS = 310000;
const GROUP_AUTO_ITERATIONS = 120000;

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("WebCrypto subtle недоступен (нужен Node 20+)");
  return s;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Приводит Uint8Array к BufferSource (обход строгой типизации lib.dom для WebCrypto). */
function bs(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function ub64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  globalThis.crypto.getRandomValues(out);
  return out;
}

function rawToBinary(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

async function derivePbkdf2Bits(
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
  bitLength: number,
): Promise<Uint8Array> {
  const baseKey = await subtle().importKey(
    "raw",
    bs(enc.encode(password)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", salt: bs(saltBytes), iterations, hash: "SHA-256" },
    baseKey,
    bitLength,
  );
  return new Uint8Array(bits);
}

async function deriveMasterKey(
  password: string,
  salt: Uint8Array,
  userId: string,
): Promise<CryptoKey> {
  const bits = await derivePbkdf2Bits(
    password,
    concat(salt, enc.encode(userId)),
    PBKDF2_ITERATIONS,
    256,
  );
  return subtle().importKey("raw", bs(bits), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function makeVerifier(masterKey: CryptoKey): Promise<string> {
  const iv = new Uint8Array(12);
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: bs(iv) },
    masterKey,
    bs(enc.encode(VERIFY_PLAIN)),
  );
  return b64(concat(iv, new Uint8Array(ct)));
}

/** PRNG с фиксированным seed — повторяемая RSA-пара (как createSeededPrng в forge-бандле). */
function createSeededPrng(seed: Uint8Array) {
  let pool = rawToBinary(seed);
  let pos = pool.length;
  return {
    getBytesSync(n: number): string {
      let out = "";
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

function exportSpki(publicKey: forge.pki.rsa.PublicKey): Uint8Array {
  const der = forge.asn1.toDer(forge.pki.publicKeyToAsn1(publicKey)).getBytes();
  return new Uint8Array(Buffer.from(der, "binary"));
}

function exportPkcs8(privateKey: forge.pki.rsa.PrivateKey): Uint8Array {
  const asn1 = forge.pki.privateKeyToAsn1(privateKey);
  const der = forge.asn1.toDer(forge.pki.wrapRsaPrivateKey(asn1)).getBytes();
  return new Uint8Array(Buffer.from(der, "binary"));
}

async function deriveRsaSeedBytes(
  password: string,
  salt: Uint8Array,
  userId: string,
): Promise<Uint8Array> {
  return derivePbkdf2Bits(
    password,
    concat(salt, enc.encode(RSA_KEYPAIR_SEED), enc.encode(String(userId))),
    PBKDF2_ITERATIONS,
    512,
  );
}

interface IdentityKeyPair {
  privateKey: CryptoKey;
  publicKeyB64: string;
  privateKeyPkcs8: Uint8Array;
}

async function generateIdentityKeyPair(
  password: string,
  salt: Uint8Array,
  userId: string,
): Promise<IdentityKeyPair> {
  const seed = await deriveRsaSeedBytes(password, salt, userId);
  const prng = createSeededPrng(seed);
  // prng/workerScript не описаны в типах @types/node-forge — приводим к any.
  const keygenOptions = { bits: 2048, e: 0x10001, prng, workerScript: false };
  const pair = forge.pki.rsa.generateKeyPair(keygenOptions as never);
  const publicKeyB64 = b64(exportSpki(pair.publicKey));
  const privateKeyPkcs8 = exportPkcs8(pair.privateKey);
  const privateKey = await subtle().importKey(
    "pkcs8",
    bs(privateKeyPkcs8),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
  return { privateKey, publicKeyB64, privateKeyPkcs8 };
}

async function savePrivateKeyBlob(
  pkcs8: Uint8Array,
  masterKey: CryptoKey,
): Promise<string> {
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: bs(iv) }, masterKey, bs(pkcs8));
  return b64(concat(iv, new Uint8Array(ct)));
}

export interface EncryptionSetupPayload {
  salt: string;
  verifier: string;
  publicKey: string;
  privateKeyBlob: string;
}

export function isEncrypted(text: string | null | undefined): boolean {
  return typeof text === "string" && text.startsWith(PREFIX);
}

/**
 * Криптосессия бота: держит мастер-ключ и приватный RSA-ключ в памяти.
 * Воспроизводится детерминированно из мастер-пароля + salt + userId.
 */
export class SupraBotCrypto {
  #masterKey: CryptoKey | null = null;
  #privateKey: CryptoKey | null = null;
  #userId: string | null = null;
  #saltB64: string | null = null;
  #publicKeyB64: string | null = null;

  get isUnlocked(): boolean {
    return this.#masterKey != null && this.#privateKey != null;
  }

  get publicKeyB64(): string | null {
    return this.#publicKeyB64;
  }

  get saltB64(): string | null {
    return this.#saltB64;
  }

  /** Первичная настройка: новый случайный salt, вывод ключей, payload для публикации. */
  async setup(masterPassword: string, userId: string): Promise<EncryptionSetupPayload> {
    const salt = randomBytes(16);
    const masterKey = await deriveMasterKey(masterPassword, salt, userId);
    const verifier = await makeVerifier(masterKey);
    const identity = await generateIdentityKeyPair(masterPassword, salt, userId);
    const privateKeyBlob = await savePrivateKeyBlob(identity.privateKeyPkcs8, masterKey);

    this.#masterKey = masterKey;
    this.#privateKey = identity.privateKey;
    this.#userId = userId;
    this.#saltB64 = b64(salt);
    this.#publicKeyB64 = identity.publicKeyB64;

    return {
      salt: this.#saltB64,
      verifier,
      publicKey: identity.publicKeyB64,
      privateKeyBlob,
    };
  }

  /** Восстановление сессии из сохранённого salt (детерминированно из пароля). */
  async unlock(masterPassword: string, userId: string, saltB64: string): Promise<void> {
    const salt = ub64(saltB64);
    const masterKey = await deriveMasterKey(masterPassword, salt, userId);
    const identity = await generateIdentityKeyPair(masterPassword, salt, userId);
    this.#masterKey = masterKey;
    this.#privateKey = identity.privateKey;
    this.#userId = userId;
    this.#saltB64 = saltB64;
    this.#publicKeyB64 = identity.publicKeyB64;
  }

  clear(): void {
    this.#masterKey = null;
    this.#privateKey = null;
    this.#userId = null;
    this.#saltB64 = null;
    this.#publicKeyB64 = null;
  }

  /** Расшифровка обёрнутого RSA-OAEP автопароля чата своим приватным ключом. */
  async unwrapAutoPassword(wrappedB64: string): Promise<string> {
    if (!this.#privateKey) throw new Error("Криптосессия бота не разблокирована");
    const plain = await subtle().decrypt(
      { name: "RSA-OAEP" },
      this.#privateKey,
      bs(ub64(wrappedB64)),
    );
    return dec.decode(plain);
  }

  /** AES-GCM ключ чата из автопароля (как #deriveGroupAutoKey в supra-crypto.js). */
  async deriveChatKey(autoPassword: string, chatId: string): Promise<CryptoKey> {
    const bits = await derivePbkdf2Bits(
      autoPassword,
      enc.encode(`group-auto|${chatId}`),
      GROUP_AUTO_ITERATIONS,
      256,
    );
    return subtle().importKey("raw", bs(bits), { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  }

  async encryptText(plaintext: string, chatKey: CryptoKey): Promise<string> {
    const iv = randomBytes(12);
    const ct = await subtle().encrypt(
      { name: "AES-GCM", iv: bs(iv) },
      chatKey,
      bs(enc.encode(String(plaintext))),
    );
    const payload = { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
    return PREFIX + btoa(JSON.stringify(payload));
  }

  async decryptText(ciphertext: string, chatKey: CryptoKey): Promise<string> {
    if (!isEncrypted(ciphertext)) return ciphertext;
    const payload = JSON.parse(atob(ciphertext.slice(PREFIX.length)));
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: bs(ub64(payload.iv)) },
      chatKey,
      bs(ub64(payload.ct)),
    );
    return dec.decode(plain);
  }
}
