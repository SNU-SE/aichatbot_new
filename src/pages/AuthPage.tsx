
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const [studentId, setStudentId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !studentId.trim()) return;
    
    setIsLoading(true);
    
    // 학생 인증 - 학번만으로 로그인
    setTimeout(() => {
      localStorage.setItem('userType', 'student');
      localStorage.setItem('studentId', studentId);
      toast({
        title: "로그인 성공",
        description: `학번 ${studentId}로 로그인되었습니다.`
      });
      navigate('/student');
      setIsLoading(false);
    }, 500);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    
    // 관리자 인증 - admin / 38874
    if (adminId === 'admin' && adminPassword === '38874') {
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
          description: "관리자 ID 또는 비밀번호가 올바르지 않습니다.",
          variant: "destructive"
        });
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
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">학생</TabsTrigger>
              <TabsTrigger value="admin">관리자</TabsTrigger>
            </TabsList>
            
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-[rgb(15,15,112)]" />
                  <span className="font-medium">학생 로그인</span>
                </div>
                <Input
                  type="text"
                  placeholder="학번을 입력하세요"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
                <Button 
                  type="submit" 
                  className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)]"
                  disabled={isLoading || !studentId.trim()}
                >
                  {isLoading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <UserCog className="h-5 w-5 text-[rgb(15,15,112)]" />
                  <span className="font-medium">관리자 로그인</span>
                </div>
                <Input
                  type="text"
                  placeholder="관리자 ID"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
                <Button 
                  type="submit" 
                  className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)]"
                  disabled={isLoading}
                >
                  {isLoading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
