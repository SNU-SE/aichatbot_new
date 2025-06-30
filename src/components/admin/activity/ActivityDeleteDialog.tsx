
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActivityData {
  chat_logs: number;
  checklist_progress: number;
  checklist_history: number;
  document_chunks: number;
  argumentation_responses: number;
  peer_evaluations: number;
  evaluation_reflections: number;
  question_frequency: number;
  checklist_items: number;
  activity_modules: number;
}

interface ActivityDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  activityTitle: string;
  onDeleteSuccess: () => void;
}

const ActivityDeleteDialog = ({
  open,
  onOpenChange,
  activityId,
  activityTitle,
  onDeleteSuccess
}: ActivityDeleteDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [relatedData, setRelatedData] = useState<ActivityData | null>(null);
  const { toast } = useToast();

  const checkRelatedData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_activity_related_data_count', {
        activity_id_param: activityId
      });

      if (error) throw error;

      setRelatedData(data);
      setShowConfirmation(true);
    } catch (error: any) {
      toast({
        title: "오류",
        description: "관련 데이터 확인 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.rpc('delete_activity_with_related_data', {
        activity_id_param: activityId
      });

      if (error) throw error;

      toast({
        title: "성공",
        description: "활동과 관련된 모든 데이터가 삭제되었습니다."
      });

      onDeleteSuccess();
      onOpenChange(false);
      setShowConfirmation(false);
    } catch (error: any) {
      toast({
        title: "오류",
        description: "활동 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowConfirmation(false);
    setRelatedData(null);
  };

  const getTotalDataCount = () => {
    if (!relatedData) return 0;
    return Object.values(relatedData).reduce((sum, count) => sum + count, 0);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDialogTitle>활동 삭제 확인</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                "<strong>{activityTitle}</strong>" 활동을 삭제하시겠습니까?
              </p>
              
              {!showConfirmation && (
                <p className="text-sm text-gray-600">
                  관련된 데이터를 확인하고 있습니다...
                </p>
              )}

              {showConfirmation && relatedData && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="font-medium text-yellow-800 mb-2">
                    다음 데이터들이 함께 삭제됩니다:
                  </p>
                  <div className="text-sm text-yellow-700 space-y-1">
                    {relatedData.chat_logs > 0 && (
                      <div>• 채팅 기록: {relatedData.chat_logs}개</div>
                    )}
                    {relatedData.checklist_progress > 0 && (
                      <div>• 체크리스트 진행상황: {relatedData.checklist_progress}개</div>
                    )}
                    {relatedData.checklist_history > 0 && (
                      <div>• 체크리스트 완료 이력: {relatedData.checklist_history}개</div>
                    )}
                    {relatedData.document_chunks > 0 && (
                      <div>• 문서 청크: {relatedData.document_chunks}개</div>
                    )}
                    {relatedData.argumentation_responses > 0 && (
                      <div>• 논증 응답: {relatedData.argumentation_responses}개</div>
                    )}
                    {relatedData.peer_evaluations > 0 && (
                      <div>• 동료평가: {relatedData.peer_evaluations}개</div>
                    )}
                    {relatedData.evaluation_reflections > 0 && (
                      <div>• 평가 성찰: {relatedData.evaluation_reflections}개</div>
                    )}
                    {relatedData.question_frequency > 0 && (
                      <div>• 질문 빈도: {relatedData.question_frequency}개</div>
                    )}
                    {relatedData.checklist_items > 0 && (
                      <div>• 체크리스트 항목: {relatedData.checklist_items}개</div>
                    )}
                    {relatedData.activity_modules > 0 && (
                      <div>• 활동 모듈: {relatedData.activity_modules}개</div>
                    )}
                    
                    {getTotalDataCount() === 0 && (
                      <div className="text-green-700">관련된 데이터가 없습니다.</div>
                    )}
                  </div>
                  
                  {getTotalDataCount() > 0 && (
                    <p className="font-medium text-red-600 mt-2">
                      총 {getTotalDataCount()}개의 관련 데이터가 삭제됩니다.
                    </p>
                  )}
                </div>
              )}

              {showConfirmation && (
                <p className="text-sm font-medium text-red-600">
                  이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            취소
          </AlertDialogCancel>
          {!showConfirmation ? (
            <Button
              onClick={checkRelatedData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              데이터 확인
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제하기
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ActivityDeleteDialog;
