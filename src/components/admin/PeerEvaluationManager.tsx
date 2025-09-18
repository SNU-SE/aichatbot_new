
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Shuffle, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PeerEvaluationStats from './enhanced/PeerEvaluationStats';

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
  const [completing, setCompleting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const { toast } = useToast();
  const [peerEvaluationEnabled, setPeerEvaluationEnabled] = useState(true);
  const [activitySettingsLoading, setActivitySettingsLoading] = useState(true);

  useEffect(() => {
    fetchAvailableClasses();
  }, [activityId]);

  useEffect(() => {
    const loadActivitySettings = async () => {
      setActivitySettingsLoading(true);
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('enable_peer_evaluation')
          .eq('id', activityId)
          .single();

        if (error) throw error;
        setPeerEvaluationEnabled(data?.enable_peer_evaluation !== false);
      } catch (error) {
        console.error('활동 설정 로드 오류:', error);
        setPeerEvaluationEnabled(true);
      } finally {
        setActivitySettingsLoading(false);
      }
    };

    if (activityId) {
      loadActivitySettings();
    }
  }, [activityId]);

  useEffect(() => {
    if (selectedClass) {
      fetchEvaluationData();
    }
  }, [activityId, selectedClass]);

  const fetchAvailableClasses = async () => {
    try {
      const { data: classData, error } = await supabase
        .from('argumentation_responses')
        .select(`
          students!inner(class_name)
        `)
        .eq('activity_id', activityId)
        .eq('is_submitted', true);

      if (error) throw error;

      const classes = [...new Set(classData?.map(item => item.students.class_name) || [])];
      setAvailableClasses(classes);
      if (classes.length > 0 && !selectedClass) {
        setSelectedClass(classes[0]);
      }
    } catch (error) {
      console.error('클래스 목록 로딩 오류:', error);
    }
  };

  const fetchEvaluationData = async () => {
    if (!selectedClass) return;

    try {
      // 선택된 클래스의 통계 가져오기
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_peer_evaluation_stats_by_class', { activity_id_param: activityId });

      if (statsError) throw statsError;

      const classStats = statsData?.find(stat => stat.class_name === selectedClass);
      if (classStats) {
        setStats({
          total_responses: classStats.total_responses,
          submitted_responses: classStats.submitted_responses,
          total_evaluations: classStats.total_evaluations,
          completed_evaluations: classStats.completed_evaluations,
          completion_rate: classStats.completion_rate
        });
      }

      // 선택된 클래스의 학생들 목록 가져오기
      const { data: studentsData, error: studentsError } = await supabase
        .from('argumentation_responses')
        .select(`
          student_id,
          students!inner(name, class_name)
        `)
        .eq('activity_id', activityId)
        .eq('students.class_name', selectedClass);

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
    if (!selectedClass) {
      toast({
        title: "알림",
        description: "클래스를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!stats?.submitted_responses || stats.submitted_responses < 2) {
      toast({
        title: "알림",
        description: "동료평가를 진행하려면 최소 2명 이상의 학생이 논증을 제출해야 합니다.",
        variant: "destructive"
      });
      return;
    }

    if (!peerEvaluationEnabled) {
      toast({
        title: "동료평가 비활성화",
        description: "이 활동에서는 동료평가가 꺼져 있습니다. 활동 편집에서 동료평가를 활성화한 후 다시 시도해주세요.",
        variant: "destructive"
      });
      return;
    }

    setAssigning(true);
    try {
      const { data, error } = await supabase
        .rpc('assign_peer_evaluations_by_class', { 
          activity_id_param: activityId,
          target_class: selectedClass
        });

      if (error) throw error;

      // 평가 배정 후 단계를 peer-evaluation으로 업데이트
      await supabase.rpc('update_peer_evaluation_phase', {
        activity_id_param: activityId,
        class_name_param: selectedClass,
        new_phase: 'peer-evaluation'
      });

      toast({
        title: "성공",
        description: `${selectedClass}반에 ${data}개의 동료평가가 배정되었습니다.`
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

  const handleCompleteEvaluations = async () => {
    if (!selectedClass) {
      toast({
        title: "알림",
        description: "클래스를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!stats?.completed_evaluations || stats.completed_evaluations === 0) {
      toast({
        title: "알림",
        description: "완료된 동료평가가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    if (!peerEvaluationEnabled) {
      toast({
        title: "동료평가 비활성화",
        description: "이 활동에서는 동료평가가 꺼져 있습니다.",
        variant: "destructive"
      });
      return;
    }

    setCompleting(true);
    try {
      // 평가 완료 단계로 업데이트 (학생들이 결과를 확인할 수 있게 됨)
      const { error } = await supabase.rpc('update_peer_evaluation_phase', {
        activity_id_param: activityId,
        class_name_param: selectedClass,
        new_phase: 'evaluation-check'
      });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${selectedClass}반 학생들이 동료평가 결과를 확인할 수 있습니다.`
      });

      // 데이터 새로고침
      await fetchEvaluationData();
    } catch (error) {
      console.error('동료평가 완료 처리 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 완료 처리에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setCompleting(false);
    }
  };

  if ((loading && availableClasses.length === 0) || activitySettingsLoading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{activityTitle} - 동료평가 관리</span>
            </div>
            <div className="flex items-center space-x-2">
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1 border rounded-md"
              >
                <option value="">클래스 선택</option>
                {availableClasses.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => setShowStats(!showStats)}
              >
                {showStats ? '기본 보기' : '상세 통계'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!peerEvaluationEnabled && (
            <div className="flex items-start space-x-2 p-3 mb-6 rounded-md border border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p>이 활동에서는 동료평가가 비활성화되어 있습니다.</p>
                <p>활동 편집에서 동료평가를 다시 활성화해야 학생 배정과 결과 공개를 진행할 수 있습니다.</p>
              </div>
            </div>
          )}

          {selectedClass && stats && (
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

          {selectedClass && (
            <div className="flex space-x-2 mb-6">
              <Button
                onClick={handleAssignEvaluations}
                disabled={assigning || !stats?.submitted_responses || stats.submitted_responses < 2 || !peerEvaluationEnabled}
                className="flex items-center space-x-2"
              >
                <Shuffle className="h-4 w-4" />
                <span>{assigning ? '배정 중...' : '동료평가 배정'}</span>
              </Button>
              
              <Button
                onClick={handleCompleteEvaluations}
                disabled={completing || !stats?.completed_evaluations || !peerEvaluationEnabled}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{completing ? '처리 중...' : '동료평가완료'}</span>
              </Button>
            </div>
          )}

          {selectedClass && stats && stats.submitted_responses < 2 && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                동료평가를 진행하려면 최소 2명 이상의 학생이 논증을 제출해야 합니다.
              </span>
            </div>
          )}

          {!selectedClass && (
            <div className="text-center py-8 text-gray-500">
              클래스를 선택해주세요.
            </div>
          )}
        </CardContent>
      </Card>

      {showStats && selectedClass ? (
        <PeerEvaluationStats activityId={activityId} activityTitle={activityTitle} />
      ) : selectedClass ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{selectedClass}반 학생별 동료평가 현황</span>
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
                      <Badge variant={student.completed_evaluations === student.assigned_evaluations && student.assigned_evaluations > 0 ? "default" : "secondary"}>
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
      ) : null}
    </div>
  );
};

export default PeerEvaluationManager;
