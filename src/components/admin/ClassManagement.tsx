
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChecklistReset from './enhanced/ChecklistReset';
import PeerEvaluationManager from './enhanced/PeerEvaluationManager';

interface Student {
  student_id: string;
  class_name: string;
  name: string | null;
}

interface Activity {
  id: string;
  title: string;
  type: string;
}

const ClassManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 학생 정보 가져오기
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*');

      if (studentsError) throw studentsError;

      // 활동 정보 가져오기
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      setStudents(studentsData || []);
      setActivities(activitiesData || []);
    } catch (error) {
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUniqueClasses = () => {
    return [...new Set(students.map(s => s.class_name))];
  };

  const getSelectedActivityInfo = () => {
    return activities.find(a => a.id === selectedActivity);
  };

  const selectedActivityInfo = getSelectedActivityInfo();
  const isArgumentationActivity = selectedActivityInfo?.type === 'argumentation';

  if (loading) {
    return <div className="flex justify-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[rgb(15,15,112)]">수업 관리</h2>
        <div className="text-sm text-gray-600">
          클래스와 활동을 선택하여 체크리스트 초기화 및 동료평가를 관리하세요
        </div>
      </div>

      {/* 클래스 및 활동 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>클래스 및 활동 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">대상 클래스</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 클래스</SelectItem>
                  {getUniqueClasses().map(className => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">활동 선택</label>
              <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 활동</SelectItem>
                  {activities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.title} ({activity.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <ChecklistReset 
                selectedClass={selectedClass}
                selectedActivity={selectedActivity}
              />
            </div>
          </div>

          {selectedClass !== 'all' || selectedActivity !== 'all' ? (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                선택된 범위: {selectedClass === 'all' ? '전체 클래스' : selectedClass} - {selectedActivity === 'all' ? '전체 활동' : selectedActivityInfo?.title}
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                전체 클래스의 모든 활동이 선택되었습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 동료평가 관리 (논증 활동일 때만 표시) */}
      {isArgumentationActivity && (
        <Card>
          <CardHeader>
            <CardTitle>동료평가 관리 - {selectedActivityInfo?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <PeerEvaluationManager
              selectedClass={selectedClass}
              selectedActivity={selectedActivity}
              activityTitle={selectedActivityInfo?.title || ''}
            />
          </CardContent>
        </Card>
      )}

      {selectedActivity !== 'all' && !isArgumentationActivity && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <p>선택된 활동은 논증 활동이 아닙니다.</p>
              <p>동료평가 기능은 논증 활동에서만 사용할 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedActivity === 'all' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <p>동료평가 관리를 위해 특정 논증 활동을 선택해주세요.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassManagement;
