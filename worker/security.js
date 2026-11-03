import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';

function masterKey() {
  const raw = process.env.SECRETS_KEY || '';
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('SECRETS_KEY must be 32 random bytes, base64-encoded');
  return key;
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext>, all base64url. */
export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decryptSecret(payload) {
  const [version, iv, tag, data] = String(payload).split('.');
  if (version !== 'v1') throw new Error('Unknown secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Purpose-scoped, so a key derived for one job can never validate another.
const derive = (purpose) => crypto.createHmac('sha256', masterKey()).update(`synerax:${purpose}`).digest();
const mac = (purpose, value) => crypto.createHmac('sha256', derive(purpose)).update(value).digest('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Signed token for tracking links. kind: r = campaign recipient, a = automation run. */
export function signToken(kind, id) {
  const body = `${kind}.${id}`;
  return `${body}.${mac('tracking', body).slice(0, 22)}`;
}

export function verifyToken(token) {
  const [kind, id, sig] = String(token).split('.');
  if (!kind || !id || !sig || !['r', 'a'].includes(kind)) return null;
  return safeEqual(sig, mac('tracking', `${kind}.${id}`).slice(0, 22)) ? { kind, id } : null;
}

/** Signing the destination is what stops the click endpoint being an open redirect. */
export const signClick = (token, url) => mac('click', `${token}|${url}`).slice(0, 22);
export const verifyClick = (token, url, sig) => safeEqual(sig, signClick(token, url));

export const inboundSecret = (orgId) => mac('inbound', orgId);

/** Stripe-style timestamped signature; rejects replays older than five minutes. */
export function signWebhook(secret, rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

export function verifyWebhook(secret, rawBody, header, now = Math.floor(Date.now() / 1000)) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')));
  const timestamp = Number(parts.t);
  if (!timestamp || !parts.v1 || Math.abs(now - timestamp) > 300) return false;
  return safeEqual(signWebhook(secret, rawBody, timestamp), `t=${timestamp},v1=${parts.v1}`);
}

export const generatePassword = () => `${crypto.randomBytes(15).toString('base64url')}-A1`;
export const generateApiKey = () => `syn_${crypto.randomBytes(32).toString('base64url')}`;

export function generateDkimKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey: publicKey.toString('base64'), privateKey };
}

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb');
}

/**
 * Tenants supply SMTP, IMAP and webhook hosts. Without this check any of them could
 * make the worker probe its own network or a cloud metadata endpoint.
 */
export async function assertPublicHost(host) {
  if (!host) throw new Error('Host is required');
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Error(`Could not resolve ${host}`);
  if (addresses.some((a) => isPrivateIp(a.address))) throw new Error('Internal network addresses are not allowed');
}

const buckets = new Map();
/** In-memory sliding window, per worker instance. Returns false once over the limit. */
export function rateLimit(key, limit, windowMs, now = Date.now()) {
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) { buckets.set(key, hits); return false; }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 50000) buckets.clear();
  return true;
}
