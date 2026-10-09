import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createPool } from './database/db.js';
import { pessoasRouter } from './routes/pessoasRoutes.js';
import { animaisRouter } from './routes/animaisRoutes.js';
import { voluntariosRouter } from './routes/voluntariosRoutes.js';
import { usuariosRouter } from './routes/usuariosRoutes.js';
import { apacEstoqueRouter } from './routes/apacEstoqueRoutes.js';
import { apacCampanhasRouter } from './routes/apacCampanhasRoutes.js';
import { apacDoacoesRouter } from './routes/apacDoacoesRoutes.js';
import { apacFinanceiroRouter } from './routes/apacFinanceiroRoutes.js';
import { apacDespesasRouter } from './routes/apacDespesasRoutes.js';
import { apacSaudeRouter } from './routes/apacSaudeRoutes.js';
import { adocoesRouter } from './routes/adocoesRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';
import { requirePermissao } from './middleware/requirePermissao.js';

const app = express();
const port = Number(process.env.PORT ?? 5089);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

const pool = createPool();

app.use(requireAuth(pool));
app.use(requirePermissao);

app.use('/api/auth', authRouter(pool));

app.use('/api/pessoas', pessoasRouter(pool));
app.use('/api/animais', animaisRouter(pool));
app.use('/api/voluntarios', voluntariosRouter(pool));
app.use('/api/usuarios', usuariosRouter(pool));
app.use('/api/adocoes', adocoesRouter(pool));

app.use('/api/estoque', apacEstoqueRouter(pool));
app.use('/api/campanhas', apacCampanhasRouter(pool));
app.use('/api/doacoes', apacDoacoesRouter(pool));
app.use('/api/financeiro', apacFinanceiroRouter(pool));
app.use('/api/despesas', apacDespesasRouter(pool));
app.use('/api/saude', apacSaudeRouter(pool));

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensagem: 'Corpo JSON inválido.' });
  }

  if (err.message?.includes('CORS')) {
    return res.status(403).json({ mensagem: err.message });
  }

  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(503).json({
      mensagem:
        'Tabela do banco não encontrada. No diretório Sipan.Service.Api, execute: npm run migrate',
    });
  }

  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return res.status(503).json({
      mensagem:
        'Coluna do banco incompatível com a API. No diretório Sipan.Service.Api, execute npm run migrate e reinicie a API.',
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(409).json({
      mensagem:
        'Não é possível excluir este registro porque existem dados vinculados que precisam ser preservados.',
    });
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      mensagem: 'Não foi possível conectar ao MySQL. Verifique se o banco está em execução.',
    });
  }

  res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`Sipan API em http://localhost:${port}`);
});