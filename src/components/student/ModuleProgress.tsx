
import { Star } from 'lucide-react';

interface ModuleProgressProps {
  totalModules: number;
  currentModule?: number;
  completedModules?: number;
}

const ModuleProgress = ({ totalModules, currentModule = 1, completedModules = 0 }: ModuleProgressProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">
          모듈 {currentModule} / {totalModules}
        </span>
      </div>
      <div className="flex items-center space-x-1">
        {[...Array(totalModules)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-5 w-5 ${i < completedModules ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    </div>
  );
};

export default ModuleProgress;
