import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  calcularStatusEstoque,
  toEstoqueDto,
  validateEstoque,
} from '../helpers/apacEstoqueHelpers.js';
import {
  existsById,
  parseRouteId,
  queryBusca,
  queryString,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const TABLE = 'apac_estoque';
const ESTOQUE_SELECT = `
  SELECT id, item, categoria, quantidade, unidade, validade, local,
         limite_baixo_estoque, status, created_at, updated_at
  FROM apac_estoque
`;
const MSG_NAO_ENCONTRADO = 'Item de estoque não encontrado.';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function apacEstoqueRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const busca = queryBusca(req);
      const categoria = queryString(req, 'categoria');
      const status = queryString(req, 'status');

      let sql = `${ESTOQUE_SELECT} WHERE 1=1`;
      const params = [];

      if (busca?.trim()) {
        const term = `%${busca.trim().toLowerCase()}%`;
        sql += ` AND (
        LOWER(item) LIKE ? OR
        LOWER(categoria) LIKE ? OR
        LOWER(local) LIKE ?
      )`;
        params.push(term, term, term);
      }

      if (categoria?.trim()) {
        sql += ' AND categoria = ?';
        params.push(categoria);
      }

      if (status?.trim()) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toEstoqueDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toEstoqueDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validateEstoque(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const { item, categoria, unidade, validade, local } = req.body;
      const status = calcularStatusEstoque(v.quantidade, v.limite);

      const [result] = await pool.query(
        `INSERT INTO apac_estoque
        (item, categoria, quantidade, unidade, validade, local, limite_baixo_estoque, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.trim(),
          categoria,
          v.quantidade,
          unidade,
          trimOrNull(validade),
          trimOrNull(local),
          v.limite,
          status,
        ]
      );

      const [created] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [
        result.insertId,
      ]);

      const dto = toEstoqueDto(created[0]);
      res.status(201).location(`/api/estoque/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const v = validateEstoque(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      if (!(await existsById(pool, TABLE, id))) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const { item, categoria, unidade, validade, local } = req.body;
      const status = calcularStatusEstoque(v.quantidade, v.limite);

      await pool.query(
        `UPDATE apac_estoque SET
        item = ?, categoria = ?, quantidade = ?, unidade = ?,
        validade = ?, local = ?, limite_baixo_estoque = ?, status = ?
        WHERE id = ?`,
        [
          item.trim(),
          categoria,
          v.quantidade,
          unidade,
          trimOrNull(validade),
          trimOrNull(local),
          v.limite,
          status,
          id,
        ]
      );

      const [rows] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      res.json(toEstoqueDto(rows[0]));
    })
  );

  r.patch(
    '/:id/quantidade',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const delta = Number(req.body?.delta);
      if (!Number.isFinite(delta)) {
        return res.status(400).json({ mensagem: 'Campo delta é obrigatório.' });
      }

      const [rows] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const atual = rows[0];
      const novaQtde = Math.max(0, Number(atual.quantidade) + delta);
      const limite = Number(atual.limite_baixo_estoque) || 5;
      const status = calcularStatusEstoque(novaQtde, limite);

      await pool.query(
        'UPDATE apac_estoque SET quantidade = ?, status = ? WHERE id = ?',
        [novaQtde, status, id]
      );

      const [updated] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      res.json(toEstoqueDto(updated[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM apac_estoque WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
