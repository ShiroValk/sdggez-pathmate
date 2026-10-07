import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { join } from 'path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { diagnostic, requestDiagnostics, SafeNestLogger } from './common/logger';
import { loadRuntimeConfig } from './common/config';
import { InputValidationPipe } from './common/input-validation';

async function bootstrap() {
  const config = loadRuntimeConfig();
  // ConfigModule validates during module loading: keep that inside the handled
  // startup path so direct production execution also fails without a raw stack.
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
    logger: new SafeNestLogger(),
  });
  app.use(requestDiagnostics);
  app.useGlobalPipes(new InputValidationPipe());
  app.enableShutdownHooks();
  const host = config.SERVER_HOST;
  const port = config.SERVER_PORT;

  // Production serves the same assets built by Vite; development uses its proxy.
  app.useStaticAssets(join(process.cwd(), 'dist/client'), { index: false });

  await app.listen(port, host);
  diagnostic({ level: 'info', operation: 'startup', result: 'ready' });
}

bootstrap().catch((error: Error) => {
  diagnostic({ level: 'error', operation: 'startup', result: error.name === 'ConfigurationError' ? 'configuration_rejected' : 'dependency_or_schema_rejected', hint: error.name === 'ConfigurationError' ? 'configuration' : 'database' });
  process.exitCode = 1;
});
