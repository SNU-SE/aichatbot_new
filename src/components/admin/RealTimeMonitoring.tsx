import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, MessageCircle, Activity, Clock, Eye, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentActivity {
  student_id: string;
  name: string | null;
  class_name: string;
  is_online: boolean | null;
  last_active: string | null;
  total_messages: number | null;
  last_message_time: string | null;
  activities_participated: number | null;
}

interface RecentChatActivity {
  id: string;
  student_id: string;
  message: string;
  sender: string;
  timestamp: string;
  activity_id: string | null;
}

const RealTimeMonitoring = () => {
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChatActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let channels: any[] = [];

    const fetchInitialData = async () => {
      if (!mounted) return;
      
      try {
        setLoading(true);
        setError(null);

        // 학생 활동 데이터 가져오기
        const { data: activityData, error: activityError } = await supabase
          .from('student_activity_view')
          .select('*');

        if (activityError) {
          console.error('Activity data error:', activityError);
          throw new Error('학생 활동 데이터를 불러올 수 없습니다.');
        }

        // 최근 채팅 데이터 가져오기 (최근 1시간)
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const { data: chatData, error: chatError } = await supabase
          .from('chat_logs')
          .select('*')
          .gte('timestamp', oneHourAgo.toISOString())
          .order('timestamp', { ascending: false })
          .limit(15);

        if (chatError) {
          console.error('Chat data error:', chatError);
          throw new Error('채팅 데이터를 불러올 수 없습니다.');
        }

        if (mounted) {
          setStudentActivities(activityData || []);
          setRecentChats(chatData || []);
        }
      } catch (error: any) {
        console.error('Data fetch error:', error);
        if (mounted) {
          setError(error.message);
          toast({
            title: "오류",
            description: error.message,
            variant: "destructive"
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const setupRealtimeListeners = () => {
      try {
        // 학생 세션 실시간 업데이트
        const sessionChannel = supabase
          .channel('student-sessions-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'student_sessions'
            },
            () => {
              if (mounted) {
                fetchInitialData();
              }
            }
          )
          .subscribe();

        // 채팅 로그 실시간 업데이트
        const chatChannel = supabase
          .channel('chat-logs-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_logs'
            },
            (payload) => {
              if (mounted) {
                const newChat = payload.new as RecentChatActivity;
                setRecentChats(prev => [newChat, ...prev.slice(0, 14)]);
                
                toast({
                  title: "새 메시지",
                  description: `${newChat.student_id}님이 메시지를 보냈습니다.`,
                });
              }
            }
          )
          .subscribe();

        channels = [sessionChannel, chatChannel];
      } catch (error) {
        console.error('Realtime setup error:', error);
      }
    };

    fetchInitialData();
    setupRealtimeListeners();

    return () => {
      mounted = false;
      channels.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      });
    };
  }, [toast]);

  const getOnlineStudents = () => {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    return studentActivities.filter(student => {
      if (!student.last_active) return false;
      const lastActive = new Date(student.last_active);
      return student.is_online && lastActive > fiveMinutesAgo;
    });
  };

  const getActiveStudents = () => {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    return studentActivities.filter(student => {
      if (!student.last_message_time) return false;
      const lastMessage = new Date(student.last_message_time);
      return lastMessage > thirtyMinutesAgo;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-lg text-gray-600">실시간 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-lg text-red-600 mb-4">오류가 발생했습니다</div>
        <div className="text-sm text-gray-600 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>
          페이지 새로고침
        </Button>
      </div>
    );
  }

  const onlineStudents = getOnlineStudents();
  const activeStudents = getActiveStudents();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">실시간 모니터링</h2>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Wifi className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">온라인 학생</p>
                <p className="text-2xl font-bold text-green-600">{onlineStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">활발한 대화</p>
                <p className="text-2xl font-bold text-blue-600">{activeStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[rgb(15,15,112)]" />
              <div>
                <p className="text-sm text-gray-600">최근 메시지</p>
                <p className="text-2xl font-bold">{recentChats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">총 학생 수</p>
                <p className="text-2xl font-bold">{studentActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 학생 활동 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>학생 활동 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생</TableHead>
                <TableHead>반</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>마지막 접속</TableHead>
                <TableHead>총 메시지</TableHead>
                <TableHead>참여 활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentActivities.map((student) => {
                const isOnline = onlineStudents.some(s => s.student_id === student.student_id);
                const isActive = activeStudents.some(s => s.student_id === student.student_id);
                
                return (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">
                      {student.name || '이름없음'} ({student.student_id})
                    </TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {isOnline ? (
                          <Badge variant="default" className="bg-green-600">
                            <Wifi className="h-3 w-3 mr-1" />
                            온라인
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <WifiOff className="h-3 w-3 mr-1" />
                            오프라인
                          </Badge>
                        )}
                        {isActive && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            활발함
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.last_active ? 
                        new Date(student.last_active).toLocaleString('ko-KR') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>{student.total_messages || 0}</TableCell>
                    <TableCell>{student.activities_participated || 0}</TableCell>
                  </TableRow>
                );
              })}
              {studentActivities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    등록된 학생이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 실시간 채팅 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>실시간 채팅 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentChats.map((chat) => (
              <div key={chat.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-full ${
                  chat.sender === 'student' 
                    ? 'bg-[rgb(15,15,112)] text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {chat.sender === 'student' ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{chat.student_id}</span>
                    <Badge variant={chat.sender === 'student' ? 'default' : 'secondary'} className="text-xs">
                      {chat.sender === 'student' ? '학생' : 'AI'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(chat.timestamp).toLocaleTimeString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{chat.message}</p>
                </div>
              </div>
            ))}
            {recentChats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                최근 채팅 활동이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeMonitoring;
