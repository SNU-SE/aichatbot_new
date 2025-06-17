
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
          <div className="text-sm text-gray-500">
            <div>
              <div>{activeTemplate ? `현재 활성: ${activeTemplate.name}` : '활성화된 템플릿 없음'}</div>
              {currentSetting && (
                <div className="text-xs">
                  모델: {currentSetting.selected_provider === 'openai' ? 'OpenAI' : 'Anthropic'} - {currentSetting.selected_model}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassSelector;
