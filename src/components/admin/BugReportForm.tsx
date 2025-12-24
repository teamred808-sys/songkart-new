import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateBugReport } from '@/hooks/useBugReports';
import { ADMIN_SECTIONS, BUG_SEVERITIES } from '@/lib/adminConstants';
import type { AdminSection, BugSeverity } from '@/lib/adminConstants';

const bugReportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  affected_section: z.string().min(1, 'Please select a section'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

type BugReportFormData = z.infer<typeof bugReportSchema>;

interface BugReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection?: AdminSection;
}

export function BugReportForm({ open, onOpenChange, defaultSection }: BugReportFormProps) {
  const [isCapturingLogs, setIsCapturingLogs] = useState(false);
  const createBugReport = useCreateBugReport();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      title: '',
      description: '',
      affected_section: defaultSection || '',
      severity: 'medium',
    },
  });

  const selectedSection = watch('affected_section');
  const selectedSeverity = watch('severity');

  const onSubmit = async (data: BugReportFormData) => {
    // Capture console logs if enabled
    const logs: Record<string, unknown>[] = [];
    if (isCapturingLogs) {
      logs.push({
        captured_at: new Date().toISOString(),
        url: window.location.href,
        note: 'Console logs captured at time of report',
      });
    }

    await createBugReport.mutateAsync({
      title: data.title,
      description: data.description,
      affected_section: data.affected_section as AdminSection,
      severity: data.severity as BugSeverity,
      logs,
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Describe the issue you encountered. Your report helps improve the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of the issue"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of what happened, steps to reproduce, expected vs actual behavior..."
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Affected Section</Label>
              <Select
                value={selectedSection}
                onValueChange={(value) => setValue('affected_section', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_SECTIONS.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.affected_section && (
                <p className="text-sm text-destructive">{errors.affected_section.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={selectedSeverity}
                onValueChange={(value) => setValue('severity', value as BugSeverity)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {BUG_SEVERITIES.map((severity) => (
                    <SelectItem key={severity.value} value={severity.value}>
                      {severity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="captureLogs"
              checked={isCapturingLogs}
              onChange={(e) => setIsCapturingLogs(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="captureLogs" className="text-sm font-normal cursor-pointer">
              Capture current page context with report
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBugReport.isPending}>
              {createBugReport.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
