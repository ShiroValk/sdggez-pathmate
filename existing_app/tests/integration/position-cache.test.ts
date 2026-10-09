/** Time-policy boundaries only: no coordinates, browser permission overrides,
 * or simulated successful positioning. Real location is accepted separately. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPositionCacheFresh, POSITION_CACHE_TTL_MS } from '../../client/src/pages/MemoPathPage/position-cache';

test('device position cache expires at five minutes and rejects clock rollback', () => {
  const acquiredAt = 1_000_000;
  assert.equal(isPositionCacheFresh(acquiredAt, acquiredAt), true);
  assert.equal(isPositionCacheFresh(acquiredAt, acquiredAt + POSITION_CACHE_TTL_MS - 1), true);
  assert.equal(isPositionCacheFresh(acquiredAt, acquiredAt + POSITION_CACHE_TTL_MS), false);
  assert.equal(isPositionCacheFresh(acquiredAt, acquiredAt + POSITION_CACHE_TTL_MS + 1), false);
  assert.equal(isPositionCacheFresh(acquiredAt, acquiredAt - 1), false);
  assert.equal(isPositionCacheFresh(Number.NaN, acquiredAt), false);
  assert.equal(isPositionCacheFresh(acquiredAt, Number.POSITIVE_INFINITY), false);
});
