
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, MessageSquare, Settings, BookOpen, BarChart3, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Import admin components
import StudentManagement from '@/components/admin/StudentManagement';
import AISettings from '@/components/admin/AISettings';
import ActivityManagement from '@/components/admin/ActivityManagement';
import RealTimeMonitoring from '@/components/admin/RealTimeMonitoring';
import ClassManagement from '@/components/admin/ClassManagement';
import StudentRecords from '@/components/admin/StudentRecords';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('monitoring');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('studentId');
    toast({
      title: "로그아웃 완료",
      description: "성공적으로 로그아웃되었습니다."
    });
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[rgb(15,15,112)] rounded-full flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
                <p className="text-sm text-gray-600">관리자</p>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="monitoring" className="flex items-center space-x-2">
              <Monitor className="h-4 w-4" />
              <span>실시간 모니터링</span>
            </TabsTrigger>
            <TabsTrigger value="class-management" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>수업 관리</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>학생 관리</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>수업 활동</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>학습 기록</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>AI 설정</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring">
            <RealTimeMonitoring />
          </TabsContent>

          <TabsContent value="class-management">
            <ClassManagement />
          </TabsContent>

          <TabsContent value="students">
            <StudentManagement />
          </TabsContent>

          <TabsContent value="activities">
            <ActivityManagement />
          </TabsContent>

          <TabsContent value="records">
            <StudentRecords />
          </TabsContent>

          <TabsContent value="settings">
            <AISettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
