import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get('/auth/me').then((r) => setUser(r.data.data)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    tokenStore.set(r.data.data.token); setUser(r.data.data.user); return r.data.data.user;
  }, []);
  // Đăng ký 2 bước: register chỉ GỬI MÃ (chưa tạo tài khoản); verifyRegister mới tạo tài khoản và đăng nhập.
  const register = useCallback(async (fullName, email, password) =>
    (await api.post('/auth/register', { fullName, email, password })).data.data, []);
  const resendRegisterCode = useCallback(async (email) =>
    (await api.post('/auth/register/resend', { email })).data.data, []);
  const verifyRegister = useCallback(async (email, code) => {
    const r = await api.post('/auth/register/verify', { email, code });
    tokenStore.set(r.data.data.token); setUser(r.data.data.user); return r.data.data.user;
  }, []);
  const googleLogin = useCallback(async (credential) => {
    const r = await api.post('/auth/google', { credential });
    tokenStore.set(r.data.data.token); setUser(r.data.data.user); return r.data.data.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, resendRegisterCode, verifyRegister, googleLogin, logout, setUser }),
    [user, loading, login, register, resendRegisterCode, verifyRegister, googleLogin, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
