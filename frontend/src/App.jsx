import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './domain/contexts/AuthContext'
import PrivateRoute from './presentation/components/common/PrivateRoute'
import {
  LandingPage,
  AdminLoginPage,
  AttendanceLoginPage,
  AttendanceDashboardPage,
  AdminDashboardPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
  EmployeesPage,
  AttendanceMonitorPage,
  SessionMonitorPage,
} from './presentation/pages'
import { useAuth, useSessionHeartbeat } from './domain/hooks'

function SessionHeartbeatRunner() {
  const { user } = useAuth()
  const { startHeartbeat, stopHeartbeat } = useSessionHeartbeat(5)

  useEffect(() => {
    if (user) {
      startHeartbeat()
    } else {
      stopHeartbeat()
    }

    return () => {
      stopHeartbeat()
    }
  }, [user])

  return null
}

function App() {
  return (
    <AuthProvider>
      <SessionHeartbeatRunner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Login Routes */}
          <Route path="/login-admin" element={<AdminLoginPage />} />
          <Route path="/login-absensi" element={<AttendanceLoginPage />} />
          
          {/* Absensi Dashboard (for regular users/pegawai) */}
          <Route path="/absensi-dashboard" element={<PrivateRoute />}>
            <Route index element={<AttendanceDashboardPage />} />
          </Route>
          
          {/* Admin Routes (protected) */}
          <Route path="/" element={<PrivateRoute />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="pegawai" element={<EmployeesPage />} />
            <Route path="absensi" element={<AttendanceMonitorPage />} />
            <Route path="sessions-monitor" element={<SessionMonitorPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
