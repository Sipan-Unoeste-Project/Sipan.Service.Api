import { formatCpf, normalizeCpf } from './cpfHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

const STATUS_VALIDOS = new Set([
  'Pendente',
  'Em análise',
  'Aprovada',
  'Recusada',
  'Concluída',
]);

/** @param {unknown} value */
function toIsoDateTime(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

/** @param {import('mysql2').RowDataPacket} row */
export function toAdocaoDto(row) {
  const cpfDigits = normalizeCpf(row.cpf);

  return {
    id: Number(row.id),
    nomeAdotante: row.nome_adotante,
    cpf: cpfDigits.length === 11 ? formatCpf(cpfDigits) : row.cpf,
    telefone: row.telefone,
    email: row.email,
    endereco: row.endereco,
    animalId: Number(row.animal_id),
    animalNome: row.animal_nome ?? null,
    animalEspecie: row.animal_especie ?? null,
    motivo: row.motivo,
    temOutrosAnimais: row.tem_outros_animais,
    temCriancas: row.tem_criancas,
    tipoResidencia: row.tipo_residencia,
    aceitaTermo: Boolean(row.aceita_termo),
    status: row.status,
    dataSolicitacao: toIsoDateTime(row.data_solicitacao),
  };
}

/** @param {unknown} body */
export function validateAdocao(body, { isUpdate = false } = {}) {
  const invalid = requireObject(body);
  if (invalid) return invalid;

  const {
    nomeAdotante,
    cpf,
    telefone,
    email,
    endereco,
    animalId,
    motivo,
    temOutrosAnimais,
    temCriancas,
    tipoResidencia,
    aceitaTermo,
    status,
  } = /** @type {Record<string, unknown>} */ (body);

  if (typeof nomeAdotante !== 'string' || !nomeAdotante.trim()) {
    return fail('Campo nomeAdotante é obrigatório.');
  }
  if (typeof cpf !== 'string' || !cpf.trim()) {
    return fail('Campo cpf é obrigatório.');
  }
  if (normalizeCpf(cpf).length !== 11) {
    return fail('Campo cpf deve conter 11 dígitos.');
  }
  if (typeof telefone !== 'string' || !telefone.trim()) {
    return fail('Campo telefone é obrigatório.');
  }
  if (typeof email !== 'string' || !email.trim()) {
    return fail('Campo email é obrigatório.');
  }
  if (typeof animalId !== 'number' || !Number.isInteger(animalId) || animalId <= 0) {
    return fail('Campo animalId é obrigatório.');
  }
  if (typeof motivo !== 'string' || !motivo.trim()) {
    return fail('Campo motivo é obrigatório.');
  }
  if (typeof tipoResidencia !== 'string' || !tipoResidencia.trim()) {
    return fail('Campo tipoResidencia é obrigatório.');
  }
  if (!isUpdate && aceitaTermo !== true) {
    return fail('É necessário aceitar o termo de responsabilidade.');
  }
  if (status != null && (typeof status !== 'string' || !STATUS_VALIDOS.has(status))) {
    return fail('Status inválido.');
  }
  if (typeof endereco === 'string' && endereco.length > 255) {
    return fail('Campo endereco excede 255 caracteres.');
  }
  if (typeof temOutrosAnimais === 'string' && temOutrosAnimais.length > 10) {
    return fail('Campo temOutrosAnimais inválido.');
  }
  if (typeof temCriancas === 'string' && temCriancas.length > 10) {
    return fail('Campo temCriancas inválido.');
  }

  return ok();
}
