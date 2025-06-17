import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CSVUploader from './enhanced/CSVUploader';

interface Student {
  id: string;
  student_id: string;
  class_name: string;
  name: string | null;
  mother_tongue: string | null;
  created_at: string;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    student_id: '',
    class_name: '',
    name: '',
    mother_tongue: 'Korean'
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            class_name: formData.class_name,
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
      const studentsToInsert = csvData.map(row => ({
        student_id: row.student_id || row['학번'],
        class_name: row.class_name || row['반'],
        name: row.name || row['이름'] || null,
        mother_tongue: row.mother_tongue || row['모국어'] || 'Korean'
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
      name: student.name || '',
      mother_tongue: student.mother_tongue || 'Korean'
    });
    setShowForm(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('정말로 이 학생을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      
      toast({
        title: "성공",
        description: "학생이 삭제되었습니다."
      });
      fetchStudents();
    } catch (error) {
      toast({
        title: "오류",
        description: "학생 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      class_name: '',
      name: '',
      mother_tongue: 'Korean'
    });
    setEditingStudent(null);
    setShowForm(false);
  };

  const filteredStudents = students.filter(student =>
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.name && student.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          expectedHeaders={['student_id', 'class_name', 'name', 'mother_tongue']}
          title="학생"
        />
      )}

      {/* 검색 */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="학번, 반 이름, 학생 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="예: Korean, English, Chinese"
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
          <CardTitle>학생 목록 ({filteredStudents.length}명)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학번</TableHead>
                <TableHead>반</TableHead>
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
                        onClick={() => handleDelete(student.id)}
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
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentManagement;
