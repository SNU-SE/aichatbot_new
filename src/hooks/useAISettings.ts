
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminSettings {
  id: string;
  selected_provider: string | null;
  selected_model: string | null;
  system_prompt: string | null;
  rag_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  category: string;
  target_class: string | null;
  created_at: string;
}

interface ClassPromptSetting {
  id: string;
  class_name: string;
  active_prompt_id: string | null;
  system_prompt: string | null;
  selected_provider: string | null;
  selected_model: string | null;
  rag_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useAISettings = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [classSettings, setClassSettings] = useState<ClassPromptSetting[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      toast({
        title: "오류",
        description: "설정을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: "오류",
        description: "프롬프트 템플릿을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('class_name');

      if (error) throw error;
      const uniqueClasses = [...new Set((data || []).map(item => item.class_name).filter(Boolean))] as string[];
      setClasses(uniqueClasses);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchClassSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('class_prompt_settings')
        .select('*')
        .order('class_name');

      if (error) throw error;
      setClassSettings(data || []);
    } catch (error: any) {
      console.error('Error fetching class settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
    fetchClasses();
    fetchClassSettings();
  }, []);

  return {
    settings,
    templates,
    classSettings,
    classes,
    loading,
    saving,
    setSaving,
    fetchSettings,
    fetchTemplates,
    fetchClasses,
    fetchClassSettings,
    setSettings,
    setTemplates,
    setClassSettings,
    setClasses
  };
};
