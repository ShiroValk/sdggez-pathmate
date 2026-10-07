/** Suite dispatcher: no argument means all nine suites, including startup.
 * Missing suite files, bad flags, invalid test target and any test failure exit
 * nonzero. Each suite executes sequentially to avoid shared DB/server conflicts.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const suites = ['startup', 'auth', 'permissions', 'validation', 'persistence', 'config', 'contracts', 'migrations', 'demo'];
const args = process.argv.slice(2);
const selected = args.length === 0 ? suites : args.length === 2 && args[0] === '--suite' && suites.includes(args[1]) ? [args[1]] : [];
if (!selected.length) {
  process.stderr.write('Use test:integration [--suite startup/auth/permissions/validation/persistence/config/contracts/migrations/demo].\n');
  process.exitCode = 1;
} else {
  try {
    const configuration = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs');
    configuration.loadEnvironment();
    const config = configuration.readConfig(process.env, { requireTestDatabase: true });
    if (new URL(config.DATABASE_URL_TEST).pathname.startsWith('/pathmate_restore_')) throw new Error('Recovery databases are protected.');
    for (const suite of selected) {
      const file = join('tests/integration', `${suite}.test.ts`);
      if (!existsSync(file)) { process.stderr.write(`Suite ${suite} not implemented; acceptance has not passed.\n`); process.exitCode = 1; continue; }
      // Helpers retain the development/test distinction, then override the URL
      // only in the actual application/migration child. Never weaken the guard.
      const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', file], { stdio: 'inherit', env: { ...process.env } });
      if (result.error || result.status !== 0) process.exitCode = 1;
    }
  } catch {
    process.stderr.write('Test setup rejected; configure a separate local DATABASE_URL_TEST ending in _test, distinct from development/recovery databases.\n');
    process.exitCode = 1;
  }
}
