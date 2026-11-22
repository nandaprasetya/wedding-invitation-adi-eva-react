// ponytail: Cloudflare Access JWT verified with native Web Crypto API instead of external auth frameworks.

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;
let jwksCache = { keys: [], fetchedAt: 0, teamDomain: '' };

function base64UrlToUint8Array(input) {
  const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtPart(part) {
  const bytes = base64UrlToUint8Array(part);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function fetchJwksKeys(teamDomain, forceRefresh = false) {
  const cleanDomain = String(teamDomain || '').replace(/\/+$/, '');
  const now = Date.now();
  if (
    !forceRefresh &&
    jwksCache.teamDomain === cleanDomain &&
    jwksCache.keys.length > 0 &&
    now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS
  ) {
    return jwksCache.keys;
  }

  const res = await fetch(`${cleanDomain}/cdn-cgi/access/certs`);
  if (!res.ok) {
    throw new Error(`Failed to load Cloudflare Access certs (${res.status})`);
  }
  const data = await res.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  jwksCache = { keys, fetchedAt: now, teamDomain: cleanDomain };
  return keys;
}

export async function verifyAccessJwt(token, { teamDomain, aud }) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Access JWT');
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeJwtPart(headerB64);
  const payload = decodeJwtPart(payloadB64);

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported JWT algorithm');
  }

  const cleanDomain = String(teamDomain || '').replace(/\/+$/, '');
  if (!cleanDomain || !aud) {
    throw new Error('Cloudflare Access environment is not configured');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Access token expired');
  }
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec + 30) {
    throw new Error('Access token not yet valid');
  }

  const issuer = String(payload.iss || '').replace(/\/+$/, '');
  if (issuer !== cleanDomain) {
    throw new Error('Invalid Access token issuer');
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(aud)) {
    throw new Error('Invalid Access token audience');
  }

  let keys = await fetchJwksKeys(cleanDomain);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await fetchJwksKeys(cleanDomain, true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error('Signing key not found');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(sigB64);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signingInput);
  if (!valid) {
    throw new Error('Invalid Access token signature');
  }

  return payload;
}

export async function requireAdmin(c, next) {
  const url = new URL(c.req.url);
  const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  if (c.env?.DEV_BYPASS_ACCESS === 'true' && isLocalHost) {
    c.set('adminEmail', c.env.DEV_ADMIN_EMAIL || 'admin@anselmoments.com');
    await next();
    return;
  }

  const token = c.req.header('Cf-Access-Jwt-Assertion');
  if (!token) {
    return c.json({ error: 'Unauthorized: Missing Cloudflare Access token' }, 401);
  }

  try {
    const payload = await verifyAccessJwt(token, {
      teamDomain: c.env?.CF_ACCESS_TEAM_DOMAIN,
      aud: c.env?.CF_ACCESS_AUD,
    });
    c.set('adminEmail', payload.email || payload.sub || 'admin');
    await next();
  } catch (err) {
    return c.json({ error: `Unauthorized: ${err.message}` }, 401);
  }
}
