
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, CheckCircle, Clock, Circle } from 'lucide-react';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import ChatInterface from './ChatInterface';
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
  const [stars, setStars] = useState(0);

  useEffect(() => {
    fetchModules();
  }, [activity.id]);

  useEffect(() => {
    // Calculate completed modules and stars
    if (modules.length > 0 && items.length > 0) {
      const moduleItems = items.filter(item => item.module_id);
      const completedByModule = modules.map(module => {
        const moduleItemsList = moduleItems.filter(item => item.module_id === module.id);
        const completedCount = moduleItemsList.filter(item => item.is_completed).length;
        return {
          moduleId: module.id,
          total: moduleItemsList.length,
          completed: completedCount,
          isComplete: moduleItemsList.length > 0 && completedCount === moduleItemsList.length
        };
      });
      
      const completedModules = completedByModule.filter(m => m.isComplete).length;
      setStars(completedModules);
      
      // Update current module to first incomplete
      const firstIncomplete = completedByModule.findIndex(m => !m.isComplete);
      if (firstIncomplete !== -1) {
        setCurrentModule(firstIncomplete + 1);
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
    <div className="space-y-6">
      {/* Header with module progress and stars */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold">{activity.title}</h2>
              <span className="text-sm text-gray-500">
                모듈 {currentModule} / {modules.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {[...Array(Math.max(modules.length, 3))].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-5 w-5 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                />
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>실험 단계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Completed */}
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                완료됨
              </h4>
              {completed.map((item) => (
                <div key={item.id} className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                  <Checkbox 
                    checked={true}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <span className="text-sm text-green-700">{item.description}</span>
                </div>
              ))}
            </div>

            {/* Current */}
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                진행중
              </h4>
              {current.map((item) => (
                <div key={item.id} className="flex items-center space-x-2 p-2 bg-blue-50 rounded border-2 border-blue-200">
                  <Checkbox 
                    checked={false}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <span className="text-sm text-blue-700 font-medium">{item.description}</span>
                </div>
              ))}
            </div>

            {/* Upcoming */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-600 flex items-center">
                <Circle className="h-4 w-4 mr-2" />
                예정
              </h4>
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <Checkbox 
                    checked={false}
                    disabled={true}
                  />
                  <span className="text-sm text-gray-600">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
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
  );
};

export default ExperimentActivity;
