import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, RotateCcw } from 'lucide-react';

interface PeerEvaluationReviewDialogProps {
  studentId: string;
  studentName: string;
  activityId: string;
  activityTitle: string;
  disabled?: boolean;
  onRefresh: () => void;
}

interface PeerEvaluationDetail {
  id: string;
  status: 'pending' | 'submitted' | 'returned' | string;
  evaluationText: string | null;
  returnReason: string | null;
  returnedAt: string | null;
  submittedAt: string | null;
  targetResponseText: string;
}

const statusLabelMap: Record<string, string> = {
  pending: '미제출',
  submitted: '제출 완료',
  returned: '반환됨'
};

const PeerEvaluationReviewDialog = ({
  studentId,
  studentName,
  activityId,
  activityTitle,
  disabled,
  onRefresh
}: PeerEvaluationReviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<PeerEvaluationDetail[]>([]);
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('peer_evaluations')
        .select(`
          id,
          status,
          evaluation_text,
          return_reason,
          returned_at,
          submitted_at,
          target_response:argumentation_responses!peer_evaluations_target_response_id_fkey(response_text)
        `)
        .eq('activity_id', activityId)
        .eq('evaluator_id', studentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        status: (item.status || (item.evaluation_text ? 'submitted' : 'pending')) as PeerEvaluationDetail['status'],
        evaluationText: item.evaluation_text,
        returnReason: item.return_reason,
        returnedAt: item.returned_at,
        submittedAt: item.submitted_at,
        targetResponseText: item.target_response?.response_text || ''
      }));

      setEvaluations(mapped);
      setReturnNotes({});
    } catch (error) {
      console.error('동료평가 조회 오류:', error);
      toast({
        title: '오류',
        description: '동료평가 정보를 불러오지 못했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [activityId, studentId, toast]);

  useEffect(() => {
    if (open) {
      fetchEvaluations();
    }
  }, [open, fetchEvaluations]);

  const handleReturnEvaluation = async (evaluationId: string) => {
    const note = returnNotes[evaluationId]?.trim() || null;

    try {
      setReturningId(evaluationId);
      const { error } = await supabase
        .from('peer_evaluations')
        .update({
          status: 'returned',
          is_completed: false,
          return_reason: note,
          returned_at: new Date().toISOString(),
          locked_at: null
        })
        .eq('id', evaluationId);

      if (error) throw error;

      toast({
        title: '반환 완료',
        description: '학생에게 해당 동료평가를 다시 작성하도록 요청했습니다.'
      });

      await fetchEvaluations();
      onRefresh();
    } catch (error) {
      console.error('동료평가 반환 오류:', error);
      toast({
        title: '오류',
        description: '동료평가 반환 중 문제가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setReturningId(null);
    }
  };

  const evaluableItems = useMemo(
    () => evaluations.filter((item) => item.status === 'submitted'),
    [evaluations]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="flex items-center space-x-2"
        >
          <ClipboardList className="h-4 w-4" />
          <span>평가 검토</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col space-y-1">
            <span>동료평가 검토</span>
            <span className="text-sm text-gray-500">{activityTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {studentName} ({studentId}) 학생이 작성한 동료평가 내용을 확인하고 필요 시 반환할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-gray-500">동료평가를 불러오는 중입니다...</div>
        ) : evaluations.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <p>해당 학생이 작성한 동료평가가 없습니다.</p>
            <p className="text-sm mt-2">학생이 평가를 제출하면 이곳에서 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {evaluations.map((evaluation, index) => {
              const statusLabel = statusLabelMap[evaluation.status] || evaluation.status;
              const badgeClasses = evaluation.status === 'submitted'
                ? 'border-green-200 text-green-700 bg-green-50'
                : evaluation.status === 'returned'
                ? 'border-red-200 text-red-700 bg-red-50'
                : 'border-gray-300 text-gray-600 bg-gray-50';

              return (
                <div key={evaluation.id} className="border rounded-lg p-4 space-y-4 bg-gray-50/80">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm sm:text-base">평가 {index + 1}</div>
                    <Badge variant="outline" className={`text-xs ${badgeClasses}`}>{statusLabel}</Badge>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">배정된 친구의 응답</div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed bg-white border rounded-md p-3">
                      {evaluation.targetResponseText || '응답이 비어 있습니다.'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">제출한 피드백</div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed bg-white border rounded-md p-3">
                      {evaluation.evaluationText || '아직 작성된 피드백이 없습니다.'}
                    </div>
                  </div>

                  {evaluation.status === 'submitted' ? (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-500">
                        반환 사유를 입력하면 해당 학생에게 다시 작성하도록 알림이 전달됩니다.
                      </div>
                      <Textarea
                        value={returnNotes[evaluation.id] ?? ''}
                        onChange={(e) =>
                          setReturnNotes((prev) => ({ ...prev, [evaluation.id]: e.target.value }))
                        }
                        placeholder="필요 시 반환 사유를 입력하세요. (선택 사항)"
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReturnEvaluation(evaluation.id)}
                          disabled={returningId === evaluation.id}
                          className="flex items-center space-x-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>{returningId === evaluation.id ? '반환 중...' : '학생에게 반환'}</span>
                        </Button>
                      </div>
                    </div>
                  ) : evaluation.status === 'returned' ? (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
                      {evaluation.returnReason
                        ? `반환 사유: ${evaluation.returnReason}`
                        : '이미 학생에게 반환된 평가입니다.'}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-md p-3">
                      학생이 아직 이 평가를 제출하지 않았습니다.
                    </div>
                  )}
                </div>
              );
            })}

            {evaluableItems.length === 0 && (
              <div className="rounded-md border border-blue-100 bg-blue-50 text-blue-700 text-sm px-4 py-3">
                제출된 동료평가가 없습니다. 학생이 평가를 완료할 때까지 기다려주세요.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PeerEvaluationReviewDialog;
