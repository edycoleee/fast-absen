import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';

/**
 * Build sidebar menu dynamically from menu_guard.
 * - Operational menus follow menu_guard.menus.*.visible.
 * - Admin management menus shown only when menu_guard.is_admin === true.
 * - Safe default: hide all if menu_guard is empty (except dashboard fallback).
 */
const buildMenuItems = (menuGuard = {}) => {
  const menus = menuGuard?.menus ?? {};
  const isAdmin = !!menuGuard?.is_admin;
  const isEmpty = Object.keys(menus).length === 0;
  const items = [];

  // --- Operational menus (DOC section 3A) ---
  // Dashboard: show if explicitly visible OR menu_guard is empty (safe fallback)
  if (isEmpty || menus.dashboard?.visible) {
    items.push({ path: '/dashboard', label: 'Dashboard', icon: '📊' });
  }
  if (menus.kpi_unit_role?.visible) {
    items.push({ path: '/rekap-unit-role', label: 'Rekap Unit/Role', icon: '📈' });
  }
  if (menus.monitoring_absensi?.visible) {
    items.push({ path: '/absensi', label: 'Monitoring Absensi', icon: '📝' });
  }
  if (menus.approval?.visible) {
    items.push({ path: '/approval', label: 'Approval', icon: '✅' });
  }
  if (menus.user_sessions?.visible) {
    items.push({ path: '/sessions-monitor', label: 'Monitor Sesi', icon: '📡' });
  }

  // --- Admin management menus (only for is_admin) ---
  if (isAdmin) {
    items.push(
      { path: '/users',           label: 'Users',           icon: '👥', divider: true },
      { path: '/roles',           label: 'Roles',           icon: '🔐' },
      { path: '/permissions',     label: 'Permissions',     icon: '🔑' },
      { path: '/unit',            label: 'Unit',            icon: '🏢' },
      { path: '/pegawai',         label: 'Pegawai',         icon: '👨‍💼' },
      { path: '/shift-kelompok',  label: 'Shift Kelompok',  icon: '🔄' },
      { path: '/shift-aturan',    label: 'Shift Aturan',    icon: '📋' },
      { path: '/shift-pegawai',   label: 'Shift Pegawai',   icon: '👤' },
      { path: '/roster-upload',   label: 'Roster Upload',   icon: '📄' },
      { path: '/roster-adapter',  label: 'Roster Adapter',  icon: '🧩' },
      { path: '/roster-shift',    label: 'Roster Shift',    icon: '🗓️' },
      { path: '/penilaian-shift', label: 'Penilaian Shift', icon: '⚖️' },
    );
  }

  // --- Always visible quick link ---
  items.push({ path: '/login-absensi', label: 'Login Absensi', icon: '🔓', divider: true });

  return items;
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login-admin');
  };

  const menuItems = buildMenuItems(user?.menu_guard);
  const isActive = (path) => location.pathname === path;

  const isAdmin = !!user?.menu_guard?.is_admin;
  const isKaUnit = !!user?.menu_guard?.is_kepala_unit;
  const dashboardTitle = isAdmin ? 'Admin Panel' : isKaUnit ? 'Kepala Unit' : 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header with Hamburger Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-primary-600">RSUD Sulfat</h1>
            <p className="text-xs text-gray-500">{dashboardTitle}</p>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        {/* Close button for mobile */}
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">RSUD Sulfat</h1>
          <p className="text-sm text-gray-500">{dashboardTitle}</p>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                {item.divider && (
                  <div className="border-t border-gray-200 my-2" />
                )}
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.roles?.[0] || 'User'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
              title="Logout"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
