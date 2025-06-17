
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Key, Bot, Settings } from 'lucide-react';
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

const AISettings = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
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

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!settings) {
        // 새 설정 생성
        const { error } = await supabase
          .from('admin_settings')
          .insert([formData]);

        if (error) throw error;
      } else {
        // 기존 설정 업데이트
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
      
      fetchSettings(); // 설정 새로고침
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
      <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">AI 설정 관리</h2>

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
            <Label htmlFor="system_prompt">시스템 프롬프트</Label>
            <Textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
              placeholder="AI가 학생들과 상호작용할 때 따라야 할 지침을 입력하세요..."
              rows={6}
            />
            <p className="text-sm text-gray-500 mt-1">
              AI의 응답 스타일과 교육 방향을 설정합니다.
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
    </div>
  );
};

export default AISettings;
