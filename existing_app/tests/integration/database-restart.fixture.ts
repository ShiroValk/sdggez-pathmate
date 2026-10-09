/** Real PostgreSQL restart acceptance in an owned disposable container. Never
 * restart the developer's Compose service or attach any existing database volume. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { api } from './helpers';
import { businessFixture } from './business-fixtures';

async function main(): Promise<void> {
  const name = 'pathmate-convergence-' + randomUUID();
  const image = 'postgres:17@sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f';
  function docker(args: string[]): string {
    const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 45000 });
    if (result.status !== 0 || result.error) throw new Error('Owned test container operation failed');
    return result.stdout.trim();
  }
  let container = '';
  let stage = 'container creation';
  let fixture: Awaited<ReturnType<typeof businessFixture>> | undefined;
  async function ready(): Promise<void> {
    for (let i = 0; i < 60; i++) {
      const result = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'synthetic', '-d', 'convergence_restart_test'], { stdio: 'ignore', timeout: 2000 });
      if (result.status === 0) return;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Owned PostgreSQL readiness timed out');
  }
  try {
    const reservation = createServer();
    await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const address = reservation.address();
    assert.ok(address && typeof address !== 'string');
    const hostPort = address.port;
    await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
    container = docker(['run', '--pull=never', '--detach', '--name', name,
      '--publish', `127.0.0.1:${hostPort}:5432`, '--env', 'POSTGRES_USER=synthetic',
      '--env', 'POSTGRES_PASSWORD=SyntheticDatabase002!', '--env', 'POSTGRES_DB=convergence_restart_test', image]);
    assert.match(container, /^[a-f0-9]{64}$/);
    const port = docker(['port', container, '5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/)?.[1];
    assert.equal(port, String(hostPort)); await ready();
    process.env.DATABASE_URL_TEST = `postgresql://synthetic:SyntheticDatabase002!@127.0.0.1:${port}/convergence_restart_test`;
    stage = 'migration and server readiness';
    fixture = await businessFixture(3116);
    const base = fixture.server.base;
    stage = 'demo authentication';
    const demo = await api(base, '/auth/login', { method: 'POST', body: { account: 'demo', password: 'demo1234' } });
    assert.equal(demo.status, 201);
    const demoElder = (await api(base, '/elders', { token: demo.body.token })).body.items[0];
    const resources: { id: string; elderId: string; token: string }[] = [];
    async function readAfterRestart(resource: { elderId: string; token: string }) {
      for (let attempt = 0; attempt < 40; attempt++) {
        let response;
        try { response = await api(base, '/places?elderId=' + resource.elderId, { token: resource.token }); }
        catch (error) { console.error('Reconnect request failed: ' + (error instanceof Error ? error.name : 'unknown')); throw new Error('Reconnect request failed'); }
        if (response.status !== 503) return response;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      throw new Error('Application database reconnect timed out');
    }
    for (const identity of [{ elderId: fixture.elder.id, token: fixture.a.token }, { elderId: demoElder.id, token: demo.body.token }]) {
      stage = 'place creation and edit';
      const added = await api(base, '/places', { method: 'POST', token: identity.token, body: { elderId: identity.elderId, label: 'Database restart synthetic place', icon: '📍' } });
      assert.equal(added.status, 201);
      assert.equal((await api(base, '/places/' + added.body.id, { method: 'PATCH', token: identity.token, body: { icon: '🏦' } })).status, 200);
      resources.push({ ...identity, id: added.body.id });
    }
    stage = 'first database restart and readback';
    docker(['restart', container]); await ready();
    for (const resource of resources) {
      const read = await readAfterRestart(resource);
      assert.equal(read.status, 200);
      assert.equal(read.body.items.find((place: { id: string }) => place.id === resource.id).icon, '🏦');
      assert.equal((await api(base, '/places/' + resource.id, { method: 'DELETE', token: resource.token })).status, 200);
    }
    stage = 'second database restart and deletion readback';
    docker(['restart', container]); await ready();
    for (const resource of resources) {
      const read = await readAfterRestart(resource);
      assert.equal(read.status, 200);
      assert.equal(read.body.items.some((place: { id: string }) => place.id === resource.id), false);
    }
    console.log('Ordinary/demo place edits and deletions survived two real isolated PostgreSQL restarts.');
  } catch (error) {
    console.error('Failed stage: ' + stage + (error instanceof assert.AssertionError ? '; expected=' + String(error.expected) + '; actual=' + String(error.actual) : ''));
    throw new Error('Isolated restart check failed');
  } finally {
    try { await fixture?.close(); }
    finally {
      if (/^[a-f0-9]{64}$/.test(container)) docker(['rm', '--force', '--volumes', container]);
      console.log('Owned isolated container cleaned; development Compose service untouched.');
    }
  }
}
void main().catch(() => { console.error('Real isolated database restart acceptance failed.'); process.exitCode = 1; });
