// PreToolUse(Bash): bloqueia comandos destrutivos. Exit 2 = bloqueia e devolve o motivo ao Claude.
let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const cmd = (JSON.parse(input).tool_input?.command || '').trim();
  const perigos = [
    /docker[ -]compose down.*-v/,
    /prisma migrate reset/,
    /rm -rf/,
    /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    /\bTRUNCATE\b/i,
    /git push.*(--force|\s-f\b)/,
    /git reset --hard/,
  ];
  if (perigos.some((regex) => regex.test(cmd))) {
    process.stderr.write(`Comando destrutivo bloqueado: ${cmd}\nPeça confirmação explícita ao usuário antes de rodar.\n`);
    process.exit(2);
  }
  process.exit(0);
});
