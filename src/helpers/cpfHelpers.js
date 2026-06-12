const CPF_TABLES = new Set(['pessoas', 'voluntarios']);

/** @param {string} cpf */
export function normalizeCpf(cpf) {
  return cpf.replace(/\D/g, '');
}

/** @param {string} digits */
export function formatCpf(digits) {
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {'pessoas' | 'voluntarios'} table
 * @param {string} cpfDigits
 * @param {number | null} ignoreId
 */
export async function cpfExistsInTable(pool, table, cpfDigits, ignoreId) {
  if (!CPF_TABLES.has(table)) {
    throw new Error(`Tabela inválida para CPF: ${table}`);
  }
  const sql = `
    SELECT id FROM ${table}
    WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
    ${ignoreId != null ? 'AND id != ?' : ''}
    LIMIT 1
  `;
  const params = ignoreId != null ? [cpfDigits, ignoreId] : [cpfDigits];
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}