import {useCallback, useEffect, useRef, useState} from 'react';
import {ApiError, errorMessage, isOfflineError} from '../services';
import {dataMode, DataModule} from '../services/dataMode';

const ASYNC_TIMEOUT_MS = 15000;

const withTimeout = async <T,>(promise: Promise<T>): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new ApiError('This is taking longer than expected. Please try again.', 'server'));
        }, ASYNC_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

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
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (asRefresh = false) => {
    const currentRun = runId.current + 1;
    runId.current = currentRun;
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setOffline(false);
    try {
      const result = await withTimeout(loader());
      if (mounted.current && runId.current === currentRun) {
        setData(result);
      }
    } catch (e) {
      if (mounted.current && runId.current === currentRun) {
        if (isOfflineError(e)) {
          setOffline(true);
        } else {
          setError(errorMessage(e));
        }
      }
    } finally {
      if (mounted.current && runId.current === currentRun) {
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

/**
 * Whether a feature module is being served by the real backend this session.
 *
 * Screens use this to choose copy: the difference between "preview balance" and
 * "balance" is the difference between a mock-up and a statement about someone's
 * money, so it has to follow the actual data source rather than a build flag.
 * Starts false and flips when the service layer's probe resolves.
 */
export function useLiveData(module: DataModule): boolean {
  const [live, setLive] = useState(() => dataMode.isLive(module));
  useEffect(() => {
    setLive(dataMode.isLive(module));
    return dataMode.subscribe((changed, isLive) => {
      if (changed === module) {
        setLive(isLive);
      }
    });
  }, [module]);
  return live;
}
