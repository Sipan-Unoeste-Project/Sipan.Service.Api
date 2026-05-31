import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { toAnimalDto, validateAnimal } from '../Helpers/animalHelpers.js';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function animaisRouter(pool) {
  const r = Router();

  r.get('/', asyncHandler(async (req, res) => {
    const { search, status } = req.query;

    let sql = `
      SELECT id, nome, especie, raca, sexo, data_nascimento, 
             data_acolhimento, porte, castrado, vacinas, sobre, 
             foto, status, data_cadastro 
      FROM animais WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ` AND (nome LIKE ? OR especie LIKE ? OR raca LIKE ? OR sobre LIKE ?)`;
      params.push(term, term, term, term);
    }

    if (status && status.trim()) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY data_cadastro DESC, nome ASC`;

    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toAnimalDto));
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).json({ mensagem: 'Animal não encontrado.' });
    }

    const [rows] = await pool.query(`
      SELECT id, nome, especie, raca, sexo, data_nascimento, 
             data_acolhimento, porte, castrado, vacinas, sobre, 
             foto, status, data_cadastro 
      FROM animais WHERE id = ?`, [id]);

    if (!rows.length) {
      return res.status(404).json({ mensagem: 'Animal não encontrado.' });
    }

    res.json(toAnimalDto(rows[0]));
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const v = validateAnimal(req.body);
    if (!v.ok) return res.status(400).json({ mensagem: v.error });

    const {
      nome, especie, raca, sexo, dataNascimento, dataAcolhimento,
      porte, castrado, vacinas, sobre, foto, status
    } = req.body;

    const [result] = await pool.query(`
      INSERT INTO animais 
      (nome, especie, raca, sexo, data_nascimento, data_acolhimento, 
       porte, castrado, vacinas, sobre, foto, status, data_cadastro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      nome.trim(),
      especie.trim(),
      raca?.trim() || null,
      sexo || 'Desconhecido',
      dataNascimento || null,
      dataAcolhimento || null,
      porte || 'Médio',
      castrado ? 1 : 0,
      vacinas?.trim() || null,
      sobre?.trim() || null,
      foto || null,
      status || 'Disponível'
    ]);

    const [created] = await pool.query('SELECT * FROM animais WHERE id = ?', [result.insertId]);
    res.status(201).json(toAnimalDto(created[0]));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).json({ mensagem: 'Animal não encontrado.' });
    }

    const v = validateAnimal(req.body);
    if (!v.ok) return res.status(400).json({ mensagem: v.error });

    const {
      nome, especie, raca, sexo, dataNascimento, dataAcolhimento,
      porte, castrado, vacinas, sobre, foto, status
    } = req.body;

    const [result] = await pool.query(`
      UPDATE animais SET 
        nome = ?, especie = ?, raca = ?, sexo = ?,
        data_nascimento = ?, data_acolhimento = ?, porte = ?,
        castrado = ?, vacinas = ?, sobre = ?, foto = ?, status = ?
      WHERE id = ?
    `, [
      nome.trim(), especie.trim(), raca?.trim() || null, sexo || 'Desconhecido',
      dataNascimento || null, dataAcolhimento || null, porte || 'Médio',
      castrado ? 1 : 0, vacinas?.trim() || null, sobre?.trim() || null,
      foto || null, status || 'Disponível', id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Animal não encontrado.' });
    }

    const [updated] = await pool.query('SELECT * FROM animais WHERE id = ?', [id]);
    res.json(toAnimalDto(updated[0]));
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(404).end();
    }

    const [result] = await pool.query('DELETE FROM animais WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Animal não encontrado.' });
    }

    res.status(204).end();
  }));

  return r;
}
