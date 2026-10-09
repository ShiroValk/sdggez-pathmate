/** Isolated real-service UI acceptance. The loopback relay only delays real
 * responses or injects explicit transport failures; never manufactures success.
 * Control/state artifacts contain synthetic identifiers, never session tokens. */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { businessFixture } from './business-fixtures';
import { startTestServer } from './helpers';

async function main(): Promise<void> {
  const controlPath = '.local-validation/convergence-ui-control.json';
  const statePath = '.local-validation/convergence-ui-state.json';
  mkdirSync('.local-validation', { recursive: true });
  if (existsSync(controlPath) || existsSync(statePath)) throw new Error('Finish the existing fixture first.');
  const fixture = await businessFixture();
  let replacement: Awaited<ReturnType<typeof startTestServer>> | undefined;
  let control: { finish?: boolean; failPath?: string; delayPath?: string; delayMs?: number; restart?: number; frontend?: 'no-map' | 'invalid-map'; blockMap?: boolean } = {};
  let restart = 0;
  let invalidControlReads = 0;
  const counts: Record<string, number> = {};
  const responseCounts: Record<string, number> = {};
  const relay = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const rule = { ...control };
    const key = (request.method ?? 'GET') + ' ' + path;
    counts[key] = (counts[key] ?? 0) + 1;
    try {
      if (rule.blockMap) response.setHeader('content-security-policy', "script-src 'self'; connect-src 'self'; img-src 'self' data: blob:");
      if (rule.frontend && ['no-map', 'invalid-map'].includes(rule.frontend) && !path.startsWith('/api/')) {
        const root = resolve('.local-validation/client-' + rule.frontend);
        const file = resolve(root, path.startsWith('/assets/') ? '.' + path : 'index.html');
        if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) throw new Error('Invalid asset path');
        const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
        const asset = readFileSync(file);
        response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' });
        response.end(asset); return;
      }
      if (rule.failPath && path === rule.failPath) {
        response.writeHead(503, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ statusCode: 503, message: 'Controlled acceptance transport failure' }));
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const name of ['content-type', 'x-memopath-token']) {
        const value = request.headers[name]; if (typeof value === 'string') headers.set(name, value);
      }
      const upstream = await fetch(fixture.server.base + (request.url ?? '/'), {
        method: request.method, headers,
        body: chunks.length ? Buffer.concat(chunks) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      const responseKey = key + ' ' + upstream.status;
      responseCounts[responseKey] = (responseCounts[responseKey] ?? 0) + 1;
      if (rule.delayPath === path && rule.delayMs) await new Promise(resolve => setTimeout(resolve, Math.min(rule.delayMs!, 15000)));
      response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      if (response.headersSent) { response.destroy(); return; }
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ statusCode: 502, message: 'Acceptance upstream unavailable' }));
    }
  });
  try {
    await new Promise<void>(resolve => relay.listen(3103, '127.0.0.1', resolve));
    writeFileSync(controlPath, '{}');
    for (;;) {
      try {
        const updated = JSON.parse(readFileSync(controlPath, 'utf8').replace(/^\uFEFF/u, ''));
        if (!updated || typeof updated !== 'object' || Array.isArray(updated)) throw new Error('Invalid fixture control');
        control = updated;
        invalidControlReads = 0;
      } catch {
        // PowerShell Set-Content truncates before writing. Keep the last rule
        // only during a bounded transient write; malformed controls still fail.
        if (++invalidControlReads >= 4) throw new Error('Invalid fixture control');
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      if (control.finish) break;
      if (control.restart && control.restart !== restart) {
        await (replacement ?? fixture.server).close();
        replacement = await startTestServer(); restart = control.restart;
      }
      writeFileSync(statePath, JSON.stringify({ base: 'http://127.0.0.1:3103', accounts: fixture.keys, elderId: fixture.elder.id, counts, responseCounts, restart }));
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  } finally {
    relay.closeAllConnections(); await new Promise<void>(resolve => relay.close(() => resolve()));
    await replacement?.close(); await fixture.close();
    for (const file of [controlPath, statePath]) if (existsSync(file)) unlinkSync(file);
    console.log('Convergence synthetic fixtures cleaned; development service and database unchanged.');
  }
}
void main().catch(() => { console.error('Convergence UI fixture failed; inspect isolated runtime readiness.'); process.exitCode = 1; });
