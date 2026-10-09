import { randomBytes } from 'node:crypto';
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

const SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const RESET_TTL_MS = 60 * 60 * 1000;

function validarSenhaNova(senha) {
  if (typeof senha !== 'string' || !senha) {
    return 'Informe a nova senha.';
  }
  if (!SENHA_FORTE.test(senha)) {
    return 'A senha precisa ter 8 caracteres, com maiúscula, minúscula, número e especial (@$!%*?&).';
  }
  return null;
}

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

  /** Confirma login + e-mail e gera token de recuperação (sem SMTP nesta entrega). */
  r.post(
    '/esqueci-senha',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const login = typeof req.body.login === 'string' ? req.body.login.trim() : '';
      const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';

      if (!login || !email) {
        return res.status(400).json({ mensagem: 'Informe login e e-mail cadastrados.' });
      }

      const [rows] = await pool.query(
        `${USUARIO_SELECT} WHERE login = ? AND LOWER(email) = LOWER(?) LIMIT 1`,
        [login, email]
      );
      const usuario = rows[0];
      if (!usuario) {
        return res.status(404).json({
          mensagem: 'Login ou e-mail não conferem com nenhum usuário ativo.',
        });
      }
      if (String(usuario.status).toLowerCase() !== 'ativo') {
        return res.status(403).json({ mensagem: 'Usuário inativo. Procure um administrador.' });
      }

      const token = randomBytes(24).toString('hex');
      const expira = new Date(Date.now() + RESET_TTL_MS);
      await pool.query(
        'UPDATE usuarios SET reset_token = ?, reset_expira = ? WHERE id = ?',
        [token, expira, usuario.id]
      );

      res.json({
        mensagem: 'Identidade confirmada. Defina a nova senha.',
        token,
        expiraEmMinutos: Math.round(RESET_TTL_MS / 60000),
      });
    })
  );

  /** Redefine senha com o token gerado em /esqueci-senha. */
  r.post(
    '/redefinir-senha',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
      const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
      const erroSenha = validarSenhaNova(senha);
      if (!token) {
        return res.status(400).json({ mensagem: 'Token de recuperação inválido.' });
      }
      if (erroSenha) return res.status(400).json({ mensagem: erroSenha });

      const [rows] = await pool.query(
        `SELECT id, reset_token, reset_expira, status
         FROM usuarios
         WHERE reset_token = ?
         LIMIT 1`,
        [token]
      );
      const usuario = rows[0];
      if (!usuario) {
        return res.status(400).json({ mensagem: 'Token inválido ou já utilizado.' });
      }
      if (!usuario.reset_expira || new Date(usuario.reset_expira).getTime() < Date.now()) {
        return res.status(400).json({ mensagem: 'Token expirado. Solicite a recuperação novamente.' });
      }
      if (String(usuario.status).toLowerCase() !== 'ativo') {
        return res.status(403).json({ mensagem: 'Usuário inativo. Procure um administrador.' });
      }

      const senhaHash = await hashPassword(senha);
      await pool.query(
        `UPDATE usuarios
         SET senha_hash = ?, reset_token = NULL, reset_expira = NULL
         WHERE id = ?`,
        [senhaHash, usuario.id]
      );

      res.json({ mensagem: 'Senha redefinida com sucesso. Você já pode entrar.' });
    })
  );

  /** Troca de senha com o usuário autenticado. */
  r.post(
    '/trocar-senha',
    asyncHandler(async (req, res) => {
      const id = req.usuario?.id;
      if (!id) return res.status(401).json({ mensagem: 'É necessário entrar no sistema.' });

      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const senhaAtual = typeof req.body.senhaAtual === 'string' ? req.body.senhaAtual : '';
      const senhaNova = typeof req.body.senhaNova === 'string' ? req.body.senhaNova : '';

      if (!senhaAtual) {
        return res.status(400).json({ mensagem: 'Informe a senha atual.' });
      }
      const erroSenha = validarSenhaNova(senhaNova);
      if (erroSenha) return res.status(400).json({ mensagem: erroSenha });
      if (senhaAtual === senhaNova) {
        return res.status(400).json({ mensagem: 'A nova senha deve ser diferente da atual.' });
      }

      const [rows] = await pool.query(`${USUARIO_SELECT} WHERE id = ? LIMIT 1`, [id]);
      const usuario = rows[0];
      if (!usuario) {
        return res.status(401).json({ mensagem: 'Sessão inválida.' });
      }
      if (!(await verifyPassword(senhaAtual, usuario.senha_hash))) {
        return res.status(401).json({ mensagem: 'Senha atual incorreta.' });
      }

      const senhaHash = await hashPassword(senhaNova);
      await pool.query(
        `UPDATE usuarios
         SET senha_hash = ?, reset_token = NULL, reset_expira = NULL
         WHERE id = ?`,
        [senhaHash, id]
      );

      res.json({ mensagem: 'Senha alterada com sucesso.' });
    })
  );

  r.post('/logout', (_req, res) => {
    res.status(204).end();
  });

  return r;
}
