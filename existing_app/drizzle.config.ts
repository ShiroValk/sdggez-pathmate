import { defineConfig } from 'drizzle-kit';
import configuration from './scripts/config.cjs';

// Generation is offline; connection validation belongs to db.cjs check/migrate.
configuration.loadEnvironment();
configuration.readConfig(process.env);

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: { url: process.env.DATABASE_URL || '' },
});
