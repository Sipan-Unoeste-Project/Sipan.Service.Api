import {
  podeAcessarRecurso,
  recursoDaRotaApi,
} from '../helpers/permissoesHelpers.js';

/**
 * Bloqueia rotas da API conforme a matriz de acesso.
 * Rotas públicas (sem req.usuario) e /api/auth passam direto.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requirePermissao(req, res, next) {
  if (!req.usuario) return next();

  const recurso = recursoDaRotaApi(req.path);
  if (!recurso) return next();

  if (!podeAcessarRecurso(req.usuario.permissao, recurso)) {
    return res.status(403).json({
      mensagem: 'Você não tem permissão para acessar este recurso.',
    });
  }

  return next();
}
