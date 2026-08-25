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
import { useLoadSentRecords, loadSentKeys, type LoadSentRecord } from '@/features/inventory/load-sent-queries';
import {
  useLookups,
  findIdByName,
  type Lookups,
} from '@/features/extruder/extruder-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, type SectionProps, type SectionRef } from '@/features/production/day-entry-sections';

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
              {/* <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Kora</TableHead> */}
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
