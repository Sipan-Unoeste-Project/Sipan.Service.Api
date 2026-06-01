import { formatDateIso } from './dateHelpers.js';
import { fail, ok, requireObject } from './validationHelpers.js';

/** @param {import('mysql2').RowDataPacket} row */
export function toAnimalDto(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    especie: row.especie,
    raca: row.raca,
    sexo: row.sexo,
    dataNascimento: formatDateIso(row.data_nascimento),
    dataAcolhimento: formatDateIso(row.data_acolhimento),
    porte: row.porte,
    castrado: Boolean(row.castrado),
    vacinas: row.vacinas,
    sobre: row.sobre,
    foto: row.foto,
    status: row.status,
    dataCadastro: formatDateIso(row.data_cadastro),
  };
}

/** @param {unknown} body */
export function validateAnimal(body) {
  const invalid = requireObject(body);
  if (invalid) return invalid;

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
    return fail('Campo nome é obrigatório.');
  }
  if (nome.trim().length > 150) {
    return fail('Campo nome excede 150 caracteres.');
  }
  if (typeof especie !== 'string' || !especie.trim()) {
    return fail('Campo espécie é obrigatório.');
  }
  if (especie.trim().length > 100) {
    return fail('Campo espécie excede 100 caracteres.');
  }
  if (typeof raca === 'string' && raca.trim().length > 100) {
    return fail('Campo raça excede 100 caracteres.');
  }
  if (typeof sexo !== 'string' || !sexo.trim()) {
    return fail('Campo sexo é obrigatório.');
  }
  if (sexo.trim().length > 50) {
    return fail('Campo sexo excede 50 caracteres.');
  }
  if (typeof porte !== 'string' || !porte.trim()) {
    return fail('Campo porte é obrigatório.');
  }
  if (porte.trim().length > 50) {
    return fail('Campo porte excede 50 caracteres.');
  }
  if (typeof castrado !== 'boolean') {
    return fail('Campo castrado deve ser booleano.');
  }
  if (typeof vacinas === 'string' && vacinas.trim().length > 255) {
    return fail('Campo vacinas excede 255 caracteres.');
  }
  if (typeof sobre === 'string' && sobre.trim().length > 2000) {
    return fail('Campo sobre excede 2000 caracteres.');
  }
  if (typeof status !== 'string' || !status.trim()) {
    return fail('Campo status é obrigatório.');
  }
  if (status.trim().length > 50) {
    return fail('Campo status excede 50 caracteres.');
  }
  if (typeof foto === 'string' && foto.trim().length > 8000000) {
    return fail('Campo foto excede 8MB (base64).');
  }

  return ok();
}
