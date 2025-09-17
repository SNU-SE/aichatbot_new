
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, Settings, Users, Activity, MessageCircle, BarChart3, GraduationCap, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentManagement from '@/components/admin/StudentManagement';
import ActivityManagement from '@/components/admin/ActivityManagement';
import AISettings from '@/components/admin/AISettings';
import RealTimeMonitoring from '@/components/admin/RealTimeMonitoring';
import StudentRecords from '@/components/admin/StudentRecords';
import ClassManagement from '@/components/admin/ClassManagement';
import { PWAInstallBanner } from '@/components/enhanced-rag/PWAInstallBanner';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('studentId');
    toast({
      title: "로그아웃 완료",
      description: "성공적으로 로그아웃되었습니다."
    });
    navigate('/auth');
  };

  const tabItems = [
    { value: 'students', label: '학생관리', icon: Users },
    { value: 'activities', label: '활동관리', icon: Activity },
    { value: 'ai-settings', label: 'AI설정', icon: Settings },
    { value: 'monitoring', label: '실시간모니터', icon: MessageCircle },
    { value: 'class-management', label: '수업관리', icon: GraduationCap },
    { value: 'records', label: '학습기록', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* PWA Install Banner */}
      <PWAInstallBanner variant="banner" />

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[rgb(15,15,112)] rounded-full flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  AI 학습 도우미 관리자
                </h1>
                {!isMobile && (
                  <p className="text-sm text-gray-600">시스템 관리 및 모니터링</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isMobile && (
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <div className="space-y-4 pt-6">
                      <h3 className="text-lg font-semibold">메뉴</h3>
                      <div className="space-y-2">
                        {tabItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Button
                              key={item.value}
                              variant={activeTab === item.value ? "default" : "ghost"}
                              className="w-full justify-start"
                              onClick={() => {
                                setActiveTab(item.value);
                                setIsMobileMenuOpen(false);
                              }}
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {item.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              
              <Button 
                onClick={handleLogout}
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                {!isMobile && <span>로그아웃</span>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-6">
              {tabItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger key={item.value} value={item.value} className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          )}

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

          <TabsContent value="class-management">
            <ClassManagement />
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
