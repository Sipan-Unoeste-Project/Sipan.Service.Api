import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  auditoriaUsuario,
  calcularStatusEstoque,
  registrarMovimentoEstoque,
  toEstoqueDto,
  toMovimentoDto,
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
         limite_baixo_estoque, status, atualizado_por_id, atualizado_por_nome,
         created_at, updated_at
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

      sql += ' ORDER BY item ASC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toEstoqueDto));
    })
  );

  r.get(
    '/:id/movimentos',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(
        `SELECT id, estoque_id, item_nome, acao, quantidade_antes, quantidade_depois,
                usuario_id, usuario_nome, detalhe, created_at
         FROM apac_estoque_movimentos
         WHERE estoque_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 50`,
        [id]
      );
      res.json(rows.map(toMovimentoDto));
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
      const auditor = auditoriaUsuario(req);

      const [result] = await pool.query(
        `INSERT INTO apac_estoque
        (item, categoria, quantidade, unidade, validade, local, limite_baixo_estoque, status,
         atualizado_por_id, atualizado_por_nome)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.trim(),
          categoria,
          v.quantidade,
          unidade,
          trimOrNull(validade),
          trimOrNull(local),
          v.limite,
          status,
          auditor.id,
          auditor.nome,
        ]
      );

      await registrarMovimentoEstoque(pool, {
        estoqueId: result.insertId,
        itemNome: item.trim(),
        acao: 'criacao',
        quantidadeAntes: null,
        quantidadeDepois: v.quantidade,
        usuarioId: auditor.id,
        usuarioNome: auditor.nome,
        detalhe: 'Item cadastrado no estoque',
      });

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

      const [atuais] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      if (!atuais.length) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const anterior = atuais[0];
      const { item, categoria, unidade, validade, local } = req.body;
      // Quantidade só muda por entrada/saída com justificativa.
      const quantidadeAtual = Number(anterior.quantidade);
      if (v.quantidade !== quantidadeAtual) {
        return res.status(400).json({
          mensagem:
            'A quantidade não pode ser alterada na edição. Use Entrada ou Saída com justificativa.',
        });
      }
      const status = calcularStatusEstoque(quantidadeAtual, v.limite);
      const auditor = auditoriaUsuario(req);

      await pool.query(
        `UPDATE apac_estoque SET
        item = ?, categoria = ?, unidade = ?,
        validade = ?, local = ?, limite_baixo_estoque = ?, status = ?,
        atualizado_por_id = ?, atualizado_por_nome = ?
        WHERE id = ?`,
        [
          item.trim(),
          categoria,
          unidade,
          trimOrNull(validade),
          trimOrNull(local),
          v.limite,
          status,
          auditor.id,
          auditor.nome,
          id,
        ]
      );

      await registrarMovimentoEstoque(pool, {
        estoqueId: id,
        itemNome: item.trim(),
        acao: 'alteracao',
        quantidadeAntes: quantidadeAtual,
        quantidadeDepois: quantidadeAtual,
        usuarioId: auditor.id,
        usuarioNome: auditor.nome,
        detalhe: 'Dados do item atualizados (sem mudança de quantidade)',
      });

      const [rows] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      res.json(toEstoqueDto(rows[0]));
    })
  );

  r.patch(
    '/:id/quantidade',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const tipo = typeof req.body?.tipo === 'string' ? req.body.tipo.trim().toLowerCase() : '';
      const quantidade = Number(req.body?.quantidade);
      const justificativa =
        typeof req.body?.justificativa === 'string' ? req.body.justificativa.trim() : '';

      if (tipo !== 'entrada' && tipo !== 'saida') {
        return res.status(400).json({ mensagem: 'Informe o tipo: entrada ou saida.' });
      }
      if (!Number.isInteger(quantidade) || quantidade < 1) {
        return res.status(400).json({ mensagem: 'Informe uma quantidade inteira maior que zero.' });
      }
      if (justificativa.length < 5) {
        return res.status(400).json({
          mensagem: 'A justificativa é obrigatória (mínimo 5 caracteres).',
        });
      }
      if (justificativa.length > 255) {
        return res.status(400).json({ mensagem: 'A justificativa excede 255 caracteres.' });
      }

      const [rows] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const atual = rows[0];
      const qtdeAntes = Number(atual.quantidade);
      if (tipo === 'saida' && quantidade > qtdeAntes) {
        return res.status(400).json({
          mensagem: `Saída maior que o saldo atual (${qtdeAntes}).`,
        });
      }

      const novaQtde = tipo === 'entrada' ? qtdeAntes + quantidade : qtdeAntes - quantidade;
      const limite = Number(atual.limite_baixo_estoque) || 5;
      const status = calcularStatusEstoque(novaQtde, limite);
      const auditor = auditoriaUsuario(req);
      const prefixo = tipo === 'entrada' ? 'Entrada' : 'Saída';

      await pool.query(
        `UPDATE apac_estoque
         SET quantidade = ?, status = ?, atualizado_por_id = ?, atualizado_por_nome = ?
         WHERE id = ?`,
        [novaQtde, status, auditor.id, auditor.nome, id]
      );

      await registrarMovimentoEstoque(pool, {
        estoqueId: id,
        itemNome: atual.item,
        acao: 'ajuste',
        quantidadeAntes: qtdeAntes,
        quantidadeDepois: novaQtde,
        usuarioId: auditor.id,
        usuarioNome: auditor.nome,
        detalhe: `${prefixo} de ${quantidade}: ${justificativa}`,
      });

      const [updated] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      res.json(toEstoqueDto(updated[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [rows] = await pool.query(`${ESTOQUE_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).end();

      const atual = rows[0];
      const auditor = auditoriaUsuario(req);

      await registrarMovimentoEstoque(pool, {
        estoqueId: id,
        itemNome: atual.item,
        acao: 'exclusao',
        quantidadeAntes: Number(atual.quantidade),
        quantidadeDepois: null,
        usuarioId: auditor.id,
        usuarioNome: auditor.nome,
        detalhe: 'Item excluído do estoque',
      });

      const [result] = await pool.query('DELETE FROM apac_estoque WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
