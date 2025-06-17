
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const validateStudentExists = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('student_id, name, class_name')
        .eq('student_id', studentId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned
        return null;
      }

      if (error) {
        console.error('Student validation error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error validating student:', error);
      return null;
    }
  };

  const handleLogin = async () => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
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
        // 학생 존재 여부 확인
        const student = await validateStudentExists(studentId);
        
        if (!student) {
          toast({
            variant: "destructive",
            title: "로그인 실패",
            description: "등록되지 않은 학번입니다. 관리자에게 문의하세요.",
          });
          return;
        }

        localStorage.setItem('userType', 'student');
        localStorage.setItem('studentId', studentId);
        navigate('/student');
        toast({
          title: "로그인 성공",
          description: `${student.name}님 (${student.class_name}반)으로 로그인되었습니다.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "로그인 실패",
          description: "학번을 입력해주세요.",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
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
              disabled={isLoading}
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
                disabled={isLoading}
                className="border-gray-300 focus:border-[rgb(15,15,112)] focus:ring-[rgb(15,15,112)]"
              />
            </div>
          )}
          
          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)] text-white font-medium py-2.5"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
