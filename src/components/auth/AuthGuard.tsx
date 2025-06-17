
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'student';
  redirectTo?: string;
}

const AuthGuard = ({ children, requireRole, redirectTo = '/auth' }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate(redirectTo);
        return;
      }

      if (requireRole && role !== requireRole) {
        // Redirect based on actual role
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'student') {
          navigate('/student');
        } else {
          navigate(redirectTo);
        }
      }
    }
  }, [user, role, loading, navigate, requireRole, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(15,15,112)] mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requireRole && role !== requireRole) return null;

  return <>{children}</>;
};

export default AuthGuard;
