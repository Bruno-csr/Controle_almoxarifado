'use strict';
// Almoxarifado EJC BDI — front sem dependências. Telas e estados: specs/04-frontend-ux.md

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...filhos) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos) if (f != null) n.append(f);
  return n;
};
const icone = (id) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#' + id);
  svg.append(use);
  return svg;
};
const normalizar = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const fmt = (n) => n.toLocaleString('pt-BR');

const TODAS = '__todas';
const FALTA = '__falta';

const estado = {
  itens: new Map(),
  carregado: false,
  erroCarga: null,
  filtro: TODAS,
  busca: '',
  pendente: new Map(), // id -> soma de ajustes ainda não confirmados
  fila: new Map(), // id -> Promise (ajustes do mesmo item vão em sequência)
  editando: null, // { id, versao } ou null (novo)
};

// ---------- API ----------
async function api(metodo, url, corpo) {
  const res = await fetch(url, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
  });
  if (res.status === 204) return null;
  let dados = null;
  try {
    dados = await res.json();
  } catch {
    /* corpo vazio ou não-JSON */
  }
  if (!res.ok) {
    const err = new Error((dados && dados.error) || `Erro ${res.status}`);
    err.status = res.status;
    err.dados = dados;
    throw err;
  }
  return dados;
}

let carregando = null;
async function carregar() {
  if (carregando) return carregando;
  carregando = (async () => {
    try {
      const { itens } = await api('GET', '/api/itens');
      estado.itens = new Map(itens.map((i) => [i.id, i]));
      estado.carregado = true;
      estado.erroCarga = null;
    } catch (err) {
      estado.erroCarga = err.status ? err.message : 'Sem conexão com o servidor';
    } finally {
      carregando = null;
      render();
    }
  })();
  return carregando;
}

let timerRecarga;
function recarregarEmBreve() {
  clearTimeout(timerRecarga);
  timerRecarga = setTimeout(carregar, 250);
}

// ---------- Toast ----------
let timerToast;
function toast(msg, tipo = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('erro', tipo === 'erro');
  t.classList.add('visivel');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.classList.remove('visivel'), tipo === 'erro' ? 4500 : 2200);
}

// ---------- Ajuste rápido (+/−) ----------
const qtdNaTela = (item) => item.quantidade + (estado.pendente.get(item.id) || 0);

function ajustar(id, delta) {
  const item = estado.itens.get(id);
  if (!item) return;
  if (qtdNaTela(item) + delta < 0) return;
  estado.pendente.set(id, (estado.pendente.get(id) || 0) + delta);
  if (navigator.vibrate) navigator.vibrate(8);
  render();

  const anterior = estado.fila.get(id) || Promise.resolve();
  const atual = anterior
    .then(() => api('POST', `/api/itens/${id}/ajuste`, { delta }))
    .then((novo) => {
      estado.itens.set(id, novo);
    })
    .catch((err) => {
      if (err.status === 404) {
        estado.itens.delete(id);
        toast('Este item foi excluído por outra pessoa', 'erro');
      } else {
        if (err.dados && err.dados.item) estado.itens.set(id, err.dados.item);
        toast(err.status ? err.message : 'Sem conexão: o ajuste não foi salvo', 'erro');
      }
    })
    .finally(() => {
      const resto = (estado.pendente.get(id) || 0) - delta;
      if (resto) estado.pendente.set(id, resto);
      else estado.pendente.delete(id);
      if (estado.fila.get(id) === atual) estado.fila.delete(id);
      render();
    });
  estado.fila.set(id, atual);
}

