# Tasks

Status: 📋 pendente · 🔄 em progresso · 🔒 bloqueada · ✅ concluída · ❌ cancelada
Uma task = uma entrega = um commit. Ao concluir, mova para Concluídas com data e hash.

## Pendentes
| ID | Task | Spec | Depende | Pronto quando | Status |
|---|---|---|---|---|---|
| T-001 | Scaffold + hello world rodando | 05 | — | `npm start` sobe, `/api/saude` responde `{ok:true}` e `/` abre uma página | 📋 |
| T-002 | Banco + API CRUD de itens com regras R1–R5 | 01, 02, 03 | T-001 | `npm test` cobre R1–R5 e as validações, tudo passando | 📋 |
| T-003 | Tela principal: lista, busca, filtro, novo/editar/excluir, +/− | 04 | T-002 | Fluxo completo no navegador em 375px e desktop, com estados loading/erro/vazio | 📋 |
| T-004 | Atualização ao vivo (SSE) | 03, 04 | T-003 | Alteração em uma aba aparece na outra em < 2 s; indicador "Ao vivo" | 📋 |
| T-005 | Exportar CSV | 03 | T-002 | Botão baixa CSV que abre certo no Excel (acentos e colunas) | 📋 |
| T-006 | Empacotamento CapRover (`npm run pack` → .tar) + README de deploy | 05 | T-001..T-005 | `.tar` tem `captain-definition` na raiz e a imagem builda e roda | 📋 |

## Concluídas
| ID | Task | Data | Commit |
|---|---|---|---|

## Backlog (ideias, sem compromisso)
- Senha única de acesso (v2)
- Histórico de movimentações
- Estoque mínimo com alerta
