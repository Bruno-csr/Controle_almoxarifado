'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { criarServidor } = require('../server.js');

let servidor;
let base;
let pasta;

before(async () => {
  pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'almox-'));
  servidor = criarServidor({ dataDir: pasta });
  await new Promise((r) => servidor.listen(0, r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await servidor.fecharTudo();
  fs.rmSync(pasta, { recursive: true, force: true });
});

async function api(metodo, rota, corpo) {
  const res = await fetch(base + rota, {
    method: metodo,
    headers: corpo !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: corpo !== undefined ? (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) : undefined,
  });
  const txt = await res.text();
  let dados = null;
  try {
    dados = txt ? JSON.parse(txt) : null;
  } catch {
    dados = txt;
  }
  return { status: res.status, dados, headers: res.headers };
}

const criar = (nome, categoria = 'Geral', quantidade = 0) => api('POST', '/api/itens', { nome, categoria, quantidade });

test('saúde e página inicial', async () => {
  assert.deepEqual((await api('GET', '/api/saude')).dados, { ok: true });
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Almoxarifado/);
  assert.equal((await fetch(base + '/../server.js')).status, 404);
});

test('CRUD completo', async () => {
  const c = await criar('  Copo   200ml ', 'Descartáveis', 50);
  assert.equal(c.status, 201);
  assert.equal(c.dados.nome, 'Copo 200ml');
  assert.equal(c.dados.versao, 1);

  const lista = await api('GET', '/api/itens');
  assert.ok(lista.dados.itens.some((i) => i.id === c.dados.id));

  const e = await api('PUT', `/api/itens/${c.dados.id}`, { nome: 'Copo 200 ml', categoria: 'Descartáveis', quantidade: 40, versao: 1 });
  assert.equal(e.status, 200);
  assert.equal(e.dados.quantidade, 40);
  assert.equal(e.dados.versao, 2);

  assert.equal((await api('DELETE', `/api/itens/${c.dados.id}`)).status, 204);
  // R5: excluir de novo → 404
  assert.equal((await api('DELETE', `/api/itens/${c.dados.id}`)).status, 404);
});

test('R1 — quantidade nunca negativa', async () => {
  const { dados: item } = await criar('Vela', 'Liturgia', 1);
  assert.equal((await api('POST', `/api/itens/${item.id}/ajuste`, { delta: -1 })).dados.quantidade, 0);
  const r = await api('POST', `/api/itens/${item.id}/ajuste`, { delta: -1 });
  assert.equal(r.status, 409);
  assert.equal(r.dados.error, 'Quantidade não pode ficar negativa');
  assert.equal(r.dados.item.quantidade, 0);
  assert.equal((await api('POST', `/api/itens/${item.id}/ajuste`, { delta: 1_000_001 })).status, 400);
});

test('R2 — ajustes simultâneos não se perdem', async () => {
  const { dados: item } = await criar('Guardanapo', 'Descartáveis', 10);
  await Promise.all(Array.from({ length: 20 }, () => api('POST', `/api/itens/${item.id}/ajuste`, { delta: 1 })));
  const lista = await api('GET', '/api/itens');
  assert.equal(lista.dados.itens.find((i) => i.id === item.id).quantidade, 30);
  for (const delta of [0, 1.5, '1', null]) {
    assert.equal((await api('POST', `/api/itens/${item.id}/ajuste`, { delta })).status, 400, `delta ${delta}`);
  }
  assert.equal((await api('POST', '/api/itens/999999/ajuste', { delta: 1 })).status, 404);
});

test('R3 — edição com versão antiga é recusada', async () => {
  const { dados: item } = await criar('Vassoura velha', 'Limpeza', 2);
  const a = await api('PUT', `/api/itens/${item.id}`, { nome: 'Vassoura velha', categoria: 'Limpeza', quantidade: 3, versao: 1 });
  assert.equal(a.status, 200);
  const b = await api('PUT', `/api/itens/${item.id}`, { nome: 'Vassoura velha', categoria: 'Limpeza', quantidade: 9, versao: 1 });
  assert.equal(b.status, 409);
  assert.equal(b.dados.error, 'Este item foi alterado por outra pessoa');
  assert.equal(b.dados.item.quantidade, 3);
  // ajuste também incrementa a versão
  await api('POST', `/api/itens/${item.id}/ajuste`, { delta: 1 });
  assert.equal((await api('PUT', `/api/itens/${item.id}`, { nome: 'X', categoria: 'Y', quantidade: 1, versao: 2 })).status, 409);
  assert.equal((await api('PUT', '/api/itens/999999', { nome: 'X', categoria: 'Y', quantidade: 1, versao: 1 })).status, 404);
});

