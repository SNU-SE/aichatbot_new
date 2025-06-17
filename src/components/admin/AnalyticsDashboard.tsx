
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, MessageCircle, BookOpen, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalStudents: number;
  totalMessages: number;
  totalActivities: number;
  activeToday: number;
  dailyActivity: Array<{
    date: string;
    messages: number;
    students: number;
  }>;
  classActivity: Array<{
    class_name: string;
    student_count: number;
    message_count: number;
  }>;
  activityPopularity: Array<{
    activity_title: string;
    participation_count: number;
  }>;
  studentEngagement: Array<{
    student_id: string;
    name: string;
    message_count: number;
    activity_count: number;
    engagement_score: number;
  }>;
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // 기간 설정
      const now = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '1day':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // 전체 통계
      const { data: students } = await supabase.from('students').select('*');
      const { data: messages } = await supabase
        .from('chat_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString());
      const { data: activities } = await supabase.from('activities').select('*');

      // 오늘 활동한 학생 수
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayMessages } = await supabase
        .from('chat_logs')
        .select('student_id')
        .gte('timestamp', today.toISOString());

      const activeToday = new Set(todayMessages?.map(m => m.student_id) || []).size;

      // 일별 활동 데이터
      const dailyActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { data: dayMessages } = await supabase
          .from('chat_logs')
          .select('student_id')
          .gte('timestamp', date.toISOString())
          .lt('timestamp', nextDate.toISOString());

        const uniqueStudents = new Set(dayMessages?.map(m => m.student_id) || []).size;

        dailyActivity.push({
          date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
          messages: dayMessages?.length || 0,
          students: uniqueStudents
        });
      }

      // 반별 활동 데이터
      const classActivity = [];
      if (students) {
        const classCounts = students.reduce((acc: any, student) => {
          acc[student.class_name] = (acc[student.class_name] || 0) + 1;
          return acc;
        }, {});

        for (const className of Object.keys(classCounts)) {
          const classStudents = students.filter(s => s.class_name === className);
          const classMessages = messages?.filter(m => 
            classStudents.some(s => s.student_id === m.student_id)
          ) || [];

          classActivity.push({
            class_name: className,
            student_count: classCounts[className],
            message_count: classMessages.length
          });
        }
      }

      // 활동별 인기도
      const activityParticipation: { [key: string]: number } = {};
      if (messages && activities) {
        messages.forEach(message => {
          if (message.activity_id) {
            activityParticipation[message.activity_id] = 
              (activityParticipation[message.activity_id] || 0) + 1;
          }
        });
      }

      const activityPopularity = activities?.map(activity => ({
        activity_title: activity.title,
        participation_count: activityParticipation[activity.id] || 0
      })) || [];

      // 학생 참여도
      const studentEngagement = students?.map(student => {
        const studentMessages = messages?.filter(m => m.student_id === student.student_id) || [];
        const studentActivities = new Set(
          studentMessages.filter(m => m.activity_id).map(m => m.activity_id)
        ).size;

        const engagementScore = Math.min(100, 
          (studentMessages.length * 0.7) + (studentActivities * 30)
        );

        return {
          student_id: student.student_id,
          name: student.name || '이름없음',
          message_count: studentMessages.length,
          activity_count: studentActivities,
          engagement_score: Math.round(engagementScore)
        };
      }).sort((a, b) => b.engagement_score - a.engagement_score) || [];

      setAnalytics({
        totalStudents: students?.length || 0,
        totalMessages: messages?.length || 0,
        totalActivities: activities?.length || 0,
        activeToday,
        dailyActivity,
        classActivity,
        activityPopularity: activityPopularity.slice(0, 5),
        studentEngagement: studentEngagement.slice(0, 10)
      });

    } catch (error: any) {
      toast({
        title: "오류",
        description: "분석 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return <div className="flex justify-center py-8">분석 데이터를 불러오는 중...</div>;
  }

  const COLORS = ['#0f0f70', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">학습 분석 대시보드</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1day">1일</SelectItem>
            <SelectItem value="7days">7일</SelectItem>
            <SelectItem value="30days">30일</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[rgb(15,15,112)]" />
              <div>
                <p className="text-sm text-gray-600">총 학생 수</p>
                <p className="text-2xl font-bold">{analytics.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">총 메시지</p>
                <p className="text-2xl font-bold">{analytics.totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">총 활동</p>
                <p className="text-2xl font-bold">{analytics.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">오늘 활동</p>
                <p className="text-2xl font-bold">{analytics.activeToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 일별 활동 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>일별 활동 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#0f0f70" 
                  strokeWidth={2}
                  name="메시지"
                />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="활성 학생"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 반별 활동 */}
        <Card>
          <CardHeader>
            <CardTitle>반별 메시지 수</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.classActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="message_count" fill="#0f0f70" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 상위 학생 참여도 */}
      <Card>
        <CardHeader>
          <CardTitle>학생 참여도 순위</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.studentEngagement.map((student, index) => (
              <div key={student.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-[rgb(15,15,112)] text-white rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{student.name} ({student.student_id})</p>
                    <p className="text-sm text-gray-600">
                      메시지 {student.message_count}개 · 활동 {student.activity_count}개
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={student.engagement_score >= 80 ? 'default' : 
                          student.engagement_score >= 60 ? 'secondary' : 'outline'}
                  className={student.engagement_score >= 80 ? 'bg-green-600' : ''}
                >
                  {student.engagement_score}점
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
