import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, PackagePlus, PackageMinus, ArrowLeft, Layers, Palette, FlaskConical, ChevronRight, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/loader';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { apiFetch } from '@/lib/api-client';
import { useLookups, findIdByName } from '@/lib/lookups';
import {
  useInventoryRecords,
  inventoryKeys,
  inventoryTypeLabels,
  type InventoryRecord,
  type InventoryType,
  type InventoryCreatePayload,
  type InventoryUpdatePayload,
} from './inventory-queries';
import {
  useLoadSentRecords,
  loadSentKeys,
  type LoadSentRecord,
  type LoadSentCreatePayload,
} from './load-sent-queries';
import { useFabricCheckingRecords } from '@/features/fabric/fabric-queries';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

function formatDateDisplay(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
}

/* ---------------------------------------------------------------------- */
/* Receive — backed by /api/v1/inventory                                   */
/* ---------------------------------------------------------------------- */

interface InventoryFormDialogProps {
  onClose: () => void;
  editDate?: string;
  editRecords?: InventoryRecord[];
}

function InventoryFormDialog({ onClose, editDate, editRecords }: InventoryFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const isEdit = !!editDate;

  const [date, setDate] = useState(editDate || todayIso());

  const [weights, setWeights] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (editRecords) {
      for (const r of editRecords) {
        if (r.name) init[`${r.type}-${r.name}`] = String(r.weightKg);
      }
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hdpeNames = (lookupsData?.brands ?? []).map(b => b.name).sort();
  const chemicalNames = (lookupsData?.chemicals ?? []).map(c => c.name).sort();
  const colorNames = (lookupsData?.colors ?? []).map(c => c.name).sort();

  const handleWeightChange = (type: InventoryType, name: string, val: string) => {
    setWeights(prev => ({ ...prev, [`${type}-${name}`]: val }));
  };

  const handleSubmit = async () => {
    if (!date) {
      setError('Date is required');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const promises: Promise<any>[] = [];
      const types = [
        { type: 'HDPE' as InventoryType, names: hdpeNames },
        { type: 'CHEMICAL' as InventoryType, names: chemicalNames },
        { type: 'COLOR' as InventoryType, names: colorNames },
      ];

      for (const t of types) {
        for (const name of t.names) {
          const key = `${t.type}-${name}`;
          const valStr = weights[key];
          const val = parseFloat(valStr);
          const existing = editRecords?.find(r => r.type === t.type && r.name === name);

          if (!isNaN(val) && val > 0) {
            if (existing) {
              if (existing.weightKg !== val) {
                promises.push(apiFetch(`/inventory/${existing.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ weightKg: val, date }),
                }));
              }
            } else {
              let lookupId = '';
              if (t.type === 'HDPE') lookupId = lookupsData?.brands.find(b => b.name === name)?.id || '';
              if (t.type === 'CHEMICAL') lookupId = lookupsData?.chemicals.find(b => b.name === name)?.id || '';
              if (t.type === 'COLOR') lookupId = lookupsData?.colors.find(b => b.name === name)?.id || '';

              promises.push(apiFetch('/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  date, type: t.type, quantityKg: val,
                  ...(t.type === 'HDPE' && { brandId: lookupId }),
                  ...(t.type === 'CHEMICAL' && { chemicalId: lookupId }),
                  ...(t.type === 'COLOR' && { colorId: lookupId }),
                }),
              }));
            }
          } else if (existing) {
            promises.push(apiFetch(`/inventory/${existing.id}`, { method: 'DELETE' }));
          }
        }
      }

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      onClose();
    } catch (e) {
      console.error(e);
      setError('Could not save records. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !saving && !next && onClose()}>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-[1200px] overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
          <DialogTitle>{isEdit ? 'Edit Stock' : 'Add Received Stock'}</DialogTitle>
          <div className="flex items-center gap-3 pr-8">
            <Label htmlFor="inv-date" className="text-sm font-medium whitespace-nowrap text-gray-700">Date</Label>
            <Input id="inv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 h-8 text-sm bg-white" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex flex-col py-2 px-1">
          <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-xs border-collapse bg-white">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {hdpeNames.length > 0 && (
                    <th colSpan={hdpeNames.length} className="border-r border-gray-200 px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50">
                      HDPE (KG)
                    </th>
                  )}
                  {chemicalNames.length > 0 && (
                    <th colSpan={chemicalNames.length} className="border-r border-gray-200 px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50">
                      CHEMICALS (KG)
                    </th>
                  )}
                  {colorNames.length > 0 && (
                    <th colSpan={colorNames.length} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50">
                      COLORS (KG)
                    </th>
                  )}
                </tr>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {hdpeNames.map(name => (
                    <th key={name} className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-blue-600 text-[10px] uppercase whitespace-nowrap">{name}</th>
                  ))}
                  {chemicalNames.map(name => (
                    <th key={name} className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-yellow-600 text-[10px] uppercase whitespace-nowrap">{name}</th>
                  ))}
                  {colorNames.map(name => (
                    <th key={name} className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-purple-600 text-[10px] uppercase whitespace-nowrap">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {hdpeNames.map(name => (
                    <td key={name} className="border-r border-gray-200 p-2">
                      <Input type="number" placeholder="0" className="w-20 text-center h-8 text-xs font-medium bg-blue-50/10 border-blue-100 mx-auto" value={weights[`HDPE-${name}`] || ''} onChange={(e) => handleWeightChange('HDPE', name, e.target.value)} />
                    </td>
                  ))}
                  {chemicalNames.map(name => (
                    <td key={name} className="border-r border-gray-200 p-2">
                      <Input type="number" placeholder="0" className="w-20 text-center h-8 text-xs font-medium bg-yellow-50/10 border-yellow-100 mx-auto" value={weights[`CHEMICAL-${name}`] || ''} onChange={(e) => handleWeightChange('CHEMICAL', name, e.target.value)} />
                    </td>
                  ))}
                  {colorNames.map(name => (
                    <td key={name} className="border-r border-gray-200 p-2">
                      <Input type="number" placeholder="0" className="w-20 text-center h-8 text-xs font-medium bg-purple-50/10 border-purple-100 mx-auto" value={weights[`COLOR-${name}`] || ''} onChange={(e) => handleWeightChange('COLOR', name, e.target.value)} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <DialogFooter className="mt-2 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 min-w-24">
            {saving ? <Loader size="sm" className="mr-2" /> : null}
            {isEdit ? 'Save Changes' : 'Create Entries'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function InventoryReceiveTab({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useInventoryRecords('?limit=100');
  const records = data?.data ?? [];
  const totalKg = records.reduce((sum, r) => sum + r.weightKg, 0);

  const getTypeColor = (type: InventoryType) => {
    if (type === 'HDPE') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (type === 'COLOR') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (type === 'CHEMICAL') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const groupedRecords = Array.from(
    records.reduce((map, r) => {
      const date = formatDate(r.date);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(r);
      return map;
    }, new Map<string, InventoryRecord[]>()).entries()
  ).map(([date, dayRecords]) => ({
    date,
    records: dayRecords
  })).sort((a, b) => b.date.localeCompare(a.date));

  const [formOpen, setFormOpen] = useState(false);
  const [dayDetailsGroup, setDayDetailsGroup] = useState<{ date: string, records: InventoryRecord[] } | null>(null);
  const [editingRecord, setEditingRecord] = useState<InventoryRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setEditingRecord(null); setFormOpen(true); };
  const openEdit = (record: InventoryRecord) => { setEditingRecord(record); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiFetch(`/inventory/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete inventory record');
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      setDeleteTarget(null);
    } catch (e) {
      console.error('Error deleting inventory record:', e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-green-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-green-100 p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" className="mr-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded border border-green-200 bg-green-50 text-green-700">
            <PackagePlus className="h-4 w-4" />
          </div>
          <h2 className="font-bold text-gray-900">Stock Received</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Total</span>
            <Input type="number" className="h-8 w-28 text-right" value={totalKg.toFixed(2)} readOnly />
            <span className="text-gray-400">kg</span>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1 rounded-full bg-[#004D40] text-white hover:bg-[#00332a]"
            onClick={openCreate}
          >
            <Plus className="h-3 w-3" /> Add received stock
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Date</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Type</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Name</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Weight (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Actions</TableHead>
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
            ) : groupedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
              </TableRow>
            ) : (
              groupedRecords.map((group) => (
                <TableRow key={group.date} className="hover:bg-transparent border-b border-green-100">
                  <TableCell className="align-middle pt-4 font-medium text-gray-900 w-32 border-r border-gray-100/50">{group.date}</TableCell>
                  <TableCell className="p-3 align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      {Array.from(new Set(group.records.map(r => r.type))).map((type) => (
                        <span key={type} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${getTypeColor(type)}`}>
                          {inventoryTypeLabels[type]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 align-middle border-l border-gray-100/50">
                    <div className="flex flex-wrap items-center gap-2">
                      {group.records.map((r) => (
                        <span key={r.id} className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border shadow-sm ${getTypeColor(r.type)}`}>
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 align-middle text-center border-l border-gray-100/50">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {group.records.map((r) => (
                        <span key={r.id} className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border shadow-sm ${getTypeColor(r.type)}`}>
                          {r.weightKg.toFixed(2)} kg
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 align-middle text-center border-l border-gray-100/50">
                    <Button variant="outline" size="sm" className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50 shadow-sm" onClick={() => setDayDetailsGroup(group)}>
                      Manage Items <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>



      {/* {formOpen && <InventoryFormDialog onClose={() => setFormOpen(false)} record={editingRecord} />}
      {/* {dayDetailsGroup && (
        <InventoryDayDetailsDialog
          date={dayDetailsGroup.date}
          records={dayDetailsGroup.records}
          onClose={() => setDayDetailsGroup(null)}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      )} */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this inventory record?"
        description={deleteTarget ? `"${deleteTarget.name}" Ã¢â‚¬â€ ${deleteTarget.weightKg.toFixed(2)} kg. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Send Ã¢â‚¬â€ backed by /api/v1/load-sent                                      */
/* ---------------------------------------------------------------------- */

interface LoadSentFormDialogProps {
  onClose: () => void;
  record: LoadSentRecord | null;
}

/** Mounted only while the dialog is open (see call site), so state can
 * initialize once from `record` at mount instead of syncing via an effect. */
function LoadSentFormDialog({ onClose, record }: LoadSentFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const colors = lookupsData?.colors ?? [];
  const sizes = lookupsData?.sizes ?? [];
  const isEdit = !!record;

  const [date, setDate] = useState(record ? formatDate(record.date) : todayIso());
  const [color, setColor] = useState(record?.color?.name ?? '');
  const [size, setSize] = useState(record?.size?.name ?? '');
  const [pieceCount, setPieceCount] = useState(record ? String(record.pieceCount) : '');
  const [weightKg, setWeightKg] = useState(record ? String(record.weightKg) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const colorId = findIdByName(colors, color);
    const sizeId = findIdByName(sizes, size);
    if (!colorId || !sizeId || !pieceCount || !weightKg) {
      setError('Please fill in Color, Size, Piece Count, and Weight.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: LoadSentCreatePayload = {
        date,
        colorId,
        sizeId,
        pieceCount: parseInt(pieceCount, 10) || 0,
        weightKg: parseFloat(weightKg) || 0,
      };
      const response = await apiFetch(isEdit ? `/load-sent/${record.id}` : '/load-sent', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save load sent record');

      await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
      onClose();
    } catch (e) {
      console.error('Error saving load sent record:', e);
      setError('Could not save this record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !saving && !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Sent Stock' : 'Add Sent Stock'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls-date">Date</Label>
            <Input id="ls-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls-color">Color</Label>
            <Select value={color || undefined} onValueChange={setColor}>
              <SelectTrigger id="ls-color" className="w-full"><SelectValue placeholder="Select color" /></SelectTrigger>
              <SelectContent>
                {colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls-size">Size</Label>
            <Select value={size || undefined} onValueChange={setSize}>
              <SelectTrigger id="ls-size" className="w-full"><SelectValue placeholder="Select size" /></SelectTrigger>
              <SelectContent>
                {sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls-pieces">Piece Count</Label>
            <Input id="ls-pieces" type="number" value={pieceCount} onChange={(e) => setPieceCount(e.target.value)} />
          </div> */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls-weight">Weight (kg)</Label>
            <Input id="ls-weight" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader size="sm" className="mr-2" />}
            {isEdit ? 'Save changes' : 'Add stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoadSentTab({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const colors = lookupsData?.colors ?? [];
  const sizes = lookupsData?.sizes ?? [];

  const { data: sentData, isLoading: isSentLoading } = useLoadSentRecords('?limit=100');
  const { data: prodData, isLoading: isProdLoading } = useFabricCheckingRecords('?limit=100');

  const records = sentData?.data ?? [];
  const prodRecords = prodData?.data ?? [];
  const isLoading = isSentLoading || isProdLoading;

  const totalKg = records.reduce((sum, r) => sum + r.weightKg, 0);
  const totalPieces = records.reduce((sum, r) => sum + r.pieceCount, 0);

  const [selectedColorId, setSelectedColorId] = useState<string>('');

  // Size balances for the selected color
  const sizeBalancesForColor = sizes.map(s => {
    if (!selectedColorId) return null;

    const prodForSizeColor = prodRecords.filter(r => r.size.id === s.id && r.color.id === selectedColorId);
    const prodKg = prodForSizeColor.reduce((sum, r) => sum + (r.fabricCheck?.outputKg ?? 0), 0);
    const prodPcs = 0; // Piece count is no longer tracked in production

    const sentForSizeColor = records.filter(r => r.size?.id === s.id && r.color?.id === selectedColorId);
    const sentKg = sentForSizeColor.reduce((sum, r) => sum + r.weightKg, 0);
    const sentPcs = sentForSizeColor.reduce((sum, r) => sum + r.pieceCount, 0);

    return {
      id: s.id,
      name: s.name,
      balanceKg: prodKg - sentKg,
      balancePcs: prodPcs - sentPcs
    };
  }).filter(Boolean);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LoadSentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LoadSentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setEditingRecord(null); setFormOpen(true); };
  const openEdit = (record: LoadSentRecord) => { setEditingRecord(record); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiFetch(`/load-sent/${deleteTarget.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete load sent record');
      await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
      setDeleteTarget(null);
    } catch (e) {
      console.error('Error deleting load sent record:', e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-orange-100 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-orange-100 p-5 bg-gradient-to-r from-orange-50/60 to-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" className="mr-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 shadow-sm">
            <PackageMinus className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Load Sent</h2>
            <p className="text-xs text-gray-500">Stock dispatched out of the warehouse</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
            <span className="text-xs font-medium text-gray-500">Pieces</span>
            <span className="font-bold text-gray-900">{totalPieces}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
            <span className="text-xs font-medium text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{totalKg.toFixed(2)}</span>
            <span className="text-xs text-gray-400">kg</span>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-full bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" /> Add sent stock
          </Button>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="px-5 py-3 bg-orange-50/50 border-b border-orange-100 flex items-center gap-4 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Color:</span>
          <Select value={selectedColorId ?? ''} onValueChange={setSelectedColorId}>
            <SelectTrigger className="h-8 w-[160px] bg-white border-orange-200">
              <SelectValue placeholder="Select Color" />
            </SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
              {colors.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-gray-500">No colors</div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="h-5 w-px bg-orange-200 shrink-0 mx-1"></div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Stock:</span>
          {!selectedColorId ? (
            <span className="text-sm text-gray-400">Select a color</span>
          ) : sizeBalancesForColor.length === 0 ? (
            <span className="text-sm text-gray-400">No sizes</span>
          ) : (
            <div className="flex items-center gap-2">
              {sizeBalancesForColor.map((s) => (
                <div key={s!.id} className="flex items-center gap-1.5 rounded bg-white border border-orange-100 px-2.5 py-1 shadow-sm">
                  <span className="text-xs font-semibold text-gray-700">{s!.name}:</span>
                  <span className="text-xs font-medium text-gray-500 ml-0.5">({s!.balanceKg.toFixed(2)}kg)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-orange-100">
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Date</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Color</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Size</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Pieces</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Weight (kg)</TableHead>
              <TableHead className="text-center text-2xs font-semibold uppercase tracking-wide text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id} className="hover:bg-orange-50/40">
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-700 px-2.5 py-0.5 text-xs font-semibold">
                      {r.color?.name ?? 'Ã¢â‚¬â€'}
                    </span>
                  </TableCell>
                  <TableCell>{r.size?.name ?? ''}</TableCell>
                  <TableCell className="text-center">{r.pieceCount}</TableCell>
                  <TableCell className="text-center">{r.weightKg.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon-sm" className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" aria-label="Edit row" onClick={() => openEdit(r)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label="Delete row" onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {formOpen && <LoadSentFormDialog onClose={() => setFormOpen(false)} record={editingRecord} />}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this load sent record?"
        description={deleteTarget ? `${deleteTarget.pieceCount} pcs, ${deleteTarget.weightKg.toFixed(2)} kg. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function StockSummaryCard({ onAdd, onViewDetails, onEditDate, onDeleteDate }: { onAdd: (e: React.MouseEvent) => void; onViewDetails: () => void; onEditDate: (date: string) => void; onDeleteDate: (date: string, records: InventoryRecord[]) => void }) {
  const { data } = useInventoryRecords('?limit=100');
  const { data: lookupsData } = useLookups();
  const records = data?.data ?? [];

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  const monthRecords = records.filter(r => r.date.startsWith(month));
  const totalStock = monthRecords.reduce((sum, r) => sum + r.weightKg, 0);

  // Category totals from monthly records
  const getCategoryData = (type: InventoryType) => {
    const categoryRecords = monthRecords.filter(r => r.type === type);
    const weight = categoryRecords.reduce((sum, r) => sum + r.weightKg, 0);
    const itemsMap = new Map<string, number>();
    categoryRecords.forEach(r => {
      if (r.name) itemsMap.set(r.name, (itemsMap.get(r.name) || 0) + r.weightKg);
    });
    const items = Array.from(itemsMap.entries()).map(([name, w]) => ({ name, weight: w }));
    return { weight, items };
  };

  const rawMaterials = getCategoryData('HDPE');
  const chemicals = getCategoryData('CHEMICAL');
  const colors = getCategoryData('COLOR');

  // All columns come from lookup data (show all even if 0 received)
  const hdpeNames = (lookupsData?.brands ?? []).map(b => b.name).sort();
  const chemicalNames = (lookupsData?.chemicals ?? []).map(c => c.name).sort();
  const colorNames = (lookupsData?.colors ?? []).map(c => c.name).sort();

  // Build date-grouped rows
  const groupedByDate = Array.from(
    monthRecords.reduce((map, r) => {
      const d = formatDate(r.date);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
      return map;
    }, new Map<string, InventoryRecord[]>()).entries()
  ).sort(([a], [b]) => b.localeCompare(a));

  const getWeight = (dayRecords: InventoryRecord[], type: InventoryType, name: string) =>
    dayRecords.filter(r => r.type === type && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);

  // Totals row
  const hdpeTotals = hdpeNames.map(name => monthRecords.filter(r => r.type === 'HDPE' && r.name === name).reduce((s, r) => s + r.weightKg, 0));
  const chemTotals = chemicalNames.map(name => monthRecords.filter(r => r.type === 'CHEMICAL' && r.name === name).reduce((s, r) => s + r.weightKg, 0));
  const colorTotals = colorNames.map(name => monthRecords.filter(r => r.type === 'COLOR' && r.name === name).reduce((s, r) => s + r.weightKg, 0));

  const totalCols = hdpeNames.length + chemicalNames.length + colorNames.length;

  return (
    <div className="flex flex-col gap-4">
      {/* === Top Summary Card === */}
      <div className="rounded-xl border border-green-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-green-200 bg-gradient-to-br from-green-50 via-emerald-50/50 to-white relative overflow-hidden flex items-center justify-between">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-green-400/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 shadow-sm shrink-0">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div className="flex flex-col mr-2">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">Stock Received</h2>
              <p className="text-xs text-gray-500">Warehouse In-flow</p>
            </div>

          </div>
          <div className="flex items-center gap-3 relative z-10">
            <Button size="sm" onClick={onAdd} className="bg-green-600 hover:bg-green-700 h-9 text-xs shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" /> Add Stock
            </Button>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-9 text-sm w-36 bg-white/60 shadow-sm font-medium" />

          </div>
        </div>

        {/* Mini cards: HDPE, Chemicals, Colors */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-green-50/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* HDPE Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-200 transition-colors flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <Layers className="w-16 h-16 text-blue-600" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100 text-blue-600"><Layers className="w-4 h-4" /></div>
                  <h3 className="font-semibold text-gray-800 text-sm">HDPE</h3>
                </div>
                <div className="text-xl font-black text-gray-900 leading-none">{rawMaterials.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {rawMaterials.items.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {rawMaterials.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-bold text-gray-900">{item.weight.toFixed(2)}<span className="text-gray-400 font-normal text-[10px] ml-0.5">kg</span></span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-xs text-gray-400 italic">No HDPE this month</span>}
              </div>
            </div>

            {/* Chemicals Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 relative overflow-hidden group/card hover:border-orange-200 transition-colors flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <FlaskConical className="w-16 h-16 text-orange-600" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="bg-orange-50 p-1.5 rounded-lg border border-orange-100 text-orange-600"><FlaskConical className="w-4 h-4" /></div>
                  <h3 className="font-semibold text-gray-800 text-sm">Chemicals</h3>
                </div>
                <div className="text-xl font-black text-gray-900 leading-none">{chemicals.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {chemicals.items.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {chemicals.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-bold text-gray-900">{item.weight.toFixed(2)}<span className="text-gray-400 font-normal text-[10px] ml-0.5">kg</span></span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-xs text-gray-400 italic">No chemicals this month</span>}
              </div>
            </div>

            {/* Colors Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 relative overflow-hidden group/card hover:border-purple-200 transition-colors flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <Palette className="w-16 h-16 text-purple-600" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-50 p-1.5 rounded-lg border border-purple-100 text-purple-600"><Palette className="w-4 h-4" /></div>
                  <h3 className="font-semibold text-gray-800 text-sm">Colors</h3>
                </div>
                <div className="text-xl font-black text-gray-900 leading-none">{colors.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
              </div>
              <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
                {colors.items.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                    {colors.items.map(item => (
                      <div key={item.name} className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium text-gray-500">{item.name}</span>
                        <span className="font-bold text-gray-900">{item.weight.toFixed(2)}<span className="text-gray-400 font-normal text-[10px] ml-0.5">kg</span></span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-xs text-gray-400 italic">No colors this month</span>}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* === Day-wise Table Section === */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-700 text-sm">Day Wise Stock Received Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th rowSpan={2} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[11px] whitespace-nowrap w-28">DATE</th>
                {hdpeNames.length > 0 && (
                  <th colSpan={hdpeNames.length} className="border border-gray-200 px-3 py-2 text-center font-bold text-teal-800 uppercase tracking-wide text-[11px] bg-blue-100">
                    HDPE (KG)
                  </th>
                )}
                {chemicalNames.length > 0 && (
                  <th colSpan={chemicalNames.length} className="border border-gray-200 px-3 py-2 text-center font-bold text-yellow-800 uppercase tracking-wide text-[11px] bg-yellow-100">
                    CHEMICALS (KG)
                  </th>
                )}
                {colorNames.length > 0 && (
                  <th colSpan={colorNames.length} className="border border-gray-200 px-3 py-2 text-center font-bold text-green-800 uppercase tracking-wide text-[11px] bg-green-100">
                    COLORS (KG)
                  </th>
                )}
                {totalCols === 0 && <th className="border border-gray-200 px-3 py-1.5 text-gray-400"></th>}
                <th rowSpan={2} className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-500 uppercase tracking-wide text-[11px] whitespace-nowrap w-20">ACTIONS</th>
              </tr>
              <tr className="bg-white border-b border-gray-200">
                {hdpeNames.map(name => (
                  <th key={name} className="border border-gray-200 px-3 py-1.5 text-center font-bold text-gray-800 text-[11px] uppercase whitespace-nowrap">{name}</th>
                ))}
                {chemicalNames.map(name => (
                  <th key={name} className="border border-gray-200 px-3 py-1.5 text-center font-bold text-gray-800 text-[11px] uppercase whitespace-nowrap">{name}</th>
                ))}
                {colorNames.map(name => (
                  <th key={name} className="border border-gray-200 px-3 py-1.5 text-center font-bold text-gray-800 text-[11px] uppercase whitespace-nowrap">{name}</th>
                ))}
                {totalCols === 0 && <th className="border border-gray-200"></th>}
              </tr>
            </thead>
            <tbody>
              {groupedByDate.length === 0 ? (
                <tr>
                  <td colSpan={2 + totalCols || 3} className="text-center py-8 text-gray-400 text-sm">No stock received this month.</td>
                </tr>
              ) : (
                groupedByDate.map(([date, dayRecords]) => (
                  <tr key={date} className="hover:bg-green-50/40 transition-colors group">
                    <td className="border border-gray-200 px-3 py-1 font-bold text-teal-900 whitespace-nowrap text-sm">{formatDateDisplay(date)}</td>
                    {hdpeNames.map(name => {
                      const val = getWeight(dayRecords, 'HDPE', name);
                      return (
                        <td key={name} className="border border-gray-200 px-3 py-1 text-center font-medium text-gray-800 text-xs">
                          {val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}
                        </td>
                      );
                    })}
                    {chemicalNames.map(name => {
                      const val = getWeight(dayRecords, 'CHEMICAL', name);
                      return (
                        <td key={name} className="border border-gray-200 px-3 py-1 text-center font-medium text-gray-800 text-xs">
                          {val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}
                        </td>
                      );
                    })}
                    {colorNames.map(name => {
                      const val = getWeight(dayRecords, 'COLOR', name);
                      return (
                        <td key={name} className="border border-gray-200 px-3 py-1 text-center font-medium text-gray-800 text-xs">
                          {val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}
                        </td>
                      );
                    })}
                    {totalCols === 0 && <td className="border border-gray-200 px-3 py-1"></td>}
                    <td className="border border-gray-200 px-3 py-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon-sm" className="h-6 w-6 rounded-full text-blue-600 hover:bg-blue-50" onClick={() => onEditDate(date)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="h-6 w-6 rounded-full text-red-600 hover:bg-red-50" onClick={() => onDeleteDate(date, dayRecords)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {groupedByDate.length > 0 && (
                <tr className="bg-white border-t-2 border-gray-300 font-bold">
                  <td className="border border-gray-200 px-3 py-1.5 text-gray-800 uppercase text-[11px] tracking-wide font-bold">TOTAL</td>
                  {hdpeTotals.map((val, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-1 text-center text-teal-600 text-xs font-bold">{val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}</td>
                  ))}
                  {chemTotals.map((val, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-1 text-center text-teal-600 text-xs font-bold">{val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}</td>
                  ))}
                  {colorTotals.map((val, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-1 text-center text-teal-600 text-xs font-bold">{val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}</td>
                  ))}
                  {totalCols === 0 && <td className="border border-gray-200 px-3 py-1"></td>}
                  <td className="border border-gray-200 px-3 py-1"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InventorySummary({ onSelect }: { onSelect: (view: 'receive' | 'send') => void }) {
  const queryClient = useQueryClient();
  const { data } = useInventoryRecords('?limit=100');
  const allRecords = data?.data ?? [];

  const [stockFormOpen, setStockFormOpen] = useState(false);
  const [editTargetDate, setEditTargetDate] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ date: string, records: InventoryRecord[] } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteDate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await Promise.all(deleteTarget.records.map(r => apiFetch(`/inventory/${r.id}`, { method: 'DELETE' })));
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTargetDate(null);
    setStockFormOpen(true);
  };

  const openEdit = (date: string) => {
    setEditTargetDate(date);
    setStockFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <StockSummaryCard
        onAdd={openAdd}
        onViewDetails={() => onSelect('receive')}
        onEditDate={openEdit}
        onDeleteDate={(date, records) => setDeleteTarget({ date, records })}
      />
      {stockFormOpen && (
        <InventoryFormDialog
          onClose={() => setStockFormOpen(false)}
          editDate={editTargetDate ?? undefined}
          editRecords={editTargetDate ? allRecords.filter(r => formatDate(r.date) === editTargetDate) : undefined}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete all stock received on this day?"
        description={deleteTarget ? `Are you sure you want to delete all ${deleteTarget.records.length} records for ${deleteTarget.date}? This cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDeleteDate}
      />
    </div>
  );
}

export function InventoryPage() {
  const [activeView, setActiveView] = useState<'summary' | 'receive' | 'send'>('summary');

  return (
    <div className="flex flex-col gap-6 p-4">
      {activeView === 'summary' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500">Track stock received into and sent out of the warehouse</p>
          </div>
          <InventorySummary onSelect={setActiveView} />
        </>
      )}
      {activeView === 'receive' && <InventoryReceiveTab onBack={() => setActiveView('summary')} />}
      {activeView === 'send' && <LoadSentTab onBack={() => setActiveView('summary')} />}
    </div>
  );
}


