
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  step_number: number;
  description: string;
  module_id?: string;
  is_completed: boolean;
  completed_at?: string;
}

interface UseChecklistProgressProps {
  studentId: string;
  activityId: string;
}

export const useChecklistProgress = ({ studentId, activityId }: UseChecklistProgressProps) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [motherTongue, setMotherTongue] = useState<string>('Korean');
  const { toast } = useToast();

  const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    if (targetLanguage === 'Korean') {
      return text;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `Translate the following Korean text to ${targetLanguage}. Only return the translation, nothing else: "${text}"`,
          studentId: studentId,
          activityId: activityId,
          motherTongue: targetLanguage,
          isTranslationRequest: true,
          translationModel: 'gpt-4o-mini-2024-07-18'
        }
      });

      if (error) {
        console.error('Translation error:', error);
        return text; // 번역 실패 시 원본 반환
      }

      const translatedText = data?.response || text;
      return `${translatedText} / ${text}`;
    } catch (error) {
      console.error('Translation request failed:', error);
      return text; // 번역 실패 시 원본 반환
    }
  };

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true);
      
      const storedProfile = typeof window !== 'undefined'
        ? localStorage.getItem('studentProfile')
        : null;
      const studentProfile = storedProfile ? JSON.parse(storedProfile) : null;
      const currentMotherTongue = studentProfile?.mother_tongue || 'Korean';
      setMotherTongue(currentMotherTongue);
      
      // Get checklist items for the activity
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('activity_id', activityId)
        .order('step_number', { ascending: true });

      if (checklistError) throw checklistError;

      // Get student progress
      const { data: progressData, error: progressError } = await supabase
        .from('student_checklist_progress')
        .select('*')
        .eq('student_id', studentId);

      if (progressError) throw progressError;

      // Translate descriptions if needed and combine data
      const combinedItems: ChecklistItem[] = [];
      
      for (const item of checklistData || []) {
        const progress = progressData?.find(p => p.checklist_item_id === item.id);
        
        // Translate description if student's mother tongue is not Korean
        let translatedDescription = item.description;
        if (currentMotherTongue && currentMotherTongue !== 'Korean') {
          translatedDescription = await translateText(item.description, currentMotherTongue);
        }
        
        combinedItems.push({
          ...item,
          description: translatedDescription,
          is_completed: progress?.is_completed || false,
          completed_at: progress?.completed_at
        });
      }

      setItems(combinedItems);
    } catch (error: any) {
      console.error('Checklist fetch error:', error);
      toast({
        title: "오류",
        description: "체크리스트를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [studentId, activityId, toast]);

  const toggleItem = async (itemId: string) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const newCompletedState = !item.is_completed;
      
      if (newCompletedState) {
        // Mark as completed - 트리거가 자동으로 히스토리에 저장
        const { error } = await supabase
          .from('student_checklist_progress')
          .upsert({
            student_id: studentId,
            checklist_item_id: itemId,
            is_completed: true,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,checklist_item_id'
          });

        if (error) throw error;
      } else {
        // Mark as incomplete
        const { error } = await supabase
          .from('student_checklist_progress')
          .update({
            is_completed: false,
            completed_at: null
          })
          .eq('student_id', studentId)
          .eq('checklist_item_id', itemId);

        if (error) throw error;
      }

      // Update local state
      setItems(prev => prev.map(i => 
        i.id === itemId 
          ? { ...i, is_completed: newCompletedState, completed_at: newCompletedState ? new Date().toISOString() : undefined }
          : i
      ));

      toast({
        title: "성공",
        description: newCompletedState ? "항목이 완료되었습니다." : "항목이 미완료로 변경되었습니다."
      });

    } catch (error: any) {
      console.error('Toggle item error:', error);
      toast({
        title: "오류",
        description: "상태 변경에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  return {
    items,
    loading,
    motherTongue,
    toggleItem,
    refetch: fetchChecklist
  };
};
