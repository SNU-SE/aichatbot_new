
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MessageCircle, Activity, Clock, User } from 'lucide-react';

interface StudentSession {
  id: string;
  student_id: string;
  last_active: string;
  is_online: boolean;
}

interface Student {
  student_id: string;
  class_name: string;
  name: string | null;
}

interface StudentStatusGridProps {
  onlineStudents: StudentSession[];
  students: Student[];
  selectedClass: string;
}

const StudentStatusGrid = ({ onlineStudents, students, selectedClass }: StudentStatusGridProps) => {
  const getStudentInfo = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    return student ? {
      name: student.name || '이름없음',
      class: student.class_name,
      full: `${student.name || '이름없음'} (${student.student_id})`
    } : { name: '알 수 없음', class: '-', full: studentId };
  };

  const getActivityStatus = (studentId: string) => {
    // 실제로는 현재 활동 상태를 가져오는 로직
    const activities = ['실험하기', '토의하기', '논증하기', '대기 중'];
    return activities[Math.floor(Math.random() * activities.length)];
  };

  const getLastMessage = (studentId: string) => {
    // 실제로는 마지막 메시지 시간을 가져오는 로직
    const now = new Date();
    const minutesAgo = Math.floor(Math.random() * 30);
    return new Date(now.getTime() - minutesAgo * 60000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>온라인 학생 현황 ({onlineStudents.length}명)</span>
          {selectedClass !== 'all' && (
            <Badge variant="outline">{selectedClass}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {onlineStudents.map((session) => {
            const studentInfo = getStudentInfo(session.student_id);
            const currentActivity = getActivityStatus(session.student_id);
            const lastMessage = getLastMessage(session.student_id);
            
            return (
              <Card key={session.id} className="border border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm">{studentInfo.name}</h4>
                        <p className="text-xs text-gray-600">{session.student_id}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {studentInfo.class}
                        </Badge>
                      </div>
                      <Badge variant="default" className="bg-green-600 text-xs">
                        온라인
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1 text-xs">
                        <Activity className="h-3 w-3" />
                        <span className="text-gray-600">현재 활동:</span>
                        <span className="font-medium">{currentActivity}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-xs">
                        <MessageCircle className="h-3 w-3" />
                        <span className="text-gray-600">마지막 메시지:</span>
                        <span>{lastMessage.toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-xs">
                        <Clock className="h-3 w-3" />
                        <span className="text-gray-600">접속 시간:</span>
                        <span>{new Date(session.last_active).toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                      </div>
                    </div>
                    
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      활동 모니터링
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {onlineStudents.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>현재 온라인 학생이 없습니다.</p>
              <p className="text-sm mt-1">학생들이 접속하면 여기에 표시됩니다.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentStatusGrid;