// ---------- Render ----------
function categorias() {
  const cont = new Map();
  for (const i of estado.itens.values()) {
    const chave = i.categoria;
    const achada = [...cont.keys()].find((k) => normalizar(k) === normalizar(chave));
    cont.set(achada || chave, (cont.get(achada || chave) || 0) + 1);
  }
  return [...cont.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
}

function filtrados() {
  const termo = normalizar(estado.busca);
  return [...estado.itens.values()].filter((i) => {
    if (estado.filtro === FALTA && qtdNaTela(i) > 0) return false;
    if (estado.filtro !== TODAS && estado.filtro !== FALTA && normalizar(i.categoria) !== normalizar(estado.filtro)) return false;
    if (termo && !normalizar(i.nome).includes(termo) && !normalizar(i.categoria).includes(termo)) return false;
    return true;
  });
}

function renderChips(cats) {
  const nav = $('#chips');
  const emFalta = [...estado.itens.values()].filter((i) => qtdNaTela(i) === 0).length;
  if (estado.filtro === FALTA && emFalta === 0) estado.filtro = TODAS;
  if (estado.filtro !== TODAS && estado.filtro !== FALTA && !cats.some(([c]) => c === estado.filtro)) estado.filtro = TODAS;

  const chip = (valor, rotulo, n, extra = '') =>
    el('button', { type: 'button', class: 'chip ' + extra, 'data-filtro': valor, 'aria-pressed': String(estado.filtro === valor) },
      rotulo, el('span', { class: 'n', text: fmt(n) }));

  const novos = [chip(TODAS, 'Todas', estado.itens.size)];
  if (emFalta) novos.push(chip(FALTA, 'Em falta', emFalta, 'falta'));
  for (const [c, n] of cats) novos.push(chip(c, c, n));
  nav.replaceChildren(...novos);
  nav.hidden = estado.itens.size === 0;
}

function cardItem(item) {
  const qtd = qtdNaTela(item);
  const falta = qtd === 0;
  const meta = el('span', { class: 'item-meta' });
  if (falta) meta.append(el('span', { class: 'tag-falta', text: 'Em falta' }));
  else meta.append(icone('i-lapis'), 'Toque para editar');

  return el('div', { class: 'item' + (falta ? ' falta' : ''), 'data-id': item.id },
    el('button', { type: 'button', class: 'item-info', 'data-acao': 'editar', 'aria-label': `Editar ${item.nome}` },
      el('span', { class: 'item-nome', text: item.nome }), meta),
    el('div', { class: 'stepper', role: 'group', 'aria-label': `Quantidade de ${item.nome}` },
      el('button', { type: 'button', class: 'btn-passo', 'data-acao': 'menos', 'aria-label': `Tirar 1 de ${item.nome}`, disabled: qtd <= 0 }, icone('i-menos')),
      el('span', { class: 'qtd' + (estado.pendente.has(item.id) ? ' pendente' : ''), 'aria-live': 'polite', text: fmt(qtd) }),
      el('button', { type: 'button', class: 'btn-passo', 'data-acao': 'mais', 'aria-label': `Adicionar 1 a ${item.nome}` }, icone('i-mais')))
  );
}

function render() {
  const lista = $('#lista');
  const est = $('#estado');
  const resumo = $('#resumo');

  // guarda o foco para não perdê-lo ao redesenhar
  const ativo = document.activeElement;
  const foco = ativo && ativo.closest && ativo.closest('.item')
    ? { id: ativo.closest('.item').dataset.id, acao: ativo.dataset.acao }
    : null;

  const cats = categorias();
  renderChips(cats);

  if (!estado.carregado) {
    lista.replaceChildren();
    resumo.textContent = '';
    if (estado.erroCarga) {
      est.replaceChildren(
        el('h2', { text: 'Não foi possível carregar' }),
        el('p', { text: estado.erroCarga }),
        el('button', { type: 'button', class: 'btn primario', 'data-acao': 'tentar' }, 'Tentar de novo'));
    }
    est.hidden = false;
    return;
  }

  const itens = filtrados();
  const total = estado.itens.size;
  const unidades = [...estado.itens.values()].reduce((s, i) => s + qtdNaTela(i), 0);
  resumo.textContent = total
    ? (itens.length === total
        ? `${fmt(total)} ${total === 1 ? 'item' : 'itens'} · ${fmt(unidades)} unidades`
        : `Mostrando ${fmt(itens.length)} de ${fmt(total)} itens`)
    : '';

  if (total === 0) {
    est.replaceChildren(
      el('h2', { text: 'Nenhum item cadastrado' }),
      el('p', { text: 'Cadastre o primeiro item do almoxarifado.' }),
      el('button', { type: 'button', class: 'btn primario', 'data-acao': 'novo' }, icone('i-mais'), 'Novo item'));
    est.hidden = false;
    lista.replaceChildren();
    return;
  }
  if (itens.length === 0) {
    est.replaceChildren(
      el('h2', { text: 'Nada encontrado' }),
      el('p', { text: estado.busca ? `Nenhum item com “${estado.busca}”.` : 'Nenhum item neste filtro.' }),
      el('button', { type: 'button', class: 'btn', 'data-acao': 'limpar' }, 'Limpar filtros'));
    est.hidden = false;
    lista.replaceChildren();
    return;
  }
  est.hidden = true;

  // agrupa por categoria (a API já devolve ordenado)
  const grupos = new Map();
  for (const i of itens) {
    const chave = cats.find(([c]) => normalizar(c) === normalizar(i.categoria))?.[0] || i.categoria;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(i);
  }
  const mostrarTitulo = !(estado.filtro !== TODAS && estado.filtro !== FALTA);
  const blocos = [];
  for (const [cat, lst] of grupos) {
    if (mostrarTitulo) blocos.push(el('h2', { class: 'grupo-titulo', text: `${cat} · ${lst.length}` }));
    blocos.push(el('div', { class: 'grupo' }, ...lst.map(cardItem)));
  }
  lista.replaceChildren(...blocos);

  if (foco) {
    const alvo = lista.querySelector(`.item[data-id="${foco.id}"] [data-acao="${foco.acao}"]`);
    if (alvo && !alvo.disabled) alvo.focus({ preventScroll: true });
  }
}

// ---------- Formulário (novo / editar) ----------
const dlgItem = $('#dlg-item');
const fNome = $('#f-nome');
const fCat = $('#f-categoria');
const fQtd = $('#f-quantidade');

function mostrarErroForm(msg, campo) {
  const e = $('#form-erro');
  e.textContent = msg || '';
  e.hidden = !msg;
  for (const c of [fNome, fCat, fQtd]) c.removeAttribute('aria-invalid');
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
}

function renderSugestoes() {
  const termo = normalizar(fCat.value);
  const box = $('#sug-categorias');
  const cats = categorias().map(([c]) => c).filter((c) => normalizar(c) !== termo && (!termo || normalizar(c).includes(termo)));
  box.replaceChildren(...cats.slice(0, 12).map((c) => el('button', { type: 'button', class: 'chip', 'data-cat': c, text: c })));
  box.hidden = cats.length === 0;
}

function preencherForm(item) {
  fNome.value = item ? item.nome : '';
  fCat.value = item ? item.categoria : (estado.filtro !== TODAS && estado.filtro !== FALTA ? estado.filtro : '');
  fQtd.value = item ? String(item.quantidade) : '0';
  renderSugestoes();
}

function abrirForm(item) {
  estado.editando = item ? { id: item.id, versao: item.versao } : null;
  $('#dlg-item-titulo').textContent = item ? 'Editar item' : 'Novo item';
  $('#btn-excluir').hidden = !item;
  $('#form-aviso').hidden = true;
  mostrarErroForm('');
  preencherForm(item);
  dlgItem.showModal();
  if (!item) fNome.focus();
  else $('#btn-salvar').focus();
}

function lerForm() {
  const nome = fNome.value.trim();
  const categoria = fCat.value.trim();
  const txt = fQtd.value.trim();
  if (!nome) return mostrarErroForm('Informe o nome do item', fNome);
  if (!categoria) return mostrarErroForm('Informe a categoria', fCat);
  if (!/^\d+$/.test(txt) || Number(txt) > 1_000_000) {
    return mostrarErroForm('Quantidade deve ser um número inteiro de 0 a 1.000.000', fQtd);
  }
  return { nome, categoria, quantidade: Number(txt) };
}

async function salvar(ev) {
  ev.preventDefault();
  const dados = lerForm();
  if (!dados) return;
  const btn = $('#btn-salvar');
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  try {
    let item;
    if (estado.editando) {
      item = await api('PUT', `/api/itens/${estado.editando.id}`, { ...dados, versao: estado.editando.versao });
    } else {
      item = await api('POST', '/api/itens', dados);
    }
    estado.itens.set(item.id, item);
    dlgItem.close();
    toast(estado.editando ? 'Item atualizado' : `“${item.nome}” cadastrado`);
    render();
  } catch (err) {
    if (err.status === 409 && err.dados && err.dados.item) {
      // R3: alguém mexeu no item enquanto você editava
      const atual = err.dados.item;
      estado.itens.set(atual.id, atual);
      estado.editando = { id: atual.id, versao: atual.versao };
      preencherForm(atual);
      const aviso = $('#form-aviso');
      aviso.textContent = 'Alguém alterou este item enquanto você editava. Os dados abaixo são os atuais; confira e salve de novo.';
      aviso.hidden = false;
      mostrarErroForm('');
      render();
    } else if (err.status === 404) {
      estado.itens.delete(estado.editando?.id);
      dlgItem.close();
      toast('Este item foi excluído por outra pessoa', 'erro');
      render();
    } else if (err.status === 409) {
      mostrarErroForm(err.message, fNome);
    } else {
      mostrarErroForm(err.status ? err.message : 'Sem conexão com o servidor. Tente de novo.');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
}

// ---------- Exclusão ----------
const dlgConf = $('#dlg-confirmar');
function confirmarExclusao() {
  const item = estado.itens.get(estado.editando?.id);
  if (!item) return;
  $('#dlg-conf-texto').textContent = `“${item.nome}” será removido do almoxarifado. Isso não pode ser desfeito.`;
  dlgConf.returnValue = '';
  dlgConf.showModal();
}
dlgConf.addEventListener('close', async () => {
  if (dlgConf.returnValue !== 'excluir' || !estado.editando) return;
  const { id } = estado.editando;
  const nome = estado.itens.get(id)?.nome || 'Item';
  try {
    await api('DELETE', `/api/itens/${id}`);
    toast(`“${nome}” excluído`);
  } catch (err) {
    if (err.status !== 404) return toast(err.status ? err.message : 'Sem conexão: não foi excluído', 'erro');
  }
  estado.itens.delete(id);
  dlgItem.close();
  render();
});

// ---------- Eventos de interface ----------
$('#btn-novo').addEventListener('click', () => abrirForm(null));
$('#form-item').addEventListener('submit', salvar);
$('#btn-excluir').addEventListener('click', confirmarExclusao);
dlgItem.addEventListener('click', (ev) => {
  if (ev.target === dlgItem || ev.target.closest('[data-fechar]')) dlgItem.close();
  const passo = ev.target.closest('[data-passo]');
  if (passo) {
    const atual = /^\d+$/.test(fQtd.value) ? Number(fQtd.value) : 0;
    fQtd.value = String(Math.max(0, Math.min(1_000_000, atual + Number(passo.dataset.passo))));
  }
  const cat = ev.target.closest('[data-cat]');
  if (cat) {
    fCat.value = cat.dataset.cat;
    renderSugestoes();
    fQtd.focus();
  }
});
dlgConf.addEventListener('click', (ev) => { if (ev.target === dlgConf) dlgConf.close(); });
fCat.addEventListener('input', renderSugestoes);
fNome.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); fCat.focus(); } });
fCat.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); fQtd.focus(); fQtd.select(); } });
fQtd.addEventListener('focus', () => fQtd.select());

