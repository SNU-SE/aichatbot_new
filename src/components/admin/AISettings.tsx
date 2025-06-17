
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAISettings } from '@/hooks/useAISettings';
import GlobalAPISettings from './ai/GlobalAPISettings';
import ClassSelector from './ai/ClassSelector';
import ClassAISettings from './ai/ClassAISettings';
import PromptTemplateManager from './ai/PromptTemplateManager';

const AISettings = () => {
  const {
    settings,
    templates,
    classSettings,
    classes,
    loading,
    fetchSettings,
    fetchTemplates,
    fetchClassSettings
  } = useAISettings();

  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  const getActiveTemplate = () => {
    if (!selectedClass) return null;
    const classSetting = classSettings.find(cs => cs.class_name === selectedClass);
    if (classSetting && classSetting.active_prompt_id) {
      return templates.find(t => t.id === classSetting.active_prompt_id);
    }
    return null;
  };

  const getCurrentClassSetting = () => {
    if (!selectedClass) return null;
    return classSettings.find(cs => cs.class_name === selectedClass);
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">클래스별 AI 설정 및 프롬프트 관리</h2>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">전역 API 키 설정</TabsTrigger>
          <TabsTrigger value="classes">클래스별 설정</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <GlobalAPISettings 
            settings={settings} 
            onSettingsUpdate={fetchSettings} 
          />
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <ClassSelector
            classes={classes}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
            activeTemplate={getActiveTemplate()}
            currentSetting={getCurrentClassSetting()}
          />

          {selectedClass && (
            <>
              <ClassAISettings
                selectedClass={selectedClass}
                classSettings={classSettings}
                onClassSettingsUpdate={fetchClassSettings}
              />

              <PromptTemplateManager
                selectedClass={selectedClass}
                templates={templates}
                classSettings={classSettings}
                onTemplatesUpdate={fetchTemplates}
                onClassSettingsUpdate={fetchClassSettings}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISettings;
