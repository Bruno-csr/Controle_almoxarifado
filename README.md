# Almoxarifado EJC BDI

Controle do almoxarifado do EJC BDI: lista de itens com nome, categoria e quantidade, feita para usar no celular, com várias pessoas ao mesmo tempo.

- Botões **−/+** em cada item para registrar saída/entrada com um toque
- Busca por nome e filtro por categoria (inclui "Em falta")
- Cadastro, edição e exclusão de itens
- Atualização ao vivo: o que uma pessoa muda aparece na tela das outras
- Exportar a lista em CSV (abre no Excel)

## Rodar localmente

Precisa do Node 24 ou mais novo. Não há dependências para instalar.

```bash
npm start      # http://localhost:3000
npm test       # testes da API
npm run pack   # gera almoxarifado-ejc.tar
```

## Deploy no CapRover

1. `npm run pack` gera `almoxarifado-ejc.tar`.
2. No CapRover, crie o app marcando **Has Persistent Data**.
3. Em **App Configs**:
   - **Persistent Directories:** caminho no app `/app/data` (dê um label, ex.: `almoxarifado-dados`).
   - **Container HTTP Port:** `80`.
   - **Instance Count:** `1` (o banco é SQLite; não use mais de uma instância).
4. Em **Deployment → Deploy via Upload**, envie o `almoxarifado-ejc.tar`.
5. Ative **HTTPS** no domínio do app.

Sem o diretório persistente, os dados se perdem a cada deploy.

**Backup:** o banco é o arquivo `/app/data/almoxarifado.db` (no volume persistente). O botão de exportar CSV também serve como cópia rápida.

**Acesso:** o app não tem login. Qualquer pessoa com o link pode ver e editar, então não divulgue o endereço publicamente.

Documentação do projeto: [`specs/`](specs/) · decisões em [`docs/DECISIONS.md`](docs/DECISIONS.md).
