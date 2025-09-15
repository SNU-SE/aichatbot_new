import { useCallback } from 'react';
import { AnalyticsService } from '@/services/analyticsService';
import { supabase } from '@/integrations/supabase/client';

export const useAnalyticsTracking = () => {
  const trackDocumentView = useCallback(async (documentId: string, metadata?: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await AnalyticsService.trackDocumentUsage({
        document_id: documentId,
        user_id: user?.id,
        action_type: 'view',
        metadata
      });
    } catch (error) {
      console.warn('Failed to track document view:', error);
    }
  }, []);

  const trackDocumentDownload = useCallback(async (documentId: string, metadata?: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await AnalyticsService.trackDocumentUsage({
        document_id: documentId,
        user_id: user?.id,
        action_type: 'download',
        metadata
      });
    } catch (error) {
      console.warn('Failed to track document download:', error);
    }
  }, []);

  const trackDocumentChatReference = useCallback(async (documentId: string, sessionId?: string, metadata?: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await AnalyticsService.trackDocumentUsage({
        document_id: documentId,
        user_id: user?.id,
        action_type: 'chat_reference',
        session_id: sessionId,
        metadata
      });
    } catch (error) {
      console.warn('Failed to track document chat reference:', error);
    }
  }, []);

  const trackChatSession = useCallback(async (
    sessionId: string, 
    messageCount?: number,
    documentsReferenced?: string[],
    sessionDuration?: number,
    satisfactionScore?: number,
    topics?: string[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await AnalyticsService.trackChatSession({
        session_id: sessionId,
        user_id: user?.id,
        message_count: messageCount,
        documents_referenced: documentsReferenced,
        session_duration_minutes: sessionDuration,
        satisfaction_score: satisfactionScore,
        topics
      });
    } catch (error) {
      console.warn('Failed to track chat session:', error);
    }
  }, []);

  return {
    trackDocumentView,
    trackDocumentDownload,
    trackDocumentChatReference,
    trackChatSession
  };
};

export default useAnalyticsTracking;