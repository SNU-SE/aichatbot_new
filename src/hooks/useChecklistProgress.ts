
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
  const { toast } = useToast();

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true);
      
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

      // Combine data
      const combinedItems = (checklistData || []).map(item => {
        const progress = progressData?.find(p => p.checklist_item_id === item.id);
        return {
          ...item,
          is_completed: progress?.is_completed || false,
          completed_at: progress?.completed_at
        };
      });

      setItems(combinedItems);
    } catch (error: any) {
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
        // Mark as completed
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
    toggleItem,
    refetch: fetchChecklist
  };
};
