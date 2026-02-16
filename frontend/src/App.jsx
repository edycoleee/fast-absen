import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './domain/contexts/AuthContext'
import PrivateRoute from './presentation/components/common/PrivateRoute'
import Landing from './presentation/pages/Landing'
import LoginAdmin from './presentation/pages/LoginAdmin'
import LoginAbsensi from './presentation/pages/LoginAbsensi'
import Login from './presentation/pages/Login'
import Dashboard from './presentation/pages/Dashboard'
import AbsensiDashboard from './presentation/pages/AbsensiDashboard'
import Users from './presentation/pages/Users'
import Roles from './presentation/pages/Roles'
import Permissions from './presentation/pages/Permissions'
import Pegawai from './presentation/pages/Pegawai'
import Absensi from './presentation/pages/Absensi'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Landing />} />
          
          {/* Login Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/login-admin" element={<LoginAdmin />} />
          <Route path="/login-absensi" element={<LoginAbsensi />} />
          
          {/* Absensi Dashboard (for regular users/pegawai) */}
          <Route path="/absensi-dashboard" element={<PrivateRoute />}>
            <Route index element={<AbsensiDashboard />} />
          </Route>
          
          {/* Admin Routes (protected) */}
          <Route path="/" element={<PrivateRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="permissions" element={<Permissions />} />
            <Route path="pegawai" element={<Pegawai />} />
            <Route path="absensi" element={<Absensi />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
