
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import ChatInterface from './ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [activeTask, setActiveTask] = useState<'none' | 'argument' | 'peer-evaluation' | 'evaluation-check'>('none');
  
  const [argumentText, setArgumentText] = useState('');
  const [evaluationText, setEvaluationText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [usefulnessRating, setUsefulnessRating] = useState(3);
  const [peerResponse, setPeerResponse] = useState<any>(null);
  const [peerEvaluations, setPeerEvaluations] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // 컴포넌트 마운트 시 스크롤을 상단으로 고정
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      setActiveTask('none');
      
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

      setActiveTask('none');
      
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

      setActiveTask('none');
      
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
    <div className="h-screen flex bg-gray-50 overflow-hidden p-4">
      {/* Left Panel: Checklist and Controls */}
      <div className="w-80 bg-white shadow-lg flex flex-col flex-shrink-0 rounded-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{activity.title}</h2>
          <p className="text-sm text-gray-600 mt-1">논증 활동</p>
        </div>
        
        {/* Checklist */}
        <div className="p-4">
          <Card className="border-0 shadow-none rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">체크리스트</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2" style={{ height: '160px', overflowY: 'auto' }}>
                {items.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start space-x-2 p-2 rounded-lg hover:bg-gray-50">
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
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4">
          <div className="space-y-2">
            <Button 
              onClick={() => setActiveTask(activeTask === 'argument' ? 'none' : 'argument')}
              className="w-full rounded-lg"
              disabled={isSubmitted}
              variant={activeTask === 'argument' ? 'default' : 'outline'}
            >
              {isSubmitted ? '논증 제출완료' : '논증 입력'}
            </Button>
            <Button 
              onClick={() => setActiveTask(activeTask === 'peer-evaluation' ? 'none' : 'peer-evaluation')}
              className="w-full rounded-lg"
              variant={activeTask === 'peer-evaluation' ? 'default' : 'outline'}
              disabled={!peerResponse || peerResponse.is_completed}
            >
              {peerResponse?.is_completed ? '동료평가 완료' : '동료 평가'}
            </Button>
            <Button 
              onClick={() => setActiveTask(activeTask === 'evaluation-check' ? 'none' : 'evaluation-check')}
              className="w-full rounded-lg"
              variant={activeTask === 'evaluation-check' ? 'default' : 'outline'}
              disabled={peerEvaluations.length === 0}
            >
              평가 확인
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-4">
        <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
          <ChatInterface 
            activity={activity}
            studentId={studentId}
            onBack={onBack}
            checklistContext={{
              currentStep: items.find(item => !item.is_completed)?.description || "모든 단계가 완료되었습니다.",
              allSteps: items
            }}
            argumentationContext={{
              activeTask,
              setActiveTask,
              argumentText,
              setArgumentText,
              evaluationText,
              setEvaluationText,
              reflectionText,
              setReflectionText,
              usefulnessRating,
              setUsefulnessRating,
              peerResponse,
              peerEvaluations,
              isSubmitted,
              submitArgument,
              submitPeerEvaluation,
              submitReflection
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ArgumentationActivity;
