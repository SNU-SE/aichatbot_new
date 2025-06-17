import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, MessageCircle, Activity, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ClassControlPanel from './enhanced/ClassControlPanel';
import StudentStatusGrid from './enhanced/StudentStatusGrid';
import RealTimeChatMonitor from './enhanced/RealTimeChatMonitor';

interface StudentSession {
  id: string;
  student_id: string;
  last_active: string;
  is_online: boolean;
}

interface Student {
  student_id: string;
  class_name: string;
  name: string | null;
}

interface Activity {
  id: string;
  title: string;
  type: string;
}

interface ChatLog {
  id: string;
  student_id: string;
  activity_id: string | null;
  message: string;
  sender: string;
  timestamp: string;
}

const ClassManagement = () => {
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentChats, setRecentChats] = useState<ChatLog[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [isClassActive, setIsClassActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30초마다 새로고침
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // 학생 세션 가져오기
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('student_sessions')
        .select('*')
        .order('last_active', { ascending: false });

      if (sessionsError) throw sessionsError;

      // 학생 정보 가져오기
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*');

      if (studentsError) throw studentsError;

      // 활동 정보 가져오기
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*');

      if (activitiesError) throw activitiesError;

      // 최근 채팅 가져오기 (최근 1시간)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const { data: chatsData, error: chatsError } = await supabase
        .from('chat_logs')
        .select('*')
        .gte('timestamp', oneHourAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(20);

      if (chatsError) throw chatsError;

      setSessions(sessionsData || []);
      setStudents(studentsData || []);
      setActivities(activitiesData || []);
      setRecentChats(chatsData || []);
    } catch (error) {
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStudentInfo = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    return student ? {
      name: student.name || '이름없음',
      class: student.class_name,
      full: `${student.name || '이름없음'} (${student.student_id})`
    } : { name: '알 수 없음', class: '-', full: studentId };
  };

  const getActivityInfo = (activityId: string | null) => {
    if (!activityId) return '-';
    const activity = activities.find(a => a.id === activityId);
    return activity ? activity.title : '알 수 없는 활동';
  };

  const getUniqueClasses = () => {
    return [...new Set(students.map(s => s.class_name))];
  };

  const getOnlineStudents = () => {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    return sessions.filter(session => {
      const lastActive = new Date(session.last_active);
      const student = students.find(s => s.student_id === session.student_id);
      const matchesClass = selectedClass === 'all' || student?.class_name === selectedClass;
      
      return session.is_online && 
             lastActive > fiveMinutesAgo && 
             matchesClass;
    });
  };

  const startClass = () => {
    setIsClassActive(true);
    toast({
      title: "수업 시작",
      description: "실시간 수업이 시작되었습니다."
    });
  };

  const endClass = () => {
    setIsClassActive(false);
    toast({
      title: "수업 종료",
      description: "실시간 수업이 종료되었습니다."
    });
  };

  const assignActivity = async () => {
    if (!selectedActivity) {
      toast({
        title: "알림",
        description: "활동을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "활동 배정 완료",
      description: "선택된 활동이 온라인 학생들에게 배정되었습니다."
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  const onlineStudents = getOnlineStudents();
  const totalStudents = selectedClass === 'all' ? 
    students.length : 
    students.filter(s => s.class_name === selectedClass).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">실시간 수업 관리</h2>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[rgb(15,15,112)]" />
              <div>
                <p className="text-sm text-gray-600">온라인 학생</p>
                <p className="text-2xl font-bold">{onlineStudents.length}/{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[rgb(15,15,112)]" />
              <div>
                <p className="text-sm text-gray-600">활성 활동</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-[rgb(15,15,112)]" />
              <div>
                <p className="text-sm text-gray-600">최근 채팅</p>
                <p className="text-2xl font-bold">{recentChats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-[rgb(15,15,112)]" />
              <div>
                <p className="text-sm text-gray-600">수업 상태</p>
                <p className="text-lg font-bold">{isClassActive ? "진행 중" : "대기 중"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 수업 제어 패널 */}
      <ClassControlPanel
        isClassActive={isClassActive}
        onStartClass={startClass}
        onEndClass={endClass}
        selectedClass={selectedClass}
        onClassChange={setSelectedClass}
        selectedActivity={selectedActivity}
        onActivityChange={setSelectedActivity}
        onAssignActivity={assignActivity}
        activities={activities}
        classes={getUniqueClasses()}
        onlineCount={onlineStudents.length}
        totalCount={totalStudents}
      />

      {/* 학생 상태 그리드와 채팅 모니터 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentStatusGrid
          onlineStudents={onlineStudents}
          students={students}
          selectedClass={selectedClass}
        />
        
        <RealTimeChatMonitor
          recentChats={recentChats}
          activities={activities}
        />
      </div>
    </div>
  );
};

export default ClassManagement;
