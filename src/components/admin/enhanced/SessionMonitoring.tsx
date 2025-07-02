
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Users, AlertTriangle, Activity, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionData {
  student_id: string;
  student_name: string | null;
  class_name: string;
  is_online: boolean;
  last_active: string;
  total_messages: number;
  last_message_time: string | null;
  draft_count: number;
}

const SessionMonitoring = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSessionData();
    loadClasses();
    
    // 자동 새로고침 (30초마다)
    const interval = setInterval(loadSessionData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('class_name')
        .order('class_name');

      if (error) throw error;

      const uniqueClasses = Array.from(new Set(data.map(s => s.class_name)));
      setClasses(uniqueClasses);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  const loadSessionData = async () => {
    try {
      setLoading(true);

      // 학생 세션 정보와 추가 데이터 조합
      const { data: sessionData, error: sessionError } = await supabase
        .from('student_sessions')
        .select(`
          student_id,
          is_online,
          last_active,
          students!inner(name, class_name)
        `);

      if (sessionError) throw sessionError;

      // 채팅 메시지 통계
      const { data: chatStats, error: chatError } = await supabase
        .from('chat_logs')
        .select('student_id')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (chatError) throw chatError;

      // 임시 저장 데이터 통계
      const { data: draftStats, error: draftError } = await supabase
        .from('student_work_drafts')
        .select('student_id');

      if (draftError) throw draftError;

      // 데이터 조합
      const combinedData: SessionData[] = sessionData.map(session => {
        const messageCount = chatStats.filter(msg => msg.student_id === session.student_id).length;
        const draftCount = draftStats.filter(draft => draft.student_id === session.student_id).length;
        
        return {
          student_id: session.student_id,
          student_name: session.students?.name || null,
          class_name: session.students?.class_name || '알 수 없음',
          is_online: session.is_online || false,
          last_active: session.last_active,
          total_messages: messageCount,
          last_message_time: null, // 별도 쿼리 필요시 추가
          draft_count: draftCount
        };
      });

      setSessions(combinedData);
    } catch (error) {
      console.error('Failed to load session data:', error);
      toast({
        title: "데이터 로드 실패",
        description: "세션 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupInactiveSessions = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_inactive_sessions');
      if (error) throw error;

      toast({
        title: "세션 정리 완료",
        description: "비활성 세션이 정리되었습니다."
      });
      
      loadSessionData();
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
      toast({
        title: "세션 정리 실패",
        description: "세션 정리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const filteredSessions = sessions.filter(session => 
    selectedClass === 'all' || session.class_name === selectedClass
  );

  const onlineSessions = filteredSessions.filter(s => s.is_online);
  const offlineSessions = filteredSessions.filter(s => !s.is_online);
  const problemSessions = filteredSessions.filter(s => 
    !s.is_online && new Date(s.last_active) > new Date(Date.now() - 10 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">학생 세션 모니터링</h2>
        <div className="flex space-x-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="클래스 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 클래스</SelectItem>
              {classes.map(className => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadSessionData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button onClick={cleanupInactiveSessions} variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            세션 정리
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{onlineSessions.length}</p>
                <p className="text-sm text-gray-600">온라인</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-2xl font-bold text-gray-600">{offlineSessions.length}</p>
                <p className="text-sm text-gray-600">오프라인</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{problemSessions.length}</p>
                <p className="text-sm text-gray-600">세션 문제</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredSessions.reduce((sum, s) => sum + s.total_messages, 0)}
                </p>
                <p className="text-sm text-gray-600">오늘 메시지</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 세션 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>학생 세션 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <div
                key={session.student_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Badge 
                    variant={session.is_online ? "default" : "secondary"}
                    className={session.is_online ? "bg-green-600" : ""}
                  >
                    {session.is_online ? "온라인" : "오프라인"}
                  </Badge>
                  <div>
                    <p className="font-medium">
                      {session.student_name || session.student_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      {session.class_name} • {session.student_id}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(session.last_active).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div>메시지: {session.total_messages}</div>
                  {session.draft_count > 0 && (
                    <Badge variant="outline">
                      임시저장 {session.draft_count}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 세션이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionMonitoring;
