
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, Clock, User, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateCSV, downloadCSV } from '@/utils/csvUtils';

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

interface ChecklistProgress {
  id: string;
  student_id: string;
  checklist_item_id: string;
  is_completed: boolean;
  completed_at: string | null;
  description: string;
  activity_title: string;
  activity_id: string;
}

interface UnifiedLogEntry {
  id: string;
  timestamp: string;
  student_id: string;
  type: 'chat' | 'checklist';
  content: string;
  activity_id?: string | null;
  activity_title?: string;
  sender?: string;
}

const StudentRecords = () => {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress[]>([]);
  const [unifiedLogs, setUnifiedLogs] = useState<UnifiedLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'student-detail'>('overview');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    createUnifiedLogs();
  }, [chatLogs, checklistProgress]);

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

      // 체크리스트 진행도 가져오기
      const { data: progressData, error: progressError } = await supabase
        .from('student_checklist_progress')
        .select(`
          *,
          checklist_items!inner(
            description,
            activity_id,
            activities!inner(title)
          )
        `);

      if (progressError) throw progressError;

      const formattedProgress = progressData?.map(p => ({
        id: p.id,
        student_id: p.student_id,
        checklist_item_id: p.checklist_item_id,
        is_completed: p.is_completed,
        completed_at: p.completed_at,
        description: (p.checklist_items as any).description,
        activity_title: (p.checklist_items as any).activities.title,
        activity_id: (p.checklist_items as any).activity_id
      })) || [];

      setChatLogs(logsData || []);
      setStudents(studentsData || []);
      setActivities(activitiesData || []);
      setChecklistProgress(formattedProgress);
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

  const createUnifiedLogs = () => {
    const unified: UnifiedLogEntry[] = [];

    // 채팅 로그 추가
    chatLogs.forEach(log => {
      unified.push({
        id: `chat_${log.id}`,
        timestamp: log.timestamp,
        student_id: log.student_id,
        type: 'chat',
        content: log.message,
        activity_id: log.activity_id,
        activity_title: getActivityInfo(log.activity_id),
        sender: log.sender
      });
    });

    // 체크리스트 진행 기록 추가 (완료된 것만)
    checklistProgress
      .filter(progress => progress.is_completed && progress.completed_at)
      .forEach(progress => {
        unified.push({
          id: `checklist_${progress.id}`,
          timestamp: progress.completed_at!,
          student_id: progress.student_id,
          type: 'checklist',
          content: `${progress.description} 완료`,
          activity_id: progress.activity_id,
          activity_title: progress.activity_title
        });
      });

    // 시간순으로 정렬 (최신순)
    unified.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setUnifiedLogs(unified);
  };

  const downloadUnifiedLogs = () => {
    const filteredLogs = getFilteredUnifiedLogs();

    const csvData = filteredLogs.map(log => ({
      timestamp: new Date(log.timestamp).toLocaleString('ko-KR'),
      student_id: log.student_id,
      student_name: getStudentInfo(log.student_id).split(' (')[0],
      type: log.type === 'chat' ? (log.sender === 'student' ? '학생 메시지' : 'AI 응답') : '체크리스트 완료',
      activity: log.activity_title || '-',
      content: log.content
    }));

    const csvContent = generateCSV(csvData, ['timestamp', 'student_id', 'student_name', 'type', 'activity', 'content']);
    downloadCSV(csvContent, `unified_logs_${new Date().toISOString().split('T')[0]}.csv`);
    
    toast({
      title: "다운로드 완료",
      description: "통합 로그가 다운로드되었습니다."
    });
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

  const getFilteredUnifiedLogs = () => {
    return unifiedLogs.filter(log => {
      const matchesSearch = log.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.student_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStudent = selectedStudent === 'all' || log.student_id === selectedStudent;
      const matchesActivity = selectedActivity === 'all' || log.activity_id === selectedActivity;
      
      return matchesSearch && matchesStudent && matchesActivity;
    });
  };

  const getStudentDetailLogs = (studentId: string) => {
    return unifiedLogs.filter(log => log.student_id === studentId);
  };

  // 학생별 통계
  const getStudentStats = () => {
    const stats = students.map(student => {
      const studentLogs = chatLogs.filter(log => log.student_id === student.student_id);
      const totalMessages = studentLogs.length;
      const studentMessages = studentLogs.filter(log => log.sender === 'student').length;
      const botMessages = studentLogs.filter(log => log.sender === 'bot').length;
      const completedChecklists = checklistProgress.filter(p => 
        p.student_id === student.student_id && p.is_completed
      ).length;
      const lastActivity = studentLogs.length > 0 ? 
        new Date(studentLogs[0].timestamp).toLocaleDateString('ko-KR') : '-';

      return {
        ...student,
        totalMessages,
        studentMessages,
        botMessages,
        completedChecklists,
        lastActivity
      };
    });

    return stats.sort((a, b) => b.totalMessages - a.totalMessages);
  };

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentDetail(studentId);
    setViewMode('student-detail');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedStudentDetail('');
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  if (viewMode === 'student-detail') {
    const studentDetailLogs = getStudentDetailLogs(selectedStudentDetail);
    const studentInfo = getStudentInfo(selectedStudentDetail);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={handleBackToOverview} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
            <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">{studentInfo} 상세 기록</h2>
          </div>
          <Button onClick={downloadUnifiedLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            로그 다운로드
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>통합 활동 기록 ({studentDetailLogs.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>활동</TableHead>
                  <TableHead>내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentDetailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      {log.type === 'chat' ? (
                        <Badge variant={log.sender === 'student' ? 'default' : 'secondary'}>
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {log.sender === 'student' ? '학생' : 'AI'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          체크리스트
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.activity_title || '-'}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={log.content}>
                        {log.content}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {studentDetailLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      기록이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">학생기록 관리</h2>
        <Button onClick={downloadUnifiedLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          통합 로그 다운로드
        </Button>
      </div>

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
                <TableHead>완료한 체크리스트</TableHead>
                <TableHead>마지막 활동</TableHead>
                <TableHead>액션</TableHead>
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
                  <TableCell>{student.completedChecklists}</TableCell>
                  <TableCell>{student.lastActivity}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStudentClick(student.student_id)}
                    >
                      상세보기
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 통합 로그 */}
      <Card>
        <CardHeader>
          <CardTitle>통합 활동 로그 ({getFilteredUnifiedLogs().length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>학생</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>활동</TableHead>
                <TableHead>내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredUnifiedLogs().slice(0, 100).map((log) => (
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
                    {log.type === 'chat' ? (
                      <Badge variant={log.sender === 'student' ? 'default' : 'secondary'}>
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {log.sender === 'student' ? '학생' : 'AI'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        체크리스트
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.activity_title || '-'}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={log.content}>
                      {log.content}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {getFilteredUnifiedLogs().length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm || selectedStudent !== 'all' || selectedActivity !== 'all' ? 
                      '필터 조건에 맞는 기록이 없습니다.' : '기록이 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
              {getFilteredUnifiedLogs().length > 100 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    최근 100개 항목만 표시됩니다. 더 많은 기록을 보려면 필터를 사용하거나 학생별 상세보기를 이용하세요.
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
