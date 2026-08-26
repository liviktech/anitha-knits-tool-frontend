import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import { useLookups, findIdByName, type Lookups } from '@/features/extruder/extruder-queries';
import { loomsKeys, type LoomsCreatePayload } from '@/features/looms/loom-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes } from '@/features/production/day-entry-sections';
import { type LoomDraft, emptyLoomDraft, suggestLoomOutput } from '@/features/looms/loom-section';

interface LoomModalFormProps {
  productionDate: string;
  initialData?: LoomDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  /** Called after the entry is successfully persisted to the backend. */
  onSuccess: () => void;
}

export function LoomModalForm({ productionDate, initialData, isEditMode, onCancel, onSuccess }: LoomModalFormProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.looms;

  const [draft, setDraft] = useState<LoomDraft>(initialData || { ...emptyLoomDraft });
  const [outputManuallyEdited, setOutputManuallyEdited] = useState(!!initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof LoomDraft, value: string) => {
    setDraft(prev => {
      const next = { ...prev, [field]: value };
      if (!outputManuallyEdited && (field === 'input' || field === 'loomsWasteKg')) {
        next.output = suggestLoomOutput(next);
      }
      return next;
    });
  };

  const handleManualOutputChange = (value: string) => {
    setOutputManuallyEdited(true);
    updateField('output', value);
  };

  const handleSave = async () => {
    setError(null);

    const colorId = findIdByName(lookups.colors, draft.color);
    const sizeId = findIdByName(lookups.sizes, draft.size);

    if (!colorId || !sizeId) {
      setError('Please select a valid size and color.');
      return;
    }

    const payload: LoomsCreatePayload = {
      productionDate,
      colorId,
      sizeId,
      yarnInputKg: parseFloat(draft.input) || 0,
      fabricOutputKg: parseFloat(draft.output) || 0,
      loomsWasteKg: parseFloat(draft.loomsWasteKg) || 0,
    };

    setSaving(true);
    try {
      const response = await apiFetch('/production/looms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const msg = await extractApiErrorMessage(response, 'Failed to save looms entry.');
        setError(msg);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: loomsKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      onSuccess();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 px-1">
      <div className="flex gap-6">
        <div className="flex items-center gap-3 w-56">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider shrink-0 w-10">Size</Label>
          <Select value={draft.size} onValueChange={(v) => updateField('size', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger>
            <SelectContent>{lookups.sizes?.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 w-56">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider shrink-0 w-12">Color</Label>
          <Select value={draft.color} onValueChange={(v) => updateField('color', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent>{lookups.colors?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 bg-gray-100 p-3 rounded-lg border border-gray-200">
        <h3 className={`text-xs font-semibold uppercase tracking-wider border-b pb-1.5 ${theme.headerText}`}>Production Details</h3>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Loom Production (kg)</Label>
            <Input type="number" placeholder="0.00" value={draft.input} onChange={(e) => updateField('input', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Looms/Yarn Waste (kg)</Label>
            <Input type="number" placeholder="0.00" value={draft.loomsWasteKg} onChange={(e) => updateField('loomsWasteKg', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2 bg-yellow-100 p-3 rounded-lg border border-yellow-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-yellow-800 border-b border-yellow-200 pb-1.5">Fabric Production</h3>
        <div className="flex items-center gap-4 pt-1 w-2/3">
          <Label className="text-yellow-800 text-xs font-semibold shrink-0">Total Fabric Production (kg)</Label>
          <Input
            type="number"
            className="h-8 text-xs border-yellow-200 focus-visible:ring-yellow-400 font-bold text-yellow-700 bg-white w-48"
            placeholder="0.00"
            value={draft.output}
            onChange={(e) => handleManualOutputChange(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 mt-1 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="border-gray-300 text-gray-700">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}>
          {saving && <Loader className="mr-2" size="sm" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
