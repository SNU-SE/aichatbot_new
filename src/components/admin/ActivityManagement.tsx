import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CSVUploader from '@/components/admin/enhanced/CSVUploader';

interface Activity {
  id: string;
  title: string;
  type: string;
  content: any;
  file_url: string | null;
  final_question: string | null;
  modules_count: number | null;
  created_at: string;
}

interface Module {
  id?: string;
  module_number: number;
  title: string;
  steps: ChecklistItem[];
}

interface ChecklistItem {
  id?: string;
  step_number: number;
  description: string;
  module_id?: string;
}

const ActivityManagement = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    type: 'experiment',
    final_question: '',
    modules_count: 1,
    file_url: ''
  });

  // 실험용 모듈 데이터
  const [modules, setModules] = useState<Module[]>([
    { module_number: 1, title: '', steps: [{ step_number: 1, description: '' }] }
  ]);

  // 논증/토의용 체크리스트
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { step_number: 1, description: '' }
  ]);

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

  const handleCSVDataParsed = async (csvData: any[]) => {
    try {
      const processedActivities = [];
      
      for (const row of csvData) {
        // 기본 활동 데이터 처리
        const activityData = {
          title: row['제목'] || row['title'] || '',
          type: row['유형'] || row['type'] || 'experiment',
          file_url: row['파일URL'] || row['file_url'] || null,
          final_question: row['최종질문'] || row['final_question'] || null,
          modules_count: parseInt(row['모듈수'] || row['modules_count'] || '1'),
          content: {}
        };

        // 활동 생성
        const { data: activity, error: activityError } = await supabase
          .from('activities')
          .insert([activityData])
          .select()
          .single();

        if (activityError) {
          console.error('Activity creation error:', activityError);
          continue;
        }

        // 체크리스트 항목 처리 (CSV에서 세미콜론으로 구분)
        const checklistItems = row['체크리스트'] || row['checklist'] || '';
        if (checklistItems) {
          const items = checklistItems.split(';').filter((item: string) => item.trim());
          for (let i = 0; i < items.length; i++) {
            await supabase
              .from('checklist_items')
              .insert({
                activity_id: activity.id,
                step_number: i + 1,
                description: items[i].trim()
              });
          }
        }

        processedActivities.push(activity);
      }

      toast({
        title: "성공",
        description: `${processedActivities.length}개의 활동이 생성되었습니다.`
      });

      setShowCSVUpload(false);
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "CSV 데이터 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let activityData = {
        title: formData.title,
        type: formData.type,
        content: {},
        file_url: formData.file_url || null,
        final_question: formData.type === 'argumentation' ? formData.final_question : null,
        modules_count: formData.type === 'experiment' ? formData.modules_count : null
      };

      let activityId: string;

      if (editingActivity) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', editingActivity.id);

        if (error) throw error;
        activityId = editingActivity.id;
        
        // 기존 모듈과 체크리스트 삭제
        await supabase.from('checklist_items').delete().eq('activity_id', activityId);
        await supabase.from('activity_modules').delete().eq('activity_id', activityId);
      } else {
        const { data, error } = await supabase
          .from('activities')
          .insert([activityData])
          .select()
          .single();

        if (error) throw error;
        activityId = data.id;
      }

      // 활동 타입에 따라 세부 데이터 저장
      if (formData.type === 'experiment') {
        await saveExperimentData(activityId);
      } else if (formData.type === 'argumentation') {
        await saveArgumentationData(activityId);
      } else if (formData.type === 'discussion') {
        await saveDiscussionData(activityId);
      }

      toast({
        title: "성공",
        description: editingActivity ? "활동이 수정되었습니다." : "새 활동이 생성되었습니다."
      });

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

  const saveExperimentData = async (activityId: string) => {
    for (const module of modules) {
      const { data: moduleData, error: moduleError } = await supabase
        .from('activity_modules')
        .insert({
          activity_id: activityId,
          module_number: module.module_number,
          title: module.title
        })
        .select()
        .single();

      if (moduleError) throw moduleError;

      for (const step of module.steps) {
        await supabase
          .from('checklist_items')
          .insert({
            activity_id: activityId,
            module_id: moduleData.id,
            step_number: step.step_number,
            description: step.description
          });
      }
    }
  };

  const saveArgumentationData = async (activityId: string) => {
    for (const item of checklist) {
      await supabase
        .from('checklist_items')
        .insert({
          activity_id: activityId,
          step_number: item.step_number,
          description: item.description
        });
    }
  };

  const saveDiscussionData = async (activityId: string) => {
    for (const item of checklist) {
      await supabase
        .from('checklist_items')
        .insert({
          activity_id: activityId,
          step_number: item.step_number,
          description: item.description
        });
    }
  };

  const handleEdit = async (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      title: activity.title,
      type: activity.type,
      final_question: activity.final_question || '',
      modules_count: activity.modules_count || 1,
      file_url: activity.file_url || ''
    });

    // 기존 데이터 로드
    if (activity.type === 'experiment') {
      await loadExperimentData(activity.id);
    } else {
      await loadChecklistData(activity.id);
    }
    
    setShowForm(true);
  };

  const loadExperimentData = async (activityId: string) => {
    const { data: moduleData } = await supabase
      .from('activity_modules')
      .select('*')
      .eq('activity_id', activityId)
      .order('module_number');

    if (moduleData) {
      const loadedModules: Module[] = [];
      
      for (const module of moduleData) {
        const { data: steps } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('module_id', module.id)
          .order('step_number');

        loadedModules.push({
          id: module.id,
          module_number: module.module_number,
          title: module.title,
          steps: steps || []
        });
      }
      
      setModules(loadedModules);
    }
  };

  const loadChecklistData = async (activityId: string) => {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('activity_id', activityId)
      .is('module_id', null)
      .order('step_number');

    if (items) {
      setChecklist(items);
    }
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
      final_question: '',
      modules_count: 1,
      file_url: ''
    });
    setModules([{ module_number: 1, title: '', steps: [{ step_number: 1, description: '' }] }]);
    setChecklist([{ step_number: 1, description: '' }]);
    setEditingActivity(null);
    setShowForm(false);
  };

  const addModule = () => {
    const newModuleNumber = modules.length + 1;
    setModules([...modules, {
      module_number: newModuleNumber,
      title: '',
      steps: [{ step_number: 1, description: '' }]
    }]);
    setFormData({...formData, modules_count: newModuleNumber});
  };

  const removeModule = (moduleIndex: number) => {
    if (modules.length > 1) {
      const newModules = modules.filter((_, index) => index !== moduleIndex);
      setModules(newModules.map((module, index) => ({
        ...module,
        module_number: index + 1
      })));
      setFormData({...formData, modules_count: newModules.length});
    }
  };

  const addStep = (moduleIndex: number) => {
    const newModules = [...modules];
    const newStepNumber = newModules[moduleIndex].steps.length + 1;
    newModules[moduleIndex].steps.push({
      step_number: newStepNumber,
      description: ''
    });
    setModules(newModules);
  };

  const removeStep = (moduleIndex: number, stepIndex: number) => {
    const newModules = [...modules];
    if (newModules[moduleIndex].steps.length > 1) {
      newModules[moduleIndex].steps = newModules[moduleIndex].steps
        .filter((_, index) => index !== stepIndex)
        .map((step, index) => ({ ...step, step_number: index + 1 }));
      setModules(newModules);
    }
  };

  const addChecklistItem = () => {
    setChecklist([...checklist, {
      step_number: checklist.length + 1,
      description: ''
    }]);
  };

  const removeChecklistItem = (index: number) => {
    if (checklist.length > 1) {
      setChecklist(checklist
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, step_number: i + 1 })));
    }
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

  // CSV 템플릿 데이터
  const csvTemplateData = [
    {
      '제목': '물의 상태 변화 실험',
      '유형': 'experiment',
      '파일URL': 'https://example.com/file.pdf',
      '체크리스트': '실험 준비하기;온도 측정하기;결과 기록하기'
    }
  ];

  const csvExpectedHeaders = ['제목', '유형', '파일URL', '체크리스트'];

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">학습활동 관리</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowCSVUpload(true)}
            variant="outline"
            className="border-[rgb(15,15,112)] text-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)] hover:text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            CSV 일괄 등록
          </Button>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 활동 생성
          </Button>
        </div>
      </div>

      {/* CSV 업로드 모달 */}
      {showCSVUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              활동 CSV 일괄 등록
              <Button variant="ghost" size="sm" onClick={() => setShowCSVUpload(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CSVUploader
              onDataParsed={handleCSVDataParsed}
              expectedHeaders={csvExpectedHeaders}
              templateData={csvTemplateData}
              title="활동"
            />
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">CSV 파일 형식 안내:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>제목</strong>: 활동 제목</li>
                <li>• <strong>유형</strong>: experiment, argumentation, discussion 중 하나</li>
                <li>• <strong>파일URL</strong>: 관련 파일 URL (선택사항)</li>
                <li>• <strong>체크리스트</strong>: 세미콜론(;)으로 구분된 체크리스트 항목들</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

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
            <CardTitle className="flex justify-between items-center">
              {editingActivity ? '활동 수정' : '새 활동 생성'}
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* 파일 업로드 */}
              <div>
                <Label htmlFor="file_url">관련 파일 첨부 (RAG용 PDF)</Label>
                <Input
                  id="file_url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                  placeholder="PDF 파일 URL 입력"
                />
              </div>

              {/* 논증 활동용 최종 질문 */}
              {formData.type === 'argumentation' && (
                <div>
                  <Label htmlFor="final_question">최종 질문</Label>
                  <Textarea
                    id="final_question"
                    value={formData.final_question}
                    onChange={(e) => setFormData({...formData, final_question: e.target.value})}
                    placeholder="논증 활동의 최종 질문을 입력하세요"
                    required
                  />
                </div>
              )}

              {/* 실험 활동용 모듈 관리 */}
              {formData.type === 'experiment' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>실험 모듈 ({modules.length}개)</Label>
                    <Button type="button" onClick={addModule} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      모듈 추가
                    </Button>
                  </div>
                  
                  {modules.map((module, moduleIndex) => (
                    <Card key={moduleIndex} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label>모듈 {module.module_number}</Label>
                          {modules.length > 1 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeModule(moduleIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <Input
                          value={module.title}
                          onChange={(e) => {
                            const newModules = [...modules];
                            newModules[moduleIndex].title = e.target.value;
                            setModules(newModules);
                          }}
                          placeholder="모듈 제목"
                          required
                        />
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-sm">실험 단계</Label>
                            <Button 
                              type="button" 
                              onClick={() => addStep(moduleIndex)} 
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              단계 추가
                            </Button>
                          </div>
                          
                          {module.steps.map((step, stepIndex) => (
                            <div key={stepIndex} className="flex gap-2">
                              <Input
                                value={step.description}
                                onChange={(e) => {
                                  const newModules = [...modules];
                                  newModules[moduleIndex].steps[stepIndex].description = e.target.value;
                                  setModules(newModules);
                                }}
                                placeholder={`단계 ${step.step_number} 설명`}
                                required
                              />
                              {module.steps.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeStep(moduleIndex, stepIndex)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* 논증/토의 활동용 체크리스트 */}
              {(formData.type === 'argumentation' || formData.type === 'discussion') && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>체크리스트 항목</Label>
                    <Button type="button" onClick={addChecklistItem} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      항목 추가
                    </Button>
                  </div>
                  
                  {checklist.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const newChecklist = [...checklist];
                          newChecklist[index].description = e.target.value;
                          setChecklist(newChecklist);
                        }}
                        placeholder={`체크리스트 ${item.step_number}`}
                        required
                      />
                      {checklist.length > 1 && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeChecklistItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
                <TableHead>모듈/질문</TableHead>
                <TableHead>파일</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.title}</TableCell>
                  <TableCell>{getTypeLabel(activity.type)}</TableCell>
                  <TableCell>
                    {activity.type === 'experiment' ? 
                      `${activity.modules_count || 1}개 모듈` : 
                      activity.final_question ? '최종질문 설정됨' : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {activity.file_url ? (
                      <FileText className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-gray-400">없음</span>
                    )}
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
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
