
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Clock, Users, Microscope, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Activity } from '@/types/activity';
import { 
  GENERAL_CHAT_ACTIVITY_ID,
  GENERAL_CHAT_DESCRIPTION,
  GENERAL_CHAT_TYPE
} from '@/constants/generalChat';

const createLocalGeneralChatActivity = (): Activity => ({
  id: GENERAL_CHAT_ACTIVITY_ID,
  title: '챗봇과 대화하기',
  type: GENERAL_CHAT_TYPE,
  content: { description: GENERAL_CHAT_DESCRIPTION },
  created_at: new Date(0).toISOString(),
  final_question: null,
  modules_count: null,
  is_hidden: false,
  assignedClasses: [],
  allowAllClasses: true,
  documentCount: 0
});

const buildGeneralChatActivity = (activity?: Activity | null): Activity => {
  const fallback = createLocalGeneralChatActivity();

  if (!activity) {
    return fallback;
  }

  const normalizedContent =
    activity.content && typeof activity.content === 'object'
      ? {
          ...activity.content,
          description:
            (activity.content as Record<string, any>).description ||
            GENERAL_CHAT_DESCRIPTION
        }
      : fallback.content;

  return {
    ...fallback,
    ...activity,
    id: GENERAL_CHAT_ACTIVITY_ID,
    type: GENERAL_CHAT_TYPE,
    title: activity.title || fallback.title,
    content: normalizedContent,
    created_at: activity.created_at || fallback.created_at,
    final_question: activity.final_question ?? null,
    modules_count: activity.modules_count ?? null,
    is_hidden: false,
    assignedClasses: [],
    allowAllClasses: true,
    documentCount: 0
  };
};

interface ActivitySelectionProps {
  onActivitySelect: (activity: Activity) => void;
  studentId?: string | null;
}

const ActivitySelection = ({ onActivitySelect, studentId }: ActivitySelectionProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [classLoading, setClassLoading] = useState(true);
  const { toast } = useToast();

  const loadStudentClass = useCallback(async () => {
    if (typeof window === 'undefined') {
      setClassLoading(false);
      return;
    }

    setClassLoading(true);

    try {
      const storedProfileRaw = localStorage.getItem('studentProfile');
      let storedProfile: Record<string, any> | null = null;
      let className: string | null = null;

      if (storedProfileRaw) {
        try {
          storedProfile = JSON.parse(storedProfileRaw);
          className = storedProfile?.class_name ?? null;
        } catch (error) {
          console.warn('학생 프로필 파싱 오류:', error);
        }
      }

      const normalizedStudentId = studentId?.trim() || null;

      if ((!className || className.trim() === '') && normalizedStudentId) {
        const { data, error } = await supabase
          .from('students')
          .select('class_name')
          .eq('student_id', normalizedStudentId)
          .maybeSingle();

        if (error) throw error;

        className = data?.class_name ?? null;

        if (className) {
          const updatedProfile = { ...(storedProfile || {}), class_name: className };
          localStorage.setItem('studentProfile', JSON.stringify(updatedProfile));
        }
      }

      setStudentClass(className?.trim() || null);
    } catch (error) {
      console.error('학생 클래스 정보 로드 실패:', error);
      toast({
        title: "오류",
        description: "클래스 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
      setStudentClass(null);
    } finally {
      setClassLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    loadStudentClass();
  }, [loadStudentClass]);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*, activity_class_assignments(class_name)')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizedActivities: Activity[] = (data || []).map((activity: any) => {
        const assignments = activity.activity_class_assignments || [];

        const assignedClasses = assignments
          .map((assignment: { class_name: string | null }) => assignment.class_name)
          .filter((className: string | null): className is string => Boolean(className));

        const allowAllClasses = assignedClasses.length === 0;

        return {
          id: activity.id,
          title: activity.title,
          type: activity.type,
          content: activity.content,
          final_question: activity.final_question,
          modules_count: activity.modules_count,
          created_at: activity.created_at,
          is_hidden: activity.is_hidden,
          assignedClasses,
          allowAllClasses,
          documentCount: 0,
        } as Activity;
      });

      const generalChatFromDb = normalizedActivities.find(
        (activity) =>
          activity.type === GENERAL_CHAT_TYPE ||
          activity.id === GENERAL_CHAT_ACTIVITY_ID
      );

      const generalChatActivity = buildGeneralChatActivity(generalChatFromDb);

      const accessibleActivities = normalizedActivities
        .filter(
          (activity) =>
            activity.type !== GENERAL_CHAT_TYPE &&
            activity.id !== GENERAL_CHAT_ACTIVITY_ID
        )
        .filter((activity) => {
          if (activity.allowAllClasses !== false) {
            return true;
          }

          if (!studentClass) {
            return false;
          }

          return activity.assignedClasses?.includes(studentClass) ?? false;
        });

      const sortedActivities = accessibleActivities.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

      setActivities([generalChatActivity, ...sortedActivities]);
    } catch (error: any) {
      toast({
        title: "오류",
        description: "활동 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
      setActivities([createLocalGeneralChatActivity()]);
    } finally {
      setLoading(false);
    }
  }, [studentClass, toast]);

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
      case GENERAL_CHAT_TYPE:
        return <Bot className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    if (activity.id === GENERAL_CHAT_ACTIVITY_ID || activity.type === GENERAL_CHAT_TYPE) {
      return GENERAL_CHAT_DESCRIPTION;
    }
    if (activity.content && typeof activity.content === 'object') {
      return activity.content.description || '설명이 없습니다.';
    }
    return '설명이 없습니다.';
  };

  const hasAdditionalActivities = activities.some(
    (activity) => activity.id !== GENERAL_CHAT_ACTIVITY_ID
  );

  if (loading || classLoading) {
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

      {!studentClass && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md p-4">
          학생 클래스 정보를 확인할 수 없어 전체 공개된 활동만 표시됩니다. 문제가 지속되면 담당 교사에게 문의해주세요.
        </div>
      )}

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
                    {activity.id === GENERAL_CHAT_ACTIVITY_ID ? (
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
                {activity.id === GENERAL_CHAT_ACTIVITY_ID ? (
                  <Bot className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {activity.id === GENERAL_CHAT_ACTIVITY_ID ? '대화 시작하기' : '활동 시작하기'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActivitySelection;
