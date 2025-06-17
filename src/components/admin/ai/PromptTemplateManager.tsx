
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, MessageSquare, Copy, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromptTemplateManagerProps {
  selectedClass: string;
  templates: any[];
  classSettings: any[];
  onTemplatesUpdate: () => void;
  onClassSettingsUpdate: () => void;
}

const PromptTemplateManager = ({ 
  selectedClass, 
  templates, 
  classSettings, 
  onTemplatesUpdate, 
  onClassSettingsUpdate 
}: PromptTemplateManagerProps) => {
  const { toast } = useToast();

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    prompt: '',
    category: 'general',
    target_class: selectedClass
  });
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const getActiveTemplate = () => {
    if (!selectedClass) return null;
    const classSetting = classSettings.find(cs => cs.class_name === selectedClass);
    if (classSetting && classSetting.active_prompt_id) {
      return templates.find(t => t.id === classSetting.active_prompt_id);
    }
    return null;
  };

  const getFilteredTemplates = () => {
    if (!selectedClass) return [];
    return templates.filter(t => t.target_class === selectedClass);
  };

  const saveTemplate = async () => {
    try {
      if (isEditing && selectedTemplate) {
        const { error } = await supabase
          .from('prompt_templates')
          .update({
            name: newTemplate.name,
            prompt: newTemplate.prompt,
            category: newTemplate.category,
            target_class: newTemplate.target_class
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prompt_templates')
          .insert([{
            name: newTemplate.name,
            prompt: newTemplate.prompt,
            category: newTemplate.category,
            target_class: newTemplate.target_class
          }]);

        if (error) throw error;
      }

      await onTemplatesUpdate();
      setNewTemplate({ name: '', prompt: '', category: 'general', target_class: selectedClass });
      setSelectedTemplate(null);
      setIsEditing(false);

      toast({
        title: "성공",
        description: `프롬프트 템플릿이 ${isEditing ? '수정' : '저장'}되었습니다.`
      });
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "오류",
        description: "프롬프트 템플릿 저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await onTemplatesUpdate();
      toast({
        title: "성공",
        description: "프롬프트 템플릿이 삭제되었습니다."
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: "오류",
        description: "프롬프트 템플릿 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const activateTemplate = async (template: any) => {
    if (!selectedClass) return;
    
    try {
      const existingSetting = classSettings.find(cs => cs.class_name === selectedClass);
      
      if (existingSetting) {
        const { error } = await supabase
          .from('class_prompt_settings')
          .update({
            active_prompt_id: template.id,
            system_prompt: template.prompt,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSetting.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_prompt_settings')
          .insert([{
            class_name: selectedClass,
            active_prompt_id: template.id,
            system_prompt: template.prompt
          }]);

        if (error) throw error;
      }

      await onClassSettingsUpdate();
      
      toast({
        title: "성공",
        description: `'${template.name}' 템플릿이 ${selectedClass} 클래스에 활성화되었습니다.`
      });
    } catch (error: any) {
      console.error('Error activating template:', error);
      toast({
        title: "오류",
        description: "템플릿 활성화에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const editTemplate = (template: any) => {
    setSelectedTemplate(template);
    setNewTemplate({
      name: template.name,
      prompt: template.prompt,
      category: template.category,
      target_class: template.target_class || selectedClass
    });
    setIsEditing(true);
  };

  const copyTemplate = (template: any) => {
    setNewTemplate({
      name: `${template.name} (복사본)`,
      prompt: template.prompt,
      category: template.category,
      target_class: selectedClass
    });
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const cancelEdit = () => {
    setNewTemplate({ name: '', prompt: '', category: 'general', target_class: selectedClass });
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  if (!selectedClass) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 템플릿 생성/편집 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>{isEditing ? '프롬프트 템플릿 편집' : '새 프롬프트 템플릿'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template-name">템플릿 이름</Label>
            <Input
              id="template-name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              placeholder="템플릿 이름을 입력하세요"
            />
          </div>

          <div>
            <Label htmlFor="template-category">카테고리</Label>
            <Select
              value={newTemplate.category}
              onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">일반</SelectItem>
                <SelectItem value="math">수학</SelectItem>
                <SelectItem value="science">과학</SelectItem>
                <SelectItem value="language">언어</SelectItem>
                <SelectItem value="creative">창의적 사고</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="template-prompt">프롬프트 내용</Label>
            <Textarea
              id="template-prompt"
              value={newTemplate.prompt}
              onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
              placeholder="AI에게 전달할 프롬프트를 입력하세요..."
              rows={8}
            />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={saveTemplate}
              disabled={!newTemplate.name || !newTemplate.prompt}
              className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? '수정' : '저장'}
            </Button>
            {isEditing && (
              <Button variant="outline" onClick={cancelEdit}>
                취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 템플릿 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>{selectedClass} 클래스 프롬프트 템플릿</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {getFilteredTemplates().map((template) => {
              const activeTemplate = getActiveTemplate();
              const isActive = activeTemplate?.id === template.id;
              
              return (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg hover:bg-gray-50 ${
                    isActive ? 'ring-2 ring-[rgb(15,15,112)] bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        {isActive && (
                          <CheckCircle className="h-4 w-4 text-[rgb(15,15,112)]" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span className="capitalize">{template.category}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {template.prompt.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex flex-col space-y-1 ml-2">
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyTemplate(template)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editTemplate(template)}
                        >
                          편집
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {!isActive && (
                        <Button
                          size="sm"
                          onClick={() => activateTemplate(template)}
                          className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90 text-white text-xs"
                        >
                          활성화
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {getFilteredTemplates().length === 0 && (
              <p className="text-center text-gray-500 py-8">
                {selectedClass} 클래스에 저장된 프롬프트 템플릿이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptTemplateManager;
