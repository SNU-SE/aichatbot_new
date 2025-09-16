
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { persistStudentToken } from '@/hooks/useSupabaseAuth';

const AuthPage = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdminLogin = loginId === 'admin';

  const verifyAdminPassword = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin', {
        body: { password }
      });

      if (error) {
        console.error('Error calling verify-admin function:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('Error verifying admin password:', error);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !loginId.trim()) return;
    
    setIsLoading(true);
    
    if (isAdminLogin) {
      // 관리자 로그인 - 환경변수로 비밀번호 검증
      const isValidPassword = await verifyAdminPassword(password);
      
      setTimeout(() => {
        if (isValidPassword) {
          // 기존 학생 세션 정리
          localStorage.removeItem('studentId');
          localStorage.removeItem('studentProfile');
          persistStudentToken(null);
          localStorage.setItem('userType', 'admin');
          toast({
            title: "관리자 로그인 성공",
            description: "관리자로 로그인되었습니다."
          });
          navigate('/admin');
        } else {
          toast({
            title: "로그인 실패",
            description: "관리자 비밀번호가 올바르지 않습니다.",
            variant: "destructive"
          });
        }
        setIsLoading(false);
      }, 500);
    } else {
      // 학생 로그인 - Edge Function을 통한 JWT 발급
      try {
        const normalizedId = String(loginId).trim();
        
        if (!normalizedId) {
          toast({
            title: "로그인 실패",
            description: "학번을 입력해주세요.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // 기존 세션 정리
        localStorage.removeItem('userType');
        localStorage.removeItem('studentId');

        persistStudentToken(null);

        localStorage.removeItem('studentProfile');

        const { data, error } = await supabase.functions.invoke('student-login', {
          body: { studentId: normalizedId }
        });

        if (error || !data?.token) {
          toast({
            title: "로그인 실패",
            description: '로그인을 완료할 수 없습니다.',
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Store token and student info
        persistStudentToken(data.token);
        localStorage.setItem('studentId', normalizedId);
        localStorage.setItem('userType', 'student');
        if (data.student) {
          localStorage.setItem('studentProfile', JSON.stringify(data.student));
        }

        toast({
          title: "로그인 성공",
          description: `학번 ${normalizedId}로 로그인되었습니다.`
        });
        navigate('/student');
        
        setIsLoading(false);
      } catch (error) {
        console.error('Login error:', error);
        persistStudentToken(null);
        toast({
          title: "로그인 실패",
          description: "로그인 중 오류가 발생했습니다.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-[rgb(15,15,112)] rounded-full flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">AI 학습 도우미</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              로그인하여 시작하세요
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="text"
              placeholder="학번을 입력하세요 (관리자는 admin)"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
            {isAdminLogin && (
              <Input
                type="password"
                placeholder="관리자 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
            <Button 
              type="submit" 
              className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)]"
              disabled={isLoading || !loginId.trim() || (isAdminLogin && !password.trim())}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
