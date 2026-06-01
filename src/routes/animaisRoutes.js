import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { toAnimalDto, validateAnimal } from '../helpers/animalHelpers.js';
import {
  existsById,
  parseRouteId,
  queryBusca,
  queryString,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const TABLE = 'animais';
const ANIMAL_SELECT = `
  SELECT id, nome, especie, raca, sexo, data_nascimento,
         data_acolhimento, porte, castrado, vacinas, sobre,
         foto, status, data_cadastro
  FROM animais
`;
const MSG_NAO_ENCONTRADO = 'Animal não encontrado.';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function animaisRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const busca = queryBusca(req, ['search']);
      const status = queryString(req, 'status');

      let sql = `${ANIMAL_SELECT} WHERE 1=1`;
      const params = [];

      if (busca?.trim()) {
        const term = `%${busca.trim().toLowerCase()}%`;
        sql += ` AND (
        LOWER(nome) LIKE ? OR
        LOWER(especie) LIKE ? OR
        LOWER(raca) LIKE ? OR
        LOWER(sobre) LIKE ?
      )`;
        params.push(term, term, term, term);
      }

      if (status?.trim()) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY data_cadastro DESC, nome ASC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toAnimalDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${ANIMAL_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toAnimalDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validateAnimal(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const {
        nome,
        especie,
        raca,
        sexo,
        dataNascimento,
        dataAcolhimento,
        porte,
        castrado,
        vacinas,
        sobre,
        foto,
        status,
      } = req.body;

      const [result] = await pool.query(
        `INSERT INTO animais
      (nome, especie, raca, sexo, data_nascimento, data_acolhimento,
       porte, castrado, vacinas, sobre, foto, status, data_cadastro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          nome.trim(),
          especie.trim(),
          trimOrNull(raca),
          sexo || 'Desconhecido',
          dataNascimento || null,
          dataAcolhimento || null,
          porte || 'Médio',
          castrado ? 1 : 0,
          trimOrNull(vacinas),
          trimOrNull(sobre),
          foto || null,
          status || 'Disponível',
        ]
      );

      const [created] = await pool.query(`${ANIMAL_SELECT} WHERE id = ?`, [
        result.insertId,
      ]);

      const dto = toAnimalDto(created[0]);
      res.status(201).location(`/api/animais/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const v = validateAnimal(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      if (!(await existsById(pool, TABLE, id))) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const {
        nome,
        especie,
        raca,
        sexo,
        dataNascimento,
        dataAcolhimento,
        porte,
        castrado,
        vacinas,
        sobre,
        foto,
        status,
      } = req.body;

      await pool.query(
        `UPDATE animais SET
        nome = ?, especie = ?, raca = ?, sexo = ?,
        data_nascimento = ?, data_acolhimento = ?, porte = ?,
        castrado = ?, vacinas = ?, sobre = ?, foto = ?, status = ?
      WHERE id = ?`,
        [
          nome.trim(),
          especie.trim(),
          trimOrNull(raca),
          sexo || 'Desconhecido',
          dataNascimento || null,
          dataAcolhimento || null,
          porte || 'Médio',
          castrado ? 1 : 0,
          trimOrNull(vacinas),
          trimOrNull(sobre),
          foto || null,
          status || 'Disponível',
          id,
        ]
      );

      const [rows] = await pool.query(`${ANIMAL_SELECT} WHERE id = ?`, [id]);
      res.json(toAnimalDto(rows[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM animais WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
