# Sipan.Service.Api

API REST do **SIPAN** — Sistema Integrado de Proteção Animal (Node.js + Express + MySQL).

## GRUPO 3

### Integrantes

| Nome | RA |
|------|-----|
| Felipe Augusto Soares | 10482511137 |
| Igor Silva Pereira | 10482510793 |
| Lillian Martins Cruz | 10482519690 |
| Robson Junior Biffe Rodrigues | 10482510102 |

### Descrição do projeto

O **SIPAN** é um sistema web para gestão de abrigos e ONGs de proteção animal. O projeto é dividido em dois repositórios complementares:

- **Sipan.Service.Api** (este repositório) — backend REST que persiste dados no MySQL.
- **Sipan.Service.Web** — frontend React (Vite) consumindo a API.

Funcionalidades principais:

- **Cadastros SIPAN:** pessoas (doadores/adotantes), animais, voluntários, usuários do sistema e solicitações de adoção.
- **Módulo APAC:** estoque, campanhas, doações, financeiro, despesas, saúde animal e balancete.
- **Integração completa:** front e API compartilham o banco `sipan` via Docker; migrações versionadas garantem que todos os integrantes atualizem o schema após o `git pull`.

### Organização deste repositório

```
Sipan.Service.Api/
├── src/
│   ├── index.js                 # Entrada Express, CORS e registro das rotas
│   ├── asyncHandler.js          # Wrapper async para rotas
│   ├── database/
│   │   └── db.js                # Pool de conexão MySQL
│   ├── helpers/                 # DTOs, validação e regras de negócio
│   │   ├── pessoaHelpers.js
│   │   ├── animalHelpers.js
│   │   ├── voluntarioHelpers.js
│   │   ├── usuarioHelpers.js
│   │   ├── adocaoHelpers.js
│   │   ├── apacEstoqueHelpers.js
│   │   ├── apacCampanhaHelpers.js
│   │   ├── routeHelpers.js
│   │   ├── validationHelpers.js
│   │   ├── dateHelpers.js
│   │   └── cpfHelpers.js
│   └── routes/                  # Endpoints HTTP (CRUD por domínio)
│       ├── pessoasRoutes.js
│       ├── animaisRoutes.js
│       ├── adocoesRoutes.js
│       ├── voluntariosRoutes.js
│       ├── usuariosRoutes.js
│       ├── apacEstoqueRoutes.js
│       ├── apacCampanhasRoutes.js
│       ├── apacDoacoesRoutes.js
│       ├── apacFinanceiroRoutes.js
│       ├── apacDespesasRoutes.js
│       └── apacSaudeRoutes.js
├── database/
│   ├── apac_schema.sql          # Schema parcial APAC (estoque/campanhas)
│   ├── apac_extended_schema.sql # Doações, financeiro, despesas, saúde
│   └── migrations/              # Migrações incrementais (001–006+)
├── scripts/
│   └── migrate.js               # Aplica migrações pendentes (`npm run migrate`)
├── .env.example                 # Variáveis de ambiente (DB, porta)
├── package.json
├── Sipan.Service.Api.http       # Requisições de teste (REST Client)
├── README.md
└── LICENSE
```

O schema completo para instalação nova fica em `Sipan.Service.Web/database/schema.sql`.

---

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

## Atualizar o banco (obrigatório após clonar)

O Docker só aplica `schema.sql` na **primeira** criação do volume. Quem já tinha o MySQL rodando ou clonou o repositório precisa aplicar as migrações pendentes:

```bash
npm run migrate
```

Isso cria/atualiza tabelas como `pessoa_tipos` e `solicitacoes_adocao` e registra o que já foi aplicado em `schema_migrations`.

> **Erro `Table 'sipan.pessoa_tipos' doesn't exist` ou `solicitacoes_adocao`?** Execute `npm run migrate` e reinicie a API.

Banco **novo do zero** (sem volume antigo): suba o Docker no Web e rode `npm run migrate` uma vez (migrações idempotentes — no banco já atualizado, tudo vira `skip`).

## Executar

```bash
npm run dev
```

API: http://localhost:5089


## Frontend

No `Sipan.Service.Web`, configure `.env`:

```env
VITE_API_URL=http://localhost:5089
```
