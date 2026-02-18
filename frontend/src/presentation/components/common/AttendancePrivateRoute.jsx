import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';

const AttendancePrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login-absensi" replace />;
  }

  // Render without Layout wrapper - the AttendanceDashboardPage has its own layout
  return <Outlet />;
};

export default AttendancePrivateRoute;
