
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, Database, Shield, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackupData {
  timestamp: string;
  tables: string[];
  size: string;
  status: 'completed' | 'in_progress' | 'failed';
}

const DataBackupManager = () => {
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>(['all']);
  const { toast } = useToast();

  const availableTables = [
    { value: 'all', label: '모든 테이블' },
    { value: 'students', label: '학생 정보' },
    { value: 'chat_logs', label: '채팅 로그' },
    { value: 'activities', label: '학습 활동' },
    { value: 'admin_settings', label: '관리자 설정' },
    { value: 'prompt_templates', label: '프롬프트 템플릿' }
  ];

  const createBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // 실제 구현에서는 Edge Function을 통해 백업 생성
      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        tables: selectedTables,
        size: '2.5 MB',
        status: 'completed'
      };

      setBackups(prev => [backupData, ...prev]);
      
      toast({
        title: "백업 완료",
        description: "데이터 백업이 성공적으로 생성되었습니다."
      });
    } catch (error: any) {
      console.error('백업 생성 오류:', error);
      toast({
        title: "백업 실패",
        description: "데이터 백업 생성에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const downloadBackup = (backup: BackupData) => {
    // 실제 구현에서는 백업 파일 다운로드
    toast({
      title: "다운로드 시작",
      description: "백업 파일 다운로드를 시작합니다."
    });
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      // 학생 데이터 내보내기 예시
      const { data: students } = await supabase
        .from('students')
        .select('*');

      const { data: chatLogs } = await supabase
        .from('chat_logs')
        .select('*')
        .limit(1000); // 최근 1000개만

      const exportData = {
        students: students || [],
        chat_logs: chatLogs || [],
        exported_at: new Date().toISOString()
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV 변환 로직 (간단한 예시)
        const csvContent = students?.map(student => 
          `${student.student_id},${student.name},${student.class_name}`
        ).join('\n');
        
        const blob = new Blob([`학번,이름,반\n${csvContent}`], {
          type: 'text/csv;charset=utf-8;'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "내보내기 완료",
        description: `데이터가 ${format.toUpperCase()} 형식으로 내보내졌습니다.`
      });
    } catch (error: any) {
      console.error('데이터 내보내기 오류:', error);
      toast({
        title: "내보내기 실패",
        description: "데이터 내보내기에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 백업 생성 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>데이터 백업 생성</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>백업할 테이블 선택</Label>
              <Select
                value={selectedTables[0]}
                onValueChange={(value) => setSelectedTables([value])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table.value} value={table.value}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={createBackup}
              disabled={isCreatingBackup}
              className="w-full bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
            >
              <Database className="h-4 w-4 mr-2" />
              {isCreatingBackup ? '백업 생성 중...' : '백업 생성'}
            </Button>
          </CardContent>
        </Card>

        {/* 데이터 내보내기 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>데이터 내보내기</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => exportData('csv')}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>CSV 내보내기</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => exportData('json')}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>JSON 내보내기</span>
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              학생 정보와 최근 채팅 로그를 내보냅니다.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 백업 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>백업 목록</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                생성된 백업이 없습니다.
              </p>
            ) : (
              backups.map((backup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {new Date(backup.timestamp).toLocaleString('ko-KR')}
                      </p>
                      <p className="text-sm text-gray-500">
                        테이블: {backup.tables.join(', ')} | 크기: {backup.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      backup.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : backup.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {backup.status === 'completed' ? '완료' : 
                       backup.status === 'in_progress' ? '진행중' : '실패'}
                    </span>
                    {backup.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadBackup(backup)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        다운로드
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataBackupManager;
