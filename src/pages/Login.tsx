
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStudentId(value);
    setShowPasswordField(value === 'admin');
    if (value !== 'admin') {
      setPassword('');
    }
  };

  const handleLogin = () => {
    if (studentId === 'admin') {
      if (password === '38874') {
        localStorage.setItem('userType', 'admin');
        navigate('/admin');
        toast({
          title: "로그인 성공",
          description: "관리자 모드로 로그인되었습니다.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "로그인 실패",
          description: "비밀번호가 올바르지 않습니다.",
        });
      }
    } else if (studentId.trim()) {
      localStorage.setItem('userType', 'student');
      localStorage.setItem('studentId', studentId);
      navigate('/student');
      toast({
        title: "로그인 성공",
        description: `학번 ${studentId}로 로그인되었습니다.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "학번을 입력해주세요.",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
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
              학번을 입력하여 로그인하세요
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="studentId" className="text-sm font-medium text-gray-700">
              학번
            </label>
            <Input
              id="studentId"
              type="text"
              placeholder="학번을 입력하세요"
              value={studentId}
              onChange={handleStudentIdChange}
              onKeyPress={handleKeyPress}
              className="border-gray-300 focus:border-[rgb(15,15,112)] focus:ring-[rgb(15,15,112)]"
            />
          </div>
          
          {showPasswordField && (
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-gray-300 focus:border-[rgb(15,15,112)] focus:ring-[rgb(15,15,112)]"
              />
            </div>
          )}
          
          <Button 
            onClick={handleLogin}
            className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)] text-white font-medium py-2.5"
          >
            로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
