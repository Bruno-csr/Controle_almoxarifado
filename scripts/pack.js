'use strict';
// Gera almoxarifado-ejc.tar para upload no CapRover ("Deploy via Upload").
// O captain-definition precisa estar na raiz do .tar.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const saida = 'almoxarifado-ejc.tar';
const arquivos = ['captain-definition', 'Dockerfile', '.dockerignore', 'package.json', 'server.js', 'public'];

for (const a of arquivos) {
  if (!fs.existsSync(path.join(raiz, a))) throw new Error(`Faltando: ${a}`);
}
fs.rmSync(path.join(raiz, saida), { force: true });
execFileSync('tar', ['-cf', saida, ...arquivos], { cwd: raiz, stdio: 'inherit' });
const kb = (fs.statSync(path.join(raiz, saida)).size / 1024).toFixed(1);
console.log(`Gerado ${saida} (${kb} KB). Envie em CapRover → app → Deployment → "Deploy via Upload".`);
