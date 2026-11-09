# Frontend e UX

## Telas
| Tela | Rota | Mostra | Ações |
|---|---|---|---|
| Almoxarifado | `/` | Total de itens, busca, filtro de categoria, lista de itens (nome, categoria, quantidade) | Novo item, +/−, editar, excluir, exportar CSV |
| Modal Item | (diálogo) | Formulário com nome, categoria (com sugestões das existentes) e quantidade | Salvar, cancelar |
| Modal Confirmar exclusão | (diálogo) | "Excluir <nome>?" | Excluir, cancelar |

- Lista em cards no celular e em tabela no desktop (mesmo HTML, CSS responsivo).
- Item com quantidade 0 fica destacado ("Em falta").
- Indicador discreto de conexão ao vivo (ponto verde "Ao vivo" / cinza "Reconectando…").
- Busca ignora maiúsculas e acentos.

## Estados obrigatórios em toda tela com dados
loading · erro (mensagem clara) · vazio · feedback de sucesso em ações importantes · confirmação antes de ações destrutivas.
- Vazio sem itens: "Nenhum item cadastrado" + botão Novo item. Vazio por filtro: "Nada encontrado" + limpar filtros.
- Conflito (409 de versão): aviso "Alguém alterou este item" e o formulário recarrega com os dados atuais.
- Sucesso e erro aparecem em toast no rodapé.

## Design system
- Tokens de cor em `:root` (fundo, card, texto, texto-suave, primária, perigo, borda), com tema escuro por `prefers-color-scheme`.
- Contraste WCAG AA (4,5:1), também em hover, foco e inputs durante a digitação.
- Mobile-first: 375px sem scroll horizontal, alvos ≥44px, inputs com fonte ≥16px.
- Componentes: `<dialog>` nativo para modais; sem biblioteca de UI.
