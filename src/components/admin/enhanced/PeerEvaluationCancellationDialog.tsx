
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PeerEvaluationCancellationDialogProps {
  studentId: string;
  studentName: string;
  activityId: string;
  activityTitle: string;
  completedEvaluations: number;
  onRefresh: () => void;
}

const PeerEvaluationCancellationDialog = ({ 
  studentId, 
  studentName, 
  activityId, 
  activityTitle,
  completedEvaluations,
  onRefresh 
}: PeerEvaluationCancellationDialogProps) => {
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  const handleCancelEvaluations = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('peer_evaluations')
        .update({
          is_completed: false,
          evaluation_text: null,
          submitted_at: null,
          status: 'pending',
          locked_at: null,
          return_reason: null,
          returned_at: null
        })
        .eq('evaluator_id', studentId)
        .eq('activity_id', activityId);

      if (error) throw error;

      toast({
        title: "성공",
        description: `${studentName}의 동료평가가 취소되었습니다.`
      });

      onRefresh();
    } catch (error) {
      console.error('동료평가 취소 오류:', error);
      toast({
        title: "오류",
        description: "동료평가 취소에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setCancelling(false);
    }
  };

  if (completedEvaluations === 0) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>동료평가 취소</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-2">
              <p><strong>학생:</strong> {studentName} ({studentId})</p>
              <p><strong>활동:</strong> {activityTitle}</p>
              <p><strong>완료된 평가:</strong> {completedEvaluations}개</p>
              <p className="text-red-600 font-medium">
                이 작업은 학생이 완료한 모든 동료평가를 취소하고 초기화합니다. 
                학생은 다시 동료평가를 작성하고 제출할 수 있게 됩니다.
              </p>
              <p className="text-sm text-gray-600">
                이 작업은 되돌릴 수 없습니다. 정말 진행하시겠습니까?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleCancelEvaluations}
            disabled={cancelling}
            className="bg-red-600 hover:bg-red-700"
          >
            {cancelling ? '처리 중...' : '동료평가 취소'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PeerEvaluationCancellationDialog;
