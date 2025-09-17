
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
        .select('*, activity_class_assignments(class_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: documentRows } = await supabase
        .from('activity_document_details')
        .select('activity_id');

      const documentCountMap = (documentRows || []).reduce<Record<string, number>>((acc, row: any) => {
        const activityId = row.activity_id;
        if (!activityId) return acc;
        acc[activityId] = (acc[activityId] || 0) + 1;
        return acc;
      }, {});

      const normalizedActivities: Activity[] = (data || []).map((activity: any) => {
        const assignments = activity.activity_class_assignments || [];

        const assignedClasses = assignments
          .map((assignment: { class_name: string | null }) => assignment.class_name)
          .filter((className: string | null): className is string => Boolean(className));

        const allowAllClasses = assignedClasses.length === 0;

        return {
          id: activity.id,
          title: activity.title,
          type: activity.type,
          content: activity.content,
          final_question: activity.final_question,
          modules_count: activity.modules_count,
          created_at: activity.created_at,
          is_hidden: activity.is_hidden,
          assignedClasses,
          allowAllClasses,
          documentCount: documentCountMap[activity.id] || 0
        } as Activity;
      });

      setActivities(normalizedActivities);
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
