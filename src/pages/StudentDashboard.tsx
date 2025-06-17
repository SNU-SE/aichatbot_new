
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageCircle, LogOut, Users, Clock } from 'lucide-react';
import ActivitySelection from '@/components/student/ActivitySelection';
import ChatInterface from '@/components/student/ChatInterface';
import { supabase } from '@/integrations/supabase/client';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('activities');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const storedStudentId = localStorage.getItem('studentId');
    
    if (userType !== 'student' || !storedStudentId) {
      navigate('/');
    } else {
      setStudentId(storedStudentId);
      updateStudentSession(storedStudentId);
    }
  }, [navigate]);

  const updateStudentSession = async (studentId: string) => {
    try {
      const { data: existingSession } = await supabase
        .from('student_sessions')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (existingSession) {
        await supabase
          .from('student_sessions')
          .update({
            is_online: true,
            last_active: new Date().toISOString()
          })
          .eq('student_id', studentId);
      } else {
        await supabase
          .from('student_sessions')
          .insert({
            student_id: studentId,
            is_online: true,
            last_active: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('세션 업데이트 오류:', error);
    }
  };

  const handleLogout = async () => {
    try {
      if (studentId) {
        await supabase
          .from('student_sessions')
          .update({ is_online: false })
          .eq('student_id', studentId);
      }
    } catch (error) {
      console.error('로그아웃 처리 오류:', error);
    }
    
    localStorage.removeItem('userType');
    localStorage.removeItem('studentId');
    navigate('/');
  };

  const handleActivitySelect = (activity: any) => {
    setSelectedActivity(activity);
    setActiveView('chat');
  };

  const handleBackToActivities = () => {
    setSelectedActivity(null);
    setActiveView('activities');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'chat':
        return (
          <ChatInterface 
            activity={selectedActivity}
            studentId={studentId}
            onBack={handleBackToActivities}
          />
        );
      case 'activities':
      default:
        return <ActivitySelection onActivitySelect={handleActivitySelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[rgb(15,15,112)] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">AI 학습 도우미 - 학생</h1>
              {activeView === 'chat' && selectedActivity && (
                <Button 
                  variant="ghost" 
                  onClick={handleBackToActivities}
                  className="text-white hover:bg-white/10"
                >
                  ← 활동 선택으로
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm opacity-90">학번: {studentId}</span>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default StudentDashboard;
