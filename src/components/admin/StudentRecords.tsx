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

interface ChecklistHistory {
  id: string;
  student_id: string;
  checklist_item_id: string;
  activity_id: string;
  description: string;
  activity_title: string;
  completed_at: string;
  reset_at: string | null;
}

interface PeerEvaluationHistory {
  id: string;
  student_id: string;
  activity_id: string;
  evaluation_type: 'given' | 'received';
  evaluation_text: string;
  evaluator_name: string;
  evaluator_id: string;
  target_name: string;
  target_id: string;
  submitted_at: string;
  activity_title: string;
}

interface UnifiedLogEntry {
  id: string;
  timestamp: string;
  student_id: string;
  type: 'chat' | 'checklist' | 'peer_evaluation';
  content: string;
  activity_id?: string | null;
  activity_title?: string;
  sender?: string;
  is_reset?: boolean;
  evaluator_name?: string;
  evaluation_type?: 'given' | 'received';
}

const StudentRecords = () => {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checklistHistory, setChecklistHistory] = useState<ChecklistHistory[]>([]);
  const [peerEvaluationHistory, setPeerEvaluationHistory] = useState<PeerEvaluationHistory[]>([]);
  const [unifiedLogs, setUnifiedLogs] = useState<UnifiedLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'student-detail'>('overview');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    createUnifiedLogs();
  }, [chatLogs, checklistHistory, peerEvaluationHistory]);

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

      // 체크리스트 히스토리 가져오기 (기존 progress + 새로운 history 테이블)
      const { data: currentProgress, error: progressError } = await supabase
        .from('student_checklist_progress')
        .select(`
          *,
          checklist_items!inner(
            description,
            activity_id,
            activities!inner(title)
          )
        `)
        .eq('is_completed', true);

      if (progressError) throw progressError;

      // 히스토리 테이블에서 완료 기록 가져오기
      const { data: historyData, error: historyError } = await supabase
        .from('checklist_completion_history')
        .select('*')
        .order('completed_at', { ascending: false });

      if (historyError) throw historyError;

      // 동료평가 히스토리 가져오기 (평가한 것과 받은 것 모두)
      const { data: givenEvaluations } = await supabase
        .from('peer_evaluations')
        .select(`
          *,
          activities!inner(title),
          argumentation_responses!target_response_id(
            students!argumentation_responses_student_id_fkey(name, student_id)
          ),
          students!evaluator_id(name)
        `)
        .eq('is_completed', true);

      const { data: receivedEvaluations } = await supabase
        .from('peer_evaluations')
        .select(`
          *,
          activities!inner(title),
          argumentation_responses!target_response_id(
            student_id,
            students!argumentation_responses_student_id_fkey(name)
          ),
          students!evaluator_id(name, student_id)
        `)
        .eq('is_completed', true);

      // 평가 히스토리 통합
      const allPeerEvaluations: PeerEvaluationHistory[] = [];

      // 평가한 것들
      givenEvaluations?.forEach(evaluation => {
        allPeerEvaluations.push({
          id: `given_${evaluation.id}`,
          student_id: evaluation.evaluator_id,
          activity_id: evaluation.activity_id,
          evaluation_type: 'given',
          evaluation_text: evaluation.evaluation_text || '',
          evaluator_name: evaluation.students?.name || '알 수 없음',
          evaluator_id: evaluation.evaluator_id,
          target_name: evaluation.argumentation_responses?.students?.name || '알 수 없음',
          target_id: evaluation.argumentation_responses?.students?.student_id || '',
          submitted_at: evaluation.submitted_at || '',
          activity_title: evaluation.activities?.title || '알 수 없는 활동'
        });
      });

      // 받은 것들
      receivedEvaluations?.forEach(evaluation => {
        allPeerEvaluations.push({
          id: `received_${evaluation.id}`,
          student_id: evaluation.argumentation_responses?.student_id || '',
          activity_id: evaluation.activity_id,
          evaluation_type: 'received',
          evaluation_text: evaluation.evaluation_text || '',
          evaluator_name: evaluation.students?.name || '알 수 없음',
          evaluator_id: evaluation.students?.student_id || '',
          target_name: evaluation.argumentation_responses?.students?.name || '알 수 없음',
          target_id: evaluation.argumentation_responses?.student_id || '',
          submitted_at: evaluation.submitted_at || '',
          activity_title: evaluation.activities?.title || '알 수 없는 활동'
        });
      });

      // 현재 진행도와 히스토리를 통합
      const currentProgressFormatted = currentProgress?.map(p => ({
        id: p.id,
        student_id: p.student_id,
        checklist_item_id: p.checklist_item_id,
        activity_id: (p.checklist_items as any).activity_id,
        description: (p.checklist_items as any).description,
        activity_title: (p.checklist_items as any).activities.title,
        completed_at: p.completed_at!,
        reset_at: null
      })) || [];

      const allChecklistHistory = [...(historyData || []), ...currentProgressFormatted];

      // 중복 제거 (같은 학생, 같은 체크리스트 항목, 같은 완료 시간)
      const uniqueHistory = allChecklistHistory.filter((item, index, self) => 
        index === self.findIndex(t => 
          t.student_id === item.student_id && 
          t.checklist_item_id === item.checklist_item_id && 
          t.completed_at === item.completed_at
        )
      );

      setChatLogs(logsData || []);
      setStudents(studentsData || []);
      setActivities(activitiesData || []);
      setChecklistHistory(uniqueHistory);
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

    // 체크리스트 히스토리 추가
    checklistHistory.forEach(history => {
      unified.push({
        id: `checklist_${history.id}`,
        timestamp: history.completed_at,
        student_id: history.student_id,
        type: 'checklist',
        content: `${history.description} 완료${history.reset_at ? ' (초기화됨)' : ''}`,
        activity_id: history.activity_id,
        activity_title: history.activity_title,
        is_reset: !!history.reset_at
      });
    });

    // 동료평가 히스토리 추가
    peerEvaluationHistory.forEach(evaluation => {
      const content = evaluation.evaluation_type === 'given' 
        ? `${evaluation.target_name}에게 평가 작성: ${evaluation.evaluation_text.substring(0, 50)}...`
        : `${evaluation.evaluator_name}으로부터 평가 받음: ${evaluation.evaluation_text.substring(0, 50)}...`;
      
      unified.push({
        id: `peer_eval_${evaluation.id}`,
        timestamp: evaluation.submitted_at,
        student_id: evaluation.student_id,
        type: 'peer_evaluation',
        content: content,
        activity_id: evaluation.activity_id,
        activity_title: evaluation.activity_title,
        evaluator_name: evaluation.evaluator_name,
        evaluation_type: evaluation.evaluation_type
      });
    });

    // 시간순으로 정렬 (최신순)
    unified.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setUnifiedLogs(unified);
  };

  // 고유 반 목록 추출
  const getUniqueClasses = () => {
    const classes = students.map(student => student.class_name);
    return Array.from(new Set(classes)).sort();
  };

  const downloadUnifiedLogs = () => {
    const filteredLogs = getFilteredUnifiedLogs();

    const csvData = filteredLogs.map(log => ({
      timestamp: new Date(log.timestamp).toLocaleString('ko-KR'),
      student_id: log.student_id,
      student_name: getStudentInfo(log.student_id).split(' (')[0],
      student_class: getStudentClass(log.student_id),
      type: log.type === 'chat' ? (log.sender === 'student' ? '학생 메시지' : 'AI 응답') : 
            log.type === 'checklist' ? '체크리스트 완료' : 
            log.evaluation_type === 'given' ? '동료평가 작성' : '동료평가 받음',
      activity: log.activity_title || '-',
      content: log.content,
      evaluator_name: log.evaluator_name || '',
      is_reset: log.is_reset ? '초기화됨' : ''
    }));

    const csvContent = generateCSV(csvData, ['timestamp', 'student_id', 'student_name', 'student_class', 'type', 'activity', 'content', 'evaluator_name', 'is_reset']);
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

  const getStudentClass = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    return student ? student.class_name : '-';
  };

  const getActivityInfo = (activityId: string | null) => {
    if (!activityId) return '챗봇 대화';
    const activity = activities.find(a => a.id === activityId);
    if (!activity) {
      return '챗봇 대화';
    }
    return activity.title;
  };

  const getFilteredUnifiedLogs = () => {
    return unifiedLogs.filter(log => {
      const student = students.find(s => s.student_id === log.student_id);
      const matchesSearch = log.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (student?.name && student.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStudent = selectedStudent === 'all' || log.student_id === selectedStudent;
      const matchesActivity = selectedActivity === 'all' || log.activity_id === selectedActivity;
      const matchesClass = selectedClass === 'all' || (student && student.class_name === selectedClass);
      
      return matchesSearch && matchesStudent && matchesActivity && matchesClass;
    });
  };

  const getStudentDetailLogs = (studentId: string) => {
    return unifiedLogs.filter(log => log.student_id === studentId);
  };

  // 학생별 통계 수정 - 동료평가 포함
  const getStudentStats = () => {
    let stats = students.map(student => {
      const studentLogs = chatLogs.filter(log => log.student_id === student.student_id);
      const totalMessages = studentLogs.length;
      const studentMessages = studentLogs.filter(log => log.sender === 'student').length;
      const botMessages = studentLogs.filter(log => log.sender === 'bot').length;
      const completedChecklists = checklistHistory.filter(h => h.student_id === student.student_id).length;
      const givenEvaluations = peerEvaluationHistory.filter(p => p.student_id === student.student_id && p.evaluation_type === 'given').length;
      const receivedEvaluations = peerEvaluationHistory.filter(p => p.student_id === student.student_id && p.evaluation_type === 'received').length;
      const lastActivity = studentLogs.length > 0 ? 
        new Date(studentLogs[0].timestamp).toLocaleDateString('ko-KR') : '-';

      return {
        ...student,
        totalMessages,
        studentMessages,
        botMessages,
        completedChecklists,
        givenEvaluations,
        receivedEvaluations,
        lastActivity
      };
    });

    // 반별 필터링 적용
    if (selectedClass !== 'all') {
      stats = stats.filter(student => student.class_name === selectedClass);
    }

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
                  <TableHead>평가자</TableHead>
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
                      ) : log.type === 'checklist' ? (
                        <Badge 
                          variant="outline" 
                          className={log.is_reset ? "text-orange-600 border-orange-600" : "text-green-600 border-green-600"}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          체크리스트
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          <User className="h-3 w-3 mr-1" />
                          {log.evaluation_type === 'given' ? '평가작성' : '평가받음'}
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
                    <TableCell className="text-sm">
                      {log.evaluator_name || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {studentDetailLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="메시지 내용이나 학번, 학생명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="반 선택" />
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
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="학생 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 학생</SelectItem>
                {students
                  .filter(student => selectedClass === 'all' || student.class_name === selectedClass)
                  .map(student => (
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
          <CardTitle>
            학생별 활동 통계
            {selectedClass !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {selectedClass}
              </span>
            )}
          </CardTitle>
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
                <TableHead>작성한 평가</TableHead>
                <TableHead>받은 평가</TableHead>
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
                  <TableCell>{student.givenEvaluations}</TableCell>
                  <TableCell>{student.receivedEvaluations}</TableCell>
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
                <TableHead>반</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>활동</TableHead>
                <TableHead>내용</TableHead>
                <TableHead>평가자</TableHead>
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
                  <TableCell className="text-sm">
                    {getStudentClass(log.student_id)}
                  </TableCell>
                  <TableCell>
                    {log.type === 'chat' ? (
                      <Badge variant={log.sender === 'student' ? 'default' : 'secondary'}>
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {log.sender === 'student' ? '학생' : 'AI'}
                      </Badge>
                    ) : log.type === 'checklist' ? (
                      <Badge 
                        variant="outline" 
                        className={log.is_reset ? "text-orange-600 border-orange-600" : "text-green-600 border-green-600"}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        체크리스트
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        <User className="h-3 w-3 mr-1" />
                        {log.evaluation_type === 'given' ? '평가작성' : '평가받음'}
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
                  <TableCell className="text-sm">
                    {log.evaluator_name || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {getFilteredUnifiedLogs().length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {searchTerm || selectedStudent !== 'all' || selectedActivity !== 'all' || selectedClass !== 'all' ? 
                      '필터 조건에 맞는 기록이 없습니다.' : '기록이 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
              {getFilteredUnifiedLogs().length > 100 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
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
