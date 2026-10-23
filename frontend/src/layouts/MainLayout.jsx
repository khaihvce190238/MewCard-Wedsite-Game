import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import logo from '../assets/logo.png';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const out = () => { logout(); close(); nav('/'); };
  return (
    <div className="layout">
      <header className="navbar">
        <Link to="/" className="brand" onClick={close} aria-label="MewCard — về trang chủ">
          <img src={logo} alt="MewCard" className="brand-logo" />
        </Link>
        <button className="btn btn-ghost nav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Mở menu">☰</button>
        <nav className={`nav ${open ? 'open' : ''}`} onClick={close}>
          <NavLink to="/topics">Chơi rút bài</NavLink>
          <NavLink to="/shop">Cửa hàng</NavLink>
          {user && <NavLink to="/history">Lịch sử</NavLink>}
          {user && <NavLink to="/favorites">Yêu thích</NavLink>}
          {user && <NavLink to="/orders">Đơn hàng</NavLink>}
          {user && <NavLink to="/membership/status">Thành viên</NavLink>}
          <NavLink to="/cart">Giỏ hàng{count > 0 && <span className="cart-count">{count}</span>}</NavLink>
          <span className="spacer" />
          {user?.Role === 'Admin' && <NavLink to="/admin">Quản trị</NavLink>}
          {user ? (
            <>
              <NavLink to="/profile">{user.FullName}</NavLink>
              <button className="btn" onClick={out}>Đăng xuất</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Đăng nhập</NavLink>
              <NavLink to="/register" className="btn btn-primary">Đăng ký</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="container"><Outlet /></main>
      <footer className="footer">MewCard · Dự án sinh viên — thanh toán chỉ ở môi trường thử nghiệm</footer>
    </div>
  );
}
