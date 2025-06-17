
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, FileText, BarChart3, Shuffle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PeerEvaluationManagerProps {
  activityId: string;
  activityTitle: string;
}

interface EvaluationStats {
  total_responses: number;
  submitted_responses: number;
  total_evaluations: number;
  completed_evaluations: number;
  completion_rate: number;
}

interface StudentStatus {
  student_id: string;
  name: string;
  has_submitted_response: boolean;
  assigned_evaluations: number;
  completed_evaluations: number;
  received_evaluations: number;
}

const PeerEvaluationManager = ({ activityId, activityTitle }: PeerEvaluationManagerProps) => {
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [studentStatuses, setStudentStatuses] = useState<StudentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluationData();
  }, [activityId]);

  const fetchEvaluationData = async () => {
    try {
      // 전체 통계 가져오기
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_peer_evaluation_stats', { activity_id_param: activityId });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // 활동에 참여한 학생들 목록 가져오기
      const { data: studentsData, error: studentsError } = await supabase
        .from('argumentation_responses')
        .select(`
          student_id,
          students!inner(name)
        `)
        .eq('activity_id', activityId);

      if (studentsError) throw studentsError;

      // 각 학생의 상태 가져오기
      const studentStatusPromises = studentsData?.map(async (student) => {
        const { data: statusData, error: statusError } = await supabase
          .rpc('get_student_evaluation_status', {
            student_id_param: student.student_id,
            activity_id_param: activityId
          });

        if (statusError) throw statusError;

        return {
          student_id: student.student_id,
          name: student.students.name || '이름없음',
          ...statusData[0]
        };
      }) || [];

      const resolvedStatuses = await Promise.all(studentStatusPromises);
      setStudentStatuses(resolvedStatuses);

    } catch (error) {
      console.error('동료평가 데이터 로딩 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEvaluations = async () => {
    setAssigning(true);
    try {
      const { data, error } = await supabase
        .rpc('assign_peer_evaluations', { activity_id_param: activityId });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${data}개의 동료평가가 배정되었습니다.`
      });

      // 데이터 새로고침
      await fetchEvaluationData();
    } catch (error) {
      console.error('동료평가 배정 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 배정에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{activityTitle} - 동료평가 관리</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.submitted_responses}</div>
                <div className="text-sm text-gray-600">제출된 응답</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.total_evaluations}</div>
                <div className="text-sm text-gray-600">배정된 평가</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.completed_evaluations}</div>
                <div className="text-sm text-gray-600">완료된 평가</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.completion_rate}%</div>
                <div className="text-sm text-gray-600">완료율</div>
              </div>
            </div>
          )}

          <div className="flex space-x-2 mb-6">
            <Button
              onClick={handleAssignEvaluations}
              disabled={assigning || !stats?.submitted_responses}
              className="flex items-center space-x-2"
            >
              <Shuffle className="h-4 w-4" />
              <span>{assigning ? '배정 중...' : '동료평가 배정'}</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchEvaluationData}
              className="flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>새로고침</span>
            </Button>
          </div>

          {stats && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>전체 진행률</span>
                <span>{stats.completion_rate}%</span>
              </div>
              <Progress value={stats.completion_rate} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>학생별 동료평가 현황</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {studentStatuses.map((student) => (
              <div key={student.student_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-gray-600">({student.student_id})</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    {student.has_submitted_response ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span>응답 제출</span>
                  </div>
                  
                  <div className="text-center">
                    <Badge variant={student.completed_evaluations === student.assigned_evaluations ? "default" : "secondary"}>
                      평가: {student.completed_evaluations}/{student.assigned_evaluations}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <Badge variant="outline">
                      받은 평가: {student.received_evaluations}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PeerEvaluationManager;
