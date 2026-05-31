import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  toDto,
  normalizeCpf,
  cpfExists,
  validateSalvarPessoa,
} from '../pessoaHelpers.js';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function pessoasRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;
      const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;

      let sql =
        'SELECT id, nome, cpf, tipo, telefone, email, observacoes, criado_em FROM pessoas WHERE 1=1';
      const params = [];

      if (tipo && tipo.trim() !== '' && tipo !== 'todos') {
        sql += ' AND tipo = ?';
        params.push(tipo);
      }

      if (busca && busca.trim()) {
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
      res.json(rows.map(toDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(404).json({ mensagem: 'Não encontrado.' });
      }

      const [rows] = await pool.query(
        'SELECT id, nome, cpf, tipo, telefone, email, observacoes, criado_em FROM pessoas WHERE id = ?',
        [id]
      );

      if (!rows.length)
        return res.status(404).json({ mensagem: 'Não encontrado.' });
      res.json(toDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validateSalvarPessoa(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const { nome, cpf, tipo, telefone, email, obs } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfExists(pool, cpfDigits, null)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      const hoje = new Date();
      const criadoEm = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

      const emailVal =
        typeof email === 'string' && email.trim() ? email.trim() : null;
      const obsVal =
        typeof obs === 'string' && obs.trim() ? obs.trim() : null;

      const [result] = await pool.query(
        `INSERT INTO pessoas (nome, cpf, tipo, telefone, email, observacoes, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nome.trim(), cpf.trim(), tipo, telefone.trim(), emailVal, obsVal, criadoEm]
      );

      const insertId = result.insertId;
      const [created] = await pool.query(
        'SELECT id, nome, cpf, tipo, telefone, email, observacoes, criado_em FROM pessoas WHERE id = ?',
        [insertId]
      );

      const dto = toDto(created[0]);
      res.status(201).location(`/api/pessoas/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(404).json({ mensagem: 'Não encontrado.' });
      }

      const v = validateSalvarPessoa(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const [existing] = await pool.query('SELECT id FROM pessoas WHERE id = ?', [
        id,
      ]);
      if (!existing.length)
        return res.status(404).json({ mensagem: 'Não encontrado.' });

      const { nome, cpf, tipo, telefone, email, obs } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfExists(pool, cpfDigits, id)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      const emailVal =
        typeof email === 'string' && email.trim() ? email.trim() : null;
      const obsVal =
        typeof obs === 'string' && obs.trim() ? obs.trim() : null;

      await pool.query(
        `UPDATE pessoas SET nome = ?, cpf = ?, tipo = ?, telefone = ?, email = ?, observacoes = ?
       WHERE id = ?`,
        [nome.trim(), cpf.trim(), tipo, telefone.trim(), emailVal, obsVal, id]
      );

      const [rows] = await pool.query(
        'SELECT id, nome, cpf, tipo, telefone, email, observacoes, criado_em FROM pessoas WHERE id = ?',
        [id]
      );
      res.json(toDto(rows[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(404).end();
      }

      const [result] = await pool.query('DELETE FROM pessoas WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
