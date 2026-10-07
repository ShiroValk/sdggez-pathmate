import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const migrationTools = createRequire(join(process.cwd(), 'package.json'))('./scripts/db.cjs') as {
  migrationFiles(): unknown[];
  assertSchema(client: postgres.Sql, files: unknown[], supported: string): Promise<void>;
};

/** Local database injection contract; services continue to use Drizzle queries. */
export const DRIZZLE_DATABASE = Symbol('DRIZZLE_DATABASE');
const POSTGRES_CLIENT = Symbol('POSTGRES_CLIENT');
export type { PostgresJsDatabase };

/** Owns the PostgreSQL connection pool and closes it during application shutdown. */
@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) throw new Error('DATABASE_URL is required. Copy .env.example to .env.local and run npm run db:migrate.');
        const client = postgres(url, { max: 10, connect_timeout: 5 });
        try {
          await client`SELECT 1`;
          await migrationTools.assertSchema(client, migrationTools.migrationFiles(), '0001');
          return client;
        } catch (error) {
          await client.end({ timeout: 1 });
          if (error instanceof Error && error.name === 'MigrationError') throw error;
          throw new Error('Cannot connect to PostgreSQL. Check DATABASE_URL and start the local database.');
        }
      },
    },
    {
      provide: DRIZZLE_DATABASE,
      inject: [POSTGRES_CLIENT],
      useFactory: (client: postgres.Sql) => drizzle(client),
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_CLIENT) private readonly client: postgres.Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
