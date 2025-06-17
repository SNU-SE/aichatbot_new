import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import ChatInterface from './ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface ArgumentationActivityProps {
  activity: any;
  studentId: string;
  onBack: () => void;
}

const ArgumentationActivity = ({ activity, studentId, onBack }: ArgumentationActivityProps) => {
  const { items, loading, toggleItem } = useChecklistProgress({ 
    studentId, 
    activityId: activity.id 
  });
  const [showArgumentInput, setShowArgumentInput] = useState(false);
  const [showPeerEvaluation, setShowPeerEvaluation] = useState(false);
  const [showEvaluationCheck, setShowEvaluationCheck] = useState(false);
  const [argumentText, setArgumentText] = useState('');
  const [evaluationText, setEvaluationText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [usefulnessRating, setUsefulnessRating] = useState(3);
  const [peerResponse, setPeerResponse] = useState<any>(null);
  const [peerEvaluations, setPeerEvaluations] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStudentStatus();
    checkPeerEvaluationStatus();
  }, [activity.id, studentId]);

  const checkStudentStatus = async () => {
    try {
      // Check if student has submitted argument
      const { data: argResponse } = await supabase
        .from('argumentation_responses')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('student_id', studentId)
        .single();

      if (argResponse) {
        setArgumentText(argResponse.response_text);
        setIsSubmitted(argResponse.is_submitted);
      }

      // Check if evaluation reflection exists
      const { data: reflection } = await supabase
        .from('evaluation_reflections')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('student_id', studentId)
        .single();

      if (reflection) {
        setReflectionText(reflection.reflection_text);
        setUsefulnessRating(reflection.usefulness_rating || 3);
      }
    } catch (error) {
      console.error('상태 확인 실패:', error);
    }
  };

  const checkPeerEvaluationStatus = async () => {
    try {
      // Check for assigned peer evaluations
      const { data: assignments } = await supabase
        .from('peer_evaluations')
        .select(`
          *,
          argumentation_responses!target_response_id(response_text)
        `)
        .eq('evaluator_id', studentId)
        .eq('activity_id', activity.id);

      if (assignments && assignments.length > 0) {
        setShowPeerEvaluation(true);
        setPeerResponse(assignments[0]);
        if (assignments[0].evaluation_text) {
          setEvaluationText(assignments[0].evaluation_text);
        }
      }

      // Check if peer evaluations are available for this student's response
      const { data: studentResponse } = await supabase
        .from('argumentation_responses')
        .select('id')
        .eq('student_id', studentId)
        .eq('activity_id', activity.id)
        .single();

      if (studentResponse) {
        const { data: evaluations } = await supabase
          .from('peer_evaluations')
          .select('*')
          .eq('target_response_id', studentResponse.id)
          .eq('is_completed', true);

        if (evaluations && evaluations.length > 0) {
          setPeerEvaluations(evaluations);
          setShowEvaluationCheck(true);
        }
      }
    } catch (error) {
      console.error('동료평가 상태 확인 실패:', error);
    }
  };

  const submitArgument = async () => {
    if (!argumentText.trim()) {
      toast({
        title: "오류",
        description: "논증을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('argumentation_responses')
        .upsert({
          activity_id: activity.id,
          student_id: studentId,
          response_text: argumentText,
          is_submitted: true
        }, {
          onConflict: 'activity_id,student_id'
        });

      if (error) throw error;

      setIsSubmitted(true);
      setShowArgumentInput(false);
      
      toast({
        title: "성공",
        description: "논증이 제출되었습니다."
      });
    } catch (error: any) {
      toast({
        title: "오류",
        description: "논증 제출에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const submitPeerEvaluation = async () => {
    if (!evaluationText.trim()) {
      toast({
        title: "오류",
        description: "평가 내용을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('peer_evaluations')
        .update({
          evaluation_text: evaluationText,
          is_completed: true,
          submitted_at: new Date().toISOString()
        })
        .eq('id', peerResponse.id);

      if (error) throw error;

      setShowPeerEvaluation(false);
      
      toast({
        title: "성공",
        description: "동료평가가 제출되었습니다."
      });
    } catch (error: any) {
      toast({
        title: "오류",
        description: "동료평가 제출에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const submitReflection = async () => {
    if (!reflectionText.trim()) {
      toast({
        title: "오류",
        description: "성찰 내용을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('evaluation_reflections')
        .upsert({
          student_id: studentId,
          activity_id: activity.id,
          reflection_text: reflectionText,
          usefulness_rating: usefulnessRating
        }, {
          onConflict: 'student_id,activity_id'
        });

      if (error) throw error;

      setShowEvaluationCheck(false);
      
      toast({
        title: "성공",
        description: "평가 확인이 제출되었습니다."
      });
    } catch (error: any) {
      toast({
        title: "오류",
        description: "평가 확인 제출에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">논증 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Panel: Checklist and Controls */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{activity.title}</h2>
          <p className="text-sm text-gray-600 mt-1">논증 활동</p>
        </div>
        
        {/* Checklist */}
        <div className="flex-1 p-4">
          <Card>
            <CardHeader>
              <CardTitle>체크리스트</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50">
                      <Checkbox 
                        checked={item.is_completed}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <span className={`text-sm ${item.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            <Button 
              onClick={() => setShowArgumentInput(true)}
              className="w-full"
              disabled={isSubmitted}
            >
              {isSubmitted ? '논증 제출완료' : '논증 입력'}
            </Button>
            <Button 
              onClick={() => setShowPeerEvaluation(true)}
              className="w-full"
              variant="outline"
              disabled={!peerResponse || peerResponse.is_completed}
            >
              {peerResponse?.is_completed ? '동료평가 완료' : '동료 평가'}
            </Button>
            <Button 
              onClick={() => setShowEvaluationCheck(true)}
              className="w-full"
              variant="outline"
              disabled={peerEvaluations.length === 0}
            >
              평가 확인
            </Button>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onBack} className="w-full">
            활동 목록으로
          </Button>
        </div>
      </div>

      {/* Right Panel: Chat + Overlay */}
      <div className="flex-1 relative">
        {/* Chat Interface - Always Visible */}
        <div className="h-full">
          <ChatInterface 
            activity={activity}
            studentId={studentId}
            onBack={onBack}
            checklistContext={{
              currentStep: items.find(item => !item.is_completed)?.description || "모든 단계가 완료되었습니다.",
              allSteps: items
            }}
          />
        </div>

        {/* Overlay Panels */}
        {showArgumentInput && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>논증 입력</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowArgumentInput(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">질문:</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {activity.final_question || "질문이 설정되지 않았습니다."}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">답변:</h4>
                  <Textarea
                    value={argumentText}
                    onChange={(e) => setArgumentText(e.target.value)}
                    placeholder="논증을 작성해주세요..."
                    className="min-h-32"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={submitArgument}>제출</Button>
                  <Button variant="outline" onClick={() => setShowArgumentInput(false)}>
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showPeerEvaluation && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>동료 평가</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPeerEvaluation(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">평가할 응답:</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-700">{peerResponse?.argumentation_responses?.response_text}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">평가 내용:</h4>
                  <Textarea
                    value={evaluationText}
                    onChange={(e) => setEvaluationText(e.target.value)}
                    placeholder="동료의 응답에 대한 평가를 작성해주세요..."
                    className="min-h-32"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={submitPeerEvaluation}>평가 제출</Button>
                  <Button variant="outline" onClick={() => setShowPeerEvaluation(false)}>
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showEvaluationCheck && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>평가 확인</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEvaluationCheck(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">받은 평가들:</h4>
                  <div className="space-y-2">
                    {peerEvaluations.map((evaluation, index) => (
                      <div key={evaluation.id} className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">평가 {index + 1}</p>
                        <p className="text-gray-700">{evaluation.evaluation_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">이 평가들이 얼마나 유익했나요?</h4>
                  <Textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="받은 평가에 대한 생각을 작성해주세요..."
                    className="min-h-24"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">유익함 정도 (1-5점):</h4>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={usefulnessRating === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUsefulnessRating(rating)}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={submitReflection}>저장</Button>
                  <Button variant="outline" onClick={() => setShowEvaluationCheck(false)}>
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArgumentationActivity;
