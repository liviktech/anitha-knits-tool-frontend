import { useMemo, useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { Plus, Edit2, Trash2, X as XIcon } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
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
  type LoomsUpdatePayload,
} from '@/features/looms/loom-queries';
import {
  useFabricCheckingRecords,
  fabricCheckingKeys,
  type FabricCheckingRecord,
  type FabricCheckingCreatePayload,
  type FabricCheckingUpdatePayload,
} from '@/features/fabric/fabric-queries';
import { useLoadSentRecords, loadSentKeys, type LoadSentRecord } from '@/features/inventory/load-sent-queries';
import { dashboardProductionKey } from './day-wise-queries';

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

export const themes = {
  extruder: {
    border: 'border-gray-400',
    headerBg: 'bg-[#D6EEF7]',
    headerText: 'text-[#0B5566]',
    iconBg: 'bg-[#0B5566]',
    iconColor: 'text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
  looms: {
    border: 'border-gray-400',
    headerBg: 'bg-[#FFF6BF]',
    headerText: 'text-[#7A6A00]',
    iconBg: 'bg-[#7A6A00]',
    iconColor: 'text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
  fabric: {
    border: 'border-gray-400',
    headerBg: 'bg-[#DCEEDB]',
    headerText: 'text-[#2F6B2F]',
    iconBg: 'bg-[#2F6B2F]',
    iconColor: 'text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
  fabricDelivered: {
    border: 'border-gray-400',
    headerBg: 'bg-[#f2caa0]',
    headerText: 'text-[#61401E]',
    iconBg: 'bg-[#61401E]',
    iconColor: 'text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
} as const;

export type Theme = keyof typeof themes;

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

export interface ExtruderDraft {
  size: string;
  color: string;
  brand: string;
  chemical: string;
  raw: string;
  chemicalKg: string;
  output: string;
  colorConsumedKg: string;
  lumpsKg: string;
  yarnWasteKg: string;
}

export const emptyExtruderDraft: ExtruderDraft = { size: '', color: '', brand: '', chemical: '', raw: '', chemicalKg: '', output: '', colorConsumedKg: '', lumpsKg: '', yarnWasteKg: '' };

/** One pending (unsaved) new-entry row — several of these can be open at once. */
export interface ExtruderNewRow {
  key: string;
  draft: ExtruderDraft;
  outputManuallyEdited: boolean;
}

/**
 * Suggests Yarn Output as a mass balance — raw material + chemical + colour
 * consumed, minus recorded waste — so it pre-fills as the user enters
 * input/waste but can still be typed over freely (see outputManuallyEdited).
 * Chemical/colour mass is ADDED during extrusion (PRD), so this is not a
 * simple input-minus-waste subtraction. Never negative; blank until there's
 * something to suggest.
 */
export function suggestExtruderOutput(draft: Pick<ExtruderDraft, 'raw' | 'chemicalKg' | 'colorConsumedKg' | 'lumpsKg' | 'yarnWasteKg'>): string {
  const inputMassKg = (parseFloat(draft.raw) || 0) + (parseFloat(draft.chemicalKg) || 0) + (parseFloat(draft.colorConsumedKg) || 0);
  const wasteKg = (parseFloat(draft.lumpsKg) || 0) + (parseFloat(draft.yarnWasteKg) || 0);
  const suggested = Math.max(0, inputMassKg - wasteKg);
  return suggested > 0 ? suggested.toFixed(2) : '';
}

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
export interface SectionProps {
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
  /** Hides the colored title banner when rendered inside a tab. */
  hideBanner?: boolean;
}

export interface SectionRef {
  saveDraft: () => Promise<boolean>;
}

export { ExtruderSection } from '@/features/extruder/extruder-section-new';

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

/** One pending (unsaved) new-entry row — several of these can be open at once. */
interface LoomNewRow {
  key: string;
  draft: LoomDraft;
  outputManuallyEdited: boolean;
}

/**
 * Suggests Fabric Output as Yarn Input minus Looms Waste, so it pre-fills as
 * the user enters input/waste but can still be typed over freely (see
 * outputManuallyEdited). Never negative; blank until there's something to suggest.
 */
function suggestLoomOutput(draft: Pick<LoomDraft, 'input' | 'loomsWasteKg'>): string {
  const suggested = Math.max(0, (parseFloat(draft.input) || 0) - (parseFloat(draft.loomsWasteKg) || 0));
  return suggested > 0 ? suggested.toFixed(2) : '';
}

/**
 * Looms only has create/list/get endpoints — no edit, approve, or reject yet
 * — so unlike ExtruderSection, existing rows are read-only; the only mutation
 * is adding a brand-new row via
 * POST /production/looms.
 */



export const LoomSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting, hideBanner }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useLoomsProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<LoomDraft>(emptyLoomDraft);
  const [newRows, setNewRows] = useState<LoomNewRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LoomRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const hasAutoAddedRef = useRef(false);
  const nextRowKeyRef = useRef(0);

  // Appends a fresh blank draft row — never blocked by other rows already
  // being open, so multiple new entries can be filled in before Save. Every
  // field starts empty; nothing is auto-filled from Inventory — only Output
  // reacts once the user has entered real values (see suggestLoomOutput /
  // updateNewRow below).
  const startAdd = useCallback(() => {
    setNewRows((current) => [
      ...current,
      { key: `new-${nextRowKeyRef.current++}`, draft: { ...emptyLoomDraft }, outputManuallyEdited: false },
    ]);
  }, []);

  useEffect(() => {
    if (readOnly || !autoAdd || isLoading || hasAutoAddedRef.current) return;
    if (newRows.length === 0) {
      hasAutoAddedRef.current = true;
      startAdd();
    }
  }, [readOnly, autoAdd, isLoading, newRows.length, startAdd]);

  // Single choke point for every field edit on a new row — recomputes the
  // suggested Fabric Output from the row's own values unless the user has
  // typed into Output directly.
  const updateNewRow = (key: string, draft: LoomDraft) => {
    setNewRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        return { ...row, draft: row.outputManuallyEdited ? draft : { ...draft, output: suggestLoomOutput(draft) } };
      }),
    );
  };
  const markNewRowOutputManualEdit = (key: string) => {
    setNewRows((current) => current.map((row) => (row.key === key ? { ...row, outputManuallyEdited: true } : row)));
  };
  const removeNewRow = (key: string) => {
    setNewRows((current) => current.filter((row) => row.key !== key));
  };

  const startEdit = (row: LoomRow) => {
    setEditDraft({
      size: row.size,
      color: row.color,
      input: String(row.input),
      output: String(row.output),
      loomsWasteKg: String(row.loomsWasteKg),
    });
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyLoomDraft);
  };

  const handleSaveExisting = async (): Promise<boolean> => {
    const sizeId = findIdByName(lookups.sizes, editDraft.size);
    const colorId = findIdByName(lookups.colors, editDraft.color);
    if (!sizeId || !colorId) {
      setErrorMessage('Select Size and Color before saving.');
      return false;
    }
    if (!((parseFloat(editDraft.input) || 0) > 0)) {
      setErrorMessage('Enter Yarn Input (kg) — it must be greater than 0.');
      return false;
    }
    if (!((parseFloat(editDraft.output) || 0) > 0)) {
      setErrorMessage('Enter Fabric Output (kg) — it must be greater than 0.');
      return false;
    }

    try {
      const payload: LoomsUpdatePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        sizeId,
        colorId,
        yarnInputKg: parseFloat(editDraft.input) || 0,
        fabricOutputKg: parseFloat(editDraft.output) || 0,
        loomsWasteKg: parseFloat(editDraft.loomsWasteKg) || 0,
      };

      const response = await apiFetch(`/production/looms/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setErrorMessage(await extractApiErrorMessage(response, 'Failed to save the entry. Please try again.'));
        return false;
      }

      await queryClient.invalidateQueries({ queryKey: loomsKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      cancelEdit();
      return true;
    } catch (error) {
      console.error('Error saving loom entry:', error);
      setErrorMessage('Failed to save the entry. Please try again.');
      return false;
    }
  };

  const handleSaveNewRow = async (row: LoomNewRow): Promise<boolean> => {
    const sizeId = findIdByName(lookups.sizes, row.draft.size);
    const colorId = findIdByName(lookups.colors, row.draft.color);
    if (!sizeId || !colorId) {
      setErrorMessage('Select Size and Color before saving.');
      return false;
    }
    if (!((parseFloat(row.draft.input) || 0) > 0)) {
      setErrorMessage('Enter Yarn Input (kg) — it must be greater than 0.');
      return false;
    }
    if (!((parseFloat(row.draft.output) || 0) > 0)) {
      setErrorMessage('Enter Fabric Output (kg) — it must be greater than 0.');
      return false;
    }

    try {
      const payload: LoomsCreatePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        sizeId,
        colorId,
        yarnInputKg: parseFloat(row.draft.input) || 0,
        fabricOutputKg: parseFloat(row.draft.output) || 0,
        loomsWasteKg: parseFloat(row.draft.loomsWasteKg) || 0,
      };
      const response = await apiFetch('/production/looms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setErrorMessage(await extractApiErrorMessage(response, 'Failed to save one or more entries. Please try again.'));
      }
      return response.ok;
    } catch (error) {
      console.error('Error saving loom entry:', error);
      setErrorMessage('Failed to save one or more entries. Please try again.');
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (readOnly) return true;
      let allOk = true;
      setSaving(true);
      setErrorMessage(null);
      try {
        if (editingId && JSON.stringify(editDraft) !== JSON.stringify(emptyLoomDraft)) {
          const ok = await handleSaveExisting();
          if (!ok) allOk = false;
        }

        // Blank/untouched rows are silently skipped rather than treated as
        // failures — they simply stay open for the user to fill in later.
        const rowsToSave = newRows.filter((row) => JSON.stringify(row.draft) !== JSON.stringify(emptyLoomDraft));
        if (rowsToSave.length > 0) {
          const results = await Promise.all(rowsToSave.map((row) => handleSaveNewRow(row)));
          const succeededKeys = new Set(rowsToSave.filter((_, i) => results[i]).map((row) => row.key));
          if (succeededKeys.size > 0) {
            setNewRows((current) => current.filter((row) => !succeededKeys.has(row.key)));
            await queryClient.invalidateQueries({ queryKey: loomsKeys.all });
            await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
          }
          if (succeededKeys.size < rowsToSave.length) allOk = false;
        }
      } finally {
        setSaving(false);
      }
      return allOk;
    },
  }));

  const handleDeleteRow = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiFetch(`/production/looms/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete loom entry');
      await queryClient.invalidateQueries({ queryKey: loomsKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting loom entry:', error);
    } finally {
      setDeleting(false);
    }
  };

  const theme = themes.looms;
  const roundedClass = hideBanner ? 'rounded-b-xl rounded-tr-xl rounded-tl-none' : 'rounded-xl';

  return (
    <div className={`${roundedClass} border ${theme.border} bg-white shadow-sm overflow-hidden`}>
      {!hideBanner && (
        <div className={`p-3 ${theme.headerBg} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className={`flex items-center gap-3 text-[13px] font-extrabold ${theme.headerText} uppercase tracking-wider`}>
            <div className={`${theme.iconBg} ${theme.iconColor} h-5 w-5 flex items-center justify-center rounded-sm text-[10px] font-bold`}>
              2
            </div>
            LOOMS PRODUCTION (KG)
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Size</TableHead>
              <TableHead className={`w-37.5 min-w-37.5 text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Color</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Loom Production (kg)</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Looms/Yarn Waste</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Fabric production (kg)</TableHead>
              {!readOnly && <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="h-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {!readOnly &&
                  newRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Select value={row.draft.size} onValueChange={(value) => updateNewRow(row.key, { ...row.draft, size: value })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                          <SelectContent>
                            {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-37.5 min-w-37.5 text-center">
                        <Select
                          value={row.draft.color}
                          onValueChange={(value) => updateNewRow(row.key, { ...row.draft, color: value })}
                        >
                          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Color" /></SelectTrigger>
                          <SelectContent>
                            {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                                            <TableCell>
                        <Input
                          type="number"
                          className="h-10 w-full text-center"
                          value={row.draft.input}
                          onChange={(e) => updateNewRow(row.key, { ...row.draft, input: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-10 w-full text-center"
                          value={row.draft.loomsWasteKg}
                          onChange={(e) => updateNewRow(row.key, { ...row.draft, loomsWasteKg: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="h-10 w-full text-center"
                            value={row.draft.output}
                            placeholder="suggested"
                            onChange={(e) => { markNewRowOutputManualEdit(row.key); updateNewRow(row.key, { ...row.draft, output: e.target.value }); }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Cancel" onClick={() => removeNewRow(row.key)} disabled={saving}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {!readOnly && editingId !== null && (
                  <TableRow>
                    <TableCell>
                      <Select value={editDraft.size} onValueChange={(value) => setEditDraft({ ...editDraft, size: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                          {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">
                      <Select value={editDraft.color} onValueChange={(value) => setEditDraft({ ...editDraft, color: value })}>
                        <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>
                          {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                                        <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.input} onChange={(e) => setEditDraft({ ...editDraft, input: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.loomsWasteKg} onChange={(e) => setEditDraft({ ...editDraft, loomsWasteKg: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.output} onChange={(e) => setEditDraft({ ...editDraft, output: e.target.value })} /></TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Cancel edit" onClick={cancelEdit} disabled={saving}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id} className={editingId === row.id ? 'bg-blue-50/30' : ''}>
                    <TableCell>{row.size}</TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">{row.color}</TableCell>
                    <TableCell className="text-center">{row.kora}</TableCell>
                    <TableCell className="text-center">{row.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.loomsWasteKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.output.toFixed(2)}</TableCell>
                    {!readOnly && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
                            aria-label="Edit row"
                            onClick={() => startEdit(row)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                            aria-label="Delete row"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length === 0 && newRows.length === 0 && editingId === null && (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 5 : 6} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="p-4 border-t border-gray-50 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-1 rounded-full ${theme.buttonBorder} ${theme.buttonText} ${theme.buttonHover}`}
              onClick={startAdd}
              disabled={saving}
            >
              <Plus className="h-3 w-3" /> Add row
            </Button>
          </div>
          {errorMessage && <p className="text-xs font-medium text-red-600">{errorMessage}</p>}
        </div>
      )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this loom entry?"
        description={deleteTarget ? `${deleteTarget.size} / ${deleteTarget.color} — ${deleteTarget.input.toFixed(2)} kg yarn input. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDeleteRow}
      />
    </div>
  );
});

export interface FabricRow {
  id: string;
  size: string;
  color: string;
  kora: string;
  input: number;
  /** Final Stock/Output; falls back to firstGrade+secondGrade for records created before this field existed. */
  output: number;
  /** @deprecated No longer collected via the entry UI; kept for older records and other consumers. */
  pieceCount: number;
  /** @deprecated No longer collected via the entry UI; kept for older records and other consumers. */
  firstGrade: number;
  /** @deprecated No longer collected via the entry UI; kept for older records and other consumers. */
  secondGrade: number;
  fwKg: number;
  bwKg: number;
}

export function mapFabricItem(item: FabricCheckingRecord): FabricRow {
  const firstGrade = (item.fabricCheck as any)?.firstGradeKg ?? 0;
  const secondGrade = (item.fabricCheck as any)?.secondGradeKg ?? 0;
  return {
    id: item.id,
    size: item.size?.name ?? '',
    color: item.color?.name ?? '',
    kora: (item.fabricCheck as any)?.kora ?? '',
    input: item.fabricCheck?.fabricInputKg ?? 0,
    output: item.fabricCheck?.outputKg ?? (firstGrade + secondGrade),
    pieceCount: (item.fabricCheck as any)?.pieceCount ?? 0,
    firstGrade,
    secondGrade,
    fwKg: sumWastageByCode(item.wastages, 'FW'),
    bwKg: sumWastageByCode(item.wastages, 'BW'),
  };
}

interface FabricDraft {
  size: string;
  color: string;
  kora: string;
  input: string;
  output: string;
  fwKg: string;
  bwKg: string;
}

const emptyFabricDraft: FabricDraft = { size: '', color: '', kora: '', input: '', output: '', fwKg: '', bwKg: '' };

/** One pending (unsaved) new-entry row — several of these can be open at once. */
interface FabricNewRow {
  key: string;
  draft: FabricDraft;
  outputManuallyEdited: boolean;
}

/**
 * Suggests Output/Final Stock as Fabric Input minus FW+BW wastage, so it
 * pre-fills as the user enters input/waste but can still be typed over
 * freely (see outputManuallyEdited). Never negative; blank until there's
 * something to suggest.
 */
function suggestFabricOutput(draft: Pick<FabricDraft, 'input' | 'fwKg' | 'bwKg'>): string {
  const wasteKg = (parseFloat(draft.fwKg) || 0) + (parseFloat(draft.bwKg) || 0);
  const suggested = Math.max(0, (parseFloat(draft.input) || 0) - wasteKg);
  return suggested > 0 ? suggested.toFixed(2) : '';
}

/**
 * Fabric Checking lives at /fabric-checking (not nested under /production)
 * and — like Looms — only has create/list/get, no edit yet, so existing
 * rows are read-only and the only mutation is adding a new row via POST.
 */
export const FabricSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting, hideBanner }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useFabricCheckingRecords(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FabricDraft>(emptyFabricDraft);
  const [newRows, setNewRows] = useState<FabricNewRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FabricRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const hasAutoAddedRef = useRef(false);
  const nextRowKeyRef = useRef(0);

  // Appends a fresh blank draft row — never blocked by other rows already
  // being open, so multiple new entries can be filled in before Save. Every
  // field starts empty; nothing is auto-filled from Inventory — only Output
  // reacts once the user has entered real values (see suggestFabricOutput /
  // updateNewRow below).
  const startAdd = useCallback(() => {
    setNewRows((current) => [
      ...current,
      { key: `new-${nextRowKeyRef.current++}`, draft: { ...emptyFabricDraft }, outputManuallyEdited: false },
    ]);
  }, []);

  useEffect(() => {
    if (readOnly || !autoAdd || isLoading || hasAutoAddedRef.current) return;
    if (newRows.length === 0) {
      hasAutoAddedRef.current = true;
      startAdd();
    }
  }, [readOnly, autoAdd, isLoading, newRows.length, startAdd]);

  // Single choke point for every field edit on a new row — recomputes the
  // suggested Output from the row's own values unless the user has typed
  // into Output directly.
  const updateNewRow = (key: string, draft: FabricDraft) => {
    setNewRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        return { ...row, draft: row.outputManuallyEdited ? draft : { ...draft, output: suggestFabricOutput(draft) } };
      }),
    );
  };
  const markNewRowOutputManualEdit = (key: string) => {
    setNewRows((current) => current.map((row) => (row.key === key ? { ...row, outputManuallyEdited: true } : row)));
  };
  const removeNewRow = (key: string) => {
    setNewRows((current) => current.filter((row) => row.key !== key));
  };

  const startEdit = (row: FabricRow) => {
    setEditDraft({
      size: row.size,
      color: row.color,
      input: String(row.input),
      output: String(row.output),
      fwKg: String(row.fwKg),
      bwKg: String(row.bwKg),
    });
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyFabricDraft);
  };

  const handleSaveExisting = async (): Promise<boolean> => {
    const sizeId = findIdByName(lookups.sizes, editDraft.size);
    const colorId = findIdByName(lookups.colors, editDraft.color);
    if (!sizeId || !colorId) {
      setErrorMessage('Select Size and Color before saving.');
      return false;
    }
    if (!((parseFloat(editDraft.input) || 0) > 0)) {
      setErrorMessage('Enter Fabric Input (kg) — it must be greater than 0.');
      return false;
    }

    try {
      const payload: FabricCheckingUpdatePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        sizeId,
        colorId,
        fabricInputKg: parseFloat(editDraft.input) || 0,
        outputKg: parseFloat(editDraft.output) || 0,
        fwKg: parseFloat(editDraft.fwKg) || 0,
        bwKg: parseFloat(editDraft.bwKg) || 0,
      };

      const response = await apiFetch(`/fabric-checking/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setErrorMessage(await extractApiErrorMessage(response, 'Failed to save the entry. Please try again.'));
        return false;
      }

      await queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      cancelEdit();
      return true;
    } catch (error) {
      console.error('Error saving fabric checking entry:', error);
      setErrorMessage('Failed to save the entry. Please try again.');
      return false;
    }
  };

  const handleSaveNewRow = async (row: FabricNewRow): Promise<boolean> => {
    const sizeId = findIdByName(lookups.sizes, row.draft.size);
    const colorId = findIdByName(lookups.colors, row.draft.color);
    if (!sizeId || !colorId) {
      setErrorMessage('Select Size and Color before saving.');
      return false;
    }
    if (!((parseFloat(row.draft.input) || 0) > 0)) {
      setErrorMessage('Enter Fabric Input (kg) — it must be greater than 0.');
      return false;
    }

    try {
      const payload: FabricCheckingCreatePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        sizeId,
        colorId,
        fabricInputKg: parseFloat(row.draft.input) || 0,
        outputKg: parseFloat(row.draft.output) || 0,
        fwKg: parseFloat(row.draft.fwKg) || 0,
        bwKg: parseFloat(row.draft.bwKg) || 0,
      };
      const response = await apiFetch('/fabric-checking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setErrorMessage(await extractApiErrorMessage(response, 'Failed to save one or more entries. Please try again.'));
      }
      return response.ok;
    } catch (error) {
      console.error('Error saving fabric checking entry:', error);
      setErrorMessage('Failed to save one or more entries. Please try again.');
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (readOnly) return true;
      let allOk = true;
      setSaving(true);
      setErrorMessage(null);
      try {
        if (editingId && JSON.stringify(editDraft) !== JSON.stringify(emptyFabricDraft)) {
          const ok = await handleSaveExisting();
          if (!ok) allOk = false;
        }

        // Blank/untouched rows are silently skipped rather than treated as
        // failures — they simply stay open for the user to fill in later.
        const rowsToSave = newRows.filter((row) => JSON.stringify(row.draft) !== JSON.stringify(emptyFabricDraft));
        if (rowsToSave.length > 0) {
          const results = await Promise.all(rowsToSave.map((row) => handleSaveNewRow(row)));
          const succeededKeys = new Set(rowsToSave.filter((_, i) => results[i]).map((row) => row.key));
          if (succeededKeys.size > 0) {
            setNewRows((current) => current.filter((row) => !succeededKeys.has(row.key)));
            await queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all });
            await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
          }
          if (succeededKeys.size < rowsToSave.length) allOk = false;
        }
      } finally {
        setSaving(false);
      }
      return allOk;
    },
  }));

  const handleDeleteRow = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiFetch(`/fabric-checking/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete fabric checking entry');
      await queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting fabric checking entry:', error);
    } finally {
      setDeleting(false);
    }
  };

  const theme = themes.fabric;
  const roundedClass = hideBanner ? 'rounded-b-xl rounded-tr-xl rounded-tl-none' : 'rounded-xl';

  return (
    <div className={`${roundedClass} border ${theme.border} bg-white shadow-sm overflow-hidden`}>
      {!hideBanner && (
        <div className={`p-3 ${theme.headerBg} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className={`flex items-center gap-3 text-[13px] font-extrabold ${theme.headerText} uppercase tracking-wider`}>
            <div className={`${theme.iconBg} ${theme.iconColor} h-5 w-5 flex items-center justify-center rounded-sm text-[10px] font-bold`}>
              3
            </div>
            FABRIC PRODUCTION (KG)
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Size</TableHead>
              <TableHead className={`w-37.5 min-w-37.5 text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Color</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Kora</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Fabric Production (kg)</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Fabric Waste</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Bit Waste</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Fabric Output (kg)</TableHead>
              {!readOnly && <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="h-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {!readOnly &&
                  newRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Select value={row.draft.size} onValueChange={(value) => updateNewRow(row.key, { ...row.draft, size: value })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                          <SelectContent>
                            {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-37.5 min-w-37.5 text-center">
                        <Select
                          value={row.draft.color}
                          onValueChange={(value) => updateNewRow(row.key, { ...row.draft, color: value })}
                        >
                          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Color" /></SelectTrigger>
                          <SelectContent>
                            {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                                            <TableCell>
                        <Input
                          type="number"
                          className="h-10 w-full text-center"
                          value={row.draft.input}
                          onChange={(e) => updateNewRow(row.key, { ...row.draft, input: e.target.value })}
                        />
                      </TableCell>
                      <TableCell><Input type="number" className="h-10 w-full text-center" value={row.draft.fwKg} onChange={(e) => updateNewRow(row.key, { ...row.draft, fwKg: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" className="h-10 w-full text-center" value={row.draft.bwKg} onChange={(e) => updateNewRow(row.key, { ...row.draft, bwKg: e.target.value })} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="h-10 w-full text-center"
                            value={row.draft.output}
                            placeholder="suggested"
                            onChange={(e) => { markNewRowOutputManualEdit(row.key); updateNewRow(row.key, { ...row.draft, output: e.target.value }); }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Cancel" onClick={() => removeNewRow(row.key)} disabled={saving}>
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {!readOnly && editingId !== null && (
                  <TableRow>
                    <TableCell>
                      <Select value={editDraft.size} onValueChange={(value) => setEditDraft({ ...editDraft, size: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                          {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">
                      <Select value={editDraft.color} onValueChange={(value) => setEditDraft({ ...editDraft, color: value })}>
                        <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>
                          {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                                        <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.input} onChange={(e) => setEditDraft({ ...editDraft, input: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.fwKg} onChange={(e) => setEditDraft({ ...editDraft, fwKg: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.bwKg} onChange={(e) => setEditDraft({ ...editDraft, bwKg: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.output} onChange={(e) => setEditDraft({ ...editDraft, output: e.target.value })} /></TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Cancel edit" onClick={cancelEdit} disabled={saving}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id} className={editingId === row.id ? 'bg-blue-50/30' : ''}>
                    <TableCell>{row.size}</TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">{row.color}</TableCell>
                    <TableCell className="text-center">{row.kora}</TableCell>
                    <TableCell className="text-center">{row.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.fwKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.bwKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.output.toFixed(2)}</TableCell>
                    {!readOnly && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
                            aria-label="Edit row"
                            onClick={() => startEdit(row)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                            aria-label="Delete row"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length === 0 && newRows.length === 0 && editingId === null && (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 7 : 8} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="p-4 border-t border-gray-50 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-1 rounded-full ${theme.buttonBorder} ${theme.buttonText} ${theme.buttonHover}`}
              onClick={startAdd}
              disabled={saving}
            >
              <Plus className="h-3 w-3" /> Add row
            </Button>
          </div>
          {errorMessage && <p className="text-xs font-medium text-red-600">{errorMessage}</p>}
        </div>
      )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this fabric checking entry?"
        description={deleteTarget ? `${deleteTarget.size} / ${deleteTarget.color} — ${deleteTarget.input.toFixed(2)} kg fabric input. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDeleteRow}
      />
    </div>
  );
});

export type { Theme };

interface FabricDeliveredDraft {
  size: string;
  color: string;
  delivered: string;
}

interface FabricDeliveredCreatePayload {
  productionDate: string;
  colorId: string;
  sizeId: string;
  fabricWeight: number;
}

interface FabricDeliveredRow {
  id: string;
  size: string;
  color: string;
  delivered: number;
}

type LoadSentProductionRecord = LoadSentRecord & {
  productionDate?: string;
  fabricWeight?: number;
  loadSent?: {
    fabricWeight?: number;
  };
};

function mapLoadSentRecord(record: LoadSentProductionRecord): FabricDeliveredRow {
  return {
    id: record.id,
    size: record.size?.name ?? '',
    color: record.color?.name ?? '',
    delivered: record.loadSent?.fabricWeight ?? record.fabricWeight ?? record.weightKg ?? 0,
  };
}

export const FabricDeliveredSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting, hideBanner }, ref) => {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const { data, isLoading } = useLoadSentRecords('?limit=100', !hideExisting);

  const rows = useMemo(() => {
    if (hideExisting) return [];
    return (data?.data ?? [])
      .filter((record) => !productionDate || (record as LoadSentProductionRecord).productionDate?.startsWith(productionDate) || record.date?.startsWith(productionDate))
      .map((record) => mapLoadSentRecord(record as LoadSentProductionRecord));
  }, [data, productionDate, hideExisting]);

  const [newRows, setNewRows] = useState<{ key: string; draft: FabricDeliveredDraft }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FabricDeliveredDraft>({ size: '', color: '', delivered: '' });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FabricDeliveredRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const nextRowKeyRef = useRef(0);
  const hasAutoAddedRef = useRef(false);

  const startAdd = useCallback(() => {
    setNewRows((current) => [
      ...current,
      { key: `new-${nextRowKeyRef.current++}`, draft: { size: '', color: '', delivered: '' } },
    ]);
  }, []);

  useEffect(() => {
    if (readOnly || !autoAdd || hasAutoAddedRef.current) return;
    if (newRows.length === 0) {
      hasAutoAddedRef.current = true;
      startAdd();
    }
  }, [readOnly, autoAdd, newRows.length, startAdd]);

  const updateNewRow = (key: string, draft: FabricDeliveredDraft) => {
    setNewRows((current) => current.map((row) => (row.key === key ? { ...row, draft } : row)));
  };

  const removeNewRow = (key: string) => {
    setNewRows((current) => current.filter((row) => row.key !== key));
  };

  const validateDraft = (draft: FabricDeliveredDraft) => {
    const sizeId = findIdByName(lookups.sizes, draft.size);
    const colorId = findIdByName(lookups.colors, draft.color);
    const fabricWeight = parseFloat(draft.delivered) || 0;
    if (!sizeId || !colorId) {
      setErrorMessage('Select Size and Color before saving.');
      return null;
    }
    if (fabricWeight <= 0) {
      setErrorMessage('Enter Fabric Weight (kg) — it must be greater than 0.');
      return null;
    }
    return { sizeId, colorId, fabricWeight };
  };

  const saveRow = async (draft: FabricDeliveredDraft, id?: string): Promise<boolean> => {
    const values = validateDraft(draft);
    if (!values) return false;

    try {
      const payload: FabricDeliveredCreatePayload = {
        productionDate: productionDate ?? new Date().toISOString().slice(0, 10),
        colorId: values.colorId,
        sizeId: values.sizeId,
        fabricWeight: values.fabricWeight,
      };
      const response = await apiFetch(id ? `/load-sent/${id}` : '/load-sent', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setErrorMessage(await extractApiErrorMessage(response, 'Failed to save the Fabric Delivered entry.'));
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error saving Fabric Delivered entry:', error);
      setErrorMessage('Failed to save the Fabric Delivered entry.');
      return false;
    }
  };

  const startEdit = (row: FabricDeliveredRow) => {
    setEditDraft({ size: row.size, color: row.color, delivered: String(row.delivered) });
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ size: '', color: '', delivered: '' });
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (readOnly) return true;
      setSaving(true);
      setErrorMessage(null);
      let allOk = true;
      try {
        if (editingId) {
          const editOk = await saveRow(editDraft, editingId);
          if (!editOk) allOk = false;
        }

        const rowsToSave = newRows.filter((row) => JSON.stringify(row.draft) !== JSON.stringify({ size: '', color: '', delivered: '' }));
        if (rowsToSave.length > 0) {
          const results = await Promise.all(rowsToSave.map((row) => saveRow(row.draft)));
          const succeededKeys = new Set(rowsToSave.filter((_, index) => results[index]).map((row) => row.key));
          if (succeededKeys.size > 0) {
            setNewRows((current) => current.filter((row) => !succeededKeys.has(row.key)));
            await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
          }
          if (succeededKeys.size < rowsToSave.length) allOk = false;
        }

        if (allOk && editingId) {
          cancelEdit();
          await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
        }
      } finally {
        setSaving(false);
      }
      return allOk;
    },
  }));

  const handleDeleteRow = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiFetch(`/load-sent/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete fabric delivered entry');
      await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting fabric delivered entry:', error);
    } finally {
      setDeleting(false);
    }
  };

  const theme = themes.fabricDelivered;
  const roundedClass = hideBanner ? 'rounded-b-xl rounded-tr-xl rounded-tl-none' : 'rounded-xl';

  return (
    <div className={`${roundedClass} border ${theme.border} bg-white shadow-sm overflow-hidden`}>
      {!hideBanner && (
        <div className={`p-3 ${theme.headerBg} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className={`flex items-center gap-3 text-[13px] font-extrabold ${theme.headerText} uppercase tracking-wider`}>
            <div className={`${theme.iconBg} ${theme.iconColor} h-5 w-5 flex items-center justify-center rounded-sm text-[10px] font-bold`}>
              4
            </div>
            FABRIC DELIVERED
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Size</TableHead>
              <TableHead className={`w-37.5 min-w-37.5 text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Color</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Kora</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Delivered (kg)</TableHead>
              {!readOnly && <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 3 : 4} className="h-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {!readOnly && newRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <Select value={row.draft.size} onValueChange={(value) => updateNewRow(row.key, { ...row.draft, size: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                          {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">
                      <Select value={row.draft.color} onValueChange={(value) => updateNewRow(row.key, { ...row.draft, color: value })}>
                        <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>
                          {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-10 w-full text-center" value={row.draft.delivered} onChange={(e) => updateNewRow(row.key, { ...row.draft, delivered: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Cancel" onClick={() => removeNewRow(row.key)} disabled={saving}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!readOnly && rows.map((row) => editingId === row.id ? (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Select value={editDraft.size} onValueChange={(value) => setEditDraft({ ...editDraft, size: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                          {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">
                      <Select value={editDraft.color} onValueChange={(value) => setEditDraft({ ...editDraft, color: value })}>
                        <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>
                          {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" className="h-10 w-full text-center" value={editDraft.delivered} onChange={(e) => setEditDraft({ ...editDraft, delivered: e.target.value })} /></TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon-sm" className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200" aria-label="Cancel" onClick={cancelEdit} disabled={saving}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row.id}>
                    <TableCell>{row.size}</TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">{row.color}</TableCell>
                    <TableCell className="text-center">{row.delivered.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" aria-label="Edit row" onClick={() => startEdit(row)} disabled={saving}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label="Delete row" onClick={() => setDeleteTarget(row)} disabled={saving}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {readOnly && rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.size}</TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center">{row.color}</TableCell>
                    <TableCell className="text-center">{row.delivered.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && newRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 3 : 4} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="flex flex-col border-t border-gray-100">
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1 rounded-full ${theme.buttonBorder} ${theme.buttonText} ${theme.buttonHover}`}
                onClick={startAdd}
                disabled={saving}
              >
                <Plus className="h-3 w-3" /> Add row
              </Button>
            </div>
            {errorMessage && <p className="text-xs font-medium text-red-600">{errorMessage}</p>}
          </div>

        </div>
      )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this fabric delivered entry?"
        description={deleteTarget ? `${deleteTarget.size} / ${deleteTarget.color} — ${deleteTarget.delivered.toFixed(2)} kg delivered. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDeleteRow}
      />
    </div>
  );
});




