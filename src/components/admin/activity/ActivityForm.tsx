
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ModuleManager from './ModuleManager';
import ChecklistManager from './ChecklistManager';
import { Activity, Module, ChecklistItem, ActivityFormData } from '@/types/activity';

interface ActivityFormProps {
  editingActivity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
  saveExperimentData: (activityId: string, modules: Module[]) => Promise<void>;
  saveChecklistData: (activityId: string, checklist: ChecklistItem[]) => Promise<void>;
}

const ActivityForm = ({ 
  editingActivity, 
  onClose, 
  onSuccess, 
  saveExperimentData, 
  saveChecklistData 
}: ActivityFormProps) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ActivityFormData>({
    title: editingActivity?.title || '',
    type: editingActivity?.type || 'experiment',
    final_question: editingActivity?.final_question || '',
    modules_count: editingActivity?.modules_count || 1,
    file_url: editingActivity?.file_url || ''
  });

  const [modules, setModules] = useState<Module[]>([
    { module_number: 1, title: '', steps: [{ step_number: 1, description: '' }] }
  ]);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { step_number: 1, description: '' }
  ]);

  // 기존 활동 데이터 로드
  useEffect(() => {
    if (editingActivity) {
      loadActivityData(editingActivity.id);
    }
  }, [editingActivity]);

  const loadActivityData = async (activityId: string) => {
    try {
      // 모듈 데이터 로드 (실험 활동인 경우)
      if (editingActivity?.type === 'experiment') {
        const { data: moduleData, error: moduleError } = await supabase
          .from('activity_modules')
          .select('*')
          .eq('activity_id', activityId)
          .order('module_number');

        if (moduleError) throw moduleError;

        if (moduleData && moduleData.length > 0) {
          const loadedModules: Module[] = [];
          
          for (const module of moduleData) {
            const { data: stepData, error: stepError } = await supabase
              .from('checklist_items')
              .select('*')
              .eq('module_id', module.id)
              .order('step_number');

            if (stepError) throw stepError;

            loadedModules.push({
              id: module.id,
              module_number: module.module_number,
              title: module.title,
              steps: stepData || [{ step_number: 1, description: '' }]
            });
          }
          
          setModules(loadedModules);
        }
      } else {
        // 체크리스트 데이터 로드 (논증, 토의 활동인 경우)
        const { data: checklistData, error: checklistError } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('activity_id', activityId)
          .is('module_id', null)
          .order('step_number');

        if (checklistError) throw checklistError;

        if (checklistData && checklistData.length > 0) {
          setChecklist(checklistData);
        }
      }
    } catch (error) {
      console.error('활동 데이터 로드 오류:', error);
      toast({
        title: "오류",
        description: "활동 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let activityData = {
        title: formData.title,
        type: formData.type,
        content: {},
        file_url: formData.file_url || null,
        final_question: formData.type === 'argumentation' ? formData.final_question : null,
        modules_count: formData.type === 'experiment' ? formData.modules_count : null
      };

      let activityId: string;

      if (editingActivity) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', editingActivity.id);

        if (error) throw error;
        activityId = editingActivity.id;
        
        // 기존 모듈과 체크리스트 삭제
        await supabase.from('checklist_items').delete().eq('activity_id', activityId);
        await supabase.from('activity_modules').delete().eq('activity_id', activityId);
      } else {
        const { data, error } = await supabase
          .from('activities')
          .insert([activityData])
          .select()
          .single();

        if (error) throw error;
        activityId = data.id;
      }

      // 활동 타입에 따라 세부 데이터 저장
      if (formData.type === 'experiment') {
        await saveExperimentData(activityId, modules);
      } else if (formData.type === 'argumentation' || formData.type === 'discussion') {
        await saveChecklistData(activityId, checklist);
      }

      toast({
        title: "성공",
        description: editingActivity ? "활동이 수정되었습니다." : "새 활동이 생성되었습니다."
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "작업을 완료할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {editingActivity ? '활동 수정' : '새 활동 생성'}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">활동 제목</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                placeholder="예: 물의 상태 변화 실험"
              />
            </div>
            <div>
              <Label htmlFor="type">활동 유형</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="experiment">실험</SelectItem>
                  <SelectItem value="argumentation">논증</SelectItem>
                  <SelectItem value="discussion">토의</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="file_url">관련 파일 첨부 (RAG용 PDF)</Label>
            <Input
              id="file_url"
              value={formData.file_url}
              onChange={(e) => setFormData({...formData, file_url: e.target.value})}
              placeholder="PDF 파일 URL 입력"
            />
          </div>

          {formData.type === 'argumentation' && (
            <div>
              <Label htmlFor="final_question">최종 질문</Label>
              <Textarea
                id="final_question"
                value={formData.final_question}
                onChange={(e) => setFormData({...formData, final_question: e.target.value})}
                placeholder="논증 활동의 최종 질문을 입력하세요"
                required
              />
            </div>
          )}

          {formData.type === 'experiment' && (
            <ModuleManager modules={modules} setModules={setModules} />
          )}

          {(formData.type === 'argumentation' || formData.type === 'discussion') && (
            <ChecklistManager checklist={checklist} setChecklist={setChecklist} />
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button 
              type="submit"
              className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
            >
              {editingActivity ? '수정' : '생성'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ActivityForm;
