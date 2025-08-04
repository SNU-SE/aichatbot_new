
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
      // 학생 ID 정규화
      const normalizedStudentId = String(studentId).trim();
      
      if (!normalizedStudentId) {
        console.error('Invalid student ID for recovery:', studentId);
        return false;
      }

      console.log('Attempting session recovery for normalized ID:', normalizedStudentId);

      // 학생 등록 상태 확인 (정확한 문자열 매칭)
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', normalizedStudentId)
        .single();

      if (error || !student) {
        console.error('Student verification failed:', error, 'for ID:', normalizedStudentId);
        // 유효하지 않은 세션 데이터 정리
        localStorage.removeItem('userType');
        localStorage.removeItem('studentId');
        return false;
      }

      console.log('Session recovery - Student found:', student.student_id);

      // localStorage 데이터 정규화
      localStorage.setItem('studentId', student.student_id);
      localStorage.setItem('userType', 'student');

      // 세션 업데이트
      await updateSession(student.student_id);
      
      toast({
        title: "세션 복구 완료",
        description: "로그인 상태가 복구되었습니다."
      });
      
      return true;
    } catch (error) {
      console.error('Session recovery failed:', error);
      // 오류 시 세션 데이터 정리
      localStorage.removeItem('userType');
      localStorage.removeItem('studentId');
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
      // 학생 ID 정규화
      const normalizedStudentId = String(studentId).trim();
      
      if (!normalizedStudentId) {
        console.error('Invalid student ID for session update:', studentId);
        return;
      }

      console.log('Updating session for normalized ID:', normalizedStudentId);

      const { error } = await supabase.rpc('update_student_session', {
        student_id_param: normalizedStudentId
      });
      
      if (error) {
        console.error('Session update failed:', error);
      } else {
        console.log('Session updated successfully for:', normalizedStudentId);
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

  // 주기적으로 세션 업데이트 (5분마다) 및 만료된 세션 정리 (30분마다)
  useEffect(() => {
    const rawStudentId = localStorage.getItem('studentId');
    const normalizedStudentId = rawStudentId ? String(rawStudentId).trim() : null;
    
    if (!normalizedStudentId) return;

    // 학생 ID 정규화 저장 (불일치 방지)
    if (rawStudentId !== normalizedStudentId) {
      localStorage.setItem('studentId', normalizedStudentId);
    }

    // 세션 업데이트 인터벌
    const sessionInterval = setInterval(() => {
      updateSession(normalizedStudentId);
    }, 5 * 60 * 1000); // 5분

    // 만료된 세션 정리 인터벌
    const cleanupInterval = setInterval(async () => {
      try {
        const { data } = await supabase.rpc('cleanup_expired_sessions_with_logging');
        if (data && data.length > 0) {
          const result = data[0];
          if (result.cleaned_count > 0) {
            console.log('Cleaned up expired sessions:', result.cleaned_count, 'Session IDs:', result.session_ids);
            
            // 현재 사용자가 정리된 세션에 포함되어 있으면 로그아웃 처리
            if (result.session_ids.includes(normalizedStudentId)) {
              console.log('Current user session expired, cleaning up localStorage');
              localStorage.removeItem('userType');
              localStorage.removeItem('studentId');
              toast({
                title: "세션 만료",
                description: "2시간 동안 활동이 없어 자동 로그아웃되었습니다.",
                variant: "destructive"
              });
              setTimeout(() => {
                window.location.href = '/auth';
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error('Session cleanup failed:', error);
      }
    }, 30 * 60 * 1000); // 30분

    return () => {
      clearInterval(sessionInterval);
      clearInterval(cleanupInterval);
    };
  }, [updateSession, toast]);

  return {
    isRecovering,
    recoverSession,
    updateSession,
    saveDraft,
    loadDraft
  };
};
