# Regras de negócio

Cada regra tem ID, enunciado, exemplo numérico e caso de borda, e precisa virar teste.

### R1 — Quantidade nunca negativa
A quantidade de um item é sempre ≥ 0.
- Exemplo: item com 3, ajuste −1 → 2.
- Borda: item com 0, ajuste −1 → 409 "Quantidade não pode ficar negativa", e a quantidade continua 0.

### R2 — Ajuste atômico
Ajustes simultâneos nunca se perdem: são aplicados no banco com `quantidade = quantidade + delta`.
- Exemplo: item com 10, duas pessoas fazem +1 ao mesmo tempo → 12.
- Borda: delta 0 ou não inteiro → 400.

### R3 — Edição com controle de versão
Ao editar (PUT), o cliente envia a `versao` que tinha na tela. Se o item mudou desde então, a edição é recusada.
- Exemplo: A e B abrem o item na versão 4; A salva (vira 5); B salva com versão 4 → 409 "Este item foi alterado por outra pessoa", e a tela de B recarrega o item.
- Borda: item excluído enquanto B editava → 404.

### R4 — Nome único
Não podem existir dois itens com o mesmo nome, sem diferenciar maiúsculas/minúsculas.
- Exemplo: existe "Vassoura"; cadastrar "vassoura" → 409 "Já existe um item com esse nome".
- Borda: espaços nas pontas são removidos antes de comparar ("  Vassoura " = "Vassoura").

### R5 — Exclusão
Excluir remove o item definitivamente, após confirmação na tela.
- Borda: excluir item já excluído → 404.

## Validações de entrada
| Campo | Regra | Erro |
|---|---|---|
| nome | texto, 1–100 após trim | 400 "Informe o nome (até 100 caracteres)" |
| categoria | texto, 1–50 após trim | 400 "Informe a categoria (até 50 caracteres)" |
| quantidade | inteiro de 0 a 1.000.000 | 400 "Quantidade deve ser um número inteiro de 0 a 1.000.000" |
| delta | inteiro ≠ 0, valor absoluto ≤ 1.000.000 | 400 "Ajuste inválido" |
| versao | inteiro ≥ 1 (só no PUT) | 400 "Versão inválida" |
| corpo | JSON válido, ≤ 10 KB | 400 "JSON inválido" / 413 "Requisição muito grande" |
