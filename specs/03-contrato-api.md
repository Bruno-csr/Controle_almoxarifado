# Contrato da API

Base: `/api` · Erro padrão: `{ "error": "mensagem" }` com 400 / 404 / 409 / 413 / 500 · Auth: nenhuma

`Item` = `{ id, nome, categoria, quantidade, versao, criado_em, atualizado_em }`

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/api/itens` | — | 200 `{ itens: Item[] }` ordenado por categoria e nome |
| POST | `/api/itens` | `{ nome, categoria, quantidade }` | 201 `Item` · 400 · 409 (nome duplicado) |
| PUT | `/api/itens/:id` | `{ nome, categoria, quantidade, versao }` | 200 `Item` · 400 · 404 · 409 (versão ou nome) |
| POST | `/api/itens/:id/ajuste` | `{ delta }` | 200 `Item` · 400 · 404 · 409 (ficaria negativo) |
| DELETE | `/api/itens/:id` | — | 204 · 404 |
| GET | `/api/itens.csv` | — | 200 `text/csv` (UTF-8 com BOM, `;` como separador, colunas Nome;Categoria;Quantidade) |
| GET | `/api/eventos` | — | `text/event-stream`; evento `mudou` com `{ tipo, id }` a cada escrita; comentário de keep-alive a cada 25 s |
| GET | `/api/saude` | — | 200 `{ ok: true }` |

Toda mudança de contrato atualiza este arquivo na mesma entrega.
