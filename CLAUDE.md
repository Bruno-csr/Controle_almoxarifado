# Almoxarifado EJC BDI

App web para controlar o estoque do almoxarifado do EJC BDI: cadastro de itens com nome, categoria e quantidade, usado por várias pessoas ao mesmo tempo. Objetivo principal: **saber a quantidade atual de cada item, sempre correta, mesmo com várias pessoas editando**. Uma feature nova só entra se não atrapalhar esse objetivo.

## Stack
- Frontend: HTML/CSS/JS puro em `public/` (sem build)
- Backend: Node 24, `node:http` puro, sem dependências npm
- Banco: SQLite nativo (`node:sqlite`), arquivo em `$DATA_DIR/almoxarifado.db`
- Deploy: container único no CapRover (`captain-definition` + `Dockerfile`)

## Como rodar
```bash
npm start            # http://localhost:3000 (dados em ./data)
npm test             # testes da API (node:test)
npm run pack         # gera almoxarifado-ejc.tar para o CapRover
```
- Sem login (decisão intencional, ver `specs/05`).

## Estrutura
```
server.js           API + arquivos estáticos + SSE
public/             front (index.html, app.js, style.css)
test/               testes node:test
scripts/            empacotamento para o CapRover
specs/              fonte de verdade do produto (ler antes de implementar)
docs/DECISIONS.md   decisões técnicas e o porquê
TASKS.md            quadro de tasks
```

## Regras do projeto
- Fluxo: `create-specs` → `task-driven-dev` → `definition-of-done`. Não implemente sem critérios de aceite.
- Pendência marcada com ❓ em `specs/` → pergunte, não presuma.
- Git: commit direto na `main` em https://github.com/Bruno-csr/Controle_almoxarifado.git; commit + push ao fim de cada task aprovada; mensagens `feat:` / `fix:` / `chore:` / `docs:` / `test:`.
- Segredos só em `.env` (nunca commitar); manter `.env.example` atualizado.
- Código e textos da interface em português. Erro da API: `{ "error": "mensagem" }`.
- Ajuste de quantidade é sempre atômico no SQL (`quantidade = quantidade + ?`), nunca "ler, somar e gravar" no JS.
- Sem dependências npm, a menos que haja motivo registrado em `docs/DECISIONS.md`.

## Mapa das specs
| Preciso de… | Ler |
|---|---|
| Escopo, usuário, objetivo | `specs/00-visao-geral.md` |
| Entidades e campos | `specs/01-modelo-de-dados.md` |
| Cálculos e validações | `specs/02-regras-de-negocio.md` |
| Endpoints | `specs/03-contrato-api.md` |
| Telas e estados | `specs/04-frontend-ux.md` |
| Auth, segredos, deploy, testes | `specs/05-seguranca-infra-deploy.md` |
| Entrega em andamento | `specs/features/` |
