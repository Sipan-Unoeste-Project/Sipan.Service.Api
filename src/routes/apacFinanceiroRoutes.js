import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { formatDateIso, parseDateInput } from '../helpers/dateHelpers.js';
import { requireObject } from '../helpers/validationHelpers.js';
import {
  existsById,
  parseRouteId,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const ENTRADA_SELECT = `
  SELECT e.id, e.origem, e.valor, e.data_lancamento, e.responsavel, e.observacoes, c.nome AS campanha_nome
  FROM apac_financeiro_entradas e
  LEFT JOIN apac_campanhas c ON c.id = e.campanha_id
`;

const SAIDA_SELECT = `
  SELECT s.id, s.tipo_despesa, s.valor, s.data_lancamento, s.fornecedor, s.observacoes,
         a.nome AS animal_nome
  FROM apac_financeiro_saidas s
  LEFT JOIN animais a ON a.id = s.animal_id
`;

/** @param {import('mysql2').RowDataPacket} row */
function toEntradaDto(row) {
  return {
    id: Number(row.id),
    origem: row.origem,
    valor: Number(row.valor),
    data_lancamento: formatDateIso(row.data_lancamento),
    responsavel: row.responsavel,
    campanha: row.campanha_nome,
    observacoes: row.observacoes,
  };
}

/** @param {import('mysql2').RowDataPacket} row */
function toSaidaDto(row) {
  return {
    id: Number(row.id),
    tipo: row.tipo_despesa,
    valor: Number(row.valor),
    data_lancamento: formatDateIso(row.data_lancamento),
    fornecedor: row.fornecedor,
    animal: row.animal_nome,
    observacoes: row.observacoes,
  };
}

/** @param {import('mysql2/promise').Pool} pool @param {string} nome */
async function animalIdByNome(pool, nome) {
  if (!nome?.trim()) return null;
  const [rows] = await pool.query(
    'SELECT id FROM animais WHERE LOWER(nome) = LOWER(?) LIMIT 1',
    [nome.trim()]
  );
  return rows[0]?.id ?? null;
}

/** @param {import('mysql2/promise').Pool} pool */
export function apacFinanceiroRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (_req, res) => {
      const [entradas] = await pool.query(
        `${ENTRADA_SELECT} ORDER BY e.data_lancamento DESC, e.id DESC`
      );
      const [saidas] = await pool.query(
        `${SAIDA_SELECT} ORDER BY s.data_lancamento DESC, s.id DESC`
      );
      res.json({
        entradas: entradas.map(toEntradaDto),
        saidas: saidas.map(toSaidaDto),
      });
    })
  );

  r.post(
    '/entradas',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const { origem, valor, responsavel, observacoes } = req.body;
      if (typeof origem !== 'string' || !origem.trim()) {
        return res.status(400).json({ mensagem: 'Campo origem é obrigatório.' });
      }
      const valorNum = Number(valor);
      if (!Number.isFinite(valorNum) || valorNum <= 0) {
        return res.status(400).json({ mensagem: 'Campo valor inválido.' });
      }

      const data =
        parseDateInput(req.body.data_lancamento) ||
        parseDateInput(req.body.data) ||
        new Date().toISOString().slice(0, 10);

      const [result] = await pool.query(
        `INSERT INTO apac_financeiro_entradas
        (origem, valor, data_lancamento, responsavel, observacoes)
        VALUES (?, ?, ?, ?, ?)`,
        [
          origem.trim(),
          valorNum,
          data,
          trimOrNull(responsavel),
          trimOrNull(observacoes),
        ]
      );

      const [rows] = await pool.query(`${ENTRADA_SELECT} WHERE e.id = ?`, [
        result.insertId,
      ]);
      const dto = toEntradaDto(rows[0]);
      res.status(201).location(`/api/financeiro/entradas/${dto.id}`).json(dto);
    })
  );

  r.post(
    '/saidas',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const tipo =
        typeof req.body.tipo === 'string'
          ? req.body.tipo
          : typeof req.body.tipo_despesa === 'string'
            ? req.body.tipo_despesa
            : '';
      if (!tipo.trim()) {
        return res.status(400).json({ mensagem: 'Campo tipo é obrigatório.' });
      }

      const valorNum = Number(req.body.valor);
      if (!Number.isFinite(valorNum) || valorNum <= 0) {
        return res.status(400).json({ mensagem: 'Campo valor inválido.' });
      }

      const data =
        parseDateInput(req.body.data_lancamento) ||
        parseDateInput(req.body.data) ||
        new Date().toISOString().slice(0, 10);

      let animalId = req.body.animal_id != null ? parseRouteId(req.body.animal_id) : null;
      if (!animalId && typeof req.body.animal === 'string') {
        animalId = await animalIdByNome(pool, req.body.animal);
      }

      const [result] = await pool.query(
        `INSERT INTO apac_financeiro_saidas
        (tipo_despesa, valor, data_lancamento, fornecedor, animal_id, observacoes)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tipo.trim(),
          valorNum,
          data,
          trimOrNull(req.body.fornecedor),
          animalId,
          trimOrNull(req.body.observacoes),
        ]
      );

      const [rows] = await pool.query(`${SAIDA_SELECT} WHERE s.id = ?`, [
        result.insertId,
      ]);
      const dto = toSaidaDto(rows[0]);
      res.status(201).location(`/api/financeiro/saidas/${dto.id}`).json(dto);
    })
  );

  r.delete(
    '/entradas/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();
      const [result] = await pool.query(
        'DELETE FROM apac_financeiro_entradas WHERE id = ?',
        [id]
      );
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  r.delete(
    '/saidas/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();
      const [result] = await pool.query(
        'DELETE FROM apac_financeiro_saidas WHERE id = ?',
        [id]
      );
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
