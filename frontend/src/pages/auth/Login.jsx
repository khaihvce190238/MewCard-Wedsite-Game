import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { errMsg } from '../../services/api';
import { Field } from '../../components/ui';
import PasswordInput from '../../components/PasswordInput';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import './auth.css';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const goAfterLogin = (u) => {
    toast.success('Đăng nhập thành công');
    nav(loc.state?.from || (u.Role === 'Admin' ? '/admin' : '/'), { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = 'Email không hợp lệ';
    if (!f.password) er.password = 'Vui lòng nhập mật khẩu';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { goAfterLogin(await login(f.email, f.password)); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  // Google trả về ID token; backend xác minh token rồi trả JWT của ứng dụng.
  const onGoogle = async (credential) => {
    setBusy(true);
    try { goAfterLogin(await googleLogin(credential)); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <h1>Đăng nhập</h1>
      <Field label="Email" error={errors.email}><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
      <Field label="Mật khẩu" error={errors.password}><PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" /></Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      <GoogleSignInButton onCredential={onGoogle} disabled={busy} />
      <p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
    </form>
  );
}
