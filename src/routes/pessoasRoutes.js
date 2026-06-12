import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  toPessoaDto,
  normalizeCpf,
  normalizeCep,
  cpfExists,
  validatePessoa,
  savePessoaTipos,
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
  SELECT p.id, p.nome, p.cpf, p.telefone, p.email,
         p.cep, p.endereco, p.numero, p.bairro, p.cidade, p.estado,
         p.observacoes, p.criado_em,
         (SELECT GROUP_CONCAT(pt.tipo ORDER BY pt.tipo SEPARATOR ',')
          FROM pessoa_tipos pt WHERE pt.pessoa_id = p.id) AS tipos
  FROM pessoas p
`;

/** @param {Record<string, unknown>} body */
function enderecoParams(body) {
  const cep = normalizeCep(body.cep);
  return [
    cep || null,
    trimOrNull(body.endereco),
    trimOrNull(body.numero),
    trimOrNull(body.bairro),
    trimOrNull(body.cidade),
    typeof body.estado === 'string' && body.estado.trim()
      ? body.estado.trim().toUpperCase()
      : null,
  ];
}
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
        sql += ` AND EXISTS (
          SELECT 1 FROM pessoa_tipos ptf
          WHERE ptf.pessoa_id = p.id AND ptf.tipo = ?
        )`;
        params.push(tipo);
      }

      if (busca?.trim()) {
        const raw = busca.trim();
        const qLower = `%${raw.toLowerCase()}%`;
        const qAny = `%${raw}%`;
        sql += ` AND (
        LOWER(p.nome) LIKE ? OR
        p.cpf LIKE ? OR
        p.telefone LIKE ? OR
        (p.email IS NOT NULL AND LOWER(p.email) LIKE ?) OR
        p.cep LIKE ? OR
        LOWER(p.endereco) LIKE ? OR
        p.numero LIKE ? OR
        LOWER(p.bairro) LIKE ? OR
        LOWER(p.cidade) LIKE ? OR
        UPPER(p.estado) LIKE ?
      )`;
        params.push(qLower, qAny, qAny, qLower, qAny, qLower, qAny, qLower, qLower, qAny);
      }

      sql += ' ORDER BY p.nome ASC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toPessoaDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${PESSOA_SELECT} WHERE p.id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toPessoaDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validatePessoa(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const { nome, cpf, telefone, email, obs } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfExists(pool, cpfDigits, null)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      const [result] = await pool.query(
        `INSERT INTO pessoas
        (nome, cpf, telefone, email, cep, endereco, numero, bairro, cidade, estado, observacoes, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)`,
        [
          nome.trim(),
          cpfDigits,
          telefone.trim(),
          trimOrNull(email),
          ...enderecoParams(req.body),
          trimOrNull(obs),
        ]
      );

      const pessoaId = result.insertId;
      await savePessoaTipos(pool, pessoaId, v.tipos);

      const [created] = await pool.query(`${PESSOA_SELECT} WHERE p.id = ?`, [pessoaId]);
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

      const { nome, cpf, telefone, email, obs } = req.body;
      const cpfDigits = normalizeCpf(cpf);
      if (await cpfExists(pool, cpfDigits, id)) {
        return res.status(409).json({ mensagem: 'CPF já cadastrado.' });
      }

      await pool.query(
        `UPDATE pessoas SET
          nome = ?, cpf = ?, telefone = ?, email = ?,
          cep = ?, endereco = ?, numero = ?, bairro = ?, cidade = ?, estado = ?,
          observacoes = ?
       WHERE id = ?`,
        [
          nome.trim(),
          cpfDigits,
          telefone.trim(),
          trimOrNull(email),
          ...enderecoParams(req.body),
          trimOrNull(obs),
          id,
        ]
      );

      await savePessoaTipos(pool, id, v.tipos);

      const [rows] = await pool.query(`${PESSOA_SELECT} WHERE p.id = ?`, [id]);
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
