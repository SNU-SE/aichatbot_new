
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdminLogin = loginId === 'admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !loginId.trim()) return;
    
    setIsLoading(true);
    
    if (isAdminLogin) {
      // 관리자 로그인 - admin / 38874
      if (password === '38874') {
        setTimeout(() => {
          localStorage.setItem('userType', 'admin');
          toast({
            title: "관리자 로그인 성공",
            description: "관리자로 로그인되었습니다."
          });
          navigate('/admin');
          setIsLoading(false);
        }, 500);
      } else {
        setTimeout(() => {
          toast({
            title: "로그인 실패",
            description: "관리자 비밀번호가 올바르지 않습니다.",
            variant: "destructive"
          });
          setIsLoading(false);
        }, 500);
      }
    } else {
      // 학생 로그인 - 학번만으로 로그인
      setTimeout(() => {
        localStorage.setItem('userType', 'student');
        localStorage.setItem('studentId', loginId);
        toast({
          title: "로그인 성공",
          description: `학번 ${loginId}로 로그인되었습니다.`
        });
        navigate('/student');
        setIsLoading(false);
      }, 500);
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
