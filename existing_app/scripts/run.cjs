/**
 * Run the existing application tools with a portable NODE_ENV setting.
 * Accepts a package script name and forwards extra CLI arguments. Child output
 * and exit status are preserved; no shell or platform credentials are required
 * by this launcher. Backend start validates independent local configuration.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const projectDir = path.resolve(__dirname, '..');
// Load backend settings before application modules read process.env. Existing
// shell variables take precedence, followed by .env.local and then .env.
const { loadEnvironment, readConfig } = require('./config.cjs');
loadEnvironment(projectDir);
const commands = {
  'dev:server': ['development', 'node_modules/@nestjs/cli/bin/nest.js', 'start', '--watch'],
  'dev:client': ['development', 'node_modules/vite/bin/vite.js', '--config', 'vite.config.ts', '--host', '127.0.0.1'],
  'build:server': ['production', 'node_modules/@nestjs/cli/bin/nest.js', 'build'],
  'build:client': ['production', 'node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.ts'],
  start: ['production', 'dist/server/main.js'],
  preview: ['production', 'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1'],
};

const [commandName, ...extraArgs] = process.argv.slice(2);
const command = commands[commandName];
if (!command) {
  console.error(`Unknown application command: ${commandName}`);
  process.exit(1);
}

const [nodeEnv, entry, ...args] = command;
try {
  readConfig(process.env, { requireDatabase: ['start', 'dev:server'].includes(commandName) });
} catch (error) {
  console.error(JSON.stringify({ time: new Date().toISOString(), level: 'error', requestId: randomUUID(), operation: commandName, result: 'configuration_rejected', message: error.message }));
  process.exit(1);
}
/** Nest watch survives an application startup failure. Preflight the same schema
 * boundary before starting watch so a missing DB makes this worker terminate,
 * allowing concurrently --kill-others to stop Vite instead of false readiness.
 */
async function launch() {
  if (commandName === 'dev:server') {
    const postgres = require('postgres');
    const { assertSchema, migrationFiles } = require('./db.cjs');
    const client = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5 });
    try { await client`SELECT 1`; await assertSchema(client, migrationFiles(), '0001'); }
    finally { await client.end({ timeout: 1 }); }
  }
  const child = spawn(process.execPath, [path.join(projectDir, entry), ...args, ...extraArgs], {
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: nodeEnv },
    stdio: 'inherit',
  });
  child.on('error', () => {
    console.error(JSON.stringify({ time: new Date().toISOString(), level: 'error', requestId: randomUUID(), operation: commandName, result: 'launch_failed', hint: 'Check local dependencies and run npm ci/build.' }));
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
}
launch().catch(() => {
  console.error(JSON.stringify({ time: new Date().toISOString(), level: 'error', requestId: randomUUID(), operation: commandName, result: 'dependency_or_schema_rejected', hint: 'Check local PostgreSQL and run npm run db:check/status/migrate.' }));
  process.exitCode = 1;
});
