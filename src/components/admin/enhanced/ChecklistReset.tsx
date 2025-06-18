
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
      let query = supabase
        .from('student_checklist_progress')
        .delete();

      // 특정 활동이 선택된 경우
      if (selectedActivity && selectedActivity !== 'all') {
        const { data: checklistItems } = await supabase
          .from('checklist_items')
          .select('id')
          .eq('activity_id', selectedActivity);

        if (checklistItems && checklistItems.length > 0) {
          const itemIds = checklistItems.map(item => item.id);
          query = query.in('checklist_item_id', itemIds);
        }
      }

      // 특정 클래스가 선택된 경우
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

      // 전체가 아닌 경우에만 필터 적용
      if (selectedClass !== 'all' || selectedActivity !== 'all') {
        await query;
      } else {
        // 전체 초기화
        await supabase.from('student_checklist_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const targetText = selectedClass === 'all' && selectedActivity === 'all' 
        ? '전체' 
        : `${selectedClass === 'all' ? '전체 클래스' : selectedClass} - ${selectedActivity === 'all' ? '전체 활동' : '선택된 활동'}`;

      toast({
        title: "체크리스트 초기화 완료",
        description: `${targetText}의 체크리스트가 초기화되었습니다.`
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
            <strong>이 작업은 되돌릴 수 없으며, 학습 기록은 유지됩니다.</strong>
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
