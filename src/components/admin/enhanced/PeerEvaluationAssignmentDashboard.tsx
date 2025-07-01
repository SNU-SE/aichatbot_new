
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Clock, User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PeerEvaluationAssignmentDashboardProps {
  activityId: string;
  activityTitle: string;
}

interface AssignmentInfo {
  evaluator_id: string;
  evaluator_name: string;
  evaluator_class: string;
  evaluator_group: string | null;
  target_student_id: string;
  target_student_name: string;
  target_student_class: string;
  target_student_group: string | null;
  is_completed: boolean;
  evaluation_id: string;
}

interface EvaluatorSummary {
  evaluator_id: string;
  evaluator_name: string;
  evaluator_class: string;
  evaluator_group: string | null;
  assignments: {
    target_student_id: string;
    target_student_name: string;
    target_student_group: string | null;
    is_completed: boolean;
    evaluation_id: string;
  }[];
  completed_count: number;
  total_count: number;
}

const PeerEvaluationAssignmentDashboard = ({ activityId, activityTitle }: PeerEvaluationAssignmentDashboardProps) => {
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [evaluatorSummaries, setEvaluatorSummaries] = useState<EvaluatorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, [activityId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      
      // 동료평가 배정 정보와 완료 상태를 함께 조회
      const { data: assignmentData, error } = await supabase
        .from('peer_evaluations')
        .select(`
          id,
          evaluator_id,
          is_completed,
          students!peer_evaluations_evaluator_id_fkey(name, class_name, group_name),
          argumentation_responses!peer_evaluations_target_response_id_fkey(
            student_id,
            students!argumentation_responses_student_id_fkey(name, class_name, group_name)
          )
        `)
        .eq('activity_id', activityId);

      if (error) throw error;

      const formattedAssignments: AssignmentInfo[] = assignmentData?.map(item => ({
        evaluator_id: item.evaluator_id,
        evaluator_name: item.students?.name || '이름없음',
        evaluator_class: item.students?.class_name || '',
        evaluator_group: item.students?.group_name || null,
        target_student_id: item.argumentation_responses?.student_id || '',
        target_student_name: item.argumentation_responses?.students?.name || '이름없음',
        target_student_class: item.argumentation_responses?.students?.class_name || '',
        target_student_group: item.argumentation_responses?.students?.group_name || null,
        is_completed: item.is_completed || false,
        evaluation_id: item.id
      })) || [];

      setAssignments(formattedAssignments);

      // 평가자별로 그룹화
      const evaluatorMap = new Map<string, EvaluatorSummary>();
      
      formattedAssignments.forEach(assignment => {
        if (!evaluatorMap.has(assignment.evaluator_id)) {
          evaluatorMap.set(assignment.evaluator_id, {
            evaluator_id: assignment.evaluator_id,
            evaluator_name: assignment.evaluator_name,
            evaluator_class: assignment.evaluator_class,
            evaluator_group: assignment.evaluator_group,
            assignments: [],
            completed_count: 0,
            total_count: 0
          });
        }

        const evaluator = evaluatorMap.get(assignment.evaluator_id)!;
        evaluator.assignments.push({
          target_student_id: assignment.target_student_id,
          target_student_name: assignment.target_student_name,
          target_student_group: assignment.target_student_group,
          is_completed: assignment.is_completed,
          evaluation_id: assignment.evaluation_id
        });
        
        evaluator.total_count++;
        if (assignment.is_completed) {
          evaluator.completed_count++;
        }
      });

      setEvaluatorSummaries(Array.from(evaluatorMap.values()));

    } catch (error) {
      console.error('배정 정보 조회 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 배정 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  if (evaluatorSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            아직 동료평가가 배정되지 않았습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  // 클래스별로 그룹화
  const classSummaries = evaluatorSummaries.reduce((acc, evaluator) => {
    const className = evaluator.evaluator_class;
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(evaluator);
    return acc;
  }, {} as Record<string, EvaluatorSummary[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>동료평가 배정 현황 - {activityTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{evaluatorSummaries.length}</div>
              <div className="text-sm text-gray-600">평가자 수</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {evaluatorSummaries.reduce((sum, e) => sum + e.completed_count, 0)}
              </div>
              <div className="text-sm text-gray-600">완료된 평가</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {evaluatorSummaries.reduce((sum, e) => sum + e.total_count, 0)}
              </div>
              <div className="text-sm text-gray-600">총 배정된 평가</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(classSummaries).map(([className, evaluators]) => (
        <Card key={className}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{className} 클래스</span>
              <Badge variant="outline">
                {evaluators.length}명
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>평가자</TableHead>
                  <TableHead>배정된 학생</TableHead>
                  <TableHead>진행상황</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluators.map((evaluator) => (
                  <TableRow key={evaluator.evaluator_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{evaluator.evaluator_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {evaluator.evaluator_id}
                          </Badge>
                        </div>
                        {evaluator.evaluator_group && (
                          <Badge variant="outline" className="text-xs">
                            {evaluator.evaluator_group}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {evaluator.assignments.map((assignment, index) => (
                          <div key={assignment.evaluation_id} className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {assignment.is_completed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm">
                                {assignment.target_student_name}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {assignment.target_student_id}
                              </Badge>
                              {assignment.target_student_group && (
                                <Badge variant="outline" className="text-xs">
                                  {assignment.target_student_group}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={evaluator.completed_count === evaluator.total_count ? "default" : "secondary"}
                        >
                          {evaluator.completed_count}/{evaluator.total_count}
                        </Badge>
                        {evaluator.completed_count === evaluator.total_count && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PeerEvaluationAssignmentDashboard;
