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
         r.data_registro, r.veterinario, r.criado_por_id, r.criado_por_nome,
         r.alterado_por_id, r.alterado_por_nome, r.updated_at, r.anulada_em,
         r.anulada_por_id, r.anulada_por_nome, r.motivo_anulacao
  FROM apac_saude_registros r
  INNER JOIN animais a ON a.id = r.animal_id
`;

const VACINA_SELECT = `
  SELECT v.id, v.animal_id, a.nome AS animal_nome, v.nome, v.data_aplicada,
         v.data_proxima, v.descricao, v.veterinario, v.criado_por_id,
         v.criado_por_nome, v.alterado_por_id, v.alterado_por_nome, v.updated_at,
         v.anulada_em, v.anulada_por_id, v.anulada_por_nome, v.motivo_anulacao,
         v.status
  FROM apac_saude_vacinas v
  INNER JOIN animais a ON a.id = v.animal_id
`;

function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function auditoriaAnulacao(row) {
  return {
    anulada_em: row.anulada_em,
    anulada_por_id: row.anulada_por_id != null ? Number(row.anulada_por_id) : null,
    anulada_por_nome: row.anulada_por_nome,
    motivo_anulacao: row.motivo_anulacao,
  };
}

export function apacSaudeRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const animalId = parseRouteId(req.query.animal_id);
      const incluirAnulados = req.query.incluir_anulados === 'true';

      let regSql = `${REGISTRO_SELECT} WHERE 1=1`;
      let vacSql = `${VACINA_SELECT} WHERE 1=1`;
      const params = [];

      if (!incluirAnulados) {
        regSql += ' AND r.anulada_em IS NULL';
        vacSql += ' AND v.anulada_em IS NULL';
      }

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
          criado_por_id: row.criado_por_id != null ? Number(row.criado_por_id) : null,
          criado_por_nome: row.criado_por_nome,
          alterado_por_id: row.alterado_por_id != null ? Number(row.alterado_por_id) : null,
          alterado_por_nome: row.alterado_por_nome,
          updated_at: row.updated_at,
          ...auditoriaAnulacao(row),
        })),
        vacinas: vacinas.map((v) => ({
          id: Number(v.id),
          animal_id: Number(v.animal_id),
          animal_nome: v.animal_nome,
          nome: v.nome,
          data_aplicada: formatDateIso(v.data_aplicada),
          data_proxima: formatDateIso(v.data_proxima),
          descricao: v.descricao,
          veterinario: v.veterinario,
          criado_por_id: v.criado_por_id != null ? Number(v.criado_por_id) : null,
          criado_por_nome: v.criado_por_nome,
          alterado_por_id: v.alterado_por_id != null ? Number(v.alterado_por_id) : null,
          alterado_por_nome: v.alterado_por_nome,
          updated_at: v.updated_at,
          ...auditoriaAnulacao(v),
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
        getTodayIsoDate();
      if (data > getTodayIsoDate()) {
        return res.status(400).json({
          mensagem: 'A data do atendimento não pode ser futura.',
        });
      }

      const vet =
        trimOrNull(req.body.veterinario) || trimOrNull(req.body.vet);
      const criadoPorId = req.usuario.id;
      const criadoPorNome = req.usuario.nome || req.usuario.login;

      const [result] = await pool.query(
        `INSERT INTO apac_saude_registros
        (animal_id, tipo, titulo, descricao, data_registro, veterinario,
         criado_por_id, criado_por_nome)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          animalId,
          tipo,
          titulo,
          trimOrNull(req.body.descricao),
          data,
          vet,
          criadoPorId,
          criadoPorNome,
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
        criado_por_id: Number(row.criado_por_id),
        criado_por_nome: row.criado_por_nome,
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
      if (proxima && proxima < aplicada) {
        return res.status(400).json({
          mensagem: 'A data da próxima vacina não pode ser anterior à data da vacina.',
        });
      }

      const status =
        typeof req.body.status === 'string' && req.body.status.trim()
          ? req.body.status.trim()
          : 'em_dia';
      const descricao = trimOrNull(req.body.descricao);
      const veterinario =
        trimOrNull(req.body.veterinario) || trimOrNull(req.body.vet);
      const criadoPorId = req.usuario.id;
      const criadoPorNome = req.usuario.nome || req.usuario.login;

      const [result] = await pool.query(
        `INSERT INTO apac_saude_vacinas
         (animal_id, nome, data_aplicada, data_proxima, descricao, veterinario,
          criado_por_id, criado_por_nome, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          animalId,
          nome,
          aplicada,
          proxima,
          descricao,
          veterinario,
          criadoPorId,
          criadoPorNome,
          status,
        ]
      );

      const [rows] = await pool.query(`${VACINA_SELECT} WHERE v.id = ?`, [
        result.insertId,
      ]);
      const v = rows[0];
      res.status(201).json({
        id: Number(v.id),
        animal_id: Number(v.animal_id),
        animal_nome: v.animal_nome,
        nome: v.nome,
        data_aplicada: formatDateIso(v.data_aplicada),
        data_proxima: formatDateIso(v.data_proxima),
        descricao: v.descricao,
        veterinario: v.veterinario,
        criado_por_id: Number(v.criado_por_id),
        criado_por_nome: v.criado_por_nome,
        status: v.status,
      });
    })
  );

  r.put(
    '/registros/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: 'Registro não encontrado.' });

      const invalid = requireObject(req.body);
      if (invalid) return res.status(400).json({ mensagem: invalid.error });

      const animalId = parseRouteId(req.body.animal_id);
      if (!animalId || !(await existsById(pool, 'animais', animalId))) {
        return res.status(400).json({ mensagem: 'Campo animal_id inválido.' });
      }

      const tipo = req.body.tipo;
      const titulo = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
      if (!titulo) return res.status(400).json({ mensagem: 'Campo titulo é obrigatório.' });
      if (!['consulta', 'vacina', 'exame', 'cirurgia'].includes(tipo)) {
        return res.status(400).json({ mensagem: 'Campo tipo inválido.' });
      }

      const data =
        parseDateInput(req.body.data_registro) ||
        parseDateInput(req.body.data) ||
        getTodayIsoDate();
      if (data > getTodayIsoDate()) {
        return res.status(400).json({
          mensagem: 'A data do atendimento não pode ser futura.',
        });
      }
      const vet = trimOrNull(req.body.veterinario) || trimOrNull(req.body.vet);
      const alteradoPorId = req.usuario.id;
      const alteradoPorNome = req.usuario.nome || req.usuario.login;

      const [result] = await pool.query(
        `UPDATE apac_saude_registros
         SET animal_id = ?, tipo = ?, titulo = ?, descricao = ?, data_registro = ?,
             veterinario = ?, alterado_por_id = ?, alterado_por_nome = ?
         WHERE id = ? AND anulada_em IS NULL`,
        [
          animalId,
          tipo,
          titulo,
          trimOrNull(req.body.descricao),
          data,
          vet,
          alteradoPorId,
          alteradoPorNome,
          id,
        ]
      );
      if (result.affectedRows === 0) {
        const [existing] = await pool.query(
          'SELECT anulada_em FROM apac_saude_registros WHERE id = ?',
          [id]
        );
        if (!existing.length) {
          return res.status(404).json({ mensagem: 'Registro não encontrado.' });
        }
        if (existing[0].anulada_em) {
          return res.status(409).json({
            mensagem: 'Registros anulados não podem ser editados.',
          });
        }
      }

      const [rows] = await pool.query(`${REGISTRO_SELECT} WHERE r.id = ?`, [id]);
      const row = rows[0];
      res.json({
        id: Number(row.id),
        animal_id: Number(row.animal_id),
        animal_nome: row.animal_nome,
        tipo: row.tipo,
        titulo: row.titulo,
        descricao: row.descricao,
        data_registro: formatDateIso(row.data_registro),
        veterinario: row.veterinario,
        criado_por_id: row.criado_por_id != null ? Number(row.criado_por_id) : null,
        criado_por_nome: row.criado_por_nome,
        alterado_por_id: row.alterado_por_id != null ? Number(row.alterado_por_id) : null,
        alterado_por_nome: row.alterado_por_nome,
        updated_at: row.updated_at,
        ...auditoriaAnulacao(row),
      });
    })
  );

  r.delete(
    '/registros/:id',
    (_req, res) =>
      res.status(405).json({
        mensagem: 'Exclusão permanente desativada. Use a operação de anulação com justificativa.',
      })
  );

  r.post(
    '/registros/:id/anular',
    asyncHandler(async (req, res) => anularRegistro(pool, req, res, 'apac_saude_registros'))
  );

  r.put(
    '/vacinas/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: 'Vacina não encontrada.' });

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
      if (proxima && proxima < aplicada) {
        return res.status(400).json({
          mensagem: 'A data da próxima vacina não pode ser anterior à data da vacina.',
        });
      }
      const status =
        typeof req.body.status === 'string' && req.body.status.trim()
          ? req.body.status.trim()
          : 'em_dia';
      const descricao = trimOrNull(req.body.descricao);
      const veterinario =
        trimOrNull(req.body.veterinario) || trimOrNull(req.body.vet);
      const alteradoPorId = req.usuario.id;
      const alteradoPorNome = req.usuario.nome || req.usuario.login;

      const [result] = await pool.query(
        `UPDATE apac_saude_vacinas
         SET animal_id = ?, nome = ?, data_aplicada = ?, data_proxima = ?,
             descricao = ?, veterinario = ?, status = ?, alterado_por_id = ?,
             alterado_por_nome = ?
         WHERE id = ? AND anulada_em IS NULL`,
        [
          animalId,
          nome,
          aplicada,
          proxima,
          descricao,
          veterinario,
          status,
          alteradoPorId,
          alteradoPorNome,
          id,
        ]
      );
      if (result.affectedRows === 0) {
        const [existing] = await pool.query(
          'SELECT anulada_em FROM apac_saude_vacinas WHERE id = ?',
          [id]
        );
        if (!existing.length) {
          return res.status(404).json({ mensagem: 'Vacina não encontrada.' });
        }
        if (existing[0].anulada_em) {
          return res.status(409).json({
            mensagem: 'Registros anulados não podem ser editados.',
          });
        }
      }

      const [rows] = await pool.query(`${VACINA_SELECT} WHERE v.id = ?`, [id]);
      const v = rows[0];
      res.json({
        id: Number(v.id),
        animal_id: Number(v.animal_id),
        animal_nome: v.animal_nome,
        nome: v.nome,
        data_aplicada: formatDateIso(v.data_aplicada),
        data_proxima: formatDateIso(v.data_proxima),
        descricao: v.descricao,
        veterinario: v.veterinario,
        criado_por_id: v.criado_por_id != null ? Number(v.criado_por_id) : null,
        criado_por_nome: v.criado_por_nome,
        alterado_por_id: v.alterado_por_id != null ? Number(v.alterado_por_id) : null,
        alterado_por_nome: v.alterado_por_nome,
        updated_at: v.updated_at,
        ...auditoriaAnulacao(v),
        status: v.status,
      });
    })
  );

  r.delete(
    '/vacinas/:id',
    (_req, res) =>
      res.status(405).json({
        mensagem: 'Exclusão permanente desativada. Use a operação de anulação com justificativa.',
      })
  );

  r.post(
    '/vacinas/:id/anular',
    asyncHandler(async (req, res) => anularRegistro(pool, req, res, 'apac_saude_vacinas'))
  );

  return r;
}

async function anularRegistro(pool, req, res, tabela) {
  if (!['Administrador', 'Veterinário'].includes(req.usuario?.permissao)) {
    return res.status(403).json({
      mensagem: 'Somente Administradores e Veterinários podem anular registros de saúde.',
    });
  }

  const id = parseRouteId(req.params.id);
  if (!id) return res.status(404).json({ mensagem: 'Registro não encontrado.' });

  const invalid = requireObject(req.body);
  if (invalid) return res.status(400).json({ mensagem: invalid.error });

  const motivo = typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
  if (!motivo) {
    return res.status(400).json({ mensagem: 'Informe o motivo da anulação.' });
  }
  if (motivo.length > 500) {
    return res.status(400).json({ mensagem: 'O motivo da anulação excede 500 caracteres.' });
  }

  const [result] = await pool.query(
    `UPDATE ${tabela}
     SET anulada_em = CURRENT_TIMESTAMP, anulada_por_id = ?, anulada_por_nome = ?,
         motivo_anulacao = ?
     WHERE id = ? AND anulada_em IS NULL`,
    [req.usuario.id, req.usuario.nome || req.usuario.login, motivo, id]
  );

  if (result.affectedRows === 0) {
    const [existing] = await pool.query(
      `SELECT anulada_em FROM ${tabela} WHERE id = ?`,
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ mensagem: 'Registro não encontrado.' });
    }
    return res.status(409).json({ mensagem: 'Este registro já foi anulado.' });
  }

  const [rows] = await pool.query(
    `SELECT anulada_em, anulada_por_id, anulada_por_nome, motivo_anulacao
     FROM ${tabela} WHERE id = ?`,
    [id]
  );
  return res.json({ id, ...auditoriaAnulacao(rows[0]) });
}
