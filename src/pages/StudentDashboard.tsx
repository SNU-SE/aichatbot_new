
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ActivitySelection from '@/components/student/ActivitySelection';
import ExperimentActivity from '@/components/student/ExperimentActivity';
import ArgumentationActivity from '@/components/student/ArgumentationActivity';
import DiscussionActivity from '@/components/student/DiscussionActivity';
import { Activity } from '@/types/activity';
import { useToast } from '@/hooks/use-toast';

const StudentDashboard = () => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedStudentId = localStorage.getItem('studentId');
    if (storedStudentId) {
      setStudentId(storedStudentId);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('studentId');
    toast({
      title: "로그아웃 완료",
      description: "성공적으로 로그아웃되었습니다."
    });
    navigate('/auth');
  };

  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  const renderActivityInterface = () => {
    if (!selectedActivity) return null;

    const commonProps = {
      activity: selectedActivity,
      studentId: studentId,
      onBack: () => setSelectedActivity(null)
    };

    switch (selectedActivity.type) {
      case 'experiment':
        return <ExperimentActivity {...commonProps} />;
      case 'argumentation':
        return <ArgumentationActivity {...commonProps} />;
      case 'discussion':
        return <DiscussionActivity {...commonProps} />;
      default:
        return <div>지원하지 않는 활동 유형입니다.</div>;
    }
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
                {studentId && (
                  <p className="text-sm text-gray-600">
                    학번: {studentId}
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
            onActivitySelect={handleActivitySelect}
          />
        ) : (
          renderActivityInterface()
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
