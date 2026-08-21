import { useMemo, useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { Plus, Edit2, X as XIcon } from 'lucide-react';
import { apiUrl } from '@/lib/api-client';
import { sumWastageByCode } from '@/lib/api-types';
import {
  useExtruderProductions,
  useLookups,
  extruderKeys,
  findIdByName,
  type Lookups,
  type ExtruderProductionItem,
  type ExtruderCreatePayload,
  type ExtruderUpdatePayload,
} from '@/features/extruder/extruder-queries';
import {
  useLoomsProductions,
  loomsKeys,
  type LoomsProductionItem,
  type LoomsCreatePayload,
} from '@/features/looms/loom-queries';
import {
  useFabricCheckingRecords,
  fabricCheckingKeys,
  type FabricCheckingRecord,
  type FabricCheckingCreatePayload,
} from '@/features/fabric/fabric-queries';
import { dashboardProductionKey } from './day-wise-queries';
import { useInventoryRecords, sumInventoryWeight } from '@/features/inventory/inventory-queries';

/**
 * Shared between the day-close view (day-details.tsx) and the entry modal
 * (new-entry.tsx) — both render the exact same summary + category sections,
 * so the markup lives here once instead of being duplicated per file.
 */

interface DaySummary {
  dnPlusKg: string;
  wasteKg: string;
  efficiencyPct: string;
  checkedKg: string;
}

export function DaySummaryCards({ dnPlusKg, wasteKg, efficiencyPct, checkedKg }: DaySummary) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 mt-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-green-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">DN+</p>
        <p className="mt-1 text-xl font-bold text-green-600">
          {dnPlusKg} <span className="text-2xs font-normal text-gray-400">kg</span>
        </p>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Waste</p>
        <p className="mt-1 text-xl font-bold text-red-600">
          {wasteKg} <span className="text-2xs font-normal text-gray-400">kg</span>
        </p>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Efficiency</p>
        <p className="mt-1 text-xl font-bold text-blue-600">{efficiencyPct}%</p>
        <div className="mt-2 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${efficiencyPct}%` }} />
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-purple-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Checked</p>
        <p className="mt-1 text-xl font-bold text-purple-600">
          {checkedKg} <span className="text-2xs font-normal text-gray-400">kg</span>
        </p>
      </div>
    </div>
  );
}

const themes = {
  green: {
    border: 'border-green-200',
    headerBorder: 'border-green-100',
    badgeBorder: 'border-green-200',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-700',
    buttonBorder: 'border-green-200',
    buttonText: 'text-green-700',
    buttonHover: 'hover:bg-green-50 hover:text-green-800',
  },
  blue: {
    border: 'border-blue-200',
    headerBorder: 'border-blue-100',
    badgeBorder: 'border-blue-200',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    buttonBorder: 'border-blue-200',
    buttonText: 'text-blue-700',
    buttonHover: 'hover:bg-blue-50 hover:text-blue-800',
  },
  purple: {
    border: 'border-purple-200',
    headerBorder: 'border-purple-100',
    badgeBorder: 'border-purple-200',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    buttonBorder: 'border-purple-200',
    buttonText: 'text-purple-700',
    buttonHover: 'hover:bg-purple-50 hover:text-purple-800',
  },
} as const;

type Theme = keyof typeof themes;

export interface ExtruderRow {
  id: string;
  size: string;
  color: string;
  brand: string;
  chemical: string;
  raw: number;
  chemicalKg: number;
  output: number;
  colorConsumedKg: number;
  lumpsKg: number;
  yarnWasteKg: number;
}

export function mapExtruderItem(item: ExtruderProductionItem): ExtruderRow {
  return {
    id: item.id,
    size: item.size?.name ?? '',
    color: item.color?.name ?? '',
    brand: item.extruder?.brand?.name ?? '',
    chemical: item.extruder?.chemical?.name ?? '',
    raw: item.extruder?.rawMaterialKg ?? 0,
    chemicalKg: item.extruder?.chemicalKg ?? 0,
    output: item.extruder?.yarnOutputKg ?? 0,
    colorConsumedKg: item.extruder?.colorConsumedKg ?? 0,
    lumpsKg: sumWastageByCode(item.wastages, 'LUMPS'),
    yarnWasteKg: sumWastageByCode(item.wastages, 'YARN_WASTE'),
  };
}

interface ExtruderDraft {
  size: string;
  color: string;
  brand: string;
  chemical: string;
  raw: string;
  chemicalKg: string;
  output: string;
  /** Not a rendered field — auto-derived from Color's matching Inventory (COLOR) stock, sent to the API as-is. */
  colorConsumedKg: string;
  lumpsKg: string;
  yarnWasteKg: string;
}

const emptyExtruderDraft: ExtruderDraft = { size: '', color: '', brand: '', chemical: '', raw: '', chemicalKg: '', output: '', colorConsumedKg: '', lumpsKg: '', yarnWasteKg: '' };

