/** Actual production HTTP routing acceptance. Unknown assets/APIs must fail,
 * not return SPA success. Development lifecycle acceptance is added separately.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { api, migrateTestDatabase, startTestServer } from './helpers';

test('production same-origin SPA, API, refresh and missing resources', async () => {
  migrateTestDatabase();
  const server = await startTestServer(3104);
  try {
    for (const route of ['/', '/memopath', '/memopath/settings']) {
      const response = await fetch(server.base + route);
      assert.equal(response.status, 200); assert.ok(response.headers.get('content-type')?.includes('text/html'));
      assert.match(await response.text(), /<div id="root">/);
    }
    assert.equal((await api(server.base, '/auth/exists')).status, 200);
    for (const route of ['/api/not-a-route', '/api/memopath/no-such-api', '/assets/no-such-file.js', '/no-such-file.css']) {
      const response = await fetch(server.base + route);
      assert.equal(response.status, 404, 'missing resource must not return SPA HTML');
      assert.ok(response.headers.get('content-type')?.includes('application/json'));
      const body = await response.json(); assert.equal(body.error.code, 'NOT_FOUND');
    }
  } finally { await server.close(); }
});

test('development DB startup failure terminates both workers and leaves no Vite listener', async () => {
  const configuration = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs');
  configuration.loadEnvironment();
  const config = configuration.readConfig(process.env, { requireTestDatabase: true });
  // Do not claim ownership of a preexisting developer's Vite process.
  await assert.rejects(fetch('http://127.0.0.1:5173/', { signal: AbortSignal.timeout(500) }), '5173 must be free for isolated dev lifecycle test');
  const unavailable = new URL(config.DATABASE_URL_TEST); unavailable.port = '65432';
  const child = spawn(process.execPath, ['node_modules/concurrently/dist/bin/concurrently.js', '--kill-others',
    'node scripts/run.cjs dev:server', 'node scripts/run.cjs dev:client'], {
    env: { ...process.env, DATABASE_URL: unavailable.toString(), SERVER_PORT: '3105' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = ''; child.stdout.on('data', chunk => { output += String(chunk); }); child.stderr.on('data', chunk => { output += String(chunk); });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const status = await Promise.race([
      new Promise<number | null>(resolve => child.once('exit', resolve)),
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Dev workers did not stop after DB failure')), 15000); }),
    ]);
    assert.notEqual(status, 0, 'dev failure must exit nonzero');
    assert.ok(output.includes('dependency_or_schema_rejected'));
    assert.ok(!output.includes(unavailable.password), 'dev failure redacts credentials');
    await assert.rejects(fetch('http://127.0.0.1:5173/', { signal: AbortSignal.timeout(500) }), 'Vite must stop when backend fails');
    await assert.rejects(fetch('http://127.0.0.1:3105/', { signal: AbortSignal.timeout(500) }));
  } finally { if (timer) clearTimeout(timer); if (child.exitCode === null) child.kill(); }
});

test('healthy development workers serve SPA and proxy the actual API', async () => {
  const configuration = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs');
  configuration.loadEnvironment();
  const config = configuration.readConfig(process.env, { requireTestDatabase: true });
  await assert.rejects(fetch('http://127.0.0.1:5173/', { signal: AbortSignal.timeout(500) }), '5173 must be free');
  const child = spawn(process.execPath, ['node_modules/concurrently/dist/bin/concurrently.js', '--kill-others',
    'node scripts/run.cjs dev:server', 'node scripts/run.cjs dev:client'], {
    env: { ...process.env, DATABASE_URL: config.DATABASE_URL_TEST, SERVER_PORT: '3105' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let workerOutput = '';
  const collect = (chunk: Buffer): void => { workerOutput = (workerOutput + chunk.toString()).slice(-8000); };
  child.stdout.on('data', collect); child.stderr.on('data', collect);
  try {
    let ready = false;
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch('http://127.0.0.1:5173/api/memopath/auth/exists', { signal: AbortSignal.timeout(500) });
        if (response.status === 200 && (await response.json()).exists === false) { ready = true; break; }
      } catch { /* bounded readiness; no fake API */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let diagnosis = workerOutput.split('\n').filter(line => /error|failed|rejected|EADDRINUSE|Cannot/i.test(line)).join('\n');
    for (const name of ['DATABASE_URL', 'DATABASE_URL_TEST', 'POSTGRES_PASSWORD', 'VITE_AMAP_KEY']) {
      const secret = process.env[name]; if (secret) diagnosis = diagnosis.split(secret).join('[REDACTED]');
    }
    diagnosis = diagnosis.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DB_URL]').replace(/[a-f0-9]{32}/gi, '[REDACTED]');
    assert.ok(ready, `actual development API must become ready; exit=${child.exitCode}; ${diagnosis}`);
    for (const route of ['/', '/memopath']) {
      const response = await fetch('http://127.0.0.1:5173' + route);
      assert.equal(response.status, 200); assert.match(await response.text(), /<div id="root">/);
    }
  } finally {
    if (child.exitCode === null && child.pid) {
      // Kill only the child process tree created by this fixture, never a port
      // owner's guessed PID or a user's existing server. Windows lacks groups.
      if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else child.kill();
      if (child.exitCode === null) await new Promise<void>(resolve => child.once('exit', () => resolve()));
    }
  }
  await assert.rejects(fetch('http://127.0.0.1:5173/', { signal: AbortSignal.timeout(500) }));
  await assert.rejects(fetch('http://127.0.0.1:3105/', { signal: AbortSignal.timeout(500) }));
});
