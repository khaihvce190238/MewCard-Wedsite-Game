import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/ui';

/** Bảo vệ route phía giao diện (UX). Quyền thật sự luôn được backend kiểm tra lại. */
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (role && user.Role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
