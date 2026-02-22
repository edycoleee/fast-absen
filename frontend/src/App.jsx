import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './domain/contexts/AuthContext'
import PrivateRoute from './presentation/components/common/PrivateRoute'
import AttendancePrivateRoute from './presentation/components/common/AttendancePrivateRoute'
import {
  LandingPage,
  AdminLoginPage,
  AttendanceLoginPage,
  AttendanceDashboardPage,
  AdminDashboardPage,
  UsersPage,
  RolesPage,
  PermissionsPage,
  UnitsPage,
  EmployeesPage,
  AttendanceMonitorPage,
  SessionMonitorPage,
  ApprovalPage,
  KpiUnitRolePage,
  ShiftKelompokPage,
  ShiftKelompokAturanPage,
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
          
          {/* Absensi Dashboard (for regular users/pegawai) - No admin layout */}
          <Route path="/absensi-dashboard" element={<AttendancePrivateRoute />}>
            <Route index element={<AttendanceDashboardPage />} />
          </Route>
          
          {/* Admin Routes (protected) */}
          <Route path="/" element={<PrivateRoute />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="unit" element={<UnitsPage />} />
            <Route path="pegawai" element={<EmployeesPage />} />
            <Route path="shift-kelompok" element={<ShiftKelompokPage />} />
            <Route path="shift-aturan" element={<ShiftKelompokAturanPage />} />
            <Route path="absensi" element={<AttendanceMonitorPage />} />
            <Route path="sessions-monitor" element={<SessionMonitorPage />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="rekap-unit-role" element={<KpiUnitRolePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
