/** Real local test database helpers. Test credentials are never printed. Only
 * DATABASE_URL_TEST is used; no fallback to development/restore databases.
 * Fixtures must delete only their own generated accounts/resources, not reset
 * a whole schema. Migration fault tests use separate dedicated empty test DBs.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import postgres from 'postgres';
const requireLocal = createRequire(join(process.cwd(), 'package.json'));
const configuration = requireLocal('./scripts/config.cjs') as {
  loadEnvironment(): void;
  readConfig(source: NodeJS.ProcessEnv, options: { requireTestDatabase: boolean }): { DATABASE_URL_TEST: string };
};

/** Validate target and return a pool; callers own closing it in finally. */
export function testDatabase(): postgres.Sql {
  configuration.loadEnvironment();
  const config = configuration.readConfig(process.env, { requireTestDatabase: true });
  const url = new URL(config.DATABASE_URL_TEST);
  if (url.pathname.startsWith('/pathmate_restore_')) throw new Error('Tests refuse recovery databases.');
  return postgres(config.DATABASE_URL_TEST, { max: 4, connect_timeout: 5 });
}

/** Test-only connection override for a separate child process; never mutate the
 * parent development URL. The migration CLI protects nonempty unknown schemas.
 */
export function migrateTestDatabase(): void {
  configuration.loadEnvironment();
  const config = configuration.readConfig(process.env, { requireTestDatabase: true });
  if (new URL(config.DATABASE_URL_TEST).pathname.startsWith('/pathmate_restore_')) throw new Error('Tests refuse recovery databases.');
  const result = spawnSync(process.execPath, ['scripts/db.cjs', 'migrate'], {
    env: { ...process.env, DATABASE_URL: config.DATABASE_URL_TEST }, encoding: 'utf8',
  });
  if (result.error || result.status !== 0) throw new Error('Test database migration failed; check the local test database and submitted migration files.');
}

/** Isolated synthetic namespace for a fixture; never a real phone/identity. */
export function fixtureAccount(prefix = 'fixture'): string { return `${prefix}_${randomUUID()}`; }

/** HTTP helper deliberately returns status/body separately, never logs tokens. */
export async function api(base: string, route: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const response = await fetch(`${base}/api/memopath${route}`, {
    method: options.method ?? 'GET',
    headers: { ...(options.token ? { 'x-memopath-token': options.token } : {}), ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json(), requestId: response.headers.get('x-request-id') };
}

/** Start the actual built Nest process against the protected test DB; bounded
 * readiness polling and fixed logs do not print credentials/tokens. Close the
 * process even when the caller's assertions fail. No mocked HTTP success path.
 */
export async function startTestServer(port = 3102, databaseUrl?: string, demoEnabled = true) {
  configuration.loadEnvironment();
  const config = configuration.readConfig({ ...process.env, ...(databaseUrl ? { DATABASE_URL_TEST: databaseUrl } : {}) }, { requireTestDatabase: true });
  if (new URL(config.DATABASE_URL_TEST).pathname.startsWith('/pathmate_restore_')) throw new Error('Tests refuse recovery databases.');
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['dist/server/main.js'], {
    env: { ...process.env, DATABASE_URL: config.DATABASE_URL_TEST, SERVER_HOST: '127.0.0.1', SERVER_PORT: String(port), NODE_ENV: 'production', DEMO_ACCOUNT_ENABLED: demoEnabled ? 'true' : 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let startupDiagnostic = '';
  const collectDiagnostic = (data: Buffer) => {
    for (const line of String(data).split('\n')) {
      try { const item = JSON.parse(line); if (['startup', 'configuration'].includes(item.operation)) startupDiagnostic = String(item.operation) + ':' + String(item.result); }
      catch { /* Never include raw output, configuration or stack in a test error. */ }
    }
  };
  child.stdout.on('data', collectDiagnostic); child.stderr.on('data', collectDiagnostic);
  async function close() {
    if (child.exitCode !== null) return;
    child.kill();
    await Promise.race([new Promise<void>(resolve => child.once('exit', () => resolve())), new Promise<void>(resolve => setTimeout(resolve, 3000))]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    if (child.exitCode !== null) { await close(); throw new Error('Actual test server failed before readiness; inspect startup configuration/schema.'); }
    try {
      const response = await fetch(`${base}/api/memopath/auth/exists`, { signal: AbortSignal.timeout(500) });
      if (response.status === 200) return { base, close };
    } catch { /* Readiness only; never substitute a fake server response. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await close(); throw new Error('Actual test server readiness timed out (' + (startupDiagnostic || 'no startup status') + ').');
}
