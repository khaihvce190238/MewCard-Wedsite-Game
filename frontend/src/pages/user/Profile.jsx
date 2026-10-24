import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api, errMsg, fmtDate } from '../../services/api';
import { Field } from '../../components/ui';
import PasswordInput from '../../components/PasswordInput';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ fullName: user.FullName, phone: user.Phone || '', address: user.Address || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!f.fullName.trim()) return toast.error('Họ tên không được để trống');
    setBusy(true);
    try { setUser((await api.put('/auth/me', f)).data.data); toast.success('Đã cập nhật hồ sơ'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) return toast.error('Mật khẩu mới tối thiểu 8 ký tự');
    if (pw.newPassword !== pw.confirm) return toast.error('Mật khẩu nhập lại không khớp');
    setBusy(true);
    try {
      await api.put('/auth/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' }); toast.success('Đã đổi mật khẩu');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <div className="two-col">
      <form className="panel" onSubmit={saveProfile}>
        <h1>Hồ sơ cá nhân</h1>
        <p className="muted">Email: {user.Email} · Tham gia: {fmtDate(user.CreatedAt)}</p>
        <Field label="Họ tên"><input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Số điện thoại"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Địa chỉ"><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <button className="btn btn-primary" disabled={busy}>Lưu hồ sơ</button>
      </form>
      {user.HasPassword !== false ? (
        <form className="panel" onSubmit={savePw}>
          <h2>Đổi mật khẩu</h2>
          <Field label="Mật khẩu hiện tại"><PasswordInput value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></Field>
          <Field label="Mật khẩu mới"><PasswordInput value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="Nhập lại mật khẩu mới"><PasswordInput value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></Field>
          <button className="btn btn-primary" disabled={busy}>Đổi mật khẩu</button>
        </form>
      ) : (
        <div className="panel">
          <h2>Mật khẩu</h2>
          <p className="muted">Tài khoản này đăng nhập bằng Google nên không có mật khẩu riêng. Hãy dùng nút “Đăng nhập bằng Google” ở trang đăng nhập.</p>
        </div>
      )}
    </div>
  );
}
