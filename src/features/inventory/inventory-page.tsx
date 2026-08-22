import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, PackagePlus, PackageMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

/* ---------------------------------------------------------------------- */
/* Receive — backed by /api/v1/inventory                                   */
/* ---------------------------------------------------------------------- */

interface InventoryFormDialogProps {
  onClose: () => void;
  record: InventoryRecord | null;
}

/**
 * Mounted only while the dialog is open (see call site), so state can
 * initialize once from `record` at mount instead of syncing via an effect.
 *
 * Add and Edit are genuinely different operations against the real API:
 * create (POST) supplies type + brandId/chemicalId/colorId and a
 * quantityKg that's ADDED to the item's running balance, while update
 * (PATCH) can only correct the date or directly SET the balance
 * (weightKg) of an existing item — identity fields can't change there.
 */
function InventoryFormDialog({ onClose, record }: InventoryFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData, isLoading: lookupsLoading } = useLookups();
  const isEdit = !!record;

  const [date, setDate] = useState(record ? formatDate(record.date) : todayIso());
  const [type, setType] = useState<InventoryType | ''>('');
  const [itemId, setItemId] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [weightKg, setWeightKg] = useState(record ? String(record.weightKg) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOptions =
    type === 'RAW_MATERIAL' ? lookupsData?.brands
    : type === 'CHEMICAL' ? lookupsData?.chemicals
    : type === 'COLOR' ? lookupsData?.colors
    : undefined;
  const nameLabel = type === 'RAW_MATERIAL' ? 'brand' : type === 'CHEMICAL' ? 'chemical' : 'color';

  const handleTypeChange = (value: InventoryType) => {
    setType(value);
    setItemId('');
  };

  const handleSubmit = async () => {
    let url: string;
    let method: 'POST' | 'PATCH';
    let payload: InventoryCreatePayload | InventoryUpdatePayload;

    if (isEdit) {
      if (!weightKg.trim()) {
        setError('Please enter the balance.');
        return;
      }
      url = `/inventory/${record.id}`;
      method = 'PATCH';
      payload = { date, weightKg: parseFloat(weightKg) || 0 };
    } else {
      if (!type || !itemId || !quantityKg.trim()) {
        setError('Please fill in Type, Name, and Quantity.');
        return;
      }
      url = '/inventory';
      method = 'POST';
      payload = {
        date,
        type,
        quantityKg: parseFloat(quantityKg) || 0,
        ...(type === 'RAW_MATERIAL' && { brandId: itemId }),
        ...(type === 'CHEMICAL' && { chemicalId: itemId }),
        ...(type === 'COLOR' && { colorId: itemId }),
      };
    }

    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save inventory record');

      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      onClose();
    } catch (e) {
      console.error('Error saving inventory record:', e);
      setError('Could not save this record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !saving && !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Correct Stock Balance' : 'Add Received Stock'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-date">Date</Label>
            <Input id="inv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {isEdit ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Item</Label>
                <Input value={`${inventoryTypeLabels[record.type]} — ${record.name}`} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-balance">Current Balance (kg)</Label>
                <Input id="inv-balance" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-type">Type</Label>
                <Select value={type || undefined} onValueChange={(value) => handleTypeChange(value as InventoryType)}>
                  <SelectTrigger id="inv-type" className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(inventoryTypeLabels) as [InventoryType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-name">Name</Label>
                <Select value={itemId || undefined} onValueChange={setItemId} disabled={!type || lookupsLoading}>
                  <SelectTrigger id="inv-name" className="w-full">
                    {lookupsLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground"><Loader size="sm" /> Loading...</span>
                    ) : (
                      <SelectValue placeholder={type ? `Select ${nameLabel}` : 'Select a type first'} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {(nameOptions ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-quantity">Quantity to Add (kg)</Label>
                <Input id="inv-quantity" type="number" value={quantityKg} onChange={(e) => setQuantityKg(e.target.value)} />
              </div>
            </>
          )}
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

function InventoryReceiveTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useInventoryRecords('?limit=100');
  const records = data?.data ?? [];
  const totalKg = records.reduce((sum, r) => sum + r.weightKg, 0);

  const [formOpen, setFormOpen] = useState(false);
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
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>{inventoryTypeLabels[r.type]}</TableCell>
                  <TableCell>{r.name}</TableCell>
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



      {formOpen && <InventoryFormDialog onClose={() => setFormOpen(false)} record={editingRecord} />}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this inventory record?"
        description={deleteTarget ? `"${deleteTarget.name}" — ${deleteTarget.weightKg.toFixed(2)} kg. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Send — backed by /api/v1/load-sent                                      */
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls-pieces">Piece Count</Label>
            <Input id="ls-pieces" type="number" value={pieceCount} onChange={(e) => setPieceCount(e.target.value)} />
          </div>
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

function LoadSentTab() {
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
    const prodKg = prodForSizeColor.reduce((sum, r) => sum + (r.fabricCheck?.firstGradeKg ?? 0) + (r.fabricCheck?.secondGradeKg ?? 0), 0);
    const prodPcs = prodForSizeColor.reduce((sum, r) => sum + (r.fabricCheck?.pieceCount ?? 0), 0);

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
                  <span className="text-xs font-bold text-gray-900">{s!.balancePcs} <span className="font-normal text-gray-500 text-[10px]">pcs</span></span>
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
                      {r.color?.name ?? '—'}
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

export function InventoryPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">Track stock received into and sent out of the warehouse</p>
      </div>

      <Tabs defaultValue="receive">
        <TabsList variant="underline">
          <TabsTrigger value="receive">Stock</TabsTrigger>
          <TabsTrigger value="send">Load Sent</TabsTrigger>
        </TabsList>
        <TabsContent value="receive" className="mt-4">
          <InventoryReceiveTab />
        </TabsContent>
        <TabsContent value="send" className="mt-4">
          <LoadSentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
