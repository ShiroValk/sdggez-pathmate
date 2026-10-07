import { createRequire } from 'node:module';
import { join } from 'node:path';

/** Shared validated configuration. Runtime cwd is existing_app; secrets only
 * reach their consumers, and errors never contain input values. */
export interface RuntimeConfig {
  SERVER_HOST: string;
  SERVER_PORT: number;
  SESSION_TTL_SECONDS: number;
  CARE_INVITE_TTL_SECONDS: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  DEMO_ACCOUNT_ENABLED: boolean;
  DATABASE_URL: string;
}
const configModule = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs') as {
  loadEnvironment(): NodeJS.ProcessEnv;
  readConfig(source: NodeJS.ProcessEnv, options: { requireDatabase: boolean }): RuntimeConfig;
};
/** Throws sanitized configuration errors before listening or connecting. */
export function loadRuntimeConfig(): RuntimeConfig {
  return configModule.readConfig(configModule.loadEnvironment(), { requireDatabase: true });
}
