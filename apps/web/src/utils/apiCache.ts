/* eslint-disable */
// @ts-nocheck
/**
 * Simple in-memory API cache for frontend.
 * Caches GET responses by URL with configurable TTL.
 * Reduces redundant API calls when navigating between views.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with cache. Returns cached data if still fresh, otherwise fetches from API.
 * @param url API endpoint URL
 * @param ttl Cache duration in milliseconds (default: 5 minutes)
 * @param options Additional fetch options
 */
export async function cachedFetch(url: string, ttl: number = DEFAULT_TTL, options?: RequestInit): Promise<any> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const res = await fetch(url, { credentials: 'include', ...options });
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}

/** Invalidate a specific cache entry */
export function invalidateCache(url: string) {
  cache.delete(url);
}

/** Invalidate all cache entries matching a prefix */
export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/** Clear entire cache */
export function clearCache() {
  cache.clear();
}

/** Pre-warm cache by fetching data in the background */
export function prefetchData(url: string, ttl?: number) {
  cachedFetch(url, ttl).catch(() => {}); // Fire-and-forget
}
