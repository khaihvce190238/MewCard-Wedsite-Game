import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let scriptPromise = null;

// Tải thư viện Google Identity Services một lần duy nhất.
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => { scriptPromise = null; s.remove(); reject(new Error('Không tải được thư viện Google')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Nút "Đăng nhập bằng Google". Google trả về ID token (credential); component chỉ chuyển token đó
 * cho onCredential — backend mới là nơi xác minh token.
 */
export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const holder = useRef(null);
  const handler = useRef(onCredential);
  const [error, setError] = useState('');
  useEffect(() => { handler.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;
    loadGsi().then(() => {
      if (cancelled || !holder.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (res) => res?.credential && handler.current?.(res.credential),
      });
      holder.current.innerHTML = '';
      window.google.accounts.id.renderButton(holder.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular',
        logo_alignment: 'left', locale: 'vi',
        width: Math.min(400, Math.max(200, holder.current.offsetWidth || 320)),
      });
    }).catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, []);

  if (!CLIENT_ID) {
    // Production: ẩn hẳn. Dev: nhắc cấu hình để không bị nhầm là lỗi.
    return import.meta.env.DEV ? (
      <p className="auth-note">Đăng nhập Google chưa bật: thêm <code>VITE_GOOGLE_CLIENT_ID</code> vào <code>frontend/.env</code> rồi chạy lại <code>npm run dev</code>.</p>
    ) : null;
  }
  return (
    <>
      <div className="auth-divider"><span>hoặc</span></div>
      <div className={`google-wrap ${disabled ? 'is-disabled' : ''}`} aria-disabled={disabled}>
        <div ref={holder} style={{ width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: disabled ? 'none' : 'auto' }} />
      </div>
      {error && <small className="field-error">{error}</small>}
    </>
  );
}
