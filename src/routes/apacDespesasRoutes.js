import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { formatDateIso, parseDateInput } from '../helpers/dateHelpers.js';
import { requireObject } from '../helpers/validationHelpers.js';
import {
  parseRouteId,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const CATEGORIA_SELECT = `SELECT id, nome, descricao, icone FROM apac_despesa_categorias`;
const DESPESA_SELECT = `
  SELECT d.id, d.categoria_id, d.categoria_nome, d.valor, d.data_despesa,
         d.fornecedor, d.forma_pagamento, d.descricao, a.nome AS animal_nome
  FROM apac_despesas d
  LEFT JOIN animais a ON a.id = d.animal_id
`;

/** @param {import('mysql2/promise').Pool} pool @param {string} nome */
async function animalIdByNome(pool, nome) {
  if (!nome?.trim()) return null;
  const [rows] = await pool.query(
    'SELECT id FROM animais WHERE LOWER(nome) = LOWER(?) LIMIT 1',
    [nome.trim()]
  );
  return rows[0]?.id ?? null;
}

/** @param {import('mysql2/promise').Pool} pool @param {string} nomeCategoria */
async function categoriaIdByNome(pool, nomeCategoria) {
  const [rows] = await pool.query(
    'SELECT id FROM apac_despesa_categorias WHERE nome = ? LIMIT 1',
    [nomeCategoria]
  );
  return rows[0]?.id ?? null;
}

/** @param {import('mysql2/promise').Pool} pool */
export function apacDespesasRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (_req, res) => {
      const [categorias] = await pool.query(`${CATEGORIA_SELECT} ORDER BY nome ASC`);
      const [despesas] = await pool.query(
        `${DESPESA_SELECT} ORDER BY d.data_despesa DESC, d.id DESC`
      );

      res.json({
        categorias: categorias.map((c) => ({
          id: Number(c.id),
          nome: c.nome,
          descricao: c.descricao,
          icone: c.icone,
        })),
        despesas: despesas.map((d) => ({
          id: Number(d.id),
          categoria: d.categoria_nome,
          valor: Number(d.valor),
          data_despesa: formatDateIso(d.data_despesa),
          fornecedor: d.fornecedor,
          animal: d.animal_nome,
          forma_pagamento: d.forma_pagamento,
          descricao: d.descricao,
        })),
      });
    })
  );

  r.post(
    '/categorias',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
      if (!nome) return res.status(400).json({ mensagem: 'Campo nome é obrigatório.' });

      try {
        const [result] = await pool.query(
          `INSERT INTO apac_despesa_categorias (nome, descricao, icone)
           VALUES (?, ?, ?)`,
          [nome, trimOrNull(req.body.descricao), trimOrNull(req.body.icone)]
        );
        const [rows] = await pool.query(`${CATEGORIA_SELECT} WHERE id = ?`, [
          result.insertId,
        ]);
        res.status(201).json({
          id: Number(rows[0].id),
          nome: rows[0].nome,
          descricao: rows[0].descricao,
          icone: rows[0].icone,
        });
      } catch (err) {
        if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ mensagem: 'Categoria já cadastrada.' });
        }
        throw err;
      }
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const categoriaNome =
        typeof req.body.categoria === 'string'
          ? req.body.categoria
          : typeof req.body.categoria_nome === 'string'
            ? req.body.categoria_nome
            : '';
      if (!categoriaNome.trim()) {
        return res.status(400).json({ mensagem: 'Campo categoria é obrigatório.' });
      }

      const valorNum = Number(req.body.valor);
      if (!Number.isFinite(valorNum) || valorNum <= 0) {
        return res.status(400).json({ mensagem: 'Campo valor inválido.' });
      }

      const data =
        parseDateInput(req.body.data_despesa) ||
        parseDateInput(req.body.data) ||
        new Date().toISOString().slice(0, 10);

      const pagamento =
        typeof req.body.forma_pagamento === 'string'
          ? req.body.forma_pagamento
          : typeof req.body.pagamento === 'string'
            ? req.body.pagamento
            : 'PIX';

      let animalId = req.body.animal_id != null ? parseRouteId(req.body.animal_id) : null;
      if (!animalId && typeof req.body.animal === 'string') {
        animalId = await animalIdByNome(pool, req.body.animal);
      }

      const categoriaId = await categoriaIdByNome(pool, categoriaNome.trim());

      const [result] = await pool.query(
        `INSERT INTO apac_despesas
        (categoria_id, categoria_nome, valor, data_despesa, fornecedor, animal_id, forma_pagamento, descricao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          categoriaId,
          categoriaNome.trim(),
          valorNum,
          data,
          trimOrNull(req.body.fornecedor),
          animalId,
          pagamento,
          trimOrNull(req.body.descricao),
        ]
      );

      const [rows] = await pool.query(`${DESPESA_SELECT} WHERE d.id = ?`, [
        result.insertId,
      ]);
      const d = rows[0];
      res.status(201).json({
        id: Number(d.id),
        categoria: d.categoria_nome,
        valor: Number(d.valor),
        data_despesa: formatDateIso(d.data_despesa),
        fornecedor: d.fornecedor,
        animal: d.animal_nome,
        forma_pagamento: d.forma_pagamento,
        descricao: d.descricao,
      });
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();
      const [result] = await pool.query('DELETE FROM apac_despesas WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
