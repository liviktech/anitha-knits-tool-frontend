import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, PackagePlus, PackageMinus, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { TablePaginationFooter } from '@/components/shared/table-pagination-footer';
import { apiFetch } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { useAuth } from '@/features/auth/auth-context';
import { can } from '@/lib/access';
import { RIGHTS } from '@/lib/permissions';
import { canCreateProductionRecord, canDeleteProductionRecord, canEditProductionRecord } from '@/lib/production-permissions';
import { formatDate, formatDateDisplay } from './inventory-utils';
import { InventoryFormDialog } from './inventory-form-dialog';
import { LoadSentFormDialog } from './load-sent-form-dialog';
import {
  useInventoryRecords,
  sumInventoryWeight,
  inventoryKeys,
  inventoryTypeLabels,
  type InventoryRecord,
  type InventoryType,
} from './inventory-queries';
import { useExtruderProductions } from '@/features/extruder/extruder-queries';
import {
  useLoadSentRecords,
  loadSentKeys,
  getLoadSentWeight,
  type LoadSentRecord,
} from './load-sent-queries';
import { useFabricCheckingRecords } from '@/features/fabric/fabric-queries';

/* ---------------------------------------------------------------------- */
/* Receive — backed by /api/v1/inventory                                   */
/* ---------------------------------------------------------------------- */

