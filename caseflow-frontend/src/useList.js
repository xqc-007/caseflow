import { useEffect, useState } from 'react';
import { apiList } from './api';

export function useList(path, refreshKey = 0) {
  const [result, setResult] = useState({ key: null, data: [], error: '' });
  const [retryKey, setRetryKey] = useState(0);
  const key = JSON.stringify([path, refreshKey, retryKey]);
  useEffect(() => {
    const controller = new AbortController();
    apiList(path, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult({ key, data, error: '' }); })
      .catch(err => { if (!controller.signal.aborted) setResult({ key, data: [], error: err.message }); });
    return () => controller.abort();
  }, [path, key]);
  const loading = result.key !== key;
  return {
    data: loading ? [] : result.data,
    error: loading ? '' : result.error,
    loading,
    retry: () => setRetryKey(value => value + 1),
  };
}
