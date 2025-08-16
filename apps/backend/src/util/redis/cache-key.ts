export type CacheKey = (string | number)[];

/**
 * Hash a cache key.
 */
export function hashCacheKey(key: CacheKey) {
  return key.join(":");
}
