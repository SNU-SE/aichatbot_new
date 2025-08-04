
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'student';
  redirectTo?: string;
}

const AuthGuard = ({ children, requireRole, redirectTo = '/auth' }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const rawStudentId = localStorage.getItem('studentId');
    
    // 학생 ID 정규화 (공백 제거 및 유효성 검증)
    const studentId = rawStudentId ? String(rawStudentId).trim() : null;

    console.log('AuthGuard check - UserType:', userType, 'StudentId:', studentId);

    if (!userType) {
      console.log('No userType found, redirecting to auth');
      navigate(redirectTo);
      return;
    }

    if (requireRole && userType !== requireRole) {
      console.log('Role mismatch - Required:', requireRole, 'Found:', userType);
      // 잘못된 역할로 접근한 경우 올바른 페이지로 리다이렉트
      if (userType === 'admin') {
        navigate('/admin');
      } else if (userType === 'student') {
        navigate('/student');
      } else {
        navigate(redirectTo);
      }
      return;
    }

    // 학생의 경우 학번이 있는지 확인
    if (userType === 'student') {
      if (!studentId || studentId.length === 0) {
        console.log('Student login required but no valid studentId found');
        // 유효하지 않은 세션 데이터 정리
        localStorage.removeItem('userType');
        localStorage.removeItem('studentId');
        navigate(redirectTo);
        return;
      }
      
      // 학생 ID 재정규화하여 저장 (불일치 방지)
      if (rawStudentId !== studentId) {
        localStorage.setItem('studentId', studentId);
      }
    }

    setIsAuthenticated(true);
    setIsLoading(false);
  }, [navigate, requireRole, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(15,15,112)] mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
};

export default AuthGuard;
