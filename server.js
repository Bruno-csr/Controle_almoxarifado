'use strict';
// Almoxarifado EJC BDI — servidor HTTP sem dependências (Node 24 + node:sqlite).
// Contrato da API: specs/03-contrato-api.md · Regras: specs/02-regras-de-negocio.md

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const LIMITE_CORPO = 10 * 1024;
const QTD_MAX = 1_000_000;
const PASTA_PUBLICA = path.join(__dirname, 'public');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

class ErroHttp extends Error {
  constructor(status, mensagem, extra) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

// ---------- Banco ----------
function abrirBanco(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'almoxarifado.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS itens (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT    NOT NULL COLLATE NOCASE UNIQUE,
      categoria     TEXT    NOT NULL,
      quantidade    INTEGER NOT NULL CHECK (quantidade >= 0),
      versao        INTEGER NOT NULL DEFAULT 1,
      criado_em     TEXT    NOT NULL,
      atualizado_em TEXT    NOT NULL
    );
  `);
  return {
    db,
    listar: db.prepare('SELECT * FROM itens ORDER BY categoria COLLATE NOCASE, nome COLLATE NOCASE'),
    buscar: db.prepare('SELECT * FROM itens WHERE id = ?'),
    inserir: db.prepare(
      'INSERT INTO itens (nome, categoria, quantidade, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ),
    atualizar: db.prepare(
      `UPDATE itens SET nome = ?, categoria = ?, quantidade = ?, versao = versao + 1, atualizado_em = ?
       WHERE id = ? AND versao = ? RETURNING *`
    ),
    // R2: ajuste atômico no SQL; R1: só aplica se não ficar negativo.
    ajustar: db.prepare(
      `UPDATE itens SET quantidade = quantidade + ?, versao = versao + 1, atualizado_em = ?
       WHERE id = ? AND quantidade + ? BETWEEN 0 AND ${QTD_MAX} RETURNING *`
    ),
    excluir: db.prepare('DELETE FROM itens WHERE id = ?'),
  };
}

// ---------- Validação ----------
function texto(valor, max, mensagem) {
  if (typeof valor !== 'string') throw new ErroHttp(400, mensagem);
  const limpo = valor.trim().replace(/\s+/g, ' ');
  if (limpo.length < 1 || limpo.length > max) throw new ErroHttp(400, mensagem);
  return limpo;
}

function validarItem(corpo) {
  const nome = texto(corpo.nome, 100, 'Informe o nome (até 100 caracteres)');
  const categoria = texto(corpo.categoria, 50, 'Informe a categoria (até 50 caracteres)');
  const quantidade = corpo.quantidade;
  if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > QTD_MAX) {
    throw new ErroHttp(400, 'Quantidade deve ser um número inteiro de 0 a 1.000.000');
  }
  return { nome, categoria, quantidade };
}

function idDaRota(valor) {
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id < 1) throw new ErroHttp(404, 'Item não encontrado');
  return id;
}

function ehNomeDuplicado(err) {
  return err && typeof err.message === 'string' && err.message.includes('UNIQUE');
}

// ---------- CSV ----------
function campoCsv(valor) {
  let s = String(valor);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmula no Excel
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ---------- HTTP utilitários ----------
function enviarJson(res, status, dados) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(corpo);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    let excedeu = false;
    const partes = [];
    req.on('data', (parte) => {
      if (excedeu) return; // descarta o resto sem derrubar a conexão
      tamanho += parte.length;
      if (tamanho > LIMITE_CORPO) {
        excedeu = true;
        partes.length = 0;
        reject(new ErroHttp(413, 'Requisição muito grande'));
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => {
      if (excedeu) return;
      try {
        const bruto = Buffer.concat(partes).toString('utf8');
        const dados = bruto ? JSON.parse(bruto) : {};
        if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error();
        resolve(dados);
      } catch {
        reject(new ErroHttp(400, 'JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function servirEstatico(req, res, rota) {
  const relativo = rota === '/' ? 'index.html' : decodeURIComponent(rota).replace(/^\/+/, '');
  const arquivo = path.resolve(PASTA_PUBLICA, relativo);
  if (!arquivo.startsWith(PASTA_PUBLICA + path.sep)) return false;
  let stat;
  try {
    stat = fs.statSync(arquivo);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;
  const tipo = TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': tipo,
    'Content-Length': stat.size,
    'Cache-Control': tipo.startsWith('text/html') ? 'no-cache' : 'public, max-age=300',
  });
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(arquivo).pipe(res);
  return true;
}

// ---------- Servidor ----------
function criarServidor({ dataDir }) {
  const banco = abrirBanco(dataDir);
  const ouvintes = new Set();

  function avisar(tipo, id) {
    const msg = `event: mudou\ndata: ${JSON.stringify({ tipo, id })}\n\n`;
    for (const res of ouvintes) res.write(msg);
  }

  const manterVivo = setInterval(() => {
    for (const res of ouvintes) res.write(': ping\n\n');
  }, 25_000);
  manterVivo.unref();

  async function rotear(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const rota = url.pathname;
    const metodo = req.method;
    const agora = () => new Date().toISOString();

    if (rota === '/api/saude' && metodo === 'GET') return enviarJson(res, 200, { ok: true });

    if (rota === '/api/eventos' && metodo === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('retry: 3000\n\n');
      ouvintes.add(res);
      req.on('close', () => ouvintes.delete(res));
      return;
    }

    if (rota === '/api/itens' && metodo === 'GET') {
      return enviarJson(res, 200, { itens: banco.listar.all() });
    }

    if (rota === '/api/itens.csv' && metodo === 'GET') {
      const linhas = ['Nome;Categoria;Quantidade'];
      for (const it of banco.listar.all()) {
        linhas.push([campoCsv(it.nome), campoCsv(it.categoria), it.quantidade].join(';'));
      }
      const data = new Date().toISOString().slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="almoxarifado-ejc-${data}.csv"`,
        'Cache-Control': 'no-store',
      });
      return res.end('﻿' + linhas.join('\r\n') + '\r\n');
    }

    if (rota === '/api/itens' && metodo === 'POST') {
      const { nome, categoria, quantidade } = validarItem(await lerCorpo(req));
      try {
        const item = banco.inserir.get(nome, categoria, quantidade, agora(), agora());
        avisar('criado', item.id);
        return enviarJson(res, 201, item);
      } catch (err) {
        if (ehNomeDuplicado(err)) throw new ErroHttp(409, 'Já existe um item com esse nome');
        throw err;
      }
    }

    const ajuste = rota.match(/^\/api\/itens\/([^/]+)\/ajuste$/);
    if (ajuste && metodo === 'POST') {
      const id = idDaRota(ajuste[1]);
      const { delta } = await lerCorpo(req);
      if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > QTD_MAX) {
        throw new ErroHttp(400, 'Ajuste inválido');
      }
      const item = banco.ajustar.get(delta, agora(), id, delta);
      if (!item) {
        const atual = banco.buscar.get(id);
        if (!atual) throw new ErroHttp(404, 'Item não encontrado');
        if (atual.quantidade + delta < 0) {
          throw new ErroHttp(409, 'Quantidade não pode ficar negativa', { item: atual });
        }
        throw new ErroHttp(400, 'Quantidade deve ser um número inteiro de 0 a 1.000.000');
      }
      avisar('alterado', id);
      return enviarJson(res, 200, item);
    }

    const umItem = rota.match(/^\/api\/itens\/([^/]+)$/);
    if (umItem && metodo === 'PUT') {
      const id = idDaRota(umItem[1]);
      const corpo = await lerCorpo(req);
      const { nome, categoria, quantidade } = validarItem(corpo);
      if (!Number.isInteger(corpo.versao) || corpo.versao < 1) throw new ErroHttp(400, 'Versão inválida');
      let item;
      try {
        item = banco.atualizar.get(nome, categoria, quantidade, agora(), id, corpo.versao);
      } catch (err) {
        if (ehNomeDuplicado(err)) throw new ErroHttp(409, 'Já existe um item com esse nome');
        throw err;
      }
      if (!item) {
        const atual = banco.buscar.get(id);
        if (!atual) throw new ErroHttp(404, 'Item não encontrado');
        throw new ErroHttp(409, 'Este item foi alterado por outra pessoa', { item: atual });
      }
      avisar('alterado', id);
      return enviarJson(res, 200, item);
    }

    if (umItem && metodo === 'DELETE') {
      const id = idDaRota(umItem[1]);
      const { changes } = banco.excluir.run(id);
      if (!changes) throw new ErroHttp(404, 'Item não encontrado');
      avisar('excluido', id);
      res.writeHead(204);
      return res.end();
    }

    if (rota.startsWith('/api/')) throw new ErroHttp(404, 'Rota não encontrada');

    if ((metodo === 'GET' || metodo === 'HEAD') && servirEstatico(req, res, rota)) return;
    throw new ErroHttp(404, 'Página não encontrada');
  }

  const servidor = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    );
    try {
      await rotear(req, res);
    } catch (err) {
      if (res.headersSent) return res.end();
      if (err instanceof ErroHttp) return enviarJson(res, err.status, { error: err.message, ...err.extra });
      console.error(err);
      enviarJson(res, 500, { error: 'Erro interno no servidor' });
    }
  });

  servidor.on('close', () => {
    clearInterval(manterVivo);
    for (const res of ouvintes) res.end();
    banco.db.close();
  });

  servidor.fecharTudo = () =>
    new Promise((resolve) => {
      for (const res of ouvintes) res.end();
      ouvintes.clear();
      servidor.closeAllConnections();
      servidor.close(() => resolve());
    });

  return servidor;
}

module.exports = { criarServidor };

if (require.main === module) {
  const porta = Number(process.env.PORT) || 3000;
  const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
  const servidor = criarServidor({ dataDir });
  servidor.listen(porta, () => console.log(`Almoxarifado EJC BDI em http://localhost:${porta} (dados em ${dataDir})`));
  const encerrar = () => servidor.fecharTudo().then(() => process.exit(0));
  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
}
