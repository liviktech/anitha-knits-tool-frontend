import { useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { TableNoteFooter } from '@/components/shared/table-note-footer';
import { Edit2, Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import { sumWastageByCode } from '@/lib/api-types';
import {
  useFabricCheckingRecords,
  fabricCheckingKeys,
  useKoraBalances,
  findKoraBalanceKg,
  type FabricCheckingRecord,
  type FabricCheckingCreatePayload,
} from '@/features/fabric/fabric-queries';
import { useLookups, findIdByName, type Lookups } from '@/features/extruder/extruder-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, type SectionProps, type SectionRef } from '@/features/production/day-entry-sections';

export interface FabricRow {
  id: string;
  size: string;
  color: string;
  kora: string;
  input: number;
  output: number;
  pieceCount: number;
  firstGrade: number;
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
    // Kora is not a field on the record — it's the live color+size balance from
    // GET /kora-balance, overlaid by callers via findKoraBalanceKg. Left blank here.
    kora: '',
    input: item.fabricCheck?.fabricInputKg ?? 0,
    output: item.fabricCheck?.outputKg ?? (firstGrade + secondGrade),
    pieceCount: (item.fabricCheck as any)?.pieceCount ?? 0,
    firstGrade,
    secondGrade,
    fwKg: sumWastageByCode(item.wastages, 'FW'),
    bwKg: sumWastageByCode(item.wastages, 'BW'),
  };
}

export interface FabricDraft {
  key?: string;
  id?: string; // If editing an existing (already-persisted) entry
  size: string;
  color: string;
  kora: string;
  input: string;
  output: string;
  fwKg: string;
  bwKg: string;
}

export const emptyFabricDraft: FabricDraft = { key: '', size: '', color: '', kora: '', input: '', output: '', fwKg: '', bwKg: '' };

export function suggestFabricOutput(draft: Pick<FabricDraft, 'input' | 'fwKg' | 'bwKg'>): string {
  const wasteKg = (parseFloat(draft.fwKg) || 0) + (parseFloat(draft.bwKg) || 0);
  const suggested = Math.max(0, (parseFloat(draft.input) || 0) - wasteKg);
  return suggested > 0 ? suggested.toFixed(2) : '';
}

export const FabricSection = forwardRef<SectionRef, SectionProps>(({ productionDate, readOnly, hideExisting, hideBanner, onEditFabricGroup }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useFabricCheckingRecords(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const { data: koraBalanceData } = useKoraBalances(!hideExisting);
  const koraBalances = koraBalanceData?.data;

  const [newRows, setNewRows] = useState<FabricDraft[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<FabricRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pendingIds = useMemo(() => new Set(newRows.map((r) => r.id).filter(Boolean)), [newRows]);

  const rows = useMemo(() => {
    if (hideExisting) return [];
    const items = data?.data ?? [];
    return items
      .filter((item) => !productionDate || item.productionDate.startsWith(productionDate))
      .filter((item) => !pendingIds.has(item.id))
      .map(mapFabricItem)
      .map((row) => ({ ...row, kora: (findKoraBalanceKg(koraBalances, row.size, row.color) ?? 0).toFixed(2) }))
      .filter((row) => row.input > 0 || row.firstGrade > 0 || row.secondGrade > 0 || row.fwKg > 0 || row.bwKg > 0);
  }, [data, productionDate, hideExisting, pendingIds, koraBalances]);

  const removeNewRow = (key: string) => {
    setNewRows((current) => current.filter((row) => row.key !== key));
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (newRows.length === 0) return true;
      setSaving(true);
      setSaveError(null);
      const failed: FabricDraft[] = [];
      let errorMessage: string | null = null;
      for (const row of newRows) {
        const colorId = findIdByName(lookups.colors, row.color);
        const sizeId = findIdByName(lookups.sizes, row.size);
        if (!colorId || !sizeId) {
          failed.push(row);
          errorMessage = 'Could not resolve color/size for one or more entries.';
          continue;
        }
        const payload: FabricCheckingCreatePayload = {
          productionDate: productionDate ?? '',
          colorId,
          sizeId,
          fabricInputKg: parseFloat(row.input) || 0,
          outputKg: parseFloat(row.output) || 0,
          fwKg: parseFloat(row.fwKg) || 0,
          bwKg: parseFloat(row.bwKg) || 0,
        };
        try {
          const response = row.id
            ? await apiFetch(`/fabric-checking/${row.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            : await apiFetch('/fabric-checking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          if (!response.ok) {
            failed.push(row);
            errorMessage = await extractApiErrorMessage(response, 'Failed to save one or more fabric checking entries.');
          }
        } catch {
          failed.push(row);
          errorMessage = 'Failed to save one or more fabric checking entries.';
        }
      }
      setNewRows(failed);
      await queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setSaving(false);
      if (failed.length > 0) {
        setSaveError(errorMessage);
        return false;
      }
      return true;
    },
    addFabricRow: (draft: FabricDraft) => {
      setNewRows(prev => {
        const existingIndex = prev.findIndex(r => r.size === draft.size && r.color === draft.color && r.kora === draft.kora);
        if (existingIndex >= 0) {
          const newArray = [...prev];
          const existing = newArray[existingIndex];

          const updated = { ...existing };
          updated.input = ((parseFloat(updated.input) || 0) + (parseFloat(draft.input) || 0)).toString();
          updated.fwKg = ((parseFloat(updated.fwKg) || 0) + (parseFloat(draft.fwKg) || 0)).toString();
          updated.bwKg = ((parseFloat(updated.bwKg) || 0) + (parseFloat(draft.bwKg) || 0)).toString();
          updated.output = ((parseFloat(updated.output) || 0) + (parseFloat(draft.output) || 0)).toString();

          newArray[existingIndex] = updated;
          return newArray;
        }
        return [...prev, { ...draft, key: crypto.randomUUID() }];
      });
    },
    updateFabricRow: (draft: FabricDraft) => {
      setNewRows(prev => {
        const existingIndex = prev.findIndex(r => r.key === draft.key);
        if (existingIndex >= 0) {
          const newArray = [...prev];
          newArray[existingIndex] = draft;
          return newArray;
        }
        return [...prev, { ...draft, key: crypto.randomUUID() }];
      });
    }
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

      {saveError && (
        <p className="px-3 pt-2 text-sm text-red-600">{saveError}</p>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-sm !text-center font-semibold  tracking-wide border border-black/10 ${theme.headerText}`}>Size</TableHead>
              <TableHead className={`w-37.5 min-w-37.5 text-center text-sm font-semibold  tracking-wide border border-black/10 ${theme.headerText}`}>Color</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide border border-black/10 ${theme.headerText}`}>Kora</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide border border-black/10 ${theme.headerText}`}>Fabric Production</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide border border-black/10 ${theme.headerText}`}>Fabric Waste</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide border border-black/10 ${theme.headerText}`}>Bit Waste</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide ${theme.headerText}`}>Fabric Stock</TableHead>
              {!readOnly && <TableHead className={`!text-center text-sm font-semibold  tracking-wide border border-black/10 ${theme.headerText}`}>Action</TableHead>}
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
                    <TableRow key={row.key} className="bg-orange-50/50">
                      <TableCell className="!text-center"><span className="font-medium text-gray-700">{row.size || '-'}</span></TableCell>
                      <TableCell className="w-37.5 min-w-37.5 text-center"><span className="font-medium text-gray-700">{row.color || '-'}</span></TableCell>
                      <TableCell className="text-center">{row.kora}</TableCell>
                      <TableCell className="text-center">{parseFloat(row.input) > 0 ? parseFloat(row.input).toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-center">{parseFloat(row.fwKg) > 0 ? parseFloat(row.fwKg).toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-center">{parseFloat(row.bwKg) > 0 ? parseFloat(row.bwKg).toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-center">{parseFloat(row.output) > 0 ? parseFloat(row.output).toFixed(2) : '-'}</TableCell>
                      <TableCell className="!text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button variant="ghost" size="icon-sm" disabled={saving} className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" onClick={() => onEditFabricGroup && onEditFabricGroup(row)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" disabled={saving} className="rounded-full bg-red-50 text-red-500 hover:bg-red-100" onClick={() => removeNewRow(row.key!)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="!text-center border border-black/10">{row.size}</TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center border border-black/10">{row.color}</TableCell>
                    <TableCell className="text-center border border-black/10">{row.kora}</TableCell>
                    <TableCell className="text-center border border-black/10">{row.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center border border-black/10">{row.fwKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center border border-black/10">{row.bwKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center border border-black/10">{row.output.toFixed(2)}</TableCell>
                    {!readOnly && (
                      <TableCell className="!text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
                            aria-label="Edit row"
                            onClick={() => onEditFabricGroup && onEditFabricGroup({
                              id: row.id,
                              size: row.size,
                              color: row.color,
                              kora: row.kora,
                              input: String(row.input),
                              output: String(row.output),
                              fwKg: String(row.fwKg),
                              bwKg: String(row.bwKg),
                            })}
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
                {rows.length === 0 && newRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 7 : 8} className="h-20 !text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <TableNoteFooter />

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
