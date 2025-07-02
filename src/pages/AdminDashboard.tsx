
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Settings, Users, Activity, MessageCircle, BarChart3, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentManagement from '@/components/admin/StudentManagement';
import ActivityManagement from '@/components/admin/ActivityManagement';
import AISettings from '@/components/admin/AISettings';
import RealTimeMonitoring from '@/components/admin/RealTimeMonitoring';
import StudentRecords from '@/components/admin/StudentRecords';
import SessionMonitoring from '@/components/admin/enhanced/SessionMonitoring';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
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
                <h1 className="text-2xl font-bold text-gray-900">AI 학습 도우미 관리자</h1>
                <p className="text-sm text-gray-600">시스템 관리 및 모니터링</p>
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
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>학생관리</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>활동관리</span>
            </TabsTrigger>
            <TabsTrigger value="ai-settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>AI설정</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>실시간모니터</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center space-x-2">
              <Monitor className="h-4 w-4" />
              <span>세션모니터</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>학습기록</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentManagement />
          </TabsContent>

          <TabsContent value="activities">
            <ActivityManagement />
          </TabsContent>

          <TabsContent value="ai-settings">
            <AISettings />
          </TabsContent>

          <TabsContent value="monitoring">
            <RealTimeMonitoring />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionMonitoring />
          </TabsContent>

          <TabsContent value="records">
            <StudentRecords />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
