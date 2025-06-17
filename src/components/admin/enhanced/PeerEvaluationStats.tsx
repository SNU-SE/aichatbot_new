
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV, generateCSV } from '@/utils/csvUtils';

interface PeerEvaluationStatsProps {
  activityId: string;
  activityTitle: string;
}

interface EvaluationData {
  student_id: string;
  student_name: string;
  argument_text: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluation_text: string;
  reflection_text: string;
  usefulness_rating: number;
  submitted_at: string;
}

const PeerEvaluationStats = ({ activityId, activityTitle }: PeerEvaluationStatsProps) => {
  const [stats, setStats] = useState<any>(null);
  const [evaluationData, setEvaluationData] = useState<EvaluationData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [activityId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 통계 데이터 가져오기
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_peer_evaluation_stats', { activity_id_param: activityId });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // 상세 평가 데이터 가져오기
      const { data: detailData, error: detailError } = await supabase
        .from('peer_evaluations')
        .select(`
          evaluator_id,
          evaluation_text,
          submitted_at,
          argumentation_responses!target_response_id(
            student_id,
            response_text,
            students!inner(name)
          )
        `)
        .eq('activity_id', activityId)
        .eq('is_completed', true);

      if (detailError) throw detailError;

      // 평가자 이름 가져오기
      const evaluatorIds = detailData?.map(d => d.evaluator_id) || [];
      const { data: evaluatorData, error: evaluatorError } = await supabase
        .from('students')
        .select('student_id, name')
        .in('student_id', evaluatorIds);

      if (evaluatorError) throw evaluatorError;

      // 성찰 데이터 가져오기
      const { data: reflectionData, error: reflectionError } = await supabase
        .from('evaluation_reflections')
        .select('*')
        .eq('activity_id', activityId);

      if (reflectionError) throw reflectionError;

      // 데이터 병합
      const formattedData: EvaluationData[] = detailData?.map(evaluation => {
        const evaluator = evaluatorData?.find(e => e.student_id === evaluation.evaluator_id);
        const reflection = reflectionData?.find(r => r.student_id === evaluation.argumentation_responses.student_id);
        
        return {
          student_id: evaluation.argumentation_responses.student_id,
          student_name: evaluation.argumentation_responses.students.name || '이름없음',
          argument_text: evaluation.argumentation_responses.response_text,
          evaluator_id: evaluation.evaluator_id,
          evaluator_name: evaluator?.name || '이름없음',
          evaluation_text: evaluation.evaluation_text || '',
          reflection_text: reflection?.reflection_text || '',
          usefulness_rating: reflection?.usefulness_rating || 0,
          submitted_at: evaluation.submitted_at || ''
        };
      }) || [];

      setEvaluationData(formattedData);

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

  const downloadEvaluationData = () => {
    if (evaluationData.length === 0) {
      toast({
        title: "알림",
        description: "다운로드할 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = [
      '학생ID', '학생이름', '논증내용', '평가자ID', '평가자이름', 
      '평가내용', '성찰내용', '유익도점수', '제출시간'
    ];

    const csvData = evaluationData.map(item => ({
      '학생ID': item.student_id,
      '학생이름': item.student_name,
      '논증내용': item.argument_text.substring(0, 100) + (item.argument_text.length > 100 ? '...' : ''),
      '평가자ID': item.evaluator_id,
      '평가자이름': item.evaluator_name,
      '평가내용': item.evaluation_text,
      '성찰내용': item.reflection_text,
      '유익도점수': item.usefulness_rating,
      '제출시간': new Date(item.submitted_at).toLocaleString('ko-KR')
    }));

    const csvContent = generateCSV(csvData, csvHeaders);
    const today = new Date().toISOString().split('T')[0];
    const filename = `동료평가결과_${activityTitle}_${today}.csv`;
    
    downloadCSV(csvContent, filename);
    
    toast({
      title: "다운로드 완료",
      description: `${filename} 파일이 다운로드되었습니다.`
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>동료평가 진행 현황</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  새로고침
                </Button>
                <Button variant="outline" size="sm" onClick={downloadEvaluationData}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV 다운로드
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.submitted_responses}</div>
                <div className="text-sm text-gray-600">제출된 논증</div>
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
            
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>전체 진행률</span>
                <span>{stats.completion_rate}%</span>
              </div>
              <Progress value={stats.completion_rate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {evaluationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>평가 결과 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluationData.slice(0, 5).map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium">{item.student_name}</span>
                      <span className="text-sm text-gray-500 ml-2">({item.student_id})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">평가자: {item.evaluator_name}</div>
                      {item.usefulness_rating > 0 && (
                        <div className="text-sm">유익도: {item.usefulness_rating}/5</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    논증: {item.argument_text.substring(0, 100)}...
                  </div>
                  <div className="text-sm text-gray-700">
                    평가: {item.evaluation_text}
                  </div>
                </div>
              ))}
              {evaluationData.length > 5 && (
                <div className="text-center text-sm text-gray-500">
                  그 외 {evaluationData.length - 5}개의 평가 결과가 더 있습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeerEvaluationStats;
