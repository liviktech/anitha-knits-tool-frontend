import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/loader';
import { apiFetch } from '@/lib/api-client';
import { useLookups, findIdByName } from '@/lib/lookups';
import { themes } from '@/features/production/day-entry-sections';
import { todayIso, formatDate } from './inventory-utils';
import {
  loadSentKeys,
  getLoadSentWeight,
  type LoadSentRecord,
  type LoadSentCreatePayload,
} from './load-sent-queries';

interface LoadSentFormDialogProps {
  onClose: () => void;
  record: LoadSentRecord | null;
}

/** Mounted only while the dialog is open (see call site), so state can
 * initialize once from `record` at mount instead of syncing via an effect. */
export function LoadSentFormDialog({ onClose, record }: LoadSentFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const colors = lookupsData?.colors ?? [];
  const sizes = lookupsData?.sizes ?? [];
  const isEdit = !!record;
  const theme = themes.fabricDelivered;

  const [date, setDate] = useState(record ? formatDate(record.date ?? record.productionDate) : todayIso());
  const [color, setColor] = useState(record?.color?.name ?? '');
  const [size, setSize] = useState(record?.size?.name ?? '');
  const [weightKg, setWeightKg] = useState(record ? String(getLoadSentWeight(record)) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const colorId = findIdByName(colors, color);
    const sizeId = findIdByName(sizes, size);
    if (!colorId || !sizeId || !weightKg) {
      setError('Please fill in Color, Size, and Weight.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: LoadSentCreatePayload = {
        productionDate: date,
        colorId,
        sizeId,
        fabricWeight: parseFloat(weightKg) || 0,
      };
      const response = await apiFetch(isEdit ? `/load-sent/${record.id}` : '/load-sent', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save load sent record');

      await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
      onClose();
    } catch (e) {
      console.error('Error saving load sent record:', e);
      setError('Could not save this record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !saving && !next && onClose()}>
      <DialogContent className={`sm:max-w-md p-0 overflow-hidden border-2 ${theme.border} gap-2`}>
        <DialogHeader className={`p-3 pb-2 border-b border-gray-200 ${theme.headerBg}`}>
          <DialogTitle className={`text-lg font-extrabold tracking-wider ${theme.headerText}`}>
            {isEdit ? 'Edit Sent Stock' : 'Add Sent Stock'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-2">
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <Label htmlFor="ls-date" className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Date</Label>
              <Input id="ls-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <Label htmlFor="ls-color" className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Color</Label>
              <Select value={color || undefined} onValueChange={setColor}>
                <SelectTrigger id="ls-color" className="w-full"><SelectValue placeholder="Select color" /></SelectTrigger>
                <SelectContent>
                  {colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <Label htmlFor="ls-size" className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Size</Label>
              <Select value={size || undefined} onValueChange={setSize}>
                <SelectTrigger id="ls-size" className="w-full"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <Label htmlFor="ls-weight" className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Weight (kg)</Label>
              <Input id="ls-weight" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter className="p-2 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-gray-300 text-gray-700">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}>
            {saving && <Loader size="sm" className="mr-2" />}
            {isEdit ? 'Save changes' : 'Add stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
