
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GlobalAPISettingsProps {
  settings: any;
  onSettingsUpdate: () => void;
}

const GlobalAPISettings = ({ settings, onSettingsUpdate }: GlobalAPISettingsProps) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [globalSettings, setGlobalSettings] = useState({
    openai_api_key: settings?.openai_api_key || '',
    anthropic_api_key: settings?.anthropic_api_key || ''
  });

  const saveGlobalSettings = async () => {
    setSaving(true);
    try {
      if (!settings) {
        const { error } = await supabase
          .from('admin_settings')
          .insert([globalSettings]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .update({
            ...globalSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      }

      toast({
        title: "성공",
        description: "전역 API 키 설정이 저장되었습니다."
      });
      
      onSettingsUpdate();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>전역 API 키 설정</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="openai_key">OpenAI API 키</Label>
          <Input
            id="openai_key"
            type="password"
            value={globalSettings.openai_api_key}
            onChange={(e) => setGlobalSettings({...globalSettings, openai_api_key: e.target.value})}
            placeholder="sk-..."
          />
          <p className="text-sm text-gray-500 mt-1">
            모든 클래스에서 OpenAI GPT 모델을 사용하려면 API 키가 필요합니다.
          </p>
        </div>

        <div>
          <Label htmlFor="anthropic_key">Anthropic API 키</Label>
          <Input
            id="anthropic_key"
            type="password"
            value={globalSettings.anthropic_api_key}
            onChange={(e) => setGlobalSettings({...globalSettings, anthropic_api_key: e.target.value})}
            placeholder="sk-ant-..."
          />
          <p className="text-sm text-gray-500 mt-1">
            모든 클래스에서 Claude 모델을 사용하려면 Anthropic API 키가 필요합니다.
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={saveGlobalSettings}
            disabled={saving}
            className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '저장 중...' : 'API 키 저장'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalAPISettings;
