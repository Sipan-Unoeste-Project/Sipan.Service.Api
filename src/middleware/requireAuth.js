import { readBearerToken, verifyToken } from '../helpers/tokenHelpers.js';
import { normalizarPermissao } from '../helpers/permissoesHelpers.js';

/** @param {import('express').Request} req */
export function isRotaPublica(req) {
  if (req.method === 'OPTIONS') return true;

  const { method, path } = req;

  if (method === 'POST' && path === '/api/auth/login') return true;
  if (method === 'GET' && path === '/api/auth/status') return true;
  if (method === 'POST' && path === '/api/auth/primeiro-acesso') return true;
  if (method === 'POST' && path === '/api/auth/esqueci-senha') return true;
  if (method === 'POST' && path === '/api/auth/redefinir-senha') return true;

  if (method === 'GET' && (path === '/api/animais' || path.startsWith('/api/animais/'))) {
    return true;
  }
  if (method === 'GET' && (path === '/api/campanhas' || path.startsWith('/api/campanhas/'))) {
    return true;
  }
  if (method === 'POST' && path === '/api/adocoes') return true;
  if (method === 'POST' && path === '/api/doacoes') return true;

  return false;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function requireAuth(pool) {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return async function requireAuthMiddleware(req, res, next) {
    if (isRotaPublica(req)) return next();

    const payload = verifyToken(readBearerToken(req));
    if (!payload?.sub) {
      return res.status(401).json({ mensagem: 'É necessário entrar no sistema.' });
    }

    try {
      const [rows] = await pool.query(
        'SELECT id, login, nome, permissao, status FROM usuarios WHERE id = ? LIMIT 1',
        [Number(payload.sub)]
      );
      const row = rows[0];
      if (!row) {
        return res.status(401).json({ mensagem: 'É necessário entrar no sistema.' });
      }
      if (String(row.status).toLowerCase() !== 'ativo') {
        return res.status(403).json({ mensagem: 'Usuário inativo. Procure um administrador.' });
      }

      req.usuario = {
        id: Number(row.id),
        login: row.login,
        nome: row.nome,
        permissao: normalizarPermissao(row.permissao),
      };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
