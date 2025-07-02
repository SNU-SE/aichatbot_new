
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity } from '@/types/activity';
import ChatInterface from './ChatInterface';
import ModuleProgress from './ModuleProgress';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { Badge } from '@/components/ui/badge';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const { updateSession } = useSessionRecovery();

  useEffect(() => {
    loadExistingResponse();
    loadSavedDraft();
  }, [activity.id, studentId]);

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (!argument.trim() || isSubmitted) return;

    const autoSaveInterval = setInterval(() => {
      handleSaveDraft();
    }, 30000); // 30초

    return () => clearInterval(autoSaveInterval);
  }, [argument, isSubmitted]);

  const loadExistingResponse = async () => {
    try {
      const { data, error } = await supabase
        .from('argumentation_responses')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activity.id)
        .single();

      if (data && !error) {
        setArgument(data.response_text);
        setIsSubmitted(data.is_submitted || false);
      }
    } catch (error) {
      console.error('Failed to load existing response:', error);
    }
  };

  const loadSavedDraft = async () => {
    if (!loadDraft) return;

    try {
      const draft = await loadDraft(studentId, activity.id, 'argumentation');
      if (draft && draft.argument && !isSubmitted) {
        setArgument(draft.argument);
        setLastSaved(new Date(draft.savedAt));
        toast({
          title: "임시 저장된 내용 복원",
          description: "이전에 작성하던 내용을 불러왔습니다."
        });
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!saveDraft || !argument.trim() || isSubmitted) return;

    setIsDraftSaving(true);
    try {
      await saveDraft(studentId, activity.id, 'argumentation', {
        argument,
        savedAt: new Date().toISOString()
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!argument.trim()) {
      toast({
        title: "오류",
        description: "논증을 작성해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 세션 업데이트
      await updateSession(studentId);

      const { error } = await supabase
        .from('argumentation_responses')
        .upsert({
          student_id: studentId,
          activity_id: activity.id,
          response_text: argument,
          is_submitted: true,
          submitted_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,activity_id'
        });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      toast({
        title: "제출 완료",
        description: "논증이 성공적으로 제출되었습니다."
      });

      // 임시 저장 내용 삭제 (제출 완료 후)
      if (saveDraft) {
        await saveDraft(studentId, activity.id, 'argumentation', {});
      }
      
    } catch (error: any) {
      console.error('Submission failed:', error);
      
      if (error.message?.includes('not found') || error.message?.includes('student')) {
        toast({
          title: "등록되지 않은 사용자입니다",
          description: "관리자에게 문의하거나 다시 로그인해주세요.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "제출 실패",
          description: "네트워크 연결을 확인하고 다시 시도해주세요.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          onClick={onBack}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>활동 목록으로</span>
        </Button>
        
        {lastSaved && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Save className="h-4 w-4" />
            <span>마지막 저장: {lastSaved.toLocaleTimeString()}</span>
            {isDraftSaving && <RefreshCw className="h-3 w-3 animate-spin" />}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{activity.title}</span>
                {isSubmitted && (
                  <Badge variant="default" className="bg-green-600">
                    제출 완료
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">활동 내용</h3>
                  <div className="prose prose-sm max-w-none">
                    {typeof activity.content === 'string' 
                      ? activity.content 
                      : JSON.stringify(activity.content)
                    }
                  </div>
                </div>
                
                {activity.final_question && (
                  <div>
                    <h3 className="font-semibold mb-2">논증 질문</h3>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                      {activity.final_question}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <ModuleProgress 
            activityId={activity.id}
            studentId={studentId}
            totalModules={activity.modules_count || 1}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>논증 작성</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={argument}
                  onChange={(e) => setArgument(e.target.value)}
                  placeholder="여기에 논증을 작성해주세요..."
                  className="min-h-[300px]"
                  disabled={isSubmitted}
                />
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    {!isSubmitted && (
                      <Button
                        onClick={handleSaveDraft}
                        variant="outline"
                        disabled={isDraftSaving || !argument.trim()}
                        className="flex items-center space-x-2"
                      >
                        {isDraftSaving ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span>임시 저장</span>
                      </Button>
                    )}
                  </div>
                  
                  {!isSubmitted && (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !argument.trim()}
                      className="flex items-center space-x-2"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span>제출하기</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <ChatInterface 
            activityId={activity.id}
            studentId={studentId}
          />
        </div>
      </div>
    </div>
  );
};

export default ArgumentationActivity;
