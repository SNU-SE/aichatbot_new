
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Shuffle, CheckCircle, AlertCircle, Settings, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PeerEvaluationStats from './PeerEvaluationStats';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PeerEvaluationManagerProps {
  selectedClass: string;
  selectedActivity: string;
  activityTitle: string;
}

interface EvaluationStats {
  total_responses: number;
  submitted_responses: number;
  total_evaluations: number;
  completed_evaluations: number;
  completion_rate: number;
}

interface ClassEvaluationStats {
  class_name: string;
  total_responses: number;
  submitted_responses: number;
  total_evaluations: number;
  completed_evaluations: number;
  completion_rate: number;
}

interface StudentStatus {
  student_id: string;
  name: string;
  class_name: string;
  has_submitted_response: boolean;
  assigned_evaluations: number;
  completed_evaluations: number;
  received_evaluations: number;
}

const PeerEvaluationManager = ({ selectedClass, selectedActivity, activityTitle }: PeerEvaluationManagerProps) => {
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [classByClassStats, setClassByClassStats] = useState<ClassEvaluationStats[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<StudentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [evaluationsPerStudent, setEvaluationsPerStudent] = useState(2);
  const [groupOffset, setGroupOffset] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluationData();
  }, [selectedActivity, selectedClass]);

  const fetchEvaluationData = async () => {
    if (selectedActivity === 'all') return;
    
    try {
      setLoading(true);
      
      // 전체 통계 가져오기
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_peer_evaluation_stats', { activity_id_param: selectedActivity });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // 클래스별 통계 가져오기
      const { data: classStatsData, error: classStatsError } = await supabase
        .rpc('get_peer_evaluation_stats_by_class', { activity_id_param: selectedActivity });

      if (classStatsError) throw classStatsError;

      setClassByClassStats(classStatsData || []);

      // 활동에 참여한 학생들 목록 가져오기 (클래스 필터링 적용)
      let studentsQuery = supabase
        .from('argumentation_responses')
        .select(`
          student_id,
          students!inner(name, class_name)
        `)
        .eq('activity_id', selectedActivity);

      if (selectedClass !== 'all') {
        studentsQuery = studentsQuery.eq('students.class_name', selectedClass);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      // 각 학생의 상태 가져오기
      const studentStatusPromises = studentsData?.map(async (student) => {
        const { data: statusData, error: statusError } = await supabase
          .rpc('get_student_evaluation_status', {
            student_id_param: student.student_id,
            activity_id_param: selectedActivity
          });

        if (statusError) throw statusError;

        return {
          student_id: student.student_id,
          name: student.students.name || '이름없음',
          class_name: student.students.class_name,
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

  const handleRandomAssign = async () => {
    if (!stats?.submitted_responses || stats.submitted_responses < 2) {
      toast({
        title: "알림",
        description: "동료평가를 진행하려면 최소 2명 이상의 학생이 논증을 제출해야 합니다.",
        variant: "destructive"
      });
      return;
    }

    setAssigning(true);
    try {
      const { data, error } = await supabase
        .rpc('assign_peer_evaluations', { activity_id_param: selectedActivity });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${data}개의 동료평가가 랜덤 배정되었습니다.`
      });

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

  const handleSpecificAssign = async () => {
    if (!stats?.submitted_responses || stats.submitted_responses < (evaluationsPerStudent + 1)) {
      toast({
        title: "알림",
        description: `특정 배정을 진행하려면 최소 ${evaluationsPerStudent + 1}명 이상의 학생이 논증을 제출해야 합니다.`,
        variant: "destructive"
      });
      return;
    }

    setAssigning(true);
    try {
      const { data, error } = await supabase
        .rpc('assign_peer_evaluations_specific', { 
          activity_id_param: selectedActivity,
          evaluations_per_student: evaluationsPerStudent,
          group_offset: groupOffset
        });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${data}개의 동료평가가 특정 배정되었습니다.`
      });

      await fetchEvaluationData();
    } catch (error: any) {
      console.error('특정 동료평가 배정 오류:', error);
      toast({
        title: "오류",
        description: error.message || "특정 동료평가 배정에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteEvaluations = async () => {
    if (!stats?.total_evaluations || stats.total_evaluations === 0) {
      toast({
        title: "알림",
        description: "삭제할 동료평가가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('peer_evaluations')
        .delete()
        .eq('activity_id', selectedActivity);

      if (error) throw error;

      toast({
        title: "성공",
        description: "모든 동료평가가 삭제되었습니다."
      });

      await fetchEvaluationData();
    } catch (error) {
      console.error('동료평가 삭제 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 삭제에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCompleteEvaluations = async () => {
    if (!stats?.completed_evaluations || stats.completed_evaluations === 0) {
      toast({
        title: "알림",
        description: "완료된 동료평가가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    setCompleting(true);
    try {
      toast({
        title: "성공",
        description: "학생들이 동료평가 결과를 확인할 수 있습니다."
      });
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

  if (selectedActivity === 'all') {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>특정 논증 활동을 선택해주세요.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  const filteredStudents = selectedClass === 'all' 
    ? studentStatuses 
    : studentStatuses.filter(s => s.class_name === selectedClass);

  const filteredClassStats = selectedClass === 'all' 
    ? classByClassStats 
    : classByClassStats.filter(s => s.class_name === selectedClass);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{activityTitle} - 동료평가 관리</span>
              {selectedClass !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  {selectedClass}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? '기본 보기' : '상세 통계'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 클래스별 통계 */}
          {filteredClassStats.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">클래스별 통계</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClassStats.map((classStats) => (
                  <Card key={classStats.class_name} className="p-4">
                    <h4 className="font-medium text-center mb-3">{classStats.class_name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{classStats.submitted_responses}</div>
                        <div className="text-xs text-gray-600">제출 응답</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{classStats.total_evaluations}</div>
                        <div className="text-xs text-gray-600">배정 평가</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{classStats.completed_evaluations}</div>
                        <div className="text-xs text-gray-600">완료 평가</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">{classStats.completion_rate}%</div>
                        <div className="text-xs text-gray-600">완료율</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

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

          {/* 배정 설정 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
            <div>
              <Label htmlFor="evaluations-per-student" className="text-sm font-medium">
                학생당 평가 개수
              </Label>
              <Input
                id="evaluations-per-student"
                type="number"
                min="1"
                max="10"
                value={evaluationsPerStudent}
                onChange={(e) => setEvaluationsPerStudent(parseInt(e.target.value) || 2)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="group-offset" className="text-sm font-medium">
                그룹 오프셋
              </Label>
              <Input
                id="group-offset"
                type="number"
                min="1"
                max="5"
                value={groupOffset}
                onChange={(e) => setGroupOffset(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">1조→2조, 2조→3조 등</p>
            </div>

            <div className="md:col-span-2 flex items-end space-x-2">
              <Button
                onClick={handleRandomAssign}
                disabled={assigning || !stats?.submitted_responses || stats.submitted_responses < 2}
                className="flex items-center space-x-2"
              >
                <Shuffle className="h-4 w-4" />
                <span>{assigning ? '배정 중...' : '랜덤 배정'}</span>
              </Button>
              
              <Button
                onClick={handleSpecificAssign}
                disabled={assigning || !stats?.submitted_responses || stats.submitted_responses < (evaluationsPerStudent + 1)}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>{assigning ? '배정 중...' : '특정 배정'}</span>
              </Button>
              
              <Button
                onClick={handleDeleteEvaluations}
                disabled={deleting || !stats?.total_evaluations}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deleting ? '삭제 중...' : '배정 삭제'}</span>
              </Button>
              
              <Button
                onClick={handleCompleteEvaluations}
                disabled={completing || !stats?.completed_evaluations}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{completing ? '처리 중...' : '평가완료'}</span>
              </Button>
            </div>
          </div>

          {stats && stats.submitted_responses < (evaluationsPerStudent + 1) && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                특정 배정을 진행하려면 최소 {evaluationsPerStudent + 1}명 이상의 학생이 논증을 제출해야 합니다.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {showStats ? (
        <PeerEvaluationStats activityId={selectedActivity} activityTitle={activityTitle} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>학생별 동료평가 현황</span>
              </div>
              <div className="text-sm text-gray-500">
                총 {filteredStudents.length}명
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <div key={student.student_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-gray-600">
                        {student.student_id} | {student.class_name}
                      </div>
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
              
              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>해당 조건에 맞는 학생이 없습니다.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeerEvaluationManager;