/**
 * Extruder is the only category wired to the real API so far (CRUD only —
 * there's no delete endpoint, and approve/reject/pending status handling is
 * out of scope for now). Loom and Fabric below stay on static mock data
 * until their endpoints are available.
 *
 * Fields match the real ExtruderCreateRequest exactly (additionalProperties
 * is false server-side, so extra fields would be rejected): productionDate
 * defaults to today since this compact view has no date column;
 * colorConsumedKg is omitted so the backend auto-computes it from the
 * colour's configured standard. Waste isn't a real API field — the table
 * shows rawMaterialKg and yarnOutputKg (both real), not a derived waste
 * column, to avoid implying a value the backend doesn't track per-record.
 */
interface SectionProps {
  /** ISO date (yyyy-MM-dd) new rows are recorded against; defaults to today. */
  productionDate?: string;
  autoAdd?: boolean;
  /** View-only: hides Add row / Edit actions and renders existing rows as plain text. */
  readOnly?: boolean;
  /**
   * "Add New Entry" is a pure create flow, not a browse-and-edit one — it
   * must always present a blank draft, even when the selected date already
   * has records. Skips fetching/showing existing rows entirely so it can't
   * be confused with the Edit flow.
   */
  hideExisting?: boolean;
}

export interface SectionRef {
  saveDraft: () => Promise<boolean>;
}

