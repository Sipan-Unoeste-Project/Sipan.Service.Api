import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  toCampanhaDto,
  validateCampanha,
  encerrarCampanhasVencidas,
  hojeIsoLocal,
} from '../helpers/apacCampanhaHelpers.js';
import {
  existsById,
  parseRouteId,
  statusOrDefault,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const TABLE = 'apac_campanhas';
const CAMPANHA_SELECT = `
  SELECT id, nome, descricao, data_inicio, data_fim, data_evento, meta, arrecadado, status,
         created_at, updated_at
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
      await encerrarCampanhasVencidas(pool);

      const [ativas] = await pool.query(
        `${CAMPANHA_SELECT} WHERE status IN ('planejada', 'ativa') ORDER BY data_inicio ASC`
      );
      const [encerradas] = await pool.query(
        `${CAMPANHA_SELECT} WHERE status IN ('concluida', 'cancelada') ORDER BY data_fim DESC`
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
      await encerrarCampanhasVencidas(pool);

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

      const { nome, descricao, status } = req.body;
      const { data_inicio, data_fim, meta } = v;
      const hoje = hojeIsoLocal();
      const statusInicial =
        data_fim < hoje
          ? 'concluida'
          : statusOrDefault(status, data_inicio <= hoje ? 'ativa' : 'planejada');

      const [result] = await pool.query(
        `INSERT INTO apac_campanhas
          (nome, descricao, data_inicio, data_fim, data_evento, meta, arrecadado, status)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          nome.trim(),
          trimOrNull(descricao),
          data_inicio,
          data_fim,
          data_inicio,
          meta,
          statusInicial,
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

      const { nome, descricao, status } = req.body;
      const { data_inicio, data_fim, meta } = v;
      const hoje = hojeIsoLocal();
      let statusFinal = typeof status === 'string' ? status : 'ativa';
      if (data_fim < hoje && statusFinal !== 'cancelada') {
        statusFinal = 'concluida';
      }

      await pool.query(
        `UPDATE apac_campanhas SET
          nome = ?, descricao = ?, data_inicio = ?, data_fim = ?, data_evento = ?,
          meta = ?, status = ?
         WHERE id = ?`,
        [
          nome.trim(),
          trimOrNull(descricao),
          data_inicio,
          data_fim,
          data_inicio,
          meta,
          statusFinal,
          id,
        ]
      );

      const [rows] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [id]);
      res.json(toCampanhaDto(rows[0]));
    })
  );

  r.patch(
    '/:id/doacao',
    asyncHandler(async (req, res) => {
      await encerrarCampanhasVencidas(pool);

      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const valor = Number(req.body?.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        return res.status(400).json({ mensagem: 'Campo valor deve ser um número positivo.' });
      }

      const [rows] = await pool.query(`${CAMPANHA_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const campanha = rows[0];
      if (['concluida', 'cancelada'].includes(String(campanha.status))) {
        return res.status(400).json({
          mensagem: 'Campanha encerrada. Não é possível registrar doação.',
        });
      }

      const novoArrecadado = Number(campanha.arrecadado) + valor;

      // Estimativa (meta) pode ser ultrapassada — não encerra por valor.
      await pool.query('UPDATE apac_campanhas SET arrecadado = ? WHERE id = ?', [
        novoArrecadado,
        id,
      ]);

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
