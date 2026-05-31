/** @param {unknown} value */
const formatDate = (value) => {
  if (value == null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
};

/** @param {import('mysql2').RowDataPacket} row */
export function toAnimalDto(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    especie: row.especie,
    raca: row.raca,
    sexo: row.sexo,
    dataNascimento: formatDate(row.data_nascimento),
    dataAcolhimento: formatDate(row.data_acolhimento),
    porte: row.porte,
    castrado: Boolean(row.castrado),
    vacinas: row.vacinas,
    sobre: row.sobre,
    foto: row.foto,
    status: row.status,
    dataCadastro: formatDate(row.data_cadastro),
  };
}

/** @param {unknown} body */
export function validateAnimal(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Corpo JSON inválido.' };
  }

  const {
    nome,
    especie,
    raca,
    sexo,
    porte,
    castrado,
    vacinas,
    sobre,
    status,
    foto,
  } = /** @type {Record<string, unknown>} */ (body);

  if (typeof nome !== 'string' || !nome.trim()) {
    return { ok: false, error: 'Campo nome é obrigatório.' };
  }
  if (nome.trim().length > 150) {
    return { ok: false, error: 'Campo nome excede 150 caracteres.' };
  }

  if (typeof especie !== 'string' || !especie.trim()) {
    return { ok: false, error: 'Campo espécie é obrigatório.' };
  }
  if (especie.trim().length > 100) {
    return { ok: false, error: 'Campo espécie excede 100 caracteres.' };
  }

  if (typeof raca === 'string' && raca.trim().length > 100) {
    return { ok: false, error: 'Campo raça excede 100 caracteres.' };
  }

  if (typeof sexo !== 'string' || !sexo.trim()) {
    return { ok: false, error: 'Campo sexo é obrigatório.' };
  }
  if (sexo.trim().length > 50) {
    return { ok: false, error: 'Campo sexo excede 50 caracteres.' };
  }

  if (typeof porte !== 'string' || !porte.trim()) {
    return { ok: false, error: 'Campo porte é obrigatório.' };
  }
  if (porte.trim().length > 50) {
    return { ok: false, error: 'Campo porte excede 50 caracteres.' };
  }

  if (typeof castrado !== 'boolean') {
    return { ok: false, error: 'Campo castrado deve ser booleano.' };
  }

  if (typeof vacinas === 'string' && vacinas.trim().length > 255) {
    return { ok: false, error: 'Campo vacinas excede 255 caracteres.' };
  }

  if (typeof sobre === 'string' && sobre.trim().length > 2000) {
    return { ok: false, error: 'Campo sobre excede 2000 caracteres.' };
  }

  if (typeof status !== 'string' || !status.trim()) {
    return { ok: false, error: 'Campo status é obrigatório.' };
  }
  if (status.trim().length > 50) {
    return { ok: false, error: 'Campo status excede 50 caracteres.' };
  }

  if (typeof foto === 'string' && foto.trim().length > 8000000) {
    return { ok: false, error: 'Campo foto excede 8MB (base64).' };
  }

  return { ok: true };
}
