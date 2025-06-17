
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  type: string;
  content: any;
  file_url: string | null;
  created_at: string;
}

const ActivityManagement = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    type: 'experiment',
    content: {
      description: '',
      instructions: '',
      materials: '',
      expected_outcome: ''
    },
    file_url: ''
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      toast({
        title: "오류",
        description: "활동 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingActivity) {
        const { error } = await supabase
          .from('activities')
          .update({
            title: formData.title,
            type: formData.type,
            content: formData.content,
            file_url: formData.file_url || null
          })
          .eq('id', editingActivity.id);

        if (error) throw error;
        toast({
          title: "성공",
          description: "활동이 수정되었습니다."
        });
      } else {
        const { error } = await supabase
          .from('activities')
          .insert([{
            title: formData.title,
            type: formData.type,
            content: formData.content,
            file_url: formData.file_url || null
          }]);

        if (error) throw error;
        toast({
          title: "성공",
          description: "새 활동이 생성되었습니다."
        });
      }

      resetForm();
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "작업을 완료할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      title: activity.title,
      type: activity.type,
      content: activity.content,
      file_url: activity.file_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm('정말로 이 활동을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      
      toast({
        title: "성공",
        description: "활동이 삭제되었습니다."
      });
      fetchActivities();
    } catch (error) {
      toast({
        title: "오류",
        description: "활동 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'experiment',
      content: {
        description: '',
        instructions: '',
        materials: '',
        expected_outcome: ''
      },
      file_url: ''
    });
    setEditingActivity(null);
    setShowForm(false);
  };

  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'experiment': return '실험';
      case 'argumentation': return '논증';
      case 'discussion': return '토의';
      default: return type;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">학습활동 관리</h2>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          새 활동 생성
        </Button>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="활동 제목이나 유형으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 활동 생성/수정 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingActivity ? '활동 수정' : '새 활동 생성'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">활동 제목</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    placeholder="예: 물의 상태 변화 실험"
                  />
                </div>
                <div>
                  <Label htmlFor="type">활동 유형</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="experiment">실험</SelectItem>
                      <SelectItem value="argumentation">논증</SelectItem>
                      <SelectItem value="discussion">토의</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">활동 설명</Label>
                <Textarea
                  id="description"
                  value={formData.content.description}
                  onChange={(e) => setFormData({
                    ...formData, 
                    content: {...formData.content, description: e.target.value}
                  })}
                  placeholder="이 활동의 목적과 개요를 설명해주세요"
                />
              </div>

              <div>
                <Label htmlFor="instructions">활동 지침</Label>
                <Textarea
                  id="instructions"
                  value={formData.content.instructions}
                  onChange={(e) => setFormData({
                    ...formData, 
                    content: {...formData.content, instructions: e.target.value}
                  })}
                  placeholder="학생들이 따라야 할 단계별 지침을 작성해주세요"
                />
              </div>

              <div>
                <Label htmlFor="materials">필요 자료</Label>
                <Textarea
                  id="materials"
                  value={formData.content.materials}
                  onChange={(e) => setFormData({
                    ...formData, 
                    content: {...formData.content, materials: e.target.value}
                  })}
                  placeholder="이 활동에 필요한 자료나 준비물을 나열해주세요"
                />
              </div>

              <div>
                <Label htmlFor="expected_outcome">기대 결과</Label>
                <Textarea
                  id="expected_outcome"
                  value={formData.content.expected_outcome}
                  onChange={(e) => setFormData({
                    ...formData, 
                    content: {...formData.content, expected_outcome: e.target.value}
                  })}
                  placeholder="이 활동을 통해 학생들이 얻을 수 있는 학습 결과"
                />
              </div>

              <div>
                <Label htmlFor="file_url">첨부 파일 URL (선택)</Label>
                <Input
                  id="file_url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                  placeholder="관련 자료 링크나 파일 URL"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  취소
                </Button>
                <Button 
                  type="submit"
                  className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
                >
                  {editingActivity ? '수정' : '생성'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 활동 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>활동 목록 ({filteredActivities.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.title}</TableCell>
                  <TableCell>{getTypeLabel(activity.type)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {activity.content?.description || '-'}
                  </TableCell>
                  <TableCell>{new Date(activity.created_at).toLocaleDateString('ko-KR')}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(activity)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(activity.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredActivities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '생성된 활동이 없습니다.'}
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

export default ActivityManagement;
