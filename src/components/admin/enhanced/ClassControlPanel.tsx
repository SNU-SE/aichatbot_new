
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Send, Users, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  type: string;
}

interface ClassControlPanelProps {
  isClassActive: boolean;
  onStartClass: () => void;
  onEndClass: () => void;
  selectedClass: string;
  onClassChange: (value: string) => void;
  selectedActivity: string;
  onActivityChange: (value: string) => void;
  onAssignActivity: () => void;
  activities: Activity[];
  classes: string[];
  onlineCount: number;
  totalCount: number;
}

const ClassControlPanel = ({
  isClassActive,
  onStartClass,
  onEndClass,
  selectedClass,
  onClassChange,
  selectedActivity,
  onActivityChange,
  onAssignActivity,
  activities,
  classes,
  onlineCount,
  totalCount
}: ClassControlPanelProps) => {
  const { toast } = useToast();

  const sendAnnouncement = () => {
    toast({
      title: "공지사항 전송",
      description: "모든 온라인 학생에게 공지사항이 전송되었습니다."
    });
  };

  return (
    <Card className="border-2 border-[rgb(15,15,112)]/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-[rgb(15,15,112)]">수업 제어 패널</CardTitle>
          <div className="flex items-center space-x-4">
            <Badge variant={isClassActive ? "default" : "secondary"} className="text-sm px-3 py-1">
              {isClassActive ? "수업 진행 중" : "수업 대기 중"}
            </Badge>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{onlineCount}/{totalCount}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 수업 상태 제어 */}
        <div className="flex justify-center">
          {!isClassActive ? (
            <Button 
              onClick={onStartClass}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <Play className="h-5 w-5 mr-2" />
              수업 시작
            </Button>
          ) : (
            <Button 
              onClick={onEndClass}
              size="lg"
              variant="destructive"
              className="px-8 py-3"
            >
              <Pause className="h-5 w-5 mr-2" />
              수업 종료
            </Button>
          )}
        </div>

        {/* 활동 배정 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">대상 반</label>
            <Select value={selectedClass} onValueChange={onClassChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 반</SelectItem>
                {classes.map(className => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">활동 선택</label>
            <Select value={selectedActivity} onValueChange={onActivityChange}>
              <SelectTrigger>
                <SelectValue placeholder="활동을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {activities.map(activity => (
                  <SelectItem key={activity.id} value={activity.id}>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4" />
                      <span>{activity.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={onAssignActivity}
              disabled={!selectedActivity || !isClassActive}
              className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90 flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              활동 배정
            </Button>
            <Button 
              onClick={sendAnnouncement}
              disabled={!isClassActive}
              variant="outline"
              size="sm"
            >
              공지 전송
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassControlPanel;