function InventoryReceiveTab({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canAdd = can(user, RIGHTS.inventory.add);
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

  const [deleteTarget, setDeleteTarget] = useState<InventoryRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { /* open create dialog if needed */ };

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
          {canAdd && (
            <Button
              size="sm"
              className="h-8 gap-1 rounded-full bg-[#004D40] text-white hover:bg-[#00332a]"
              onClick={openCreate}
            >
              <Plus className="h-3 w-3" /> Add received stock
            </Button>
          )}
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
                <TableCell colSpan={5} className="h-20 !text-center text-gray-500">No entries yet.</TableCell>
              </TableRow>
            ) : (
              groupedRecords.map((group) => (
                <TableRow key={group.date} className="hover:bg-transparent border-b border-green-300">
                  <TableCell className="align-middle pt-4 font-medium text-gray-900 w-32 border-r border-gray-300">{group.date}</TableCell>
                  <TableCell className="p-3 align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      {Array.from(new Set(group.records.map(r => r.type))).map((type) => (
                        <span key={type} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${getTypeColor(type)}`}>
                          {inventoryTypeLabels[type]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 align-middle border-l border-gray-300">
                    <div className="flex flex-wrap items-center gap-2">
                      {group.records.map((r) => (
                        <span key={r.id} className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border shadow-sm ${getTypeColor(r.type)}`}>
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 align-middle text-center border-l border-gray-300">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {group.records.map((r) => (
                        <span key={r.id} className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border shadow-sm ${getTypeColor(r.type)}`}>
                          {r.weightKg.toFixed(2)} kg
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 align-middle text-center border-l border-gray-300">
                    <Button variant="outline" size="sm" className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50 shadow-sm">
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
/* Send — backed by /api/v1/load-sent */
/* ---------------------------------------------------------------------- */

function LoadSentTab({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canAdd = canCreateProductionRecord(user);
  const canEdit = canEditProductionRecord(user, false);
  const canDelete = canDeleteProductionRecord(user);
  const { data: lookupsData } = useLookups();
  const colors = lookupsData?.colors ?? [];
  const sizes = lookupsData?.sizes ?? [];

  const { data: sentData, isLoading: isSentLoading } = useLoadSentRecords('?limit=100');
  const { data: prodData, isLoading: isProdLoading } = useFabricCheckingRecords('?limit=100');

  const records = sentData?.data ?? [];
  const prodRecords = prodData?.data ?? [];
  const isLoading = isSentLoading || isProdLoading;

  const totalKg = records.reduce((sum, r) => sum + getLoadSentWeight(r), 0);

  const [selectedColorId, setSelectedColorId] = useState<string>('');

  // Size balances for the selected color
  const sizeBalancesForColor = sizes.map(s => {
    if (!selectedColorId) return null;

    const prodForSizeColor = prodRecords.filter(r => r.size.id === s.id && r.color.id === selectedColorId);
    const prodKg = prodForSizeColor.reduce((sum, r) => sum + (r.fabricCheck?.outputKg ?? 0), 0);

    const sentForSizeColor = records.filter(r => r.size?.id === s.id && r.color?.id === selectedColorId);
    const sentKg = sentForSizeColor.reduce((sum, r) => sum + getLoadSentWeight(r), 0);

    return {
      id: s.id,
      name: s.name,
      balanceKg: prodKg - sentKg,
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
            <span className="text-xs font-medium text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{totalKg.toFixed(2)}</span>
            <span className="text-xs text-gray-400">kg</span>
          </div>
          {canAdd && (
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-full bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5" /> Add sent stock
            </Button>
          )}
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
            <TableRow className="hover:bg-transparent border-b border-orange-300">
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Date</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Color</TableHead>
              <TableHead className="text-2xs font-semibold uppercase tracking-wide text-gray-400">Size</TableHead>
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
                <TableCell colSpan={5} className="h-20 !text-center text-gray-500">No entries yet.</TableCell>
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
                  <TableCell className="text-center">{getLoadSentWeight(r).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canEdit && (
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" aria-label="Edit row" onClick={() => openEdit(r)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon-sm" className="rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label="Delete row" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
        description={deleteTarget ? `${getLoadSentWeight(deleteTarget).toFixed(2)} kg. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function StockSummaryCard({ month, onEditDate, onDeleteDate }: { month: string; onEditDate: (date: string) => void; onDeleteDate: (date: string, records: InventoryRecord[]) => void }) {
  const { user } = useAuth();
  const canEdit = can(user, RIGHTS.inventory.edit);
  const canDelete = can(user, RIGHTS.inventory.delete);
  const { data, isLoading } = useInventoryRecords('?limit=100');
  const { data: lookupsData } = useLookups();
  const records = data?.data ?? [];

  const monthRecords = records.filter(r => r.date.startsWith(month));

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

  // Top summary cards show the live balance (all-time received minus all-time production
  // consumption) rather than what was received this month — same calculation as the
  // Production page's Inventory Balances panel and the Dashboard's Raw Materials cards.
  const { data: allExtruderData } = useExtruderProductions('?limit=100');
  const extruderRecords = allExtruderData?.data ?? [];

  // Balances shown on these cards are stock levels, not ledgers — they never
  // display below 0.00 even if consumption momentarily outpaces recorded receipts.
  const getHDPEBalance = (name: string) =>
    Math.max(0, sumInventoryWeight(records, 'HDPE', name)
      - extruderRecords.filter(r => r.extruder?.brand?.name === name).reduce((sum, r) => sum + (r.extruder?.rawMaterialKg ?? 0), 0));

  const getChemicalBalance = (name: string) =>
    Math.max(0, sumInventoryWeight(records, 'CHEMICAL', name)
      - extruderRecords.filter(r => r.extruder?.chemical?.name === name).reduce((sum, r) => sum + (r.extruder?.chemicalKg ?? 0), 0));

  const getColorBalance = (name: string) =>
    Math.max(0, sumInventoryWeight(records, 'COLOR', name)
      - extruderRecords.filter(r => r.color?.name === name).reduce((sum, r) => sum + (r.extruder?.colorConsumedKg ?? 0), 0));

  const rawMaterialsBalance = {
    weight: hdpeNames.reduce((sum, name) => sum + getHDPEBalance(name), 0),
    items: hdpeNames.map(name => ({ name, weight: getHDPEBalance(name) })),
  };
  const chemicalsBalance = {
    weight: chemicalNames.reduce((sum, name) => sum + getChemicalBalance(name), 0),
    items: chemicalNames.map(name => ({ name, weight: getChemicalBalance(name) })),
  };
  const colorsBalance = {
    weight: colorNames.reduce((sum, name) => sum + getColorBalance(name), 0),
    items: colorNames.map(name => ({ name, weight: getColorBalance(name) })),
  };

  // Build date-grouped rows
  const groupedByDate = Array.from(
    monthRecords.reduce((map, r) => {
      const d = formatDate(r.date);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
      return map;
    }, new Map<string, InventoryRecord[]>()).entries()
  ).sort(([a], [b]) => b.localeCompare(a));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(groupedByDate.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedGroupedByDate = useMemo(
    () => groupedByDate.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [groupedByDate, currentPage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [month]);

  const getWeight = (dayRecords: InventoryRecord[], type: InventoryType, name: string) =>
    dayRecords.filter(r => r.type === type && r.name === name).reduce((sum, r) => sum + r.weightKg, 0);

  const getBags = (dayRecords: InventoryRecord[], type: InventoryType, name: string) =>
    dayRecords.filter(r => r.type === type && r.name === name).reduce((sum, r) => sum + (r.bagCount || 0), 0);

  // Totals row
  const hdpeTotals = hdpeNames.map(name => monthRecords.filter(r => r.type === 'HDPE' && r.name === name).reduce((s, r) => s + r.weightKg, 0));
  const hdpeBagTotals = hdpeNames.map(name => monthRecords.filter(r => r.type === 'HDPE' && r.name === name).reduce((s, r) => s + (r.bagCount || 0), 0));
  const chemTotals = chemicalNames.map(name => monthRecords.filter(r => r.type === 'CHEMICAL' && r.name === name).reduce((s, r) => s + r.weightKg, 0));
  const colorTotals = colorNames.map(name => monthRecords.filter(r => r.type === 'COLOR' && r.name === name).reduce((s, r) => s + r.weightKg, 0));

  const totalCols = hdpeNames.length + chemicalNames.length + colorNames.length;

  return (
    <div className="flex flex-col gap-2">
      {/* === Top Summary Card === */}
      {/* Mini cards: HDPE, Chemicals, Colors */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

        {/* HDPE Card */}
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-blue-200 transition-colors flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/hdpe.png" alt="" className="w-26 h-26 object-contain" />
          </div>
          <div className="flex justify-between items-center mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className=""><img src="/hdpe.png" alt="HDPE" className="w-12 h-12 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">HDPE Materials</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{rawMaterialsBalance.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
          </div>
          <div className="mt-auto relative z-10 pt-1 border-t border-gray-50">
            {rawMaterialsBalance.items.length > 0 ? (
              <div className={`flex flex-wrap items-center gap-x-11 gap-y-1 ${rawMaterialsBalance.items.length === 1 ? 'justify-center' : 'justify-start'}`}>
                {rawMaterialsBalance.items.map(item => (
                  <div key={item.name} className={`flex flex-col gap-0.5 ${rawMaterialsBalance.items.length === 1 ? 'items-center text-center' : 'items-start text-left'}`}>
                    <span className="font-medium text-gray-500 text-sm">{item.name}</span>
                    <span className="font-extrabold text-[#004D40] text-sm">{item.weight.toFixed(2)}<span className="text-gray-500 font-normal text-xs ml-0.5">kg</span></span>
                  </div>
                ))}
              </div>
            ) : <span className="text-xs text-gray-400 italic">No HDPE brands configured</span>}
          </div>
        </div>

        {/* Chemicals Card */}
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-orange-200 transition-colors flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/chemical.png" alt="" className="w-26 h-26 object-contain" />
          </div>
          <div className="flex justify-between items-center mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className=""><img src="/chemical.png" alt="Chemicals" className="w-12 h-12 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Chemicals</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{chemicalsBalance.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
          </div>
          <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
            {chemicalsBalance.items.length > 0 ? (
              <div className={`flex flex-wrap items-center gap-x-11 gap-y-3 mt-2 ${chemicalsBalance.items.length === 1 ? 'justify-center' : 'justify-start'}`}>
                {chemicalsBalance.items.map(item => (
                  <div key={item.name} className={`flex flex-col gap-0.5 ${chemicalsBalance.items.length === 1 ? 'items-center text-center' : 'items-start text-left'}`}>
                    <span className="font-medium text-gray-500 text-sm">{item.name}</span>
                    <span className="font-extrabold text-[#004D40] text-sm">{item.weight.toFixed(2)}<span className="text-gray-500 font-normal text-xs ml-0.5">kg</span></span>
                  </div>
                ))}
              </div>
            ) : <span className="text-xs text-gray-400 italic">No chemicals configured</span>}
          </div>
        </div>

        {/* Colors Card */}
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4 relative overflow-hidden group/card hover:border-purple-200 transition-colors flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <img src="/color.png" alt="" className="w-26 h-26 object-contain" />
          </div>
          <div className="flex justify-between items-center mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className=""><img src="/color.png" alt="Colors" className="w-12 h-12 object-contain" /></div>
              <h3 className="font-extrabold text-gray-800 text-lg">Colors</h3>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-none">{colorsBalance.weight.toFixed(2)} <span className="text-xs font-medium text-gray-500">kg</span></div>
          </div>
          <div className="mt-auto relative z-10 pt-2 border-t border-gray-50">
            {colorsBalance.items.length > 0 ? (
              <div className={`flex flex-wrap items-center gap-x-11 gap-y-3 mt-2 ${colorsBalance.items.length === 1 ? 'justify-center' : 'justify-start'}`}>
                {colorsBalance.items.map(item => (
                  <div key={item.name} className={`flex flex-col gap-0.5 ${colorsBalance.items.length === 1 ? 'items-center text-center' : 'items-start text-left'}`}>
                    <span className="font-medium text-gray-500 text-sm">{item.name}</span>
                    <span className="font-extrabold text-[#004D40] text-sm">{item.weight.toFixed(2)}<span className="text-gray-500 font-normal text-xs ml-0.5">kg</span></span>
                  </div>
                ))}
              </div>
            ) : <span className="text-xs text-gray-400 italic">No colors configured</span>}
          </div>
        </div>

      </div>



      {/* === Day-wise Table Section === */}
      <div className="rounded-xl border border-gray-400 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-400 bg-gray-50">
          <h3 className="font-bold text-[#004D40] text-lg">Day Wise Stock Received Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th rowSpan={3} className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap w-1">DATE</th>
                {hdpeNames.length > 0 && (
                  <th colSpan={(hdpeNames.length * 2) + 3} className="border border-gray-300 px-3 py-2 text-center font-bold text-teal-800 uppercase tracking-wide text-xs bg-blue-100">
                    HDPE
                  </th>
                )}
                {chemicalNames.length > 0 && (
                  <th colSpan={chemicalNames.length + 2} className="border border-gray-300 px-3 py-2 text-center font-bold text-yellow-800 uppercase tracking-wide text-xs bg-yellow-100">
                    CHEMICALS
                  </th>
                )}
                {colorNames.length > 0 && (
                  <th colSpan={colorNames.length + 2} className="border border-gray-300 px-3 py-2 text-center font-bold text-green-800 uppercase tracking-wide text-xs bg-green-100">
                    COLORS
                  </th>
                )}
                {totalCols === 0 && <th className="border border-gray-300 px-3 py-1.5 text-gray-400"></th>}
                <th rowSpan={3} className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap w-20">ACTIONS</th>
              </tr>
              <tr className="bg-white border-b border-gray-300">
                {hdpeNames.length > 0 && <th rowSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-gray-800 text-xs uppercase whitespace-nowrap bg-gray-50/50">DC NO</th>}
                {hdpeNames.map(name => (
                  <th key={name} colSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-blue-800 text-xs uppercase whitespace-nowrap">{name}</th>
                ))}
                {hdpeNames.length > 0 && <th colSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-teal-800 text-xs uppercase whitespace-nowrap bg-blue-50/70">Total</th>}
                
                {chemicalNames.length > 0 && <th rowSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-gray-800 text-xs uppercase whitespace-nowrap bg-gray-50/50">DC NO</th>}
                {chemicalNames.map(name => (
                  <th key={name} rowSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-gray-800 text-xs uppercase whitespace-nowrap">{name}</th>
                ))}
                {chemicalNames.length > 0 && <th rowSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-yellow-800 text-xs uppercase whitespace-nowrap bg-yellow-50/70">Total</th>}
                
                {colorNames.length > 0 && <th rowSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-gray-800 text-xs uppercase whitespace-nowrap bg-gray-50/50">DC NO</th>}
                {colorNames.map(name => (
                  <th key={name} rowSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-gray-800 text-xs uppercase whitespace-nowrap">{name}</th>
                ))}
                {colorNames.length > 0 && <th rowSpan={2} className="border border-gray-300 px-3 py-1.5 text-center font-bold text-green-800 text-xs uppercase whitespace-nowrap bg-green-50/70">Total</th>}
                {totalCols === 0 && <th rowSpan={2} className="border border-gray-300"></th>}
              </tr>
              <tr className="bg-white border-b border-gray-300">
                {hdpeNames.flatMap(name => [
                  <th key={`${name}-bags`} className="border border-gray-300 px-3 py-1 text-center font-bold text-blue-700 text-[10px] uppercase whitespace-nowrap bg-blue-50/10">BAGS</th>,
                  <th key={`${name}-kg`} className="border border-gray-300 px-3 py-1 text-center font-bold text-blue-700 text-[10px] uppercase whitespace-nowrap">WEIGHT (KG)</th>
                ])}
                {hdpeNames.length > 0 && (
                  <>
                    <th className="border border-gray-300 px-3 py-1 text-center font-bold text-teal-800 text-[10px] uppercase whitespace-nowrap bg-blue-50/30">BAGS</th>
                    <th className="border border-gray-300 px-3 py-1 text-center font-bold text-teal-800 text-[10px] uppercase whitespace-nowrap bg-blue-50/30">WEIGHT (KG)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={2 + (hdpeNames.length > 0 ? (hdpeNames.length * 2) + 3 : 0) + (chemicalNames.length > 0 ? chemicalNames.length + 2 : 0) + (colorNames.length > 0 ? colorNames.length + 2 : 0) + (totalCols === 0 ? 1 : 0)} className="h-28 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                      <Loader size="sm" /> Loading stock records...
                    </div>
                  </td>
                </tr>
              ) : groupedByDate.length === 0 ? (
                <tr>
                  <td colSpan={2 + (hdpeNames.length > 0 ? (hdpeNames.length * 2) + 3 : 0) + (chemicalNames.length > 0 ? chemicalNames.length + 2 : 0) + (colorNames.length > 0 ? colorNames.length + 2 : 0) + (totalCols === 0 ? 1 : 0)} className="!text-center py-8 text-gray-400 text-sm">No stock received this month.</td>
                </tr>
              ) : (
                pagedGroupedByDate.map(([date, dayRecords]) => {
                  const dayHdpeTotal = dayRecords.filter(r => r.type === 'HDPE').reduce((s, r) => s + r.weightKg, 0);
                  const dayChemicalTotal = dayRecords.filter(r => r.type === 'CHEMICAL').reduce((s, r) => s + r.weightKg, 0);
                  const dayColorTotal = dayRecords.filter(r => r.type === 'COLOR').reduce((s, r) => s + r.weightKg, 0);
                  return (
                    <tr key={date} className="hover:bg-green-50/40 transition-colors group">
                      <td className="border border-gray-300 px-3 py-1 font-bold text-gray-800 whitespace-nowrap text-sm">{formatDateDisplay(date).replace(/,?\s*\d{4}$/, '')}</td>
                      {hdpeNames.length > 0 && (
                        <td className="border border-gray-300 px-3 py-1 text-center font-bold text-gray-800 text-sm bg-blue-50/30">
                          {dayRecords.find(r => r.type === 'HDPE')?.DC_NUMBER || '-'}
                        </td>
                      )}
                      {hdpeNames.flatMap(name => {
                        const val = getWeight(dayRecords, 'HDPE', name);
                        const bags = getBags(dayRecords, 'HDPE', name);
                        return [
                          <td key={`${name}-bags`} className="border border-gray-300 px-3 py-1 text-center font-medium text-blue-700 text-sm bg-blue-50/10">
                            {bags > 0 ? bags : <span className="text-gray-400">0</span>}
                          </td>,
                          <td key={`${name}-kg`} className="border border-gray-300 px-3 py-1 text-center font-medium text-gray-800 text-sm">
                            {val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}
                          </td>
                        ];
                      })}
                      {hdpeNames.length > 0 && (
                        <>
                          <td className="border border-gray-300 px-3 py-1 text-center font-bold text-blue-800 text-sm bg-blue-50/50">
                            {dayRecords.filter(r => r.type === 'HDPE').reduce((s, r) => s + (r.bagCount || 0), 0) > 0 ? dayRecords.filter(r => r.type === 'HDPE').reduce((s, r) => s + (r.bagCount || 0), 0) : <span className="text-gray-500">0</span>}
                          </td>
                          <td className="border border-gray-300 px-3 py-1 text-center font-bold text-gray-800 text-sm bg-blue-50/30">
                            {dayHdpeTotal > 0 ? dayHdpeTotal.toFixed(2) : <span className="text-gray-500">0.00</span>}
                          </td>
                        </>
                      )}
                      {chemicalNames.length > 0 && (
                        <td className="border border-gray-300 px-3 py-1 text-center font-bold text-gray-800 text-sm bg-yellow-50/30">
                          {dayRecords.find(r => r.type === 'CHEMICAL')?.DC_NUMBER || '-'}
                        </td>
                      )}
                      {chemicalNames.map(name => {
                        const val = getWeight(dayRecords, 'CHEMICAL', name);
                        return (
                          <td key={name} className="border border-gray-300 px-3 py-1 text-center font-medium text-gray-800 text-sm">
                            {val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}
                          </td>
                        );
                      })}
                      {chemicalNames.length > 0 && (
                        <td className="border border-gray-300 px-3 py-1 text-center font-bold text-gray-800 text-sm bg-yellow-50/30">
                          {dayChemicalTotal > 0 ? dayChemicalTotal.toFixed(2) : <span className="text-gray-500">0.00</span>}
                        </td>
                      )}
                      {colorNames.length > 0 && (
                        <td className="border border-gray-300 px-3 py-1 text-center font-bold text-gray-800 text-sm bg-green-50/30">
                          {dayRecords.find(r => r.type === 'COLOR')?.DC_NUMBER || '-'}
                        </td>
                      )}
                      {colorNames.map(name => {
                        const val = getWeight(dayRecords, 'COLOR', name);
                        return (
                          <td key={name} className="border border-gray-300 px-3 py-1 text-center font-medium text-gray-800 text-sm">
                            {val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}
                          </td>
                        );
                      })}
                      {colorNames.length > 0 && (
                        <td className="border border-gray-300 px-3 py-1 text-center font-bold text-gray-800 text-sm bg-green-50/30">
                          {dayColorTotal > 0 ? dayColorTotal.toFixed(2) : <span className="text-gray-500">0.00</span>}
                        </td>
                      )}
                      {totalCols === 0 && <td className="border border-gray-300 px-3 py-1"></td>}
                      <td className="border border-gray-300 px-3 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon-sm" className="h-6 w-6 rounded-full text-blue-600 hover:bg-blue-50" onClick={() => onEditDate(date)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon-sm" className="h-6 w-6 rounded-full text-red-600 hover:bg-red-50" onClick={() => onDeleteDate(date, dayRecords)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {groupedByDate.length > 0 && (
                <tr className="bg-white border-t-2 border-gray-300 font-bold">
                  <td className="border border-gray-300 px-3 py-1.5 text-gray-800 uppercase text-sm tracking-wide font-bold">TOTAL</td>
                  {hdpeNames.length > 0 && <td className="border border-gray-300 px-3 py-1 bg-gray-50"></td>}
                  {hdpeTotals.flatMap((val, i) => {
                    const bags = hdpeBagTotals[i];
                    return [
                      <td key={`${i}-bags`} className="border border-gray-300 px-3 py-1 text-center text-blue-800 text-sm font-bold bg-blue-50/10">
                        {bags > 0 ? bags : <span className="text-gray-400">0</span>}
                      </td>,
                      <td key={`${i}-kg`} className="border border-gray-300 px-3 py-1 text-center text-gray-800 text-sm font-bold">
                        {val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}
                      </td>
                    ];
                  })}
                  {hdpeNames.length > 0 && (
                    <>
                      <td className="border border-gray-300 px-3 py-1 text-center text-blue-800 text-sm font-bold bg-blue-100/50">
                        {hdpeBagTotals.reduce((a, b) => a + b, 0) > 0 ? hdpeBagTotals.reduce((a, b) => a + b, 0) : <span className="text-gray-500">0</span>}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-center text-gray-800 text-sm font-bold bg-blue-50/50">
                        {rawMaterials.weight > 0 ? rawMaterials.weight.toFixed(2) : <span className="text-gray-500">0.00</span>}
                      </td>
                    </>
                  )}
                  {chemicalNames.length > 0 && <td className="border border-gray-300 px-3 py-1 bg-gray-50"></td>}
                  {chemTotals.map((val, i) => (
                    <td key={i} className="border border-gray-300 px-3 py-1 text-center text-gray-800 text-sm font-bold">{val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}</td>
                  ))}
                  {chemicalNames.length > 0 && (
                    <td className="border border-gray-300 px-3 py-1 text-center text-gray-800 text-sm font-bold bg-yellow-50/50">{chemicals.weight > 0 ? chemicals.weight.toFixed(2) : <span className="text-gray-500">0.00</span>}</td>
                  )}
                  {colorNames.length > 0 && <td className="border border-gray-300 px-3 py-1 bg-gray-50"></td>}
                  {colorTotals.map((val, i) => (
                    <td key={i} className="border border-gray-300 px-3 py-1 text-center text-gray-800 text-sm font-bold">{val > 0 ? val.toFixed(2) : <span className="text-gray-500">0.00</span>}</td>
                  ))}
                  {colorNames.length > 0 && (
                    <td className="border border-gray-300 px-3 py-1 text-center text-gray-800 text-sm font-bold bg-green-50/50">{colors.weight > 0 ? colors.weight.toFixed(2) : <span className="text-gray-500">0.00</span>}</td>
                  )}
                  {totalCols === 0 && <td className="border border-gray-300 px-3 py-1"></td>}
                  <td className="border border-gray-300 px-3 py-1"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

function InventorySummary({ month, onEditDate }: { month: string; onEditDate: (date: string) => void }) {
  const queryClient = useQueryClient();

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

  return (
    <div className="flex flex-col gap-6">
      <StockSummaryCard
        month={month}
        onEditDate={onEditDate}
        onDeleteDate={(date, records) => setDeleteTarget({ date, records })}
      />

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
  const { user } = useAuth();
  const canAddStock = can(user, RIGHTS.inventory.add);
  const [activeView, setActiveView] = useState<'summary' | 'receive' | 'send'>('summary');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [stockFormOpen, setStockFormOpen] = useState(false);
  const [editTargetDate, setEditTargetDate] = useState<string | null>(null);

  const { data } = useInventoryRecords('?limit=100');
  const allRecords = data?.data ?? [];

  const openAdd = () => {
    setEditTargetDate(null);
    setStockFormOpen(true);
  };

  const openEdit = (date: string) => {
    setEditTargetDate(date);
    setStockFormOpen(true);
  };

  return (
    <div id="inventory-layout" className="flex flex-col h-full bg-[#004D40]/5 min-h-full flex-1">
      <style>{`
        #inventory-layout, #inventory-layout * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #inventory-layout .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      {/* Unified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div>
          <h1 className="text-[20px] font-bold text-black leading-tight px-2">Inventory</h1>
          <p className="text-[12.5px] text-gray-500 font-medium px-2">Track stock received into and sent out of the warehouse</p>
        </div>
        {activeView === 'summary' && (
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-9 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-sm font-semibold text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
            />
            {canAddStock && (
              <Button
                className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)]"
                onClick={openAdd}
              >
                <Plus className="w-3 h-3" />
                ADD STOCK
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative flex flex-col bg-[#004D40]/5">
        <div className="flex flex-col gap-2 p-2">
          {activeView === 'summary' && <InventorySummary month={month} onEditDate={openEdit} />}
          {activeView === 'receive' && <InventoryReceiveTab onBack={() => setActiveView('summary')} />}
          {activeView === 'send' && <LoadSentTab onBack={() => setActiveView('summary')} />}
        </div>
      </div>

      {stockFormOpen && (
        <InventoryFormDialog
          onClose={() => setStockFormOpen(false)}
          editDate={editTargetDate ?? undefined}
          editRecords={editTargetDate ? allRecords.filter(r => formatDate(r.date) === editTargetDate) : undefined}
        />
      )}
    </div>
  );
}


