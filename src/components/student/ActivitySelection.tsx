
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  type: string;
  content: any;
  created_at: string;
}

interface ActivitySelectionProps {
  onActivitySelect: (activity: Activity) => void;
}

const ActivitySelection = ({ onActivitySelect }: ActivitySelectionProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast({
        title: "오류",
        description: "활동 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'reading':
        return <FileText className="h-6 w-6" />;
      case 'discussion':
        return <BookOpen className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    if (activity.content && typeof activity.content === 'object') {
      return activity.content.description || '설명이 없습니다.';
    }
    return '설명이 없습니다.';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">활동 목록을 불러오는 중...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">등록된 활동이 없습니다</h3>
        <p className="text-gray-600">관리자가 학습 활동을 등록할 때까지 기다려주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">학습 활동 선택</h2>
        <p className="text-gray-600">참여하고 싶은 학습 활동을 선택하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity) => (
          <Card 
            key={activity.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer border-0 shadow-md"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-[rgb(15,15,112)] rounded-lg text-white">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {activity.title}
                  </CardTitle>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(activity.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm line-clamp-3">
                {getActivityDescription(activity)}
              </p>
              <Button 
                onClick={() => onActivitySelect(activity)}
                className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
              >
                <Play className="h-4 w-4 mr-2" />
                활동 시작하기
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActivitySelection;
