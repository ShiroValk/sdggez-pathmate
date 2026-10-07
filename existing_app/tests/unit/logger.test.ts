import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnostic } from '../../server/common/logger';

test('diagnostics allow only approved fields, including at debug level', () => {
  const original = process.stdout.write;
  const priorLevel = process.env.LOG_LEVEL;
  let output = '';
  process.env.LOG_LEVEL = 'debug';
  process.stdout.write = ((chunk: string) => { output += chunk; return true; }) as typeof process.stdout.write;
  try {
    diagnostic({ level: 'debug', operation: 'unit_event', result: 'rejected', password: 'synthetic-private-marker', token: 'synthetic-private-marker', body: { phone: 'synthetic-private-marker' } } as Parameters<typeof diagnostic>[0]);
  } finally { process.stdout.write = original; if (priorLevel === undefined) delete process.env.LOG_LEVEL; else process.env.LOG_LEVEL = priorLevel; }
  const record = JSON.parse(output);
  assert.equal(record.operation, 'unit_event');
  assert.ok(record.time && record.requestId);
  assert.ok(!output.includes('synthetic-private-marker'));
  assert.deepEqual(Object.keys(record).sort(), ['level', 'operation', 'requestId', 'result', 'time']);
});
