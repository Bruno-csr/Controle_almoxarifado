# Decisões técnicas

Formato: decisão · por quê · alternativa descartada. A mais recente fica no topo.

## 2026-11-09 — Atualização ao vivo por Server-Sent Events
**Por quê:** só o servidor precisa avisar os clientes; SSE funciona sobre HTTP comum, reconecta sozinho e passa pelo nginx do CapRover.
**Descartado:** WebSocket, porque exigiria biblioteca e é bidirecional sem necessidade; polling puro, porque atrasa e gera tráfego à toa (fica só como fallback a cada 30 s).

## 2026-11-09 — Concorrência: ajuste atômico + versão por item
**Por quê:** o objetivo é a quantidade estar sempre certa; +/− simultâneos não podem se perder e uma edição não pode sobrescrever a de outra pessoa sem aviso.
**Descartado:** "última escrita vence", porque perde alterações sem ninguém perceber.

## 2026-11-09 — Sem login na v1
**Por quê:** decisão do usuário; uso interno com link não divulgado.
**Descartado:** senha única via variável de ambiente, adiada para a v2.

## 2026-11-09 — Node 24 + node:sqlite, sem dependências
**Por quê:** CRUD pequeno; sem dependências não há build nativo no Docker nem manutenção de pacotes. Um container só no CapRover.
**Descartado:** Postgres + Prisma, porque exigiria um segundo app no CapRover sem ganho para esse volume.
