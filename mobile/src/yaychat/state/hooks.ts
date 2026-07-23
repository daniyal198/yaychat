import {useCallback, useEffect, useRef, useState} from 'react';
import {errorMessage, isOfflineError} from '../services';

/**
 * Standard data-loading hook. Pairs with <AsyncView /> so every screen gets
 * loading / error / offline / retry behavior for free.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (asRefresh = false) => {
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setOffline(false);
    try {
      const result = await loader();
      if (mounted.current) {
        setData(result);
      }
    } catch (e) {
      if (mounted.current) {
        if (isOfflineError(e)) {
          setOffline(true);
        } else {
          setError(errorMessage(e));
        }
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    offline,
    reload: () => run(false),
    refresh: () => run(true),
  };
}

/** Wrap a mutation: exposes busy flag and routes errors to a handler/toast. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const perform = useCallback(
    async <T,>(fn: () => Promise<T>, onError?: (message: string) => void): Promise<T | null> => {
      setBusy(true);
      try {
        return await fn();
      } catch (e) {
        onError?.(errorMessage(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  return {busy, perform};
}
