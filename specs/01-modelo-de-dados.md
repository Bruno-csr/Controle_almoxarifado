# Modelo de dados

## Glossário
| Termo | Significado |
|---|---|
| Item | Uma coisa guardada no almoxarifado (ex.: "Copo descartável 200ml") |
| Categoria | Agrupamento livre em texto (ex.: "Descartáveis", "Limpeza") |
| Ajuste | Somar ou subtrair da quantidade atual (+1 / −1) |

## Entidades
### Item (tabela `itens`)
| Campo | Tipo | Regra |
|---|---|---|
| id | INTEGER | PK autoincrement |
| nome | TEXT | obrigatório, 1–100 caracteres após trim, único sem diferenciar maiúsculas (`COLLATE NOCASE`) |
| categoria | TEXT | obrigatório, 1–50 caracteres após trim |
| quantidade | INTEGER | obrigatório, ≥ 0 (`CHECK`) |
| versao | INTEGER | começa em 1, +1 a cada alteração (controle de concorrência) |
| criado_em | TEXT | ISO 8601 UTC |
| atualizado_em | TEXT | ISO 8601 UTC |

Relações: nenhuma. Categoria é texto livre; a lista de categorias é derivada dos itens.

## Princípios
- Excluir apaga de verdade (sem soft delete na v1, não há histórico).
- O schema é criado no boot com `CREATE TABLE IF NOT EXISTS`; não há ferramenta de migration.
- SQLite em modo WAL com `busy_timeout` para aguentar escritas simultâneas.
