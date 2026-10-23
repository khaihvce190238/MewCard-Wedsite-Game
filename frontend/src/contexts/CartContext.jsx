import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext({ count: 0, refresh: () => {} });
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    if (!user) { setCount(0); return; }
    try { setCount((await api.get('/cart')).data.data.itemCount); } catch { setCount(0); }
  }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
