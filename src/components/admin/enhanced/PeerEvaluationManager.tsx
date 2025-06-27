import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users, Shuffle, CheckCircle, Download, Eye, Star, Info, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateCSV, downloadCSV } from '@/utils/csvUtils';

interface PeerEvaluationManagerProps {
  selectedClass: string;
  selectedActivity: string;
  activityTitle: string;
}

interface ArgumentationData {
  student_id: string;
  student_name: string;
  group_name: string | null;
  argument_text: string;
  evaluations: {
    evaluator_id: string;
    evaluator_name: string;
    evaluator_group: string | null;
    evaluation_text: string;
    usefulness_rating?: number;
  }[];
}

interface Stats {
  totalStudents: number;
  submittedArguments: number;
  assignedEvaluations: number;
  completedEvaluations: number;
  feedbackResponses: number;
}

const PeerEvaluationManager = ({ selectedClass, selectedActivity, activityTitle }: PeerEvaluationManagerProps) => {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    submittedArguments: 0,
    assignedEvaluations: 0,
    completedEvaluations: 0,
    feedbackResponses: 0
  });
  const [argumentationData, setArgumentationData] = useState<ArgumentationData[]>([]);
  const [evaluationsPerStudent, setEvaluationsPerStudent] = useState(2);
  const [groupOffset, setGroupOffset] = useState("1");
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedActivity && selectedActivity !== 'all') {
      fetchStats();
    }
  }, [selectedActivity, selectedClass]);

  const fetchStats = async () => {
    try {
      // 기본 통계 가져오기
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_peer_evaluation_stats', { activity_id_param: selectedActivity });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        const stat = statsData[0];
        
        // 피드백 응답 수 가져오기
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('evaluation_reflections')
          .select('id')
          .eq('activity_id', selectedActivity);

        if (feedbackError) throw feedbackError;

        setStats({
          totalStudents: stat.total_responses || 0,
          submittedArguments: stat.submitted_responses || 0,
          assignedEvaluations: stat.total_evaluations || 0,
          completedEvaluations: stat.completed_evaluations || 0,
          feedbackResponses: feedbackData?.length || 0
        });
      }
    } catch (error) {
      console.error('통계 가져오기 오류:', error);
    }
  };

  const handleAssignEvaluations = async () => {
    const minStudents = 1;
    if (stats.submittedArguments < minStudents) {
      toast({
        title: "알림",
        description: `동료평가를 진행하려면 최소 ${minStudents}명 이상의 학생이 논증을 제출해야 합니다.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('assign_peer_evaluations', { 
          activity_id_param: selectedActivity,
          evaluations_per_student: evaluationsPerStudent
        });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${data}개의 동료평가가 랜덤 배정되었습니다. 각 학생은 ${evaluationsPerStudent}개의 응답을 평가합니다.`
      });

      await fetchStats();
    } catch (error) {
      console.error('동료평가 배정 오류:', error);
      toast({
        title: "오류",
        description: error.message || "동료평가 배정에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSpecificEvaluations = async () => {
    const minStudents = 1;
    if (stats.submittedArguments < minStudents) {
      toast({
        title: "알림",
        description: `동료평가를 진행하려면 최소 ${minStudents}명 이상의 학생이 논증을 제출해야 합니다.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('assign_peer_evaluations_specific' as any, { 
          activity_id_param: selectedActivity,
          evaluations_per_student: evaluationsPerStudent,
          group_offset: parseInt(groupOffset)
        });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${data}개의 동료평가가 특정 배정되었습니다. 각 학생은 자신의 조 +${groupOffset}조의 ${evaluationsPerStudent}개 응답을 평가합니다.`
      });

      await fetchStats();
    } catch (error) {
      console.error('특정 동료평가 배정 오류:', error);
      toast({
        title: "오류",
        description: error.message || "특정 동료평가 배정에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePeerEvaluation = async () => {
    toast({
      title: "동료평가 완료",
      description: "학생들이 이제 동료평가 결과를 확인할 수 있습니다."
    });
  };

  const fetchArgumentationData = async () => {
    setLoading(true);
    try {
      // 모든 논증 응답 가져오기 (모둠 정보 포함)
      const { data: responses, error: responsesError } = await supabase
        .from('argumentation_responses')
        .select(`
          id,
          student_id,
          response_text,
          students!inner(name, group_name)
        `)
        .eq('activity_id', selectedActivity)
        .eq('is_submitted', true);

      if (responsesError) throw responsesError;

      const data: ArgumentationData[] = [];

      for (const response of responses || []) {
        // 해당 응답에 대한 모든 평가 가져오기 (평가자의 모둠 정보 포함)
        const { data: evaluations, error: evaluationsError } = await supabase
          .from('peer_evaluations')
          .select(`
            evaluator_id,
            evaluation_text,
            students!inner(name, group_name)
          `)
          .eq('target_response_id', response.id)
          .eq('is_completed', true);

        if (evaluationsError) throw evaluationsError;

        // 피드백 평가 가져오기
        const { data: reflections, error: reflectionsError } = await supabase
          .from('evaluation_reflections')
          .select('usefulness_rating')
          .eq('student_id', response.student_id)
          .eq('activity_id', selectedActivity);

        if (reflectionsError) throw reflectionsError;

        const evaluationsWithRating = evaluations?.map((evaluation, index) => ({
          evaluator_id: evaluation.evaluator_id,
          evaluator_name: evaluation.students.name || '이름없음',
          evaluator_group: evaluation.students.group_name,
          evaluation_text: evaluation.evaluation_text || '',
          usefulness_rating: reflections?.[index]?.usefulness_rating
        })) || [];

        data.push({
          student_id: response.student_id,
          student_name: response.students.name || '이름없음',
          group_name: response.students.group_name,
          argument_text: response.response_text,
          evaluations: evaluationsWithRating
        });
      }

      setArgumentationData(data);
      setShowResults(true);
    } catch (error) {
      console.error('논증 데이터 가져오기 오류:', error);
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    const csvData = argumentationData.flatMap(arg => 
      arg.evaluations.map(evaluation => ({
        '학생ID': arg.student_id,
        '학생이름': arg.student_name,
        '학생모둠': arg.group_name || '-',
        '논증내용': arg.argument_text,
        '평가자ID': evaluation.evaluator_id,
        '평가자이름': evaluation.evaluator_name,
        '평가자모둠': evaluation.evaluator_group || '-',
        '평가내용': evaluation.evaluation_text,
        '도움정도평가': evaluation.usefulness_rating || '미평가'
      }))
    );

    const csv = generateCSV(csvData, [
      '학생ID', '학생이름', '학생모둠', '논증내용', '평가자ID', '평가자이름', '평가자모둠', '평가내용', '도움정도평가'
    ]);

    downloadCSV(csv, `peer_evaluation_${activityTitle}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const decreaseEvaluations = () => {
    if (evaluationsPerStudent > 2) {
      setEvaluationsPerStudent(evaluationsPerStudent - 1);
    }
  };

  const increaseEvaluations = () => {
    setEvaluationsPerStudent(evaluationsPerStudent + 1);
  };

  if (selectedActivity === 'all') {
    return (
      <div className="text-center py-8 text-gray-500">
        동료평가 관리를 위해 특정 논증 활동을 선택해주세요.
      </div>
    );
  }

  const minStudents = 1;

  return (
    <div className="space-y-4">
      {/* 모둠 기반 동료평가 안내 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">모둠 기반 동료평가</p>
              <p><strong>랜덤 배정:</strong> 다른 모둠의 학생들을 랜덤하게 배정합니다.</p>
              <p><strong>특정 배정:</strong> 자신의 조번호에 지정된 숫자를 더한 조의 학생들을 배정합니다. (순환 구조)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.submittedArguments}</div>
          <div className="text-sm text-gray-600">논증 제출</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.assignedEvaluations}</div>
          <div className="text-sm text-gray-600">평가 배정</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.completedEvaluations}</div>
          <div className="text-sm text-gray-600">평가 완료</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.feedbackResponses}</div>
          <div className="text-sm text-gray-600">피드백 응답</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">
            {stats.assignedEvaluations > 0 ? Math.round((stats.completedEvaluations / stats.assignedEvaluations) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">완료율</div>
        </div>
      </div>

      {/* 동료평가 관리 버튼 */}
      <div className="space-y-4">
        {/* 평가할 학생 수 설정 */}
        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
          <span className="text-sm font-medium">학생수:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={decreaseEvaluations}
            disabled={evaluationsPerStudent <= 1}
            className="h-6 w-6 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm font-bold w-6 text-center">{evaluationsPerStudent}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={increaseEvaluations}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-gray-500">(최소 {minStudents}명 필요)</span>
        </div>

        {/* 랜덤 배정 */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleAssignEvaluations}
            disabled={loading || stats.submittedArguments < minStudents}
            className="flex items-center space-x-2"
          >
            <Shuffle className="h-4 w-4" />
            <span>모둠별 동료평가 배정 (랜덤)</span>
          </Button>
        </div>

        {/* 특정 배정 */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleAssignSpecificEvaluations}
            disabled={loading || stats.submittedArguments < minStudents}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>특정 배정</span>
          </Button>
          
          <ToggleGroup type="single" value={groupOffset} onValueChange={setGroupOffset}>
            <ToggleGroupItem value="1" aria-label="Plus 1">+1</ToggleGroupItem>
            <ToggleGroupItem value="2" aria-label="Plus 2">+2</ToggleGroupItem>
            <ToggleGroupItem value="3" aria-label="Plus 3">+3</ToggleGroupItem>
            <ToggleGroupItem value="4" aria-label="Plus 4">+4</ToggleGroupItem>
            <ToggleGroupItem value="5" aria-label="Plus 5">+5</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* 기타 버튼들 */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleCompletePeerEvaluation}
            disabled={stats.completedEvaluations === 0}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>동료평가 완료</span>
          </Button>

          <Dialog open={showResults} onOpenChange={setShowResults}>
            <DialogTrigger asChild>
              <Button
                onClick={fetchArgumentationData}
                disabled={loading || stats.completedEvaluations === 0}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>평가 확인</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>동료평가 결과 - {activityTitle}</span>
                  <Button
                    onClick={handleDownloadCSV}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>CSV 다운로드</span>
                  </Button>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {argumentationData.map((arg, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span>{arg.student_name} ({arg.student_id})</span>
                        {arg.group_name && (
                          <Badge variant="outline">{arg.group_name}모둠</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">논증 내용:</h4>
                          <p className="text-sm bg-gray-50 p-3 rounded">{arg.argument_text}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">받은 평가:</h4>
                          <div className="space-y-2">
                            {arg.evaluations.map((evaluation, evalIndex) => (
                              <div key={evalIndex} className="border rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-sm">
                                      평가자: {evaluation.evaluator_name} ({evaluation.evaluator_id})
                                    </span>
                                    {evaluation.evaluator_group && (
                                      <Badge variant="secondary" className="text-xs">
                                        {evaluation.evaluator_group}모둠
                                      </Badge>
                                    )}
                                  </div>
                                  {evaluation.usefulness_rating && (
                                    <div className="flex items-center space-x-1">
                                      <Star className="h-4 w-4 text-yellow-500" />
                                      <span className="text-sm">{evaluation.usefulness_rating}/5</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm">{evaluation.evaluation_text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {stats.submittedArguments < minStudents && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            동료평가를 진행하려면 최소 {minStudents}명 이상의 학생이 논증을 제출해야 합니다.
            현재 {stats.submittedArguments}명이 제출했습니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default PeerEvaluationManager;
