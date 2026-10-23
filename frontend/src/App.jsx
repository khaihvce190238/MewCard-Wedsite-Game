import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Profile from './pages/user/Profile';
import Topics from './pages/game/Topics';
import Play from './pages/game/Play';
import History from './pages/game/History';
import Favorites from './pages/game/Favorites';
import Shop from './pages/shop/Shop';
import ProductDetail from './pages/shop/ProductDetail';
import Cart from './pages/shop/Cart';
import Checkout from './pages/shop/Checkout';
import MockPay from './pages/shop/MockPay';
import PaymentResult from './pages/shop/PaymentResult';
import Orders from './pages/shop/Orders';
import OrderDetail from './pages/shop/OrderDetail';
import MembershipRegister from './pages/membership/MembershipRegister';
import MembershipStatus from './pages/membership/MembershipStatus';
import Dashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminTopics from './pages/admin/Topics';
import AdminCards from './pages/admin/Cards';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminMemberships from './pages/admin/Memberships';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="topics" element={<Topics />} />
                <Route path="shop" element={<Shop />} />
                <Route path="shop/:id" element={<ProductDetail />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="play/:topicId" element={<Play />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="history" element={<History />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="payment/mock/:orderId" element={<MockPay />} />
                  <Route path="payment/result" element={<PaymentResult />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:id" element={<OrderDetail />} />
                  <Route path="membership/register" element={<MembershipRegister />} />
                  <Route path="membership/status" element={<MembershipStatus />} />
                </Route>
              </Route>
              <Route path="admin" element={<ProtectedRoute role="Admin" />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="topics" element={<AdminTopics />} />
                  <Route path="cards" element={<AdminCards />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="memberships" element={<AdminMemberships />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
