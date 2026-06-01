# Sipan.Service.Api

API REST do SIPAN (Node.js + Express + MySQL).

## Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- MySQL rodando (Docker do projeto `Sipan.Service.Web`: porta **3307**)

```bash
cd ../Sipan.Service.Web
docker compose up -d
```

## Configuração

```bash
cd Sipan.Service.Api
npm install
copy .env.example .env
```

Edite `.env` conforme o ambiente:

```env
PORT=5089
DB_HOST=localhost
DB_PORT=3307
DB_NAME=sipan
DB_USER=sipan
DB_PASSWORD=sipan_dev_2026
```

## Executar

```bash
npm run dev
```

API: http://localhost:5089

## Estrutura

```
src/
├── index.js              # entrada e registro das rotas
├── asyncHandler.js
├── database/db.js
├── helpers/              # DTOs e validação por domínio
└── routes/               # rotas HTTP (todas registradas no index.js)
    ├── pessoasRoutes.js
    ├── animaisRoutes.js
    ├── funcionariosRoutes.js
    ├── usuariosRoutes.js
    ├── apacEstoqueRoutes.js
    ├── apacCampanhasRoutes.js
    ├── apacDoacoesRoutes.js
    ├── apacFinanceiroRoutes.js
    ├── apacDespesasRoutes.js
    └── apacSaudeRoutes.js
```

Schemas MySQL (banco `sipan`):

1. Tabelas SIPAN + APAC completas: use `Sipan.Service.Web/database/schema.sql`, **ou**
2. `database/apac_schema.sql` (estoque/campanhas) + `database/apac_extended_schema.sql` (doações, financeiro, despesas, saúde)

## Padrões de desenvolvimento

| Camada | Convenção |
|--------|-----------|
| Rotas | `src/routes/*Routes.js` — factory `nomeRouter(pool)`, `asyncHandler`, `MSG_NAO_ENCONTRADO` |
| Helpers de domínio | `to*Dto`, `validate*`, regras de negócio |
| Helpers compartilhados | `routeHelpers`, `validationHelpers`, `dateHelpers`, `cpfHelpers` |
| Erros HTTP | `{ mensagem: string }` — 400 validação, 404 não encontrado, 409 conflito, 204 DELETE |
| Listagem | query `busca` (aliases documentados por rota), filtros opcionais |
| JSON SIPAN | camelCase (`criadoEm`, `dataNascimento`) |
| JSON APAC | snake_case (`data_evento`, `limite_baixo_estoque`) — compatível com `Sipan.Service.Web` |

## Endpoints – Pessoas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pessoas` | Lista (`?tipo=doador&busca=maria`) |
| GET | `/api/pessoas/{id}` | Detalhe |
| POST | `/api/pessoas` | Criar |
| PUT | `/api/pessoas/{id}` | Atualizar |
| DELETE | `/api/pessoas/{id}` | Excluir |

## Endpoints – Animais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/animais` | Lista (`?busca=nome&status=Disponível`) |
| GET | `/api/animais/{id}` | Detalhe |
| POST | `/api/animais` | Criar |
| PUT | `/api/animais/{id}` | Atualizar |
| DELETE | `/api/animais/{id}` | Excluir |

> O parâmetro `search` em animais ainda é aceito por compatibilidade, mas prefira `busca`.

## Endpoints – Funcionários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/funcionarios` | Lista (`?busca=nome&status=Ativo`) |
| GET | `/api/funcionarios/{id}` | Detalhe |
| POST | `/api/funcionarios` | Criar |
| PUT | `/api/funcionarios/{id}` | Atualizar |
| DELETE | `/api/funcionarios/{id}` | Excluir |

> O parâmetro `nome` na query ainda é aceito por compatibilidade; prefira `busca`.

## Endpoints – Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/usuarios` | Lista (`?busca=joao&status=Ativo`) |
| GET | `/api/usuarios/{id}` | Detalhe |
| POST | `/api/usuarios` | Criar |
| PUT | `/api/usuarios/{id}` | Atualizar |
| DELETE | `/api/usuarios/{id}` | Excluir |

A senha nunca é retornada nas respostas. No corpo use `senhaHash` (ou `senha_hash` por compatibilidade).

## Endpoints – APAC (estoque e campanhas)

Respostas em **snake_case** para o módulo APAC em `Sipan.Service.Web` (`/apac/estoque`, `/apac/campanhas`).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/estoque` | Lista itens |
| GET | `/api/estoque/{id}` | Detalhe |
| POST | `/api/estoque` | Criar item |
| PUT | `/api/estoque/{id}` | Atualizar |
| PATCH | `/api/estoque/{id}/quantidade` | Ajustar quantidade (`{ "delta": 1 }`) |
| DELETE | `/api/estoque/{id}` | Excluir |
| GET | `/api/campanhas` | Lista `{ ativas, encerradas }` |
| GET | `/api/campanhas/{id}` | Detalhe |
| POST | `/api/campanhas` | Criar |
| PUT | `/api/campanhas/{id}` | Atualizar |
| PATCH | `/api/campanhas/{id}/doacao` | Registrar doação (`{ "valor": 100 }`) |
| PATCH | `/api/campanhas/{id}/encerrar` | Encerrar campanha |
| DELETE | `/api/campanhas/{id}` | Excluir |

## Endpoints – APAC (doações, financeiro, despesas, saúde)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/doacoes` | Lista doações (`?busca=`) |
| POST | `/api/doacoes` | Registrar doação (dinheiro ou produto + itens) |
| DELETE | `/api/doacoes/{id}` | Excluir |
| GET | `/api/financeiro` | `{ entradas, saidas }` |
| POST | `/api/financeiro/entradas` | Nova entrada |
| POST | `/api/financeiro/saidas` | Nova saída |
| GET | `/api/despesas` | `{ categorias, despesas }` |
| POST | `/api/despesas` | Nova despesa |
| POST | `/api/despesas/categorias` | Nova categoria |
| DELETE | `/api/despesas/{id}` | Excluir despesa |
| GET | `/api/saude?animal_id=` | Registros e vacinas do animal |
| POST | `/api/saude/registros` | Atendimento |
| POST | `/api/saude/vacinas` | Vacina |

Corpo JSON (POST/PUT pessoas), igual ao formulário do frontend:

```json
{
  "nome": "Maria da Silva",
  "cpf": "123.456.789-00",
  "tipo": "doador",
  "telefone": "(11) 98765-4321",
  "email": "maria@email.com",
  "obs": "Observações opcionais"
}
```

Resposta usa `criadoEm` no formato `yyyy-MM-dd`.

## Frontend

No `Sipan.Service.Web`, configure `.env`:

```env
VITE_API_URL=http://localhost:5089
```
