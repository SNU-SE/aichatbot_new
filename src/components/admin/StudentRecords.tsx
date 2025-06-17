
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatLog {
  id: string;
  student_id: string;
  activity_id: string | null;
  message: string;
  sender: string;
  timestamp: string;
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

const StudentRecords = () => {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 채팅 로그 가져오기
      const { data: logsData, error: logsError } = await supabase
        .from('chat_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (logsError) throw logsError;

      // 학생 정보 가져오기
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('student_id, class_name, name');

      if (studentsError) throw studentsError;

      // 활동 정보 가져오기
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title, type');

      if (activitiesError) throw activitiesError;

      setChatLogs(logsData || []);
      setStudents(studentsData || []);
      setActivities(activitiesData || []);
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
    return student ? `${student.name || '이름없음'} (${student.student_id})` : studentId;
  };

  const getActivityInfo = (activityId: string | null) => {
    if (!activityId) return '-';
    const activity = activities.find(a => a.id === activityId);
    return activity ? activity.title : '알 수 없는 활동';
  };

  const filteredLogs = chatLogs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStudent = selectedStudent === 'all' || log.student_id === selectedStudent;
    const matchesActivity = selectedActivity === 'all' || log.activity_id === selectedActivity;
    
    return matchesSearch && matchesStudent && matchesActivity;
  });

  // 학생별 통계
  const getStudentStats = () => {
    const stats = students.map(student => {
      const studentLogs = chatLogs.filter(log => log.student_id === student.student_id);
      const totalMessages = studentLogs.length;
      const studentMessages = studentLogs.filter(log => log.sender === 'student').length;
      const botMessages = studentLogs.filter(log => log.sender === 'bot').length;
      const lastActivity = studentLogs.length > 0 ? 
        new Date(studentLogs[0].timestamp).toLocaleDateString('ko-KR') : '-';

      return {
        ...student,
        totalMessages,
        studentMessages,
        botMessages,
        lastActivity
      };
    });

    return stats.sort((a, b) => b.totalMessages - a.totalMessages);
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">학생기록 관리</h2>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="메시지 내용이나 학번으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="학생 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 학생</SelectItem>
                {students.map(student => (
                  <SelectItem key={student.student_id} value={student.student_id}>
                    {getStudentInfo(student.student_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger>
                <SelectValue placeholder="활동 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 활동</SelectItem>
                {activities.map(activity => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 학생별 활동 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>학생별 활동 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생</TableHead>
                <TableHead>반</TableHead>
                <TableHead>총 메시지</TableHead>
                <TableHead>학생 메시지</TableHead>
                <TableHead>AI 응답</TableHead>
                <TableHead>마지막 활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getStudentStats().map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell className="font-medium">
                    {student.name || '이름없음'} ({student.student_id})
                  </TableCell>
                  <TableCell>{student.class_name}</TableCell>
                  <TableCell>{student.totalMessages}</TableCell>
                  <TableCell>{student.studentMessages}</TableCell>
                  <TableCell>{student.botMessages}</TableCell>
                  <TableCell>{student.lastActivity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 채팅 로그 */}
      <Card>
        <CardHeader>
          <CardTitle>채팅 로그 ({filteredLogs.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>학생</TableHead>
                <TableHead>발신자</TableHead>
                <TableHead>활동</TableHead>
                <TableHead>메시지</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString('ko-KR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{getStudentInfo(log.student_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.sender === 'student' ? 'default' : 'secondary'}>
                      {log.sender === 'student' ? '학생' : 'AI'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {getActivityInfo(log.activity_id)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={log.message}>
                      {log.message}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm || selectedStudent !== 'all' || selectedActivity !== 'all' ? 
                      '필터 조건에 맞는 기록이 없습니다.' : '채팅 기록이 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentRecords;
