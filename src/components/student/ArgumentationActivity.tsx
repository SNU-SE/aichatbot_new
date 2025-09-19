import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Send, CheckCircle, Clock, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity } from '@/types/activity';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import ChatInterface from './ChatInterface';

interface ArgumentationActivityProps {
  activity: Activity;
  studentId: string;
  onBack: () => void;
  saveDraft?: (studentId: string, activityId: string, workType: string, content: any) => Promise<void>;
  loadDraft?: (studentId: string, activityId: string, workType: string) => Promise<any>;
}

interface PeerAssignment {
  id: string;
  label: string;
  responseText: string;
  draftText: string;
  status: 'pending' | 'submitted' | 'returned';
  returnReason: string | null;
  submittedAt: string | null;
  returnedAt: string | null;
  lockedAt: string | null;
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
  const [reflectionText, setReflectionText] = useState('');
  const [finalRevisedArgument, setFinalRevisedArgument] = useState('');
  const [usefulnessRating, setUsefulnessRating] = useState(1);
  const [peerResponse, setPeerResponse] = useState<any>(null);
  const [peerEvaluations, setPeerEvaluations] = useState<any[]>([]);
  const [evaluationCheckEnabled, setEvaluationCheckEnabled] = useState(false);
  const [peerAssignmentReady, setPeerAssignmentReady] = useState(false);
  const [peerAssignments, setPeerAssignments] = useState<PeerAssignment[]>([]);
  const [peerAssignmentsLoading, setPeerAssignmentsLoading] = useState(false);
  const [peerEvaluationLocked, setPeerEvaluationLocked] = useState(false);
  const [peerPhaseActive, setPeerPhaseActive] = useState(false);
  const { toast } = useToast();
  const { items, loading, toggleItem } = useChecklistProgress({ 
    studentId, 
    activityId: activity.id 
  });
  const peerEvaluationEnabled = activity.enable_peer_evaluation !== false;
  const peerEvaluationAvailable = peerEvaluationEnabled && peerAssignmentReady && !peerEvaluationLocked;

  const loadPeerAssignments = useCallback(async () => {
    if (!peerEvaluationEnabled) {
      return;
    }

    setPeerAssignmentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('peer_evaluations')
        .select(`
          id,
          evaluation_text,
          status,
          is_completed,
          submitted_at,
          locked_at,
          return_reason,
          returned_at,
          target_response:argumentation_responses!peer_evaluations_target_response_id_fkey(
            id,
            response_text
          )
        `)
        .eq('activity_id', activity.id)
        .eq('evaluator_id', studentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const assignments: PeerAssignment[] = (data || []).map((item: any, index: number) => {
        const rawStatus = (item.status ?? (item.is_completed ? 'submitted' : 'pending')) as string;
        const normalizedStatus: 'pending' | 'submitted' | 'returned' =
          rawStatus === 'returned' ? 'returned' : rawStatus === 'submitted' ? 'submitted' : 'pending';

        return {
          id: item.id,
          label: `${index + 1}번 친구 응답`,
          responseText: item.target_response?.response_text || '',
          draftText: item.evaluation_text || '',
          status: normalizedStatus,
          returnReason: item.return_reason || null,
          submittedAt: item.submitted_at || null,
          returnedAt: item.returned_at || null,
          lockedAt: item.locked_at || null
        };
      });

      const hasEditable = assignments.some((item) => item.status === 'pending' || item.status === 'returned');

      setPeerAssignments(assignments);
      setPeerAssignmentReady(hasEditable);
      setPeerEvaluationLocked(!hasEditable && assignments.length > 0);
    } catch (error) {
      console.error('배정된 동료평가 로드 오류:', error);
      setPeerAssignments([]);
      setPeerAssignmentReady(false);
      setPeerEvaluationLocked(false);
    } finally {
      setPeerAssignmentsLoading(false);
    }
  }, [activity.id, peerEvaluationEnabled, studentId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    checkSubmissionStatus();
    if (loadDraft) {
      loadSavedDraft();
    }

    if (!peerEvaluationEnabled) {
      setPeerAssignmentReady(false);
      setEvaluationCheckEnabled(false);
      setPeerAssignments([]);
      setPeerEvaluationLocked(false);
      setPeerPhaseActive(false);
      return;
    }

    // 평가 가능 여부 및 배정 상태 확인
    checkEvaluationAvailability();

    // 30초마다 평가 가능 여부 재확인
    const interval = setInterval(checkEvaluationAvailability, 30000);
    return () => clearInterval(interval);
  }, [activity.id, studentId, peerEvaluationEnabled]);

  useEffect(() => {
    if (!peerEvaluationEnabled || !peerPhaseActive) {
      return;
    }

    loadPeerAssignments();
  }, [loadPeerAssignments, peerEvaluationEnabled, peerPhaseActive]);

