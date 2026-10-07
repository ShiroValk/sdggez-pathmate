/** Archive the verified 0000 working snapshot and matching rebuilt assets.
 * --source must be an isolated local-validation snapshot in this workspace.
 * Never overwrite an existing baseline, copy dependencies/private env, or
 * archive configured map credentials. Errors expose only a fixed operation.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { loadEnvironment } = require('./config.cjs');
const project = path.resolve(__dirname, '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const trees = ['client', 'server', 'shared', 'scripts'];
const rootFiles = ['package.json', 'package-lock.json', '.env.example', '.npmrc', '.swcrc', '.stylelintrc.js',
  '.dockerignore', 'compose.yaml', 'drizzle.config.ts', 'eslint.config.js', 'nest-cli.json', 'postcss.config.js',
  'tailwind.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'README.md'];
function files(root, relative = '') {
  const target = path.join(root, relative);
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error('Symbolic link rejected');
  if (!stat.isDirectory()) return [relative];
  return fs.readdirSync(target).sort().flatMap(name => files(root, path.join(relative, name)));
}
function sourceFiles(root) {
  return [...trees.filter(name => fs.existsSync(path.join(root, name))).flatMap(name => files(root, name)),
    ...rootFiles.filter(name => fs.existsSync(path.join(root, name)))].sort();
}
function verifyNoSecrets(root, entries, secrets) {
  for (const file of entries) {
    if (/^\.env(?:\.local)?$/.test(path.basename(file))) throw new Error('Private environment rejected');
    const data = fs.readFileSync(path.join(root, file));
    if (secrets.some(value => data.includes(Buffer.from(value)))) throw new Error('Configured credential detected');
  }
}
function archive() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--source') throw new Error('Use --source with isolated snapshot');
  const validationRoot = fs.realpathSync(path.join(project, '.local-validation'));
  const source = fs.realpathSync(path.resolve(args[1]));
  if (!source.startsWith(validationRoot + path.sep)) throw new Error('Source outside isolated validation workspace');
  const baselineRoot = path.join(project, '.local-baselines');
  fs.mkdirSync(baselineRoot, { recursive: true });
  const resolvedRoot = fs.realpathSync(baselineRoot);
  if (!resolvedRoot.startsWith(fs.realpathSync(project) + path.sep)) throw new Error('Unsafe baseline directory');
  const destination = path.join(resolvedRoot, '0000');
  if (fs.existsSync(destination)) throw new Error('Existing baseline protected');
  const journal = JSON.parse(fs.readFileSync(path.join(source, 'server/database/migrations/meta/_journal.json')));
  if (journal.entries.length !== 1 || !journal.entries[0].tag.startsWith('0000_')) throw new Error('Expected only 0000 migration');
  const inputs = sourceFiles(source);
  if (JSON.stringify(inputs) !== JSON.stringify(sourceFiles(project))) {
    throw new Error('Source snapshot file inventory no longer matches current implementation');
  }
  // The copied working tree must still match the reviewed current source.
  for (const relative of inputs.filter(file => file !== 'README.md')) {
    if (!fs.existsSync(path.join(project, relative)) || sha(fs.readFileSync(path.join(project, relative))) !== sha(fs.readFileSync(path.join(source, relative)))) {
      throw new Error('Source snapshot no longer matches current implementation');
    }
  }
  loadEnvironment(project);
  const secrets = ['POSTGRES_PASSWORD', 'DATABASE_URL', 'DATABASE_URL_TEST', 'VITE_AMAP_KEY', 'AMAP_SECURITY_JS_CODE']
    .map(name => process.env[name]).filter(value => typeof value === 'string' && value.length > 0);
  for (const name of ['DATABASE_URL', 'DATABASE_URL_TEST']) {
    try { const password = decodeURIComponent(new URL(process.env[name]).password); if (password) secrets.push(password); } catch { /* absent configuration */ }
  }
  verifyNoSecrets(source, inputs, secrets);
  for (const command of ['build:server', 'build:client']) {
    const result = spawnSync(process.execPath, ['scripts/run.cjs', command], {
      cwd: source, env: { ...process.env, VITE_AMAP_KEY: '', DATABASE_URL: '', DATABASE_URL_TEST: '' }, stdio: 'pipe', encoding: 'utf8', timeout: 120000,
    });
    if (result.error || result.status !== 0) throw new Error('Secret-free matching build failed');
  }
  const artifacts = files(source, 'dist');
  for (const relative of ['dist/server/main.js', 'dist/client/index.html']) {
    if (!artifacts.includes(path.normalize(relative))) throw new Error('Required compiled artifact missing');
  }
  verifyNoSecrets(source, artifacts, secrets);
  const staging = path.join(resolvedRoot, '0000.pending.' + crypto.randomUUID());
  const app = path.join(staging, 'app');
  fs.mkdirSync(app, { recursive: true });
  const entries = [...inputs, ...artifacts].sort();
  for (const relative of entries) {
    fs.mkdirSync(path.dirname(path.join(app, relative)), { recursive: true });
    fs.copyFileSync(path.join(source, relative), path.join(app, relative));
  }
  const hashes = Object.fromEntries(entries.map(relative => [relative.replaceAll(path.sep, '/'), sha(fs.readFileSync(path.join(app, relative)))]));
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: project, encoding: 'utf8' });
  const manifest = { schema: '0000', createdAt: new Date().toISOString(), snapshotKind: 'reviewed working tree, not clean Git commit',
    gitHead: revision.status === 0 ? revision.stdout.trim() : null, node: process.version,
    lockSha256: hashes['package-lock.json'], sourceSha256: sha(JSON.stringify(inputs.map(file => [file, hashes[file.replaceAll(path.sep, '/')]]))),
    buildCommands: ['build:server', 'build:client'], mapKeyConfigured: false, privateConfigurationIncluded: false, dependenciesIncluded: false, hashes };
  fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(staging, 'README.md'), '0000 recovery baseline. Verify manifest hashes before use.\nRun npm.cmd ci in app using its archived lock, inject ignored configuration for an isolated restored 0000 database, then npm.cmd start.\nDatabase backups and 0001 restore rehearsal are separate later tasks; this archive does not claim rollback acceptance.\n');
  fs.renameSync(staging, destination);
  process.stdout.write(JSON.stringify({ operation: 'archive_baseline', result: 'archived', schema: '0000', directory: destination,
    files: entries.length, lockSha256: manifest.lockSha256, configuredSecretScan: 'passed' }) + '\n');
}
try { archive(); } catch {
  process.stderr.write(JSON.stringify({ operation: 'archive_baseline', result: 'rejected',
    hint: 'Check isolated source matches current 0000, baseline does not already exist, dependencies/build and private-configuration exclusion.' }) + '\n');
  process.exitCode = 1;
}
