import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import { useLookups, findIdByName, type Lookups } from '@/features/extruder/extruder-queries';
import { fabricCheckingKeys, koraBalanceKeys, useAvailableFabricKg, useKoraBalances, useKoraBalanceExcludingRecord, findKoraBalanceKg, type FabricCheckingCreatePayload } from '@/features/fabric/fabric-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, colorFieldClasses } from '@/features/production/day-entry-sections';
import { type FabricDraft, emptyFabricDraft, suggestFabricOutput } from '@/features/fabric/fabric-section';

interface FabricModalFormProps {
  productionDate: string;
  initialData?: FabricDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  /** Called after the entry is successfully persisted to the backend. */
  onSuccess: () => void;
}

export function FabricModalForm({ productionDate, initialData, isEditMode, onCancel, onSuccess }: FabricModalFormProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.fabric;

  const [draft, setDraft] = useState<FabricDraft>(initialData || { ...emptyFabricDraft });
  // Total Fabric Stock follows Finished Fabric minus wastage (suggestFabricOutput), so it
  // should keep recomputing as those fields change even when editing an existing entry —
  // only typing directly into Total Fabric Stock itself should stop the auto-follow.
  const [outputManuallyEdited, setOutputManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSizeAndColor = !!draft.size && !!draft.color;
  const hasSizeColorChemical = hasSizeAndColor && !!draft.chemical;
  const selectedColorId = draft.color ? findIdByName(lookups.colors, draft.color) : undefined;
  const selectedSizeId = draft.size ? findIdByName(lookups.sizes, draft.size) : undefined;
  const selectedChemicalId = draft.chemical ? findIdByName(lookups.chemicals, draft.chemical) : undefined;

  // That single day's (productionDate) Looms fabricOutputKg for this colour+size+chemical
  // minus that same day's Fabric Checking fabricInputKg already recorded against it — the
  // same figure the backend's create/update guard (FABRIC_INPUT_EXCEEDS_AVAILABLE) enforces,
  // so the UI can't disagree with the server about what's allowed.
  const { availableKg: rawAvailableKg, isChecking: isCheckingAvailable } = useAvailableFabricKg(selectedColorId, selectedSizeId, selectedChemicalId, productionDate);
  // Editing an existing record already "spent" its own fabricInputKg against that total —
  // add it back so editing isn't capped by a number that already excludes this record.
  const originalFabricInputKg = isEditMode && initialData ? parseFloat(initialData.input) || 0 : 0;
  const productionAvailableKg = rawAvailableKg !== undefined ? rawAvailableKg + originalFabricInputKg : undefined;

  // Kora Stock is the separate running ledger balance for this colour+size (see
  // koraBalanceService) — a second pool of fabric on top of what Looms has produced.
  // The current balance (GET /kora-balance) already includes this record's own effect once
  // it exists, so it's only correct for a brand-new entry. Editing an existing record instead
  // needs that record's own contribution subtracted back out — otherwise it gets counted
  // twice (once baked into the balance, once by this input again).
  const { data: koraBalancesData, isLoading: isLoadingCurrentKora } = useKoraBalances(!isEditMode);
  const { balanceKg: koraStockExcludingThisKg, isChecking: isCheckingKoraExcludingThis } = useKoraBalanceExcludingRecord(
    selectedColorId,
    selectedSizeId,
    draft.id,
    !!isEditMode,
  );
  const koraStockKg = hasSizeAndColor
    ? (isEditMode ? koraStockExcludingThisKg : findKoraBalanceKg(koraBalancesData?.data, draft.size, draft.color)) ?? 0
    : undefined;
  const isCheckingKora = isEditMode ? isCheckingKoraExcludingThis : isLoadingCurrentKora;
  const isCheckingTotal = isCheckingAvailable || isCheckingKora;

  const totalAvailableKg =
    productionAvailableKg !== undefined && koraStockKg !== undefined ? (productionAvailableKg + koraStockKg) : undefined;
  const showNoStockWarning = hasSizeColorChemical && totalAvailableKg !== undefined && totalAvailableKg <= 0;

  const fabricProductionInputKg = parseFloat(draft.input) || 0;
  const exceedsAvailable = hasSizeColorChemical && totalAvailableKg !== undefined && fabricProductionInputKg > totalAvailableKg;

  const updateField = (field: keyof FabricDraft, value: string) => {
    setError(null);
    setDraft(prev => {
      const next = { ...prev, [field]: value };
      if (!outputManuallyEdited && (field === 'input' || field === 'fwKg' || field === 'bwKg')) {
        next.output = suggestFabricOutput(next);
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
    if (!draft.input || draft.input.trim() === '') missingFields.push('Finished Fabric');
    if (!draft.fwKg || draft.fwKg.trim() === '') missingFields.push('Fabric Waste');
    if (!draft.bwKg || draft.bwKg.trim() === '') missingFields.push('Bit Wastage');

    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}.`);
      return;
    }

    if (exceedsAvailable) {
      setError(`Finished Fabric exceeds the total available stock (${(totalAvailableKg ?? 0).toFixed(2)} kg available).`);
      return;
    }

    const finalFabricInput = parseInt(draft.input);

    const payload: FabricCheckingCreatePayload = {
      productionDate,
      colorId: colorId!,
      sizeId: sizeId!,
      chemicalId: chemicalId!,
      fabricInputKg: parseFloat(finalFabricInput.toFixed(2)) || 0,
      outputKg: parseFloat(draft.output) || 0,
      fwKg: parseFloat(draft.fwKg) || 0,
      bwKg: parseFloat(draft.bwKg) || 0,
    };

    setSaving(true);
    try {
      const url = isEditMode && draft.id ? `/fabric-checking/${draft.id}` : '/fabric-checking';
      const method = isEditMode && draft.id ? 'PATCH' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const msg = await extractApiErrorMessage(response, 'Failed to save fabric checking entry.');
        setError(msg);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all });
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

      <div className="p-3 rounded-lg border border-gray-400">
        <h3 className={`text-xs font-semibold uppercase tracking-wider border-b pb-1.5 ${theme.headerText}`}>Production Details</h3>
        <div className="grid grid-cols-2 gap-4 pt-1">

          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Production Available (kg)</Label>
            <Input
              type="text"
              placeholder="Select size, color & chemical"
              value={hasSizeColorChemical ? (isCheckingTotal ? 'Checking…' : (productionAvailableKg ?? 0).toFixed(2)) : ''}
              disabled
              readOnly
              className="bg-gray-100 font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Kora Stock (kg)</Label>
            <Input
              type="text"
              placeholder="Select size & color"
              value={hasSizeAndColor ? (isCheckingTotal ? 'Checking…' : (koraStockKg ?? 0).toFixed(2)) : ''}
              disabled
              readOnly
              className="bg-gray-100 font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Total Available (kg)</Label>
            <Input
              type="text"
              placeholder="Select size, color & chemical"
              value={hasSizeColorChemical ? (isCheckingTotal ? 'Checking…' : (totalAvailableKg ?? 0).toFixed(2)) : ''}
              disabled
              readOnly
              className="bg-gray-100 font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Finished Fabric (kg)</Label>
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
        </div>

        {showNoStockWarning && !exceedsAvailable && (
          <p className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            There is no fabric available for this size, color and chemical.
          </p>
        )}

        {exceedsAvailable && (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Finished Fabric ({fabricProductionInputKg.toFixed(2)} kg) exceeds the total available stock ({(totalAvailableKg ?? 0).toFixed(2)} kg).
          </p>
        )}
      </div>

      <div className="space-y-2 p-3 rounded-lg border border-gray-400">
        <h3 className={`text-xs font-semibold uppercase tracking-wider border-b pb-1.5 ${theme.headerText}`}>Wastage</h3>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Fabric Waste (kg)</Label>
            <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="0.00" value={draft.fwKg} onChange={(e) => updateField('fwKg', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-600 text-xs font-semibold">Bit Waste (kg)</Label>
            <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="0.00" value={draft.bwKg} onChange={(e) => updateField('bwKg', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2 bg-fuchsia-50/30 p-3 rounded-lg border border-fuchsia-300">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800 border-b border-fuchsia-200 pb-1.5">Fabric Stock</h3>
        <div className="flex items-center gap-4 pt-1 w-2/3">
          <Label className="text-fuchsia-800 text-xs font-semibold shrink-0">Total Fabric Stock (kg)</Label>
          <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()}
            className="h-8 text-xs border-fuchsia-200 focus-visible:ring-fuchsia-400 font-bold text-fuchsia-700 bg-white w-48"
            placeholder="0.00"
            value={draft.output}
            onChange={(e) => handleManualOutputChange(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 mt-1 pt-2 border-t border-gray-200">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="border-gray-300 text-gray-700">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || exceedsAvailable || isCheckingTotal} className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}>
          {saving && <Loader className="mr-2" size="sm" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
