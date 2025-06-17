
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Key, Bot, Settings, MessageSquare, Plus, Trash2, Copy, CheckCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminSettings {
  id: string;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  selected_provider: string | null;
  selected_model: string | null;
  system_prompt: string | null;
  rag_enabled: boolean | null;
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
  created_at: string;
  updated_at: string;
}

const AISettings = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [classSettings, setClassSettings] = useState<ClassPromptSetting[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    openai_api_key: '',
    anthropic_api_key: '',
    selected_provider: 'openai',
    selected_model: 'gpt-4o',
    system_prompt: '',
    rag_enabled: false
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    prompt: '',
    category: 'general',
    target_class: 'all'
  });
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
    fetchClasses();
    fetchClassSettings();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedClass !== 'all') {
      const classSetting = classSettings.find(cs => cs.class_name === selectedClass);
      if (classSetting) {
        setFormData(prev => ({ ...prev, system_prompt: classSetting.system_prompt || '' }));
      }
    }
  }, [selectedClass, classSettings]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      setSettings(data);
      setFormData({
        openai_api_key: data.openai_api_key || '',
        anthropic_api_key: data.anthropic_api_key || '',
        selected_provider: data.selected_provider || 'openai',
        selected_model: data.selected_model || 'gpt-4o',
        system_prompt: data.system_prompt || '',
        rag_enabled: data.rag_enabled || false
      });
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
        .select('class_name')
        .group('class_name');

      if (error) throw error;
      const uniqueClasses = [...new Set((data || []).map(item => item.class_name))];
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

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!settings) {
        const { error } = await supabase
          .from('admin_settings')
          .insert([formData]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      }

      toast({
        title: "성공",
        description: "AI 설정이 저장되었습니다."
      });
      
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
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

      await fetchTemplates();
      setNewTemplate({ name: '', prompt: '', category: 'general', target_class: 'all' });
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

  const activateTemplate = async (template: PromptTemplate) => {
    try {
      const targetClass = selectedClass === 'all' ? 'all' : selectedClass;
      
      // Check if class setting exists
      const existingSetting = classSettings.find(cs => cs.class_name === targetClass);
      
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
            class_name: targetClass,
            active_prompt_id: template.id,
            system_prompt: template.prompt
          }]);

        if (error) throw error;
      }

      // If global setting (all), also update admin_settings
      if (targetClass === 'all' && settings) {
        await supabase
          .from('admin_settings')
          .update({ system_prompt: template.prompt })
          .eq('id', settings.id);
        
        setFormData(prev => ({ ...prev, system_prompt: template.prompt }));
      }

      await fetchClassSettings();
      
      toast({
        title: "성공",
        description: `'${template.name}' 템플릿이 ${targetClass === 'all' ? '전체' : targetClass} 클래스에 활성화되었습니다.`
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

  const editTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setNewTemplate({
      name: template.name,
      prompt: template.prompt,
      category: template.category,
      target_class: template.target_class || 'all'
    });
    setIsEditing(true);
  };

  const copyTemplate = (template: PromptTemplate) => {
    setNewTemplate({
      name: `${template.name} (복사본)`,
      prompt: template.prompt,
      category: template.category,
      target_class: template.target_class || 'all'
    });
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const cancelEdit = () => {
    setNewTemplate({ name: '', prompt: '', category: 'general', target_class: 'all' });
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  const getActiveTemplate = () => {
    const targetClass = selectedClass === 'all' ? 'all' : selectedClass;
    const classSetting = classSettings.find(cs => cs.class_name === targetClass);
    if (classSetting && classSetting.active_prompt_id) {
      return templates.find(t => t.id === classSetting.active_prompt_id);
    }
    return null;
  };

  const getFilteredTemplates = () => {
    if (selectedClass === 'all') {
      return templates;
    }
    return templates.filter(t => t.target_class === 'all' || t.target_class === selectedClass);
  };

  const getModelOptions = () => {
    if (formData.selected_provider === 'openai') {
      return [
        { value: 'gpt-4o', label: 'GPT-4o (권장)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (빠름)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
      ];
    } else if (formData.selected_provider === 'anthropic') {
      return [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
      ];
    }
    return [];
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">AI 설정 및 프롬프트 관리</h2>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">AI 설정</TabsTrigger>
          <TabsTrigger value="prompts">클래스별 프롬프트 템플릿</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* API 키 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API 키 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="openai_key">OpenAI API 키</Label>
                <Input
                  id="openai_key"
                  type="password"
                  value={formData.openai_api_key}
                  onChange={(e) => setFormData({...formData, openai_api_key: e.target.value})}
                  placeholder="sk-..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  OpenAI GPT 모델을 사용하려면 API 키가 필요합니다.
                </p>
              </div>

              <div>
                <Label htmlFor="anthropic_key">Anthropic API 키</Label>
                <Input
                  id="anthropic_key"
                  type="password"
                  value={formData.anthropic_api_key}
                  onChange={(e) => setFormData({...formData, anthropic_api_key: e.target.value})}
                  placeholder="sk-ant-..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Claude 모델을 사용하려면 Anthropic API 키가 필요합니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 모델 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>AI 모델 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">AI 제공업체</Label>
                  <Select 
                    value={formData.selected_provider} 
                    onValueChange={(value) => {
                      setFormData({
                        ...formData, 
                        selected_provider: value,
                        selected_model: value === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022'
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model">AI 모델</Label>
                  <Select 
                    value={formData.selected_model} 
                    onValueChange={(value) => setFormData({...formData, selected_model: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="system_prompt">기본 시스템 프롬프트</Label>
                <Textarea
                  id="system_prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
                  placeholder="AI가 학생들과 상호작용할 때 따라야 할 기본 지침을 입력하세요..."
                  rows={6}
                />
                <p className="text-sm text-gray-500 mt-1">
                  클래스별 프롬프트가 설정되지 않은 경우 사용되는 기본 프롬프트입니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 고급 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>고급 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="rag_enabled">RAG (검색 증강 생성) 활성화</Label>
                  <p className="text-sm text-gray-500">
                    외부 지식 베이스를 활용한 더 정확한 답변 제공
                  </p>
                </div>
                <Switch
                  id="rag_enabled"
                  checked={formData.rag_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, rag_enabled: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* 저장 버튼 */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '저장 중...' : '설정 저장'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          {/* 클래스 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>클래스 선택</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Label htmlFor="class-select">관리할 클래스:</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 (기본값)</SelectItem>
                    {classes.map(className => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm text-gray-500">
                  {(() => {
                    const activeTemplate = getActiveTemplate();
                    return activeTemplate 
                      ? `현재 활성: ${activeTemplate.name}`
                      : '활성화된 템플릿 없음';
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

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

                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="template-target-class">대상 클래스</Label>
                    <Select
                      value={newTemplate.target_class}
                      onValueChange={(value) => setNewTemplate({ ...newTemplate, target_class: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        {classes.map(className => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <span>프롬프트 템플릿 목록</span>
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
                              <span>•</span>
                              <span>{template.target_class === 'all' ? '전체' : template.target_class}</span>
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
                      {selectedClass === 'all' 
                        ? '저장된 프롬프트 템플릿이 없습니다.' 
                        : `${selectedClass} 클래스에 사용 가능한 템플릿이 없습니다.`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISettings;
