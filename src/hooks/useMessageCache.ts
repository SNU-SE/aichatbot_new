
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  sender: 'student' | 'bot';
  message: string;
  timestamp: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

interface UseMessageCacheProps {
  studentId: string;
  activityId: string;
}

interface ChatResponse {
  success: boolean;
  response: string;
  provider?: string;
  model?: string;
  questionCount?: number;
  ragUsed?: boolean;
  combinedResponse?: boolean;
}

export const useMessageCache = ({ studentId, activityId }: UseMessageCacheProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `messages_${studentId}_${activityId}`;

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 캐시에서 먼저 확인
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedMessages = JSON.parse(cached);
        setMessages(cachedMessages);
      }

      // 서버에서 최신 데이터 가져오기
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activityId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
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
      
      // 캐시 업데이트
      localStorage.setItem(cacheKey, JSON.stringify(typedMessages));
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, activityId, cacheKey]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const updated = [...prev, message];
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      return updated;
    });
  }, [cacheKey]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
    setMessages([]);
  }, [cacheKey]);

  // 질문 빈도 정보 가져오기
  const getQuestionFrequency = useCallback(async (question: string) => {
    try {
      // 간단한 해시 생성 (실제로는 utils에서 가져와야 함)
      const generateHash = (text: string) => {
        const normalized = text.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, ' ').trim();
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
          const char = normalized.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      };

      const questionHash = generateHash(question);
      
      const { data, error } = await supabase
        .from('question_frequency')
        .select('count')
        .eq('student_id', studentId)
        .eq('activity_id', activityId)
        .eq('question_hash', questionHash)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting question frequency:', error);
        return 0;
      }

      return data?.count || 0;
    } catch (error) {
      console.error('Error in getQuestionFrequency:', error);
      return 0;
    }
  }, [studentId, activityId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    addMessage,
    clearCache,
    getQuestionFrequency
  };
};

export default useMessageCache;
