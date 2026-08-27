import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/shared/loader';

interface AddMaterialItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: string;
  onSubmit: (name: string) => Promise<boolean>;
  /** Present when editing an existing item instead of adding a new one. */
  initialName?: string | null;
  isPending?: boolean;
  /** Server-side error surfaced by the calling mutation (e.g. a name-conflict response). */
  serverError?: string | null;
}

export function AddMaterialItemDialog({
  open,
  onOpenChange,
  categoryLabel,
  onSubmit,
  initialName,
  isPending = false,
  serverError,
}: AddMaterialItemDialogProps) {
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = initialName != null;

  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
      setFormError(null);
    }
  }, [open, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Please enter a name.');
      return;
    }
    setFormError(null);
    const ok = await onSubmit(name.trim());
    if (ok) onOpenChange(false);
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${categoryLabel}` : `Add ${categoryLabel}`}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <Label htmlFor="material-item-name" className="text-xs font-semibold text-gray-600">Name</Label>
          <Input
            id="material-item-name"
            placeholder={`e.g. ${categoryLabel} name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {displayError && <p className="text-xs text-red-600">{displayError}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button size="sm" className="bg-[#004D40] hover:bg-[#003D33]" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader size="sm" className="mr-2" />}
            {isEdit ? 'Save Changes' : `Add ${categoryLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
