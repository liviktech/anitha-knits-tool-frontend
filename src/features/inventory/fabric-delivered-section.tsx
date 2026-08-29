import { useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { TableNoteFooter } from '@/components/shared/table-note-footer';
import { Edit2, Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import { useLoadSentRecords, loadSentKeys, type LoadSentRecord, type LoadSentCreatePayload } from '@/features/inventory/load-sent-queries';
import { useLookups, findIdByName, type Lookups } from '@/features/extruder/extruder-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, type SectionProps, type SectionRef } from '@/features/production/day-entry-sections';

export interface FabricDeliveredDraft {
  key?: string;
  id?: string; // If editing an existing (already-persisted) entry
  size: string;
  color: string;
  delivered: string;
  vehicleNo: string;
  driverName: string;
}

export const emptyFabricDeliveredDraft: FabricDeliveredDraft = { size: '', color: '', delivered: '', vehicleNo: '', driverName: '' };

interface FabricDeliveredRow {
  id: string;
  size: string;
  color: string;
  delivered: number;
  vehicleNo: string;
  driverName: string;
}

type LoadSentProductionRecord = LoadSentRecord & {
  productionDate?: string;
  fabricWeight?: number;
  loadSent?: {
    fabricWeight?: number;
    vehicleNo?: string;
    driverName?: string;
  };
};

function mapLoadSentRecord(record: LoadSentProductionRecord): FabricDeliveredRow {
  return {
    id: record.id,
    size: record.size?.name ?? '',
    color: record.color?.name ?? '',
    delivered: record.loadSent?.fabricWeight ?? record.fabricWeight ?? 0,
    vehicleNo: record.loadSent?.vehicleNo ?? '',
    driverName: record.loadSent?.driverName ?? '',
  };
}

export const FabricDeliveredSection = forwardRef<SectionRef, SectionProps & { onEditDeliveredGroup?: (draft: FabricDeliveredDraft) => void }>(({ productionDate, readOnly, hideExisting, hideBanner, onEditDeliveredGroup }, ref) => {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const { data, isLoading } = useLoadSentRecords('?limit=100', !hideExisting);

  const [newRows, setNewRows] = useState<FabricDeliveredDraft[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<FabricDeliveredRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pendingIds = useMemo(() => new Set(newRows.map((r) => r.id).filter(Boolean)), [newRows]);

  const rows = useMemo(() => {
    if (hideExisting) return [];
    return (data?.data ?? [])
      .filter((record) => !productionDate || (record as LoadSentProductionRecord).productionDate?.startsWith(productionDate) || record.date?.startsWith(productionDate))
      .filter((record) => !pendingIds.has(record.id))
      .map((record) => mapLoadSentRecord(record as LoadSentProductionRecord));
  }, [data, productionDate, hideExisting, pendingIds]);

  const removeNewRow = (key: string) => {
    setNewRows((current) => current.filter((row) => row.key !== key));
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (newRows.length === 0) return true;
      setSaving(true);
      setSaveError(null);
      const failed: FabricDeliveredDraft[] = [];
      let errorMessage: string | null = null;
      for (const row of newRows) {
        const colorId = findIdByName(lookups.colors, row.color);
        const sizeId = findIdByName(lookups.sizes, row.size);
        if (!colorId || !sizeId) {
          failed.push(row);
          errorMessage = 'Could not resolve color/size for one or more entries.';
          continue;
        }
        const payload: LoadSentCreatePayload = {
          productionDate: productionDate ?? '',
          colorId,
          sizeId,
          fabricWeight: parseFloat(row.delivered) || 0,
          vehicleNo: row.vehicleNo || undefined,
          driverName: row.driverName || undefined,
        };
        try {
          const response = row.id
            ? await apiFetch(`/load-sent/${row.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            : await apiFetch('/load-sent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          if (!response.ok) {
            failed.push(row);
            errorMessage = await extractApiErrorMessage(response, 'Failed to save one or more fabric delivered entries.');
          }
        } catch {
          failed.push(row);
          errorMessage = 'Failed to save one or more fabric delivered entries.';
        }
      }
      setNewRows(failed);
      await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setSaving(false);
      if (failed.length > 0) {
        setSaveError(errorMessage);
        return false;
      }
      return true;
    },
    addDeliveredRow: (draft: FabricDeliveredDraft) => {
      setNewRows(prev => {
        const existingIndex = prev.findIndex(r => r.size === draft.size && r.color === draft.color);
        if (existingIndex >= 0) {
          const newArray = [...prev];
          const existing = newArray[existingIndex];

          const updated = { ...existing };
          updated.delivered = ((parseFloat(updated.delivered) || 0) + (parseFloat(draft.delivered) || 0)).toString();

          newArray[existingIndex] = updated;
          return newArray;
        }
        return [...prev, { ...draft, key: crypto.randomUUID() }];
      });
    },
    updateDeliveredRow: (draft: FabricDeliveredDraft) => {
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

      {saveError && (
        <p className="px-3 pt-2 text-sm text-red-600">{saveError}</p>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-sm !text-center font-semibold tracking-wide  ${theme.headerText}`}>Size</TableHead>
              <TableHead className={`w-37.5 min-w-37.5 text-center text-sm font-semibold tracking-wide border border-gray-300 ${theme.headerText}`}>Color</TableHead>
              <TableHead className={`text-center text-sm font-semibold tracking-wide border border-gray-300 ${theme.headerText}`}>Fabric Delivered</TableHead>
              <TableHead className={`text-center text-sm font-semibold tracking-wide border border-gray-300 ${theme.headerText}`}>Vehicle No</TableHead>
              <TableHead className={`text-center text-sm font-semibold tracking-wide border border-gray-300 ${theme.headerText}`}>Driver Name</TableHead>
              {!readOnly && <TableHead className={`!text-center text-sm font-semibold tracking-wide border border-gray-300 ${theme.headerText}`}>Action</TableHead>}
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
                {!readOnly && newRows.map((row) => (
                  <TableRow key={row.key} className="bg-orange-50/50">
                    <TableCell className="!text-center"><span className="font-medium text-gray-700">{row.size || '-'}</span></TableCell>
                    <TableCell className="text-center"><span className="font-medium text-gray-700">{row.color || '-'}</span></TableCell>
                    <TableCell className="text-center">{parseFloat(row.delivered) > 0 ? parseFloat(row.delivered).toFixed(2) : '-'}</TableCell>
                    <TableCell className="text-center">{row.vehicleNo || '-'}</TableCell>
                    <TableCell className="text-center">{row.driverName || '-'}</TableCell>
                    <TableCell className="!text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button variant="ghost" size="icon-sm" disabled={saving} className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" onClick={() => onEditDeliveredGroup && onEditDeliveredGroup(row)}>
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
                    <TableCell className="text-center border border-gray-300">{row.delivered.toFixed(2)}</TableCell>
                    <TableCell className="text-center border border-gray-300">{row.vehicleNo || '-'}</TableCell>
                    <TableCell className="text-center border border-gray-300">{row.driverName || '-'}</TableCell>
                    {!readOnly && (
                      <TableCell className="!text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button variant="ghost" size="icon-sm" className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" aria-label="Edit row" onClick={() => onEditDeliveredGroup && onEditDeliveredGroup({
                            id: row.id,
                            size: row.size,
                            color: row.color,
                            delivered: String(row.delivered),
                            vehicleNo: row.vehicleNo,
                            driverName: row.driverName,
                          })}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label="Delete row" onClick={() => setDeleteTarget(row)}>
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
        title="Delete this fabric delivered entry?"
        description={deleteTarget ? `${deleteTarget.size} / ${deleteTarget.color} — ${deleteTarget.delivered.toFixed(2)} kg delivered. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDeleteRow}
      />
    </div>
  );
});
