import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { Activity } from '@/types/activity';
import ChatInterface from './ChatInterface';

interface GeneralChatActivityProps {
  activity: Activity;
  studentId: string;
  onBack: () => void;
}

const GeneralChatActivity = ({ activity, studentId, onBack }: GeneralChatActivityProps) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[rgb(15,15,112)] text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">{activity.title}</CardTitle>
              <p className="text-sm text-gray-600">언제든지 AI 학습 도우미와 대화를 나눠보세요.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-[rgb(15,15,112)]" />
            <p>대화 내용은 자동으로 저장되어 학습 기록으로 활용할 수 있습니다.</p>
          </div>
          <p>궁금한 점이나 도움이 필요한 내용을 자유롭게 질문해보세요.</p>
        </CardContent>
      </Card>

      <ChatInterface activity={activity} studentId={studentId} onBack={onBack} />
    </div>
  );
};

export default GeneralChatActivity;
