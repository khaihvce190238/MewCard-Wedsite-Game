import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { api, errMsg, fmtDate } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Pagination, Badge } from '../../components/ui';

export default function Users() {
  const [q, setQ] = useState(''); const [term, setTerm] = useState(''); const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch('/admin/users', { q: term || undefined, page });
  const toast = useToast();
  const toggle = async (u) => {
    const status = u.Status === 'Active' ? 'Locked' : 'Active';
    if (!window.confirm(`${status === 'Locked' ? 'Khóa' : 'Mở khóa'} tài khoản ${u.Email}?`)) return;
    try { await api.patch(`/admin/users/${u.UserID}/status`, { status }); toast.success('Đã cập nhật'); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div>
      <PageHeader title="Quản lý người dùng">
        <form className="row gap" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }}>
          <input placeholder="Tìm tên/email" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn">Tìm</button>
        </form>
      </PageHeader>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Empty text="Không có người dùng." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>ID</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th /></tr></thead>
          <tbody>{data.map((u) => (
            <tr key={u.UserID}><td>{u.UserID}</td><td>{u.FullName}</td><td>{u.Email}</td><td>{u.Role}</td>
              <td><Badge value={u.Status} /></td><td>{fmtDate(u.CreatedAt)}</td>
              <td>{u.Role !== 'Admin' && <button className="btn" onClick={() => toggle(u)}>{u.Status === 'Active' ? 'Khóa' : 'Mở khóa'}</button>}</td></tr>
          ))}</tbody></table></div>
      )}
      <Pagination meta={meta} onPage={setPage} />
    </div>
  );
}
