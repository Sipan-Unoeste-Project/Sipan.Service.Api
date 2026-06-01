import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { formatDateIso, parseDateInput } from '../helpers/dateHelpers.js';
import { requireObject } from '../helpers/validationHelpers.js';
import { parseRouteId, queryBusca, trimOrNull } from '../helpers/routeHelpers.js';

const DOACAO_SELECT = `
  SELECT id, tipo, nome, telefone, email, valor, forma_pagamento,
         campanha_id, mensagem, anonimo, data_doacao
  FROM apac_doacoes
`;

/** @param {import('mysql2').RowDataPacket} row @param {import('mysql2').RowDataPacket[]} itens */
function toDoacaoDto(row, itens = []) {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    valor: row.valor != null ? Number(row.valor) : null,
    forma_pagamento: row.forma_pagamento,
    campanha_id: row.campanha_id != null ? Number(row.campanha_id) : null,
    mensagem: row.mensagem,
    anonimo: Boolean(row.anonimo),
    data_doacao: formatDateIso(row.data_doacao),
    itens: itens.map((i) => ({
      id: Number(i.id),
      produto: i.produto,
      quantidade: i.quantidade,
      unidade: i.unidade,
    })),
  };
}

async function loadItens(pool, doacaoId) {
  const [rows] = await pool.query(
    'SELECT id, produto, quantidade, unidade FROM apac_doacao_itens WHERE doacao_id = ?',
    [doacaoId]
  );
  return rows;
}

/** @param {import('mysql2/promise').Pool} pool */
export function apacDoacoesRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const busca = queryBusca(req);
      let sql = `${DOACAO_SELECT} WHERE 1=1`;
      const params = [];

      if (busca?.trim()) {
        const term = `%${busca.trim().toLowerCase()}%`;
        sql += ` AND (LOWER(nome) LIKE ? OR LOWER(email) LIKE ? OR telefone LIKE ?)`;
        params.push(term, term, `%${busca.trim()}%`);
      }

      sql += ' ORDER BY data_doacao DESC, id DESC LIMIT 100';

      const [rows] = await pool.query(sql, params);
      const list = [];
      for (const row of rows) {
        const itens = row.tipo === 'produto' ? await loadItens(pool, row.id) : [];
        list.push(toDoacaoDto(row, itens));
      }
      res.json(list);
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const body = /** @type {Record<string, unknown>} */ (req.body);
      const tipo = body.tipo;
      if (tipo !== 'dinheiro' && tipo !== 'produto') {
        return res.status(400).json({ mensagem: 'Campo tipo inválido.' });
      }

      const dataDoacao =
        parseDateInput(body.data_doacao) ||
        parseDateInput(body.data) ||
        new Date().toISOString().slice(0, 10);

      const anonimo = Boolean(body.anonimo);
      const nome = anonimo ? null : trimOrNull(body.nome);
      const telefone = anonimo ? null : trimOrNull(body.telefone);
      const email = anonimo ? null : trimOrNull(body.email);
      const mensagem = trimOrNull(body.mensagem);
      const formaPagamento =
        trimOrNull(body.forma_pagamento) || trimOrNull(body.pagamento);

      let valor = null;
      if (tipo === 'dinheiro') {
        valor = Number(body.valor);
        if (!Number.isFinite(valor) || valor <= 0) {
          return res.status(400).json({ mensagem: 'Campo valor inválido.' });
        }
      }

      const campanhaId =
        body.campanha_id != null ? parseRouteId(body.campanha_id) : null;

      let itensProduto = [];
      if (tipo === 'produto') {
        itensProduto = Array.isArray(body.itens) ? body.itens : [];
        if (!itensProduto.length) {
          return res.status(400).json({ mensagem: 'Informe ao menos um item.' });
        }
        const temProdutoValido = itensProduto.some((item) => {
          const rec = /** @type {Record<string, unknown>} */ (item);
          return typeof rec.produto === 'string' && rec.produto.trim().length > 0;
        });
        if (!temProdutoValido) {
          return res.status(400).json({ mensagem: 'Informe ao menos um item.' });
        }
      }

      const [result] = await pool.query(
        `INSERT INTO apac_doacoes
        (tipo, nome, telefone, email, valor, forma_pagamento, campanha_id, mensagem, anonimo, data_doacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tipo,
          nome,
          telefone,
          email,
          valor,
          formaPagamento,
          campanhaId,
          mensagem,
          anonimo ? 1 : 0,
          dataDoacao,
        ]
      );

      const doacaoId = result.insertId;

      if (tipo === 'produto') {
        for (const item of itensProduto) {
          const rec = /** @type {Record<string, unknown>} */ (item);
          const produto = typeof rec.produto === 'string' ? rec.produto.trim() : '';
          if (!produto) continue;
          await pool.query(
            `INSERT INTO apac_doacao_itens (doacao_id, produto, quantidade, unidade)
             VALUES (?, ?, ?, ?)`,
            [
              doacaoId,
              produto,
              String(rec.quantidade ?? '1'),
              String(rec.unidade ?? 'unidades'),
            ]
          );
        }
      }

      const [created] = await pool.query(`${DOACAO_SELECT} WHERE id = ?`, [doacaoId]);
      const itensRows = tipo === 'produto' ? await loadItens(pool, doacaoId) : [];
      const dto = toDoacaoDto(created[0], itensRows);
      res.status(201).location(`/api/doacoes/${dto.id}`).json(dto);
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM apac_doacoes WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
