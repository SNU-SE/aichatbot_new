
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

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    addMessage,
    clearCache
  };
};

export default useMessageCache;
