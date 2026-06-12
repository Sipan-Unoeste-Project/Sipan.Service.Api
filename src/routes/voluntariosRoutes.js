import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { normalizeCpf } from '../helpers/cpfHelpers.js';
import {
  toVoluntarioDto,
  cpfVoluntarioExists,
  validateVoluntario,
} from '../helpers/voluntarioHelpers.js';
import {
  existsById,
  parseRouteId,
  queryBusca,
  queryString,
  statusOrDefault,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const TABLE = 'voluntarios';
const VOLUNTARIO_SELECT = `
  SELECT id, nome, cpf, cargo, telefone, status
  FROM voluntarios
`;
const MSG_NAO_ENCONTRADO = 'Voluntário não encontrado.';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function voluntariosRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const busca = queryBusca(req, ['nome']);
      const status = queryString(req, 'status');

      let sql = `${VOLUNTARIO_SELECT} WHERE 1=1`;
      const params = [];

      if (busca?.trim()) {
        const term = `%${busca.trim().toLowerCase()}%`;
        sql += ` AND (
        LOWER(nome) LIKE ? OR
        cpf LIKE ? OR
        LOWER(cargo) LIKE ? OR
        telefone LIKE ?
      )`;
        params.push(term, `%${busca.trim()}%`, term, `%${busca.trim()}%`);
      }

      if (status?.trim()) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY nome ASC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toVoluntarioDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${VOLUNTARIO_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toVoluntarioDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validateVoluntario(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const { nome, cpf, cargo, telefone, status } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfVoluntarioExists(pool, cpfDigits, null)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      const [result] = await pool.query(
        `INSERT INTO voluntarios (nome, cpf, cargo, telefone, status)
       VALUES (?, ?, ?, ?, ?)`,
        [
          nome.trim(),
          cpfDigits,
          cargo.trim(),
          trimOrNull(telefone),
          statusOrDefault(status, 'Ativo'),
        ]
      );

      const [created] = await pool.query(`${VOLUNTARIO_SELECT} WHERE id = ?`, [
        result.insertId,
      ]);

      const dto = toVoluntarioDto(created[0]);
      res.status(201).location(`/api/voluntarios/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const v = validateVoluntario(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      if (!(await existsById(pool, TABLE, id))) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const { nome, cpf, cargo, telefone, status } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfVoluntarioExists(pool, cpfDigits, id)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      await pool.query(
        `UPDATE voluntarios
       SET nome = ?, cpf = ?, cargo = ?, telefone = ?, status = ?
       WHERE id = ?`,
        [
          nome.trim(),
          cpfDigits,
          cargo.trim(),
          trimOrNull(telefone),
          statusOrDefault(status, 'Ativo'),
          id,
        ]
      );

      const [rows] = await pool.query(`${VOLUNTARIO_SELECT} WHERE id = ?`, [id]);
      res.json(toVoluntarioDto(rows[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM voluntarios WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}