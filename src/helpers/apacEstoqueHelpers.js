import { formatDateIso } from './dateHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

const CATEGORIAS = ['alimentos', 'medicamentos', 'limpeza', 'acessorios'];
const UNIDADES = ['unidades', 'kg', 'litros', 'pacotes'];

/** @param {number} quantidade @param {number} limite */
export function calcularStatusEstoque(quantidade, limite) {
  return quantidade <= limite ? 'baixo' : 'normal';
}

/** @param {import('express').Request} req */
export function auditoriaUsuario(req) {
  return {
    id: req.usuario?.id != null ? Number(req.usuario.id) : null,
    nome: req.usuario?.nome || req.usuario?.login || 'Sistema',
  };
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {{
 *   estoqueId?: number | null,
 *   itemNome: string,
 *   acao: 'criacao' | 'alteracao' | 'ajuste' | 'exclusao',
 *   quantidadeAntes?: number | null,
 *   quantidadeDepois?: number | null,
 *   usuarioId?: number | null,
 *   usuarioNome?: string | null,
 *   detalhe?: string | null,
 * }} dados
 */
export async function registrarMovimentoEstoque(pool, dados) {
  await pool.query(
    `INSERT INTO apac_estoque_movimentos
      (estoque_id, item_nome, acao, quantidade_antes, quantidade_depois,
       usuario_id, usuario_nome, detalhe)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.estoqueId ?? null,
      dados.itemNome,
      dados.acao,
      dados.quantidadeAntes ?? null,
      dados.quantidadeDepois ?? null,
      dados.usuarioId ?? null,
      dados.usuarioNome ?? null,
      dados.detalhe ?? null,
    ]
  );
}

/** @param {import('mysql2').RowDataPacket} row */
export function toEstoqueDto(row) {
  return {
    id: Number(row.id),
    item: row.item,
    categoria: row.categoria,
    quantidade: Number(row.quantidade),
    unidade: row.unidade,
    validade: formatDateIso(row.validade),
    local: row.local,
    limite_baixo_estoque: Number(row.limite_baixo_estoque),
    status: row.status,
    atualizado_por_id: row.atualizado_por_id != null ? Number(row.atualizado_por_id) : null,
    atualizado_por_nome: row.atualizado_por_nome || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {import('mysql2').RowDataPacket} row */
export function toMovimentoDto(row) {
  return {
    id: Number(row.id),
    estoque_id: row.estoque_id != null ? Number(row.estoque_id) : null,
    item_nome: row.item_nome,
    acao: row.acao,
    quantidade_antes: row.quantidade_antes != null ? Number(row.quantidade_antes) : null,
    quantidade_depois: row.quantidade_depois != null ? Number(row.quantidade_depois) : null,
    usuario_id: row.usuario_id != null ? Number(row.usuario_id) : null,
    usuario_nome: row.usuario_nome || null,
    detalhe: row.detalhe || null,
    created_at: row.created_at,
  };
}

/** @param {unknown} body */
export function validateEstoque(body) {
  const invalid = requireObject(body);
  if (invalid) return invalid;

  const { item, categoria, quantidade, unidade, local, limite_baixo_estoque } =
    /** @type {Record<string, unknown>} */ (body);

  if (typeof item !== 'string' || !item.trim()) {
    return fail('Campo item é obrigatório.');
  }
  if (item.trim().length > 200) {
    return fail('Campo item excede 200 caracteres.');
  }
  if (typeof categoria !== 'string' || !CATEGORIAS.includes(categoria)) {
    return fail('Campo categoria inválido.');
  }

  const qtd = Number(quantidade);
  if (!Number.isInteger(qtd) || qtd < 0) {
    return fail('Campo quantidade deve ser um inteiro >= 0.');
  }
  if (typeof unidade !== 'string' || !UNIDADES.includes(unidade)) {
    return fail('Campo unidade inválido.');
  }
  if (local != null && typeof local === 'string' && local.trim().length > 120) {
    return fail('Campo local excede 120 caracteres.');
  }

  const limite = limite_baixo_estoque != null ? Number(limite_baixo_estoque) : 5;
  if (!Number.isInteger(limite) || limite < 0) {
    return fail('Campo limite_baixo_estoque inválido.');
  }

  return ok({ quantidade: qtd, limite });
}
