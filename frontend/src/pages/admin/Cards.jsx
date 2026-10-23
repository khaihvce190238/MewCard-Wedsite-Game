import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Pagination, Modal, Field, Badge } from '../../components/ui';
import ImageField from '../../components/ImageField';

function CardForm({ card, topics, defaultTopic, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ topicId: card?.TopicID || defaultTopic || topics[0]?.TopicID || '', name: card?.Name || '', description: card?.Description || '' });
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!f.topicId) return toast.error('Vui lòng chọn chủ đề');
    if (!f.name.trim()) return toast.error('Tên lá bài không được để trống');
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (front) fd.append('front', front);
    if (back) fd.append('back', back);
    setBusy(true);
    try {
      if (card) await api.put(`/admin/cards/${card.CardID}`, fd); else await api.post('/admin/cards', fd);
      toast.success('Đã lưu lá bài'); onSaved();
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };
  return (
    <Modal title={card ? 'Sửa lá bài' : 'Thêm lá bài'} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="two-col">
          <div>
            <Field label="Chủ đề"><select value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value })}>{topics.map((t) => <option key={t.TopicID} value={t.TopicID}>{t.Name}</option>)}</select></Field>
            <Field label="Tên lá bài"><input value={f.name} maxLength={150} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Nội dung gợi ý"><textarea rows="4" maxLength={1000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <p className="muted">Sửa nội dung/ảnh không làm đổi lịch sử rút bài đã có (lịch sử lưu bản chụp riêng).</p>
          </div>
          <div>
            <ImageField label="Ảnh mặt trước" currentUrl={card?.FrontImageURL} onChange={setFront} />
            <ImageField label="Ảnh mặt sau" currentUrl={card?.BackImageURL} onChange={setBack} />
          </div>
        </div>
        <div className="row gap"><button className="btn btn-primary" disabled={busy}>Lưu</button><button type="button" className="btn" onClick={onClose}>Hủy</button></div>
      </form>
    </Modal>
  );
}

export default function Cards() {
  const [sp, setSp] = useSearchParams();
  const topicId = sp.get('topicId') || '';
  const [q, setQ] = useState(''); const [term, setTerm] = useState(''); const [page, setPage] = useState(1);
  const topics = useFetch('/admin/topics');
  const { data, meta, loading, error, reload } = useFetch('/admin/cards', { topicId: topicId || undefined, q: term || undefined, page });
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  const toggle = async (c) => {
    try { await api.patch(`/admin/cards/${c.CardID}/status`, { isActive: !c.IsActive }); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div>
      <PageHeader title="Quản lý lá bài">
        <button className="btn btn-primary" disabled={!topics.data?.length} onClick={() => setEdit('new')}>+ Thêm lá bài</button>
      </PageHeader>
      <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }}>
        <select value={topicId} onChange={(e) => { setPage(1); setSp(e.target.value ? { topicId: e.target.value } : {}); }}>
          <option value="">Tất cả chủ đề</option>{(topics.data || []).map((t) => <option key={t.TopicID} value={t.TopicID}>{t.Name}</option>)}
        </select>
        <input placeholder="Tìm lá bài..." value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn">Tìm</button>
      </form>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Empty text="Không có lá bài nào." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Trước</th><th>Sau</th><th>Tên</th><th>Chủ đề</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{data.map((c) => (
            <tr key={c.CardID}>
              <td><img className="thumb sm" src={assetUrl(c.FrontImageURL)} alt="" /></td><td><img className="thumb sm" src={assetUrl(c.BackImageURL)} alt="" /></td>
              <td><strong>{c.Name}</strong><br /><small className="muted">{c.Description}</small></td><td>{c.TopicName}</td>
              <td><Badge value={c.IsActive ? 'Active' : 'Locked'} /> {c.IsActive ? 'Đang hiện' : 'Đang ẩn'}</td>
              <td className="row gap"><button className="btn" onClick={() => setEdit(c)}>Sửa</button><button className="btn" onClick={() => toggle(c)}>{c.IsActive ? 'Ẩn' : 'Hiện'}</button></td>
            </tr>
          ))}</tbody></table></div>
      )}
      <Pagination meta={meta} onPage={setPage} />
      {edit && topics.data && <CardForm card={edit === 'new' ? null : edit} topics={topics.data} defaultTopic={topicId} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}
