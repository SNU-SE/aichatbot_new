
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface ClassSelectorProps {
  classes: string[];
  selectedClass: string;
  onClassChange: (className: string) => void;
  activeTemplate: any;
  currentSetting: any;
}

const ClassSelector = ({ 
  classes, 
  selectedClass, 
  onClassChange, 
  activeTemplate, 
  currentSetting 
}: ClassSelectorProps) => {
  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold text-gray-600 mb-2">등록된 클래스가 없습니다</h2>
        <p className="text-gray-500">먼저 학생 관리에서 학생을 등록해 주세요.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>클래스 선택</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <Label htmlFor="class-select">관리할 클래스:</Label>
            <Select value={selectedClass} onValueChange={onClassChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="클래스를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(className => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedClass && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">현재 {selectedClass} 클래스 설정:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">AI 제공업체:</span>
                  <Badge variant="outline" className="ml-2">
                    {currentSetting?.selected_provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">모델:</span>
                  <Badge variant="outline" className="ml-2">
                    {currentSetting?.selected_model || '기본값'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">RAG 활성화:</span>
                  <Badge variant={currentSetting?.rag_enabled ? "default" : "secondary"} className="ml-2">
                    {currentSetting?.rag_enabled ? '활성화' : '비활성화'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">활성 템플릿:</span>
                  <Badge variant="outline" className="ml-2">
                    {activeTemplate ? activeTemplate.name : '없음'}
                  </Badge>
                </div>
              </div>
              {currentSetting?.system_prompt && (
                <div className="mt-2">
                  <span className="text-gray-600 text-xs">클래스 전용 프롬프트:</span>
                  <p className="text-xs text-gray-500 bg-white p-2 rounded mt-1 border">
                    {currentSetting.system_prompt.substring(0, 100)}
                    {currentSetting.system_prompt.length > 100 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassSelector;