test('R4 — nome único sem diferenciar maiúsculas', async () => {
  assert.equal((await criar('Vassoura', 'Limpeza')).status, 201);
  const r = await criar('  vassoura ', 'Limpeza');
  assert.equal(r.status, 409);
  assert.equal(r.dados.error, 'Já existe um item com esse nome');
  const { dados: outro } = await criar('Rodo', 'Limpeza');
  const e = await api('PUT', `/api/itens/${outro.id}`, { nome: 'VASSOURA', categoria: 'Limpeza', quantidade: 0, versao: 1 });
  assert.equal(e.status, 409);
});

test('validações de entrada', async () => {
  const casos = [
    [{ nome: '', categoria: 'A', quantidade: 1 }, 'Informe o nome (até 100 caracteres)'],
    [{ nome: 'a'.repeat(101), categoria: 'A', quantidade: 1 }, 'Informe o nome (até 100 caracteres)'],
    [{ nome: 'A', categoria: '   ', quantidade: 1 }, 'Informe a categoria (até 50 caracteres)'],
    [{ nome: 'A', categoria: 'B', quantidade: -1 }, 'Quantidade deve ser um número inteiro de 0 a 1.000.000'],
    [{ nome: 'A', categoria: 'B', quantidade: 1.5 }, 'Quantidade deve ser um número inteiro de 0 a 1.000.000'],
    [{ nome: 'A', categoria: 'B', quantidade: '3' }, 'Quantidade deve ser um número inteiro de 0 a 1.000.000'],
    [{ nome: 'A', categoria: 'B', quantidade: 1_000_001 }, 'Quantidade deve ser um número inteiro de 0 a 1.000.000'],
  ];
  for (const [corpo, erro] of casos) {
    const r = await api('POST', '/api/itens', corpo);
    assert.equal(r.status, 400, JSON.stringify(corpo));
    assert.equal(r.dados.error, erro);
  }
  assert.equal((await api('POST', '/api/itens', '{quebrado')).status, 400);
  assert.equal((await api('POST', '/api/itens', '[]')).status, 400);
  assert.equal((await api('POST', '/api/itens', { nome: 'x'.repeat(11000), categoria: 'a', quantidade: 1 })).status, 413);
  const { dados: it } = await criar('Valida versao', 'A', 1);
  assert.equal((await api('PUT', `/api/itens/${it.id}`, { nome: 'A1', categoria: 'B', quantidade: 1 })).dados.error, 'Versão inválida');
  assert.equal((await api('GET', '/api/nada')).status, 404);
});

test('CSV com BOM, separador ; e proteção contra fórmula', async () => {
  await criar('=SOMA(A1)', 'Teste; "aspas"', 7);
  const res = await fetch(base + '/api/itens.csv');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /attachment; filename="almoxarifado-ejc-/);
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
  const txt = new TextDecoder().decode(bytes.slice(3));
  assert.ok(txt.startsWith('Nome;Categoria;Quantidade\r\n'));
  assert.ok(txt.includes(`'=SOMA(A1);"Teste; ""aspas""";7`));
});

test('SSE avisa as outras pessoas', async () => {
  const ctrl = new AbortController();
  const res = await fetch(base + '/api/eventos', { signal: ctrl.signal });
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const leitor = res.body.getReader();
  const dec = new TextDecoder();
  const recebido = (async () => {
    let buf = '';
    while (!buf.includes('event: mudou')) buf += dec.decode((await leitor.read()).value);
    return buf;
  })();
  const { dados } = await criar('Item ao vivo', 'A', 1);
  const buf = await recebido;
  assert.ok(buf.includes(`"id":${dados.id}`));
  ctrl.abort();
});
