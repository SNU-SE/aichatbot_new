
import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';

interface EnhancedAuthGuardProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'student';
}

const EnhancedAuthGuard = ({ children, requiredRole = 'student' }: EnhancedAuthGuardProps) => {
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'error'>('checking');
  const [studentId, setStudentId] = useState<string | null>(null);
  const { isRecovering, recoverSession } = useSessionRecovery();

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userType = localStorage.getItem('userType');
      const storedStudentId = localStorage.getItem('studentId');

      if (!userType || !storedStudentId) {
        setAuthState('unauthenticated');
        return;
      }

      if (requiredRole === 'student' && userType !== 'student') {
        setAuthState('unauthenticated');
        return;
      }

      if (requiredRole === 'admin' && userType !== 'admin') {
        setAuthState('unauthenticated');
        return;
      }

      setStudentId(storedStudentId);
      setAuthState('authenticated');
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState('error');
    }
  };

  const handleRetry = async () => {
    if (studentId) {
      const success = await recoverSession(studentId);
      if (success) {
        setAuthState('authenticated');
      } else {
        setAuthState('unauthenticated');
      }
    } else {
      checkAuthState();
    }
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>인증 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>연결 오류</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              서버와의 연결에 문제가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.
            </p>
            <div className="flex space-x-2">
              <Button 
                onClick={handleRetry} 
                disabled={isRecovering}
                className="flex-1"
              >
                {isRecovering ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    재시도 중...
                  </>
                ) : (
                  '다시 시도'
                )}
              </Button>
              <Button 
                onClick={() => window.location.href = '/auth'} 
                variant="outline"
                className="flex-1"
              >
                로그인 페이지로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    if (studentId) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                <span>세션 만료</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                로그인 세션이 만료되었습니다. 세션을 복구하거나 다시 로그인해주세요.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleRetry} 
                  disabled={isRecovering}
                  className="flex-1"
                >
                  {isRecovering ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      복구 중...
                    </>
                  ) : (
                    '세션 복구'
                  )}
                </Button>
                <Button 
                  onClick={() => window.location.href = '/auth'} 
                  variant="outline"
                  className="flex-1"
                >
                  다시 로그인
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default EnhancedAuthGuard;
