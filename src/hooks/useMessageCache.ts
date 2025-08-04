
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
      
      // 강화된 중복 제거 적용
      const uniqueMessages = removeDuplicateMessages(typedMessages);
      
      console.log('useMessageCache - 메시지 로드 완료:', uniqueMessages.length, '개');
      setMessages(uniqueMessages);
      
      // 캐시 업데이트
      localStorage.setItem(cacheKey, JSON.stringify(uniqueMessages));
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, activityId, cacheKey]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      console.log('useMessageCache - 메시지 추가 시도:', message.id, message.message.substring(0, 50));
      
      // ID 기반 중복 확인 (최우선)
      if (message.id && !message.id.startsWith('temp-')) {
        const existsById = prev.some(m => m.id === message.id);
        if (existsById) {
          console.warn('useMessageCache - 중복 ID 감지:', message.id);
          return prev;
        }
      }
      
      // 내용+발송자+시간 기반 중복 확인 (보조)
      const duplicateByContent = prev.some(m => 
        m.message === message.message && 
        m.sender === message.sender && 
        Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 500
      );
      
      if (duplicateByContent) {
        console.warn('useMessageCache - 중복 내용 감지:', message.message.substring(0, 30));
        return prev;
      }
      
      // 중복 제거된 배열 생성
      const updated = [...prev, message];
      const deduplicated = removeDuplicateMessages(updated);
      localStorage.setItem(cacheKey, JSON.stringify(deduplicated));
      return deduplicated;
    });
  }, [cacheKey]);

  // 중복 제거 유틸리티 함수
  const removeDuplicateMessages = (messages: Message[]) => {
    const seen = new Set<string>();
    const result: Message[] = [];
    
    for (const message of messages) {
      // ID 기반 중복 제거 (우선순위)
      if (message.id && !message.id.startsWith('temp-') && seen.has(message.id)) {
        continue;
      }
      
      // 내용+발송자+시간 기반 중복 제거 (보조)
      const contentKey = `${message.message}-${message.sender}-${Math.floor(new Date(message.timestamp).getTime() / 1000)}`;
      if (seen.has(contentKey)) {
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
