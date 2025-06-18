import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, ArrowLeft, BookOpen, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

interface ChatInterfaceProps {
  activity: any;
  studentId: string;
  onBack: () => void;
  checklistContext?: {
    currentStep: string;
    allSteps: any[];
  };
}

const ChatInterface = ({ activity, studentId, onBack, checklistContext }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [motherTongue, setMotherTongue] = useState<string>('Korean');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudentInfo();
    fetchChatHistory();
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
              <BookOpen className="h-6 w-6" />
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
