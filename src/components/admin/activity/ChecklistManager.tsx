
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { ChecklistItem } from '@/types/activity';

interface ChecklistManagerProps {
  checklist: ChecklistItem[];
  setChecklist: (checklist: ChecklistItem[]) => void;
}

const ChecklistManager = ({ checklist, setChecklist }: ChecklistManagerProps) => {
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

  const updateChecklistItem = (index: number, description: string) => {
    const newChecklist = [...checklist];
    newChecklist[index].description = description;
    setChecklist(newChecklist);
  };

  return (
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
            onChange={(e) => updateChecklistItem(index, e.target.value)}
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
  );
};

export default ChecklistManager;
