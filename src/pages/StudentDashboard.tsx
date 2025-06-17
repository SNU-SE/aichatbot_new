
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, BookOpen, FlaskConical, Users, LogOut } from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const storedStudentId = localStorage.getItem('studentId');
    
    if (userType !== 'student' || !storedStudentId) {
      navigate('/');
    } else {
      setStudentId(storedStudentId);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('studentId');
    navigate('/');
  };

  // 임시 활동 데이터 (추후 실제 데이터로 대체)
  const activities = [
    { id: 1, type: '실험', title: '물의 상태 변화 관찰', icon: FlaskConical },
    { id: 2, type: '논증', title: '환경 보호의 중요성', icon: BookOpen },
    { id: 3, type: '토의', title: '미래의 교통수단', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[rgb(15,15,112)] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold">AI 학습 도우미</h1>
              <p className="text-blue-200 text-sm">학번: {studentId}</p>
            </div>
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
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">학습 활동</h2>
          <p className="text-gray-600">참여 가능한 학습 활동을 선택하세요</p>
        </div>

        <div className="space-y-4 mb-8">
          {activities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <Card 
                key={activity.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer border-0 shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[rgb(15,15,112)] rounded-lg">
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        [{activity.type}] {activity.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 고정 하단 메뉴 - 챗봇과 대화하기 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button 
            className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(12,12,90)] text-white font-medium py-3"
            onClick={() => {/* 추후 챗봇 페이지로 이동 */}}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            챗봇과 대화하기
          </Button>
        </div>
      </div>

      {/* 하단 메뉴를 위한 여백 */}
      <div className="h-20"></div>
    </div>
  );
};

export default StudentDashboard;
