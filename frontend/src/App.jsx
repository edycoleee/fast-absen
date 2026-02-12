import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './domain/contexts/AuthContext'
import PrivateRoute from './presentation/components/common/PrivateRoute'
import Login from './presentation/pages/Login'
import Dashboard from './presentation/pages/Dashboard'
import Users from './presentation/pages/Users'
import Roles from './presentation/pages/Roles'
import Permissions from './presentation/pages/Permissions'
import Pegawai from './presentation/pages/Pegawai'
import Absensi from './presentation/pages/Absensi'
import LoginAbsensi from './presentation/pages/LoginAbsensi'

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
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="permissions" element={<Permissions />} />
            <Route path="pegawai" element={<Pegawai />} />
            <Route path="absensi" element={<Absensi />} />
            <Route path="login-absensi" element={<LoginAbsensi />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
