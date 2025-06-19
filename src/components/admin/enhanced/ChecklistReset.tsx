
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChecklistResetProps {
  selectedClass: string;
  selectedActivity: string;
}

const ChecklistReset = ({ selectedClass, selectedActivity }: ChecklistResetProps) => {
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setResetting(true);
    try {
      // 완료된 체크리스트를 히스토리에 저장하고 초기화하는 로직
      if (selectedActivity && selectedActivity !== 'all') {
        // 특정 활동 선택 시
        const { data: checklistItems } = await supabase
          .from('checklist_items')
          .select('id')
          .eq('activity_id', selectedActivity);

        if (checklistItems && checklistItems.length > 0) {
          const itemIds = checklistItems.map(item => item.id);
          
          // 완료된 기록들을 히스토리 테이블로 이동 (reset_at 필드 설정)
          const { data: completedRecords } = await supabase
            .from('student_checklist_progress')
            .select(`
              *,
              checklist_items!inner(
                description,
                activity_id,
                activities!inner(title)
              )
            `)
            .in('checklist_item_id', itemIds)
            .eq('is_completed', true);

          if (completedRecords && completedRecords.length > 0) {
            // 히스토리 테이블에 reset_at 필드 업데이트
            const historyUpdates = completedRecords.map(record => ({
              student_id: record.student_id,
              checklist_item_id: record.checklist_item_id,
              activity_id: (record.checklist_items as any).activity_id,
              description: (record.checklist_items as any).description,
              activity_title: (record.checklist_items as any).activities.title,
              completed_at: record.completed_at,
              reset_at: new Date().toISOString()
            }));

            await supabase
              .from('checklist_completion_history')
              .upsert(historyUpdates, {
                onConflict: 'student_id,checklist_item_id,completed_at'
              });
          }

          // 클래스 필터 적용
          let query = supabase
            .from('student_checklist_progress')
            .delete()
            .in('checklist_item_id', itemIds);

          if (selectedClass && selectedClass !== 'all') {
            const { data: students } = await supabase
              .from('students')
              .select('student_id')
              .eq('class_name', selectedClass);

            if (students && students.length > 0) {
              const studentIds = students.map(student => student.student_id);
              query = query.in('student_id', studentIds);
            }
          }

          await query;
        }
      } else {
        // 전체 초기화
        let query = supabase
          .from('student_checklist_progress')
          .select(`
            *,
            checklist_items!inner(
              description,
              activity_id,
              activities!inner(title)
            )
          `)
          .eq('is_completed', true);

        if (selectedClass && selectedClass !== 'all') {
          const { data: students } = await supabase
            .from('students')
            .select('student_id')
            .eq('class_name', selectedClass);

          if (students && students.length > 0) {
            const studentIds = students.map(student => student.student_id);
            query = query.in('student_id', studentIds);
          }
        }

        const { data: completedRecords } = await query;

        if (completedRecords && completedRecords.length > 0) {
          // 히스토리 테이블에 reset_at 필드 업데이트
          const historyUpdates = completedRecords.map(record => ({
            student_id: record.student_id,
            checklist_item_id: record.checklist_item_id,
            activity_id: (record.checklist_items as any).activity_id,
            description: (record.checklist_items as any).description,
            activity_title: (record.checklist_items as any).activities.title,
            completed_at: record.completed_at,
            reset_at: new Date().toISOString()
          }));

          await supabase
            .from('checklist_completion_history')
            .upsert(historyUpdates, {
              onConflict: 'student_id,checklist_item_id,completed_at'
            });
        }

        // 진행 상태 삭제
        let deleteQuery = supabase
          .from('student_checklist_progress')
          .delete();

        if (selectedClass !== 'all') {
          const { data: students } = await supabase
            .from('students')
            .select('student_id')
            .eq('class_name', selectedClass);

          if (students && students.length > 0) {
            const studentIds = students.map(student => student.student_id);
            deleteQuery = deleteQuery.in('student_id', studentIds);
          }
        } else {
          deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000');
        }

        await deleteQuery;
      }

      const targetText = selectedClass === 'all' && selectedActivity === 'all' 
        ? '전체' 
        : `${selectedClass === 'all' ? '전체 클래스' : selectedClass} - ${selectedActivity === 'all' ? '전체 활동' : '선택된 활동'}`;

      toast({
        title: "체크리스트 초기화 완료",
        description: `${targetText}의 체크리스트가 초기화되었습니다. 완료 기록은 학습 기록에서 계속 확인할 수 있습니다.`
      });
    } catch (error) {
      console.error('체크리스트 초기화 오류:', error);
      toast({
        title: "오류",
        description: "체크리스트 초기화 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          className="border-red-200 text-red-600 hover:bg-red-50"
          disabled={resetting}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          체크리스트 초기화
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>체크리스트 초기화</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedClass === 'all' && selectedActivity === 'all' 
              ? '전체 클래스의 모든 활동 체크리스트를 초기화하시겠습니까?'
              : `${selectedClass === 'all' ? '전체 클래스' : selectedClass}의 ${selectedActivity === 'all' ? '모든 활동' : '선택된 활동'} 체크리스트를 초기화하시겠습니까?`
            }
            <br />
            <strong>체크리스트 진행 상태는 초기화되지만, 완료 기록은 학습 기록에서 계속 확인할 수 있습니다.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700"
            disabled={resetting}
          >
            {resetting ? '초기화 중...' : '초기화'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ChecklistReset;
