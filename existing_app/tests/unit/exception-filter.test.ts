/** Validate public failure envelopes and diagnostic redaction independently of
 * business acceptance. Synthetic secret markers must never reach either sink.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from '../../server/common/filters/exception.filter';

test('error status mapping preserves envelopes and hides unknown/DB internals', () => {
  const secret = 'synthetic-private-marker';
  let logs = '';
  const original = process.stderr.write;
  const originalOut = process.stdout.write;
  process.stderr.write = ((chunk: string) => { logs += chunk; return true; }) as typeof original;
  process.stdout.write = ((chunk: string) => { logs += chunk; return true; }) as typeof originalOut;
  try {
    const exceptions = [400, 401, 403, 404, 409].map(status => [new HttpException('Rejected', status), status] as const);
    const cases: Array<readonly [unknown, number]> = [...exceptions, [Object.assign(new Error(secret), { code: 'ECONNREFUSED', cause: secret }), 503], [Object.assign(new Error(secret), { cause: { code: 'ECONNREFUSED', message: secret } }), 503], [Object.assign(new Error(secret), { cause: secret }), 500]];
    for (const [exception, expected] of cases) {
      let status = 0; let body: { error?: { code?: string; timestamp?: number } } = {};
      const response = { headersSent: false, status(value: number) { status = value; return this; }, json(value: typeof body) { body = value; } };
      const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ requestId: '00000000-0000-4000-8000-000000000001' }) }) } as unknown as ArgumentsHost;
      new GlobalExceptionFilter().catch(exception, host);
      assert.equal(status, expected); assert.ok(body.error?.code); assert.equal(typeof body.error?.timestamp, 'number');
      assert.ok(!JSON.stringify(body).includes(secret)); assert.ok(!JSON.stringify(body).includes('stack'));
    }
    assert.ok(!logs.includes(secret)); assert.ok(logs.includes('http_failure')); assert.ok(logs.includes('requestId'));
  } finally { process.stderr.write = original; process.stdout.write = originalOut; }
});

test('validation failures expose useful field messages instead of generic class names', () => {
  let message = '';
  const response = { headersSent: false, status() { return this; }, json(body: { error: { message: string } }) { message = body.error.message; } };
  const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ requestId: '00000000-0000-4000-8000-000000000001' }) }) } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(new HttpException({ message: ['password should not be empty'], error: 'Bad Request' }, 400), host);
  assert.equal(message, 'password should not be empty');
});
