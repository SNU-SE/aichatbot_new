
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, UserCog } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { data } = await signIn(email, password);
      if (data?.user) {
        navigate('/admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || password !== confirmPassword) return;
    
    setIsLoading(true);
    try {
      const { data } = await signUp(email, password, 'admin');
      if (data?.user) {
        navigate('/admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { data } = await signIn(email, password);
      if (data?.user) {
        navigate('/student');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || password !== confirmPassword) return;
    
    setIsLoading(true);
    try {
      const { data } = await signUp(email, password, 'student', {
        student_id: studentId,
        name,
        class_name: className
      });
      if (data?.user) {
        navigate('/student');
      }
    } finally {
      setIsLoading(false);
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
              로그인하거나 계정을 만드세요
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin-login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin-login">관리자</TabsTrigger>
              <TabsTrigger value="student-login">학생</TabsTrigger>
            </TabsList>
            
            <TabsContent value="admin-login">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">로그인</TabsTrigger>
                  <TabsTrigger value="signup">회원가입</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <UserCog className="h-5 w-5 text-[rgb(15,15,112)]" />
                      <span className="font-medium">관리자 로그인</span>
                    </div>
                    <Input
                      type="email"
                      placeholder="이메일"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="비밀번호"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                
                <TabsContent value="signup">
                  <form onSubmit={handleAdminSignup} className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <UserCog className="h-5 w-5 text-[rgb(15,15,112)]" />
                      <span className="font-medium">관리자 회원가입</span>
                    </div>
                    <Input
                      type="email"
                      placeholder="이메일"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="비밀번호"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="비밀번호 확인"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    {password !== confirmPassword && confirmPassword && (
                      <p className="text-sm text-red-500">비밀번호가 일치하지 않습니다.</p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)]"
                      disabled={isLoading || password !== confirmPassword}
                    >
                      {isLoading ? '가입 중...' : '회원가입'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            <TabsContent value="student-login">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">로그인</TabsTrigger>
                  <TabsTrigger value="signup">회원가입</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleStudentLogin} className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <GraduationCap className="h-5 w-5 text-[rgb(15,15,112)]" />
                      <span className="font-medium">학생 로그인</span>
                    </div>
                    <Input
                      type="email"
                      placeholder="이메일"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="비밀번호"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                
                <TabsContent value="signup">
                  <form onSubmit={handleStudentSignup} className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <GraduationCap className="h-5 w-5 text-[rgb(15,15,112)]" />
                      <span className="font-medium">학생 회원가입</span>
                    </div>
                    <Input
                      type="email"
                      placeholder="이메일"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="비밀번호"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="비밀번호 확인"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Input
                      type="text"
                      placeholder="학번"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                    <Input
                      type="text"
                      placeholder="이름"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <Input
                      type="text"
                      placeholder="반 (예: 1반)"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      required
                    />
                    {password !== confirmPassword && confirmPassword && (
                      <p className="text-sm text-red-500">비밀번호가 일치하지 않습니다.</p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)]"
                      disabled={isLoading || password !== confirmPassword}
                    >
                      {isLoading ? '가입 중...' : '회원가입'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
