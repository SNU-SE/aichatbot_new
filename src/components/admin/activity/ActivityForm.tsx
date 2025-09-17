
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2, FileWarning, FileText, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ModuleManager from './ModuleManager';
import ChecklistManager from './ChecklistManager';
import { Activity, Module, ChecklistItem, ActivityFormData } from '@/types/activity';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { activityDocumentService, ActivityDocumentRecord } from '@/services/activityDocumentService';
import { documentProcessingService } from '@/services/documentProcessingService';
import { permissionService } from '@/services/permissionService';

interface ActivityFormProps {
  editingActivity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
  saveExperimentData: (activityId: string, modules: Module[]) => Promise<void>;
  saveChecklistData: (activityId: string, checklist: ChecklistItem[]) => Promise<void>;
}

interface PendingUpload {
  id: string;
  file: File;
}

const ActivityForm = ({ 
  editingActivity, 
  onClose, 
  onSuccess, 
  saveExperimentData, 
  saveChecklistData 
}: ActivityFormProps) => {
  const { toast } = useToast();

  const initialAllowAll = editingActivity?.allowAllClasses ?? true;

  const [formData, setFormData] = useState<ActivityFormData>({
    title: editingActivity?.title || '',
    type: editingActivity?.type || 'experiment',
    final_question: editingActivity?.final_question || '',
    modules_count: editingActivity?.modules_count || 1,
    assignedClasses: editingActivity?.assignedClasses || [],
    allowAllClasses: initialAllowAll
  });

  const [classScope, setClassScope] = useState<'all' | 'selected'>(initialAllowAll ? 'all' : 'selected');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(editingActivity?.assignedClasses || []);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
  const [activityDocuments, setActivityDocuments] = useState<ActivityDocumentRecord[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState<boolean>(false);

  const [modules, setModules] = useState<Module[]>([
    { module_number: 1, title: '', steps: [{ step_number: 1, description: '' }] }
  ]);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { step_number: 1, description: '' }
  ]);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('class_name')
          .order('class_name');

        if (error) throw error;

        const classes = Array.from(
          new Set(
            (data || [])
              .map((item) => item.class_name)
              .filter((className): className is string => Boolean(className))
          )
        );

        setAvailableClasses(classes);
      } catch (error) {
        console.error('클래스 목록 로드 오류:', error);
        toast({
          title: "오류",
          description: "클래스 목록을 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [toast]);

  useEffect(() => {
    setFormData({
      title: editingActivity?.title || '',
      type: editingActivity?.type || 'experiment',
      final_question: editingActivity?.final_question || '',
      modules_count: editingActivity?.modules_count || 1,
      assignedClasses: editingActivity?.assignedClasses || [],
      allowAllClasses: editingActivity?.allowAllClasses ?? true
    });

    setClassScope(editingActivity?.allowAllClasses === false ? 'selected' : 'all');
    setSelectedClasses(editingActivity?.assignedClasses || []);
  }, [editingActivity]);

  // 기존 활동 데이터 로드
  useEffect(() => {
    if (editingActivity) {
      loadActivityData(editingActivity.id);
    }
  }, [editingActivity]);

  useEffect(() => {
    if (editingActivity?.id) {
      loadActivityDocuments(editingActivity.id);
    } else {
      setActivityDocuments([]);
      setPendingUploads([]);
    }
  }, [editingActivity, loadActivityDocuments]);

  const handleClassScopeChange = (value: 'all' | 'selected') => {
    setClassScope(value);

    if (value === 'all') {
      setSelectedClasses([]);
      setFormData((prev) => ({ ...prev, allowAllClasses: true, assignedClasses: [] }));
    } else {
      setFormData((prev) => ({ ...prev, allowAllClasses: false, assignedClasses: selectedClasses }));
    }
  };

  const handleClassSelectionChange = (className: string, checked: boolean) => {
    setSelectedClasses((prev) => {
      const updated = checked
        ? Array.from(new Set([...prev, className]))
        : prev.filter((name) => name !== className);

      setFormData((current) => ({ ...current, assignedClasses: updated }));

      return updated;
    });
  };

  const loadActivityData = async (activityId: string) => {
    try {
      // 모듈 데이터 로드 (실험 활동인 경우)
      if (editingActivity?.type === 'experiment') {
        const { data: moduleData, error: moduleError } = await supabase
          .from('activity_modules')
          .select('*')
          .eq('activity_id', activityId)
          .order('module_number');

        if (moduleError) throw moduleError;

        if (moduleData && moduleData.length > 0) {
          const loadedModules: Module[] = [];
          
          for (const module of moduleData) {
            const { data: stepData, error: stepError } = await supabase
              .from('checklist_items')
              .select('*')
              .eq('module_id', module.id)
              .order('step_number');

            if (stepError) throw stepError;

            loadedModules.push({
              id: module.id,
              module_number: module.module_number,
              title: module.title,
              steps: stepData || [{ step_number: 1, description: '' }]
            });
          }
          
          setModules(loadedModules);
        }
      } else {
        // 체크리스트 데이터 로드 (논증, 토의 활동인 경우)
        const { data: checklistData, error: checklistError } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('activity_id', activityId)
          .is('module_id', null)
          .order('step_number');

        if (checklistError) throw checklistError;

        if (checklistData && checklistData.length > 0) {
          setChecklist(checklistData);
        }
      }
    } catch (error) {
      console.error('활동 데이터 로드 오류:', error);
      toast({
        title: "오류",
        description: "활동 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const loadActivityDocuments = useCallback(async (activityId: string) => {
    setLoadingDocuments(true);
    try {
      const documents = await activityDocumentService.listActivityDocuments(activityId);
      setActivityDocuments(documents);
    } catch (error) {
      console.error('활동 문서 로드 오류:', error);
      toast({
        title: '오류',
        description: '활동 문서를 불러오는데 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoadingDocuments(false);
    }
  }, [toast]);

  const handlePendingFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: PendingUpload[] = [];
    Array.from(files).forEach((file) => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast({
          title: '경고',
          description: `${file.name}은(는) PDF 파일이 아닙니다.`,
        });
        return;
      }
      validFiles.push({ id: crypto.randomUUID(), file });
    });

    if (validFiles.length === 0) return;

    setPendingUploads((prev) => [...prev, ...validFiles]);
  };

  const handleRemovePendingUpload = (uploadId: string) => {
    setPendingUploads((prev) => prev.filter(upload => upload.id !== uploadId));
  };

  const processPendingUploads = async (activityId: string) => {
    if (pendingUploads.length === 0) return;

    setUploadingDocuments(true);
    const classFilter = classScope === 'all' ? [] : selectedClasses;

    for (const upload of pendingUploads) {
      try {
        await activityDocumentService.uploadAndProcess(upload.file, activityId, {
          assignedClasses: classFilter,
        });

        toast({
          title: '업로드 완료',
          description: `${upload.file.name} 업로드가 시작되었습니다.`
        });
      } catch (error: any) {
        toast({
          title: '오류',
          description: error?.message || `${upload.file.name} 업로드에 실패했습니다.`,
          variant: 'destructive'
        });
      }
    }

    setPendingUploads([]);
    await loadActivityDocuments(activityId);
    setUploadingDocuments(false);
  };

  const handleRetryDocument = async (documentId: string) => {
    if (!editingActivity?.id) return;
    try {
      await documentProcessingService.retryProcessing(documentId, undefined, editingActivity.id);
      toast({
        title: '재처리 시작',
        description: '문서 재처리를 시작했습니다.'
      });
      await loadActivityDocuments(editingActivity.id);
    } catch (error: any) {
      toast({
        title: '오류',
        description: error?.message || '문서 재처리에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!editingActivity?.id) return;
    try {
      await activityDocumentService.removeActivityDocument(editingActivity.id, documentId);
      toast({
        title: '삭제 완료',
        description: '문서를 삭제했습니다.'
      });
      await loadActivityDocuments(editingActivity.id);
    } catch (error: any) {
      toast({
        title: '오류',
        description: error?.message || '문서를 삭제하지 못했습니다.',
        variant: 'destructive'
      });
    }
  };

  const renderProcessingStatus = (activityStatus?: string, documentStatus?: string) => {
    const status = activityStatus || documentStatus || 'unknown';
    switch (status) {
      case 'completed':
        return '처리 완료';
      case 'extracting':
        return '추출 중';
      case 'chunking':
        return '청크 생성 중';
      case 'embedding':
        return '임베딩 생성 중';
      case 'uploading':
        return '업로드 중';
      case 'failed':
        return '실패';
      default:
        return '대기 중';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (classScope === 'selected' && selectedClasses.length === 0) {
      toast({
        title: "클래스를 선택해주세요",
        description: "특정 클래스를 선택한 경우 최소 1개 이상의 클래스를 지정해야 합니다.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let activityData = {
        title: formData.title,
        type: formData.type,
        content: {},
        final_question: formData.type === 'argumentation' ? formData.final_question : null,
        modules_count: formData.type === 'experiment' ? modules.length : null
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
        await saveExperimentData(activityId, modules);
      } else if (formData.type === 'argumentation' || formData.type === 'discussion') {
        await saveChecklistData(activityId, checklist);
      }

      const { error: clearAssignmentsError } = await supabase
        .from('activity_class_assignments')
        .delete()
        .eq('activity_id', activityId);

      if (clearAssignmentsError) throw clearAssignmentsError;

      if (classScope === 'selected') {
        const assignments = selectedClasses.map((className) => ({
          activity_id: activityId,
          class_name: className
        }));

        if (assignments.length > 0) {
          const { error: insertAssignmentsError } = await supabase
            .from('activity_class_assignments')
            .insert(assignments);

          if (insertAssignmentsError) throw insertAssignmentsError;
        }
      }

      if (pendingUploads.length > 0) {
        if (editingActivity?.id || !editingActivity) {
          await processPendingUploads(activityId);
        }
      }

      try {
        await permissionService.syncActivityDocumentPermissions(activityId);
      } catch (syncError: any) {
        console.error('권한 동기화 실패:', syncError);
      }

      if (editingActivity?.id) {
        await loadActivityDocuments(activityId);
      }

      toast({
        title: "성공",
        description: editingActivity ? "활동이 수정되었습니다." : "새 활동이 생성되었습니다."
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "작업을 완료할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {editingActivity ? '활동 수정' : '새 활동 생성'}
          <Button variant="ghost" size="sm" onClick={onClose}>
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

          <div className="space-y-3">
            <div>
              <Label>대상 클래스</Label>
              <p className="text-xs text-gray-500 mt-1">
                기본값은 모든 클래스이며, 특정 클래스를 선택하면 그 클래스 학생만 활동을 볼 수 있습니다.
              </p>
            </div>

            <RadioGroup
              value={classScope}
              onValueChange={(value) => handleClassScopeChange(value as 'all' | 'selected')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="class-scope-all" />
                <Label htmlFor="class-scope-all" className="cursor-pointer">전체 클래스</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="class-scope-selected" />
                <Label htmlFor="class-scope-selected" className="cursor-pointer">특정 클래스 선택</Label>
              </div>
            </RadioGroup>

            {classScope === 'selected' && (
              <div className="space-y-2">
                <div className="rounded-md border border-gray-200">
                  {loadingClasses ? (
                    <div className="p-3 text-sm text-gray-500">클래스를 불러오는 중...</div>
                  ) : availableClasses.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">등록된 클래스가 없습니다. 학생 관리에서 클래스를 먼저 등록해주세요.</div>
                  ) : (
                    <ScrollArea className="max-h-48">
                      <div className="p-3 space-y-2">
                        {availableClasses.map((className) => {
                          const isSelected = selectedClasses.includes(className);
                          return (
                            <label key={className} className="flex items-center space-x-3 text-sm">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleClassSelectionChange(className, checked === true)}
                                className="h-4 w-4"
                              />
                              <span>{className}</span>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>선택된 클래스: {selectedClasses.length}개</span>
                  {selectedClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClasses([]);
                        setFormData((prev) => ({ ...prev, assignedClasses: [] }));
                      }}
                      className="text-[rgb(15,15,112)] hover:underline"
                    >
                      선택 해제
                    </button>
                  )}
                </div>
              </div>
          )}
        </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>활동 자료 (PDF)</Label>
                <p className="text-xs text-gray-500 mt-1">
                  업로드한 파일은 AI 답변에 우선적으로 활용됩니다. 새 파일은 활동 저장 후 자동으로 처리됩니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (editingActivity?.id) {
                    processPendingUploads(editingActivity.id);
                  } else {
                    toast({
                      title: '알림',
                      description: '활동을 먼저 저장하면 파일 업로드가 시작됩니다.'
                    });
                  }
                }}
                disabled={!editingActivity?.id || pendingUploads.length === 0 || uploadingDocuments}
              >
                {uploadingDocuments ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                파일 업로드
              </Button>
            </div>

            <Input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(event) => {
                const target = event.target as HTMLInputElement;
                handlePendingFileSelection(target.files);
                target.value = '';
              }}
            />

            {pendingUploads.length > 0 && (
              <div className="border rounded-md p-3 space-y-2 bg-gray-50">
                <p className="text-sm font-medium">대기 중인 업로드 ({pendingUploads.length})</p>
                <ul className="space-y-1 text-sm">
                  {pendingUploads.map((upload) => (
                    <li key={upload.id} className="flex items-center justify-between">
                      <span className="truncate">{upload.file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePendingUpload(upload.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border rounded-md">
              <div className="flex items-center justify-between p-3 border-b">
                <p className="text-sm font-medium">첨부된 자료</p>
                {loadingDocuments && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {activityDocuments.length === 0 ? (
                  <p className="text-sm text-gray-500 p-3">등록된 자료가 없습니다.</p>
                ) : (
                  <ul className="divide-y">
                    {activityDocuments.map((doc) => (
                      <li key={doc.documentId} className="p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-[rgb(15,15,112)]" />
                            <span className="truncate font-medium">{doc.title || doc.filename}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              {renderProcessingStatus(doc.processingStatus, doc.documentProcessingStatus)}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRetryDocument(doc.documentId)}
                              disabled={doc.processingStatus !== 'failed'}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDocument(doc.documentId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {doc.processingError && (
                          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            <FileWarning className="h-4 w-4 mt-0.5" />
                            <span>{doc.processingError}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

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

          {formData.type === 'experiment' && (
            <ModuleManager modules={modules} setModules={setModules} />
          )}

          {(formData.type === 'argumentation' || formData.type === 'discussion') && (
            <ChecklistManager checklist={checklist} setChecklist={setChecklist} />
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
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
  );
};

export default ActivityForm;
