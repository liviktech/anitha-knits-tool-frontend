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
import { apiUrl } from '@/lib/api-client';
import { useLookups, findIdByName } from '@/lib/lookups';
import {
  useInventoryRecords,
  inventoryKeys,
  inventoryTypeLabels,
  type InventoryRecord,
  type InventoryType,
  type InventoryCreatePayload,
} from './inventory-queries';
import {
  useLoadSentRecords,
  loadSentKeys,
  type LoadSentRecord,
  type LoadSentCreatePayload,
} from './load-sent-queries';

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

/** Mounted only while the dialog is open (see call site), so state can
 * initialize once from `record` at mount instead of syncing via an effect. */
function InventoryFormDialog({ onClose, record }: InventoryFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData, isLoading: lookupsLoading } = useLookups();
  const isEdit = !!record;

  const [date, setDate] = useState(record ? formatDate(record.date) : todayIso());
  const [type, setType] = useState<InventoryType | ''>(record?.type ?? '');
  const [name, setName] = useState(record?.name ?? '');
  const [weightKg, setWeightKg] = useState(record ? String(record.weightKg) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Name is a lookup-backed dropdown for every type — Raw Material picks
  // from the brand master data, Chemical/Color from their own — since these
  // names must match real master data. `isNameLookup` stays true while
  // lookups are still loading so the field doesn't silently fall back to
  // free text during that window.
  const isNameLookup = type === 'RAW_MATERIAL' || type === 'CHEMICAL' || type === 'COLOR';
  const nameOptions =
    type === 'RAW_MATERIAL' ? lookupsData?.brands
    : type === 'CHEMICAL' ? lookupsData?.chemicals
    : type === 'COLOR' ? lookupsData?.colors
    : undefined;
  const nameLabel = type === 'RAW_MATERIAL' ? 'brand' : type === 'CHEMICAL' ? 'chemical' : 'color';

  const handleTypeChange = (value: InventoryType) => {
    setType(value);
    // Clear the name when switching type so a stale free-text/dropdown value
    // from the previous type can't be silently submitted for the new one.
    if (value !== record?.type) setName('');
    else setName(record?.name ?? '');
  };

  const handleSubmit = async () => {
    if (!type || !name.trim() || !weightKg) {
      setError('Please fill in Type, Name, and Weight.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: InventoryCreatePayload = {
        date,
        type,
        name: name.trim(),
        weightKg: parseFloat(weightKg) || 0,
      };
      const response = await fetch(isEdit ? apiUrl(`/inventory/${record.id}`) : apiUrl('/inventory'), {
        method: isEdit ? 'PATCH' : 'POST',
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
          <DialogTitle>{isEdit ? 'Edit Received Stock' : 'Add Received Stock'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-date">Date</Label>
            <Input id="inv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
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
            {isNameLookup ? (
              <Select value={name || undefined} onValueChange={setName} disabled={lookupsLoading}>
                <SelectTrigger id="inv-name" className="w-full">
                  {lookupsLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground"><Loader size="sm" /> Loading...</span>
                  ) : (
                    <SelectValue placeholder={`Select ${nameLabel}`} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {(nameOptions ?? []).map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input id="inv-name" placeholder="Select a type first" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} disabled={!type} />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-weight">Weight (kg)</Label>
            <Input id="inv-weight" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
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
      const response = await fetch(apiUrl(`/inventory/${deleteTarget.id}`), { method: 'DELETE' });
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
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Total</span>
          <Input type="number" className="h-8 w-28 text-right" value={totalKg.toFixed(2)} readOnly />
          <span className="text-gray-400">kg</span>
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

      <div className="p-4 border-t border-gray-50">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
          onClick={openCreate}
        >
          <Plus className="h-3 w-3" /> Add received stock
        </Button>
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
      const response = await fetch(isEdit ? apiUrl(`/load-sent/${record.id}`) : apiUrl('/load-sent'), {
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
  const { data, isLoading } = useLoadSentRecords('?limit=100');
  const records = data?.data ?? [];
  const totalKg = records.reduce((sum, r) => sum + r.weightKg, 0);
  const totalPieces = records.reduce((sum, r) => sum + r.pieceCount, 0);

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
      const response = await fetch(apiUrl(`/load-sent/${deleteTarget.id}`), { method: 'DELETE' });
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
    <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-orange-100 p-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-orange-200 bg-orange-50 text-orange-700">
            <PackageMinus className="h-4 w-4" />
          </div>
          <h2 className="font-bold text-gray-900">Stock Sent</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Pieces</span>
            <Input type="number" className="h-8 w-20 text-right" value={totalPieces} readOnly />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Total</span>
            <Input type="number" className="h-8 w-28 text-right" value={totalKg.toFixed(2)} readOnly />
            <span className="text-gray-400">kg</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>{r.color?.name ?? ''}</TableCell>
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

      <div className="p-4 border-t border-gray-50">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
          onClick={openCreate}
        >
          <Plus className="h-3 w-3" /> Add sent stock
        </Button>
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
        <TabsList className="w-fit">
          <TabsTrigger value="receive">Receive</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
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
