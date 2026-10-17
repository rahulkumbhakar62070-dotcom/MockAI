import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Route Guard for Authenticated-only pages
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col items-center justify-center text-[#777970]">
        <Loader2 className="w-8 h-8 animate-spin text-[#245C46] mb-4" />
        <p className="text-sm font-medium">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Route Guard for Public-only pages (e.g., Login / Signup)
 * If user is already logged in, redirect them away from login/signup.
 */
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col items-center justify-center text-[#777970]">
        <Loader2 className="w-8 h-8 animate-spin text-[#245C46] mb-4" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
