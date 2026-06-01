export const ERRO_CORPO_INVALIDO = 'Corpo JSON inválido.';

/** @param {unknown} body */
export function requireObject(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: ERRO_CORPO_INVALIDO };
  }
  return null;
}

/** @param {string} error */
export function fail(error) {
  return { ok: false, error };
}

/** @param {Record<string, unknown>} [extra] */
export function ok(extra = {}) {
  return { ok: true, ...extra };
}
