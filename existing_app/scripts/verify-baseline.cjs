/** Run the archived 0000 artifact, never rebuild it with current schema code.
 * Uses only validated DATABASE_URL_TEST; synthetic fixtures are removed by key.
 * No credentials or response bodies are logged. A failed assertion exits nonzero.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const postgres = require('postgres');
const { loadEnvironment, readConfig } = require('./config.cjs');
const project = path.resolve(__dirname, '..');
const baseline = path.join(project, '.local-baselines/0000');
const app = path.join(baseline, 'app');
const base = 'http://127.0.0.1:3108';
const accounts = [0, 1].map(() => 'baseline_' + randomUUID());
let child;
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill();
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
async function request(route, options = {}) {
  const result = await fetch(base + '/api/memopath' + route, {
    method: options.method || 'GET', signal: AbortSignal.timeout(5000),
    headers: { ...(options.token ? { 'x-memopath-token': options.token } : {}), ...(options.body ? { 'content-type': 'application/json' } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return { status: result.status, body: await result.json() };
}
async function start(url) {
  child = spawn(process.execPath, ['dist/server/main.js'], {
    cwd: app, env: { ...process.env, DATABASE_URL: url, SERVER_HOST: '127.0.0.1', SERVER_PORT: '3108', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {}); child.stderr.on('data', () => {});
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Baseline startup failed');
    try { if ((await request('/auth/exists')).status === 200) return; } catch { /* real readiness retry */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Baseline startup deadline');
}
async function verify() {
  const manifest = JSON.parse(fs.readFileSync(path.join(baseline, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schema, '0000');
  for (const [file, hash] of Object.entries(manifest.hashes)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(app, file))).digest('hex'), hash, 'baseline hash mismatch');
  }
  loadEnvironment(project);
  const config = readConfig(process.env, { requireTestDatabase: true });
  assert.ok(!new URL(config.DATABASE_URL_TEST).pathname.startsWith('/pathmate_restore_'));
  let testUrl = config.DATABASE_URL_TEST;
  const args=process.argv.slice(2);
  if(args.length) {
    assert.equal(args.length,2);assert.equal(args[0],'--restored');assert.match(args[1],/^pathmate_restore_[a-z0-9_]{1,45}$/);
    const receipt=JSON.parse(fs.readFileSync(path.join(project,'.local-backups',args[1]+'.json'),'utf8'));
    assert.equal(receipt.database,args[1]);assert.equal(receipt.schemaVersion,'0000');assert.equal(receipt.sessionsRevoked,true);
    const backup=JSON.parse(fs.readFileSync(path.join(project,'.local-backups',receipt.archive+'.json'),'utf8'));
    assert.equal(backup.verifiedRestore,true);assert.equal(backup.matchingBuild,createHash('sha256').update(fs.readFileSync(path.join(baseline,'manifest.json'))).digest('hex'));
    assert.equal(backup.sha256,createHash('sha256').update(fs.readFileSync(path.join(project,'.local-backups',receipt.archive))).digest('hex'));
    const url=new URL(testUrl);url.pathname='/'+args[1];testUrl=url.toString();
  }
  const db = postgres(testUrl, { max: 2, connect_timeout: 5 });
  try {
    await start(testUrl);
    const identities = [];
    const password = 'Synthetic123!';
    for (const account of accounts) {
      const registered = await request('/auth/register', { method: 'POST', body: { account, password, role: 'family', elder: { name: '基線測試長者' } } });
      assert.equal(registered.status, 201); identities.push(registered.body);
    }
    const [a, b] = identities;
    const elder = (await request('/elders', { token: a.token })).body.items[0];
    assert.equal((await request('/dashboard?elderId=' + elder.id, { token: b.token })).status, 403);
    assert.equal((await request('/elders/' + elder.id, { method: 'PATCH', token: a.token, body: { address: 'Baseline persistence fixture' } })).status, 200);
    await stop(); await start(testUrl);
    assert.equal((await request('/elders', { token: a.token })).body.items[0].address, 'Baseline persistence fixture');
    const login = await request('/auth/login', { method: 'POST', body: { account: accounts[0], password } });
    assert.equal(login.status, 201);
    assert.equal((await request('/auth/me', { token: a.token })).status, 401);
    assert.equal((await request('/auth/logout', { method: 'POST', token: login.body.token })).status, 201);
    assert.equal((await request('/auth/me', { token: login.body.token })).status, 401);
    process.stdout.write(JSON.stringify({ operation: 'verify_baseline', schema: '0000', result: 'passed', checks: ['manifest hashes', 'actual archived startup', 'registration', 'login', 'cross-account isolation', 'save and restart', 'logout revocation'] }) + '\n');
  } finally {
    await stop();
    const rows = await db`SELECT id FROM memopath_account WHERE account_key IN ${db(accounts)}`;
    for (const row of rows) {
      await db`DELETE FROM memopath_elder WHERE owner_account_id=${row.id}`;
      await db`DELETE FROM memopath_setting WHERE account_id=${row.id}`;
      await db`DELETE FROM memopath_account WHERE id=${row.id}`;
    }
    await db.end({ timeout: 5 });
  }
}
verify().catch(() => { process.stderr.write('Archived baseline verification failed; no credentials or response bodies printed.\n'); process.exitCode = 1; });
