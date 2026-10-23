import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { errMsg } from '../../services/api';
import { Field } from '../../components/ui';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.fullName.trim()) er.fullName = 'Vui lòng nhập họ tên';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = 'Email không hợp lệ';
    if (f.password.length < 8) er.password = 'Mật khẩu tối thiểu 8 ký tự';
    if (f.confirm !== f.password) er.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await register(f.fullName, f.email, f.password); toast.success('Đăng ký thành công'); nav('/'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <h1>Đăng ký tài khoản</h1>
      <Field label="Họ tên" error={errors.fullName}><input value={f.fullName} onChange={set('fullName')} /></Field>
      <Field label="Email" error={errors.email}><input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
      <Field label="Mật khẩu" error={errors.password}><input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
      <Field label="Nhập lại mật khẩu" error={errors.confirm}><input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang xử lý...' : 'Đăng ký'}</button>
      <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </form>
  );
}
