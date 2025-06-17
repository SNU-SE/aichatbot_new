
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, FileText } from 'lucide-react';
import { Activity } from '@/types/activity';
import { supabase } from '@/integrations/supabase/client';

interface ActivityListProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
}

interface ActivityWithModuleCount extends Activity {
  actualModuleCount?: number;
}

const ActivityList = ({ activities, onEdit, onDelete }: ActivityListProps) => {
  const [activitiesWithCounts, setActivitiesWithCounts] = useState<ActivityWithModuleCount[]>([]);

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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'experiment': return '실험';
      case 'argumentation': return '논증';
      case 'discussion': return '토의';
      default: return type;
    }
  };

  return (
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
              <TableHead>모듈/질문</TableHead>
              <TableHead>파일</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activitiesWithCounts.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="font-medium">{activity.title}</TableCell>
                <TableCell>{getTypeLabel(activity.type)}</TableCell>
                <TableCell>
                  {activity.type === 'experiment' ? 
                    `${activity.actualModuleCount || 1}개 모듈` : 
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
                      onClick={() => onEdit(activity)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(activity.id)}
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
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  생성된 활동이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ActivityList;
