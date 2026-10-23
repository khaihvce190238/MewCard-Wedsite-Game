import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg, fmtMoney } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Pagination, Modal, Field, Badge } from '../../components/ui';
import ImageField from '../../components/ImageField';

function ProductForm({ product, topics, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: product?.Name || '', description: product?.Description || '', price: product?.Price ?? '', stockQuantity: product?.StockQuantity ?? 0, topicId: product?.TopicID || '' });
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Tên sản phẩm không được để trống');
    if (f.price === '' || Number(f.price) < 0) return toast.error('Giá không hợp lệ');
    if (!Number.isInteger(Number(f.stockQuantity)) || Number(f.stockQuantity) < 0) return toast.error('Tồn kho phải là số nguyên không âm');
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (image) fd.append('image', image);
    setBusy(true);
    try {
      if (product) await api.put(`/admin/products/${product.ProductID}`, fd); else await api.post('/admin/products', fd);
      toast.success('Đã lưu sản phẩm'); onSaved();
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };
  return (
    <Modal title={product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Tên sản phẩm"><input value={f.name} maxLength={150} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Mô tả"><textarea rows="3" maxLength={1000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="row gap">
          <Field label="Giá (VND)"><input type="number" min="0" step="1000" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
          <Field label="Tồn kho"><input type="number" min="0" step="1" value={f.stockQuantity} onChange={(e) => setF({ ...f, stockQuantity: e.target.value })} /></Field>
        </div>
        <Field label="Chủ đề liên kết (tùy chọn)">
          <select value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value })}><option value="">— Không gắn chủ đề —</option>{topics.map((t) => <option key={t.TopicID} value={t.TopicID}>{t.Name}</option>)}</select>
        </Field>
        <ImageField label="Ảnh sản phẩm" currentUrl={product?.ImageURL} onChange={setImage} />
        <div className="row gap"><button className="btn btn-primary" disabled={busy}>Lưu</button><button type="button" className="btn" onClick={onClose}>Hủy</button></div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(''); const [term, setTerm] = useState('');
  const topics = useFetch('/admin/topics');
  const { data, meta, loading, error, reload } = useFetch('/admin/products', { q: term || undefined, page });
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  const toggle = async (p) => {
    try { await api.patch(`/admin/products/${p.ProductID}/status`, { isActive: !p.IsActive }); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div>
      <PageHeader title="Quản lý sản phẩm"><button className="btn btn-primary" onClick={() => setEdit('new')}>+ Thêm sản phẩm</button></PageHeader>
      <form className="row gap" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }}>
        <input placeholder="Tìm sản phẩm..." value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn">Tìm</button>
      </form>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Empty text="Chưa có sản phẩm." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Ảnh</th><th>Tên</th><th>Chủ đề</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.ProductID}>
              <td><img className="thumb sm" src={assetUrl(p.ImageURL)} alt="" /></td><td>{p.Name}</td><td>{p.TopicName || '—'}</td>
              <td>{fmtMoney(p.Price)}</td><td className={p.StockQuantity <= 5 ? 'text-bad' : ''}>{p.StockQuantity}</td>
              <td><Badge value={p.IsActive ? 'Active' : 'Locked'} /> {p.IsActive ? 'Đang bán' : 'Ngừng bán'}</td>
              <td className="row gap"><button className="btn" onClick={() => setEdit(p)}>Sửa</button><button className="btn" onClick={() => toggle(p)}>{p.IsActive ? 'Ngừng bán' : 'Mở bán'}</button></td>
            </tr>
          ))}</tbody></table></div>
      )}
      <Pagination meta={meta} onPage={setPage} />
      {edit && <ProductForm product={edit === 'new' ? null : edit} topics={topics.data || []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}
