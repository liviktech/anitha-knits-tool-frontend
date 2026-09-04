import { useState, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import {
  useLookups,
  findIdByName,
  extruderKeys,
  useColorConsumptionStandard,
  useExtruderProductions,
  colorGramsPerBasis,
  type Lookups,
  type ExtruderCreatePayload,
  type ExtruderUpdatePayload,
} from '@/features/extruder/extruder-queries';
import { useInventoryRecords, sumInventoryWeight } from '@/features/inventory/inventory-queries';
import { useOpeningBalanceRawMaterials } from '@/features/admin-panel/opening-balance-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, colorFieldClasses } from '@/features/production/day-entry-sections';
import type { ExtruderGroupDraft, ExtruderBrandDraft } from '@/features/extruder/extruder-section-new';

function roundKg(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Same "bags × bag weight + loose weight" total the read-only Total (kg) column displays. */
function computeRaw(bags: string, weightPerBag: string, looseWeight: string): string {
  const b = parseFloat(bags) || 0;
  const wpb = parseFloat(weightPerBag) || 0;
  const lw = parseFloat(looseWeight) || 0;
  if (b > 0 && wpb > 0) return (b * wpb + lw).toFixed(2);
  if (lw > 0) return lw.toFixed(2);
  return '';
}

/**
 * Display-only: once the user types a bag count, the Bag Weight field shows
 * bags × per-bag basis weight so the intermediate total is visible. This is
 * purely cosmetic — the row's basisWeightKg (submitted as bagWeightKg, the
 * per-bag standard) is unchanged; only what's rendered in the input differs.
 */
function computeBagWeightDisplay(bags: string, basisWeightKg: string): string {
  const b = parseFloat(bags) || 0;
  const wpb = parseFloat(basisWeightKg) || 0;
  if (b > 0 && wpb > 0) return (b * wpb).toFixed(2);
  return basisWeightKg;
}

/**
 * The backend requires chemicalKg/yarnOutputKg/colorConsumedKg to be
 * positive on each individual brand-row record, but this form captures them
 * once per Size+Color group (shared across however many brand rows the
 * group has). Splits each group total across its brand rows in proportion
 * to that brand's share of the group's raw material input — every brand row
 * already requires a positive rawMaterialKg, so this always yields a
 * positive share as long as the group total itself is positive.
 */
function splitGroupTotals(group: ExtruderGroupDraft) {
  const raws = group.brands.map((b) => parseFloat(b.raw) || 0);
  const totalRaw = raws.reduce((sum, r) => sum + r, 0);
  const chemicalTotal = parseFloat(group.chemicalKg) || 0;
  const outputTotal = parseFloat(group.output) || 0;
  const lumpsTotal = parseFloat(group.lumpsKg) || 0;
  const wasteTotal = parseFloat(group.yarnWasteKg) || 0;
  const colorTotal = parseFloat(group.colorConsumedKg) || 0;
  const n = group.brands.length || 1;
  return raws.map((raw) => {
    const fraction = totalRaw > 0 ? raw / totalRaw : 1 / n;
    return {
      chemicalKg: roundKg(chemicalTotal * fraction),
      yarnOutputKg: roundKg(outputTotal * fraction),
      lumpsKg: roundKg(lumpsTotal * fraction),
      yarnWasteKg: roundKg(wasteTotal * fraction),
      colorConsumedKg: roundKg(colorTotal * fraction),
    };
  });
}

/** Extracts a brand row's bag breakdown for the create payload — omits any field that isn't filled in. */
function brandBagFields(brand: ExtruderBrandDraft): Pick<ExtruderCreatePayload, 'bagCount' | 'bagWeightKg' | 'looseWeightKg' | 'totalWeightKg'> {
  const fields: Pick<ExtruderCreatePayload, 'bagCount' | 'bagWeightKg' | 'looseWeightKg' | 'totalWeightKg'> = {};
  const bagCount = parseInt(brand.bags, 10);
  const bagWeightKg = parseFloat(brand.basisWeightKg);
  const looseWeightKg = parseFloat(brand.looseWeight);
  const totalWeightKg = parseFloat(brand.raw);
  if (!isNaN(bagCount) && bagCount > 0) fields.bagCount = bagCount;
  if (!isNaN(bagWeightKg) && bagWeightKg > 0) fields.bagWeightKg = bagWeightKg;
  if (!isNaN(looseWeightKg) && looseWeightKg > 0) fields.looseWeightKg = looseWeightKg;
  if (!isNaN(totalWeightKg) && totalWeightKg > 0) fields.totalWeightKg = totalWeightKg;
  return fields;
}

interface ExtruderModalFormProps {
  productionDate: string;
  initialData?: ExtruderGroupDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  /** Called after the entry is successfully persisted to the backend. */
  onSuccess: () => void;
  entryType?: 'PRODUCTION' | 'SAMPLE';
}

const emptyBrandDraft = (): ExtruderBrandDraft => ({
  key: crypto.randomUUID(),
  brand: '',
  bags: '',
  basisWeightKg: '',
  looseWeight: '',
  raw: '',
});

const emptyGroupDraft = (): ExtruderGroupDraft => ({
  key: crypto.randomUUID(),
  size: '',
  color: '',
  output: '',
  chemical: '',
  chemicalKg: '',
  colorConsumedKg: '',
  lumpsKg: '',
  yarnWasteKg: '',
  brands: [emptyBrandDraft()],
});

export function ExtruderModalForm({ productionDate, initialData, isEditMode, onCancel, onSuccess, entryType = 'PRODUCTION' }: ExtruderModalFormProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [], expenseNames: [] };
  const theme = themes.extruder;

  // Brands with zero or negative live stock balance (received minus already-consumed)
  // must not be selectable in the HDPE Material rows below. "Received" includes both regular
  // Inventory intake and the Admin Panel's Opening Balance (HDPE) — a brand can be in stock
  // purely from its opening balance with no Inventory receipts yet.
  const { data: inventoryData } = useInventoryRecords('?limit=100');
  const inventoryRecords = inventoryData?.data ?? [];
  const { data: rawMaterialsOBData } = useOpeningBalanceRawMaterials('?limit=100');
  const rawMaterialsOBRecords = rawMaterialsOBData?.data ?? [];
  const { data: allExtruderData } = useExtruderProductions('?limit=100');
  const allExtruderRecords = allExtruderData?.data ?? [];
  const getBrandBalance = (name: string) => {
    const openingBalanceKg = rawMaterialsOBRecords
      .filter((r) => r.type === 'HDPE' && r.name === name)
      .reduce((sum, r) => sum + r.weightKg, 0);
    const receivedKg = sumInventoryWeight(inventoryRecords, 'HDPE', name) + openingBalanceKg;
    const consumedKg = allExtruderRecords
      .filter((r) => r.extruder?.brand?.name === name)
      .reduce((sum, r) => sum + (r.extruder?.rawMaterialKg ?? 0), 0);
    return receivedKg - consumedKg;
  };

  const [group, setGroup] = useState<ExtruderGroupDraft>(initialData || emptyGroupDraft());
  const [outputManuallyEdited, setOutputManuallyEdited] = useState(!!initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample entries don't follow the company's Color Consumption Standard — Bag Weight,
  // Chemical Weight and Color Weight are all typed in by hand instead of being derived from it.
  const isSample = entryType === 'SAMPLE';

  const { data: standardData } = useColorConsumptionStandard(productionDate);
  const standard = standardData?.data;
  const chemicalWeightStandard = standard ? parseFloat(standard.chemicalWeight) : undefined;
  const basisWeightKg = standard ? parseFloat(standard.basisWeightKg) : undefined;
  const kgPerBasis = colorGramsPerBasis(standard, group.color); // actual API field is kg per basis unit

  // Bag weight displayed comes from basisWeightKg standard (e.g. 25 kg per bag) — except for a
  // Sample entry, where each row's own basisWeightKg is whatever the user typed into it.
  // Total = (bags × bagWt) + looseWt
  const bagWtStr = basisWeightKg !== undefined ? String(basisWeightKg) : '';
  const computedBrands = useMemo(
    () => group.brands.map((b) => {
      const weightPerBag = isSample ? b.basisWeightKg : bagWtStr;
      return { ...b, basisWeightKg: weightPerBag, raw: computeRaw(b.bags, weightPerBag, b.looseWeight) };
    }),
    [group.brands, bagWtStr, isSample],
  );

  const totalRawKg = useMemo(
    () => computedBrands.reduce((sum, b) => sum + (parseFloat(b.raw) || 0), 0),
    [computedBrands],
  );
  const standardColorConsumedKg = useMemo(() => {
    if (kgPerBasis === undefined || !basisWeightKg) return undefined;
    // colorConsumedKg = kgPerBasis × (totalRawKg / basisWeightKg)
    // e.g. 0.15 kg/basis × (81 kg / 25 kg/basis) = 0.486 kg
    return roundKg(kgPerBasis * (totalRawKg / basisWeightKg));
  }, [kgPerBasis, basisWeightKg, totalRawKg]);

  // Chemical consumed scales the same way: chemicalWeight (kg/basis) × (totalRawKg / basisWeightKg)
  const standardChemicalConsumedKg = useMemo(() => {
    if (chemicalWeightStandard === undefined || !basisWeightKg) return undefined;
    return roundKg(chemicalWeightStandard * (totalRawKg / basisWeightKg));
  }, [chemicalWeightStandard, basisWeightKg, totalRawKg]);

  // The figures actually used to save/suggest-output — the standard-derived values for a real
  // Production entry, or the user's own manual entries for a Sample one.
  const effectiveChemicalConsumedKg = isSample ? parseFloat(group.chemicalKg) || 0 : (standardChemicalConsumedKg ?? 0);
  const effectiveColorConsumedKg = isSample ? parseFloat(group.colorConsumedKg) || 0 : (standardColorConsumedKg ?? 0);

  // Total Loom Production suggestion — raw material + chemical + colour consumed, minus
  // recorded wastage. Mirrors suggestExtruderOutput() in day-entry-sections.tsx; recomputed
  // here rather than reused directly since this form tracks raw/chemical/colour as derived
  // memos (from brand rows + the color-consumption standard, or manual entry for Sample)
  // rather than group state.
  const suggestedOutputKg = useMemo(() => {
    const inputMassKg = totalRawKg + effectiveChemicalConsumedKg + effectiveColorConsumedKg;
    const wasteKg = (parseFloat(group.lumpsKg) || 0) + (parseFloat(group.yarnWasteKg) || 0);
    const suggested = Math.max(0, inputMassKg - wasteKg);
    return suggested > 0 ? suggested.toFixed(2) : '';
  }, [totalRawKg, effectiveChemicalConsumedKg, effectiveColorConsumedKg, group.lumpsKg, group.yarnWasteKg]);

  const displayedOutputKg = outputManuallyEdited ? group.output : suggestedOutputKg;

  const prevSuggestedOutput = useRef(suggestedOutputKg);
  useEffect(() => {
    if (suggestedOutputKg !== prevSuggestedOutput.current) {
      setOutputManuallyEdited(false);
      prevSuggestedOutput.current = suggestedOutputKg;
    }
  }, [suggestedOutputKg]);

  const updateGroupField = (field: keyof ExtruderGroupDraft, value: string) => {
    setGroup(prev => ({ ...prev, [field]: value }));
  };

  const handleOutputChange = (value: string) => {
    setOutputManuallyEdited(true);
    updateGroupField('output', value);
  };

  const updateBrandField = (brandKey: string, field: keyof ExtruderBrandDraft, value: string) => {
    setGroup(prev => ({
      ...prev,
      brands: prev.brands.map(b => (b.key === brandKey ? { ...b, [field]: value } : b)),
    }));
  };

  const addBrand = () => {
    setGroup(prev => ({ ...prev, brands: [...prev.brands, emptyBrandDraft()] }));
  };

  const removeBrand = (brandKey: string) => {
    setGroup(prev => {
      if (prev.brands.length <= 1) return prev;
      return { ...prev, brands: prev.brands.filter(b => b.key !== brandKey) };
    });
  };

  const handleSave = async () => {
    setError(null);

    const colorId = findIdByName(lookups.colors, group.color);
    const sizeId = findIdByName(lookups.sizes, group.size);
    const chemicalId = findIdByName(lookups.chemicals, group.chemical);

    const missingFields: string[] = [];
    if (!sizeId) missingFields.push('Size');
    if (!colorId) missingFields.push('Color');
    if (!chemicalId) missingFields.push('Chemical Type');

    if (computedBrands.length === 0) {
      missingFields.push('HDPE Brand');
    } else {
      let missingBrand = false;
      let missingBags = false;
      for (const b of computedBrands) {
        if (!b.brand) missingBrand = true;
        if (!b.bags || b.bags.trim() === '') missingBags = true;
      }
      if (missingBrand) missingFields.push('HDPE Brand');
      if (missingBags) missingFields.push('Bags');
    }

    if (!group.yarnWasteKg || group.yarnWasteKg.trim() === '') {
      missingFields.push('Looms Waste');
    }

    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}.`);
      return;
    }

    if (effectiveChemicalConsumedKg <= 0 || (parseFloat(displayedOutputKg) || 0) <= 0) {
      setError('Chemical weight and total loom production must both be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      const shares = splitGroupTotals({
        ...group,
        output: displayedOutputKg,
        chemicalKg: String(effectiveChemicalConsumedKg),
        colorConsumedKg: String(effectiveColorConsumedKg),
        brands: computedBrands,
      });

      // Brand rows that existed on the original record but were removed from
      // this group in the modal need to be deleted, not left behind.
      const currentIds = new Set(computedBrands.map((b) => b.id).filter(Boolean));
      const removedIds = (initialData?.brands ?? [])
        .map((b) => b.id)
        .filter((id): id is string => !!id && !currentIds.has(id));
      for (const id of removedIds) {
        const response = await apiFetch(`/production/extruder/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const msg = await extractApiErrorMessage(response, 'Failed to remove one or more extruder entries.');
          setError(msg);
          return;
        }
      }

      for (const [index, brandRow] of computedBrands.entries()) {
        const brandId = findIdByName(lookups.brands, brandRow.brand);
        if (!brandId) {
          setError(`Brand "${brandRow.brand || '(empty)'}" could not be resolved. Please select a valid brand.`);
          return;
        }
        const share = shares[index];
        // Chemical/output/wastage/colour-consumed are captured once per group in
        // this form — split across each brand row in proportion to its share of
        // the group's raw material, since the backend requires a positive value
        // on every individual record.
        if (brandRow.id) {
          // Existing row — update it in place rather than creating a duplicate.
          const payload: ExtruderUpdatePayload = {
            brandId,
            chemicalId,
            rawMaterialKg: parseFloat(brandRow.raw) || 0,
            chemicalKg: share.chemicalKg,
            colorConsumedKg: share.colorConsumedKg > 0 ? share.colorConsumedKg : undefined,
            yarnOutputKg: share.yarnOutputKg,
            lumpsKg: share.lumpsKg,
            yarnWasteKg: share.yarnWasteKg,
            ...brandBagFields(brandRow),
          };
          const response = await apiFetch(`/production/extruder/${brandRow.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const msg = await extractApiErrorMessage(response, 'Failed to save extruder entry.');
            setError(msg);
            return;
          }
        } else {
          const payload: ExtruderCreatePayload = {
            productionDate,
            colorId: colorId!,
            sizeId: sizeId!,
            brandId,
            chemicalId: chemicalId!,
            rawMaterialKg: parseFloat(brandRow.raw) || 0,
            chemicalKg: share.chemicalKg,
            colorConsumedKg: share.colorConsumedKg > 0 ? share.colorConsumedKg : undefined,
            yarnOutputKg: share.yarnOutputKg,
            lumpsKg: share.lumpsKg,
            yarnWasteKg: share.yarnWasteKg,
            type: entryType,
            ...brandBagFields(brandRow),
          };
          const response = await apiFetch('/production/extruder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const msg = await extractApiErrorMessage(response, 'Failed to save extruder entry.');
            setError(msg);
            return;
          }
        }
      }
      // All brands saved — refresh the table
      await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      onSuccess();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-1">

      {/* General Settings */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-gray-400">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Size</Label>
          <Select value={group.size} onValueChange={(v) => updateGroupField('size', v)} disabled={isEditMode}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select Size" /></SelectTrigger>
            <SelectContent position="popper">{lookups.sizes?.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Color</Label>
          <Select value={group.color} onValueChange={(v) => updateGroupField('color', v)} disabled={isEditMode}>
            <SelectTrigger className={`h-8 text-xs w-full ${group.color ? `font-semibold ${colorFieldClasses(group.color)}` : ''}`}><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent position="popper">{lookups.colors?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Chemical Type</Label>
          <Select value={group.chemical} onValueChange={(v) => updateGroupField('chemical', v)} disabled={isEditMode}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select Chem" /></SelectTrigger>
            <SelectContent position="popper">{lookups.chemicals?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* HDPE Material */}
      <div className="space-y-2 p-3 rounded-lg border border-gray-400">
        <div className="border-b pb-1.5">
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme.headerText}`}>HDPE Material</h3>
        </div>
        <div className="space-y-2">
          {computedBrands.map((brandRow, idx) => (
            <div key={brandRow.key} className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                {idx === 0 && <Label className="text-xs text-gray-500">Brand</Label>}
                <Select value={brandRow.brand} onValueChange={(v) => updateBrandField(brandRow.key, 'brand', v)}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Brand" /></SelectTrigger>
                  <SelectContent position="popper">
                    {lookups.brands?.map((b) => {
                      const outOfStock = getBrandBalance(b.name) <= 0 && b.name !== brandRow.brand;
                      return (
                        <SelectItem key={b.id} value={b.name} disabled={outOfStock}>
                          {b.name}{outOfStock ? ' (no stock)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1">
                {idx === 0 && <Label className="text-xs text-gray-500">Bags</Label>}
                <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="Bags" value={brandRow.bags} onChange={(e) => updateBrandField(brandRow.key, 'bags', e.target.value)} className="h-8 text-xs w-full" />
              </div>
              <div className="space-y-1 flex-1">
                {idx === 0 && <Label className="text-xs text-gray-500">Bag Weight(kg)</Label>}
                {isSample ? (
                  <Input
                    type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                    placeholder="Bag Wt"
                    value={brandRow.basisWeightKg}
                    onChange={(e) => updateBrandField(brandRow.key, 'basisWeightKg', e.target.value)}
                    className="h-8 text-xs w-full"
                  />
                ) : (
                  <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="Bag Wt" disabled readOnly value={computeBagWeightDisplay(brandRow.bags, brandRow.basisWeightKg)} className="h-8 text-xs w-full border border-gray-400 disabled:opacity-100" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                {idx === 0 && <Label className="text-xs text-gray-500 whitespace-nowrap">Loose Weight(kg)</Label>}
                <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="Loose Wt" value={brandRow.looseWeight} onChange={(e) => updateBrandField(brandRow.key, 'looseWeight', e.target.value)} className="h-8 text-xs w-full" />
              </div>
              <div className="space-y-1 flex-1">
                {idx === 0 && <Label className="text-xs text-gray-500">Total (kg)</Label>}
                <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="Total" readOnly className="h-8 text-xs w-full bg-white font-medium" value={brandRow.raw} />
              </div>
              <div className={`flex items-center ${idx === 0 ? 'pb-0.5' : ''}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 text-red-500 hover:bg-red-50 ${computedBrands.length <= 1 ? 'opacity-0 pointer-events-none' : ''}`}
                  onClick={() => removeBrand(brandRow.key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-1">
          <Button variant="ghost" size="sm" className="h-6 text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-2 flex items-center gap-1 -ml-2" onClick={addBrand}>
            <Plus className="h-3 w-3" /> <span className="text-xs">Add Brand</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Chemicals */}
        <div className="space-y-2 p-3 rounded-lg border border-gray-400">
          <h3 className={`text-xs font-semibold uppercase tracking-wider border-b pb-1.5 ${theme.headerText}`}>Chemicals & Colors</h3>
          <div className="space-y-2 pt-0.5">
            <div className="space-y-1.5">
              <Label className="text-gray-600 text-xs font-semibold">Chemical Weight(kg)</Label>
              {isSample ? (
                <Input
                  type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                  placeholder="0.00"
                  className="h-8 text-xs"
                  value={group.chemicalKg}
                  onChange={(e) => updateGroupField('chemicalKg', e.target.value)}
                />
              ) : (
                <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="0.00" className="h-8 text-xs bg-gray-100 border border-gray-400 disabled:opacity-100" value={standardChemicalConsumedKg !== undefined ? standardChemicalConsumedKg.toFixed(2) : ''} disabled readOnly />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-600 text-xs font-semibold">Color Weight (kg)</Label>
              {isSample ? (
                <Input
                  type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()}
                  placeholder="0.00"
                  className="h-8 text-xs"
                  value={group.colorConsumedKg}
                  onChange={(e) => updateGroupField('colorConsumedKg', e.target.value)}
                />
              ) : (
                <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="0.00" className="h-8 text-xs bg-gray-100 border border-gray-400 disabled:opacity-100" value={standardColorConsumedKg !== undefined ? standardColorConsumedKg.toFixed(2) : ''} disabled readOnly />
              )}
            </div>

          </div>
        </div>

        {/* Wastage */}
        <div className="space-y-2 p-3 rounded-lg border border-gray-400">
          <h3 className={`text-xs font-semibold uppercase tracking-wider border-b pb-1.5 ${theme.headerText}`}>Wastage</h3>
          <div className="space-y-2 pt-0.5">
            <div className="space-y-1.5">
              <Label className="text-gray-600 text-xs font-semibold">Lumps (kg)</Label>
              <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="0.00" className="h-8 text-xs" value={group.lumpsKg} onChange={(e) => updateGroupField('lumpsKg', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-600 text-xs font-semibold">Looms Waste (kg)</Label>
              <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} placeholder="0.00" className="h-8 text-xs" value={group.yarnWasteKg} onChange={(e) => updateGroupField('yarnWasteKg', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Loom Production */}
      <div className="space-y-2 bg-green-50/30 p-3 rounded-lg border border-green-300">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-green-800 border-b border-green-200 pb-1.5">Looms Production</h3>
        <div className="flex items-center gap-4 pt-1 w-2/3">
          <Label className="text-green-800 text-xs font-semibold shrink-0">Total Looms Production (kg)</Label>
          <Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} className="h-8 text-xs border-green-200 focus-visible:ring-green-400 font-bold text-green-700 bg-white w-48" placeholder="0.00" value={displayedOutputKg} onChange={(e) => handleOutputChange(e.target.value)} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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
