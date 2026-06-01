import { formatDateIso } from './dateHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

const STATUS_VALIDOS = ['planejada', 'ativa', 'concluida', 'cancelada'];

/** @param {import('mysql2').RowDataPacket} row */
export function toCampanhaDto(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    descricao: row.descricao,
    data_evento: formatDateIso(row.data_evento),
    meta: Number(row.meta),
    arrecadado: Number(row.arrecadado),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown} body */
export function validateCampanha(body) {
  const invalid = requireObject(body);
  if (invalid) return invalid;

  const { nome, descricao, data_evento, meta, status } =
    /** @type {Record<string, unknown>} */ (body);

  if (typeof nome !== 'string' || !nome.trim()) {
    return fail('Campo nome é obrigatório.');
  }
  if (nome.trim().length > 200) {
    return fail('Campo nome excede 200 caracteres.');
  }
  if (typeof data_evento !== 'string' || !data_evento.trim()) {
    return fail('Campo data_evento é obrigatório.');
  }

  const metaNum = Number(meta);
  if (Number.isNaN(metaNum) || metaNum < 0) {
    return fail('Campo meta inválido.');
  }

  if (status != null && (typeof status !== 'string' || !STATUS_VALIDOS.includes(status))) {
    return fail('Campo status inválido.');
  }
  if (descricao != null && typeof descricao === 'string' && descricao.length > 5000) {
    return fail('Campo descricao excede 5000 caracteres.');
  }

  return ok();
}
