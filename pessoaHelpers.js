/** @param {string} cpf */
export function normalizeCpf(cpf) {
  return cpf.replace(/\D/g, '');
}

/** @param {import('mysql2').RowDataPacket} row */
export function toDto(row) {
  const criado = row.criado_em;
  const criadoStr =
    criado instanceof Date
      ? criado.toISOString().slice(0, 10)
      : String(criado).slice(0, 10);

  return {
    id: Number(row.id),
    nome: row.nome,
    cpf: row.cpf,
    tipo: row.tipo,
    telefone: row.telefone,
    email: row.email,
    obs: row.observacoes,
    criadoEm: criadoStr,
  };
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} cpfDigits
 * @param {number | null} ignoreId
 */
export async function cpfExists(pool, cpfDigits, ignoreId) {
  const [rows] =
    ignoreId == null
      ? await pool.query('SELECT cpf FROM pessoas')
      : await pool.query('SELECT cpf FROM pessoas WHERE id != ?', [ignoreId]);

  return rows.some((r) => normalizeCpf(r.cpf) === cpfDigits);
}

/** @param {unknown} body */
export function validateSalvarPessoa(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Corpo JSON inválido.' };
  }
  const { nome, cpf, tipo, telefone } = /** @type {Record<string, unknown>} */ (body);
  if (typeof nome !== 'string' || !nome.trim()) {
    return { ok: false, error: 'Campo nome é obrigatório.' };
  }
  if (nome.trim().length > 150) {
    return { ok: false, error: 'Campo nome excede 150 caracteres.' };
  }
  if (typeof cpf !== 'string' || !cpf.trim()) {
    return { ok: false, error: 'Campo cpf é obrigatório.' };
  }
  if (cpf.trim().length > 14) {
    return { ok: false, error: 'Campo cpf excede 14 caracteres.' };
  }
  if (typeof tipo !== 'string' || !tipo.trim()) {
    return { ok: false, error: 'Campo tipo é obrigatório.' };
  }
  if (typeof telefone !== 'string' || !telefone.trim()) {
    return { ok: false, error: 'Campo telefone é obrigatório.' };
  }
  if (telefone.trim().length > 20) {
    return { ok: false, error: 'Campo telefone excede 20 caracteres.' };
  }
  const { email } = /** @type {Record<string, unknown>} */ (body);
  if (
    typeof email === 'string' &&
    email.trim().length > 0 &&
    email.trim().length > 150
  ) {
    return { ok: false, error: 'Campo email excede 150 caracteres.' };
  }
  return { ok: true };
}
