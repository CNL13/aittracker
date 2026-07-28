/* eslint-disable */
// @ts-nocheck
/**
 * Frontend API Cache with Stale-While-Revalidate (SWR) pattern.
 * 
 * - First visit: fetch from API, cache in memory + localStorage
 * - Subsequent visits: return cached data INSTANTLY, refresh in background
 * - Navigation between views: return memory cache (0ms)
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STORAGE_PREFIX = 'ait_cache_';

/** Read from localStorage */
function readStorage(url: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + btoa(url));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/** Write to localStorage */
function writeStorage(url: string, entry: CacheEntry) {
  try {
    localStorage.setItem(STORAGE_PREFIX + btoa(url), JSON.stringify(entry));
  } catch {} // Silently fail if quota exceeded
}

/**
 * Fetch with Stale-While-Revalidate cache.
 * 
 * 1. If memory cache fresh → return immediately
 * 2. If memory cache stale → return stale data, refetch in background
 * 3. If no memory cache but localStorage has data → return it, refetch in background
 * 4. If nothing cached → fetch from API
 */
export async function cachedFetch(
  url: string,
  ttl: number = DEFAULT_TTL,
  options?: RequestInit
): Promise<any> {
  const now = Date.now();

  // 1. Check memory cache
  const memEntry = memoryCache.get(url);
  if (memEntry) {
    if (now - memEntry.timestamp < ttl) {
      return memEntry.data; // Fresh cache → instant return
    }
    // Stale → return stale data, revalidate in background
    fetchAndCache(url, options);
    return memEntry.data;
  }

  // 2. Check localStorage (for cross-session persistence)
  const storageEntry = readStorage(url);
  if (storageEntry) {
    // Put in memory cache
    memoryCache.set(url, storageEntry);
    // Revalidate in background
    fetchAndCache(url, options);
    return storageEntry.data;
  }

  // 3. Nothing cached → fetch fresh
  return fetchAndCache(url, options);
}

/** Internal: fetch from API and update both caches */
async function fetchAndCache(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  const entry: CacheEntry = { data, timestamp: Date.now() };
  memoryCache.set(url, entry);
  writeStorage(url, entry);
  return data;
}

/** Invalidate a specific cache entry */
export function invalidateCache(url: string) {
  memoryCache.delete(url);
  try { localStorage.removeItem(STORAGE_PREFIX + btoa(url)); } catch {}
}

/** Invalidate all cache entries matching a prefix */
export function invalidateCachePrefix(prefix: string) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
      try { localStorage.removeItem(STORAGE_PREFIX + btoa(key)); } catch {}
    }
  }
}

/** Clear entire cache */
export function clearCache() {
  memoryCache.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {}
}

/** Pre-warm cache by fetching data in the background (fire-and-forget) */
export function prefetchData(url: string, ttl?: number) {
  cachedFetch(url, ttl).catch(() => {});
}
