# Visão geral

**O que é:** controle de almoxarifado do EJC BDI, uma lista de itens com nome, categoria e quantidade.
**Problema:** hoje ninguém sabe ao certo quanto tem de cada coisa no almoxarifado; a contagem fica espalhada ou na cabeça das pessoas.
**Usuário:** equipe do EJC BDI, algumas pessoas ao mesmo tempo, pelo celular (no próprio almoxarifado) e pelo computador, via internet.

## Objetivo principal
> Saber a quantidade atual de cada item, sempre correta, mesmo com várias pessoas editando ao mesmo tempo.

Filtro de features: *isso deixa o objetivo principal mais simples ou mais difícil de atingir?* Se adiciona ruído, não entra, ou fica fora da tela principal.

## Dentro do escopo (v1)
- CRUD de itens (nome, categoria, quantidade).
- Busca por nome e filtro por categoria.
- Botões +/− para ajustar a quantidade com um toque.
- Atualização ao vivo: alteração de uma pessoa aparece na tela das outras sem recarregar.
- Exportar a lista em CSV.

## Fora do escopo
- Login / usuários: decisão do usuário para a v1 (ver [05](05-seguranca-infra-deploy.md)). Temporário.
- Histórico de movimentações (quem tirou o quê, quando): temporário, candidato a v2.
- Estoque mínimo / alertas: temporário.
- Vários almoxarifados ou locais: estrutural, só existe um.

## Fluxo principal do usuário
1. Abre o link no celular.
2. Busca o item ou filtra pela categoria.
3. Toca em + ou − para registrar entrada/saída, ou edita a quantidade direto.
4. Se o item não existe, cadastra com nome, categoria e quantidade.

## Prioridade de desenvolvimento
modelo de dados → API com regras → tela principal → ao vivo → CSV → empacotamento para o CapRover.
