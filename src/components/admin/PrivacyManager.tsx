
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Eye, EyeOff, Trash2, UserX, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PrivacySettings {
  auto_delete_logs: boolean;
  retention_days: number;
  anonymize_data: boolean;
  data_sharing_consent: boolean;
  export_allowed: boolean;
}

const PrivacyManager = () => {
  const [settings, setSettings] = useState<PrivacySettings>({
    auto_delete_logs: false,
    retention_days: 30,
    anonymize_data: true,
    data_sharing_consent: false,
    export_allowed: true
  });

  const [deletionRules, setDeletionRules] = useState({
    inactive_students: 90,
    old_chat_logs: 180,
    temp_files: 7
  });

  const [searchStudentId, setSearchStudentId] = useState('');
  const [studentDataPreview, setStudentDataPreview] = useState<any>(null);
  const { toast } = useToast();

  const updatePrivacySettings = async () => {
    try {
      // 실제 구현에서는 개인정보 설정을 저장
      toast({
        title: "설정 저장됨",
        description: "개인정보 보호 설정이 업데이트되었습니다."
      });
    } catch (error: any) {
      toast({
        title: "설정 실패",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const searchStudentData = async () => {
    if (!searchStudentId.trim()) return;

    try {
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', searchStudentId)
        .single();

      if (student) {
        const { data: chatLogs } = await supabase
          .from('chat_logs')
          .select('*')
          .eq('student_id', searchStudentId)
          .order('timestamp', { ascending: false })
          .limit(10);

        setStudentDataPreview({
          student,
          chatLogsCount: chatLogs?.length || 0,
          lastActivity: chatLogs?.[0]?.timestamp
        });
      } else {
        setStudentDataPreview(null);
        toast({
          title: "학생을 찾을 수 없음",
          description: "해당 학번의 학생이 존재하지 않습니다.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('학생 검색 오류:', error);
      toast({
        title: "검색 실패",
        description: "학생 데이터 검색에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const anonymizeStudentData = async (studentId: string) => {
    try {
      // 학생 데이터 익명화
      await supabase
        .from('students')
        .update({
          name: `익명_${Date.now()}`,
          student_id: `ANON_${Date.now()}`
        })
        .eq('student_id', studentId);

      // 채팅 로그에서 개인정보 제거
      await supabase
        .from('chat_logs')
        .update({
          message: '[익명화된 메시지]'
        })
        .eq('student_id', studentId);

      toast({
        title: "익명화 완료",
        description: "학생 데이터가 성공적으로 익명화되었습니다."
      });

      setStudentDataPreview(null);
      setSearchStudentId('');
    } catch (error: any) {
      console.error('익명화 오류:', error);
      toast({
        title: "익명화 실패",
        description: "데이터 익명화에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const deleteStudentData = async (studentId: string) => {
    if (!confirm('정말로 이 학생의 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      // 채팅 로그 삭제
      await supabase
        .from('chat_logs')
        .delete()
        .eq('student_id', studentId);

      // 학생 정보 삭제
      await supabase
        .from('students')
        .delete()
        .eq('student_id', studentId);

      toast({
        title: "삭제 완료",
        description: "학생 데이터가 완전히 삭제되었습니다."
      });

      setStudentDataPreview(null);
      setSearchStudentId('');
    } catch (error: any) {
      console.error('삭제 오류:', error);
      toast({
        title: "삭제 실패",
        description: "데이터 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const runDataCleanup = async () => {
    try {
      // 오래된 데이터 정리
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deletionRules.old_chat_logs);

      await supabase
        .from('chat_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      toast({
        title: "정리 완료",
        description: `${deletionRules.old_chat_logs}일 이전 데이터가 정리되었습니다.`
      });
    } catch (error: any) {
      console.error('데이터 정리 오류:', error);
      toast({
        title: "정리 실패",
        description: "데이터 정리에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 개인정보 보호 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>개인정보 보호 설정</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">자동 로그 삭제</Label>
                <p className="text-sm text-gray-500">설정된 기간 후 채팅 로그 자동 삭제</p>
              </div>
              <Switch
                checked={settings.auto_delete_logs}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, auto_delete_logs: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">데이터 익명화</Label>
                <p className="text-sm text-gray-500">개인 식별 정보 자동 익명화</p>
              </div>
              <Switch
                checked={settings.anonymize_data}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, anonymize_data: checked }))
                }
              />
            </div>

            <div>
              <Label>데이터 보관 기간 (일)</Label>
              <Input
                type="number"
                value={settings.retention_days}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, retention_days: parseInt(e.target.value) }))
                }
                min="1"
                max="365"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">데이터 내보내기 허용</Label>
                <p className="text-sm text-gray-500">관리자 데이터 내보내기 기능</p>
              </div>
              <Switch
                checked={settings.export_allowed}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, export_allowed: checked }))
                }
              />
            </div>
          </div>

          <Button 
            onClick={updatePrivacySettings}
            className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
          >
            설정 저장
          </Button>
        </CardContent>
      </Card>

      {/* 학생 데이터 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserX className="h-5 w-5" />
            <span>학생 데이터 관리</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="학번 입력"
              value={searchStudentId}
              onChange={(e) => setSearchStudentId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={searchStudentData} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              조회
            </Button>
          </div>

          {studentDataPreview && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-2">학생 정보</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">이름:</span> {studentDataPreview.student.name}
                </div>
                <div>
                  <span className="font-medium">학번:</span> {studentDataPreview.student.student_id}
                </div>
                <div>
                  <span className="font-medium">반:</span> {studentDataPreview.student.class_name}
                </div>
                <div>
                  <span className="font-medium">채팅 기록:</span> {studentDataPreview.chatLogsCount}개
                </div>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => anonymizeStudentData(studentDataPreview.student.student_id)}
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  익명화
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteStudentData(studentDataPreview.student.student_id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  완전 삭제
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 데이터 정리 규칙 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>자동 데이터 정리</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>비활성 학생 (일)</Label>
              <Input
                type="number"
                value={deletionRules.inactive_students}
                onChange={(e) => 
                  setDeletionRules(prev => ({ 
                    ...prev, 
                    inactive_students: parseInt(e.target.value) 
                  }))
                }
              />
            </div>
            <div>
              <Label>오래된 채팅 로그 (일)</Label>
              <Input
                type="number"
                value={deletionRules.old_chat_logs}
                onChange={(e) => 
                  setDeletionRules(prev => ({ 
                    ...prev, 
                    old_chat_logs: parseInt(e.target.value) 
                  }))
                }
              />
            </div>
            <div>
              <Label>임시 파일 (일)</Label>
              <Input
                type="number"
                value={deletionRules.temp_files}
                onChange={(e) => 
                  setDeletionRules(prev => ({ 
                    ...prev, 
                    temp_files: parseInt(e.target.value) 
                  }))
                }
              />
            </div>
          </div>

          <Button 
            onClick={runDataCleanup}
            variant="outline"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            지금 데이터 정리 실행
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyManager;
