import { cpfExistsInTable, formatCpf, normalizeCpf } from './cpfHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

/** @param {import('mysql2').RowDataPacket} row */
export function toFuncionarioDto(row) {
  const cpfDigits = normalizeCpf(row.cpf);

  return {
    id: Number(row.id),
    nome: row.nome,
    cpf: cpfDigits.length === 11 ? formatCpf(cpfDigits) : row.cpf,
    cargo: row.cargo,
    telefone: row.telefone,
    status: row.status,
  };
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} cpfDigits
 * @param {number | null} ignoreId
 */
export async function cpfFuncionarioExists(pool, cpfDigits, ignoreId) {
  return cpfExistsInTable(pool, 'funcionarios', cpfDigits, ignoreId);
}

/** @param {unknown} body */
export function validateFuncionario(body) {
  const invalid = requireObject(body);
  if (invalid) return invalid;

  const { nome, cpf, cargo, telefone, status } =
    /** @type {Record<string, unknown>} */ (body);

  if (typeof nome !== 'string' || !nome.trim()) {
    return fail('Campo nome é obrigatório.');
  }
  if (nome.trim().length > 150) {
    return fail('Campo nome excede 150 caracteres.');
  }
  if (typeof cpf !== 'string' || !cpf.trim()) {
    return fail('Campo cpf é obrigatório.');
  }
  if (normalizeCpf(cpf).length !== 11) {
    return fail('Campo cpf deve conter 11 dígitos.');
  }
  if (typeof cargo !== 'string' || !cargo.trim()) {
    return fail('Campo cargo é obrigatório.');
  }
  if (cargo.trim().length > 100) {
    return fail('Campo cargo excede 100 caracteres.');
  }
  if (telefone != null && typeof telefone === 'string' && telefone.trim().length > 20) {
    return fail('Campo telefone excede 20 caracteres.');
  }
  if (status != null && typeof status === 'string' && status.trim().length > 50) {
    return fail('Campo status excede 50 caracteres.');
  }

  return ok();
}
