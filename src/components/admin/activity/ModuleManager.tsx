
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { Module } from '@/types/activity';

interface ModuleManagerProps {
  modules: Module[];
  setModules: (modules: Module[]) => void;
}

const ModuleManager = ({ modules, setModules }: ModuleManagerProps) => {
  const addModule = () => {
    const newModuleNumber = modules.length + 1;
    setModules([...modules, {
      module_number: newModuleNumber,
      title: '',
      steps: [{ step_number: 1, description: '' }]
    }]);
  };

  const removeModule = (moduleIndex: number) => {
    if (modules.length > 1) {
      const newModules = modules.filter((_, index) => index !== moduleIndex);
      setModules(newModules.map((module, index) => ({
        ...module,
        module_number: index + 1
      })));
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

  const updateModuleTitle = (moduleIndex: number, title: string) => {
    const newModules = [...modules];
    newModules[moduleIndex].title = title;
    setModules(newModules);
  };

  const updateStepDescription = (moduleIndex: number, stepIndex: number, description: string) => {
    const newModules = [...modules];
    newModules[moduleIndex].steps[stepIndex].description = description;
    setModules(newModules);
  };

  return (
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
              onChange={(e) => updateModuleTitle(moduleIndex, e.target.value)}
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
                    onChange={(e) => updateStepDescription(moduleIndex, stepIndex, e.target.value)}
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
  );
};

export default ModuleManager;
