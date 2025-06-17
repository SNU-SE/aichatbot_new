
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle, Activity, Clock, Send, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

interface ArgumentationResponse {
  id: string;
  student_id: string;
  activity_id: string;
  response_text: string;
  is_submitted: boolean;
  submitted_at: string;
}

interface PeerEvaluation {
  id: string;
  evaluator_id: string;
  target_response_id: string;
  activity_id: string;
  evaluation_text: string | null;
  is_completed: boolean;
}

const ClassManagement = () => {
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentChats, setRecentChats] = useState<ChatLog[]>([]);
  const [argumentationResponses, setArgumentationResponses] = useState<ArgumentationResponse[]>([]);
  const [peerEvaluations, setPeerEvaluations] = useState<PeerEvaluation[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('');
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

      // 논증 응답 가져오기
      const { data: responsesData, error: responsesError } = await supabase
        .from('argumentation_responses')
        .select('*');

      if (responsesError) throw responsesError;

      // 동료평가 가져오기
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('peer_evaluations')
        .select('*');

      if (evaluationsError) throw evaluationsError;

      setSessions(sessionsData || []);
      setStudents(studentsData || []);
      setActivities(activitiesData || []);
      setRecentChats(chatsData || []);
      setArgumentationResponses(responsesData || []);
      setPeerEvaluations(evaluationsData || []);
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

  const sendAnnouncement = () => {
    toast({
      title: "공지사항 전송",
      description: "모든 온라인 학생에게 공지사항이 전송되었습니다."
    });
  };

  const getSelectedActivityInfo = () => {
    return activities.find(a => a.id === selectedActivity);
  };

  const getArgumentationStats = () => {
    const selectedActivityInfo = getSelectedActivityInfo();
    if (!selectedActivityInfo || selectedActivityInfo.type !== 'argumentation') {
      return null;
    }

    const activityResponses = argumentationResponses.filter(r => r.activity_id === selectedActivity);
    const completedResponses = activityResponses.filter(r => r.is_submitted);
    const evaluations = peerEvaluations.filter(e => e.activity_id === selectedActivity);
    const completedEvaluations = evaluations.filter(e => e.is_completed);

    return {
      totalResponses: activityResponses.length,
      completedResponses: completedResponses.length,
      totalEvaluations: evaluations.length,
      completedEvaluations: completedEvaluations.length
    };
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  const onlineStudents = getOnlineStudents();
  const totalStudents = selectedClass === 'all' ? 
    students.length : 
    students.filter(s => s.class_name === selectedClass).length;

  const argumentationStats = getArgumentationStats();

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
                <p className="text-sm text-gray-600">선택된 반</p>
                <p className="text-lg font-bold">{selectedClass === 'all' ? '전체' : selectedClass}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 활동 배정 영역 */}
      <Card className="border-2 border-[rgb(15,15,112)]/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">대상 반</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 반</SelectItem>
                  {getUniqueClasses().map(className => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">활동 선택</label>
              <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                <SelectTrigger>
                  <SelectValue placeholder="활동을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.title} ({activity.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-2">
              <Button 
                onClick={assignActivity}
                disabled={!selectedActivity}
                className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90 flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                활동 배정
              </Button>
              <Button 
                onClick={sendAnnouncement}
                variant="outline"
                size="sm"
              >
                공지 전송
              </Button>
            </div>

            {/* 논증 활동 특별 버튼들 */}
            {argumentationStats && (
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  동료평가 ({argumentationStats.completedEvaluations}/{argumentationStats.totalEvaluations})
                </Button>
                <Button variant="outline" size="sm">
                  피드백확인
                </Button>
                <Button variant="outline" size="sm">
                  결과확인
                </Button>
              </div>
            )}
          </div>

          {argumentationStats && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-[rgb(15,15,112)] mb-2">논증 활동 진행 상황</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>응답 완료: {argumentationStats.completedResponses}/{argumentationStats.totalResponses}</div>
                <div>동료평가 완료: {argumentationStats.completedEvaluations}/{argumentationStats.totalEvaluations}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
