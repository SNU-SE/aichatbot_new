
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
  isOptimistic?: boolean;
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

const sortMessages = (messageList: Message[]) =>
  [...messageList].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

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
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const { toast } = useToast();

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const next = sortMessages(updater(prev));
      messagesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 실시간 메시지 구독 설정 (학생별 필터링 추가)
  useEffect(() => {
    console.log('🔔 실시간 구독 설정:', activity.id, studentId);
    
    const channel = supabase
      .channel(`chat_${activity.id}_${studentId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_logs',
          filter: `activity_id=eq.${activity.id},student_id=eq.${studentId}`  // 중요: 학생 ID로도 필터링
        },
        (payload: any) => {
          console.log('🔔 실시간 메시지 수신:', payload.new.id, payload.new.sender, payload.new.message.substring(0, 30));
          
          // 추가 보안: 수신된 메시지가 현재 학생의 것인지 다시 한번 확인
          if (payload.new.student_id !== studentId) {
            console.log('⚠️ 다른 학생의 메시지, 무시:', payload.new.student_id, '!==', studentId);
            return;
          }

          if (payload.new.activity_id !== activity.id) {
            console.log('⚠️ 다른 활동의 메시지, 무시:', payload.new.activity_id, '!==', activity.id);
            return;
          }
          
          const newMessage: Message = {
            id: payload.new.id,
            message: payload.new.message,
            sender: payload.new.sender as 'student' | 'bot',
            timestamp: payload.new.timestamp,
            file_url: payload.new.file_url,
            file_name: payload.new.file_name,
            file_type: payload.new.file_type
          };
          
          // 낙관적 메시지와의 중복을 포함해 정교하게 병합
          updateMessages(prev => {
            const next = [...prev];
            const existingIndex = next.findIndex(m => m.id === newMessage.id);
            if (existingIndex !== -1) {
              next[existingIndex] = { ...next[existingIndex], ...newMessage, isOptimistic: false };
              return next;
            }

            const optimisticIndex = next.findIndex(
              m =>
                m.isOptimistic &&
                m.sender === newMessage.sender &&
                m.message.trim() === (newMessage.message || '').trim()
            );

            if (optimisticIndex !== -1) {
              next[optimisticIndex] = { ...newMessage, isOptimistic: false };
              return next;
            }

            console.log('✅ 새 메시지 추가:', newMessage.id);
            next.push({ ...newMessage, isOptimistic: false });
            return next;
          });
        }
      )
      .subscribe();

    // 초기 메시지 로드
    fetchMessages();

    return () => {
      console.log('🔔 실시간 구독 해제');
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
      const deduped = removeDuplicateMessages(messages);
      messagesRef.current = deduped;
      setMessages(deduped);
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

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() && !selectedFile) return;
    
    // 강화된 중복 전송 방지
    if (isSending) {
      console.log('⚠️ 메시지 전송 중복 방지:', inputMessage.substring(0, 20));
      return;
    }

    const currentMessage = inputMessage.trim();
    let tempStudentMessageId: string | null = null;
    
    // 최근 5초 내 동일한 메시지가 있는지 사전 확인
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentMessages } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('activity_id', activity.id)
      .eq('message', currentMessage)
      .gte('timestamp', fiveSecondsAgo);
    
    if (recentMessages && recentMessages.length > 0) {
      console.log('⚠️ 최근 5초 내 동일한 메시지 존재, 전송 취소:', currentMessage.substring(0, 30));
      setIsSending(false);
      return;
    }

    console.log('📤 메시지 전송 시작:', currentMessage.substring(0, 50));
    setIsSending(true);
    
    // UI 즉시 업데이트
    setInputMessage('');
    setIsLoading(true);

    try {
      let file_url = null;
      let file_name = null;
      let file_type = null;

      // 파일 업로드 처리
      if (selectedFile) {
        console.log('📎 파일 업로드 시작:', selectedFile.name);
        const filePath = `chat_files/${studentId}/${activity.id}/${Date.now()}-${selectedFile.name}`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('chat_files')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        file_url = `${supabase.storage.from('chat_files').getPublicUrl('').data.publicUrl}/${data.path}`;
        file_name = selectedFile.name;
        file_type = selectedFile.type;
        console.log('✅ 파일 업로드 완료:', file_url);
      }

      const tempId = `temp-${Date.now()}`;
      tempStudentMessageId = tempId;
      const sentAt = new Date().toISOString();

      const optimisticMessage: Message = {
        id: tempId,
        message: currentMessage,
        sender: 'student',
        timestamp: sentAt,
        file_url: file_url || undefined,
        file_name: file_name || undefined,
        file_type: file_type || undefined,
        isOptimistic: true,
      };

      updateMessages(prev => [...prev, optimisticMessage]);

      // 단일 데이터베이스 삽입 (낙관적 업데이트 없이, 실시간 구독으로만 처리)
      console.log('💾 DB 저장 시작:', currentMessage.substring(0, 30));
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

      if (error) {
        console.error('❌ DB 저장 실패:', error);
        throw error;
      }

      console.log('✅ DB 저장 완료:', log.id);

      const persistedMessage: Message = {
        id: log.id,
        message: log.message,
        sender: log.sender as 'student' | 'bot',
        timestamp: log.timestamp,
        file_url: log.file_url,
        file_name: log.file_name,
        file_type: log.file_type,
        isOptimistic: false,
      };

      updateMessages(prev =>
        prev.map(msg => (msg.id === tempId ? persistedMessage : msg))
      );

      // 파일 관련 상태 초기화
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // AI 챗봇 응답 생성 (메시지 저장 완료 후)
      console.log('🤖 AI 응답 요청 시작');
      try {
        // 현재 메시지를 포함한 대화 히스토리 구성
        const recentMessages = sortMessages([...messagesRef.current])
          .slice(-10)
          .map(msg => ({
          role: msg.sender === 'student' ? 'user' : 'assistant',
          content: msg.message
        }));

        const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-chat', {
          body: {
            message: currentMessage,
            studentId: studentId,
            activityId: activity.id,
            fileUrl: file_url,
            fileName: file_name,
            fileType: file_type,
            conversationHistory: recentMessages
          }
        });

        if (aiError) throw aiError;
        console.log('✅ AI 응답 요청 완료');

        if (aiResponse?.response) {
          const botMessage: Message = {
            id: `temp-bot-${Date.now()}`,
            message: aiResponse.response,
            sender: 'bot',
            timestamp: new Date().toISOString(),
            isOptimistic: true,
          };

          updateMessages(prev => [...prev, botMessage]);
        }

      } catch (aiError) {
        console.error('❌ AI 응답 생성 실패:', aiError);
        toast({
          title: "AI 응답 실패",
          description: "AI가 응답을 생성하지 못했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
      
      // 실패 시 입력 복원
      setInputMessage(currentMessage);
      if (tempStudentMessageId) {
        const failedId = tempStudentMessageId;
        updateMessages(prev => prev.filter(msg => msg.id !== failedId));
      }
      
      toast({
        title: "메시지 전송 실패",
        description: "메시지를 보내는 동안 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsSending(false);
      console.log('📤 메시지 전송 완료');
    }
  }, [inputMessage, selectedFile, isSending, studentId, activity.id, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

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
