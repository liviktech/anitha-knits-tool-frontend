import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import { useLookups, findIdByName, type Lookups } from '@/features/extruder/extruder-queries';
import { loomsKeys, useAvailableYarnKg, type LoomsCreatePayload } from '@/features/looms/loom-queries';
import { koraBalanceKeys } from '@/features/fabric/fabric-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, colorFieldClasses } from '@/features/production/day-entry-sections';
import { type LoomDraft, emptyLoomDraft, suggestLoomOutput } from '@/features/looms/loom-section';

interface LoomModalFormProps {
  productionDate: string;
  initialData?: LoomDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  /** Called after the entry is successfully persisted to the backend. */
  onSuccess: () => void;
  entryType?: 'PRODUCTION' | 'SAMPLE';
}

export function LoomModalForm({ productionDate, initialData, isEditMode, onCancel, onSuccess, entryType = 'PRODUCTION' }: LoomModalFormProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.looms;

  const [draft, setDraft] = useState<LoomDraft>(initialData || { ...emptyLoomDraft });
  // Size/Color are locked while editing, so Loom Production and Looms/Yarn Waste are the only
  // fields that can trigger a recompute here — starting this `true` in edit mode (as it used to)
  // disabled the auto-calc entirely, since neither of those fields could ever re-enable it.
  const [outputManuallyEdited, setOutputManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSizeAndColor = !!draft.size && !!draft.color;
  const hasSizeColorChemical = hasSizeAndColor && !!draft.chemical;
  const selectedColorId = draft.color ? findIdByName(lookups.colors, draft.color) : undefined;
  const selectedSizeId = draft.size ? findIdByName(lookups.sizes, draft.size) : undefined;
  const selectedChemicalId = draft.chemical ? findIdByName(lookups.chemicals, draft.chemical) : undefined;

  // Cumulative, all-time Extruder yarnOutputKg for this colour+size+chemical minus all-time
  // Looms yarnInputKg already recorded against it — the same figure the backend's
  // create/update guard (YARN_INPUT_EXCEEDS_AVAILABLE) enforces, so the UI can't disagree
  // with the server about what's allowed.
  const { availableKg: rawAvailableKg, isChecking: isCheckingAvailable } = useAvailableYarnKg(selectedColorId, selectedSizeId, selectedChemicalId);
  // Editing an existing record already "spent" its own yarnInputKg against that total —
  // add it back so editing isn't capped by a number that already excludes this record.
  const originalYarnInputKg = isEditMode && initialData ? parseFloat(initialData.input) || 0 : 0;
  const totalAvailableKg = rawAvailableKg !== undefined ? rawAvailableKg + originalYarnInputKg : undefined;
  const noYarnAvailable = hasSizeColorChemical && totalAvailableKg !== undefined && totalAvailableKg <= 0;

  const loomProductionInputKg = parseFloat(draft.input) || 0;
  const exceedsAvailable = hasSizeColorChemical && totalAvailableKg !== undefined && loomProductionInputKg > totalAvailableKg;

  // Yarn Stock = Available Yarn minus Loom Production (not net of Looms/Yarn Waste).
  const yarnStockKg = totalAvailableKg !== undefined ? totalAvailableKg - loomProductionInputKg : undefined;

  const updateField = (field: keyof LoomDraft, value: string) => {
    setDraft(prev => {
      const next = { ...prev, [field]: value };
      if (!outputManuallyEdited && field === 'input') {
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
    const chemicalId = findIdByName(lookups.chemicals, draft.chemical);

    const missingFields: string[] = [];
    if (!sizeId) missingFields.push('Size');
    if (!colorId) missingFields.push('Color');
    if (!chemicalId) missingFields.push('Chemical');
    if (!draft.input || draft.input.trim() === '') missingFields.push('Loom Production');
    if (!draft.loomsWasteKg || draft.loomsWasteKg.trim() === '') missingFields.push('Looms/Yarn Waste');

    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}.`);
      return;
    }

    if (exceedsAvailable) {
      setError(`Loom Production exceeds the available Extruder yarn (${(totalAvailableKg ?? 0).toFixed(2)} kg available).`);
      return;
    }

    const payload: LoomsCreatePayload = {
      productionDate,
      colorId: colorId!,
      sizeId: sizeId!,
      chemicalId: chemicalId!,
      yarnInputKg: parseFloat(draft.input) || 0,
      fabricOutputKg: parseFloat(draft.output) || 0,
      loomsWasteKg: parseFloat(draft.loomsWasteKg) || 0,
      type: entryType,
    };

    setSaving(true);
    try {
      const isUpdating = isEditMode && !!draft.id;
      const url = isUpdating ? `/production/looms/${draft.id}` : '/production/looms';
      const method = isUpdating ? 'PATCH' : 'POST';
      const response = await apiFetch(url, {
        method: method,
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
      await queryClient.invalidateQueries({ queryKey: koraBalanceKeys.all });
      onSuccess();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2 px-1">
      <div className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-gray-400">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Size</Label>
          <Select value={draft.size} onValueChange={(v) => updateField('size', v)} disabled={isEditMode}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select Size" /></SelectTrigger>
            <SelectContent position="popper">{lookups.sizes?.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Color</Label>
          <Select value={draft.color} onValueChange={(v) => updateField('color', v)} disabled={isEditMode}>
            <SelectTrigger className={`h-8 text-xs w-full ${draft.color ? `font-semibold ${colorFieldClasses(draft.color)}` : ''}`}><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent position="popper">{lookups.colors?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Chemical</Label>
          <Select value={draft.chemical} onValueChange={(v) => updateField('chemical', v)} disabled={isEditMode}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select Chemical" /></SelectTrigger>
            <SelectContent position="popper">{lookups.chemicals?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 p-3 rounded-lg border border-gray-400">
        <h3 className={`text-xs font-semibold uppercase tracking-wider border-b pb-1.5 ${theme.headerText}`}>Production Details</h3>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Available Yarn (kg)</Label>
            <Input
              type="text"
              placeholder="Select size, color & chemical"
              value={hasSizeColorChemical ? (isCheckingAvailable ? 'Checking…' : (totalAvailableKg ?? 0).toFixed(2)) : ''}
              disabled
              readOnly
              className="bg-gray-100 font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Loom Production (kg)</Label>
            <Input
              type="number"
              min="0"
              onKeyDown={(e) => e.key === '-' && e.preventDefault()}
              placeholder="0.00"
              value={draft.input}
              onChange={(e) => updateField('input', e.target.value)}
              className={exceedsAvailable ? 'border-red-400 focus-visible:ring-red-400' : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Looms/Yarn Waste (kg)</Label>
            <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="0.00" value={draft.loomsWasteKg} onChange={(e) => updateField('loomsWasteKg', e.target.value)} />
          </div>
        </div>

        {noYarnAvailable && !exceedsAvailable && (
          <p className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            There is no Extruder yarn available for this size, color and chemical.
          </p>
        )}

        {exceedsAvailable && (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Loom Production ({loomProductionInputKg.toFixed(2)} kg) exceeds the available yarn ({(totalAvailableKg ?? 0).toFixed(2)} kg).
          </p>
        )}
      </div>

      <div className="space-y-2 bg-yellow-50/30 p-3 rounded-lg border border-yellow-300">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-yellow-800 border-b border-yellow-200 pb-1.5">Fabric Production</h3>
        <div className="flex items-center gap-4 pt-1 w-2/3">
          <Label className="text-yellow-800 text-xs font-semibold shrink-0">Total Fabric Production (kg)</Label>
          <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()}
            className="h-8 text-xs border-yellow-200 focus-visible:ring-yellow-400 font-bold text-yellow-700 bg-white w-48"
            placeholder="0.00"
            value={draft.output}
            onChange={(e) => handleManualOutputChange(e.target.value)}
          />
        </div>
      </div>

      {hasSizeColorChemical && yarnStockKg !== undefined && (
        <p className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          <Info className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="font-semibold">After Fabric Production Yarn Stock:</span>
          <span className="font-extrabold">{isCheckingAvailable ? 'Checking…' : `${yarnStockKg.toFixed(2)} kg`}</span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 mt-1 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="border-gray-300 text-gray-700">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || exceedsAvailable || isCheckingAvailable}
          className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}
        >
          {saving && <Loader className="mr-2" size="sm" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
