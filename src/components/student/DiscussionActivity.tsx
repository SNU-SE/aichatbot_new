
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">토의 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden p-4">
      {/* Left Panel: Checklist and Notes */}
      <div className="w-80 bg-white shadow-lg flex flex-col flex-shrink-0 rounded-lg">
        {/* Header with Activity Info */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-2">{activity.title}</h2>
          {activity.content && typeof activity.content === 'string' && (
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <h3 className="font-medium mb-2 text-sm">활동 안내</h3>
              <p className="text-sm text-gray-700">{activity.content}</p>
            </div>
          )}
          {activity.content && typeof activity.content === 'object' && activity.content.description && (
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <h3 className="font-medium mb-2 text-sm">활동 안내</h3>
              <p className="text-sm text-gray-700">{activity.content.description}</p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="p-4">
          <Card className="border-0 shadow-none rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">토의 체크리스트</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2" style={{ height: '192px', overflowY: 'auto' }}>
                {items.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start space-x-2 p-2 rounded-lg hover:bg-gray-50">
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
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <div className="flex-1 min-h-0 p-4 pt-0">
          <DiscussionNotes 
            studentId={studentId}
            activityId={activity.id}
          />
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 min-w-0 p-4">
        <div className="h-full rounded-lg overflow-hidden">
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
    </div>
  );
};

export default DiscussionActivity;
