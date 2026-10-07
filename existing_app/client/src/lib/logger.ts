/** Browser diagnostics accept a fixed caller summary plus allowlisted failure
 * metadata. Never pass full Axios errors, headers, bodies or URLs to console.
 */
function write(level: 'info' | 'warn' | 'error' | 'debug', operation: string, error?: unknown): void {
  const response = error && typeof error === 'object' ? (error as { response?: { status?: number; headers?: Record<string, unknown>; data?: { error?: { code?: unknown } } } }).response : undefined;
  const requestId = response?.headers?.['x-request-id'];
  const code = response?.data?.error?.code;
  console[level]({ operation, status: response?.status,
    requestId: typeof requestId === 'string' && /^[a-f0-9-]{36}$/i.test(requestId) ? requestId : undefined,
    code: typeof code === 'string' && /^[A-Z_]{1,40}$/.test(code) ? code : undefined });
}
export const logger = {
  info: (operation: string, error?: unknown) => write('info', operation, error),
  log: (operation: string, error?: unknown) => write('info', operation, error),
  warn: (operation: string, error?: unknown) => write('warn', operation, error),
  error: (operation: string, error?: unknown) => write('error', operation, error),
  debug: (operation: string, error?: unknown) => write('debug', operation, error),
};
