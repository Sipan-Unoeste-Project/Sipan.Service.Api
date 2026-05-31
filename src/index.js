import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createPool } from './database/db.js';
import { pessoasRouter } from './routes/pessoasRoutes.js';
import { animaisRouter } from './routes/animaisRoutes.js';

const app = express();
const port = Number(process.env.PORT ?? 5089);

app.use(express.json());

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

const pool = createPool();

app.use('/api/pessoas', pessoasRouter(pool));
app.use('/api/animais', animaisRouter(pool));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`Sipan API em http://localhost:${port}`);
});
