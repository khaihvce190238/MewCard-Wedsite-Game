import { useCallback, useEffect, useState } from 'react';
import { api, errMsg } from '../services/api';

/** GET dữ liệu từ API: trả về data, meta (phân trang), loading, error, reload. */
export function useFetch(url, params, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: '' });
  const key = JSON.stringify([url, params]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await api.get(url, { params });
      setState({ data: res.data.data, meta: res.data.pagination || null, loading: false, error: '' });
    } catch (e) {
      setState({ data: null, meta: null, loading: false, error: errMsg(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
