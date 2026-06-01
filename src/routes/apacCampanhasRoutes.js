import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { toCampanhaDto, validateCampanha } from '../helpers/apacCampanhaHelpers.js';
import {
  existsById,
  parseRouteId,
  statusOrDefault,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const TABLE = 'apac_campanhas';
const CAMPANHA_SELECT = `
  SELECT id, nome, descricao, data_evento, meta, arrecadado, status, created_at, updated_at
  FROM apac_campanhas
`;
const MSG_NAO_ENCONTRADO = 'Campanha não encontrada.';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function apacCampanhasRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (_req, res) => {
      const [ativas] = await pool.query(
        `${CAMPANHA_SELECT} WHERE status IN ('planejada', 'ativa') ORDER BY data_evento ASC`
      );
      const [encerradas] = await pool.query(
        `${CAMPANHA_SELECT} WHERE status IN ('concluida', 'cancelada') ORDER BY data_evento DESC`
      );

      res.json({
        ativas: ativas.map(toCampanhaDto),
        encerradas: encerradas.map(toCampanhaDto),
      });
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toCampanhaDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validateCampanha(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const { nome, descricao, data_evento, meta, status } = req.body;

      const [result] = await pool.query(
        `INSERT INTO apac_campanhas (nome, descricao, data_evento, meta, arrecadado, status)
        VALUES (?, ?, ?, ?, 0, ?)`,
        [
          nome.trim(),
          trimOrNull(descricao),
          data_evento,
          Number(meta),
          statusOrDefault(status, 'planejada'),
        ]
      );

      const [created] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [
        result.insertId,
      ]);

      const dto = toCampanhaDto(created[0]);
      res.status(201).location(`/api/campanhas/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const v = validateCampanha(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      if (!(await existsById(pool, TABLE, id))) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const { nome, descricao, data_evento, meta, status } = req.body;

      await pool.query(
        `UPDATE apac_campanhas SET
        nome = ?, descricao = ?, data_evento = ?, meta = ?, status = ?
        WHERE id = ?`,
        [nome.trim(), trimOrNull(descricao), data_evento, Number(meta), status, id]
      );

      const [rows] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [id]);
      res.json(toCampanhaDto(rows[0]));
    })
  );

  r.patch(
    '/:id/doacao',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const valor = Number(req.body?.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        return res.status(400).json({ mensagem: 'Campo valor deve ser um número positivo.' });
      }

      const [rows] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const campanha = rows[0];
      const novoArrecadado = Number(campanha.arrecadado) + valor;
      const meta = Number(campanha.meta);
      const novoStatus =
        novoArrecadado >= meta && meta > 0 ? 'concluida' : campanha.status;

      await pool.query(
        'UPDATE apac_campanhas SET arrecadado = ?, status = ? WHERE id = ?',
        [novoArrecadado, novoStatus, id]
      );

      const [updated] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [id]);
      res.json(toCampanhaDto(updated[0]));
    })
  );

  r.patch(
    '/:id/encerrar',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [result] = await pool.query(
        `UPDATE apac_campanhas SET status = 'concluida' WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const [rows] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [id]);
      res.json(toCampanhaDto(rows[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM apac_campanhas WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
