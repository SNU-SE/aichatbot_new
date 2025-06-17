
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  category: string;
  created_at: string;
}

const PromptManagement = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    prompt: '',
    category: 'general'
  });
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

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

  const saveTemplate = async () => {
    try {
      if (isEditing && selectedTemplate) {
        const { error } = await supabase
          .from('prompt_templates')
          .update({
            name: newTemplate.name,
            prompt: newTemplate.prompt,
            category: newTemplate.category
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prompt_templates')
          .insert([{
            name: newTemplate.name,
            prompt: newTemplate.prompt,
            category: newTemplate.category
          }]);

        if (error) throw error;
      }

      await fetchTemplates();
      setNewTemplate({ name: '', prompt: '', category: 'general' });
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
      
      await fetchTemplates();
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

  const editTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setNewTemplate({
      name: template.name,
      prompt: template.prompt,
      category: template.category
    });
    setIsEditing(true);
  };

  const copyTemplate = (template: PromptTemplate) => {
    setNewTemplate({
      name: `${template.name} (복사본)`,
      prompt: template.prompt,
      category: template.category
    });
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const cancelEdit = () => {
    setNewTemplate({ name: '', prompt: '', category: 'general' });
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
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
            <CardTitle>저장된 프롬프트 템플릿</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">{template.category}</p>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {template.prompt.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex space-x-1 ml-2">
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
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  저장된 프롬프트 템플릿이 없습니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptManagement;
