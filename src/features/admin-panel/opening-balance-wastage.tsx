import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLookups, findIdByName } from '@/lib/lookups';
import { Loader } from '@/components/shared/loader';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import {
  useOpeningBalanceWastage,
  openingBalanceWastageKeys,
  type OpeningBalanceWastageRecord,
  type OpeningBalanceWastagePayload,
} from './opening-balance-queries';

export function OpeningBalanceWastageTab() {
  const queryClient = useQueryClient();
  const { data: lookupsData, isLoading: isLookupsLoading } = useLookups();
  const { data: recordsData, isLoading: isRecordsLoading } = useOpeningBalanceWastage('?limit=100');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OpeningBalanceWastageRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OpeningBalanceWastageRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (isLookupsLoading || isRecordsLoading) return <Loader className="m-auto mt-10" />;

  const records = recordsData?.data ?? [];

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/opening-balance/wastage/${deleteTarget.id}`, { method: 'DELETE' });
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: openingBalanceWastageKeys.all });
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (record: OpeningBalanceWastageRecord) => {
    setEditingRecord(record);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  /** Editing updates the first row in place; any additional rows added in the modal are created as new records. */
  const handleSave = async (rows: OpeningBalanceWastagePayload[]) => {
    setSaveError(null);
    try {
      const [first, ...rest] = rows;

      if (editingRecord && first) {
        const response = await apiFetch(`/opening-balance/wastage/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(first),
        });
        if (!response.ok) {
          setSaveError(await extractApiErrorMessage(response, 'Failed to save opening balance.'));
          return;
        }
      }

      const itemsToCreate = editingRecord ? rest : rows;
      if (itemsToCreate.length > 0) {
        const response = await apiFetch('/opening-balance/wastage/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToCreate }),
        });
        if (!response.ok) {
          setSaveError(await extractApiErrorMessage(response, 'Failed to save opening balance.'));
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: openingBalanceWastageKeys.all });
      setIsModalOpen(false);
    } catch {
      setSaveError('Could not save opening balance. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Wastage Opening Balance</h3>
        <Button onClick={handleOpenAdd} className="bg-[#004D40] hover:bg-[#004D40]/90 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Wastage Balance
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="text-sm border-collapse bg-white w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle">
                  DATE
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle">
                  COLOR
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle">
                  SIZE
                </th>
                <th colSpan={3} className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">
                  EXTRUDER
                </th>
                <th colSpan={2} className="px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50 border-r border-gray-200">
                  LOOMS
                </th>
                <th colSpan={3} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50 border-r border-gray-200">
                  FABRIC CHECKING
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide align-middle">
                  ACTIONS
                </th>
              </tr>
              <tr className="bg-gray-50/80 border-b border-gray-300">
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-blue-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Lumps waste
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-blue-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Looms waste
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-bold text-blue-700 text-[10px] sm:text-xs uppercase whitespace-nowrap bg-blue-50/30">
                  Total
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-yellow-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Looms/Yarn waste
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-bold text-yellow-700 text-[10px] sm:text-xs uppercase whitespace-nowrap bg-yellow-50/30">
                  Total
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-purple-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Fabric waste
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-purple-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Bitwaste
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-bold text-purple-700 text-[10px] sm:text-xs uppercase whitespace-nowrap bg-purple-50/30">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500 text-sm">
                    No wastage balances found. Add one to get started.
                  </td>
                </tr>
              ) : (
                Array.from(
                  records.reduce((map, r) => {
                    const dateStr = format(new Date(r.date), 'dd MMM yyyy');
                    if (!map.has(dateStr)) map.set(dateStr, []);
                    map.get(dateStr)!.push(r);
                    return map;
                  }, new Map<string, OpeningBalanceWastageRecord[]>()).entries()
                ).flatMap(([dateStr, group]) =>
                  group.map((r, idx) => (
                    <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                      {idx === 0 && (
                        <td rowSpan={group.length} className="border-r border-gray-200 px-3 py-2 text-center font-medium text-gray-900 whitespace-nowrap align-middle">
                          {dateStr}
                        </td>
                      )}
                      <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                        {r.color?.name || '—'}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                        {r.size?.name || '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.extruderLumpsKg ? r.extruderLumpsKg.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.extruderLoomsWasteKg ? r.extruderLoomsWasteKg.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center font-bold text-blue-800 bg-blue-50/30">
                        {((r.extruderLumpsKg || 0) + (r.extruderLoomsWasteKg || 0)) > 0 ? ((r.extruderLumpsKg || 0) + (r.extruderLoomsWasteKg || 0)).toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.loomsYarnWasteKg ? r.loomsYarnWasteKg.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center font-bold text-yellow-800 bg-yellow-50/30">
                        {r.loomsYarnWasteKg ? r.loomsYarnWasteKg.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.fabricWasteKg ? r.fabricWasteKg.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.fabricBitwasteKg ? r.fabricBitwasteKg.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center font-bold text-purple-800 bg-purple-50/30">
                        {((r.fabricWasteKg || 0) + (r.fabricBitwasteKg || 0)) > 0 ? ((r.fabricWasteKg || 0) + (r.fabricBitwasteKg || 0)).toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => handleOpenEdit(r)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
            <tfoot>
              {records.length > 0 && (
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td colSpan={3} className="px-3 py-3 text-center text-gray-800 uppercase tracking-wide border-r border-gray-200">Grand Total</td>

                  <td className="px-2 py-3 text-center text-blue-900 bg-blue-100/30 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.extruderLumpsKg || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-center text-blue-900 bg-blue-100/30 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.extruderLoomsWasteKg || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-center text-blue-900 bg-blue-100/60 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.extruderLumpsKg || 0) + (r.extruderLoomsWasteKg || 0), 0).toFixed(2)}
                  </td>

                  <td className="px-2 py-3 text-center text-yellow-900 bg-yellow-100/30 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.loomsYarnWasteKg || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-center text-yellow-900 bg-yellow-100/60 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.loomsYarnWasteKg || 0), 0).toFixed(2)}
                  </td>

                  <td className="px-2 py-3 text-center text-purple-900 bg-purple-100/30 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.fabricWasteKg || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-center text-purple-900 bg-purple-100/30 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.fabricBitwasteKg || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-center text-purple-900 bg-purple-100/60 border-r border-gray-200">
                    {records.reduce((acc, r) => acc + (r.fabricWasteKg || 0) + (r.fabricBitwasteKg || 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <WastageModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingRecord}
          lookupsData={lookupsData}
          error={saveError}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this wastage balance?"
        description="This action cannot be undone."
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

type WastageRowState = {
  id: string;
  color: string;
  size: string;
  extLumps: string;
  extLooms: string;
  loomYarn: string;
  fabWaste: string;
  fabBit: string;
};

function WastageModal({ onClose, onSave, initialData, lookupsData, error }: {
  onClose: () => void;
  onSave: (data: OpeningBalanceWastagePayload[]) => Promise<void>;
  initialData: OpeningBalanceWastageRecord | null;
  lookupsData: any;
  error: string | null;
}) {
  const [date, setDate] = useState<Date | undefined>(initialData ? new Date(initialData.date) : new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createEmptyRow = (): WastageRowState => ({
    id: Math.random().toString(36).slice(2, 11),
    color: '',
    size: '',
    extLumps: '',
    extLooms: '',
    loomYarn: '',
    fabWaste: '',
    fabBit: ''
  });

  const [rows, setRows] = useState<WastageRowState[]>(() => {
    if (initialData) {
      return [{
        id: initialData.id,
        color: initialData.color?.name || '',
        size: initialData.size?.name || '',
        extLumps: initialData.extruderLumpsKg ? String(initialData.extruderLumpsKg) : '',
        extLooms: initialData.extruderLoomsWasteKg ? String(initialData.extruderLoomsWasteKg) : '',
        loomYarn: initialData.loomsYarnWasteKg ? String(initialData.loomsYarnWasteKg) : '',
        fabWaste: initialData.fabricWasteKg ? String(initialData.fabricWasteKg) : '',
        fabBit: initialData.fabricBitwasteKg ? String(initialData.fabricBitwasteKg) : '',
      }];
    }
    return [createEmptyRow()];
  });

  const colorNames = useMemo(() => (lookupsData?.colors ?? []).map((c: any) => c.name).sort(), [lookupsData?.colors]);
  const sizeNames = useMemo(() => (lookupsData?.sizes ?? []).map((s: any) => s.name).sort(), [lookupsData?.sizes]);

  const handleRowChange = (id: string, field: keyof WastageRowState, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRowWeightChange = (id: string, field: keyof WastageRowState, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value.replace(/[^0-9.]/g, '') } : r));
  };

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const handleSubmit = async () => {
    if (!date) return;

    const dateStr = date.toISOString().slice(0, 10);
    const parsedData: OpeningBalanceWastagePayload[] = rows.map(r => ({
      date: dateStr,
      colorId: r.color && r.color !== 'none' ? findIdByName(lookupsData?.colors ?? [], r.color) : undefined,
      sizeId: r.size && r.size !== 'none' ? findIdByName(lookupsData?.sizes ?? [], r.size) : undefined,
      extruderLumpsKg: parseFloat(r.extLumps) || 0,
      extruderLoomsWasteKg: parseFloat(r.extLooms) || 0,
      loomsYarnWasteKg: parseFloat(r.loomYarn) || 0,
      fabricWasteKg: parseFloat(r.fabWaste) || 0,
      fabricBitwasteKg: parseFloat(r.fabBit) || 0,
    }));

    setIsSaving(true);
    try {
      await onSave(parsedData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[95vw] w-max lg:max-w-none overflow-hidden flex flex-col max-h-[90vh] border border-gray-400 p-4 bg-[#F4F1E8]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 -mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-black">{initialData ? 'Edit' : 'Add'} Wastage Opening Balance</DialogTitle>
          <div className="flex items-center gap-3">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center bg-white border border-gray-400 rounded-md px-3 py-1 h-8 shadow-sm hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-800 mr-2">
                    {date ? format(date, 'dd/MM/yyyy') : 'Select Date'}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-gray-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setIsCalendarOpen(false); }} disabled={(d) => d > new Date()} autoFocus />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-red-700 text-white cursor-pointer hover:bg-red-400 focus:ring-red-400 rounded-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex flex-col py-1">
          <div className="flex justify-end mb-3">
            <Button onClick={handleAddRow} variant="outline" className="gap-2 border-green-600 text-green-700 hover:bg-green-50 shadow-sm h-8 px-4 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </Button>
          </div>

          <div className="flex justify-center w-full">
            <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm w-max max-w-[95vw]">
              <table className="text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300">
                    <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle w-[140px]">
                      COLOR
                    </th>
                    <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle w-[140px]">
                      SIZE
                    </th>
                    <th colSpan={3} className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">
                      EXTRUDER
                    </th>
                    <th colSpan={2} className="px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50 border-r border-gray-200">
                      LOOMS
                    </th>
                    <th colSpan={3} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50 border-r border-gray-200">
                      FABRIC CHECKING
                    </th>
                    <th rowSpan={2} className="px-2 py-2 align-middle"></th>
                  </tr>
                  <tr className="bg-gray-50/80 border-b border-gray-300">
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap">Lumps waste</th>
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap">Looms waste</th>
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-bold text-blue-700 text-xs uppercase whitespace-nowrap bg-blue-50/30">Total</th>

                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-yellow-600 text-xs uppercase whitespace-nowrap">Looms/Yarn waste</th>
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-bold text-yellow-700 text-xs uppercase whitespace-nowrap bg-yellow-50/30">Total</th>

                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-purple-600 text-xs uppercase whitespace-nowrap">Fabric waste</th>
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-purple-600 text-xs uppercase whitespace-nowrap">Bitwaste</th>
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-bold text-purple-700 text-xs uppercase whitespace-nowrap bg-purple-50/30">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/40">
                      <td className="border-r border-gray-200 p-2">
                        <Select value={row.color} onValueChange={(val) => handleRowChange(row.id, 'color', val)}>
                          <SelectTrigger className="w-full h-9 bg-white text-xs border-gray-300">
                            <SelectValue placeholder="Color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Color</SelectItem>
                            {colorNames.map((c: string) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border-r border-gray-200 p-2">
                        <Select value={row.size} onValueChange={(val) => handleRowChange(row.id, 'size', val)}>
                          <SelectTrigger className="w-full h-9 bg-white text-xs border-gray-300">
                            <SelectValue placeholder="Size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Size</SelectItem>
                            {sizeNames.map((s: string) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-24 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-blue-50/10 border-2 border-blue-200 mx-auto" value={row.extLumps} onChange={(e) => handleRowWeightChange(row.id, 'extLumps', e.target.value)} />
                      </td>
                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-24 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-blue-50/10 border-2 border-blue-200 mx-auto" value={row.extLooms} onChange={(e) => handleRowWeightChange(row.id, 'extLooms', e.target.value)} />
                      </td>
                      <td className="border-r border-gray-200 p-2 text-center font-bold text-blue-800 bg-blue-50/30">
                        {((parseFloat(row.extLumps) || 0) + (parseFloat(row.extLooms) || 0)) > 0 ? ((parseFloat(row.extLumps) || 0) + (parseFloat(row.extLooms) || 0)).toFixed(2) : '—'}
                      </td>

                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-32 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-yellow-50/10 border-2 border-yellow-200 mx-auto" value={row.loomYarn} onChange={(e) => handleRowWeightChange(row.id, 'loomYarn', e.target.value)} />
                      </td>
                      <td className="border-r border-gray-200 p-2 text-center font-bold text-yellow-800 bg-yellow-50/30">
                        {(parseFloat(row.loomYarn) || 0) > 0 ? (parseFloat(row.loomYarn) || 0).toFixed(2) : '—'}
                      </td>

                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-28 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-purple-50/10 border-2 border-purple-200 mx-auto" value={row.fabWaste} onChange={(e) => handleRowWeightChange(row.id, 'fabWaste', e.target.value)} />
                      </td>
                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-24 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-purple-50/10 border-2 border-purple-200 mx-auto" value={row.fabBit} onChange={(e) => handleRowWeightChange(row.id, 'fabBit', e.target.value)} />
                      </td>
                      <td className="border-r border-gray-200 p-2 text-center font-bold text-purple-800 bg-purple-50/30">
                        {((parseFloat(row.fabWaste) || 0) + (parseFloat(row.fabBit) || 0)) > 0 ? ((parseFloat(row.fabWaste) || 0) + (parseFloat(row.fabBit) || 0)).toFixed(2) : '—'}
                      </td>
                      <td className="p-2 align-middle">
                        {rows.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleRemoveRow(row.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}

          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-gray-500">All weights are measured in Kilogram (kg)</span>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-9 px-6 font-medium rounded-md border-gray-300" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#004D40] text-white hover:bg-[#003d33] h-9 px-6 font-medium rounded-md shadow-sm">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
