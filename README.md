# Sipan.Service.Api

API REST do SIPAN (ASP.NET Core 8 + MySQL).

## Pré-requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- MySQL rodando (Docker do projeto `Sipan.Service.Web`: porta **3307**)

```bash
cd ../Sipan.Service.Web
docker compose up -d
```

## Executar

```bash
cd Sipan.Service.Api
dotnet run
```

Swagger: http://localhost:5089/swagger

## Endpoints – Pessoas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pessoas` | Lista (`?tipo=doador&busca=maria`) |
| GET | `/api/pessoas/{id}` | Detalhe |
| POST | `/api/pessoas` | Criar |
| PUT | `/api/pessoas/{id}` | Atualizar |
| DELETE | `/api/pessoas/{id}` | Excluir |

Corpo JSON (POST/PUT), igual ao formulário do frontend:

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

## Conexão com o banco

Edite `appsettings.json` ou use variáveis de ambiente:

```json
"ConnectionStrings": {
  "Sipan": "Server=localhost;Port=3307;Database=sipan;User=sipan;Password=sipan_dev_2026;CharSet=utf8mb4;"
}
```

## Frontend

No `Sipan.Service.Web`, configure `.env`:

```env
VITE_API_URL=http://localhost:5089
```
