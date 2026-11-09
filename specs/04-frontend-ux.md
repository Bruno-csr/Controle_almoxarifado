# Frontend e UX

## Telas
| Tela | Rota | Mostra | Ações |
|---|---|---|---|
| Almoxarifado | `/` | Total de itens e unidades, busca, chips de categoria e "Em falta", lista de itens | Novo item, +/−, editar, excluir, exportar CSV |
| Modal Item | (diálogo) | Formulário com nome, categoria (com sugestões das existentes) e quantidade | Salvar, cancelar |
| Modal Confirmar exclusão | (diálogo) | "Excluir <nome>?" | Excluir, cancelar |

- Lista em cards agrupados por categoria, numa coluna de até 720px (celular primeiro; no desktop a coluna fica centralizada).
- Botões −/+ de 48px em cada card; tocar no nome abre a edição (com o botão Excluir dentro).
- Tocar no número abre a edição já com o campo de quantidade selecionado (teclado numérico), para digitar o valor contado.
- Botão "Novo item" fixo no canto inferior direito; formulários abrem como folha de baixo para cima no celular.
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
