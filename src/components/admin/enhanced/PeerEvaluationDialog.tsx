
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import PeerEvaluationManager from '../PeerEvaluationManager';

interface PeerEvaluationDialogProps {
  activityId: string;
  activityTitle: string;
  children: React.ReactNode;
}

const PeerEvaluationDialog = ({ activityId, activityTitle, children }: PeerEvaluationDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>동료평가 관리</span>
          </DialogTitle>
        </DialogHeader>
        <PeerEvaluationManager activityId={activityId} activityTitle={activityTitle} />
      </DialogContent>
    </Dialog>
  );
};

export default PeerEvaluationDialog;
