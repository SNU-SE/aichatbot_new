
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, ArrowLeft, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  sender: 'student' | 'bot';
  message: string;
  timestamp: string;
}

interface Activity {
  id: string;
  title: string;
  type: string;
  content: any;
}

interface ChatInterfaceProps {
  activity: Activity;
  studentId: string;
  onBack: () => void;
}

const ChatInterface = ({ activity, studentId, onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatHistory();
  }, [activity.id, studentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activity.id)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
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

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // AI 채팅 API 호출
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMessage,
          studentId: studentId,
          activityId: activity.id
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // 대화 기록 새로고침
      await fetchChatHistory();

    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "메시지 전송에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 활동 정보 헤더 */}
      <Card className="border-0 shadow-md">
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
              className="border-[rgb(15,15,112)] text-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 채팅 영역 */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          {/* 메시지 목록 */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
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

          {/* 메시지 입력 영역 */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
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
