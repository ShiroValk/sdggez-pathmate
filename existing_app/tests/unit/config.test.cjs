const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readConfig, loadEnvironment, ConfigurationError } = require('../../scripts/config.cjs');
test('build defaults do not require DB; errors never disclose supplied secrets', () => {
  assert.equal(readConfig({}).SESSION_TTL_SECONDS, 86400);
  const secret = 'unit-only-password-marker';
  assert.throws(() => readConfig({ DATABASE_URL: secret }, { requireDatabase: true }), error => error instanceof ConfigurationError && error.message.includes('DATABASE_URL') && !error.message.includes(secret));
});
test('reject coercion, nonloopback and out-of-range configuration', () => {
  for (const [key, values] of Object.entries({ SERVER_HOST: ['0.0.0.0', 'example.org'], SERVER_PORT: ['', '0', '65536', '3.5', '3000junk'], SESSION_TTL_SECONDS: ['59', '604801'], CARE_INVITE_TTL_SECONDS: ['59', '1801'], DEMO_ACCOUNT_ENABLED: ['1', 'TRUE', ''], LOG_LEVEL: ['verbose'] })) {
    for (const value of values) assert.throws(() => readConfig({ [key]: value }), ConfigurationError);
  }
  assert.equal(readConfig({ DEMO_ACCOUNT_ENABLED: 'false' }).DEMO_ACCOUNT_ENABLED, false);
});
test('process overrides local env, local env overrides env', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'pathmate-config-test-'));
  const resolved = path.resolve(folder);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('pathmate-config-test-')) throw new Error('Unsafe test cleanup target');
  try {
    fs.writeFileSync(path.join(folder, '.env'), 'SERVER_PORT=3001\nLOG_LEVEL=error\n');
    fs.writeFileSync(path.join(folder, '.env.local'), 'SERVER_PORT=3002\nLOG_LEVEL=warn\n');
    const source = { LOG_LEVEL: 'debug' };
    loadEnvironment(folder, source);
    assert.equal(source.SERVER_PORT, '3002'); assert.equal(source.LOG_LEVEL, 'debug');
  } finally {
    fs.rmSync(resolved, { recursive: true });
  }
});
test('DB/test consumers require dedicated local credentialed URLs', () => {
  const valid = { DATABASE_URL: 'postgresql://unit:synthetic@127.0.0.1:5432/pathmate' };
  assert.equal(readConfig(valid, { requireDatabase: true }).DATABASE_URL, valid.DATABASE_URL);
  for (const url of ['postgresql://unit:synthetic@example.org/pathmate', 'postgresql://unit@localhost/pathmate', 'postgresql://unit:synthetic@localhost/postgres']) assert.throws(() => readConfig({ DATABASE_URL: url }, { requireDatabase: true }), ConfigurationError);
  assert.throws(() => readConfig({ ...valid, DATABASE_URL_TEST: valid.DATABASE_URL }, { requireTestDatabase: true }), ConfigurationError);
  assert.ok(readConfig({ ...valid, DATABASE_URL_TEST: 'postgresql://unit:synthetic@localhost/pathmate_test' }, { requireTestDatabase: true }));
});
