# Segurança, infra e deploy

- **Exposição:** internet → **auth:** nenhuma (intencional, decisão do usuário em 2026-11-09). Qualquer pessoa com o link pode ver e editar. Mitigação: o link não é divulgado publicamente; login fica para a v2 se houver abuso.
- **Dados sensíveis:** nenhum (só nomes de materiais e quantidades).
- **Proteções mínimas mesmo sem login:** corpo limitado a 10 KB, validação de todos os campos, saída escapada no HTML (nada de `innerHTML` com dado do usuário), cabeçalhos `X-Content-Type-Options: nosniff` e `Content-Security-Policy` restrito a `'self'`.
- **Segredos:** não há. `.env.example` documenta `PORT` e `DATA_DIR`.
- **Backup:** o arquivo `almoxarifado.db` no volume persistente; o CSV exportado serve como cópia manual.
- **Ambiente local:** `npm start` (porta 3000, dados em `./data`).
- **Produção:** CapRover. Upload do `almoxarifado-ejc.tar` (contém `captain-definition` + `Dockerfile`). App criado com **Has Persistent Data** ligado, diretório `/app/data` mapeado, **Container HTTP Port 80**, **1 instância** (SQLite não suporta várias réplicas).
- **Testes:** `node:test` em `test/`, subindo o servidor numa porta aleatória com banco temporário. `npm test`. Nenhum commit com teste falhando.
- **Não funcionais:** endpoints < 100 ms com 1.000 itens; mudança aparece nos outros clientes em < 2 s.
