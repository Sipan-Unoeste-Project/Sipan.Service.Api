import { fail, ok, requireObject } from './validationHelpers.js';
import { isPermissaoValida, normalizarPermissao } from './permissoesHelpers.js';

/** @param {import('mysql2').RowDataPacket} row */
export function toUsuarioDto(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    login: row.login,
    email: row.email,
    permissao: normalizarPermissao(row.permissao),
    status: row.status,
  };
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} login
 * @param {number | null} ignoreId
 */
export async function loginExists(pool, login, ignoreId) {
  const sql = `
    SELECT id FROM usuarios
    WHERE login = ?
    ${ignoreId != null ? 'AND id != ?' : ''}
    LIMIT 1
  `;
  const params = ignoreId != null ? [login, ignoreId] : [login];
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

/** Lê a senha em texto (campo `senha` ou legado `senhaHash`). */
export function readSenhaPlain(body) {
  const record = /** @type {Record<string, unknown>} */ (body);
  if (typeof record.senha === 'string' && record.senha) return record.senha;
  if (typeof record.senhaHash === 'string' && record.senhaHash) return record.senhaHash;
  if (typeof record.senha_hash === 'string' && record.senha_hash) return record.senha_hash;
  return undefined;
}

/** @deprecated use readSenhaPlain */
export function readSenhaHash(body) {
  return readSenhaPlain(body);
}

/**
 * @param {unknown} body
 * @param {{ requireSenha?: boolean }} [options]
 */
export function validateUsuario(body, options = {}) {
  const { requireSenha = false } = options;
  const invalid = requireObject(body);
  if (invalid) return invalid;

  const { nome, login, email, permissao, status } =
    /** @type {Record<string, unknown>} */ (body);

  if (typeof nome !== 'string' || !nome.trim()) {
    return fail('Campo nome é obrigatório.');
  }
  if (nome.trim().length > 150) {
    return fail('Campo nome excede 150 caracteres.');
  }
  if (typeof login !== 'string' || !login.trim()) {
    return fail('Campo login é obrigatório.');
  }
  if (login.trim().length > 80) {
    return fail('Campo login excede 80 caracteres.');
  }
  if (typeof email !== 'string' || !email.trim()) {
    return fail('Campo email é obrigatório.');
  }
  if (email.trim().length > 150) {
    return fail('Campo email excede 150 caracteres.');
  }

  const senha = readSenhaPlain(body);
  if (requireSenha && !senha) {
    return fail('Campo senha é obrigatório.');
  }
  if (senha && senha.length > 128) {
    return fail('Campo senha excede 128 caracteres.');
  }

  if (typeof permissao !== 'string' || !permissao.trim()) {
    return fail('Campo permissao é obrigatório.');
  }
  if (!isPermissaoValida(permissao.trim())) {
    return fail(
      'Permissão inválida. Use: Administrador, Financeiro, Veterinário ou Voluntário.'
    );
  }
  if (status != null && typeof status === 'string' && status.trim().length > 50) {
    return fail('Campo status excede 50 caracteres.');
  }

  return ok({
    senha,
    permissao: normalizarPermissao(permissao.trim()),
  });
}