$('#busca').addEventListener('input', (ev) => {
  estado.busca = ev.target.value;
  render();
});

$('#chips').addEventListener('click', (ev) => {
  const chip = ev.target.closest('[data-filtro]');
  if (!chip) return;
  estado.filtro = estado.filtro === chip.dataset.filtro ? TODAS : chip.dataset.filtro;
  render();
  window.scrollTo({ top: 0 });
});

document.addEventListener('click', (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const card = alvo.closest('.item');
  const id = card ? Number(card.dataset.id) : null;
  switch (alvo.dataset.acao) {
    case 'mais': return ajustar(id, 1);
    case 'menos': return ajustar(id, -1);
    case 'editar': return abrirForm(estado.itens.get(id));
    case 'novo': return abrirForm(null);
    case 'tentar': return carregar();
    case 'limpar':
      estado.busca = '';
      estado.filtro = TODAS;
      $('#busca').value = '';
      return render();
  }
});

// ---------- Ao vivo (SSE) ----------
function marcarAoVivo(ok) {
  const s = $('#ao-vivo');
  s.dataset.estado = ok ? 'ok' : 'conectando';
  s.querySelector('.ao-vivo-txt').textContent = ok ? 'Ao vivo' : 'Reconectando…';
}

function conectarAoVivo() {
  if (!('EventSource' in window)) return;
  const es = new EventSource('/api/eventos');
  es.addEventListener('open', () => {
    marcarAoVivo(true);
    recarregarEmBreve(); // pega o que mudou enquanto estava desconectado
  });
  es.addEventListener('error', () => marcarAoVivo(false));
  es.addEventListener('mudou', recarregarEmBreve);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') recarregarEmBreve();
});
setInterval(() => { if (document.visibilityState === 'visible') carregar(); }, 30_000);

carregar();
conectarAoVivo();
