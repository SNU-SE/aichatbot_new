import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, Upload, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CSVUploader from './enhanced/CSVUploader';
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

interface Student {
  id: string;
  student_id: string;
  class_name: string;
  group_name: string | null;
  name: string | null;
  mother_tongue: string | null;
  created_at: string;
}

interface RelatedData {
  chat_logs: number;
  student_sessions: number;
  argumentation_responses: number;
  peer_evaluations: number;
  student_checklist_progress: number;
  question_frequency: number;
  evaluation_reflections: number;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);
  const [checkingRelatedData, setCheckingRelatedData] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    student_id: '',
    class_name: '',
    group_name: '',
    name: '',
    mother_tongue: '한국어'
  });

  // CSV 템플릿용 예시 데이터
  const csvTemplateData = [
    {
      student_id: '2024001',
      class_name: '3학년 1반',
      group_name: '1',
      name: '김철수',
      mother_tongue: '한국어'
    },
    {
      student_id: '2024002',
      class_name: '3학년 1반',
      group_name: '2',
      name: '이영희',
      mother_tongue: '한국어'
    },
    {
      student_id: '2024003',
      class_name: '3학년 2반',
      group_name: '1',
      name: 'John Smith',
      mother_tongue: '중국어'
    }
  ];

  const csvExpectedHeaders = ['student_id', 'class_name', 'group_name', 'name', 'mother_tongue'];

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      toast({
        title: "오류",
        description: "학생 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 고유 반 목록 추출
  const getUniqueClasses = () => {
    const classes = students.map(student => student.class_name);
    return Array.from(new Set(classes)).sort();
  };

  // 모둠 번호 유효성 검사
  const validateGroupNumber = (groupName: string) => {
    if (!groupName.trim()) return true; // 빈 값은 허용
    const num = parseInt(groupName.trim(), 10);
    return !isNaN(num) && num > 0 && num.toString() === groupName.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 모둠 번호 유효성 검사
    if (formData.group_name && !validateGroupNumber(formData.group_name)) {
      toast({
        title: "오류",
        description: "모둠은 양의 정수로만 입력해주세요. (예: 1, 2, 3)",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            class_name: formData.class_name,
            group_name: formData.group_name || null,
            name: formData.name || null,
            mother_tongue: formData.mother_tongue
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
        toast({
          title: "성공",
          description: "학생 정보가 수정되었습니다."
        });
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{
            student_id: formData.student_id,
            class_name: formData.class_name,
            group_name: formData.group_name || null,
            name: formData.name || null,
            mother_tongue: formData.mother_tongue
          }]);

        if (error) throw error;
        toast({
          title: "성공",
          description: "새 학생이 등록되었습니다."
        });
      }

      resetForm();
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message === 'duplicate key value violates unique constraint "students_student_id_key"' 
          ? "이미 존재하는 학번입니다." 
          : "작업을 완료할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const handleCSVData = async (csvData: any[]) => {
    try {
      // CSV 데이터 유효성 검사
      const invalidRows = csvData.filter(row => {
        const groupName = row.group_name || row['모둠'];
        return groupName && !validateGroupNumber(groupName);
      });

      if (invalidRows.length > 0) {
        toast({
          title: "오류",
          description: "모둠은 양의 정수로만 입력해주세요. 잘못된 데이터가 있습니다.",
          variant: "destructive"
        });
        return;
      }

      const studentsToInsert = csvData.map(row => ({
        student_id: row.student_id || row['학번'],
        class_name: row.class_name || row['반'],
        group_name: row.group_name || row['모둠'] || null,
        name: row.name || row['이름'] || null,
        mother_tongue: row.mother_tongue || row['모국어'] || '한국어'
      }));

      const { error } = await supabase
        .from('students')
        .insert(studentsToInsert);

      if (error) throw error;

      toast({
        title: "성공",
        description: `${studentsToInsert.length}명의 학생이 등록되었습니다.`
      });

      setShowCSVUpload(false);
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "CSV 데이터 저장에 실패했습니다: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id,
      class_name: student.class_name,
      group_name: student.group_name || '',
      name: student.name || '',
      mother_tongue: student.mother_tongue || '한국어'
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (student: Student) => {
    setStudentToDelete(student);
    await checkRelatedData(student.student_id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      const studentId = studentToDelete.student_id;
      
      // 관련 데이터가 있는 경우 모두 삭제
      if (relatedData) {
        const deletePromises = [];
        
        if (relatedData.chat_logs > 0) {
          deletePromises.push(
            supabase.from('chat_logs').delete().eq('student_id', studentId)
          );
        }
        
        if (relatedData.student_sessions > 0) {
          deletePromises.push(
            supabase.from('student_sessions').delete().eq('student_id', studentId)
          );
        }
        
        if (relatedData.argumentation_responses > 0) {
          deletePromises.push(
            supabase.from('argumentation_responses').delete().eq('student_id', studentId)
          );
        }
        
        if (relatedData.peer_evaluations > 0) {
          deletePromises.push(
            supabase.from('peer_evaluations').delete().eq('evaluator_id', studentId)
          );
        }
        
        if (relatedData.student_checklist_progress > 0) {
          deletePromises.push(
            supabase.from('student_checklist_progress').delete().eq('student_id', studentId)
          );
        }
        
        if (relatedData.question_frequency > 0) {
          deletePromises.push(
            supabase.from('question_frequency').delete().eq('student_id', studentId)
          );
        }
        
        if (relatedData.evaluation_reflections > 0) {
          deletePromises.push(
            supabase.from('evaluation_reflections').delete().eq('student_id', studentId)
          );
        }

        // 모든 관련 데이터 삭제
        await Promise.all(deletePromises);
      }

      // 학생 데이터 삭제
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id);

      if (error) throw error;
      
      toast({
        title: "성공",
        description: "학생과 관련된 모든 데이터가 삭제되었습니다."
      });
      
      fetchStudents();
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
      setRelatedData(null);
    } catch (error) {
      console.error('삭제 중 오류:', error);
      toast({
        title: "오류",
        description: "학생 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const checkRelatedData = async (studentId: string) => {
    setCheckingRelatedData(true);
    try {
      // 각 테이블에서 해당 학생과 관련된 데이터 개수 확인
      const [
        chatLogs,
        sessions,
        responses,
        evaluations,
        checklistProgress,
        questionFreq,
        reflections
      ] = await Promise.all([
        supabase.from('chat_logs').select('id', { count: 'exact' }).eq('student_id', studentId),
        supabase.from('student_sessions').select('id', { count: 'exact' }).eq('student_id', studentId),
        supabase.from('argumentation_responses').select('id', { count: 'exact' }).eq('student_id', studentId),
        supabase.from('peer_evaluations').select('id', { count: 'exact' }).eq('evaluator_id', studentId),
        supabase.from('student_checklist_progress').select('id', { count: 'exact' }).eq('student_id', studentId),
        supabase.from('question_frequency').select('id', { count: 'exact' }).eq('student_id', studentId),
        supabase.from('evaluation_reflections').select('id', { count: 'exact' }).eq('student_id', studentId)
      ]);

      const data: RelatedData = {
        chat_logs: chatLogs.count || 0,
        student_sessions: sessions.count || 0,
        argumentation_responses: responses.count || 0,
        peer_evaluations: evaluations.count || 0,
        student_checklist_progress: checklistProgress.count || 0,
        question_frequency: questionFreq.count || 0,
        evaluation_reflections: reflections.count || 0
      };

      setRelatedData(data);
      return data;
    } catch (error) {
      console.error('관련 데이터 확인 중 오류:', error);
      toast({
        title: "오류",
        description: "관련 데이터를 확인하는데 실패했습니다.",
        variant: "destructive"
      });
      return null;
    } finally {
      setCheckingRelatedData(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      class_name: '',
      group_name: '',
      name: '',
      mother_tongue: '한국어'
    });
    setEditingStudent(null);
    setShowForm(false);
  };

  const getTotalRelatedDataCount = (data: RelatedData) => {
    return Object.values(data).reduce((sum, count) => sum + count, 0);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.group_name && student.group_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.name && student.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesClass = selectedClass === 'all' || student.class_name === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">학생정보 관리</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowCSVUpload(true)}
            variant="outline"
            className="border-[rgb(15,15,112)] text-[rgb(15,15,112)]"
          >
            <Upload className="h-4 w-4 mr-2" />
            CSV 일괄등록
          </Button>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 학생 등록
          </Button>
        </div>
      </div>

      {/* CSV 업로드 */}
      {showCSVUpload && (
        <CSVUploader
          onDataParsed={handleCSVData}
          expectedHeaders={csvExpectedHeaders}
          templateData={csvTemplateData}
          title="학생"
        />
      )}

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="학번, 반 이름, 모둠명, 학생 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="반 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 반</SelectItem>
                {getUniqueClasses().map(className => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 학생 등록/수정 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingStudent ? '학생 정보 수정' : '새 학생 등록'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="student_id">학번</Label>
                  <Input
                    id="student_id"
                    value={formData.student_id}
                    onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                    required
                    disabled={!!editingStudent}
                    placeholder="예: 2024001"
                  />
                </div>
                <div>
                  <Label htmlFor="class_name">반 이름</Label>
                  <Input
                    id="class_name"
                    value={formData.class_name}
                    onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                    required
                    placeholder="예: 3학년 1반"
                  />
                </div>
                <div>
                  <Label htmlFor="group_name">모둠 (숫자만, 선택)</Label>
                  <Input
                    id="group_name"
                    value={formData.group_name}
                    onChange={(e) => setFormData({...formData, group_name: e.target.value})}
                    placeholder="예: 1, 2, 3"
                    pattern="[1-9][0-9]*"
                    title="양의 정수만 입력 가능합니다"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">학생 이름 (선택)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="예: 김철수"
                  />
                </div>
                <div>
                  <Label htmlFor="mother_tongue">모국어</Label>
                  <Input
                    id="mother_tongue"
                    value={formData.mother_tongue}
                    onChange={(e) => setFormData({...formData, mother_tongue: e.target.value})}
                    placeholder="예: 한국어, 중국어, 러시아어"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  취소
                </Button>
                <Button 
                  type="submit"
                  className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
                >
                  {editingStudent ? '수정' : '등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 학생 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>
            학생 목록 ({filteredStudents.length}명)
            {selectedClass !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {selectedClass}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학번</TableHead>
                <TableHead>반</TableHead>
                <TableHead>모둠</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>모국어</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.student_id}</TableCell>
                  <TableCell>{student.class_name}</TableCell>
                  <TableCell>{student.group_name || '-'}</TableCell>
                  <TableCell>{student.name || '-'}</TableCell>
                  <TableCell>{student.mother_tongue || '-'}</TableCell>
                  <TableCell>{new Date(student.created_at).toLocaleDateString('ko-KR')}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(student)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(student)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {searchTerm || selectedClass !== 'all' ? '필터 조건에 맞는 학생이 없습니다.' : '등록된 학생이 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              학생 삭제 확인
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              {studentToDelete && (
                <>
                  <p className="font-medium">
                    학생 "{studentToDelete.name || studentToDelete.student_id}"를 삭제하시겠습니까?
                  </p>
                  
                  {checkingRelatedData ? (
                    <p className="text-sm text-gray-600">관련 데이터 확인 중...</p>
                  ) : relatedData && getTotalRelatedDataCount(relatedData) > 0 ? (
                    <div className="bg-orange-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-orange-800 mb-2">
                        다음 관련 데이터도 함께 삭제됩니다:
                      </p>
                      <ul className="text-xs text-orange-700 space-y-1">
                        {relatedData.chat_logs > 0 && (
                          <li>• 채팅 기록: {relatedData.chat_logs}개</li>
                        )}
                        {relatedData.student_sessions > 0 && (
                          <li>• 접속 기록: {relatedData.student_sessions}개</li>
                        )}
                        {relatedData.argumentation_responses > 0 && (
                          <li>• 논증 응답: {relatedData.argumentation_responses}개</li>
                        )}
                        {relatedData.peer_evaluations > 0 && (
                          <li>• 동료평가: {relatedData.peer_evaluations}개</li>
                        )}
                        {relatedData.student_checklist_progress > 0 && (
                          <li>• 체크리스트 진행상황: {relatedData.student_checklist_progress}개</li>
                        )}
                        {relatedData.question_frequency > 0 && (
                          <li>• 질문 빈도: {relatedData.question_frequency}개</li>
                        )}
                        {relatedData.evaluation_reflections > 0 && (
                          <li>• 평가 성찰: {relatedData.evaluation_reflections}개</li>
                        )}
                      </ul>
                      <p className="text-xs text-orange-800 mt-2 font-medium">
                        총 {getTotalRelatedDataCount(relatedData)}개의 관련 데이터가 삭제됩니다.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">관련된 데이터가 없습니다.</p>
                  )}
                  
                  <p className="text-sm text-red-600 font-medium">
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={checkingRelatedData}
            >
              {checkingRelatedData ? "확인 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentManagement;
