
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import ChatInterface from './ChatInterface';

interface DiscussionActivityProps {
  activity: any;
  studentId: string;
  onBack: () => void;
}

const DiscussionActivity = ({ activity, studentId, onBack }: DiscussionActivityProps) => {
  const { items, loading, toggleItem } = useChecklistProgress({ 
    studentId, 
    activityId: activity.id 
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">토의 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Simple Checklist */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>토의 체크리스트</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {items.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50">
                    <Checkbox 
                      checked={item.is_completed}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-1"
                    />
                    <span className={`text-sm ${item.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right: Chat Interface */}
      <div className="lg:col-span-2">
        <ChatInterface 
          activity={activity}
          studentId={studentId}
          onBack={onBack}
          checklistContext={{
            currentStep: items.find(item => !item.is_completed)?.description || "모든 단계가 완료되었습니다.",
            allSteps: items
          }}
        />
      </div>
    </div>
  );
};

export default DiscussionActivity;
