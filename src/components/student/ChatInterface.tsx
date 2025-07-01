import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, ArrowLeft, BookOpen, Paperclip, Microscope, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadFile } from '@/utils/fileUpload';
import FilePreview from './FilePreview';
import MessageFile from './MessageFile';

interface Message {
  id: string;
  sender: 'student' | 'bot';
  message: string;
  timestamp: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

interface Activity {
  id: string;
  title: string;
  type: string;
  content: any;
}

interface ArgumentationContext {
  activeTask: 'none' | 'argument' | 'peer-evaluation' | 'evaluation-check';
  setActiveTask: (task: 'none' | 'argument' | 'peer-evaluation' | 'evaluation-check') => void;
  argumentText: string;
  setArgumentText: (text: string) => void;
  evaluationText: string;
  setEvaluationText: (text: string) => void;
  reflectionText: string;
  setReflectionText: (text: string) => void;
  finalRevisedArgument: string;
  setFinalRevisedArgument: (text: string) => void;
  usefulnessRating: number;
  setUsefulnessRating: (rating: number) => void;
  peerResponse: any;
  peerEvaluations: any[];
  isSubmitted: boolean;
  submitArgument: () => void;
  submitPeerEvaluation: () => void;
  submitReflection: () => void;
}

interface ChatInterfaceProps {
  activity: any;
  studentId: string;
  onBack: () => void;
  checklistContext?: {
    currentStep: string;
    allSteps: any[];
  };
  argumentationContext?: ArgumentationContext;
}

const ChatInterface = ({ activity, studentId, onBack, checklistContext, argumentationContext }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [motherTongue, setMotherTongue] = useState<string>('Korean');
  const [peerResponse, setPeerResponse] = useState<any>(null);
  const [peerEvaluations, setPeerEvaluations] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 모든 평가 완료 여부 확인 함수를 먼저 선언
  const allPeerEvaluationsCompleted = () => {
    return peerResponse?.assignments?.every(assignment => assignment.is_completed) || false;
  };

  // 개별 평가 제출 함수
  const submitIndividualPeerEvaluation = async (evaluationId: string, evaluationText: string) => {
    if (!evaluationText?.trim()) {
      toast({
        title: "오류",
        description: "평가 내용을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('peer_evaluations')
        .update({
          evaluation_text: evaluationText,
          is_completed: true,
          submitted_at: new Date().toISOString()
        })
        .eq('id', evaluationId);

      if (error) throw error;

      // 상태 업데이트
      setPeerResponse(prev => ({
        ...prev,
        assignments: prev.assignments.map(a => 
          a.id === evaluationId ? { ...a, is_completed: true } : a
        )
      }));

      toast({
        title: "성공",
        description: "개별 평가가 제출되었습니다."
      });

      // 동료평가 상태 다시 확인
      await checkPeerEvaluationStatus();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "평가 제출에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchStudentInfo();
    fetchChatHistory();
    checkPeerEvaluationStatus();
  }, [activity.id, studentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchStudentInfo = async () => {
    try {
      const { data: studentData, error } = await supabase
        .from('students')
        .select('mother_tongue')
        .eq('student_id', studentId)
        .single();

      if (error) {
        console.error('Student info error:', error);
      } else {
        setMotherTongue(studentData.mother_tongue || 'Korean');
      }
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activity.id)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Chat history error:', error);
        throw error;
      }
      
      const typedMessages: Message[] = (data || []).map(item => ({
        id: item.id,
        sender: item.sender as 'student' | 'bot',
        message: item.message,
        timestamp: item.timestamp,
        file_url: item.file_url,
        file_name: item.file_name,
        file_type: item.file_type
      }));
      
      setMessages(typedMessages);
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      toast({
        title: "오류",
        description: "대화 기록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const checkPeerEvaluationStatus = async () => {
    try {
      console.log('Checking peer evaluation status for student:', studentId, 'activity:', activity.id);
      
      // Check for assigned peer evaluations - 여러 평가 대상 가져오기
      const { data: assignments, error: assignmentError } = await supabase
        .from('peer_evaluations')
        .select(`
          *,
          argumentation_responses!target_response_id(
            response_text,
            students!argumentation_responses_student_id_fkey(name, student_id)
          )
        `)
        .eq('evaluator_id', studentId)
        .eq('activity_id', activity.id);

      console.log('Peer evaluation assignments:', assignments);

      if (assignmentError) {
        console.error('Assignment fetch error:', assignmentError);
      }

      if (assignments && assignments.length > 0) {
        // 여러 평가 대상을 모두 설정
        setPeerResponse({ assignments });
        console.log('Set peer response with assignments:', assignments);
        
        // 첫 번째 평가의 텍스트를 기본값으로 설정 (기존 호환성)
        if (assignments[0].evaluation_text && argumentationContext) {
          argumentationContext.setEvaluationText(assignments[0].evaluation_text);
        }
      } else {
        console.log('No peer evaluation assignments found');
        setPeerResponse(null);
      }

      // Check if peer evaluations are available for this student's response
      const { data: studentResponse } = await supabase
        .from('argumentation_responses')
        .select('id')
        .eq('student_id', studentId)
        .eq('activity_id', activity.id)
        .single();

      if (studentResponse) {
        const { data: evaluations } = await supabase
          .from('peer_evaluations')
          .select('*')
          .eq('target_response_id', studentResponse.id)
          .eq('is_completed', true);

        if (evaluations && evaluations.length > 0) {
          setPeerEvaluations(evaluations);
          if (argumentationContext) {
            argumentationContext.peerEvaluations = evaluations;
          }
        }
      }
    } catch (error) {
      console.error('동료평가 상태 확인 실패:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "파일 크기는 10MB를 초과할 수 없습니다.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (messageText: string, file?: File) => {
    if (!messageText.trim() && !file) return;

    const isHelpRequest = messageText.trim() === '?' || messageText.trim() === '도와줘';
    let finalMessage = messageText;

    if (isHelpRequest && checklistContext) {
      finalMessage = `현재 단계에 대해 도움이 필요합니다. 현재 단계: ${checklistContext.currentStep}`;
    }

    if (messageText.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        sender: 'student',
        message: messageText,
        timestamp: new Date().toISOString(),
        file_url: null,
        file_name: null,
        file_type: null
      };
      setMessages(prev => [...prev, userMessage]);
    }

    setInputMessage('');
    setIsLoading(true);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      if (file) {
        fileUrl = await uploadFile(file, studentId);
        fileName = file.name;
        fileType = file.type;
      }

      console.log('Sending message to AI chat function:', {
        message: finalMessage || '파일을 업로드했습니다.',
        studentId,
        activityId: activity.id,
        fileUrl,
        fileName,
        fileType,
        motherTongue
      });

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: finalMessage || '파일을 업로드했습니다.',
          studentId: studentId,
          activityId: activity.id,
          fileUrl: fileUrl,
          fileName: fileName,
          fileType: fileType,
          motherTongue: motherTongue
        }
      });

      console.log('AI chat response:', data);

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (data?.error) {
        console.error('AI chat error:', data.error);
        throw new Error(data.error);
      }

      await fetchChatHistory();

    } catch (error: any) {
      console.error('Error in handleSendMessage:', error);
      
      if (messageText.trim()) {
        setMessages(prev => prev.slice(0, -1));
      }
      
      toast({
        title: "오류",
        description: error.message || "메시지 전송에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    await handleSendMessage(inputMessage.trim(), selectedFile || undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getActivityDescription = () => {
    if (activity.content && typeof activity.content === 'object') {
      return activity.content.description || '';
    }
    return '';
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'experiment':
        return <Microscope className="h-6 w-6" />;
      case 'argumentation':
        return <Users className="h-6 w-6" />;
      case 'discussion':
        return <BookOpen className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  if (loadingHistory) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">대화 기록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 h-full flex flex-col">
      {/* 활동 정보 헤더 */}
      <Card className="border-0 shadow-md rounded-lg flex-shrink-0">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[rgb(15,15,112)] rounded-lg text-white">
              {getActivityIcon()}
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-gray-900">
                {activity.title}
              </CardTitle>
              {getActivityDescription() && (
                <p className="text-gray-600 mt-1">{getActivityDescription()}</p>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="border-[rgb(15,15,112)] text-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)] hover:text-white rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 논증 활동 작업 영역 */}
      {argumentationContext && argumentationContext.activeTask !== 'none' && (
        <div className="bg-white border shadow-sm p-4 max-h-96 overflow-y-auto rounded-lg">
          {argumentationContext.activeTask === 'argument' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">논증 입력</h3>
              <div>
                <h4 className="font-medium mb-2">질문:</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {activity.final_question || "질문이 설정되지 않았습니다."}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">답변:</h4>
                <Textarea
                  value={argumentationContext.argumentText}
                  onChange={(e) => argumentationContext.setArgumentText(e.target.value)}
                  placeholder="논증을 작성해주세요..."
                  className="min-h-32"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={argumentationContext.submitArgument}>제출</Button>
                <Button variant="outline" onClick={() => argumentationContext.setActiveTask('none')}>
                  취소
                </Button>
              </div>
            </div>
          )}

          {argumentationContext.activeTask === 'peer-evaluation' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">동료 평가</h3>
              
              {/* Debug information */}
              {console.log('Current peerResponse:', peerResponse)}
              
              {/* 여러 평가 대상 표시 */}
              {peerResponse?.assignments && peerResponse.assignments.length > 0 ? (
                peerResponse.assignments.map((assignment, index) => (
                  <div key={assignment.id} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        평가 대상 {index + 1}: {assignment.argumentation_responses?.students?.name || '이름 없음'} 
                        ({assignment.argumentation_responses?.students?.student_id || '학번 없음'})
                      </h4>
                      {assignment.is_completed && (
                        <span className="text-green-600 text-sm">✓ 완료</span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="font-medium mb-2">평가할 응답:</h5>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-700">
                          {assignment.argumentation_responses?.response_text || '응답 텍스트가 없습니다.'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="font-medium mb-2">평가 내용:</h5>
                      <Textarea
                        value={assignment.evaluation_text || ''}
                        onChange={(e) => {
                          // 해당 평가의 텍스트 업데이트
                          setPeerResponse(prev => ({
                            ...prev,
                            assignments: prev.assignments.map(a => 
                              a.id === assignment.id ? { ...a, evaluation_text: e.target.value } : a
                            )
                          }));
                        }}
                        placeholder="동료의 응답에 대한 평가를 작성해주세요..."
                        className="min-h-24"
                        disabled={assignment.is_completed}
                      />
                    </div>
                    
                    {!assignment.is_completed && (
                      <Button 
                        onClick={() => submitIndividualPeerEvaluation(assignment.id, assignment.evaluation_text)}
                        disabled={!assignment.evaluation_text?.trim()}
                        size="sm"
                      >
                        이 평가 제출
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>배정된 동료평가가 없습니다.</p>
                  <p className="text-sm mt-1">관리자가 동료평가를 배정할 때까지 기다려주세요.</p>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  onClick={argumentationContext.submitPeerEvaluation}
                  disabled={!allPeerEvaluationsCompleted()}
                >
                  {allPeerEvaluationsCompleted() ? '모든 평가 완료' : '전체 평가 제출'}
                </Button>
                <Button variant="outline" onClick={() => argumentationContext.setActiveTask('none')}>
                  취소
                </Button>
              </div>
            </div>
          )}

          {argumentationContext.activeTask === 'evaluation-check' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">평가 확인</h3>
              <div>
                <h4 className="font-medium mb-2">받은 평가들:</h4>
                <div className="space-y-2">
                  {argumentationContext.peerEvaluations.map((evaluation, index) => (
                    <div key={evaluation.id} className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">평가 {index + 1}</p>
                      <p className="text-gray-700">{evaluation.evaluation_text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">이 평가들이 얼마나 유익했나요?</h4>
                <Textarea
                  value={argumentationContext.reflectionText}
                  onChange={(e) => argumentationContext.setReflectionText(e.target.value)}
                  placeholder="받은 평가에 대한 생각을 작성해주세요..."
                  className="min-h-24"
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">유익함 정도 (1-5점):</h4>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={argumentationContext.usefulnessRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => argumentationContext.setUsefulnessRating(rating)}
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">최종 검토 반영:</h4>
                <p className="text-sm text-gray-600 mb-2">받은 평가를 바탕으로 자신의 주장을 최종적으로 수정해서 작성해주세요.</p>
                <Textarea
                  value={argumentationContext.finalRevisedArgument}
                  onChange={(e) => argumentationContext.setFinalRevisedArgument(e.target.value)}
                  placeholder="평가를 바탕으로 수정된 최종 주장을 작성해주세요..."
                  className="min-h-32"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={argumentationContext.submitReflection}>저장</Button>
                <Button variant="outline" onClick={() => argumentationContext.setActiveTask('none')}>
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 채팅 영역 */}
      <Card className="border-0 shadow-md rounded-lg flex-1 min-h-0 flex flex-col">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">AI와 대화를 시작해보세요!</p>
                <p className="text-sm text-gray-500 mt-1">질문이나 의견을 자유롭게 말씀해주세요.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${
                    msg.sender === 'student' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    msg.sender === 'student' 
                      ? 'bg-[rgb(15,15,112)] text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {msg.sender === 'student' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`flex-1 max-w-md ${
                    msg.sender === 'student' ? 'text-right' : 'text-left'
                  }`}>
                    <div className={`p-3 rounded-lg ${
                      msg.sender === 'student'
                        ? 'bg-[rgb(15,15,112)] text-white ml-auto'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      {(msg.file_url || msg.file_name) && (
                        <MessageFile 
                          fileUrl={msg.file_url || ''}
                          fileName={msg.file_name}
                          fileType={msg.file_type}
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-full bg-gray-200 text-gray-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 max-w-md">
                  <div className="p-3 rounded-lg bg-gray-100">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 파일 미리보기 */}
          {selectedFile && (
            <div className="border-t border-b p-3 bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">첨부된 파일:</span>
                <FilePreview file={selectedFile} onRemove={removeSelectedFile} />
              </div>
            </div>
          )}

          {/* 메시지 입력 영역 */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex space-x-2">
              <div className="flex space-x-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.txt,.doc,.docx"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-2 rounded-lg"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                disabled={isLoading}
                className="flex-1 rounded-lg"
              />
              <Button 
                onClick={sendMessage}
                disabled={(!inputMessage.trim() && !selectedFile) || isLoading}
                className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;
