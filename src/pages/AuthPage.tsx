
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      // 학생 로그인 - 실제 Supabase 인증 사용
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

        console.log('🔐 Student authentication for:', normalizedId);

        // 기존 세션 정리
        localStorage.removeItem('userType');
        localStorage.removeItem('studentId');
        
        // 기존 Supabase 세션 정리
        await supabase.auth.signOut();

        // 학생 정보 조회
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('student_id, class_name, name, mother_tongue, user_id')
          .eq('student_id', normalizedId)
          .single();

        if (studentError || !student) {
          console.error('❌ Student lookup failed:', studentError, 'for ID:', normalizedId);
          toast({
            title: "로그인 실패",
            description: "등록되지 않은 학번입니다.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        console.log('✅ Student found:', student.student_id, 'user_id:', student.user_id);

        // 학생에게 연결된 Supabase 사용자 계정이 있는지 확인
        let authUser = null;
        
        if (student.user_id) {
          // 기존 사용자 계정이 있다면 해당 계정으로 로그인
          try {
            // 임시 비밀번호로 로그인 시도
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: `${normalizedId}@student.temp`,
              password: `student_${normalizedId}`
            });
            
            if (!signInError && signInData.user) {
              authUser = signInData.user;
            }
          } catch (signInErr) {
            console.log('기존 계정 로그인 실패, 새 계정 생성 필요');
          }
        }
        
        if (!authUser) {
          console.log('🆕 Creating new Supabase user account for:', normalizedId);
          const tempEmail = `${normalizedId}@student.temp`;
          const tempPassword = `student_${normalizedId}`;
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: tempEmail,
            password: tempPassword,
            options: {
              emailRedirectTo: `${window.location.origin}/student`,
              data: {
                student_id: normalizedId,
                is_student: true
              }
            }
          });

          console.log('🔍 SignUp response:', signUpData, 'Error:', signUpError);

          if (signUpError) {
            console.error('❌ User creation failed:', signUpError);
            toast({
              title: "로그인 실패",
              description: `사용자 계정 생성에 실패했습니다: ${signUpError.message}`,
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          authUser = signUpData.user;
          console.log('✅ New user created:', authUser?.id);
          
          // students 테이블의 user_id 업데이트
          if (authUser) {
            console.log('📝 Updating student record with user_id:', authUser.id);
            const { error: updateError } = await supabase
              .from('students')
              .update({ user_id: authUser.id })
              .eq('student_id', normalizedId);
              
            if (updateError) {
              console.error('❌ Student update failed:', updateError);
            } else {
              console.log('✅ Student record updated');
            }
              
            // user_roles에 student 역할 추가
            console.log('👤 Adding student role for user:', authUser.id);
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: authUser.id,
                role: 'student'
              });
              
            if (roleError) {
              console.error('❌ Role creation failed:', roleError);
            } else {
              console.log('✅ Student role added');
            }
          }
        }

        if (authUser) {
          console.log('🎉 Student authentication successful:', normalizedId, 'user:', authUser.id);
          
          // 세션 활성화
          try {
            await supabase.rpc('update_student_session', {
              student_id_param: normalizedId
            });
          } catch (sessionError) {
            console.error('Session activation failed:', sessionError);
          }
          
          toast({
            title: "로그인 성공",
            description: `학번 ${normalizedId}로 로그인되었습니다.`
          });
          navigate('/student');
        } else {
          throw new Error('사용자 인증 실패');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Login error:', error);
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
