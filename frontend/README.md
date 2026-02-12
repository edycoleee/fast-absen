# Frontend Admin Dashboard - Sistem Absensi RSUD Sulfat

Admin dashboard untuk mengelola sistem absensi pegawai RSUD Sulfat.

## Tech Stack

- **React 18.3.1** - Library UI
- **Vite 6.0.11** - Build tool (super fast)
- **@vitejs/plugin-react-swc 3.7.2** - SWC compiler untuk kompilasi cepat
- **React Router DOM 6.22.0** - Routing SPA
- **Axios 1.6.7** - HTTP client untuk API calls
- **Tailwind CSS 3.4.1** - Utility-first CSS framework

## Fitur

✅ **Authentication**
- Login dengan JWT token
- Protected routes
- Auto redirect ke login jika belum login
- Auto logout jika token expired

✅ **Dashboard**
- Overview statistik sistem
- Quick actions
- User info display

✅ **Manajemen Data**
- **Users** - CRUD users dengan pagination
- **Roles** - Kelola roles (coming soon)
- **Permissions** - Kelola permissions (coming soon)
- **Pegawai** - CRUD pegawai dengan foto, search, pagination
- **Absensi** - Monitor absensi pegawai realtime
- **Login Absensi** - Track aktivitas login (coming soon)

✅ **UI/UX**
- Responsive design
- Modern interface dengan Tailwind CSS
- Sidebar navigation
- Loading states
- Error handling
- Pagination

## Struktur Folder

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── Layout.jsx   # Main layout dengan sidebar
│   │   └── PrivateRoute.jsx  # Protected route wrapper
│   ├── pages/          # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Users.jsx
│   │   ├── Roles.jsx
│   │   ├── Permissions.jsx
│   │   ├── Pegawai.jsx
│   │   ├── Absensi.jsx
│   │   └── LoginAbsensi.jsx
│   ├── services/       # API services
│   │   ├── api.js      # Axios instance + interceptors
│   │   └── index.js    # Service functions
│   ├── utils/          # Utilities
│   │   └── AuthContext.jsx  # Authentication context
│   ├── App.jsx         # Main app component + routing
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles + Tailwind
├── .env                # Environment variables
├── index.html
├── package.json
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── postcss.config.js   # PostCSS configuration
```

## Installation

```bash
cd /home/sultan/fast-absen/frontend
npm install
```

## Development

```bash
npm run dev
```

Server akan berjalan di: **http://192.168.171.15:3000**

## Build Production

```bash
npm run build
```

Output akan ada di folder `dist/`

## Preview Production Build

```bash
npm run preview
```

## Environment Variables

File `.env`:

```env
VITE_API_BASE_URL=http://192.168.171.15:8000/api/v1
VITE_APP_TITLE=Admin Dashboard - Sistem Absensi RSUD Sulfat
```

## API Integration

Frontend berkomunikasi dengan backend melalui proxy Vite:

**Development:**
- `/api/*` → `http://192.168.171.15:8000/api/v1/*`

**Services:**
- `authService` - Login, logout, user info
- `userService` - CRUD users
- `pegawaiService` - CRUD pegawai (dengan upload foto)
- `absensiService` - Read, update, delete absensi

**Axios Interceptors:**
- Request: Auto-add JWT token ke header `Authorization: Bearer <token>`
- Response: Auto-redirect ke `/login` jika token expired (401)

## Default Credentials

Gunakan credentials admin dari backend:

```
Username: admin
Password: admin123
```

## Routing

**Public Routes:**
- `/login` - Login page

**Protected Routes:**
- `/dashboard` - Dashboard overview
- `/users` - User management
- `/roles` - Role management (placeholder)
- `/permissions` - Permission management (placeholder)
- `/pegawai` - Employee management
- `/absensi` - Attendance monitoring
- `/login-absensi` - Login tracking (placeholder)

## Features Implemented

### ✅ Login Page
- Form login dengan validation
- Error handling
- Loading state
- Auto redirect ke dashboard setelah login

### ✅ Dashboard
- Stats cards (placeholder)
- Welcome card dengan user info
- Quick actions link

### ✅ Users Page
- List users dengan pagination
- Role badge
- Active/Inactive status
- Delete functionality
- Error handling

### ✅ Pegawai Page
- List pegawai dengan foto
- Search functionality (nama, NIP, email)
- Pagination
- Photo display (optimized dengan backend)
- Delete functionality

### ✅ Absensi Page
- List absensi realtime
- Status badge (hadir, izin, sakit, alpha)
- Timestamp formatting
- IP address tracking
- Refresh button

## Development Notes

**Fast Refresh dengan SWC:**
- SWC compiler membuat hot reload sangat cepat
- Perubahan code langsung reflected tanpa full reload

**Vite Dev Server:**
- Host: `0.0.0.0` (accessible dari network)
- Port: `3000`
- Auto proxy `/api` ke backend

**Tailwind CSS:**
- Utility classes untuk styling cepat
- Custom components di `index.css` (btn-primary, input-field, card)
- Custom primary color palette

## Next Steps / Improvements

🔲 **CRUD Operations:**
- Add modal untuk create/edit user
- Add modal untuk create/edit pegawai dengan upload foto
- Implement Roles CRUD
- Implement Permissions CRUD

🔲 **Features:**
- Filtering & sorting tables
- Export data (CSV, PDF)
- Dashboard dengan real stats dari API
- Login Absensi page implementation
- User profile page
- Change password functionality

🔲 **UI/UX:**
- Toast notifications (react-hot-toast)
- Confirmation dialogs (custom modal)
- Form validation (react-hook-form)
- Better error messages
- Empty states illustrations

🔲 **Performance:**
- Lazy loading pages (React.lazy + Suspense)
- Infinite scroll untuk tables
- Image lazy loading
- Cache API responses (React Query)

## Troubleshooting

**Error: ECONNREFUSED saat hit API**
- Pastikan backend running di `http://192.168.171.15:8000`
- Check `.env` untuk VITE_API_BASE_URL
- Restart dev server setelah ubah `.env`

**Token expired terus-menerus**
- Check expiry time di backend JWT settings
- Clear localStorage: `localStorage.clear()`

**Photos tidak muncul**
- Check CORS settings di backend
- Verify foto_url dari API response
- Check network tab untuk 404 errors

**Vite dev server tidak bisa diakses dari network**
- Vite sudah config `host: 0.0.0.0`
- Check firewall settings
- Verify IP address: `ip addr show`

## License

Internal use - RSUD Sulfat
