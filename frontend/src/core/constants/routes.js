/**
 * Application Routes
 * Centralized route definitions
 */
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Private routes
  ROOT: '/',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  ROLES: '/roles',
  PERMISSIONS: '/permissions',
  PEGAWAI: '/pegawai',
  ABSENSI: '/absensi',
  LOGIN_ABSENSI: '/login-absensi',
};

/**
 * Route configuration with metadata
 */
export const ROUTE_CONFIG = {
  [ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    icon: 'home',
    requiresAuth: true,
  },
  [ROUTES.USERS]: {
    title: 'Users',
    icon: 'users',
    requiresAuth: true,
    requiresRole: ['admin'],
  },
  [ROUTES.ROLES]: {
    title: 'Roles',
    icon: 'shield',
    requiresAuth: true,
    requiresRole: ['admin'],
  },
  [ROUTES.PERMISSIONS]: {
    title: 'Permissions',
    icon: 'key',
    requiresAuth: true,
    requiresRole: ['admin'],
  },
  [ROUTES.PEGAWAI]: {
    title: 'Pegawai',
    icon: 'users',
    requiresAuth: true,
  },
  [ROUTES.ABSENSI]: {
    title: 'Absensi',
    icon: 'calendar',
    requiresAuth: true,
  },
  [ROUTES.LOGIN_ABSENSI]: {
    title: 'Login Absensi',
    icon: 'clock',
    requiresAuth: true,
  },
};
