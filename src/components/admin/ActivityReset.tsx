
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  type: string;
}

const ActivityReset = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, type')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast({
        title: "오류",
        description: "활동 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const resetActivity = async () => {
    if (!selectedActivity) return;

    setIsLoading(true);
    
    try {
      // 활동과 관련된 모든 데이터 삭제
      const { error: chatError } = await supabase
        .from('chat_logs')
        .delete()
        .eq('activity_id', selectedActivity);

      if (chatError) throw chatError;

      const { error: checklistError } = await supabase
        .from('student_checklist_progress')
        .delete()
        .in('checklist_item_id', 
          supabase
            .from('checklist_items')
            .select('id')
            .eq('activity_id', selectedActivity)
        );

      if (checklistError) throw checklistError;

      const { error: argError } = await supabase
        .from('argumentation_responses')
        .delete()
        .eq('activity_id', selectedActivity);

      if (argError) throw argError;

      const { error: peerError } = await supabase
        .from('peer_evaluations')
        .delete()
        .eq('activity_id', selectedActivity);

      if (peerError) throw peerError;

      const { error: reflectionError } = await supabase
        .from('evaluation_reflections')
        .delete()
        .eq('activity_id', selectedActivity);

      if (reflectionError) throw reflectionError;

      toast({
        title: "성공",
        description: "활동 데이터가 초기화되었습니다."
      });

      setSelectedActivity('');
    } catch (error: any) {
      toast({
        title: "오류",
        description: "활동 초기화에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'experiment': return '실험';
      case 'argumentation': return '논증';
      case 'discussion': return '토의';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">활동 초기화</h2>
        <p className="text-gray-600">학습 활동의 모든 학생 데이터를 초기화합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RotateCcw className="h-5 w-5" />
            <span>활동 데이터 초기화</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">주의사항</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  이 작업은 선택한 활동의 모든 학생 데이터를 영구적으로 삭제합니다:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
                  <li>채팅 기록</li>
                  <li>체크리스트 진행 상황</li>
                  <li>논증 응답</li>
                  <li>동료 평가</li>
                  <li>평가 반성문</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">초기화할 활동 선택</label>
              <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                <SelectTrigger>
                  <SelectValue placeholder="활동을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      <div className="flex items-center space-x-2">
                        <span>{activity.title}</span>
                        <span className="text-xs text-gray-500">({getTypeLabel(activity.type)})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={!selectedActivity || isLoading}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isLoading ? '초기화 중...' : '활동 데이터 초기화'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>정말로 초기화하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다. 선택한 활동의 모든 학생 데이터가 영구적으로 삭제됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={resetActivity}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    초기화
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityReset;
