import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export type DiagnosticLevel = 'error' | 'warn' | 'info' | 'debug';
interface DiagnosticEvent {
  level: DiagnosticLevel;
  operation: string;
  result: string;
  requestId?: string;
  httpStatus?: number;
  errorCode?: string;
  accountId?: string;
  frames?: { module: string; line: number; column: number }[];
  hint?: 'configuration' | 'database';
}
const ranks: Record<DiagnosticLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

/** Emit only fixed diagnostic fields. Bodies, URLs, headers and exceptions are
 * deliberately never accepted. stdout/stderr are the default destinations.
 * Failed logging does not change an operation's HTTP result.
 */
export function diagnostic(event: DiagnosticEvent): void {
  const configured = process.env.LOG_LEVEL as DiagnosticLevel;
  const level = configured in ranks ? configured : 'info';
  if (ranks[event.level] > ranks[level]) return;
  const entry = {
    time: new Date().toISOString(), level: event.level,
    operation: event.operation, result: event.result,
    requestId: event.requestId ?? randomUUID(), httpStatus: event.httpStatus,
    errorCode: event.errorCode, accountId: event.accountId,
    frames: event.frames,
    hint: event.hint === 'configuration' ? 'Check the named variables in .env.local; copy .env.example only for a new environment.' : event.hint === 'database' ? 'Start local PostgreSQL with docker compose --env-file .env.local up -d db; run npm.cmd run db:check and npm.cmd run db:migrate with the matching schema/build.' : undefined,
  };
  try { (event.level === 'error' ? process.stderr : process.stdout).write(JSON.stringify(entry) + '\n'); } catch { /* Preserve the original operation result. */ }
}

/** Keep source positions for unknown failures without exception messages,
 * absolute paths, SQL or cause data. Unrecognized modules are anonymized.
 */
export function sanitizedFrames(exception: unknown): { module: string; line: number; column: number }[] {
  if (!(exception instanceof Error) || typeof exception.stack !== 'string') return [];
  const modules = new Set(['main', 'auth.service', 'elder.service', 'family.service', 'memopath-session.guard', 'database.module', 'exception.filter', 'input-validation']);
  return exception.stack.split('\n').slice(1, 9).flatMap(frame => {
    const match = /[\\/]([^\\/:()]+)\.(?:ts|js):(\d+):(\d+)\)?$/.exec(frame.trim());
    return match ? [{ module: modules.has(match[1]) ? match[1] : 'dependency', line: Number(match[2]), column: Number(match[3]) }] : [];
  });
}

export interface DiagnosticRequest extends Request {
  requestId: string;
  memoAccount?: { accountId: string };
}

/** Generate server-owned request IDs; log route templates, never raw URLs. */
export function requestDiagnostics(request: Request, response: Response, next: NextFunction): void {
  const req = request as DiagnosticRequest;
  req.requestId = randomUUID();
  response.setHeader('x-request-id', req.requestId);
  response.on('finish', () => diagnostic({
    level: response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
    operation: `${request.method} ${request.route?.path ?? 'unmatched'}`,
    result: response.statusCode < 400 ? 'success' : 'rejected',
    httpStatus: response.statusCode, requestId: req.requestId, accountId: req.memoAccount?.accountId,
  }));
  next();
}

/** Nest logger adapter: fixed event summaries replace arbitrary framework text.
 * This avoids connection URLs and exception messages/stacks reaching console.
 */
export class SafeNestLogger {
  log(): void { diagnostic({ level: 'debug', operation: 'nest', result: 'framework_event' }); }
  warn(): void { diagnostic({ level: 'warn', operation: 'nest', result: 'framework_warning' }); }
  error(): void { diagnostic({ level: 'error', operation: 'nest', result: 'framework_error' }); }
  debug(): void { diagnostic({ level: 'debug', operation: 'nest', result: 'framework_event' }); }
  verbose(): void { this.debug(); }
  fatal(): void { this.error(); }
}
