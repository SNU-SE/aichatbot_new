
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Clock, Circle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import ChatInterface from './ChatInterface';
import ModuleProgress from './ModuleProgress';
import { supabase } from '@/integrations/supabase/client';

interface ExperimentActivityProps {
  activity: any;
  studentId: string;
  onBack: () => void;
}

const ExperimentActivity = ({ activity, studentId, onBack }: ExperimentActivityProps) => {
  const { items, loading, toggleItem } = useChecklistProgress({ 
    studentId, 
    activityId: activity.id 
  });
  const [modules, setModules] = useState<any[]>([]);
  const [currentModule, setCurrentModule] = useState(1);
  const [completedModules, setCompletedModules] = useState(0);

  useEffect(() => {
    fetchModules();
  }, [activity.id]);

  useEffect(() => {
    // Calculate completed modules and update current module
    if (modules.length > 0 && items.length > 0) {
      const moduleItems = items.filter(item => item.module_id);
      const moduleCompletionStatus = modules.map(module => {
        const moduleItemsList = moduleItems.filter(item => item.module_id === module.id);
        const completedCount = moduleItemsList.filter(item => item.is_completed).length;
        return {
          moduleId: module.id,
          moduleNumber: module.module_number,
          total: moduleItemsList.length,
          completed: completedCount,
          isComplete: moduleItemsList.length > 0 && completedCount === moduleItemsList.length
        };
      });
      
      const completedCount = moduleCompletionStatus.filter(m => m.isComplete).length;
      setCompletedModules(completedCount);
      
      // Update current module to first incomplete
      const firstIncomplete = moduleCompletionStatus.find(m => !m.isComplete);
      if (firstIncomplete) {
        setCurrentModule(firstIncomplete.moduleNumber);
      } else if (completedCount === modules.length) {
        // All modules completed
        setCurrentModule(modules.length);
      }
    }
  }, [modules, items]);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_modules')
        .select('*')
        .eq('activity_id', activity.id)
        .order('module_number', { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('모듈 정보 로딩 실패:', error);
    }
  };

  const getCurrentModuleItems = () => {
    const currentModuleData = modules.find(m => m.module_number === currentModule);
    if (!currentModuleData) return [];
    
    return items.filter(item => item.module_id === currentModuleData.id);
  };

  const getItemsByStatus = () => {
    const moduleItems = getCurrentModuleItems();
    const completed = moduleItems.filter(item => item.is_completed);
    const current = moduleItems.find(item => !item.is_completed);
    const upcoming = moduleItems.filter(item => !item.is_completed && item.id !== current?.id);

    return {
      completed,
      current: current ? [current] : [],
      upcoming
    };
  };

  const { completed, current, upcoming } = getItemsByStatus();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">실험 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Left Panel: Module Progress and Checklist */}
      <div className="w-80 bg-white shadow-lg flex flex-col flex-shrink-0">
        {/* Header with module progress and stars */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{activity.title}</h2>
            <Button variant="outline" size="sm" onClick={onBack}>
              목록으로
            </Button>
          </div>
          <ModuleProgress 
            currentModule={currentModule}
            totalModules={modules.length}
            completedModules={completedModules}
          />
        </div>

        {/* Checklist */}
        <div className="flex-1 p-4 overflow-hidden">
          <h3 className="text-md font-semibold mb-4">실험 단계</h3>
          <div className="space-y-4 h-full overflow-y-auto">
            {/* Completed */}
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                완료됨
              </h4>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {completed.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                      <Checkbox 
                        checked={true}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <span className="text-sm text-green-700">{item.description}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Current */}
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                진행중
              </h4>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {current.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-start space-x-2 p-2 bg-blue-50 rounded border-2 border-blue-200">
                      <Checkbox 
                        checked={false}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <span className="text-sm text-blue-700 font-medium">{item.description}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Upcoming */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-600 flex items-center">
                <Circle className="h-4 w-4 mr-2" />
                예정
              </h4>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {upcoming.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                      <Checkbox 
                        checked={false}
                        disabled={true}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-600">{item.description}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 min-w-0">
        <ChatInterface 
          activity={activity}
          studentId={studentId}
          onBack={onBack}
          checklistContext={{
            currentStep: current[0]?.description || "모든 단계가 완료되었습니다.",
            allSteps: items
          }}
        />
      </div>
    </div>
  );
};

export default ExperimentActivity;
