import { formatDateIso } from './dateHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

const CATEGORIAS = ['alimentos', 'medicamentos', 'limpeza', 'acessorios'];
const UNIDADES = ['unidades', 'kg', 'litros', 'pacotes'];

/** @param {number} quantidade @param {number} limite */
export function calcularStatusEstoque(quantidade, limite) {
  return quantidade <= limite ? 'baixo' : 'normal';
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
    created_at: row.created_at,
    updated_at: row.updated_at,
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
