import { useState } from 'react';
import { Plus, Trash2, Edit2, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useLookups } from '@/lib/lookups';
import { Loader } from '@/components/shared/loader';

type OpeningBalanceFabricGroup = {
  id: string;
  date: string;
  color: string;
  size: string;
  koraBalanceKg: number;
  fabricStockKg: number;
};

export function OpeningBalanceFabricTab() {
  const { data: lookupsData, isLoading } = useLookups();
  const [records, setRecords] = useState<OpeningBalanceFabricGroup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OpeningBalanceFabricGroup | null>(null);

  if (isLoading) return <Loader className="m-auto mt-10" />;

  const handleDelete = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  const handleOpenEdit = (record: OpeningBalanceFabricGroup) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Fabric Stock Opening Balance</h3>
        <Button onClick={handleOpenAdd} className="bg-[#004D40] hover:bg-[#004D40]/90 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Fabric Stock
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="text-sm border-collapse bg-white w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                  DATE
                </th>
                <th className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                  COLOR
                </th>
                <th className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                  SIZE
                </th>
                <th className="px-3 py-2 text-center font-bold text-blue-700 tracking-wide bg-blue-50/50 border-r border-gray-200">
                  KORA BALANCE (Kg)
                </th>
                <th className="px-3 py-2 text-center font-bold text-teal-700 tracking-wide bg-teal-50/50 border-r border-gray-200">
                  FABRIC STOCK (Kg)
                </th>
                <th className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                    No fabric stock balances found. Add one to get started.
                  </td>
                </tr>
              ) : (
                Array.from(
                  records.reduce((map, r) => {
                    const dateStr = format(new Date(r.date), 'dd MMM yyyy');
                    if (!map.has(dateStr)) map.set(dateStr, []);
                    map.get(dateStr)!.push(r);
                    return map;
                  }, new Map<string, OpeningBalanceFabricGroup[]>()).entries()
                ).flatMap(([dateStr, group]) =>
                  group.map((r, idx) => (
                    <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                      {idx === 0 && (
                        <td rowSpan={group.length} className="border-r border-gray-200 px-3 py-2 text-center font-medium text-gray-900 whitespace-nowrap align-middle">
                          {dateStr}
                        </td>
                      )}
                      <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                        {r.color || '—'}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                        {r.size || '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.koraBalanceKg ? r.koraBalanceKg.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.fabricStockKg ? r.fabricStockKg.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => handleOpenEdit(r)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <FabricModal
          onClose={() => setIsModalOpen(false)}
          onSave={(dataArray) => {
            if (editingRecord) {
              const [first, ...rest] = dataArray;
              const updatedFirst = { ...editingRecord, ...first };
              const newRecords = rest.map(d => ({ ...d, id: Math.random().toString(36).substr(2, 9) }));
              setRecords(prev => {
                const updated = prev.map(r => r.id === editingRecord.id ? updatedFirst : r);
                return [...updated, ...newRecords];
              });
            } else {
              const newRecords = dataArray.map(d => ({ ...d, id: Math.random().toString(36).substr(2, 9) }));
              setRecords([...records, ...newRecords]);
            }
            setIsModalOpen(false);
          }}
          initialData={editingRecord}
          lookupsData={lookupsData}
        />
      )}
    </div>
  );
}

type FabricRowState = {
  id: string;
  color: string;
  size: string;
  kora: string;
  fabric: string;
};

function FabricModal({ onClose, onSave, initialData, lookupsData }: { onClose: () => void; onSave: (data: any[]) => void; initialData: OpeningBalanceFabricGroup | null; lookupsData: any; }) {
  const [date, setDate] = useState<Date | undefined>(initialData ? new Date(initialData.date) : new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const createEmptyRow = (): FabricRowState => ({
    id: Math.random().toString(36).substr(2, 9),
    color: '',
    size: '',
    kora: '',
    fabric: ''
  });

  const [rows, setRows] = useState<FabricRowState[]>(() => {
    if (initialData) {
      return [{
        id: initialData.id,
        color: initialData.color || '',
        size: initialData.size || '',
        kora: initialData.koraBalanceKg ? String(initialData.koraBalanceKg) : '',
        fabric: initialData.fabricStockKg ? String(initialData.fabricStockKg) : '',
      }];
    }
    return [createEmptyRow()];
  });

  const colorNames = (lookupsData?.colors ?? []).map((c: any) => c.name).sort();
  const sizeNames = (lookupsData?.sizes ?? []).map((s: any) => s.name).sort();

  const handleRowChange = (id: string, field: keyof FabricRowState, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRowWeightChange = (id: string, field: keyof FabricRowState, value: string) => {
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

  const handleSubmit = () => {
    if (!date) return;

    const parsedData = rows.map(r => ({
      date: date.toISOString(),
      color: r.color === 'none' ? '' : r.color,
      size: r.size === 'none' ? '' : r.size,
      koraBalanceKg: parseFloat(r.kora) || 0,
      fabricStockKg: parseFloat(r.fabric) || 0,
    }));

    onSave(parsedData);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[95vw] w-max lg:max-w-none overflow-hidden flex flex-col max-h-[90vh] border border-gray-400 p-4 bg-[#F4F1E8]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 -mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-black">{initialData ? 'Edit' : 'Add'} Fabric Stock Opening Balance</DialogTitle>
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
                <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setIsCalendarOpen(false); }} autoFocus />
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
                    <th className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle w-[140px]">
                      COLOR
                    </th>
                    <th className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle w-[140px]">
                      SIZE
                    </th>
                    <th className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">
                      KORA BALANCE (Kg)
                    </th>
                    <th className="px-3 py-2 text-center font-bold text-teal-700 uppercase tracking-wide bg-teal-50/50 border-r border-gray-200">
                      FABRIC STOCK (KG)
                    </th>
                    <th className="px-2 py-2 align-middle"></th>
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

                      <td className="border-r border-gray-200 p-2 text-center bg-blue-50/20">
                        <Input type="text" placeholder="Weight" className="w-32 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-blue-50/10 border-2 border-blue-200 mx-auto" value={row.kora} onChange={(e) => handleRowWeightChange(row.id, 'kora', e.target.value)} />
                      </td>
                      <td className="border-r border-gray-200 p-2 text-center bg-teal-50/20">
                        <Input type="text" placeholder="Weight" className="w-32 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-teal-50/10 border-2 border-teal-200 mx-auto" value={row.fabric} onChange={(e) => handleRowWeightChange(row.id, 'fabric', e.target.value)} />
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

          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-gray-500">All weights are measured in Kilogram (kg)</span>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-9 px-6 font-medium rounded-md border-gray-300" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-[#004D40] text-white hover:bg-[#003d33] h-9 px-6 font-medium rounded-md shadow-sm">Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
