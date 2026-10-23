import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Modal, Field, Badge } from '../../components/ui';
import ImageField from '../../components/ImageField';

function TopicForm({ topic, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: topic?.Name || '', description: topic?.Description || '' });
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Tên chủ đề không được để trống');
    const fd = new FormData();
    fd.append('name', f.name); fd.append('description', f.description);
    if (image) fd.append('image', image);
    setBusy(true);
    try {
      if (topic) await api.put(`/admin/topics/${topic.TopicID}`, fd); else await api.post('/admin/topics', fd);
      toast.success('Đã lưu chủ đề'); onSaved();
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };
  return (
    <Modal title={topic ? 'Sửa chủ đề' : 'Thêm chủ đề'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Tên chủ đề"><input value={f.name} maxLength={100} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Mô tả"><textarea rows="3" maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <ImageField label="Ảnh đại diện" currentUrl={topic?.ImageURL} onChange={setImage} />
        <div className="row gap"><button className="btn btn-primary" disabled={busy}>Lưu</button><button type="button" className="btn" onClick={onClose}>Hủy</button></div>
      </form>
    </Modal>
  );
}

export default function Topics() {
  const { data, loading, error, reload } = useFetch('/admin/topics');
  const [edit, setEdit] = useState(null); // null | 'new' | topic
  const toast = useToast();
  const toggle = async (t) => {
    try { await api.patch(`/admin/topics/${t.TopicID}/status`, { isActive: !t.IsActive }); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div>
      <PageHeader title="Quản lý chủ đề"><button className="btn btn-primary" onClick={() => setEdit('new')}>+ Thêm chủ đề</button></PageHeader>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Empty text="Chưa có chủ đề." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Ảnh</th><th>Tên</th><th>Mô tả</th><th>Lá bài (hiện/tổng)</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{data.map((t) => (
            <tr key={t.TopicID}>
              <td><img className="thumb sm" src={assetUrl(t.ImageURL)} alt="" /></td><td>{t.Name}</td><td>{t.Description}</td>
              <td><Link to={`/admin/cards?topicId=${t.TopicID}`}>{t.ActiveCardCount}/{t.CardCount}</Link></td>
              <td><Badge value={t.IsActive ? 'Active' : 'Locked'} /> {t.IsActive ? 'Đang hiện' : 'Đang ẩn'}</td>
              <td className="row gap"><button className="btn" onClick={() => setEdit(t)}>Sửa</button><button className="btn" onClick={() => toggle(t)}>{t.IsActive ? 'Ẩn' : 'Hiện'}</button></td>
            </tr>
          ))}</tbody></table></div>
      )}
      {edit && <TopicForm topic={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}
