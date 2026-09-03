import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_SEC = 8 * 60 * 60;

function getSecret() {
  return process.env.JWT_SECRET || 'sipan-dev-secret-altere-em-producao';
}

function toBase64Url(value) {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buf.toString('base64url');
}

function sign(input, secret) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

/**
 * @param {Record<string, unknown>} payload
 * @param {number} [ttlSec]
 */
export function signToken(payload, ttlSec = DEFAULT_TTL_SEC) {
  const secret = getSecret();
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = toBase64Url(
    JSON.stringify({ ...payload, iat: now, exp: now + ttlSec })
  );
  const data = `${header}.${body}`;
  return `${data}.${sign(data, secret)}`;
}

/** @param {string} token */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const data = `${header}.${body}`;
  const expected = Buffer.from(sign(data, getSecret()));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** @param {import('express').Request} req */
export function readBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return '';
  return token.trim();
}
