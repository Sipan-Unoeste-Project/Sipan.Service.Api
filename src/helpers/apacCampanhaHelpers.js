import { formatDateIso, parseDateInput } from './dateHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

const STATUS_VALIDOS = ['planejada', 'ativa', 'concluida', 'cancelada'];

/** Data local yyyy-MM-dd (sem deslocar fuso). */
export function hojeIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @param {import('mysql2').RowDataPacket} row */
export function toCampanhaDto(row) {
  const dataInicio = formatDateIso(row.data_inicio) || formatDateIso(row.data_evento);
  const dataFim = formatDateIso(row.data_fim) || dataInicio;

  return {
    id: Number(row.id),
    nome: row.nome,
    descricao: row.descricao,
    data_inicio: dataInicio,
    data_fim: dataFim,
    data_evento: dataInicio,
    meta: Number(row.meta),
    arrecadado: Number(row.arrecadado),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Encerra campanhas cuja data_fim já passou.
 * Não encerra por atingir a estimativa (meta) — pode ultrapassar.
 * @param {import('mysql2/promise').Pool} pool
 */
export async function encerrarCampanhasVencidas(pool) {
  const hoje = hojeIsoLocal();
  await pool.query(
    `UPDATE apac_campanhas
     SET status = 'concluida'
     WHERE data_fim < ?
       AND status IN ('planejada', 'ativa')`,
    [hoje]
  );
}

/** @param {unknown} body */
export function validateCampanha(body) {
  const invalid = requireObject(body);
  if (invalid) return invalid;

  const { nome, descricao, data_inicio, data_fim, data_evento, meta, status } =
    /** @type {Record<string, unknown>} */ (body);

  if (typeof nome !== 'string' || !nome.trim()) {
    return fail('Campo nome é obrigatório.');
  }
  if (nome.trim().length > 200) {
    return fail('Campo nome excede 200 caracteres.');
  }

  const inicioRaw =
    (typeof data_inicio === 'string' && data_inicio.trim()) ||
    (typeof data_evento === 'string' && data_evento.trim()) ||
    '';
  const fimRaw =
    (typeof data_fim === 'string' && data_fim.trim()) ||
    inicioRaw;

  const inicio = parseDateInput(inicioRaw);
  const fim = parseDateInput(fimRaw);

  if (!inicio) {
    return fail('Campo data de início é obrigatório.');
  }
  if (!fim) {
    return fail('Campo data de fim é obrigatório.');
  }
  if (fim < inicio) {
    return fail('A data de fim deve ser igual ou posterior à data de início.');
  }

  const metaNum = Number(meta);
  if (Number.isNaN(metaNum) || metaNum < 0) {
    return fail('Campo estimativa de valor inválido.');
  }

  if (status != null && (typeof status !== 'string' || !STATUS_VALIDOS.includes(status))) {
    return fail('Campo status inválido.');
  }
  if (descricao != null && typeof descricao === 'string' && descricao.length > 5000) {
    return fail('Campo descricao excede 5000 caracteres.');
  }

  return ok({ data_inicio: inicio, data_fim: fim, meta: metaNum });
}
