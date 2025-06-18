
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import ChatInterface from './ChatInterface';
import DiscussionNotes from './DiscussionNotes';

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
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Left Panel: Checklist and Notes */}
      <div className="w-80 bg-white shadow-lg flex flex-col flex-shrink-0">
        {/* Checklist */}
        <Card className="border-0 shadow-none">
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

        {/* Notes */}
        <div className="flex-1 min-h-0">
          <DiscussionNotes 
            studentId={studentId}
            activityId={activity.id}
          />
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 min-w-0">
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
