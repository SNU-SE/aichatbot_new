
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText } from 'lucide-react';

interface DiscussionNotesProps {
  studentId: string;
  activityId: string;
}

const DiscussionNotes = ({ studentId, activityId }: DiscussionNotesProps) => {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
  }, [studentId, activityId]);

  useEffect(() => {
    // Auto-save after 2 seconds of inactivity
    const timer = setTimeout(() => {
      if (notes.trim() && !isLoading) {
        saveNotes();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes]);

  const loadNotes = async () => {
    try {
      // For now, store notes in localStorage until the table is properly added to Supabase
      const storageKey = `notes_${studentId}_${activityId}`;
      const savedNotes = localStorage.getItem(storageKey);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } catch (error) {
      console.error('메모 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async () => {
    try {
      // For now, store notes in localStorage until the table is properly added to Supabase
      const storageKey = `notes_${studentId}_${activityId}`;
      localStorage.setItem(storageKey, notes);
    } catch (error) {
      console.error('메모 저장 실패:', error);
      toast({
        title: "오류",
        description: "메모 저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-gray-500">메모를 불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-4 w-4" />
          <span>토의 메모</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="토의 내용이나 아이디어를 자유롭게 메모하세요..."
          className="min-h-32 resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          메모는 자동으로 저장됩니다.
        </p>
      </CardContent>
    </Card>
  );
};

export default DiscussionNotes;
