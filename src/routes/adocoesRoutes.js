import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import {
  toAdocaoDto,
  validateAdocao,
  assertPessoaAdotante,
} from '../helpers/adocaoHelpers.js';
import {
  existsById,
  parseRouteId,
  queryBusca,
  queryString,
  trimOrNull,
} from '../helpers/routeHelpers.js';
import { normalizeCpf, formatCpf } from '../helpers/cpfHelpers.js';

const TABLE = 'solicitacoes_adocao';
const ADOCAO_SELECT = `
  SELECT s.id, s.pessoa_id, s.nome_adotante, s.cpf, s.telefone, s.email, s.endereco,
         s.animal_id, s.motivo, s.tem_outros_animais, s.tem_criancas,
         s.tipo_residencia, s.aceita_termo, s.status, s.data_solicitacao,
         a.nome AS animal_nome, a.especie AS animal_especie
  FROM solicitacoes_adocao s
  INNER JOIN animais a ON a.id = s.animal_id
`;
const MSG_NAO_ENCONTRADO = 'Solicitação não encontrada.';

/**
 * @param {import('mysql2/promise').Pool} pool
 */
export function adocoesRouter(pool) {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const busca = queryBusca(req, ['nome']);
      const status = queryString(req, 'status');

      let sql = `${ADOCAO_SELECT} WHERE 1=1`;
      const params = [];

      if (busca?.trim()) {
        const term = `%${busca.trim().toLowerCase()}%`;
        sql += ` AND (
        LOWER(s.nome_adotante) LIKE ? OR
        s.cpf LIKE ? OR
        LOWER(a.nome) LIKE ?
      )`;
        params.push(term, `%${busca.trim()}%`, term);
      }

      if (status?.trim()) {
        sql += ' AND s.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY s.data_solicitacao DESC, s.nome_adotante ASC';

      const [rows] = await pool.query(sql, params);
      res.json(rows.map(toAdocaoDto));
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const [rows] = await pool.query(`${ADOCAO_SELECT} WHERE s.id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      res.json(toAdocaoDto(rows[0]));
    })
  );

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      const v = validateAdocao(req.body);
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      const {
        nomeAdotante,
        cpf,
        telefone,
        email,
        endereco,
        animalId,
        pessoaId,
        motivo,
        temOutrosAnimais,
        temCriancas,
        tipoResidencia,
        aceitaTermo,
        status,
      } = req.body;

      if (!(await existsById(pool, 'animais', animalId))) {
        return res.status(400).json({ mensagem: 'Animal não encontrado.' });
      }

      const errPessoa = await assertPessoaAdotante(pool, pessoaId ?? null);
      if (errPessoa) return res.status(400).json({ mensagem: errPessoa });

      const cpfDigits = normalizeCpf(cpf);
      const cpfStored = formatCpf(cpfDigits);

      const [result] = await pool.query(
        `INSERT INTO solicitacoes_adocao
      (pessoa_id, nome_adotante, cpf, telefone, email, endereco, animal_id, motivo,
       tem_outros_animais, tem_criancas, tipo_residencia, aceita_termo, status, data_solicitacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          pessoaId ?? null,
          nomeAdotante.trim(),
          cpfStored,
          telefone.trim(),
          email.trim(),
          trimOrNull(endereco),
          animalId,
          motivo.trim(),
          trimOrNull(temOutrosAnimais),
          trimOrNull(temCriancas),
          tipoResidencia.trim(),
          aceitaTermo ? 1 : 0,
          status || 'Pendente',
        ]
      );

      const [created] = await pool.query(`${ADOCAO_SELECT} WHERE s.id = ?`, [
        result.insertId,
      ]);

      const dto = toAdocaoDto(created[0]);
      res.status(201).location(`/api/adocoes/${dto.id}`).json(dto);
    })
  );

  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });

      const v = validateAdocao(req.body, { isUpdate: true });
      if (!v.ok) return res.status(400).json({ mensagem: v.error });

      if (!(await existsById(pool, TABLE, id))) {
        return res.status(404).json({ mensagem: MSG_NAO_ENCONTRADO });
      }

      const {
        nomeAdotante,
        cpf,
        telefone,
        email,
        endereco,
        animalId,
        pessoaId,
        motivo,
        temOutrosAnimais,
        temCriancas,
        tipoResidencia,
        aceitaTermo,
        status,
      } = req.body;

      if (!(await existsById(pool, 'animais', animalId))) {
        return res.status(400).json({ mensagem: 'Animal não encontrado.' });
      }

      const errPessoa = await assertPessoaAdotante(pool, pessoaId ?? null);
      if (errPessoa) return res.status(400).json({ mensagem: errPessoa });

      const cpfDigits = normalizeCpf(cpf);
      const cpfStored = formatCpf(cpfDigits);

      await pool.query(
        `UPDATE solicitacoes_adocao SET
        pessoa_id = ?, nome_adotante = ?, cpf = ?, telefone = ?, email = ?, endereco = ?,
        animal_id = ?, motivo = ?, tem_outros_animais = ?, tem_criancas = ?,
        tipo_residencia = ?, aceita_termo = ?, status = ?
      WHERE id = ?`,
        [
          pessoaId ?? null,
          nomeAdotante.trim(),
          cpfStored,
          telefone.trim(),
          email.trim(),
          trimOrNull(endereco),
          animalId,
          motivo.trim(),
          trimOrNull(temOutrosAnimais),
          trimOrNull(temCriancas),
          tipoResidencia.trim(),
          aceitaTermo ? 1 : 0,
          status || 'Pendente',
          id,
        ]
      );

      const [rows] = await pool.query(`${ADOCAO_SELECT} WHERE s.id = ?`, [id]);
      res.json(toAdocaoDto(rows[0]));
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseRouteId(req.params.id);
      if (!id) return res.status(404).end();

      const [result] = await pool.query('DELETE FROM solicitacoes_adocao WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).end();
      res.status(204).end();
    })
  );

  return r;
}
