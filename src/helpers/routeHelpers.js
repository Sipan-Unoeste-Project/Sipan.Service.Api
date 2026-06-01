const TABLES = new Set([
  'pessoas',
  'animais',
  'funcionarios',
  'usuarios',
  'apac_estoque',
  'apac_campanhas',
  'apac_doacoes',
  'apac_financeiro_entradas',
  'apac_financeiro_saidas',
  'apac_despesa_categorias',
  'apac_despesas',
  'apac_saude_registros',
  'apac_saude_vacinas',
]);

/** @param {unknown} value */
export function parseRouteId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

/** @param {import('express').Request} req @param {string} name */
export function queryString(req, name) {
  const value = req.query[name];
  return typeof value === 'string' ? value : undefined;
}

/**
 * @param {import('express').Request} req
 * @param {string[]} [aliases]
 */
export function queryBusca(req, aliases = []) {
  const busca = queryString(req, 'busca');
  if (busca) return busca;
  for (const alias of aliases) {
    const value = queryString(req, alias);
    if (value) return value;
  }
  return undefined;
}

/** @param {unknown} value */
export function trimOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * @param {unknown} status
 * @param {string} defaultStatus
 */
export function statusOrDefault(status, defaultStatus) {
  return typeof status === 'string' && status.trim() ? status.trim() : defaultStatus;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} table
 * @param {number} id
 */
export async function existsById(pool, table, id) {
  if (!TABLES.has(table)) {
    throw new Error(`Tabela inválida: ${table}`);
  }
  const [rows] = await pool.query(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0;
}
