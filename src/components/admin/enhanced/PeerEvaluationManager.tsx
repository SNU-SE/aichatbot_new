
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Shuffle, CheckCircle, Download, Eye, Star } from 'lucide-react';
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
  argument_text: string;
  evaluations: {
    evaluator_id: string;
    evaluator_name: string;
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
    if (stats.submittedArguments < 2) {
      toast({
        title: "알림",
        description: "동료평가를 진행하려면 최소 2명 이상의 학생이 논증을 제출해야 합니다.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('assign_peer_evaluations', { activity_id_param: selectedActivity });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${data}개의 동료평가가 배정되었습니다.`
      });

      await fetchStats();
    } catch (error) {
      console.error('동료평가 배정 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 배정에 실패했습니다.",
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
      // 모든 논증 응답 가져오기
      const { data: responses, error: responsesError } = await supabase
        .from('argumentation_responses')
        .select(`
          student_id,
          response_text,
          students!inner(name)
        `)
        .eq('activity_id', selectedActivity)
        .eq('is_submitted', true);

      if (responsesError) throw responsesError;

      const data: ArgumentationData[] = [];

      for (const response of responses || []) {
        // 해당 응답에 대한 모든 평가 가져오기
        const { data: evaluations, error: evaluationsError } = await supabase
          .from('peer_evaluations')
          .select(`
            evaluator_id,
            evaluation_text,
            students!inner(name)
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

        const evaluationsWithRating = evaluations?.map((eval, index) => ({
          evaluator_id: eval.evaluator_id,
          evaluator_name: eval.students.name || '이름없음',
          evaluation_text: eval.evaluation_text || '',
          usefulness_rating: reflections?.[index]?.usefulness_rating
        })) || [];

        data.push({
          student_id: response.student_id,
          student_name: response.students.name || '이름없음',
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
      arg.evaluations.map(eval => ({
        '학생ID': arg.student_id,
        '학생이름': arg.student_name,
        '논증내용': arg.argument_text,
        '평가자ID': eval.evaluator_id,
        '평가자이름': eval.evaluator_name,
        '평가내용': eval.evaluation_text,
        '도움정도평가': eval.usefulness_rating || '미평가'
      }))
    );

    const csv = generateCSV(csvData, [
      '학생ID', '학생이름', '논증내용', '평가자ID', '평가자이름', '평가내용', '도움정도평가'
    ]);

    downloadCSV(csv, `peer_evaluation_${activityTitle}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (selectedActivity === 'all') {
    return (
      <div className="text-center py-8 text-gray-500">
        동료평가 관리를 위해 특정 논증 활동을 선택해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            {stats.completedEvaluations > 0 ? Math.round((stats.completedEvaluations / stats.assignedEvaluations) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">완료율</div>
        </div>
      </div>

      {/* 동료평가 관리 버튼 */}
      <div className="flex space-x-4">
        <Button
          onClick={handleAssignEvaluations}
          disabled={loading || stats.submittedArguments < 2}
          className="flex items-center space-x-2"
        >
          <Shuffle className="h-4 w-4" />
          <span>동료평가 배정</span>
        </Button>

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
                    <CardTitle className="text-lg">
                      {arg.student_name} ({arg.student_id})
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
                          {arg.evaluations.map((eval, evalIndex) => (
                            <div key={evalIndex} className="border rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">
                                  평가자: {eval.evaluator_name} ({eval.evaluator_id})
                                </span>
                                {eval.usefulness_rating && (
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm">{eval.usefulness_rating}/5</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm">{eval.evaluation_text}</p>
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

      {stats.submittedArguments < 2 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            동료평가를 진행하려면 최소 2명 이상의 학생이 논증을 제출해야 합니다.
            현재 {stats.submittedArguments}명이 제출했습니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default PeerEvaluationManager;
