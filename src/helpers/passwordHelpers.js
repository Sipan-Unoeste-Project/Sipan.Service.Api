import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PREFIX = 'scrypt$';

/** @param {string} senha */
export async function hashPassword(senha) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(senha, salt, 64);
  return `${PREFIX}${salt}$${derived.toString('hex')}`;
}

/** @param {string} stored */
export function isHashedPassword(stored) {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

/**
 * Aceita hash scrypt e senhas legadas em texto (cadastros antigos).
 * @param {string} senha
 * @param {string} stored
 */
export async function verifyPassword(senha, stored) {
  if (!senha || !stored) return false;

  if (isHashedPassword(stored)) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const derived = /** @type {Buffer} */ (await scryptAsync(senha, salt, 64));
    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  }

  const a = Buffer.from(stored);
  const b = Buffer.from(senha);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
