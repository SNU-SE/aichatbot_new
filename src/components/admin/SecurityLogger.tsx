
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, Activity, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityLog {
  id: string;
  timestamp: string;
  event_type: 'login' | 'logout' | 'data_access' | 'data_export' | 'suspicious_activity';
  user_id: string;
  user_type: 'admin' | 'student';
  ip_address: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

interface SessionInfo {
  student_id: string;
  is_online: boolean;
  last_active: string;
  session_duration: number;
  ip_address?: string;
}

const SecurityLogger = () => {
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityLogs();
    fetchActiveSessions();
    
    // 실시간 세션 모니터링
    const interval = setInterval(fetchActiveSessions, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityLogs = async () => {
    try {
      // 실제 구현에서는 보안 로그 테이블에서 가져옴
      // 현재는 샘플 데이터로 시뮬레이션
      const sampleLogs: SecurityLog[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          event_type: 'login',
          user_id: 'admin',
          user_type: 'admin',
          ip_address: '192.168.1.100',
          details: '관리자 로그인',
          severity: 'low'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          event_type: 'data_export',
          user_id: 'admin',
          user_type: 'admin',
          ip_address: '192.168.1.100',
          details: '학생 데이터 CSV 내보내기',
          severity: 'medium'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          event_type: 'suspicious_activity',
          user_id: '202401001',
          user_type: 'student',
          ip_address: '192.168.1.150',
          details: '비정상적인 API 호출 패턴 감지',
          severity: 'high'
        }
      ];
      
      setSecurityLogs(sampleLogs);
    } catch (error: any) {
      console.error('보안 로그 조회 오류:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const { data: sessions } = await supabase
        .from('student_sessions')
        .select(`
          student_id,
          is_online,
          last_active,
          created_at
        `)
        .eq('is_online', true);

      const sessionInfo: SessionInfo[] = (sessions || []).map(session => ({
        student_id: session.student_id,
        is_online: session.is_online,
        last_active: session.last_active,
        session_duration: Math.floor(
          (new Date().getTime() - new Date(session.created_at).getTime()) / 1000 / 60
        ),
        ip_address: '192.168.1.xxx' // 실제로는 세션에서 IP 추적
      }));

      setActiveSessions(sessionInfo);
    } catch (error: any) {
      console.error('세션 정보 조회 오류:', error);
    }
  };

  const terminateSession = async (studentId: string) => {
    try {
      await supabase
        .from('student_sessions')
        .update({ is_online: false })
        .eq('student_id', studentId);

      // 보안 로그 추가
      logSecurityEvent('session_terminated', studentId, 'student', `세션 강제 종료: ${studentId}`);
      
      await fetchActiveSessions();
      
      toast({
        title: "세션 종료",
        description: `학생 ${studentId}의 세션이 종료되었습니다.`
      });
    } catch (error: any) {
      console.error('세션 종료 오류:', error);
      toast({
        title: "세션 종료 실패",
        description: "세션 종료에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const logSecurityEvent = async (
    eventType: SecurityLog['event_type'],
    userId: string,
    userType: 'admin' | 'student',
    details: string,
    severity: SecurityLog['severity'] = 'medium'
  ) => {
    const newLog: SecurityLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: userId,
      user_type: userType,
      ip_address: '192.168.1.100', // 실제로는 실제 IP 주소
      details,
      severity
    };

    setSecurityLogs(prev => [newLog, ...prev]);
  };

  const filteredLogs = securityLogs.filter(log => {
    const matchesType = filterType === 'all' || log.event_type === filterType;
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    const matchesSearch = searchTerm === '' || 
      log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSeverity && matchesSearch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'login': return '🟢';
      case 'logout': return '🔴';
      case 'data_access': return '📁';
      case 'data_export': return '📤';
      case 'suspicious_activity': return '⚠️';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      {/* 활성 세션 모니터링 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>활성 세션 ({activeSessions.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeSessions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">활성 세션이 없습니다.</p>
            ) : (
              activeSessions.map((session) => (
                <div
                  key={session.student_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">학번: {session.student_id}</p>
                      <p className="text-sm text-gray-500">
                        세션 시간: {session.session_duration}분 | 
                        마지막 활동: {new Date(session.last_active).toLocaleTimeString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => terminateSession(session.student_id)}
                  >
                    세션 종료
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 보안 로그 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>보안 로그</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 필터 및 검색 */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="사용자 ID 또는 상세 내용 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 이벤트</SelectItem>
                <SelectItem value="login">로그인</SelectItem>
                <SelectItem value="logout">로그아웃</SelectItem>
                <SelectItem value="data_access">데이터 접근</SelectItem>
                <SelectItem value="data_export">데이터 내보내기</SelectItem>
                <SelectItem value="suspicious_activity">의심스러운 활동</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 수준</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="high">높음</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 로그 목록 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50"
              >
                <span className="text-lg">{getEventTypeIcon(log.event_type)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{log.user_id}</p>
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{log.details}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString('ko-KR')} | IP: {log.ip_address}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityLogger;
