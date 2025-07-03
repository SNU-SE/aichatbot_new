import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, MessageSquare, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV, generateCSV } from '@/utils/csvUtils';

interface StudentResponseDialogProps {
  studentId: string;
  activityId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentData {
  responses: any[];
  evaluations: any[];
  reflections: any[];
  chatLogs: any[];
  checklistProgress: any[];
  receivedEvaluations: any[];
}

const StudentResponseDialog = ({ studentId, activityId, studentName, open, onOpenChange }: StudentResponseDialogProps) => {
  const [studentData, setStudentData] = useState<StudentData>({
    responses: [],
    evaluations: [],
    reflections: [],
    chatLogs: [],
    checklistProgress: [],
    receivedEvaluations: []
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchStudentData();
    }
  }, [open, studentId, activityId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 논증 응답 가져오기
      const { data: responses } = await supabase
        .from('argumentation_responses')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activityId);

      console.log('Student responses for', studentId, ':', responses);

      // 동료평가 가져오기 (평가한 것들)
      const { data: evaluations } = await supabase
        .from('peer_evaluations')
        .select(`
          *,
          argumentation_responses!target_response_id(
            response_text,
            students!argumentation_responses_student_id_fkey(name)
          )
        `)
        .eq('evaluator_id', studentId)
        .eq('activity_id', activityId);

      console.log('Student evaluations (given) for', studentId, ':', evaluations);

      // 받은 동료평가 가져오기 (개선된 방법 - 두 단계로 처리)
      let receivedEvaluations = [];
      if (responses && responses.length > 0) {
        const responseIds = responses.map(r => r.id);
        
        const { data: receivedEvals } = await supabase
          .from('peer_evaluations')
          .select(`
            *,
            students!evaluator_id(name, student_id)
          `)
          .in('target_response_id', responseIds)
          .eq('activity_id', activityId)
          .eq('is_completed', true);

        receivedEvaluations = receivedEvals || [];
      }

      console.log('Student evaluations (received) for', studentId, ':', receivedEvaluations);

      // 평가 성찰 가져오기
      const { data: reflections } = await supabase
        .from('evaluation_reflections')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activityId);

      console.log('Student reflections for', studentId, ':', reflections);

