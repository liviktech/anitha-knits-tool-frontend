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
  useFabricCheckingRecords,
  fabricCheckingKeys,
  type FabricCheckingRecord,
  type FabricCheckingCreatePayload,
  type FabricCheckingUpdatePayload,
} from '@/features/fabric/fabric-queries';
import {
  useLookups,
  findIdByName,
  type Lookups,
} from '@/features/extruder/extruder-queries';
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

interface FabricNewRow {
  key: string;
  draft: FabricDraft;
  outputManuallyEdited: boolean;
}

function suggestFabricOutput(draft: Pick<FabricDraft, 'input' | 'fwKg' | 'bwKg'>): string {
  const wasteKg = (parseFloat(draft.fwKg) || 0) + (parseFloat(draft.bwKg) || 0);
  const suggested = Math.max(0, (parseFloat(draft.input) || 0) - wasteKg);
  return suggested > 0 ? suggested.toFixed(2) : '';
}

export const FabricSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting, hideBanner }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useFabricCheckingRecords(
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
      kora: row.kora,
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
                          type="text"
                          className="h-10 w-full text-center"
                          value={row.draft.kora}
                          onChange={(e) => updateNewRow(row.key, { ...row.draft, kora: e.target.value })}
                        />
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
                                        <TableCell><Input type="text" className="h-10 w-full text-center" value={editDraft.kora} onChange={(e) => setEditDraft({ ...editDraft, kora: e.target.value })} /></TableCell>
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
