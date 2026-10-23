import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'dc_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Token hết hạn / tài khoản bị khóa => đăng xuất phía client (backend vẫn là nơi quyết định quyền).
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err.response?.status;
    const msg = err.response?.data?.message || '';
    if (tokenStore.get() && (s === 401 || (s === 403 && msg.includes('khóa')))) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  },
);

export const assetUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${API_URL}${p}`);
export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
export const fmtMoney = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0);
export const fmtDate = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '');

/** Gọi khi rời trang chơi / đóng tab: fetch keepalive vẫn gửi được Authorization (sendBeacon thì không). */
export function leaveTopicKeepalive(topicId) {
  const t = tokenStore.get();
  if (!t) return;
  fetch(`${API_URL}/api/draw/leave`, {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ topicId }),
  }).catch(() => {});
}
