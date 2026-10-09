/** Browser and application caches share this maximum age. Clock rollback must
 * not extend the lifetime of a previously obtained device position. */
export const POSITION_CACHE_TTL_MS = 5 * 60 * 1000;

export function isPositionCacheFresh(acquiredAt: number, now: number): boolean {
  const age = now - acquiredAt;
  return Number.isFinite(acquiredAt) && Number.isFinite(now) && age >= 0 && age < POSITION_CACHE_TTL_MS;
}