export const ExtruderSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useExtruderProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  // Same-day Inventory stock, used to auto-suggest Raw Material/Chemical/Color
  // weights below — nothing here adds a visible field, it only fills in the
  // ones that already exist.
  const { data: inventoryData } = useInventoryRecords(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !readOnly,
  );
  const inventoryRecords = useMemo(() => inventoryData?.data ?? [], [inventoryData]);
  const rawMaterialFromInventory = useMemo(() => sumInventoryWeight(inventoryRecords, 'RAW_MATERIAL'), [inventoryRecords]);
  // The day's first Chemical/Color inventory entry, if any — used to
  // auto-select the dropdown itself (not just its weight) when a blank row
  // opens, same as Raw Material.
  const firstChemicalRecord = useMemo(() => inventoryRecords.find((r) => r.type === 'CHEMICAL'), [inventoryRecords]);
  const firstColorRecord = useMemo(() => inventoryRecords.find((r) => r.type === 'COLOR'), [inventoryRecords]);
  const firstRawMaterialRecord = useMemo(() => inventoryRecords.find((r) => r.type === 'RAW_MATERIAL'), [inventoryRecords]);
  const resolveChemicalWeight = (name: string) => {
    const kg = sumInventoryWeight(inventoryRecords, 'CHEMICAL', name);
    return kg > 0 ? kg : undefined;
  };
  const resolveColorWeight = (name: string) => {
    const kg = sumInventoryWeight(inventoryRecords, 'COLOR', name);
    return kg > 0 ? kg : undefined;
  };

  const rows = useMemo(() => {
    // hideExisting means this instance never fetched — but `enabled: false`
    // only skips the network call, it doesn't hide data already cached
    // under this exact query key from another (e.g. Edit/View) instance. So
    // explicitly ignore `data` here rather than trusting it to be empty.
    if (hideExisting) return [];
    const items = data?.data ?? [];
    return items
      .filter((item) => !productionDate || item.productionDate.startsWith(productionDate))
      .map(mapExtruderItem)
      .filter((row) => row.raw > 0 || row.output > 0 || row.chemicalKg > 0);
  }, [data, productionDate, hideExisting]);

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<ExtruderDraft>(emptyExtruderDraft);
  const [saving, setSaving] = useState(false);
  const hasAutoAddedRef = useRef(false);
  // Tracks whether the user has personally edited a field that's otherwise
  // kept synced to Inventory. Starts false (untouched) and only ever flips
  // to true from an actual Select/Input interaction (see the handlers
  // below) — never from "there happened to be nothing to suggest right
  // now," so it correctly re-arms when the user changes the date to one
  // that does have matching stock, instead of getting stuck off forever.
  const [rawManuallyEdited, setRawManuallyEdited] = useState(false);
  const [chemicalManuallyEdited, setChemicalManuallyEdited] = useState(false);
  const [colorManuallyEdited, setColorManuallyEdited] = useState(false);
  const [brandManuallyEdited, setBrandManuallyEdited] = useState(false);

  // Header totals reflect saved rows plus, while a brand-new row is being
  // filled in, that row's own (possibly auto-filled) values — otherwise the
  // header shows 0.00 the whole time in "Add New Entry", where there are no
  // saved rows yet to sum.
  const totals = useMemo(() => {
    const base = rows.reduce((acc, row) => ({ raw: acc.raw + row.raw, output: acc.output + row.output }), { raw: 0, output: 0 });
    if (editingId === 'new') {
      base.raw += parseFloat(draft.raw) || 0;
      base.output += parseFloat(draft.output) || 0;
    }
    return base;
  }, [rows, editingId, draft.raw, draft.output]);

  const startAdd = useCallback(() => {
    setDraft({
      ...emptyExtruderDraft,
      raw: rawMaterialFromInventory > 0 ? String(rawMaterialFromInventory) : '',
      chemical: firstChemicalRecord?.name ?? '',
      chemicalKg: firstChemicalRecord ? String(firstChemicalRecord.weightKg) : '',
      color: firstColorRecord?.name ?? '',
      colorConsumedKg: firstColorRecord ? String(firstColorRecord.weightKg) : '',
      brand: firstRawMaterialRecord?.name ?? '',
    });
    setRawManuallyEdited(false);
    setChemicalManuallyEdited(false);
    setColorManuallyEdited(false);
    setBrandManuallyEdited(false);
    setEditingId('new');
  }, [rawMaterialFromInventory, firstChemicalRecord, firstColorRecord, firstRawMaterialRecord]);

  useEffect(() => {
    if (readOnly || !autoAdd || isLoading || hasAutoAddedRef.current) return;
    if (rows.length === 0 && editingId === null) {
      hasAutoAddedRef.current = true;
      // One-shot: open a blank draft row the first time this date resolves
      // with no existing records. The ref above guarantees this only ever
      // fires once per mount, so it can't cascade into further renders.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startAdd();
    }
    // The ref guard above makes this effect idempotent, so re-running it
    // when startAdd's identity changes (e.g. rawMaterialFromInventory
    // updates) is harmless — it's included only to satisfy exhaustive-deps.
  }, [readOnly, autoAdd, isLoading, rows.length, editingId, startAdd]);

  // Keep an untouched draft synced to Inventory as it changes — whether
  // that's the user picking a different date, or editing/deleting the
  // matching Inventory record while this form is open — including clearing
  // a field back out if its match disappears. A field stops syncing the
  // moment the user manually touches it (see the Select/Input handlers
  // below, which set the corresponding *ManuallyEdited flag to true).
  useEffect(() => {
    if (editingId !== 'new') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) => ({
      ...current,
      raw: rawManuallyEdited ? current.raw : (rawMaterialFromInventory > 0 ? String(rawMaterialFromInventory) : ''),
      chemical: chemicalManuallyEdited ? current.chemical : (firstChemicalRecord?.name ?? ''),
      chemicalKg: chemicalManuallyEdited ? current.chemicalKg : (firstChemicalRecord ? String(firstChemicalRecord.weightKg) : ''),
      color: colorManuallyEdited ? current.color : (firstColorRecord?.name ?? ''),
      colorConsumedKg: colorManuallyEdited ? current.colorConsumedKg : (firstColorRecord ? String(firstColorRecord.weightKg) : ''),
      brand: brandManuallyEdited ? current.brand : (firstRawMaterialRecord?.name ?? ''),
    }));
  }, [editingId, rawMaterialFromInventory, firstChemicalRecord, firstColorRecord, firstRawMaterialRecord, rawManuallyEdited, chemicalManuallyEdited, colorManuallyEdited, brandManuallyEdited]);

  const startEdit = (row: ExtruderRow) => {
    setDraft({
      size: row.size,
      color: row.color,
      brand: row.brand,
      chemical: row.chemical,
      raw: String(row.raw),
      chemicalKg: String(row.chemicalKg),
      output: String(row.output),
      colorConsumedKg: row.colorConsumedKg ? String(row.colorConsumedKg) : '',
      lumpsKg: String(row.lumpsKg),
      yarnWasteKg: String(row.yarnWasteKg),
    });
    // Editing an existing saved record — its values are the record's own,
    // never Inventory-derived suggestions to keep syncing (the sync effect
    // is scoped to editingId === 'new' anyway, but keep this consistent).
    setRawManuallyEdited(true);
    setChemicalManuallyEdited(true);
    setColorManuallyEdited(true);
    setBrandManuallyEdited(true);
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyExtruderDraft);
    setRawManuallyEdited(false);
    setChemicalManuallyEdited(false);
    setColorManuallyEdited(false);
    setBrandManuallyEdited(false);
  };

  const handleSave = async (): Promise<boolean | void> => {
    const sizeId = findIdByName(lookups.sizes, draft.size);
    const colorId = findIdByName(lookups.colors, draft.color);
    const brandId = findIdByName(lookups.brands, draft.brand);
    const chemicalId = findIdByName(lookups.chemicals, draft.chemical);
    if (!sizeId || !colorId || !brandId || !chemicalId) {
      console.error('Unable to resolve size/color/brand/chemical to a known master data id');
      return;
    }

    const isNew = editingId === 'new';
    setSaving(true);
    try {
      const basePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        sizeId,
        colorId,
        brandId,
        chemicalId,
        rawMaterialKg: parseFloat(draft.raw) || 0,
        chemicalKg: parseFloat(draft.chemicalKg) || 0,
        yarnOutputKg: parseFloat(draft.output) || 0,
        // Omitted (not just 0) when there's no matching Color inventory, so
        // the backend falls back to its own standard-based auto-computation.
        ...(draft.colorConsumedKg ? { colorConsumedKg: parseFloat(draft.colorConsumedKg) || 0 } : {}),
      };
      // The update endpoint doesn't accept lumpsKg/yarnWasteKg at all (unlike create).
      const payload: ExtruderCreatePayload | ExtruderUpdatePayload = isNew
        ? { ...basePayload, lumpsKg: parseFloat(draft.lumpsKg) || 0, yarnWasteKg: parseFloat(draft.yarnWasteKg) || 0 }
        : basePayload;

      const response = await fetch(
        isNew ? apiUrl('/production/extruder') : apiUrl(`/production/extruder/${editingId}`),
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error('Failed to save entry');

      await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      cancelEdit();
      return true;
    } catch (error) {
      console.error('Error saving extruder entry:', error);
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (readOnly) return true;
      // If we're not adding/editing, nothing to save
      if (!editingId) return true;
      // If draft is completely empty, ignore
      if (JSON.stringify(draft) === JSON.stringify(emptyExtruderDraft)) return true;
      
      const success = await handleSave();
      return success ?? false;
    }
  }));

  return (
    <div className="rounded-xl border border-green-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-green-100 p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-green-200 bg-green-50 text-xs font-bold text-green-700">
            EX
          </div>
          <h2 className="font-bold text-gray-900">Extruded Production – Entry</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Raw material</span>
            <Input type="number" className="h-8 w-24 text-right" value={totals.raw.toFixed(2)} readOnly />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Yarn output</span>
            <Input type="number" className="h-8 w-24 text-right" value={totals.output.toFixed(2)} readOnly />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Size</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Color</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Brand</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Chemical</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Raw Material (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Chem. Wt (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Yarn Output (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Lumps</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Yarn Waste</TableHead>
              {!readOnly && <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 9 : 10} className="h-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map((row) =>
                  !readOnly && editingId === row.id ? (
                    <ExtruderEditableRow
                      key={row.id}
                      draft={draft}
                      setDraft={setDraft}
                      lookups={lookups}
                      saving={saving}
                      onCancel={cancelEdit}
                      resolveChemicalWeight={resolveChemicalWeight}
                      resolveColorWeight={resolveColorWeight}
                      onRawManualEdit={() => setRawManuallyEdited(true)}
                      onChemicalManualEdit={() => setChemicalManuallyEdited(true)}
                      onColorManualEdit={() => setColorManuallyEdited(true)}
                      onBrandManualEdit={() => setBrandManuallyEdited(true)}
                    />
                  ) : (
                    <TableRow key={row.id}>
                      <TableCell>{row.size}</TableCell>
                      <TableCell>{row.color}</TableCell>
                      <TableCell>{row.brand}</TableCell>
                      <TableCell>{row.chemical}</TableCell>
                      <TableCell className="text-center">{row.raw.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{row.chemicalKg.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{row.output.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{row.lumpsKg.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{row.yarnWasteKg.toFixed(2)}</TableCell>
                      {!readOnly && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
                            aria-label="Edit row"
                            onClick={() => startEdit(row)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ),
                )}
                {!readOnly && editingId === 'new' && (
                  <ExtruderEditableRow
                    draft={draft}
                    setDraft={setDraft}
                    lookups={lookups}
                    saving={saving}
                    onCancel={cancelEdit}
                    resolveChemicalWeight={resolveChemicalWeight}
                    resolveColorWeight={resolveColorWeight}
                    onRawManualEdit={() => setRawManuallyEdited(true)}
                    onChemicalManualEdit={() => setChemicalManuallyEdited(true)}
                    onColorManualEdit={() => setColorManuallyEdited(true)}
                  />
                )}
                {rows.length === 0 && editingId !== 'new' && (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 9 : 10} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="p-4 border-t border-gray-50 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
            onClick={startAdd}
            disabled={editingId !== null}
          >
            <Plus className="h-3 w-3" /> Add row
          </Button>
          {editingId !== null && (
            <span className="text-2xs text-gray-400">Saved when you click &ldquo;Save day entry&rdquo; below</span>
          )}
        </div>
      )}
    </div>
  );
});

interface ExtruderEditableRowProps {
  draft: ExtruderDraft;
  setDraft: (draft: ExtruderDraft) => void;
  lookups: Lookups;
  saving: boolean;
  onCancel: () => void;
  resolveChemicalWeight: (name: string) => number | undefined;
  resolveColorWeight: (name: string) => number | undefined;
  /** Called the moment the user directly edits a field that can also be
   * Inventory-auto-filled, so the parent stops re-syncing it from Inventory. */
  onRawManualEdit?: () => void;
  onChemicalManualEdit?: () => void;
  onColorManualEdit?: () => void;
  onBrandManualEdit?: () => void;
}

function ExtruderEditableRow({
  draft,
  setDraft,
  lookups,
  saving,
  onCancel,
  resolveChemicalWeight,
  resolveColorWeight,
  onRawManualEdit,
  onChemicalManualEdit,
  onColorManualEdit,
  onBrandManualEdit,
}: ExtruderEditableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Select value={draft.size || undefined} onValueChange={(value) => setDraft({ ...draft, size: value })}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
          <SelectContent>
            {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={draft.color || undefined}
          onValueChange={(value) => {
            onColorManualEdit?.();
            const colorKg = resolveColorWeight(value);
            setDraft({ ...draft, color: value, colorConsumedKg: colorKg !== undefined ? String(colorKg) : '' });
          }}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder="Color" /></SelectTrigger>
          <SelectContent>
            {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={draft.brand || undefined}
          onValueChange={(value) => {
            onBrandManualEdit?.();
            setDraft({ ...draft, brand: value });
          }}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            {lookups.brands.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={draft.chemical || undefined}
          onValueChange={(value) => {
            onChemicalManualEdit?.();
            const chemKg = resolveChemicalWeight(value);
            setDraft({ ...draft, chemical: value, chemicalKg: chemKg !== undefined ? String(chemKg) : draft.chemicalKg });
          }}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder="Chemical" /></SelectTrigger>
          <SelectContent>
            {lookups.chemicals.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.raw} onChange={(e) => { onRawManualEdit?.(); setDraft({ ...draft, raw: e.target.value }); }} /></TableCell>
      <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.chemicalKg} onChange={(e) => { onChemicalManualEdit?.(); setDraft({ ...draft, chemicalKg: e.target.value }); }} /></TableCell>
      <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.output} onChange={(e) => setDraft({ ...draft, output: e.target.value })} /></TableCell>
      <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.lumpsKg} onChange={(e) => setDraft({ ...draft, lumpsKg: e.target.value })} /></TableCell>
      <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.yarnWasteKg} onChange={(e) => setDraft({ ...draft, yarnWasteKg: e.target.value })} /></TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Cancel" onClick={onCancel} disabled={saving}>
            <XIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export interface LoomRow {
  id: string;
  size: string;
  color: string;
  input: number;
  output: number;
  loomsWasteKg: number;
}

export function mapLoomItem(item: LoomsProductionItem): LoomRow {
  return {
    id: item.id,
    size: item.size?.name ?? '',
    color: item.color?.name ?? '',
    input: item.loom?.yarnInputKg ?? 0,
    output: item.loom?.fabricOutputKg ?? 0,
    loomsWasteKg: sumWastageByCode(item.wastages, 'LOOMS_WASTE'),
  };
}

interface LoomDraft {
  size: string;
  color: string;
  input: string;
  output: string;
  loomsWasteKg: string;
}

const emptyLoomDraft: LoomDraft = { size: '', color: '', input: '', output: '', loomsWasteKg: '' };

/**
 * Looms only has create/list/get endpoints — no edit, approve, or reject yet
 * — so unlike ExtruderSection, existing rows are read-only and there's no
 * per-row Action column; the only mutation is adding a brand-new row via
 * POST /production/looms.
 */
export const LoomSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useLoomsProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  // Same-day Color inventory, used to auto-suggest Yarn Input (kg) when the
  // user picks a Color below — fills the existing field, adds nothing new.
  const { data: inventoryData } = useInventoryRecords(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !readOnly,
  );
  const inventoryRecords = useMemo(() => inventoryData?.data ?? [], [inventoryData]);
  const firstColorRecord = useMemo(() => inventoryRecords.find((r) => r.type === 'COLOR'), [inventoryRecords]);
  const resolveColorWeight = (name: string) => {
    const kg = sumInventoryWeight(inventoryRecords, 'COLOR', name);
    return kg > 0 ? kg : undefined;
  };

  const rows = useMemo(() => {
    // See ExtruderSection's rows useMemo: `enabled: false` doesn't hide
    // data already cached under this exact query key from another instance.
    if (hideExisting) return [];
    const items = data?.data ?? [];
    return items
      .filter((item) => !productionDate || item.productionDate.startsWith(productionDate))
      .map(mapLoomItem)
      .filter((row) => row.input > 0 || row.output > 0 || row.loomsWasteKg > 0);
  }, [data, productionDate, hideExisting]);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<LoomDraft>(emptyLoomDraft);
  const [saving, setSaving] = useState(false);
  const hasAutoAddedRef = useRef(false);
  // See ExtruderSection: tracks whether the user has personally edited
  // Color/Yarn-Input. Starts false (untouched) and only flips to true from
  // an actual Select interaction — never from "nothing to suggest right
  // now" — so it correctly re-arms when the date changes to one that does
  // have matching stock.
  const [colorManuallyEdited, setColorManuallyEdited] = useState(false);

  // Header totals reflect saved rows plus, while a brand-new row is being
  // filled in, that row's own (possibly auto-filled) values.
  const totals = useMemo(() => {
    const base = rows.reduce((acc, row) => ({ input: acc.input + row.input, output: acc.output + row.output }), { input: 0, output: 0 });
    if (adding) {
      base.input += parseFloat(draft.input) || 0;
      base.output += parseFloat(draft.output) || 0;
    }
    return base;
  }, [rows, adding, draft.input, draft.output]);

  const startAdd = useCallback(() => {
    setDraft({
      ...emptyLoomDraft,
      color: firstColorRecord?.name ?? '',
      input: firstColorRecord ? String(firstColorRecord.weightKg) : '',
    });
    setColorManuallyEdited(false);
    setAdding(true);
  }, [firstColorRecord]);

  useEffect(() => {
    if (readOnly || !autoAdd || isLoading || hasAutoAddedRef.current) return;
    if (rows.length === 0 && !adding) {
      hasAutoAddedRef.current = true;
      // One-shot: open a blank draft row the first time this date resolves
      // with no existing records. The ref above guarantees this only ever
      // fires once per mount, so it can't cascade into further renders.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startAdd();
    }
  }, [readOnly, autoAdd, isLoading, rows.length, adding, startAdd]);

  // Keep an untouched draft synced to Inventory as it changes — whether
  // that's the user picking a different date, or editing/deleting the
  // matching Inventory record while this form is open — including clearing
  // Color/Yarn-Input back out if the match disappears. Stops the moment the
  // user manually picks a Color themselves (see the Select's onValueChange).
  useEffect(() => {
    if (!adding || colorManuallyEdited) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) => ({
      ...current,
      color: firstColorRecord?.name ?? '',
      input: firstColorRecord ? String(firstColorRecord.weightKg) : '',
    }));
  }, [adding, colorManuallyEdited, firstColorRecord]);

  const cancelAdd = () => {
    setAdding(false);
    setDraft(emptyLoomDraft);
    setColorManuallyEdited(false);
  };

  const handleSave = async () => {
    const sizeId = findIdByName(lookups.sizes, draft.size);
    const colorId = findIdByName(lookups.colors, draft.color);
    if (!sizeId || !colorId) {
      console.error('Unable to resolve size/color to a known master data id');
      return;
    }

    setSaving(true);
    try {
      const payload: LoomsCreatePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        sizeId,
        colorId,
        yarnInputKg: parseFloat(draft.input) || 0,
        fabricOutputKg: parseFloat(draft.output) || 0,
        loomsWasteKg: parseFloat(draft.loomsWasteKg) || 0,
      };

      const response = await fetch(apiUrl('/production/looms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save entry');

      await queryClient.invalidateQueries({ queryKey: loomsKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      cancelAdd();
      return true;
    } catch (error) {
      console.error('Error saving loom entry:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (readOnly) return true;
      if (!adding) return true;
      if (JSON.stringify(draft) === JSON.stringify(emptyLoomDraft)) return true;
      const success = await handleSave();
      return success ?? false;
    }
  }));

  const theme = themes.blue;

  return (
    <div className={`rounded-xl border ${theme.border} bg-white shadow-sm overflow-hidden`}>
      <div className={`border-b ${theme.headerBorder} p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded border ${theme.badgeBorder} ${theme.badgeBg} text-xs font-bold ${theme.badgeText}`}>
            LM
          </div>
          <h2 className="font-bold text-gray-900">Loom Production – Entry</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Yarn input</span>
            <Input type="number" className="h-8 w-24 text-right" value={totals.input.toFixed(2)} readOnly />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Fabric output</span>
            <Input type="number" className="h-8 w-24 text-right" value={totals.output.toFixed(2)} readOnly />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Size</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Color</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Yarn Input (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Fabric Output (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Looms Waste</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.size}</TableCell>
                    <TableCell>{row.color}</TableCell>
                    <TableCell className="text-center">{row.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.output.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.loomsWasteKg.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {!readOnly && adding && (
                  <TableRow>
                    <TableCell>
                      <Select value={draft.size || undefined} onValueChange={(value) => setDraft({ ...draft, size: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                          {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft.color || undefined}
                        onValueChange={(value) => {
                          setColorManuallyEdited(true);
                          const colorKg = resolveColorWeight(value);
                          setDraft({ ...draft, color: value, input: colorKg !== undefined ? String(colorKg) : draft.input });
                        }}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>
                          {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-10 w-full text-center" value={draft.input} onChange={(e) => { setColorManuallyEdited(true); setDraft({ ...draft, input: e.target.value }); }} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-10 w-full text-center" value={draft.output} onChange={(e) => setDraft({ ...draft, output: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="h-10 w-full text-center" value={draft.loomsWasteKg} onChange={(e) => setDraft({ ...draft, loomsWasteKg: e.target.value })} />
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 shrink-0" aria-label="Cancel" onClick={cancelAdd} disabled={saving}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {rows.length === 0 && !adding && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="p-4 border-t border-gray-50 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`h-8 gap-1 rounded-full ${theme.buttonBorder} ${theme.buttonText} ${theme.buttonHover}`}
            onClick={startAdd}
            disabled={adding}
          >
            <Plus className="h-3 w-3" /> Add row
          </Button>
          {adding && (
            <span className="text-2xs text-gray-400">Saved when you click &ldquo;Save day entry&rdquo; below</span>
          )}
        </div>
      )}
    </div>
  );
});

export interface FabricRow {
  id: string;
  size: string;
  color: string;
  input: number;
  pieceCount: number;
  firstGrade: number;
  secondGrade: number;
  fwKg: number;
  bwKg: number;
}

export function mapFabricItem(item: FabricCheckingRecord): FabricRow {
  return {
    id: item.id,
    size: item.size?.name ?? '',
    color: item.color?.name ?? '',
    input: item.fabricCheck?.fabricInputKg ?? 0,
    pieceCount: item.fabricCheck?.pieceCount ?? 0,
    firstGrade: item.fabricCheck?.firstGradeKg ?? 0,
    secondGrade: item.fabricCheck?.secondGradeKg ?? 0,
    fwKg: sumWastageByCode(item.wastages, 'FW'),
    bwKg: sumWastageByCode(item.wastages, 'BW'),
  };
}

interface FabricDraft {
  size: string;
  color: string;
  input: string;
  pieceCount: string;
  firstGrade: string;
  secondGrade: string;
  fwKg: string;
  bwKg: string;
}

const emptyFabricDraft: FabricDraft = { size: '', color: '', input: '', pieceCount: '', firstGrade: '', secondGrade: '', fwKg: '', bwKg: '' };

/**
 * Fabric Checking lives at /fabric-checking (not nested under /production)
 * and — like Looms — only has create/list/get, no edit yet, so existing
 * rows are read-only and the only mutation is adding a new row via POST.
 */
export const FabricSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useFabricCheckingRecords(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  // Same-day Color inventory, used to auto-suggest Fabric Input (kg) when the
  // user picks a Color below — fills the existing field, adds nothing new.
  const { data: inventoryData } = useInventoryRecords(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !readOnly,
  );
  const inventoryRecords = useMemo(() => inventoryData?.data ?? [], [inventoryData]);
  const firstColorRecord = useMemo(() => inventoryRecords.find((r) => r.type === 'COLOR'), [inventoryRecords]);
  const resolveColorWeight = (name: string) => {
    const kg = sumInventoryWeight(inventoryRecords, 'COLOR', name);
    return kg > 0 ? kg : undefined;
  };

  const rows = useMemo(() => {
    // See ExtruderSection's rows useMemo: `enabled: false` doesn't hide
    // data already cached under this exact query key from another instance.
    if (hideExisting) return [];
    const items = data?.data ?? [];
    return items
      .filter((item) => !productionDate || item.productionDate.startsWith(productionDate))
      .map(mapFabricItem)
      .filter((row) => row.input > 0 || row.firstGrade > 0 || row.secondGrade > 0 || row.fwKg > 0 || row.bwKg > 0);
  }, [data, productionDate, hideExisting]);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<FabricDraft>(emptyFabricDraft);
  const [saving, setSaving] = useState(false);
  const hasAutoAddedRef = useRef(false);
  // See ExtruderSection: tracks whether the user has personally edited
  // Color/Fabric-Input. Starts false (untouched) and only flips to true
  // from an actual Select interaction — never from "nothing to suggest
  // right now" — so it correctly re-arms when the date changes to one that
  // does have matching stock.
  const [colorManuallyEdited, setColorManuallyEdited] = useState(false);

  // Header totals reflect saved rows plus, while a brand-new row is being
  // filled in, that row's own (possibly auto-filled) values.
  const totals = useMemo(() => {
    const base = rows.reduce(
      (acc, row) => ({
        input: acc.input + row.input,
        checked: acc.checked + row.firstGrade + row.secondGrade,
      }),
      { input: 0, checked: 0 },
    );
    if (adding) {
      base.input += parseFloat(draft.input) || 0;
      base.checked += (parseFloat(draft.firstGrade) || 0) + (parseFloat(draft.secondGrade) || 0);
    }
    return base;
  }, [rows, adding, draft.input, draft.firstGrade, draft.secondGrade]);

  const startAdd = useCallback(() => {
    setDraft({
      ...emptyFabricDraft,
      color: firstColorRecord?.name ?? '',
      input: firstColorRecord ? String(firstColorRecord.weightKg) : '',
    });
    setColorManuallyEdited(false);
    setAdding(true);
  }, [firstColorRecord]);

  useEffect(() => {
    if (readOnly || !autoAdd || isLoading || hasAutoAddedRef.current) return;
    if (rows.length === 0 && !adding) {
      hasAutoAddedRef.current = true;
      // One-shot: open a blank draft row the first time this date resolves
      // with no existing records. The ref above guarantees this only ever
      // fires once per mount, so it can't cascade into further renders.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startAdd();
    }
  }, [readOnly, autoAdd, isLoading, rows.length, adding, startAdd]);

  // Keep an untouched draft synced to Inventory as it changes — whether
  // that's the user picking a different date, or editing/deleting the
  // matching Inventory record while this form is open — including clearing
  // Color/Fabric-Input back out if the match disappears. Stops the moment
  // the user manually picks a Color themselves (see the Select's
  // onValueChange).
  useEffect(() => {
    if (!adding || colorManuallyEdited) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) => ({
      ...current,
      color: firstColorRecord?.name ?? '',
      input: firstColorRecord ? String(firstColorRecord.weightKg) : '',
    }));
  }, [adding, colorManuallyEdited, firstColorRecord]);

  const cancelAdd = () => {
    setAdding(false);
    setDraft(emptyFabricDraft);
    setColorManuallyEdited(false);
  };

  const handleSave = async () => {
    const sizeId = findIdByName(lookups.sizes, draft.size);
    const colorId = findIdByName(lookups.colors, draft.color);
    if (!sizeId || !colorId) {
      console.error('Unable to resolve size/color to a known master data id');
      return;
    }

    setSaving(true);
    try {
      const payload: FabricCheckingCreatePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        sizeId,
        colorId,
        fabricInputKg: parseFloat(draft.input) || 0,
        pieceCount: parseInt(draft.pieceCount, 10) || 0,
        firstGradeKg: parseFloat(draft.firstGrade) || 0,
        secondGradeKg: parseFloat(draft.secondGrade) || 0,
        fwKg: parseFloat(draft.fwKg) || 0,
        bwKg: parseFloat(draft.bwKg) || 0,
      };

      const response = await fetch(apiUrl('/fabric-checking'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save entry');

      await queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      cancelAdd();
      return true;
    } catch (error) {
      console.error('Error saving fabric checking entry:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (readOnly) return true;
      if (!adding) return true;
      if (JSON.stringify(draft) === JSON.stringify(emptyFabricDraft)) return true;
      const success = await handleSave();
      return success ?? false;
    }
  }));

  const theme = themes.purple;

  return (
    <div className={`rounded-xl border ${theme.border} bg-white shadow-sm overflow-hidden`}>
      <div className={`border-b ${theme.headerBorder} p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded border ${theme.badgeBorder} ${theme.badgeBg} text-xs font-bold ${theme.badgeText}`}>
            FB
          </div>
          <h2 className="font-bold text-gray-900">Fabric Checking – Entry</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Fabric input</span>
            <Input type="number" className="h-8 w-24 text-right" value={totals.input.toFixed(2)} readOnly />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Checked</span>
            <Input type="number" className="h-8 w-24 text-right" value={totals.checked.toFixed(2)} readOnly />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Size</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Color</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Fabric Input (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Pieces</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">1st Grade (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">2nd Grade (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">FW</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">BW</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.size}</TableCell>
                    <TableCell>{row.color}</TableCell>
                    <TableCell className="text-center">{row.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.pieceCount}</TableCell>
                    <TableCell className="text-center">{row.firstGrade.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.secondGrade.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.fwKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.bwKg.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {!readOnly && adding && (
                  <TableRow>
                    <TableCell>
                      <Select value={draft.size || undefined} onValueChange={(value) => setDraft({ ...draft, size: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                          {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft.color || undefined}
                        onValueChange={(value) => {
                          setColorManuallyEdited(true);
                          const colorKg = resolveColorWeight(value);
                          setDraft({ ...draft, color: value, input: colorKg !== undefined ? String(colorKg) : draft.input });
                        }}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>
                          {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.input} onChange={(e) => { setColorManuallyEdited(true); setDraft({ ...draft, input: e.target.value }); }} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.pieceCount} onChange={(e) => setDraft({ ...draft, pieceCount: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.firstGrade} onChange={(e) => setDraft({ ...draft, firstGrade: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.secondGrade} onChange={(e) => setDraft({ ...draft, secondGrade: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={draft.fwKg} onChange={(e) => setDraft({ ...draft, fwKg: e.target.value })} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="h-10 w-full text-center" value={draft.bwKg} onChange={(e) => setDraft({ ...draft, bwKg: e.target.value })} />
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 shrink-0" aria-label="Cancel" onClick={cancelAdd} disabled={saving}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {rows.length === 0 && !adding && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="p-4 border-t border-gray-50 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`h-8 gap-1 rounded-full ${theme.buttonBorder} ${theme.buttonText} ${theme.buttonHover}`}
            onClick={startAdd}
            disabled={adding}
          >
            <Plus className="h-3 w-3" /> Add row
          </Button>
          {adding && (
            <span className="text-2xs text-gray-400">Saved when you click &ldquo;Save day entry&rdquo; below</span>
          )}
        </div>
      )}
    </div>
  );
});

export type { Theme };
