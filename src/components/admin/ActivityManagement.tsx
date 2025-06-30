import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivities } from '@/hooks/useActivities';
import ActivityForm from './activity/ActivityForm';
import ActivityList from './activity/ActivityList';
import CSVActivityUploader from './activity/CSVActivityUploader';
import { Activity } from '@/types/activity';

const ActivityManagement = () => {
  const {
    activities,
    loading,
    fetchActivities,
    saveExperimentData,
    saveChecklistData
  } = useActivities();

  const [showForm, setShowForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleCSVDataParsed = async (csvData: any[]) => {
    try {
      const processedActivities = [];
      
      for (const row of csvData) {
        const activityData = {
          title: row['제목'] || row['title'] || '',
          type: row['유형'] || row['type'] || 'experiment',
          file_url: row['파일URL'] || row['file_url'] || null,
          final_question: row['최종질문'] || row['final_question'] || null,
          modules_count: parseInt(row['모듈수'] || row['modules_count'] || '1'),
          content: {}
        };

        const { data: activity, error: activityError } = await supabase
          .from('activities')
          .insert([activityData])
          .select()
          .single();

        if (activityError) {
          console.error('Activity creation error:', activityError);
          continue;
        }

        // 실험 활동의 경우 모듈 처리
        if (activityData.type === 'experiment') {
          const moduleDefinitions = row['모듈정의'] || row['module_definitions'] || '';
          if (moduleDefinitions) {
            const modules = moduleDefinitions.split('|').filter((module: string) => module.trim());
            for (let i = 0; i < modules.length; i++) {
              const moduleData = modules[i].split(':');
              const moduleTitle = moduleData[0]?.trim() || `모듈 ${i + 1}`;
              const moduleSteps = moduleData[1]?.split(';').filter((step: string) => step.trim()) || [`단계 ${i + 1}`];

              const { data: moduleRecord, error: moduleError } = await supabase
                .from('activity_modules')
                .insert({
                  activity_id: activity.id,
                  module_number: i + 1,
                  title: moduleTitle
                })
                .select()
                .single();

              if (moduleError) {
                console.error('Module creation error:', moduleError);
                continue;
              }

              for (let j = 0; j < moduleSteps.length; j++) {
                await supabase
                  .from('checklist_items')
                  .insert({
                    activity_id: activity.id,
                    module_id: moduleRecord.id,
                    step_number: j + 1,
                    description: moduleSteps[j].trim()
                  });
              }
            }
          }
        } else {
          // 기존 체크리스트 처리 (논증, 토의 활동)
          const checklistItems = row['체크리스트'] || row['checklist'] || '';
          if (checklistItems) {
            const items = checklistItems.split(';').filter((item: string) => item.trim());
            for (let i = 0; i < items.length; i++) {
              await supabase
                .from('checklist_items')
                .insert({
                  activity_id: activity.id,
                  step_number: i + 1,
                  description: items[i].trim()
                });
            }
          }
        }

        processedActivities.push(activity);
      }

      toast({
        title: "성공",
        description: `${processedActivities.length}개의 활동이 생성되었습니다.`
      });

      setShowCSVUpload(false);
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "CSV 데이터 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = async (activity: Activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setEditingActivity(null);
    setShowForm(false);
    fetchActivities();
  };

  const handleFormClose = () => {
    setEditingActivity(null);
    setShowForm(false);
  };

  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">수업 활동 관리</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowCSVUpload(true)}
            variant="outline"
            className="border-[rgb(15,15,112)] text-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)] hover:text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            CSV 일괄 등록
          </Button>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 활동 생성
          </Button>
        </div>
      </div>

      {showCSVUpload && (
        <CSVActivityUploader
          onClose={() => setShowCSVUpload(false)}
          onDataParsed={handleCSVDataParsed}
        />
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="활동 제목이나 유형으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <ActivityForm
          editingActivity={editingActivity}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          saveExperimentData={saveExperimentData}
          saveChecklistData={saveChecklistData}
        />
      )}

      <ActivityList
        activities={filteredActivities}
        onEdit={handleEdit}
        onDeleteSuccess={fetchActivities}
      />
    </div>
  );
};

export default ActivityManagement;
