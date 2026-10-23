import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const LINKS = [
  ['/admin', 'Tổng quan', true], ['/admin/users', 'Người dùng'], ['/admin/topics', 'Chủ đề'], ['/admin/cards', 'Lá bài'],
  ['/admin/products', 'Sản phẩm'], ['/admin/orders', 'Đơn hàng'], ['/admin/memberships', 'Thành viên'],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="admin">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/" className="brand" onClick={close} aria-label="MewCard — về trang chủ">
          <img src={logo} alt="MewCard" className="brand-logo" />
        </Link>
        <nav onClick={() => setOpen(false)}>
          {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        </nav>
        <div className="sidebar-foot">
          <small>{user?.Email}</small>
          <Link to="/" className="btn">← Về trang web</Link>
          <button className="btn" onClick={() => { logout(); nav('/login'); }}>Đăng xuất</button>
        </div>
      </aside>
      <div className="admin-main">
        <button className="btn admin-toggle" onClick={() => setOpen((o) => !o)}>☰ Menu</button>
        <Outlet />
      </div>
    </div>
  );
}
