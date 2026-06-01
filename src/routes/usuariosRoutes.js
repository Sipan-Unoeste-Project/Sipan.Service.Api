import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  toUsuarioDto,
  loginExists,
  readSenhaHash,
  validateUsuario,
} from '../helpers/usuarioHelpers.js';
import {
  existsById,
  parseRouteId,
  queryBusca,
  queryString,
  statusOrDefault,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const TABLE = 'usuarios';
const USUARIO_SELECT = `
  SELECT id, nome, login, email, permissao, status
  FROM usuarios
`;
const MSG_NAO_ENCONTRADO = 'Usuário não encontrado.';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function usuariosRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const busca = queryBusca(req, ['nome']);
      const status = queryString(req, 'status');

      let sql = `${USUARIO_SELECT} WHERE 1=1`;
      const params = [];

      if (busca?.trim()) {
        const term = `%${busca.trim().toLowerCase()}%`;
        sql += ` AND (
        LOWER(nome) LIKE ? OR
        LOWER(login) LIKE ? OR
        LOWER(email) LIKE ?
      )`;
        params.push(term, term, term);
      }

      if (status?.trim()) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY nome ASC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toUsuarioDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${USUARIO_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toUsuarioDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validateUsuario(req.body, { requireSenha: true });
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const { nome, login, email, permissao, status } = req.body;
      const loginVal = login.trim();
      const senhaHash = v.senhaHash;

      if (!senhaHash) {
        return res.status(400).json({ mensagem: 'Campo senhaHash é obrigatório.' });
      }

      if (await loginExists(pool, loginVal, null)) {
        return res.status(409).json({ mensagem: 'Login já cadastrado.' });
      }

      const [result] = await pool.query(
        `INSERT INTO usuarios (nome, login, email, senha_hash, permissao, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
        [
          nome.trim(),
          loginVal,
          email.trim(),
          senhaHash,
          trimOrNull(permissao),
          statusOrDefault(status, 'Ativo'),
        ]
      );

      const [created] = await pool.query(`${USUARIO_SELECT} WHERE id = ?`, [
        result.insertId,
      ]);

      const dto = toUsuarioDto(created[0]);
      res.status(201).location(`/api/usuarios/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const v = validateUsuario(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      if (!(await existsById(pool, TABLE, id))) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const { nome, login, email, permissao, status } = req.body;
      const loginVal = login.trim();
      const senhaHash = readSenhaHash(req.body);

      if (await loginExists(pool, loginVal, id)) {
        return res.status(409).json({ mensagem: 'Login já cadastrado.' });
      }

      const permissaoVal = trimOrNull(permissao);
      const statusVal = statusOrDefault(status, 'Ativo');

      if (senhaHash) {
        await pool.query(
          `UPDATE usuarios
         SET nome = ?, login = ?, email = ?, senha_hash = ?, permissao = ?, status = ?
         WHERE id = ?`,
          [nome.trim(), loginVal, email.trim(), senhaHash, permissaoVal, statusVal, id]
        );
      } else {
        await pool.query(
          `UPDATE usuarios
         SET nome = ?, login = ?, email = ?, permissao = ?, status = ?
         WHERE id = ?`,
          [nome.trim(), loginVal, email.trim(), permissaoVal, statusVal, id]
        );
      }

      const [rows] = await pool.query(`${USUARIO_SELECT} WHERE id = ?`, [id]);
      res.json(toUsuarioDto(rows[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
