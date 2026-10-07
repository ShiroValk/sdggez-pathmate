/** Shared configuration for Windows launchers, DB tools and Nest.
 * Errors contain variable names and instructions, never supplied values.
 * Process > .env.local > .env; build needs no database connection/config.
 */
const path = require('node:path');
const dotenv = require('dotenv');
class ConfigurationError extends Error {
  constructor(name, instruction) { super(`${name}: ${instruction}`); this.name = 'ConfigurationError'; }
}
/** Load ignored files without replacing process-supplied values. */
function loadEnvironment(projectDir = path.resolve(__dirname, '..'), target = process.env) {
  dotenv.config({ path: [path.join(projectDir, '.env.local'), path.join(projectDir, '.env')], processEnv: target, quiet: true });
  return target;
}
function integer(source, name, fallback, minimum, maximum) {
  const value = source[name] === undefined ? String(fallback) : source[name];
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new ConfigurationError(name, 'supply an integer');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) throw new ConfigurationError(name, `supply an integer between ${minimum} and ${maximum}`);
  return parsed;
}
/** Local dedicated DB only; never forward URL parser exceptions to output. */
function databaseUrl(value, name = 'DATABASE_URL') {
  try {
    if (typeof value !== 'string' || !value) throw new Error();
    const parsed = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
        !decodeURIComponent(parsed.username) || !decodeURIComponent(parsed.password) ||
        !/^\/[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(parsed.pathname) || parsed.pathname === '/postgres' ||
        parsed.hash || parsed.search || (parsed.port && (Number(parsed.port) < 1 || Number(parsed.port) > 65535))) throw new Error();
    return parsed;
  } catch { throw new ConfigurationError(name, 'configure a local PostgreSQL URL with username, password and a dedicated database in .env.local'); }
}
/** Typed defaults, with DB/Compose/test requirements selected by the consumer. */
function readConfig(source = process.env, { requireDatabase = false, requireCompose = false, requireTestDatabase = false } = {}) {
  const host = source.SERVER_HOST ?? '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new ConfigurationError('SERVER_HOST', 'use a loopback address');
  const level = source.LOG_LEVEL ?? 'info';
  if (!['error', 'warn', 'info', 'debug'].includes(level)) throw new ConfigurationError('LOG_LEVEL', 'use error, warn, info or debug');
  const demo = source.DEMO_ACCOUNT_ENABLED ?? 'true';
  if (!['true', 'false'].includes(demo)) throw new ConfigurationError('DEMO_ACCOUNT_ENABLED', 'use exactly true or false');
  const output = {
    SERVER_HOST: host, SERVER_PORT: integer(source, 'SERVER_PORT', 3000, 1, 65535),
    SESSION_TTL_SECONDS: integer(source, 'SESSION_TTL_SECONDS', 86400, 60, 604800),
    CARE_INVITE_TTL_SECONDS: integer(source, 'CARE_INVITE_TTL_SECONDS', 600, 60, 1800),
    LOG_LEVEL: level, DEMO_ACCOUNT_ENABLED: demo === 'true', VITE_AMAP_KEY: source.VITE_AMAP_KEY ?? '',
  };
  if (requireDatabase) { databaseUrl(source.DATABASE_URL); output.DATABASE_URL = source.DATABASE_URL; }
  if (requireCompose) {
    for (const name of ['POSTGRES_USER', 'POSTGRES_DB']) {
      if (typeof source[name] !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(source[name]) || (name === 'POSTGRES_DB' && source[name] === 'postgres')) throw new ConfigurationError(name, 'supply a dedicated simple identifier of at most 63 characters');
      output[name] = source[name];
    }
    if (typeof source.POSTGRES_PASSWORD !== 'string' || !source.POSTGRES_PASSWORD) throw new ConfigurationError('POSTGRES_PASSWORD', 'set a nonempty local password');
    output.POSTGRES_PASSWORD = source.POSTGRES_PASSWORD;
  }
  if (requireTestDatabase) {
    const test = databaseUrl(source.DATABASE_URL_TEST, 'DATABASE_URL_TEST');
    if (!test.pathname.endsWith('_test') || (source.DATABASE_URL && test.pathname === databaseUrl(source.DATABASE_URL).pathname)) throw new ConfigurationError('DATABASE_URL_TEST', 'use a separate local database ending in _test');
    output.DATABASE_URL_TEST = source.DATABASE_URL_TEST;
  }
  return output;
}
module.exports = { ConfigurationError, loadEnvironment, readConfig, databaseUrl };
