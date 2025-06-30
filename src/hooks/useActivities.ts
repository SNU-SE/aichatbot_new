
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, Module, ChecklistItem } from '@/types/activity';

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      toast({
        title: "오류",
        description: "활동 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveExperimentData = async (activityId: string, modules: Module[]) => {
    for (const module of modules) {
      const { data: moduleData, error: moduleError } = await supabase
        .from('activity_modules')
        .insert({
          activity_id: activityId,
          module_number: module.module_number,
          title: module.title
        })
        .select()
        .single();

      if (moduleError) throw moduleError;

      for (const step of module.steps) {
        await supabase
          .from('checklist_items')
          .insert({
            activity_id: activityId,
            module_id: moduleData.id,
            step_number: step.step_number,
            description: step.description
          });
      }
    }
  };

  const saveChecklistData = async (activityId: string, checklist: ChecklistItem[]) => {
    for (const item of checklist) {
      await supabase
        .from('checklist_items')
        .insert({
          activity_id: activityId,
          step_number: item.step_number,
          description: item.description
        });
    }
  };

  // 기존 deleteActivity 함수는 제거하고 fetchActivities만 반환
  // 삭제는 ActivityDeleteDialog에서 직접 처리

  useEffect(() => {
    fetchActivities();
  }, []);

  return {
    activities,
    loading,
    fetchActivities,
    saveExperimentData,
    saveChecklistData
  };
};
