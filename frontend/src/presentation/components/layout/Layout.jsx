import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/roles', label: 'Roles', icon: '🔐' },
    { path: '/permissions', label: 'Permissions', icon: '🔑' },
    { path: '/pegawai', label: 'Pegawai', icon: '👨‍💼' },
    { path: '/absensi', label: 'Absensi', icon: '📝' },
    { path: '/sessions-monitor', label: 'Monitor Sesi', icon: '📡' },
    { path: '/login-absensi', label: 'Login Absensi', icon: '🔓' },
  ];

  const isActive = (path) => location.pathname === path;

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
            <p className="text-xs text-gray-500">Admin Dashboard</p>
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
      <aside className={`fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
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
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
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
              className="text-gray-500 hover:text-red-600 transition-colors"
              title="Logout"
            >
              🚪
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