      // 채팅 로그 가져오기
      const { data: chatLogs } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activityId)
        .order('timestamp', { ascending: true });

      // 체크리스트 진행상황 가져오기
      const { data: checklistProgress } = await supabase
        .from('student_checklist_progress')
        .select(`
          *,
          checklist_items!inner(
            description,
            activity_id
          )
        `)
        .eq('student_id', studentId)
        .eq('checklist_items.activity_id', activityId);

      setStudentData({
        responses: responses || [],
        evaluations: evaluations || [],
        reflections: reflections || [],
        chatLogs: chatLogs || [],
        checklistProgress: checklistProgress || [],
        receivedEvaluations: receivedEvaluations
      });

      console.log('Received evaluations for student:', studentId, receivedEvaluations);
      console.log('Total reflection count for student', studentId, ':', reflections?.length || 0);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: "오류",
        description: "학생 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadStudentDataCSV = () => {
    const csvData = [];
    
    // 논증 응답 데이터
    studentData.responses.forEach(response => {
      csvData.push({
        '유형': '논증 응답',
        '내용': response.response_text,
        '제출일시': response.submitted_at,
        '최종수정논증': response.final_revised_argument || '',
        '최종수정일시': response.final_revision_submitted_at || '',
        '평가자': '',
        '유용성점수': ''
      });
    });

    // 동료평가 데이터 (평가한 것들)
    studentData.evaluations.forEach(evaluation => {
      csvData.push({
        '유형': '동료 평가 (작성)',
        '내용': evaluation.evaluation_text || '',
        '제출일시': evaluation.submitted_at || '',
        '대상': evaluation.argumentation_responses?.students?.name || '알 수 없음',
        '완료여부': evaluation.is_completed ? '완료' : '미완료',
        '평가자': '',
        '유용성점수': ''
      });
    });

    // 받은 동료평가 데이터 (평가자 정보 포함)
    studentData.receivedEvaluations.forEach(evaluation => {
      csvData.push({
        '유형': '동료 평가 (받음)',
        '내용': evaluation.evaluation_text || '',
        '제출일시': evaluation.submitted_at || '',
        '평가자': evaluation.students?.name || '알 수 없음',
        '평가자학번': evaluation.students?.student_id || '',
        '완료여부': evaluation.is_completed ? '완료' : '미완료',
        '유용성점수': ''
      });
    });

    // 평가 성찰 데이터
    studentData.reflections.forEach(reflection => {
      csvData.push({
        '유형': '평가 성찰',
        '내용': reflection.reflection_text,
        '유익함점수': reflection.usefulness_rating,
        '제출일시': reflection.submitted_at,
        '평가자': '',
        '유용성점수': reflection.usefulness_rating
      });
    });

    const csv = generateCSV(csvData, ['유형', '내용', '제출일시', '최종수정논증', '최종수정일시', '대상', '완료여부', '유익함점수', '평가자', '평가자학번', '유용성점수']);
    downloadCSV(csv, `${studentName}_${studentId}_학습데이터.csv`);
    
    toast({
      title: "다운로드 완료",
      description: "학생 데이터가 CSV 파일로 다운로드되었습니다."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{studentName} ({studentId}) 학습 데이터</span>
            </div>
            <Button
              onClick={downloadStudentDataCSV}
              size="sm"
              variant="outline"
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>CSV 다운로드</span>
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="responses" className="h-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="responses" className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>응답</span>
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>평가함</span>
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>평가받음</span>
            </TabsTrigger>
            <TabsTrigger value="reflections" className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4" />
              <span>성찰 ({studentData.reflections.length})</span>
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>채팅</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4" />
              <span>체크리스트</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="responses" className="space-y-4">
              {studentData.responses.length > 0 ? (
                studentData.responses.map((response, index) => (
                  <Card key={response.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">논증 응답 {index + 1}</CardTitle>
                      <p className="text-sm text-gray-600">{new Date(response.submitted_at).toLocaleString('ko-KR')}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">초기 논증:</h4>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="whitespace-pre-wrap">{response.response_text}</p>
                          </div>
                        </div>
                        {response.final_revised_argument && (
                          <div>
                            <h4 className="font-medium mb-2">최종 수정 논증:</h4>
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="whitespace-pre-wrap">{response.final_revised_argument}</p>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              수정일시: {new Date(response.final_revision_submitted_at).toLocaleString('ko-KR')}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  제출된 응답이 없습니다.
                </div>
              )}
            </TabsContent>

            <TabsContent value="evaluations" className="space-y-4">
              {studentData.evaluations.length > 0 ? (
                studentData.evaluations.map((evaluation, index) => (
                  <Card key={evaluation.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">동료 평가 {index + 1}</CardTitle>
                      <p className="text-sm text-gray-600">
                        평가 대상: {evaluation.argumentation_responses?.students?.name || '알 수 없음'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {evaluation.submitted_at ? new Date(evaluation.submitted_at).toLocaleString('ko-KR') : '미제출'}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">평가 대상의 논증:</h4>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="whitespace-pre-wrap">
                              {evaluation.argumentation_responses?.response_text || '내용 없음'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">평가 내용:</h4>
                          <div className="bg-yellow-50 p-3 rounded">
                            <p className="whitespace-pre-wrap">{evaluation.evaluation_text || '평가 미작성'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>완료 상태: {evaluation.is_completed ? '완료' : '미완료'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  배정된 동료평가가 없습니다.
                </div>
              )}
            </TabsContent>

            <TabsContent value="received" className="space-y-4">
              {studentData.receivedEvaluations.length > 0 ? (
                studentData.receivedEvaluations.map((evaluation, index) => (
                  <Card key={evaluation.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">받은 평가 {index + 1}</CardTitle>
                      <p className="text-sm text-gray-600">
                        평가자: {evaluation.students?.name || '알 수 없음'} ({evaluation.students?.student_id || ''})
                      </p>
                      <p className="text-sm text-gray-600">
                        {evaluation.submitted_at ? new Date(evaluation.submitted_at).toLocaleString('ko-KR') : '미제출'}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">받은 평가 내용:</h4>
                          <div className="bg-green-50 p-3 rounded">
                            <p className="whitespace-pre-wrap">{evaluation.evaluation_text || '평가 미작성'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  받은 평가가 없습니다.
                </div>
              )}
            </TabsContent>

            <TabsContent value="reflections" className="space-y-4">
              {studentData.reflections.length > 0 ? (
                studentData.reflections.map((reflection, index) => (
                  <Card key={reflection.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">평가 성찰 {index + 1}</CardTitle>
                      <p className="text-sm text-gray-600">{new Date(reflection.submitted_at).toLocaleString('ko-KR')}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">성찰 내용:</h4>
                          <div className="bg-green-50 p-3 rounded">
                            <p className="whitespace-pre-wrap">{reflection.reflection_text}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">유익함 점수:</h4>
                          <div className="bg-blue-50 p-3 rounded">
                            <p>{reflection.usefulness_rating}/5점</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  작성된 성찰이 없습니다.
                </div>
              )}
            </TabsContent>

            <TabsContent value="chats" className="space-y-4">
              {studentData.chatLogs.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">채팅 기록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {studentData.chatLogs.map((chat, index) => (
                        <div key={chat.id} className={`p-3 rounded ${
                          chat.sender === 'student' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                        }`}>
                          <div className="flex justify-between items-start">
                            <span className="font-medium">
                              {chat.sender === 'student' ? '학생' : 'AI'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(chat.timestamp).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap">{chat.message}</p>
                          {chat.file_name && (
                            <p className="text-sm text-gray-600 mt-1">첨부파일: {chat.file_name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  채팅 기록이 없습니다.
                </div>
              )}
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4">
              {studentData.checklistProgress.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">체크리스트 진행상황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {studentData.checklistProgress.map((progress, index) => (
                        <div key={progress.id} className={`p-3 rounded ${
                          progress.is_completed ? 'bg-green-50' : 'bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start">
                            <span className="font-medium">
                              {progress.checklist_items?.description}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              progress.is_completed ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {progress.is_completed ? '완료' : '미완료'}
                            </span>
                          </div>
                          {progress.completed_at && (
                            <p className="text-sm text-gray-600 mt-1">
                              완료일시: {new Date(progress.completed_at).toLocaleString('ko-KR')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  체크리스트 데이터가 없습니다.
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StudentResponseDialog;
