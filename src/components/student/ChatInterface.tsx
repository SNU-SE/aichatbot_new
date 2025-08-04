
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Paperclip, X, Save, Check, User, Bot, FileText, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity } from '@/types/activity';
import VirtualizedMessageList from './VirtualizedMessageList';
import FilePreview from './FilePreview';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  message: string;
  sender: 'student' | 'bot';
  timestamp: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}

interface ChatInterfaceProps {
  activity: Activity;
  studentId: string;
  onBack: () => void;
  argumentationContext?: any;
  checklistContext?: {
    currentStep: string;
    allSteps: any[];
  };
}

const ChatInterface = ({ 
  activity, 
  studentId, 
  onBack, 
  argumentationContext,
  checklistContext 
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messagesHeight, setMessagesHeight] = useState(400);
  const [isSending, setIsSending] = useState(false); // 중복 전송 방지 플래그
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();

    // 실시간 메시지 동기화 설정
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs',
          filter: `student_id=eq.${studentId},activity_id=eq.${activity.id}`
        },
        (payload) => {
          console.log('실시간 메시지 수신:', payload.new);
          
          const newMessage: Message = {
            id: payload.new.id,
            message: payload.new.message,
            sender: payload.new.sender as 'student' | 'bot',
            timestamp: payload.new.timestamp,
            file_url: payload.new.file_url,
            file_name: payload.new.file_name,
            file_type: payload.new.file_type
          };
          
          // 강화된 중복 방지 및 임시 메시지 교체 로직
          setMessages(prev => {
            // 1. 실제 ID를 가진 메시지가 이미 존재하는지 확인
            const existsById = prev.some(m => m.id === newMessage.id);
            if (existsById) {
              console.warn('이미 존재하는 메시지 ID:', newMessage.id);
              return prev;
            }
            
            // 2. 임시 메시지 제거 (같은 내용+발송자의 임시 메시지)
            const withoutTemp = prev.filter(m => {
              if (!m.id.startsWith('temp-')) return true;
              
              const isSameContent = m.message === newMessage.message && 
                                  m.sender === newMessage.sender;
              const timeDiff = Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime());
              
              // 임시 메시지를 실제 메시지로 교체
              if (isSameContent && timeDiff < 10000) {
                console.log('임시 메시지 교체:', m.id, '->', newMessage.id);
                return false;
              }
              return true;
            });
            
            // 3. 중복 내용 확인 (1초 이내)
            const duplicateByContent = withoutTemp.some(m => 
              m.message === newMessage.message && 
              m.sender === newMessage.sender && 
              Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 1000
            );
            
            if (duplicateByContent) {
              console.warn('중복 메시지 내용 감지:', newMessage.message);
              return prev;
            }
            
            // 4. 중복 제거 후 추가
            return removeDuplicateMessages([...withoutTemp, newMessage]);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activity.id, studentId]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('student_id', studentId) // 중요: 현재 학생의 메시지만 필터링
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const messages = data.map(msg => ({
        id: msg.id,
        message: msg.message,
        sender: msg.sender as 'student' | 'bot',
        timestamp: msg.timestamp,
        file_url: msg.file_url,
        file_name: msg.file_name,
        file_type: msg.file_type
      }));
      
      // 초기 로드 시에도 중복 제거 적용
      setMessages(removeDuplicateMessages(messages));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "메시지 불러오기 실패",
        description: "메시지를 불러오는 동안 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 중복 제거 유틸리티 함수
  const removeDuplicateMessages = (messages: Message[]) => {
    const seen = new Set<string>();
    const result: Message[] = [];
    
    for (const message of messages) {
      // ID 기반 중복 제거 (우선순위)
      if (message.id && !message.id.startsWith('temp-') && seen.has(message.id)) {
        console.warn('중복 메시지 ID 감지:', message.id);
        continue;
      }
      
      // 내용+발송자+시간 기반 중복 제거 (보조)
      const contentKey = `${message.message}-${message.sender}-${Math.floor(new Date(message.timestamp).getTime() / 1000)}`;
      if (seen.has(contentKey)) {
        console.warn('중복 메시지 내용 감지:', contentKey);
        continue;
      }
      
      if (message.id && !message.id.startsWith('temp-')) {
        seen.add(message.id);
      }
      seen.add(contentKey);
      result.push(message);
    }
    
    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedFile) return;
    
    // 중복 전송 방지
    if (isSending) {
      console.warn('이미 메시지 전송 중입니다.');
      return;
    }

    setIsSending(true);
    const tempId = `temp-student-${Date.now()}-${Math.random()}`;
    const currentMessage = inputMessage.trim();
    
    // 데이터베이스 저장 전 중복 체크
    try {
      const { data: existingMessages, error: checkError } = await supabase
        .from('chat_logs')
        .select('id, message, timestamp')
        .eq('activity_id', activity.id)
        .eq('student_id', studentId)
        .eq('sender', 'student')
        .eq('message', currentMessage)
        .gte('timestamp', new Date(Date.now() - 5000).toISOString()); // 5초 이내 중복 확인

      if (checkError) throw checkError;

      if (existingMessages && existingMessages.length > 0) {
        console.warn('중복 메시지 전송 시도 차단:', currentMessage);
        setIsSending(false);
        return;
      }
    } catch (error) {
      console.error('중복 확인 중 오류:', error);
    }
    
    // 1단계: 낙관적 업데이트 (임시 ID로 즉시 표시)
    const tempMessage: Message = {
      id: tempId,
      sender: 'student' as const,
      message: currentMessage,
      timestamp: new Date().toISOString(),
      file_url: null,
      file_name: null,
      file_type: null
    };
    
    setMessages(prev => removeDuplicateMessages([...prev, tempMessage]));
    setInputMessage('');
    setIsLoading(true);

    try {
      let file_url = null;
      let file_name = null;
      let file_type = null;

      if (selectedFile) {
        const filePath = `chat_files/${studentId}/${activity.id}/${selectedFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('chat_files')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        file_url = `${supabase.storage.from('chat_files').getPublicUrl('').data.publicUrl}/${data.path}`;
        file_name = selectedFile.name;
        file_type = selectedFile.type;
      }

      // 2단계: 서버에 실제 메시지 저장
      const { data: log, error } = await supabase
        .from('chat_logs')
        .insert([{
          activity_id: activity.id,
          student_id: studentId,
          message: currentMessage,
          sender: 'student',
          file_url: file_url,
          file_name: file_name,
          file_type: file_type
        }])
        .select('*')
        .single();

      if (error) throw error;
      
      // 3단계: 임시 메시지를 실제 메시지로 교체
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempId);
        const realMessage: Message = {
          id: log.id,
          sender: 'student' as const,
          message: currentMessage,
          timestamp: log.timestamp,
          file_url: file_url,
          file_name: file_name,
          file_type: file_type
        };
        return removeDuplicateMessages([...withoutTemp, realMessage]);
      });
      
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // AI 챗봇 응답 생성
      try {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('mother_tongue')
          .eq('student_id', studentId)
          .single();

        if (studentError) throw studentError;

        // 최근 5개 메시지를 대화 히스토리로 전송
        const recentMessages = messages.slice(-5).map(msg => ({
          role: msg.sender === 'student' ? 'user' : 'assistant',
          content: msg.message
        }));

        const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-chat', {
          body: {
            message: inputMessage.trim(),
            studentId: studentId,
            activityId: activity.id,
            motherTongue: studentData?.mother_tongue || 'Korean',
            fileUrl: file_url,
            fileName: file_name,
            fileType: file_type,
            conversationHistory: recentMessages
          }
        });

        if (aiError) throw aiError;

        if (aiResponse?.response) {
          // AI 응답 낙관적 업데이트 (실시간 동기화로 실제 메시지가 올 때까지 임시 표시)
          const tempAiMessage: Message = {
            id: `temp-ai-${Date.now()}-${Math.random()}`,
            sender: 'bot' as const,
            message: aiResponse.response,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => removeDuplicateMessages([...prev, tempAiMessage]));
        }
      } catch (aiError) {
        console.error('AI 응답 생성 실패:', aiError);
        toast({
          title: "AI 응답 실패",
          description: "AI가 응답을 생성하지 못했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "메시지 전송 실패",
        description: "메시지를 보내는 동안 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsSending(false); // 전송 완료 후 플래그 해제
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 동적 높이 계산 with debounced ResizeObserver
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const calculateHeight = () => {
      try {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const containerHeight = container.clientHeight;
        
        if (containerHeight === 0) return;
        
        // 실제 DOM 요소 높이 측정
        const header = container.querySelector('[data-header]') as HTMLElement;
        const inputSection = container.querySelector('[data-input]') as HTMLElement;
        const filePreview = container.querySelector('[data-file-preview]') as HTMLElement;
        const argumentationSection = container.querySelector('[data-argumentation]') as HTMLElement;
        
        let fixedHeight = 0;
        if (header) fixedHeight += header.offsetHeight;
        if (inputSection) fixedHeight += inputSection.offsetHeight;
        if (filePreview) fixedHeight += filePreview.offsetHeight;
        if (argumentationSection) fixedHeight += argumentationSection.offsetHeight;
        
        const padding = 24;
        const availableHeight = containerHeight - fixedHeight - padding;
        
        // 화면 크기에 따른 적응형 높이 (viewport height의 40-70%)
        const viewportHeight = window.innerHeight;
        const minHeight = Math.max(250, viewportHeight * 0.3);
        const maxHeight = Math.min(700, viewportHeight * 0.6);
        
        const newHeight = Math.max(minHeight, Math.min(maxHeight, availableHeight));
        
        setMessagesHeight(prev => {
          const diff = Math.abs(prev - newHeight);
          return diff > 15 ? newHeight : prev;
        });
      } catch (error) {
        console.error('Height calculation error:', error);
        setMessagesHeight(400);
      }
    };

    const debouncedCalculateHeight = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateHeight, 150);
    };

    // 초기 계산
    calculateHeight();
    
    // ResizeObserver로 컨테이너 크기 변화 감지
    const observer = new ResizeObserver(debouncedCalculateHeight);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // window resize 이벤트도 감지
    window.addEventListener('resize', debouncedCalculateHeight);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', debouncedCalculateHeight);
    };
  }, [argumentationContext?.activeTask, selectedFile]);

  const checkPeerEvaluationStatus = async () => {
    if (!argumentationContext) return false;

    try {
      // 현재 학생의 클래스 정보 가져오기
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('class_name')
        .eq('student_id', studentId)
        .single();

      if (studentError) throw studentError;

      // 교사가 해당 활동/클래스에 대해 평가완료를 했는지 확인
      const { data: isCompleted, error: phaseError } = await supabase
        .rpc('is_peer_evaluation_completed', {
          activity_id_param: activity.id,
          class_name_param: studentData.class_name
        });

      if (phaseError) throw phaseError;

      if (!isCompleted) {
        return false;
      }

      // 학생이 받은 평가들 가져오기 (같은 클래스만)
      const { data: evaluations, error: evalError } = await supabase
        .from('peer_evaluations')
        .select(`
          evaluation_text,
          submitted_at,
          students!evaluator_id(name, class_name)
        `)
        .eq('activity_id', activity.id)
        .eq('is_completed', true)
        .in('target_response_id', [
          // 현재 학생의 응답 ID 찾기
          ...(await supabase
            .from('argumentation_responses')
            .select('id')
            .eq('activity_id', activity.id)
            .eq('student_id', studentId)
            .then(({ data }) => data?.map(r => r.id) || []))
        ]);

      if (evalError) throw evalError;

      // 같은 클래스의 평가만 필터링
      const classFilteredEvaluations = evaluations?.filter(
        evaluation => evaluation.students?.class_name === studentData.class_name
      ) || [];

      argumentationContext.setPeerEvaluations(classFilteredEvaluations);
      return classFilteredEvaluations.length > 0;
    } catch (error) {
      console.error('동료평가 상태 확인 오류:', error);
      return false;
    }
  };

  const handleArgumentSubmit = async () => {
    if (argumentationContext) {
      await argumentationContext.submitArgument();
    }
  };

  const handlePeerEvaluationSubmit = async () => {
    if (argumentationContext) {
      await argumentationContext.submitPeerEvaluation();
    }
  };

  const handleEvaluationCheck = async () => {
    if (argumentationContext) {
      const hasEvaluations = await checkPeerEvaluationStatus();
      if (hasEvaluations) {
        argumentationContext.setActiveTask('evaluation-check');
      } else {
        toast({
          title: "알림",
          description: "아직 받은 동료평가가 없습니다.",
          variant: "destructive"
        });
      }
    }
  };

  const renderArgumentationInterface = () => {
    if (!argumentationContext) return null;

    const { 
      activeTask, 
      argumentText, 
      setArgumentText,
      evaluationText,
      setEvaluationText,
      reflectionText,
      setReflectionText,
      finalRevisedArgument,
      setFinalRevisedArgument,
      usefulnessRating,
      setUsefulnessRating,
      peerResponse,
      peerEvaluations,
      isSubmitted 
    } = argumentationContext;

    if (activeTask === 'argument') {
      return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">논증 작성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="여기에 논증을 작성하세요..."
              value={argumentText}
              onChange={(e) => setArgumentText(e.target.value)}
              className="min-h-[200px]"
              disabled={isSubmitted}
            />
            {!isSubmitted && (
              <div className="flex space-x-2">
                <Button onClick={handleArgumentSubmit} disabled={!argumentText.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  논증 제출
                </Button>
              </div>
            )}
            {isSubmitted && (
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="h-4 w-4" />
                <span>논증이 제출되었습니다.</span>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (activeTask === 'peer-evaluation') {
      return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">동료 평가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              AI가 동료의 논증을 분석하고 평가할 수 있도록 도와드립니다.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                "동료평가를 시작해줘" 또는 "평가할 논증을 보여줘"라고 메시지를 보내보세요.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeTask === 'evaluation-check') {
      return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">동료평가 결과 확인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {peerEvaluations && peerEvaluations.length > 0 ? (
              <div className="space-y-4">
                <p className="font-medium">받은 동료평가:</p>
                {peerEvaluations.map((evaluation: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {evaluation.students?.name || '익명'} 
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(evaluation.submitted_at).toLocaleDateString('ko-KR')}
                      </Badge>
                    </div>
                    <p className="text-sm">{evaluation.evaluation_text}</p>
                  </div>
                ))}
                
                {/* 성찰 및 수정 작성 영역 */}
                <div className="space-y-4 mt-6 p-4 border-t">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      받은 평가에 대한 성찰:
                    </label>
                    <Textarea
                      placeholder="동료들의 평가를 바탕으로 어떤 점을 개선할 수 있을지 성찰해보세요..."
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      수정된 논증 (선택사항):
                    </label>
                    <Textarea
                      placeholder="동료평가를 바탕으로 논증을 수정하고 싶다면 여기에 작성하세요..."
                      value={finalRevisedArgument}
                      onChange={(e) => setFinalRevisedArgument(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      동료평가의 유용성 평가 (1-5점):
                    </label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant={usefulnessRating === rating ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUsefulnessRating(rating)}
                        >
                          {rating}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={() => argumentationContext.submitReflection()}
                    disabled={!reflectionText.trim()}
                  >
                    성찰 제출
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>아직 받은 동료평가가 없습니다.</p>
                <p className="text-sm mt-2">교사가 동료평가를 완료하면 여기에서 확인할 수 있습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="font-semibold">{activity.title}</h3>
            <p className="text-sm text-gray-600">AI 학습 도우미</p>
          </div>
        </div>
        {checklistContext && (
          <div className="text-xs text-gray-500 max-w-xs text-right">
            <span className="font-medium">현재 단계:</span>
            <br />
            {checklistContext.currentStep}
          </div>
        )}
      </div>

      {/* Argumentation Interface */}
      {renderArgumentationInterface()}

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <VirtualizedMessageList 
          messages={messages} 
          isLoading={isLoading}
          height={messagesHeight}
        />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <FilePreview 
              file={selectedFile} 
              onRemove={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            />
            <Button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || (!inputMessage.trim() && !selectedFile)}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
};

export default ChatInterface;
