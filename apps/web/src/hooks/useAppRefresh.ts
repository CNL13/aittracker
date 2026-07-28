/* eslint-disable */
// @ts-nocheck
import { useEffect, useRef } from 'react';

interface AppRefreshOptions {
  enabled?: boolean;
  minIntervalMs?: number;
  refreshOnMount?: boolean;
}

export function useAppRefresh(callback: () => void | Promise<void>, options: AppRefreshOptions = {}) {
  const callbackRef = useRef(callback);
  const runningRef = useRef(false);
  const lastRunRef = useRef(0);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (options.enabled === false || typeof window === 'undefined') return;

    const minIntervalMs = options.minIntervalMs ?? 3000;

    const run = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      if (runningRef.current) return;

      lastRunRef.current = now;
      runningRef.current = true;
      Promise.resolve(callbackRef.current()).finally(() => {
        runningRef.current = false;
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    if (options.refreshOnMount) run();

    window.addEventListener('focus', run);
    window.addEventListener('pageshow', run);
    window.addEventListener('hashchange', run);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('ait:app-refresh', run);

    return () => {
      window.removeEventListener('focus', run);
      window.removeEventListener('pageshow', run);
      window.removeEventListener('hashchange', run);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('ait:app-refresh', run);
    };
  }, [options.enabled, options.minIntervalMs, options.refreshOnMount]);
}
