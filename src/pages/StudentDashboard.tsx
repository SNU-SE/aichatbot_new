
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ActivitySelection from '@/components/student/ActivitySelection';
import ExperimentActivity from '@/components/student/ExperimentActivity';
import ArgumentationActivity from '@/components/student/ArgumentationActivity';
import DiscussionActivity from '@/components/student/DiscussionActivity';
import AuthGuard from '@/components/auth/AuthGuard';
import { Activity } from '@/types/activity';
import { useToast } from '@/hooks/use-toast';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const StudentDashboard = () => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateSession, saveDraft, loadDraft } = useSessionRecovery();
  const { user, signOut } = useAuth();

  useEffect(() => {
    // 실제 인증된 사용자의 학번 가져오기
    const fetchStudentId = async () => {
      if (user) {
        try {
          const { data: student, error } = await supabase
            .from('students')
            .select('student_id')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('학생 정보 조회 실패:', error);
            toast({
              title: "학생 정보 조회 실패",
              description: "학생 정보를 불러오는데 실패했습니다.",
              variant: "destructive"
            });
            return;
          }

          if (student) {
            setStudentId(student.student_id);
            updateSession(student.student_id);
          }
        } catch (error) {
          console.error('학생 정보 조회 오류:', error);
        }
      }
    };

    fetchStudentId();

    // 온라인/오프라인 상태 감지
    const handleOnline = () => {
      setIsOnline(true);
      if (studentId) {
        updateSession(studentId);
        toast({
          title: "연결 복구됨",
          description: "인터넷 연결이 복구되었습니다."
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "연결 끊김",
        description: "인터넷 연결이 끊어졌습니다. 작업 내용이 임시 저장됩니다.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, updateSession, toast, studentId]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivity(activity);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSelectedActivity(null);
    window.scrollTo(0, 0);
  };

  const renderActivityInterface = () => {
    if (!selectedActivity) return null;

    const commonProps = {
      activity: selectedActivity,
      studentId: studentId,
      onBack: handleBack
    };

    switch (selectedActivity.type) {
      case 'experiment':
        return <ExperimentActivity {...commonProps} />;
      case 'argumentation':
        return <ArgumentationActivity {...commonProps} saveDraft={saveDraft} loadDraft={loadDraft} />;
      case 'discussion':
        return <DiscussionActivity {...commonProps} />;
      default:
        return <div>지원하지 않는 활동 유형입니다.</div>;
    }
  };

  return (
    <AuthGuard requireRole="student">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-[rgb(15,15,112)] rounded-full flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI 학습 도우미</h1>
                  {studentId && (
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-600">
                        학번: {studentId}
                      </p>
                      <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
                        {isOnline ? (
                          <>
                            <Wifi className="h-3 w-3 mr-1" />
                            온라인
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3 mr-1" />
                            오프라인
                          </>
                        )}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedActivity ? (
            <ActivitySelection 
              onActivitySelect={handleActivitySelect}
            />
          ) : (
            renderActivityInterface()
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default StudentDashboard;
