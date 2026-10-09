/** Manual page fixture against DATABASE_URL_TEST only. No data collection or
 * simulated medical/location service. Finish through the control file so the
 * owned synthetic accounts, records and actual server are cleaned up. */
import { businessFixture } from './business-fixtures';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

async function main(): Promise<void> {
  const control = '.local-validation/vitals-ui-002-control.json';
  const state = '.local-validation/vitals-ui-002-state.json';
  mkdirSync('.local-validation', { recursive: true });
  if (existsSync(control) || existsSync(state)) throw new Error('Existing manual fixture must be finished before starting another.');
  const fixture = await businessFixture();
  try {
    writeFileSync(state, JSON.stringify({ account: fixture.keys[0], elderId: fixture.elder.id, base: fixture.server.base }));
    writeFileSync(control, JSON.stringify({ steps: 0 }));
    let last = '';
    for (;;) {
      const text = readFileSync(control, 'utf8').replace(/^\uFEFF/u, '');
      if (text !== last) {
        const input: { steps?: number | null; finish?: boolean } = JSON.parse(text);
        if (input.finish) break;
        if (input.steps !== null && input.steps !== 0 && input.steps !== 1250) throw new Error('Unsupported synthetic fixture.');
        last = text;
        await fixture.db`DELETE FROM memopath_vital WHERE elder_id=${fixture.elder.id}`;
        if (input.steps !== null) {
          await fixture.db`INSERT INTO memopath_vital(elder_id,heart_rate,blood_oxygen,temperature,steps,_created_by,_updated_by) VALUES(${fixture.elder.id},70,98,'36.5',${input.steps},${fixture.a.accountId},${fixture.a.accountId})`;
        }
        console.log(JSON.stringify({ operation: 'synthetic_vitals_ui', result: 'fixture_ready', steps: input.steps }));
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    await fixture.close();
    for (const file of [control, state]) if (existsSync(file)) unlinkSync(file);
    console.log('Synthetic UI accounts and records cleaned; development database unchanged.');
  }
}

void main().catch(() => { console.error('Manual fixture failed; check isolated test server and control file.'); process.exitCode = 1; });
