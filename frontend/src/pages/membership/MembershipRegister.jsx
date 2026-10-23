import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, errMsg } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Field } from '../../components/ui';

export default function MembershipRegister() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/memberships/my');
  const toast = useToast();
  const nav = useNavigate();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data.canApply) return <Navigate to="/membership/status" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post('/memberships', { note }); toast.success('Đã gửi yêu cầu đăng ký thành viên'); nav('/membership/status'); }
    catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };
  return (
    <form className="form-card" onSubmit={submit}>
      <h1>Đăng ký thành viên</h1>
      <p>Yêu cầu sẽ được gửi kèm thông tin tài khoản của bạn:</p>
      <p><strong>{user.FullName}</strong><br />{user.Email}</p>
      <Field label="Ghi chú cho quản trị viên (tùy chọn)"><textarea rows="3" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
    </form>
  );
}
