import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { errMsg } from '../../services/api';
import { Field } from '../../components/ui';
import PasswordInput from '../../components/PasswordInput';
import './auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Đăng ký 2 bước: (1) nhập thông tin -> nhận mã qua email; (2) nhập mã -> tài khoản MỚI được tạo. */
export default function Register() {
  const { register, resendRegisterCode, verifyRegister } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [f, setF] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);   // { email, expiresInMinutes, resendAfterSeconds, devMode }
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const submitForm = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.fullName.trim()) er.fullName = 'Vui lòng nhập họ tên';
    if (!EMAIL_RE.test(f.email)) er.email = 'Email không hợp lệ';
    if (f.password.length < 8) er.password = 'Mật khẩu tối thiểu 8 ký tự';
    if (f.confirm !== f.password) er.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const res = await register(f.fullName, f.email, f.password);
      setInfo(res); setCooldown(res.resendAfterSeconds); setCode(''); setStep('code');
      toast.success(res.devMode ? 'Chế độ phát triển: xem mã trong terminal của backend' : 'Đã gửi mã xác nhận đến email của bạn');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  // Người dùng đã có mã (ví dụ vừa tải lại trang) -> sang thẳng bước nhập mã.
  const haveCode = () => {
    if (!EMAIL_RE.test(f.email)) { setErrors({ email: 'Nhập email đã đăng ký để nhập mã' }); return; }
    setInfo({ email: f.email.trim().toLowerCase(), expiresInMinutes: null, resendAfterSeconds: 0, devMode: false });
    setCode(''); setCooldown(0); setStep('code');
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error('Mã xác nhận gồm 6 chữ số'); return; }
    setBusy(true);
    try {
      await verifyRegister(info.email, code);
      toast.success('Xác nhận thành công, tài khoản đã được tạo');
      nav('/', { replace: true });
    } catch (err) { toast.error(errMsg(err)); setCode(''); codeRef.current?.focus(); } finally { setBusy(false); }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      const res = await resendRegisterCode(info.email);
      setInfo(res); setCooldown(res.resendAfterSeconds); setCode('');
      toast.success(res.devMode ? 'Chế độ phát triển: xem mã mới trong terminal của backend' : 'Đã gửi lại mã xác nhận');
      codeRef.current?.focus();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  if (step === 'code') {
    return (
      <form className="form-card" onSubmit={submitCode} noValidate>
        <h1>Xác nhận email</h1>
        <p>Chúng tôi đã gửi mã gồm 6 chữ số đến <span className="verify-email">{info.email}</span>.
          {info.expiresInMinutes ? ` Mã có hiệu lực trong ${info.expiresInMinutes} phút.` : ''} Hãy kiểm tra cả thư rác (Spam).</p>
        {info.devMode && <div className="notice">Chế độ phát triển: máy chủ chưa cấu hình SMTP nên email KHÔNG được gửi. Mã xác nhận đang được in ra cửa sổ terminal của backend.</div>}
        <Field label="Mã xác nhận">
          <input
            ref={codeRef} className="code-input" value={code} inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} placeholder="••••••" onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
        <button className="btn btn-primary" disabled={busy || code.length !== 6}>{busy ? 'Đang xác nhận...' : 'Xác nhận & tạo tài khoản'}</button>
        <div className="auth-actions">
          <button type="button" className="link-btn" onClick={resend} disabled={cooldown > 0 || busy}>
            {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}
          </button>
          <button type="button" className="link-btn" onClick={() => setStep('form')}>← Đổi thông tin / email</button>
        </div>
      </form>
    );
  }

  return (
    <form className="form-card" onSubmit={submitForm} noValidate>
      <h1>Đăng ký tài khoản</h1>
      <Field label="Họ tên" error={errors.fullName}><input value={f.fullName} onChange={set('fullName')} /></Field>
      <Field label="Email" error={errors.email}><input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
      <Field label="Mật khẩu" error={errors.password}><PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
      <Field label="Nhập lại mật khẩu" error={errors.confirm}><PasswordInput value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></Field>
      <p className="auth-note">Chúng tôi sẽ gửi mã xác nhận đến email của bạn. Tài khoản chỉ được tạo sau khi bạn nhập đúng mã.</p>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang gửi mã...' : 'Đăng ký & nhận mã'}</button>
      <div className="auth-actions">
        <span>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></span>
        <button type="button" className="link-btn" onClick={haveCode}>Tôi đã có mã</button>
      </div>
    </form>
  );
}
