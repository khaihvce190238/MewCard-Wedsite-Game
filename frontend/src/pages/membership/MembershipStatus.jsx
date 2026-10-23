import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, errMsg, fmtDate } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Badge } from '../../components/ui';

export default function MembershipStatus() {
  const { data, loading, error, reload } = useFetch('/memberships/my');
  const toast = useToast();
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const cur = data.current;
  const cancel = async () => {
    try { await api.patch(`/memberships/${cur.MembershipID}/cancel`); toast.success('Đã hủy yêu cầu'); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div>
      <PageHeader title="Trạng thái thành viên">
        {data.canApply && <Link className="btn btn-primary" to="/membership/register">{cur ? 'Đăng ký lại' : 'Đăng ký thành viên'}</Link>}
      </PageHeader>
      {!cur ? <Empty text="Bạn chưa gửi yêu cầu đăng ký thành viên nào." /> : (
        <div className="panel">
          <div className="row between"><h2>Yêu cầu gần nhất</h2><Badge kind="member" value={cur.Status} /></div>
          <p>Gửi lúc: {fmtDate(cur.AppliedAt)}</p>
          {cur.Status === 'Approved' && <p>🎉 Mã thành viên: <strong>{cur.MemberCode}</strong> · Duyệt lúc {fmtDate(cur.ReviewedAt)}</p>}
          {cur.Status === 'Rejected' && <div className="notice">Lý do từ chối: {cur.AdminNote}</div>}
          {cur.Status === 'Pending' && <><p className="muted">Yêu cầu đang chờ quản trị viên xem xét.</p><button className="btn" onClick={cancel}>Hủy yêu cầu</button></>}
        </div>
      )}
      {data.history.length > 1 && (
        <section><h3>Lịch sử yêu cầu</h3>
          <div className="list">
            {data.history.slice(1).map((m) => (
              <div key={m.MembershipID} className="list-item"><span className="grow">{fmtDate(m.AppliedAt)}{m.AdminNote ? ` · ${m.AdminNote}` : ''}</span><Badge kind="member" value={m.Status} /></div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
