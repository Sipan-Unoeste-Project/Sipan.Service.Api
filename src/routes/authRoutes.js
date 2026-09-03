import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { requireObject } from '../helpers/validationHelpers.js';
import { hashPassword, isHashedPassword, verifyPassword } from '../helpers/passwordHelpers.js';
import { signToken } from '../helpers/tokenHelpers.js';
import { loginExists, toUsuarioDto } from '../helpers/usuarioHelpers.js';

const USUARIO_SELECT = `
  SELECT id, nome, login, email, senha_hash, permissao, status
  FROM usuarios
`;

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function authRouter(pool) {
  const r = Router();

  r.get(
    '/status',
    asyncHandler(async (_req, res) => {
      const [rows] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
      res.json({ configurado: Number(rows[0]?.total) > 0 });
    })
  );

  r.post(
    '/login',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const login = typeof req.body.login === 'string' ? req.body.login.trim() : '';
      const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

      if (!login || !senha) {
        return res.status(400).json({ mensagem: 'Informe login e senha.' });
      }

      const [rows] = await pool.query(`${USUARIO_SELECT} WHERE login = ? LIMIT 1`, [login]);
      const usuario = rows[0];
      if (!usuario || !(await verifyPassword(senha, usuario.senha_hash))) {
        return res.status(401).json({ mensagem: 'Login ou senha inválidos.' });
      }

      if (String(usuario.status).toLowerCase() !== 'ativo') {
        return res.status(403).json({ mensagem: 'Usuário inativo. Procure um administrador.' });
      }

      if (!isHashedPassword(usuario.senha_hash)) {
        const novoHash = await hashPassword(senha);
        await pool.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [
          novoHash,
          usuario.id,
        ]);
      }

      const dto = toUsuarioDto(usuario);
      res.json({
        token: signToken({
          sub: dto.id,
          login: dto.login,
          nome: dto.nome,
          permissao: dto.permissao,
        }),
        usuario: dto,
      });
    })
  );

  r.post(
    '/primeiro-acesso',
    asyncHandler(async (req, res) => {
      const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
      if (Number(countRows[0]?.total) > 0) {
        return res.status(409).json({ mensagem: 'O sistema já possui usuários cadastrados.' });
      }

      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
      const login = typeof req.body.login === 'string' ? req.body.login.trim() : '';
      const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
      const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

      if (!nome || !login || !email || !senha) {
        return res.status(400).json({ mensagem: 'Preencha nome, login, e-mail e senha.' });
      }
      if (senha.length < 8) {
        return res.status(400).json({ mensagem: 'A senha deve ter no mínimo 8 caracteres.' });
      }
      if (await loginExists(pool, login, null)) {
        return res.status(409).json({ mensagem: 'Login já cadastrado.' });
      }

      const senhaHash = await hashPassword(senha);
      const [result] = await pool.query(
        `INSERT INTO usuarios (nome, login, email, senha_hash, permissao, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nome, login, email, senhaHash, 'Administrador', 'Ativo']
      );

      const [created] = await pool.query(
        'SELECT id, nome, login, email, permissao, status FROM usuarios WHERE id = ?',
        [result.insertId]
      );
      const dto = toUsuarioDto(created[0]);
      res.status(201).json({
        token: signToken({
          sub: dto.id,
          login: dto.login,
          nome: dto.nome,
          permissao: dto.permissao,
        }),
        usuario: dto,
      });
    })
  );

  r.get(
    '/me',
    asyncHandler(async (req, res) => {
      const id = req.usuario?.id;
      if (!id) return res.status(401).json({ mensagem: 'É necessário entrar no sistema.' });

      const [rows] = await pool.query(
        'SELECT id, nome, login, email, permissao, status FROM usuarios WHERE id = ?',
        [id]
      );
      if (!rows.length) {
        return res.status(401).json({ mensagem: 'Sessão inválida.' });
      }
      if (String(rows[0].status).toLowerCase() !== 'ativo') {
        return res.status(403).json({ mensagem: 'Usuário inativo. Procure um administrador.' });
      }
      res.json(toUsuarioDto(rows[0]));
    })
  );

  r.post('/logout', (_req, res) => {
    res.status(204).end();
  });

  return r;
}
