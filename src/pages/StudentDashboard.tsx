
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ActivitySelection from '@/components/student/ActivitySelection';
import ChatInterface from '@/components/student/ChatInterface';
import { Activity } from '@/types/activity';

const StudentDashboard = () => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const { signOut, user } = useAuth();

  useEffect(() => {
    const fetchStudentData = async () => {
      if (user) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setStudentData(data);
      }
    };

    fetchStudentData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  return (
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
                {studentData && (
                  <p className="text-sm text-gray-600">
                    {studentData.name} ({studentData.student_id}) - {studentData.class_name}
                  </p>
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
            onSelectActivity={setSelectedActivity}
          />
        ) : (
          <ChatInterface
            activity={selectedActivity}
            studentId={studentData?.student_id}
            onBack={() => setSelectedActivity(null)}
          />
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
