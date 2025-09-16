
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Clock, Users, Microscope, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Activity } from '@/types/activity';

interface ActivitySelectionProps {
  onActivitySelect: (activity: Activity) => void;
}

const ActivitySelection = ({ onActivitySelect }: ActivitySelectionProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const generalChatActivity = useMemo<Activity>(() => ({
    id: 'general_chat',
    title: '챗봇과 대화하기',
    type: 'general_chat',
    content: {
      description: '언제든지 AI 학습 도우미와 자유롭게 대화를 나눠보세요.'
    },
    created_at: new Date(0).toISOString(),
    file_url: null,
    final_question: null,
    modules_count: null
  }), []);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const visibleActivities = data || [];
      setActivities([generalChatActivity, ...visibleActivities]);
    } catch (error: any) {
      toast({
        title: "오류",
        description: "활동 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
      setActivities([generalChatActivity]);
    } finally {
      setLoading(false);
    }
  }, [generalChatActivity, toast]);

  useEffect(() => {
    fetchActivities();

    // 실시간 활동 상태 변경 감지
    const channel = supabase
      .channel('activities-visibility-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities'
        },
        (payload) => {
          console.log('Activity visibility changed:', payload);
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'experiment':
        return <Microscope className="h-6 w-6" />;
      case 'argumentation':
        return <Users className="h-6 w-6" />;
      case 'discussion':
        return <BookOpen className="h-6 w-6" />;
      case 'general_chat':
        return <Bot className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    if (activity.id === 'general_chat') {
      return '수업 등록과 관계없이 AI 학습 도우미에게 질문하고 도움을 받을 수 있습니다.';
    }
    if (activity.content && typeof activity.content === 'object') {
      return activity.content.description || '설명이 없습니다.';
    }
    return '설명이 없습니다.';
  };

  const hasAdditionalActivities = activities.some(activity => activity.id !== 'general_chat');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">활동 목록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">학습 활동 선택</h2>
        <p className="text-gray-600">참여하고 싶은 학습 활동을 선택하세요</p>
        {!hasAdditionalActivities && (
          <p className="text-sm text-gray-500 mt-2">
            현재 등록된 활동이 없어도 AI 학습 도우미와 대화할 수 있습니다.
          </p>
        )}
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
                    {activity.id === 'general_chat' ? (
                      <Badge variant="secondary" className="text-xs">항상 이용 가능</Badge>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(activity.created_at).toLocaleDateString('ko-KR')}
                      </>
                    )}
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
                {activity.id === 'general_chat' ? (
                  <Bot className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {activity.id === 'general_chat' ? '대화 시작하기' : '활동 시작하기'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActivitySelection;
