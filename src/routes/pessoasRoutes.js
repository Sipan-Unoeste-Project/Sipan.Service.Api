import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  toPessoaDto,
  normalizeCpf,
  cpfExists,
  validatePessoa,
} from '../helpers/pessoaHelpers.js';
import {
  existsById,
  parseRouteId,
  queryBusca,
  queryString,
  trimOrNull,
} from '../helpers/routeHelpers.js';

const TABLE = 'pessoas';
const PESSOA_SELECT = `
  SELECT id, nome, cpf, tipo, telefone, email, observacoes, criado_em
  FROM pessoas
`;
const MSG_NAO_ENCONTRADO = 'Pessoa não encontrada.';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function pessoasRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const tipo = queryString(req, 'tipo');
      const busca = queryBusca(req);

      let sql = `${PESSOA_SELECT} WHERE 1=1`;
      const params = [];

      if (tipo && tipo.trim() !== '' && tipo !== 'todos') {
        sql += ' AND tipo = ?';
        params.push(tipo);
      }

      if (busca?.trim()) {
        const raw = busca.trim();
        const qLower = `%${raw.toLowerCase()}%`;
        const qAny = `%${raw}%`;
        sql += ` AND (
        LOWER(nome) LIKE ? OR
        cpf LIKE ? OR
        telefone LIKE ? OR
        (email IS NOT NULL AND LOWER(email) LIKE ?)
      )`;
        params.push(qLower, qAny, qAny, qLower);
      }

      sql += ' ORDER BY criado_em DESC, nome ASC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toPessoaDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${PESSOA_SELECT} WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toPessoaDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validatePessoa(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const { nome, cpf, tipo, telefone, email, obs } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfExists(pool, cpfDigits, null)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      const [result] = await pool.query(
        `INSERT INTO pessoas (nome, cpf, tipo, telefone, email, observacoes, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE)`,
        [nome.trim(), cpfDigits, tipo, telefone.trim(), trimOrNull(email), trimOrNull(obs)]
      );

      const [created] = await pool.query(`${PESSOA_SELECT} WHERE id = ?`, [
        result.insertId,
      ]);

      const dto = toPessoaDto(created[0]);
      res.status(201).location(`/api/pessoas/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const v = validatePessoa(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      if (!(await existsById(pool, TABLE, id))) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const { nome, cpf, tipo, telefone, email, obs } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfExists(pool, cpfDigits, id)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      await pool.query(
        `UPDATE pessoas SET nome = ?, cpf = ?, tipo = ?, telefone = ?, email = ?, observacoes = ?
       WHERE id = ?`,
        [nome.trim(), cpfDigits, tipo, telefone.trim(), trimOrNull(email), trimOrNull(obs), id]
      );

      const [rows] = await pool.query(`${PESSOA_SELECT} WHERE id = ?`, [id]);
      res.json(toPessoaDto(rows[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM pessoas WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