  // 실시간 동료평가 상태 동기화
  useEffect(() => {
    if (activity.type !== 'argumentation' || !peerEvaluationEnabled) return;

    const channel = supabase
      .channel('peer_evaluations_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'peer_evaluations',
          filter: `activity_id=eq.${activity.id}`
        },
        (payload) => {
          console.log('동료평가 실시간 업데이트:', payload);
          
          if (payload.new?.evaluator_id === studentId) {
            loadPeerAssignments();
            if (payload.new?.is_completed) {
              setActiveTask('none');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activity.id, loadPeerAssignments, peerEvaluationEnabled, studentId]);

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

  const checkEvaluationAvailability = async () => {
    if (!peerEvaluationEnabled) {
      setPeerAssignmentReady(false);
      setEvaluationCheckEnabled(false);
      setPeerAssignments([]);
      setPeerEvaluationLocked(false);
      setPeerPhaseActive(false);
      return;
    }
    try {
      // 현재 학생의 클래스 정보 가져오기
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('class_name')
        .eq('student_id', studentId)
        .single();

      if (studentError) throw studentError;
      const className = studentData?.class_name;

      if (!className) {
        setPeerAssignmentReady(false);
        setEvaluationCheckEnabled(false);
        return;
      }

      // 교사가 해당 활동/클래스에 대해 평가완료를 했는지 확인
      const { data: isCompleted, error: phaseError } = await supabase
        .rpc('is_peer_evaluation_completed', {
          activity_id_param: activity.id,
          class_name_param: className
        });

      if (phaseError) throw phaseError;

      setEvaluationCheckEnabled(isCompleted || false);

      // 배정 여부 확인 (peer_evaluation_phases 테이블 조회)
      const { data: phaseRecord, error: phaseFetchError } = await supabase
        .from('peer_evaluation_phases')
        .select('phase')
        .eq('activity_id', activity.id)
        .eq('class_name', className)
        .maybeSingle();

      if (phaseFetchError && phaseFetchError.code !== 'PGRST116') {
        throw phaseFetchError;
      }

      const phaseValue = phaseRecord?.phase;
      const phaseAllowsEvaluation = phaseValue === 'peer-evaluation';

      setPeerPhaseActive(phaseAllowsEvaluation);

      if (!phaseAllowsEvaluation) {
        setPeerAssignments([]);
        setPeerAssignmentReady(false);
        setPeerEvaluationLocked(phaseValue === 'evaluation-check');
        return;
      }

      await loadPeerAssignments();
    } catch (error) {
      console.error('평가 가능 여부 확인 오류:', error);
      setEvaluationCheckEnabled(false);
      setPeerAssignmentReady(false);
      setPeerAssignments([]);
      setPeerEvaluationLocked(false);
      setPeerPhaseActive(false);
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
      // 기존 응답 확인
      const { data: existingResponse } = await supabase
        .from('argumentation_responses')
        .select('id')
        .eq('activity_id', activity.id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingResponse) {
        // 기존 응답 업데이트
        const { error } = await supabase
          .from('argumentation_responses')
          .update({
            response_text: argument,
            is_submitted: true,
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingResponse.id);
        
        if (error) throw error;
      } else {
        // 새 응답 생성
        const { error } = await supabase
          .from('argumentation_responses')
          .insert({
            activity_id: activity.id,
            student_id: studentId,
            response_text: argument,
            is_submitted: true,
            submitted_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }

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

  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);

  const submitPeerEvaluation = async () => {
    if (!peerEvaluationEnabled || peerEvaluationLocked) {
      return;
    }

    const editableAssignments = peerAssignments.filter(
      (assignment) => assignment.status === 'pending' || assignment.status === 'returned'
    );

    if (editableAssignments.length === 0) {
      toast({
        title: "알림",
        description: "제출할 동료평가가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    const hasEmptyFeedback = editableAssignments.some((assignment) => !assignment.draftText.trim());
    if (hasEmptyFeedback) {
      toast({
        title: "오류",
        description: "모든 동료에 대한 피드백을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (isSubmittingEvaluation) return;

    try {
      setIsSubmittingEvaluation(true);
      const submittedAt = new Date().toISOString();

      const updates = editableAssignments.map((assignment) => ({
        id: assignment.id,
        evaluation_text: assignment.draftText,
        is_completed: true,
        status: 'submitted',
        submitted_at: submittedAt,
        locked_at: submittedAt,
        return_reason: null,
        returned_at: null
      }));

      const { error } = await supabase
        .from('peer_evaluations')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      setPeerAssignments((prev) =>
        prev.map((assignment) => {
          const updated = editableAssignments.find((item) => item.id === assignment.id);
          if (!updated) return assignment;
          return {
            ...assignment,
            draftText: updated.draftText,
            status: 'submitted',
            returnReason: null,
            returnedAt: null,
            lockedAt: submittedAt
          };
        })
      );

      setPeerEvaluationLocked(true);
      setPeerAssignmentReady(false);
      setActiveTask('none');

      toast({
        title: "성공",
        description: "동료평가가 제출되었습니다."
      });
    } catch (error) {
      console.error('동료평가 제출 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 제출에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  const updatePeerAssignmentDraft = (assignmentId: string, value: string) => {
    setPeerAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, draftText: value } : assignment
      )
    );
  };

  const submitReflection = async () => {
    if (!peerEvaluationEnabled) {
      return;
    }
    try {
      // evaluation_reflections 테이블에 성찰 및 유용성 평가 저장
      if (reflectionText.trim()) {
        const { error: reflectionError } = await supabase
          .from('evaluation_reflections')
          .insert({
            activity_id: activity.id,
            student_id: studentId,
            reflection_text: reflectionText,
            usefulness_rating: usefulnessRating
          });

        if (reflectionError) throw reflectionError;
      }

      // argumentation_responses 테이블에 수정된 논증 업데이트
      if (finalRevisedArgument.trim()) {
        const { error: updateError } = await supabase
          .from('argumentation_responses')
          .update({
            final_revised_argument: finalRevisedArgument,
            final_revision_submitted_at: new Date().toISOString()
          })
          .eq('activity_id', activity.id)
          .eq('student_id', studentId);

        if (updateError) throw updateError;
      }

      setActiveTask('none');
      toast({
        title: "성공",
        description: "평가 반영이 완료되었습니다."
      });
    } catch (error) {
      console.error('Error submitting reflection:', error);
      toast({
        title: "제출 실패",
        description: "평가 반영 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (!argument.trim() || isSubmitted || !saveDraft) return;

    const autoSaveInterval = setInterval(() => {
      handleSaveDraft();
    }, 30000); // 30초

    return () => clearInterval(autoSaveInterval);
  }, [argument, isSubmitted]);

  const argumentationContext = {
    activeTask,
    setActiveTask,
    argumentText: argument,
    setArgumentText: setArgument,
    reflectionText,
    setReflectionText,
    finalRevisedArgument,
    setFinalRevisedArgument,
    usefulnessRating,
    setUsefulnessRating,
    peerResponse,
    peerEvaluations,
    setPeerEvaluations,
    peerAssignments,
    peerAssignmentsLoading,
    peerEvaluationLocked,
    updatePeerAssignmentDraft,
    isSubmittingEvaluation,
    isSubmitted,
    submitArgument,
    submitPeerEvaluation,
    submitReflection,
    peerEvaluationEnabled: peerEvaluationAvailable,
    peerAssignmentReady,
    peerPhaseActive,
    refreshPeerAssignments: loadPeerAssignments
  };

  useEffect(() => {
    if (!peerEvaluationAvailable && activeTask === 'peer-evaluation') {
      setActiveTask(isSubmitted ? 'argument' : 'none');
    }
  }, [peerEvaluationAvailable, activeTask, isSubmitted]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">논증 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden p-4">
      {/* Left Panel: Activity Info, Checklist, and Action Buttons */}
      <div className="w-80 bg-white shadow-lg flex flex-col flex-shrink-0 rounded-lg">
        {/* Activity Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-2">{activity.title}</h2>
          {activity.content && typeof activity.content === 'string' && (
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <h3 className="font-medium mb-2 text-sm">활동 안내</h3>
              <p className="text-sm text-gray-700">{activity.content}</p>
            </div>
          )}
          {activity.content && typeof activity.content === 'object' && activity.content.description && (
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <h3 className="font-medium mb-2 text-sm">활동 안내</h3>
              <p className="text-sm text-gray-700">{activity.content.description}</p>
            </div>
          )}
          {activity.final_question && (
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h3 className="font-medium mb-1 text-sm text-blue-800">핵심 질문</h3>
              <p className="text-sm text-blue-700">{activity.final_question}</p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="p-4 border-b">
          <Card className="border-0 shadow-none rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">체크리스트</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2" style={{ height: '200px', overflowY: 'auto' }}>
                {items.map((item) => (
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

        {/* Argumentation Action Buttons */}
        <div className="flex-1 p-4">
          <div className="space-y-3">
            <Button
              onClick={() => setActiveTask('argument')}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitted}
            >
              논증 입력
            </Button>
            
            {peerEvaluationEnabled && (
              <>
                <Button
                  onClick={() => setActiveTask('peer-evaluation')}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!isSubmitted || !peerAssignmentReady || peerEvaluationLocked}
                >
                  동료 평가
                </Button>
                <Button
                  onClick={() => setActiveTask('evaluation-check')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!isSubmitted || !evaluationCheckEnabled}
                >
                  결과 확인
                  {!evaluationCheckEnabled && isSubmitted && (
                    <span className="ml-2 text-xs">(대기중)</span>
                  )}
                </Button>
                {!peerAssignmentReady && !peerEvaluationLocked && (
                  <p className="text-xs text-gray-500 text-center">
                    교사가 동료평가를 배정하면 사용할 수 있습니다.
                  </p>
                )}
                {peerEvaluationLocked && (
                  <p className="text-xs text-green-600 text-center">동료평가를 제출했습니다.</p>
                )}
              </>
            )}
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
            checklistContext={{
              currentStep: items.find(item => !item.is_completed)?.description || "모든 단계가 완료되었습니다.",
              allSteps: items
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ArgumentationActivity;
