import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';
import Layout from '../layout/Layout';

/**
 * Check if a given path is accessible based on menu_guard.
 * - Operational routes: follow menu_guard.menus.*.visible.
 * - Admin routes: require menu_guard.is_admin === true.
 * - /dashboard & /login-absensi: always accessible when authenticated.
 * - Safe default: deny if menu_guard is present but key is missing.
 */
const canAccessRoute = (pathname, menuGuard = {}) => {
  const menus = menuGuard?.menus ?? {};
  const isAdmin = !!menuGuard?.is_admin;
  const isEmpty = Object.keys(menus).length === 0;

  // Always accessible
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/login-absensi')) return true;

  // Operational routes
  if (pathname.startsWith('/rekap-unit-role')) return !!menus.kpi_unit_role?.visible;
  if (pathname.startsWith('/absensi'))         return isEmpty || !!menus.monitoring_absensi?.visible;
  if (pathname.startsWith('/approval'))        return !!menus.approval?.visible;
  if (pathname.startsWith('/sessions-monitor')) return isEmpty || !!menus.user_sessions?.visible;

  // Admin management routes
  if (
    pathname.startsWith('/users') ||
    pathname.startsWith('/roles') ||
    pathname.startsWith('/permissions') ||
    pathname.startsWith('/unit') ||
    pathname.startsWith('/pegawai')
  ) {
    return isEmpty || isAdmin;
  }

  // Unknown routes: allow (App.jsx fallback will handle 404)
  return true;
};

/**
 * Get the first accessible route for redirect when access is denied.
 */
const getFirstAccessibleRoute = (menuGuard = {}) => {
  const menus = menuGuard?.menus ?? {};
  const isAdmin = !!menuGuard?.is_admin;

  if (menus.dashboard?.visible || Object.keys(menus).length === 0) return '/dashboard';
  if (menus.monitoring_absensi?.visible) return '/absensi';
  if (menus.kpi_unit_role?.visible) return '/rekap-unit-role';
  if (menus.approval?.visible) return '/approval';
  if (menus.user_sessions?.visible) return '/sessions-monitor';
  if (isAdmin) return '/users';
  return '/dashboard';
};

const PrivateRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login-admin" replace />;
  }

  if (!canAccessRoute(location.pathname, user?.menu_guard)) {
    const fallback = getFirstAccessibleRoute(user?.menu_guard);
    return <Navigate to={fallback} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default PrivateRoute;
