import { formatDateIso } from './dateHelpers.js';
import { cpfExistsInTable, formatCpf, normalizeCpf } from './cpfHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

export { normalizeCpf, formatCpf };

export const TIPOS_PESSOA = ['doador', 'adotante'];

/** @param {unknown} value */
export function normalizeCep(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 8);
}

/** @param {string} digits */
export function formatCep(digits) {
  const d = normalizeCep(digits);
  if (d.length !== 8) return d;
  return d.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/** @param {unknown} body */
export function parseTiposFromBody(body) {
  const rec = /** @type {Record<string, unknown>} */ (body ?? {});
  let raw = rec.tipos;
  if (!raw && rec.tipo) raw = [rec.tipo];
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((t) => typeof t === 'string' && TIPOS_PESSOA.includes(t.trim()));
  return [...new Set(valid.map((t) => t.trim()))].sort();
}

/** @param {import('mysql2').RowDataPacket} row */
export function parseTiposFromRow(row) {
  if (typeof row.tipos === 'string' && row.tipos) {
    return row.tipos.split(',').filter((t) => TIPOS_PESSOA.includes(t));
  }
  if (row.tipo && TIPOS_PESSOA.includes(row.tipo)) return [row.tipo];
  return [];
}

/** @param {import('mysql2').RowDataPacket} row */
export function toPessoaDto(row) {
  const cpfDigits = normalizeCpf(row.cpf);
  const cepDigits = normalizeCep(row.cep);

  return {
    id: Number(row.id),
    nome: row.nome,
    cpf: cpfDigits.length === 11 ? formatCpf(cpfDigits) : row.cpf,
    tipos: parseTiposFromRow(row),
    telefone: row.telefone,
    email: row.email,
    cep: cepDigits.length === 8 ? formatCep(cepDigits) : row.cep,
    endereco: row.endereco,
    numero: row.numero,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    obs: row.observacoes,
    criadoEm: formatDateIso(row.criado_em),
  };
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} pessoaId
 * @param {string[]} tipos
 */
export async function savePessoaTipos(pool, pessoaId, tipos) {
  await pool.query('DELETE FROM pessoa_tipos WHERE pessoa_id = ?', [pessoaId]);
  for (const tipo of tipos) {
    await pool.query('INSERT INTO pessoa_tipos (pessoa_id, tipo) VALUES (?, ?)', [
      pessoaId,
      tipo,
    ]);
  }
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} cpfDigits
 * @param {number | null} ignoreId
 */
export async function cpfExists(pool, cpfDigits, ignoreId) {
  return cpfExistsInTable(pool, 'pessoas', cpfDigits, ignoreId);
}

/** @param {unknown} body */
export function validatePessoa(body) {
  const invalid = requireObject(body);
  if (invalid) return invalid;

  const { nome, cpf, telefone, email } =
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

  const tipos = parseTiposFromBody(body);
  if (tipos.length === 0) {
    return fail('Informe ao menos um perfil (doador ou adotante).');
  }

  if (typeof telefone !== 'string' || !telefone.trim()) {
    return fail('Campo telefone é obrigatório.');
  }
  if (telefone.trim().length > 20) {
    return fail('Campo telefone excede 20 caracteres.');
  }
  if (
    typeof email === 'string' &&
    email.trim().length > 0 &&
    email.trim().length > 150
  ) {
    return fail('Campo email excede 150 caracteres.');
  }

  const cep = normalizeCep(body.cep);
  if (body.cep != null && String(body.cep).trim() && cep.length !== 8) {
    return fail('Campo cep inválido.');
  }

  const endereco = typeof body.endereco === 'string' ? body.endereco.trim() : '';
  if (endereco.length > 200) return fail('Campo endereco excede 200 caracteres.');

  const numero = typeof body.numero === 'string' ? body.numero.trim() : '';
  if (numero.length > 20) return fail('Campo numero excede 20 caracteres.');

  const bairro = typeof body.bairro === 'string' ? body.bairro.trim() : '';
  if (bairro.length > 100) return fail('Campo bairro excede 100 caracteres.');

  const cidade = typeof body.cidade === 'string' ? body.cidade.trim() : '';
  if (cidade.length > 100) return fail('Campo cidade excede 100 caracteres.');

  const estado =
    typeof body.estado === 'string' ? body.estado.trim().toUpperCase() : '';
  if (estado && !/^[A-Z]{2}$/.test(estado)) {
    return fail('Campo estado inválido.');
  }

  return ok({ tipos });
}
