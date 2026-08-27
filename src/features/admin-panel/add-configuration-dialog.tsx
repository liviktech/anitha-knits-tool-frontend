import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/shared/loader';
import type { ColorConsumptionStandardPayload } from './production-config-queries';

interface AddConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ColorConsumptionStandardPayload) => Promise<boolean>;
  /** Present when editing an existing configuration instead of adding a new one. */
  initial?: ColorConsumptionStandardPayload | null;
  isPending?: boolean;
  /** Server-side error surfaced by the calling mutation (e.g. a validation or conflict response). */
  serverError?: string | null;
}

const emptyForm = {
  date: '',
  hdpematerialbag: '',
  basisWeightKg: '',
  whiteKgBasis: '',
  blueKgBasis: '',
  greenKgBasis: '',
  chemicalWeight: '',
};

function toFormStrings(payload: ColorConsumptionStandardPayload) {
  return {
    date: payload.date ?? '',
    hdpematerialbag: String(payload.hdpematerialbag ?? 1),
    basisWeightKg: String(payload.basisWeightKg ?? 25),
    whiteKgBasis: String(payload.whiteKgBasis),
    blueKgBasis: String(payload.blueKgBasis),
    greenKgBasis: String(payload.greenKgBasis),
    chemicalWeight: String(payload.chemicalWeight ?? ''),
  };
}

export function AddConfigurationDialog({ open, onOpenChange, onSubmit, initial, isPending = false, serverError }: AddConfigurationDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = !!initial;

  useEffect(() => {
    if (open) {
      setForm(initial ? toFormStrings(initial) : emptyForm);
      setFormError(null);
    }
  }, [open, initial]);

  const setField = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    const numericFields = ['hdpematerialbag', 'basisWeightKg', 'whiteKgBasis', 'blueKgBasis', 'greenKgBasis', 'chemicalWeight'] as const;
    if (!form.date || numericFields.some((key) => form[key].trim() === '' || Number.isNaN(Number(form[key])))) {
      setFormError('Please fill in every field with a valid value.');
      return;
    }
    setFormError(null);

    const ok = await onSubmit({
      date: form.date,
      hdpematerialbag: Number(form.hdpematerialbag),
      basisWeightKg: Number(form.basisWeightKg),
      whiteKgBasis: Number(form.whiteKgBasis),
      blueKgBasis: Number(form.blueKgBasis),
      greenKgBasis: Number(form.greenKgBasis),
      chemicalWeight: Number(form.chemicalWeight),
    });
    if (ok) onOpenChange(false);
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Configuration' : 'Add Configuration'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {/* Date */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="config-date" className="text-sm font-semibold text-gray-600">Effective Date</Label>
              <Input id="config-date" type="date" value={form.date} onChange={setField('date')} className="h-8 w-40 text-xs" />
            </div>

            {/* Chemical */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="config-chemical" className="text-sm font-semibold text-gray-600">Chemical (kg)</Label>
              <Input id="config-chemical" type="number" step="0.01" placeholder="Enter chemical weight" value={form.chemicalWeight} onChange={setField('chemicalWeight')} className="h-8 w-40 text-xs" />
            </div>
          </div>

          {/* Bags + HDPE */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="config-bags" className="text-sm font-semibold text-gray-600">Bags</Label>
              <Input id="config-bags" type="number" placeholder="Enter bag count" value={form.hdpematerialbag} onChange={setField('hdpematerialbag')} className="h-8 text-xs" />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="config-hdpe" className="text-sm font-semibold text-gray-600">HDPE Base (kg)</Label>
              <Input id="config-hdpe" type="number" step="0.01" placeholder="Enter HDPE weight" value={form.basisWeightKg} onChange={setField('basisWeightKg')} className="h-8 text-xs" />
            </div>
          </div>



          {/* Colors */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-x-3 gap-y-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="config-white" className="text-sm font-semibold text-gray-600">White (kg)</Label>
                <Input id="config-white" type="number" step="0.01" placeholder="Enter white weight" value={form.whiteKgBasis} onChange={setField('whiteKgBasis')} className="h-8 text-xs" />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="config-blue" className="text-sm font-semibold text-gray-600">Blue (kg)</Label>
                <Input id="config-blue" type="number" step="0.01" placeholder="Enter blue weight" value={form.blueKgBasis} onChange={setField('blueKgBasis')} className="h-8 text-xs" />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="config-green" className="text-sm font-semibold text-gray-600">Green (kg)</Label>
                <Input id="config-green" type="number" step="0.01" placeholder="Enter green weight" value={form.greenKgBasis} onChange={setField('greenKgBasis')} className="h-8 text-xs" />
              </div>
            </div>
          </div>

        </div>

        {displayError && <p className="text-xs text-red-600">{displayError}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button size="sm" className="bg-[#004D40] hover:bg-[#003D33]" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader size="sm" className="mr-2" />}
            {isEdit ? 'Save Changes' : 'Add Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
