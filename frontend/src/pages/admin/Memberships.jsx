import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { api, errMsg, fmtDate } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Pagination, Modal, Field, Badge } from '../../components/ui';
import { MEMBER_STATUS } from '../../utils/labels';

function Detail({ id, onClose, onDone }) {
  const { data: m, loading, error } = useFetch(`/admin/memberships/${id}`);
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const review = async (decision) => {
    if (decision === 'Rejected' && !note.trim()) return toast.error('Vui lòng nhập lý do từ chối');
    setBusy(true);
    try { await api.patch(`/admin/memberships/${id}/review`, { decision, adminNote: note }); toast.success('Đã xử lý yêu cầu'); onDone(); }
    catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };
  return (
    <Modal title={`Yêu cầu thành viên #${id}`} onClose={onClose}>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : (
        <>
          <p><strong>{m.FullName}</strong> · {m.Email}{m.Phone ? ` · ${m.Phone}` : ''}<br /><small className="muted">Tài khoản tạo {fmtDate(m.UserCreatedAt)} · Gửi yêu cầu {fmtDate(m.AppliedAt)}</small></p>
          <p>Trạng thái: <Badge kind="member" value={m.Status} />{m.MemberCode && <> · Mã: <strong>{m.MemberCode}</strong></>}</p>
          {m.ApplicantNote && <p>Ghi chú của người đăng ký: “{m.ApplicantNote}”</p>}
          {m.Status !== 'Pending' && m.ReviewedAt && <p className="muted">Xử lý bởi {m.ReviewedByName || '—'} lúc {fmtDate(m.ReviewedAt)}{m.AdminNote ? ` · ${m.AdminNote}` : ''}</p>}
          {m.Status === 'Pending' && (
            <>
              <Field label="Lý do từ chối (bắt buộc khi từ chối) / ghi chú"><textarea rows="3" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="row gap"><button className="btn btn-primary" disabled={busy} onClick={() => review('Approved')}>Duyệt</button><button className="btn" disabled={busy} onClick={() => review('Rejected')}>Từ chối</button></div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

export default function Memberships() {
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [q, setQ] = useState(''); const [term, setTerm] = useState('');
  const { data, meta, loading, error, reload } = useFetch('/admin/memberships', { status: status || undefined, q: term || undefined, page });
  const [openId, setOpenId] = useState(null);
  return (
    <div>
      <PageHeader title="Quản lý thành viên" />
      <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }}>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">Tất cả trạng thái</option>{Object.entries(MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input placeholder="Tên / email / mã thành viên" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn">Tìm</button>
      </form>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Empty text="Không có yêu cầu nào." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>#</th><th>Họ tên</th><th>Email</th><th>Gửi lúc</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{data.map((m) => (
            <tr key={m.MembershipID}><td>{m.MembershipID}</td><td>{m.FullName}</td><td>{m.Email}</td><td>{fmtDate(m.AppliedAt)}</td>
              <td><Badge kind="member" value={m.Status} /></td><td><button className="btn" onClick={() => setOpenId(m.MembershipID)}>{m.Status === 'Pending' ? 'Xét duyệt' : 'Chi tiết'}</button></td></tr>
          ))}</tbody></table></div>
      )}
      <Pagination meta={meta} onPage={setPage} />
      {openId && <Detail id={openId} onClose={() => setOpenId(null)} onDone={() => { setOpenId(null); reload(); }} />}
    </div>
  );
}
