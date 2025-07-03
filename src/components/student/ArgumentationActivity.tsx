
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, Send, CheckCircle, Clock, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity } from '@/types/activity';
import ChatInterface from './ChatInterface';

interface ArgumentationActivityProps {
  activity: Activity;
  studentId: string;
  onBack: () => void;
  saveDraft?: (studentId: string, activityId: string, workType: string, content: any) => Promise<void>;
  loadDraft?: (studentId: string, activityId: string, workType: string) => Promise<any>;
}

const ArgumentationActivity = ({ 
  activity, 
  studentId, 
  onBack,
  saveDraft,
  loadDraft
}: ArgumentationActivityProps) => {
  const [argument, setArgument] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTask, setActiveTask] = useState<'none' | 'argument' | 'peer-evaluation' | 'evaluation-check'>('none');
  const [evaluationText, setEvaluationText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [finalRevisedArgument, setFinalRevisedArgument] = useState('');
  const [usefulnessRating, setUsefulnessRating] = useState(1);
  const [peerResponse, setPeerResponse] = useState<any>(null);
  const [peerEvaluations, setPeerEvaluations] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    checkSubmissionStatus();
    if (loadDraft) {
      loadSavedDraft();
    }
  }, [activity.id, studentId]);

  const checkSubmissionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('argumentation_responses')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('student_id', studentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking submission status:', error);
        return;
      }

      if (data) {
        setArgument(data.response_text || '');
        setIsSubmitted(data.is_submitted || false);
        setFinalRevisedArgument(data.final_revised_argument || '');
      }
    } catch (error) {
      console.error('Error checking submission status:', error);
    }
  };

  const loadSavedDraft = async () => {
    if (!loadDraft) return;
    try {
      const draft = await loadDraft(studentId, activity.id, 'argumentation');
      if (draft && draft.argument) {
        setArgument(draft.argument);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!argument.trim() || !saveDraft) return;
    
    setIsSaving(true);
    try {
      await saveDraft(studentId, activity.id, 'argumentation', { argument });
      toast({
        title: "임시 저장 완료",
        description: "작업 내용이 임시 저장되었습니다."
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "저장 실패",
        description: "임시 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const submitArgument = async () => {
    if (!argument.trim()) {
      toast({
        title: "입력 오류",
        description: "논증을 작성해주세요.",
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
          response_text: argument,
          is_submitted: true,
          submitted_at: new Date().toISOString()
        }, {
          onConflict: 'activity_id,student_id'
        });

      if (error) throw error;

      setIsSubmitted(true);
      setActiveTask('none');
      
      // 임시 저장 데이터 삭제
      if (saveDraft) {
        try {
          await supabase
            .from('student_work_drafts')
            .delete()
            .eq('student_id', studentId)
            .eq('activity_id', activity.id)
            .eq('work_type', 'argumentation');
        } catch (draftError) {
          console.error('Error deleting draft:', draftError);
        }
      }

      toast({
        title: "제출 완료",
        description: "논증이 성공적으로 제출되었습니다."
      });
    } catch (error) {
      console.error('Error submitting argument:', error);
      toast({
        title: "제출 실패",
        description: "논증 제출 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const submitPeerEvaluation = () => {
    // This will be handled by ChatInterface
    setActiveTask('none');
  };

  const submitReflection = () => {
    setActiveTask('none');
    toast({
      title: "성공",
      description: "평가 반영이 완료되었습니다."
    });
  };

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (!argument.trim() || isSubmitted || !saveDraft) return;

    const autoSaveInterval = setInterval(() => {
      handleSaveDraft();
    }, 30000); // 30초

    return () => clearInterval(autoSaveInterval);
  }, [argument, isSubmitted]);

  const getActivitySteps = () => {
    const steps = [
      { id: 'argument', description: '논증 작성하기', completed: isSubmitted },
      { id: 'peer-eval', description: '동료 평가하기', completed: false },
      { id: 'evaluation-check', description: '평가 확인 및 반영', completed: false }
    ];

    const completed = steps.filter(step => step.completed);
    const current = steps.find(step => !step.completed);
    const upcoming = steps.filter(step => !step.completed && step.id !== current?.id);

    return { completed, current: current ? [current] : [], upcoming };
  };

  const { completed, current, upcoming } = getActivitySteps();

  const argumentationContext = {
    activeTask,
    setActiveTask,
    argumentText: argument,
    setArgumentText: setArgument,
    evaluationText,
    setEvaluationText,
    reflectionText,
    setReflectionText,
    finalRevisedArgument,
    setFinalRevisedArgument,
    usefulnessRating,
    setUsefulnessRating,
    peerResponse,
    peerEvaluations,
    isSubmitted,
    submitArgument,
    submitPeerEvaluation,
    submitReflection
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden p-4">
      {/* Left Panel: Activity Progress and Tasks */}
      <div className="w-80 bg-white shadow-lg flex flex-col flex-shrink-0 rounded-lg">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-2">{activity.title}</h2>
          {activity.content && typeof activity.content === 'string' && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2 text-sm">활동 안내</h3>
              <p className="text-sm text-gray-700">{activity.content}</p>
            </div>
          )}
          {activity.final_question && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h3 className="font-medium mb-1 text-sm text-blue-800">핵심 질문</h3>
              <p className="text-sm text-blue-700">{activity.final_question}</p>
            </div>
          )}
        </div>

        {/* Activity Steps */}
        <div className="flex-1 p-4 overflow-hidden">
          <h3 className="text-md font-semibold mb-4">활동 단계</h3>
          <div className="space-y-4" style={{ height: '384px', overflowY: 'auto' }}>
            {/* Completed */}
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                완료됨
              </h4>
              <div className="space-y-1">
                {completed.map((step) => (
                  <div key={step.id} className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-600" />
                    <span className="text-sm text-green-700">{step.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current */}
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                진행중
              </h4>
              <div className="space-y-1">
                {current.map((step) => (
                  <div key={step.id} className="flex items-start space-x-2 p-2 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <Clock className="h-4 w-4 mt-1 text-blue-600" />
                    <div className="flex-1">
                      <span className="text-sm text-blue-700 font-medium">{step.description}</span>
                      {step.id === 'argument' && !isSubmitted && (
                        <Button
                          onClick={() => setActiveTask('argument')}
                          size="sm"
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          시작하기
                        </Button>
                      )}
                      {step.id === 'peer-eval' && isSubmitted && (
                        <Button
                          onClick={() => setActiveTask('peer-evaluation')}
                          size="sm"
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          평가하기
                        </Button>
                      )}
                      {step.id === 'evaluation-check' && (
                        <Button
                          onClick={() => setActiveTask('evaluation-check')}
                          size="sm"
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          확인하기
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-600 flex items-center">
                <Circle className="h-4 w-4 mr-2" />
                예정
              </h4>
              <div className="space-y-1">
                {upcoming.map((step) => (
                  <div key={step.id} className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                    <Circle className="h-4 w-4 mt-1 text-gray-500" />
                    <span className="text-sm text-gray-600">{step.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 min-w-0 p-4">
        <div className="h-full rounded-lg overflow-hidden">
          <ChatInterface 
            activity={activity}
            studentId={studentId}
            onBack={onBack}
            argumentationContext={argumentationContext}
          />
        </div>
      </div>
    </div>
  );
};

export default ArgumentationActivity;
