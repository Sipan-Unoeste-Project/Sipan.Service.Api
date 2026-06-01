import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createPool } from './database/db.js';
import { pessoasRouter } from './routes/pessoasRoutes.js';
import { animaisRouter } from './routes/animaisRoutes.js';
import { funcionariosRouter } from './routes/funcionariosRoutes.js';
import { usuariosRouter } from './routes/usuariosRoutes.js';
import { apacEstoqueRouter } from './routes/apacEstoqueRoutes.js';
import { apacCampanhasRouter } from './routes/apacCampanhasRoutes.js';

const app = express();
const port = Number(process.env.PORT ?? 5089);

app.use(express.json());

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

const pool = createPool();

// SIPAN
app.use('/api/pessoas', pessoasRouter(pool));
app.use('/api/animais', animaisRouter(pool));
app.use('/api/funcionarios', funcionariosRouter(pool));
app.use('/api/usuarios', usuariosRouter(pool));

// APAC
app.use('/api/estoque', apacEstoqueRouter(pool));
app.use('/api/campanhas', apacCampanhasRouter(pool));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`Sipan API em http://localhost:${port}`);
});
