
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, BarChart3, Settings, Play, LogOut, Monitor, TrendingUp, MessageSquare } from 'lucide-react';
import StudentManagement from '@/components/admin/StudentManagement';
import ActivityManagement from '@/components/admin/ActivityManagement';
import StudentRecords from '@/components/admin/StudentRecords';
import AISettings from '@/components/admin/AISettings';
import ClassManagement from '@/components/admin/ClassManagement';
import RealTimeMonitoring from '@/components/admin/RealTimeMonitoring';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import PromptManagement from '@/components/admin/PromptManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('dashboard');

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    if (userType !== 'admin') {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userType');
    navigate('/');
  };

  const menuItems = [
    { id: 'students', label: '학생정보', icon: Users, description: '학생 계정 생성 및 관리' },
    { id: 'activities', label: '학습활동', icon: BookOpen, description: '학습 활동 생성 및 관리' },
    { id: 'records', label: '학생기록', icon: BarChart3, description: '학생 활동 기록 열람' },
    { id: 'monitoring', label: '실시간모니터링', icon: Monitor, description: '실시간 학생 활동 모니터링' },
    { id: 'analytics', label: '학습분석', icon: TrendingUp, description: '학습 데이터 분석 및 통계' },
    { id: 'prompts', label: '프롬프트관리', icon: MessageSquare, description: 'AI 프롬프트 템플릿 관리' },
    { id: 'settings', label: 'AI설정', icon: Settings, description: 'AI 모델 및 프롬프트 설정' },
    { id: 'class', label: '수업하기', icon: Play, description: '실시간 수업 관리' },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'students':
        return <StudentManagement />;
      case 'activities':
        return <ActivityManagement />;
      case 'records':
        return <StudentRecords />;
      case 'monitoring':
        return <RealTimeMonitoring />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'prompts':
        return <PromptManagement />;
      case 'settings':
        return <AISettings />;
      case 'class':
        return <ClassManagement />;
      case 'dashboard':
      default:
        return (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h2>
              <p className="text-gray-600">AI 기반 학습 활동을 관리하고 모니터링하세요</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Card 
                    key={item.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer border-0 shadow-md"
                    onClick={() => setActiveMenu(item.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-[rgb(15,15,112)] rounded-lg">
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {item.label}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[rgb(15,15,112)] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">AI 학습 도우미 - 관리자</h1>
              {activeMenu !== 'dashboard' && (
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveMenu('dashboard')}
                  className="text-white hover:bg-white/10"
                >
                  ← 대시보드로
                </Button>
              )}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
