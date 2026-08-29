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
  useLoomsProductions,
  loomsKeys,
  type LoomsProductionItem,
  type LoomsCreatePayload,
} from '@/features/looms/loom-queries';
import { useLookups, findIdByName, type Lookups } from '@/features/extruder/extruder-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, type SectionProps, type SectionRef } from '@/features/production/day-entry-sections';

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

export interface LoomDraft {
  key?: string;
  id?: string; // If editing an existing (already-persisted) entry
  size: string;
  color: string;
  input: string;
  output: string;
  loomsWasteKg: string;
}

export const emptyLoomDraft: LoomDraft = { key: '', size: '', color: '', input: '', output: '', loomsWasteKg: '' };

export function suggestLoomOutput(draft: Pick<LoomDraft, 'input' | 'loomsWasteKg'>): string {
  const suggested = Math.max(0, (parseFloat(draft.input) || 0) - (parseFloat(draft.loomsWasteKg) || 0));
  return suggested > 0 ? suggested.toFixed(2) : '';
}

export const LoomSection = forwardRef<SectionRef, SectionProps>(({ productionDate, readOnly, hideExisting, hideBanner, onEditLoomGroup }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useLoomsProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  const [newRows, setNewRows] = useState<LoomDraft[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<LoomRow | null>(null);
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
      .map(mapLoomItem)
      .filter((row) => row.input > 0 || row.output > 0 || row.loomsWasteKg > 0);
  }, [data, productionDate, hideExisting, pendingIds]);

  const removeNewRow = (key: string) => {
    setNewRows((current) => current.filter((row) => row.key !== key));
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (newRows.length === 0) return true;
      setSaving(true);
      setSaveError(null);
      const failed: LoomDraft[] = [];
      let errorMessage: string | null = null;
      for (const row of newRows) {
        const colorId = findIdByName(lookups.colors, row.color);
        const sizeId = findIdByName(lookups.sizes, row.size);
        if (!colorId || !sizeId) {
          failed.push(row);
          errorMessage = 'Could not resolve color/size for one or more entries.';
          continue;
        }
        const payload: LoomsCreatePayload = {
          productionDate: productionDate ?? '',
          colorId,
          sizeId,
          yarnInputKg: parseFloat(row.input) || 0,
          fabricOutputKg: parseFloat(row.output) || 0,
          loomsWasteKg: parseFloat(row.loomsWasteKg) || 0,
        };
        try {
          const response = row.id
            ? await apiFetch(`/production/looms/${row.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            : await apiFetch('/production/looms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          if (!response.ok) {
            failed.push(row);
            errorMessage = await extractApiErrorMessage(response, 'Failed to save one or more loom entries.');
          }
        } catch {
          failed.push(row);
          errorMessage = 'Failed to save one or more loom entries.';
        }
      }
      setNewRows(failed);
      await queryClient.invalidateQueries({ queryKey: loomsKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setSaving(false);
      if (failed.length > 0) {
        setSaveError(errorMessage);
        return false;
      }
      return true;
    },
    addLoomRow: (draft: LoomDraft) => {
      setNewRows(prev => {
        const existingIndex = prev.findIndex(r => r.size === draft.size && r.color === draft.color);
        if (existingIndex >= 0) {
          const newArray = [...prev];
          const existing = newArray[existingIndex];

          const updated = { ...existing };
          updated.input = ((parseFloat(updated.input) || 0) + (parseFloat(draft.input) || 0)).toString();
          updated.loomsWasteKg = ((parseFloat(updated.loomsWasteKg) || 0) + (parseFloat(draft.loomsWasteKg) || 0)).toString();
          updated.output = ((parseFloat(updated.output) || 0) + (parseFloat(draft.output) || 0)).toString();

          newArray[existingIndex] = updated;
          return newArray;
        }
        return [...prev, { ...draft, key: crypto.randomUUID() }];
      });
    },
    updateLoomRow: (draft: LoomDraft) => {
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

      {saveError && (
        <p className="px-3 pt-2 text-sm text-red-600">{saveError}</p>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-sm !text-center font-semibold tracking-wide border-b border-gray-300 ${theme.headerText}`}>Size</TableHead>
              <TableHead className={`w-37.5 min-w-37.5 text-center text-sm font-semibold  tracking-wide border border-gray-300 ${theme.headerText}`}>Color</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide border border-gray-300 ${theme.headerText}`}>Loom Production</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide border border-gray-300 ${theme.headerText}`}>Looms/Yarn Waste</TableHead>
              <TableHead className={`text-center text-sm font-semibold  tracking-wide border border-gray-300 ${theme.headerText}`}>Fabric production</TableHead>
              {!readOnly && <TableHead className={`!text-center text-sm font-semibold  tracking-wide border border-gray-300 ${theme.headerText}`}>Action</TableHead>}
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
                    <TableRow key={row.key} className="bg-orange-50/50">
                      <TableCell className="!text-center"><span className="font-medium text-gray-700 border border-gray-300">{row.size || '-'}</span></TableCell>
                      <TableCell className="w-37.5 min-w-37.5 text-center"><span className="font-medium text-gray-700 border border-gray-300">{row.color || '-'}</span></TableCell>
                      <TableCell className="text-center border border-gray-300">{parseFloat(row.input) > 0 ? parseFloat(row.input).toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-center border border-gray-300">{parseFloat(row.loomsWasteKg) > 0 ? parseFloat(row.loomsWasteKg).toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-center border border-gray-300">{parseFloat(row.output) > 0 ? parseFloat(row.output).toFixed(2) : '-'}</TableCell>
                      <TableCell className="!text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button variant="ghost" size="icon-sm" disabled={saving} className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" onClick={() => onEditLoomGroup && onEditLoomGroup(row)}>
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
                    <TableCell className="!text-center border border-gray-300">{row.size}</TableCell>
                    <TableCell className="w-37.5 min-w-37.5 text-center border border-gray-300">{row.color}</TableCell>
                    <TableCell className="text-center border border-gray-300">{row.input.toFixed(2)}</TableCell>
                    <TableCell className="text-center border border-gray-300">{row.loomsWasteKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center border border-gray-300">{row.output.toFixed(2)}</TableCell>
                    {!readOnly && (
                      <TableCell className="!text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
                            aria-label="Edit row"
                            onClick={() => onEditLoomGroup && onEditLoomGroup({
                              id: row.id,
                              size: row.size,
                              color: row.color,
                              input: String(row.input),
                              output: String(row.output),
                              loomsWasteKg: String(row.loomsWasteKg),
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
                    <TableCell colSpan={readOnly ? 5 : 6} className="h-20 !text-center text-gray-500">No entries yet.</TableCell>
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
        title="Delete this loom entry?"
        description={deleteTarget ? `${deleteTarget.size} / ${deleteTarget.color} — ${deleteTarget.input.toFixed(2)} kg yarn input. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDeleteRow}
      />
    </div>
  );
});
