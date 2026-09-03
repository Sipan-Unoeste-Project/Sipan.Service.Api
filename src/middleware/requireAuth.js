import { readBearerToken, verifyToken } from '../helpers/tokenHelpers.js';

/** @param {import('express').Request} req */
export function isRotaPublica(req) {
  if (req.method === 'OPTIONS') return true;

  const { method, path } = req;

  if (method === 'POST' && path === '/api/auth/login') return true;
  if (method === 'GET' && path === '/api/auth/status') return true;
  if (method === 'POST' && path === '/api/auth/primeiro-acesso') return true;

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
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  if (isRotaPublica(req)) return next();

  const payload = verifyToken(readBearerToken(req));
  if (!payload?.sub) {
    return res.status(401).json({ mensagem: 'É necessário entrar no sistema.' });
  }

  req.usuario = {
    id: Number(payload.sub),
    login: payload.login,
    nome: payload.nome,
    permissao: payload.permissao,
  };
  next();
}
