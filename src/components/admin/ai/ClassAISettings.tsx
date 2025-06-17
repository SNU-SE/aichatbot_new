
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClassAISettingsProps {
  selectedClass: string;
  classSettings: any[];
  onClassSettingsUpdate: () => void;
}

const ClassAISettings = ({ selectedClass, classSettings, onClassSettingsUpdate }: ClassAISettingsProps) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const currentClassSetting = classSettings.find(cs => cs.class_name === selectedClass);

  const [currentClassSettings, setCurrentClassSettings] = useState({
    selected_provider: currentClassSetting?.selected_provider || 'openai',
    selected_model: currentClassSetting?.selected_model || 'gpt-4o',
    system_prompt: currentClassSetting?.system_prompt || '',
    rag_enabled: currentClassSetting?.rag_enabled || false
  });

  const getModelOptions = (provider: string) => {
    if (provider === 'openai') {
      return [
        { value: 'gpt-4o', label: 'GPT-4o (권장)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (빠름)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
      ];
    } else if (provider === 'anthropic') {
      return [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
      ];
    }
    return [];
  };

  const saveCurrentClassSettings = async () => {
    if (!selectedClass) return;
    
    setSaving(true);
    try {
      if (currentClassSetting) {
        const { error } = await supabase
          .from('class_prompt_settings')
          .update({
            selected_provider: currentClassSettings.selected_provider,
            selected_model: currentClassSettings.selected_model,
            system_prompt: currentClassSettings.system_prompt,
            rag_enabled: currentClassSettings.rag_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentClassSetting.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_prompt_settings')
          .insert([{
            class_name: selectedClass,
            selected_provider: currentClassSettings.selected_provider,
            selected_model: currentClassSettings.selected_model,
            system_prompt: currentClassSettings.system_prompt,
            rag_enabled: currentClassSettings.rag_enabled
          }]);

        if (error) throw error;
      }

      await onClassSettingsUpdate();
      
      toast({
        title: "성공",
        description: `${selectedClass} 클래스 설정이 저장되었습니다.`
      });
    } catch (error: any) {
      console.error('Error saving class settings:', error);
      toast({
        title: "오류",
        description: "클래스 설정 저장에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!selectedClass) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <span>{selectedClass} 클래스 AI 설정</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="class-provider">AI 제공업체</Label>
            <Select 
              value={currentClassSettings.selected_provider} 
              onValueChange={(value) => {
                setCurrentClassSettings({
                  ...currentClassSettings, 
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
            <Label htmlFor="class-model">AI 모델</Label>
            <Select 
              value={currentClassSettings.selected_model} 
              onValueChange={(value) => setCurrentClassSettings({...currentClassSettings, selected_model: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getModelOptions(currentClassSettings.selected_provider).map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="class_system_prompt">클래스 시스템 프롬프트</Label>
          <Textarea
            id="class_system_prompt"
            value={currentClassSettings.system_prompt}
            onChange={(e) => setCurrentClassSettings({...currentClassSettings, system_prompt: e.target.value})}
            placeholder="이 클래스에만 적용될 시스템 프롬프트를 입력하세요..."
            rows={4}
          />
          <p className="text-sm text-gray-500 mt-1">
            {selectedClass} 클래스에만 적용되는 프롬프트입니다.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="rag_enabled">RAG (검색 증강 생성) 활성화</Label>
            <p className="text-sm text-gray-500">
              외부 지식 베이스를 활용한 더 정확한 답변 제공
            </p>
          </div>
          <Switch
            id="rag_enabled"
            checked={currentClassSettings.rag_enabled}
            onCheckedChange={(checked) => setCurrentClassSettings({...currentClassSettings, rag_enabled: checked})}
          />
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={saveCurrentClassSettings}
            disabled={saving}
            className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '저장 중...' : '클래스 설정 저장'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassAISettings;
