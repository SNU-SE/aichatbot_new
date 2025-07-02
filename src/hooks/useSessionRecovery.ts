
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionRecoveryHook {
  isRecovering: boolean;
  recoverSession: (studentId: string) => Promise<boolean>;
  updateSession: (studentId: string) => Promise<void>;
  saveDraft: (studentId: string, activityId: string, workType: string, content: any) => Promise<void>;
  loadDraft: (studentId: string, activityId: string, workType: string) => Promise<any>;
}

export const useSessionRecovery = (): SessionRecoveryHook => {
  const [isRecovering, setIsRecovering] = useState(false);
  const { toast } = useToast();

  const recoverSession = useCallback(async (studentId: string): Promise<boolean> => {
    setIsRecovering(true);
    try {
      // 학생 등록 상태 확인
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error || !student) {
        console.error('Student verification failed:', error);
        return false;
      }

      // 세션 업데이트
      await updateSession(studentId);
      
      toast({
        title: "세션 복구 완료",
        description: "로그인 상태가 복구되었습니다."
      });
      
      return true;
    } catch (error) {
      console.error('Session recovery failed:', error);
      toast({
        title: "세션 복구 실패",
        description: "네트워크 연결을 확인하고 다시 시도해주세요.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [toast]);

  const updateSession = useCallback(async (studentId: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('update_student_session', {
        student_id_param: studentId
      });
      
      if (error) {
        console.error('Session update failed:', error);
      }
    } catch (error) {
      console.error('Session update error:', error);
    }
  }, []);

  const saveDraft = useCallback(async (
    studentId: string, 
    activityId: string, 
    workType: string, 
    content: any
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('student_work_drafts')
        .upsert({
          student_id: studentId,
          activity_id: activityId,
          work_type: workType,
          draft_content: content,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,activity_id,work_type'
        });

      if (error) {
        console.error('Draft save failed:', error);
      }
    } catch (error) {
      console.error('Draft save error:', error);
    }
  }, []);

  const loadDraft = useCallback(async (
    studentId: string, 
    activityId: string, 
    workType: string
  ): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('student_work_drafts')
        .select('draft_content')
        .eq('student_id', studentId)
        .eq('activity_id', activityId)
        .eq('work_type', workType)
        .single();

      if (error || !data) {
        return null;
      }

      return data.draft_content;
    } catch (error) {
      console.error('Draft load error:', error);
      return null;
    }
  }, []);

  // 주기적으로 세션 업데이트 (5분마다)
  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) return;

    const interval = setInterval(() => {
      updateSession(studentId);
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [updateSession]);

  return {
    isRecovering,
    recoverSession,
    updateSession,
    saveDraft,
    loadDraft
  };
};
