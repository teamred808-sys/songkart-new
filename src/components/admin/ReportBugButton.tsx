import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BugReportForm } from './BugReportForm';

export function ReportBugButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg border-destructive/30 bg-background hover:bg-destructive/10 hover:border-destructive/50 z-50"
            onClick={() => setIsOpen(true)}
          >
            <Bug className="h-5 w-5 text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Report a Bug</p>
        </TooltipContent>
      </Tooltip>

      <BugReportForm open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
