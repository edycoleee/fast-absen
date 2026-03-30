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
const canAccessRoute = (pathname, menuGuard = {}, permissions = [], roles = []) => {
  const menus = menuGuard?.menus ?? {};
  const isAdmin = !!menuGuard?.is_admin;
  const isEmpty = Object.keys(menus).length === 0;
  const perms = new Set(permissions);
  const isFullAdmin = roles.some(r => ['admin', 'super-admin'].includes(r.toLowerCase()));

  // Always accessible
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/login-absensi')) return true;

  // Operational routes
  if (pathname.startsWith('/rekap-unit-role')) return !!menus.kpi_unit_role?.visible;
  if (pathname.startsWith('/absensi'))         return isEmpty || !!menus.monitoring_absensi?.visible;
  if (pathname.startsWith('/approval'))        return !!menus.approval?.visible;
  if (pathname.startsWith('/sessions-monitor')) return isEmpty || !!menus.user_sessions?.visible;

  if (!isAdmin) return true; // non-admin: let backend handle 403

  // Full-admin-only pages
  if (pathname.startsWith('/system-settings')) return isFullAdmin;
  if (pathname.startsWith('/ip-whitelist'))    return isFullAdmin || perms.has('ip_whitelist.read');
  if (pathname.startsWith('/users'))      return isFullAdmin || perms.has('user.read');
  if (pathname.startsWith('/roles'))      return isFullAdmin || perms.has('user.read');
  if (pathname.startsWith('/permissions')) return isFullAdmin || perms.has('user.read');

  // Permission-gated admin pages
  if (pathname.startsWith('/unit'))       return isFullAdmin || perms.has('unit.create');
  if (pathname.startsWith('/pegawai'))    return isFullAdmin || perms.has('pegawai.create');
  if (pathname.startsWith('/shift-kelompok'))  return isFullAdmin || perms.has('shift_kelompok.create');
  if (pathname.startsWith('/shift-aturan'))    return isFullAdmin || perms.has('shift_kelompok_aturan.create');
  if (pathname.startsWith('/shift-pegawai'))   return isFullAdmin || perms.has('pegawai_shift_kelompok.create');
  if (pathname.startsWith('/roster-upload'))   return isFullAdmin || perms.has('roster_upload_batch.read');
  if (pathname.startsWith('/roster-adapter'))  return isFullAdmin || perms.has('roster_adapter.read');
  if (pathname.startsWith('/roster-shift'))    return isFullAdmin || perms.has('roster_shift.read');
  if (pathname.startsWith('/penilaian-shift')) return isFullAdmin || perms.has('penilaian_shift_absensi.read');

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

  if (!canAccessRoute(location.pathname, user?.menu_guard, user?.permissions || [], user?.roles || [])) {
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
