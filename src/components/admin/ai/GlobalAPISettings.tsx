
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GlobalAPISettingsProps {
  settings: any;
  onSettingsUpdate: () => void;
}

const GlobalAPISettings = ({ settings, onSettingsUpdate }: GlobalAPISettingsProps) => {
  const [globalSettings, setGlobalSettings] = useState({
    selected_provider: settings?.selected_provider || 'openai',
    selected_model: settings?.selected_model || 'gpt-4.1-2025-04-14',
    system_prompt: settings?.system_prompt || '학생의 질문에 직접적으로 답을 하지 말고, 그 답이 나오기까지 필요한 최소한의 정보를 제공해. 단계별로 학생들이 생각하고 질문할 수 있도록 유도해줘.',
    rag_enabled: settings?.rag_enabled || false
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const getModelOptions = (provider: string) => {
    if (provider === 'openai') {
      return [
        // 최신 창의적 모델들
        { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (최신 플래그십 - 창의적 작업 최적화)' },
        { value: 'gpt-4o', label: 'GPT-4o (고성능 - 창의적 작업)' },
        
        // 최신 추론 모델들
        { value: 'o3-2025-04-16', label: 'O3 (강력한 추론 모델 - 복잡한 분석)' },
        { value: 'o4-mini-2025-04-16', label: 'O4 Mini (빠른 추론 - 효율적)' },
        
        // 기존 모델들 (구버전 표시)
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (구버전 - 빠름)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (구버전)' }
      ];
    } else if (provider === 'anthropic') {
      return [
        // Claude 4 모델들
        { value: 'claude-sonnet-4-20250514', label: 'Claude 4 Sonnet (최신 - 고성능 추론)' },
        
        // Claude 3 모델들
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (강력함)' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (구버전)' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (구버전 - 빠름)' }
      ];
    }
    return [];
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('admin_settings')
          .update(globalSettings)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([globalSettings]);

        if (error) throw error;
      }

      await onSettingsUpdate();
      
      toast({
        title: "성공",
        description: "전역 AI 설정이 저장되었습니다."
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "오류",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>전역 AI API 설정</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>보안 알림:</strong> API 키는 이제 Supabase Secrets에서 안전하게 관리됩니다. 
            관리자는 프로젝트 설정에서 OPENAI_API_KEY와 ANTHROPIC_API_KEY를 설정할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="provider">기본 AI 제공업체</Label>
            <Select 
              value={globalSettings.selected_provider} 
              onValueChange={(value) => {
                const defaultModel = value === 'openai' ? 'gpt-4.1-2025-04-14' : 'claude-sonnet-4-20250514';
                setGlobalSettings({
                  ...globalSettings, 
                  selected_provider: value,
                  selected_model: defaultModel
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
            <Label htmlFor="model">기본 AI 모델</Label>
            <Select 
              value={globalSettings.selected_model} 
              onValueChange={(value) => setGlobalSettings({...globalSettings, selected_model: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getModelOptions(globalSettings.selected_provider).map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {globalSettings.selected_provider === 'openai' 
                ? '창의적 작업: GPT-4.1, GPT-4o | 추론 작업: O3, O4 Mini'
                : '고성능 추론: Claude 4 Sonnet | 강력한 분석: Claude 3 Opus'
              }
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="system_prompt">전역 시스템 프롬프트</Label>
          <Textarea
            id="system_prompt"
            value={globalSettings.system_prompt}
            onChange={(e) => setGlobalSettings({...globalSettings, system_prompt: e.target.value})}
            placeholder="AI의 기본 동작을 정의하는 시스템 프롬프트를 입력하세요..."
            rows={4}
          />
          <p className="text-sm text-gray-500 mt-1">
            클래스별 설정이 없는 경우 사용되는 기본 프롬프트입니다.
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
            checked={globalSettings.rag_enabled}
            onCheckedChange={(checked) => setGlobalSettings({...globalSettings, rag_enabled: checked})}
          />
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '저장 중...' : '전역 설정 저장'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalAPISettings;
