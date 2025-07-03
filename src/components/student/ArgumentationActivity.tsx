import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Send, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity } from '@/types/activity';
import ModuleProgress from './ModuleProgress';
import ChatInterface from './ChatInterface';

interface ArgumentationActivityProps {
  activity: Activity;
  studentId: string;
  onBack: () => void;
  saveDraft: (studentId: string, activityId: string, workType: string, content: any) => Promise<void>;
  loadDraft: (studentId: string, activityId: string, workType: string) => Promise<any>;
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
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSubmissionStatus();
    loadSavedDraft();
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
      }
    } catch (error) {
      console.error('Error checking submission status:', error);
    }
  };

  const loadSavedDraft = async () => {
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
    if (!argument.trim()) return;
    
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

  const handleSubmit = async () => {
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
      
      // 임시 저장 데이터 삭제
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

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (!argument.trim() || isSubmitted) return;

    const autoSaveInterval = setInterval(() => {
      handleSaveDraft();
    }, 30000); // 30초

    return () => clearInterval(autoSaveInterval);
  }, [argument, isSubmitted]);

  if (showChat) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => setShowChat(false)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>활동으로 돌아가기</span>
          </Button>
          <h1 className="text-2xl font-bold text-[rgb(15,15,112)]">AI 도우미</h1>
        </div>
        
        <ChatInterface 
          activity={activity}
          studentId={studentId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          onClick={onBack}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>목록으로</span>
        </Button>
        <h1 className="text-2xl font-bold text-[rgb(15,15,112)]">{activity.title}</h1>
        <Button 
          onClick={() => setShowChat(true)}
          className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90 flex items-center space-x-2"
        >
          <BookOpen className="h-4 w-4" />
          <span>AI 도우미</span>
        </Button>
      </div>

      {/* Progress indicator */}
      {activity.modules_count && activity.modules_count > 1 && (
        <ModuleProgress 
          activity={activity}
          studentId={studentId}
          totalModules={activity.modules_count}
        />
      )}

      {/* Activity content */}
      <Card>
        <CardHeader>
          <CardTitle>논증 활동</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activity.content && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">활동 안내</h3>
              <div dangerouslySetInnerHTML={{ __html: String(activity.content) }} />
            </div>
          )}

          <div className="space-y-4">
            <label className="text-sm font-medium">당신의 논증을 작성해주세요:</label>
            <Textarea
              value={argument}
              onChange={(e) => setArgument(e.target.value)}
              placeholder="논증을 입력하세요..."
              className="min-h-[200px]"
              disabled={isSubmitted}
            />
            
            {!isSubmitted && (
              <div className="flex justify-between">
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  disabled={isSaving || !argument.trim()}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? '저장 중...' : '임시 저장'}</span>
                </Button>
                
                <Button
                  onClick={handleSubmit}
                  disabled={!argument.trim()}
                  className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90 flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>제출하기</span>
                </Button>
              </div>
            )}
            
            {isSubmitted && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">✅ 논증이 제출되었습니다.</p>
                <p className="text-green-600 text-sm">제출된 논증은 수정할 수 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArgumentationActivity;
