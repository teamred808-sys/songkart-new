import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AcknowledgmentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function AcknowledgmentCheckbox({ checked, onCheckedChange }: AcknowledgmentCheckboxProps) {
  return (
    <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/50 max-w-full overflow-hidden">
      <Checkbox 
        id="acknowledgment" 
        checked={checked} 
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        className="mt-1 flex-shrink-0"
      />
      <Label htmlFor="acknowledgment" className="text-sm leading-relaxed cursor-pointer break-words max-w-full">
        I understand that this purchase is for <strong>digital licensed content</strong> and is{' '}
        <strong>non-refundable</strong> after fulfillment. I agree to the license terms associated 
        with each song and acknowledge that my usage rights are subject to the specific license 
        type purchased.
      </Label>
    </div>
  );
}
