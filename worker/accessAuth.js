// Multi-admin authentication using native Web Crypto API (PBKDF2-SHA256 + HMAC-SHA256 HttpOnly cookie).

export const SESSION_COOKIE_NAME = 'ansel_admin_session';
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days
export const PBKDF2_ITERATIONS = 100_000; // Cloudflare Workers Web Crypto max supported iterations
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const LOCAL_DEV_FALLBACK_SECRET = 'ansel-local-dev-session-secret-change-in-prod';

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toBase64Url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64UrlToBytes(input) {
  const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function timingSafeEqualStrings(a, b) {
  const enc = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a ?? ''))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b ?? ''))),
  ]);
  return timingSafeEqual(new Uint8Array(hashA), new Uint8Array(hashB));
}

export function isValidAdminEmail(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;
}

export function validateAdminPassword(rawPassword) {
  const password = String(rawPassword || '');
  if (password.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.' };
  }
  if (password.length > 128) {
    return { ok: false, error: 'Password maksimal 128 karakter.' };
  }
  return { ok: true, password };
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(derived))}`;
}

export async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
    return false;
  }
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > PBKDF2_ITERATIONS) {
    return false;
  }
  const salt = hexToBytes(parts[2]);
  const expected = hexToBytes(parts[3]);
  if (!salt || !expected || salt.length < 8 || expected.length !== 32) {
    return false;
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(password || '')),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return timingSafeEqual(new Uint8Array(derived), expected);
}

async function importHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

export async function signSessionToken(claims, secret, ttlSec = SESSION_MAX_AGE_SEC) {
  if (!secret || String(secret).length < 16) {
    throw new Error('Session secret minimal 16 karakter.');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    role: claims.role || 'admin',
    tv: Number(claims.tv) || 1,
    iat: nowSec,
    exp: nowSec + ttlSec,
  };
  const signingInput = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const key = await importHmacKey(secret, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed session token');
  }
  if (!secret || String(secret).length < 16) {
    throw new Error('Session secret not configured');
  }

  const [headerB64, payloadB64, sigB64] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(new TextDecoder().decode(fromBase64UrlToBytes(headerB64)));
    payload = JSON.parse(new TextDecoder().decode(fromBase64UrlToBytes(payloadB64)));
  } catch {
    throw new Error('Invalid session encoding');
  }

  if (header?.alg !== 'HS256') {
    throw new Error('Unsupported session algorithm');
  }

  const key = await importHmacKey(secret, ['verify']);
  const sigBytes = fromBase64UrlToBytes(sigB64);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!valid) {
    throw new Error('Invalid session signature');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload?.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Session expired');
  }
  if (!payload?.sub) {
    throw new Error('Missing session subject');
  }
  return payload;
}

export function parseCookies(cookieHeader) {
  const result = {};
  const raw = String(cookieHeader || '');
  if (!raw) return result;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export function buildSessionCookie(token, { isSecure = true, maxAge = SESSION_MAX_AGE_SEC } = {}) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    isSecure ? '; Secure' : ''
  }`;
}

export function buildClearSessionCookie({ isSecure = true } = {}) {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
    isSecure ? '; Secure' : ''
  }`;
}

export function isLocalRequestUrl(requestUrl) {
  try {
    const url = new URL(requestUrl);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function resolveSessionSecret(env, requestUrl) {
  const configured = String(env?.ADMIN_SESSION_SECRET || '').trim();
  if (configured.length >= 16) {
    return configured;
  }
  if (isLocalRequestUrl(requestUrl) && env?.DEV_BYPASS_ACCESS === 'true') {
    return LOCAL_DEV_FALLBACK_SECRET;
  }
  return '';
}

export async function getAuthenticatedAdmin(c) {
  const secret = resolveSessionSecret(c.env, c.req.url);
  if (!secret) return null;

  const cookies = parseCookies(c.req.header('cookie'));
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  let payload;
  try {
    payload = await verifySessionToken(token, secret);
  } catch {
    return null;
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role, token_version, is_active FROM admin_users WHERE id = ?'
  )
    .bind(payload.sub)
    .first();

  if (!user || Number(user.is_active) !== 1) {
    return null;
  }
  if (Number(user.token_version) !== Number(payload.tv)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'admin',
  };
}

export async function requireAdmin(c, next) {
  const admin = await getAuthenticatedAdmin(c);
  if (!admin) {
    return c.json(
      { error: 'Sesi login tidak valid atau telah berakhir. Silakan masuk kembali.' },
      401
    );
  }
  c.set('adminUser', admin);
  c.set('adminEmail', admin.email);
  await next();
}
