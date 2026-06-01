import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { formatDateIso, parseDateInput } from '../helpers/dateHelpers.js';
import { requireObject } from '../helpers/validationHelpers.js';
import {
  existsById,
  parseRouteId,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const REGISTRO_SELECT = `
  SELECT r.id, r.animal_id, a.nome AS animal_nome, r.tipo, r.titulo, r.descricao,
         r.data_registro, r.veterinario
  FROM apac_saude_registros r
  INNER JOIN animais a ON a.id = r.animal_id
`;

const VACINA_SELECT = `
  SELECT v.id, v.animal_id, v.nome, v.data_aplicada, v.data_proxima, v.status
  FROM apac_saude_vacinas v
`;

/** @param {import('mysql2/promise').Pool} pool */
export function apacSaudeRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const animalId = parseRouteId(req.query.animal_id);

      let regSql = `${REGISTRO_SELECT} WHERE 1=1`;
      let vacSql = `${VACINA_SELECT} WHERE 1=1`;
      const params = [];

      if (animalId) {
        regSql += ' AND r.animal_id = ?';
        vacSql += ' AND v.animal_id = ?';
        params.push(animalId);
      }

      regSql += ' ORDER BY r.data_registro DESC, r.id DESC';
      vacSql += ' ORDER BY v.data_aplicada DESC, v.id DESC';

      const [registros] = await pool.query(regSql, params);
      const [vacinas] = await pool.query(vacSql, params);

      res.json({
        registros: registros.map((row) => ({
          id: Number(row.id),
          animal_id: Number(row.animal_id),
          animal_nome: row.animal_nome,
          tipo: row.tipo,
          titulo: row.titulo,
          descricao: row.descricao,
          data_registro: formatDateIso(row.data_registro),
          veterinario: row.veterinario,
        })),
        vacinas: vacinas.map((v) => ({
          id: Number(v.id),
          animal_id: Number(v.animal_id),
          nome: v.nome,
          data_aplicada: formatDateIso(v.data_aplicada),
          data_proxima: formatDateIso(v.data_proxima),
          status: v.status,
        })),
      });
    })
  );

  r.post(
    '/registros',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const animalId = parseRouteId(req.body.animal_id);
      if (!animalId || !(await existsById(pool, 'animais', animalId))) {
        return res.status(400).json({ mensagem: 'Campo animal_id inválido.' });
      }

      const tipo = req.body.tipo;
      const titulo = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
      if (!titulo) {
        return res.status(400).json({ mensagem: 'Campo titulo é obrigatório.' });
      }
      if (!['consulta', 'vacina', 'exame', 'cirurgia'].includes(tipo)) {
        return res.status(400).json({ mensagem: 'Campo tipo inválido.' });
      }

      const data =
        parseDateInput(req.body.data_registro) ||
        parseDateInput(req.body.data) ||
        new Date().toISOString().slice(0, 10);

      const vet =
        trimOrNull(req.body.veterinario) || trimOrNull(req.body.vet);

      const [result] = await pool.query(
        `INSERT INTO apac_saude_registros
        (animal_id, tipo, titulo, descricao, data_registro, veterinario)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          animalId,
          tipo,
          titulo,
          trimOrNull(req.body.descricao),
          data,
          vet,
        ]
      );

      const [rows] = await pool.query(`${REGISTRO_SELECT} WHERE r.id = ?`, [
        result.insertId,
      ]);
      const row = rows[0];
      res.status(201).json({
        id: Number(row.id),
        animal_id: Number(row.animal_id),
        animal_nome: row.animal_nome,
        tipo: row.tipo,
        titulo: row.titulo,
        descricao: row.descricao,
        data_registro: formatDateIso(row.data_registro),
        veterinario: row.veterinario,
      });
    })
  );

  r.post(
    '/vacinas',
    asyncHandler(async (req, res) => {
      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const animalId = parseRouteId(req.body.animal_id);
      if (!animalId || !(await existsById(pool, 'animais', animalId))) {
        return res.status(400).json({ mensagem: 'Campo animal_id inválido.' });
      }

      const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
      if (!nome) return res.status(400).json({ mensagem: 'Campo nome é obrigatório.' });

      const aplicada =
        parseDateInput(req.body.data_aplicada) ||
        parseDateInput(req.body.aplicada) ||
        new Date().toISOString().slice(0, 10);

      const proxima =
        parseDateInput(req.body.data_proxima) || parseDateInput(req.body.proxima);

      const status =
        typeof req.body.status === 'string' && req.body.status.trim()
          ? req.body.status.trim()
          : 'em_dia';

      const [result] = await pool.query(
        `INSERT INTO apac_saude_vacinas (animal_id, nome, data_aplicada, data_proxima, status)
         VALUES (?, ?, ?, ?, ?)`,
        [animalId, nome, aplicada, proxima, status]
      );

      const [rows] = await pool.query(`${VACINA_SELECT} WHERE v.id = ?`, [
        result.insertId,
      ]);
      const v = rows[0];
      res.status(201).json({
        id: Number(v.id),
        animal_id: Number(v.animal_id),
        nome: v.nome,
        data_aplicada: formatDateIso(v.data_aplicada),
        data_proxima: formatDateIso(v.data_proxima),
        status: v.status,
      });
    })
  );

  return r;
}
