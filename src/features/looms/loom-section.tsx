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
  useLoomsProductions,
  loomsKeys,
  type LoomsProductionItem,
  type LoomsCreatePayload,
  type LoomsUpdatePayload,
} from '@/features/looms/loom-queries';
import {
  useLookups,
  findIdByName,
  type Lookups,
} from '@/features/extruder/extruder-queries';
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

interface LoomDraft {
  size: string;
  color: string;
  input: string;
  output: string;
  loomsWasteKg: string;
}

const emptyLoomDraft: LoomDraft = { size: '', color: '', input: '', output: '', loomsWasteKg: '' };

interface LoomNewRow {
  key: string;
  draft: LoomDraft;
  outputManuallyEdited: boolean;
}

function suggestLoomOutput(draft: Pick<LoomDraft, 'input' | 'loomsWasteKg'>): string {
  const suggested = Math.max(0, (parseFloat(draft.input) || 0) - (parseFloat(draft.loomsWasteKg) || 0));
  return suggested > 0 ? suggested.toFixed(2) : '';
}

export const LoomSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting, hideBanner }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useLoomsProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  const rows = useMemo(() => {
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
