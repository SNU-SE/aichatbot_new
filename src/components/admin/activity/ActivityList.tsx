
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, FileText, EyeOff, Eye } from 'lucide-react';
import { Activity } from '@/types/activity';
import { supabase } from '@/integrations/supabase/client';
import ActivityDeleteDialog from './ActivityDeleteDialog';
import { Badge } from '@/components/ui/badge';

interface ActivityListProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDeleteSuccess: () => void;
}

interface ActivityWithModuleCount extends Activity {
  actualModuleCount?: number;
}

const ActivityList = ({ activities, onEdit, onDeleteSuccess }: ActivityListProps) => {
  const [activitiesWithCounts, setActivitiesWithCounts] = useState<ActivityWithModuleCount[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    activityId: string;
    activityTitle: string;
  }>({
    open: false,
    activityId: '',
    activityTitle: ''
  });

  useEffect(() => {
    const loadModuleCounts = async () => {
      const updatedActivities = await Promise.all(
        activities.map(async (activity) => {
          if (activity.type === 'experiment') {
            const { data, error } = await supabase
              .from('activity_modules')
              .select('id')
              .eq('activity_id', activity.id);
            
            if (!error && data) {
              return { ...activity, actualModuleCount: data.length };
            }
          }
          return { ...activity, actualModuleCount: activity.modules_count };
        })
      );
      setActivitiesWithCounts(updatedActivities);
    };

    loadModuleCounts();
  }, [activities]);

  const handleDeleteClick = (activity: Activity) => {
    setDeleteDialog({
      open: true,
      activityId: activity.id,
      activityTitle: activity.title
    });
  };

  const handleDeleteSuccess = () => {
    onDeleteSuccess();
    setDeleteDialog({
      open: false,
      activityId: '',
      activityTitle: ''
    });
  };

  const handleToggleVisibility = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_hidden: !activity.is_hidden })
        .eq('id', activity.id);
      
      if (error) throw error;
      onDeleteSuccess(); // 목록 새로고침
    } catch (error) {
      console.error('활동 표시/숨김 변경 실패:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'experiment': return '실험';
      case 'argumentation': return '논증';
      case 'discussion': return '토의';
      default: return type;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>활동 목록 ({activities.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>대상 클래스</TableHead>
                <TableHead>모듈/질문</TableHead>
                <TableHead>자료</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activitiesWithCounts.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{getTypeLabel(activity.type)}</span>
                      {activity.type === 'argumentation' && (
                        <Badge
                          variant={activity.enable_peer_evaluation ? 'secondary' : 'outline'}
                          className="w-fit text-xs"
                        >
                          {activity.enable_peer_evaluation ? '동료평가 ON' : '동료평가 OFF'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {activity.allowAllClasses !== false || !activity.assignedClasses?.length ? (
                      <Badge variant="secondary">전체</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {activity.assignedClasses.map((className) => (
                          <Badge key={className} variant="outline">
                            {className}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {activity.type === 'experiment' ? 
                      `${activity.actualModuleCount || 1}개 모듈` : 
                      activity.final_question ? '최종질문 설정됨' : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {activity.documentCount && activity.documentCount > 0 ? (
                      <div className="flex items-center gap-1 text-sm">
                        <FileText className="h-4 w-4 text-[rgb(15,15,112)]" />
                        <span>{activity.documentCount}건</span>
                      </div>
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
                        onClick={() => onEdit(activity)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleVisibility(activity)}
                        className={activity.is_hidden ? "text-gray-500" : "text-blue-600"}
                      >
                        {activity.is_hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(activity)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {activities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    생성된 활동이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ActivityDeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        activityId={deleteDialog.activityId}
        activityTitle={deleteDialog.activityTitle}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  );
};

export default ActivityList;
