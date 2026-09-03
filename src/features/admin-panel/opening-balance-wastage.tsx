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

type OpeningBalanceWastageGroup = {
  id: string;
  date: string;
  color: string;
  size: string;
  extruder: {
    lumps: number;
    looms: number;
  };
  looms: {
    loomsYarn: number;
  };
  fabric: {
    fabricWaste: number;
    bitwaste: number;
  };
};

export function OpeningBalanceWastageTab() {
  const { data: lookupsData, isLoading } = useLookups();
  const [records, setRecords] = useState<OpeningBalanceWastageGroup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OpeningBalanceWastageGroup | null>(null);

  if (isLoading) return <Loader className="m-auto mt-10" />;

  const handleDelete = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  const handleOpenEdit = (record: OpeningBalanceWastageGroup) => {
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
                <th colSpan={2} className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">
                  EXTRUDER
                </th>
                <th colSpan={1} className="px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50 border-r border-gray-200">
                  LOOMS
                </th>
                <th colSpan={2} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50 border-r border-gray-200">
                  FABRIC CHECKING
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide align-middle">
                  ACTIONS
                </th>
              </tr>
              <tr className="bg-gray-50/80 border-b border-gray-300">
                {/* Extruder */}
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-blue-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Lumps waste
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-blue-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Looms waste
                </th>
                {/* Looms */}
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-yellow-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Looms/Yarn waste
                </th>
                {/* Fabric */}
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-purple-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Fabric waste
                </th>
                <th className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-purple-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  Bitwaste
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500 text-sm">
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
                  }, new Map<string, OpeningBalanceWastageGroup[]>()).entries()
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
                        {r.extruder.lumps ? r.extruder.lumps.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.extruder.looms ? r.extruder.looms.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.looms.loomsYarn ? r.looms.loomsYarn.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.fabric.fabricWaste ? r.fabric.fabricWaste.toFixed(2) : '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                        {r.fabric.bitwaste ? r.fabric.bitwaste.toFixed(2) : '—'}
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
        <WastageModal
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

function WastageModal({ onClose, onSave, initialData, lookupsData }: { onClose: () => void; onSave: (data: any[]) => void; initialData: OpeningBalanceWastageGroup | null; lookupsData: any; }) {
  const [date, setDate] = useState<Date | undefined>(initialData ? new Date(initialData.date) : new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const createEmptyRow = (): WastageRowState => ({
    id: Math.random().toString(36).substr(2, 9),
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
        color: initialData.color || '',
        size: initialData.size || '',
        extLumps: initialData.extruder?.lumps ? String(initialData.extruder.lumps) : '',
        extLooms: initialData.extruder?.looms ? String(initialData.extruder.looms) : '',
        loomYarn: initialData.looms?.loomsYarn ? String(initialData.looms.loomsYarn) : '',
        fabWaste: initialData.fabric?.fabricWaste ? String(initialData.fabric.fabricWaste) : '',
        fabBit: initialData.fabric?.bitwaste ? String(initialData.fabric.bitwaste) : '',
      }];
    }
    return [createEmptyRow()];
  });

  const colorNames = (lookupsData?.colors ?? []).map((c: any) => c.name).sort();
  const sizeNames = (lookupsData?.sizes ?? []).map((s: any) => s.name).sort();

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

  const handleSubmit = () => {
    if (!date) return;
    
    const parsedData = rows.map(r => ({
      date: date.toISOString(),
      color: r.color === 'none' ? '' : r.color,
      size: r.size === 'none' ? '' : r.size,
      extruder: {
        lumps: parseFloat(r.extLumps) || 0,
        looms: parseFloat(r.extLooms) || 0,
      },
      looms: {
        loomsYarn: parseFloat(r.loomYarn) || 0,
      },
      fabric: {
        fabricWaste: parseFloat(r.fabWaste) || 0,
        bitwaste: parseFloat(r.fabBit) || 0,
      },
    }));

    onSave(parsedData);
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
                    <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle w-[140px]">
                      COLOR
                    </th>
                    <th rowSpan={2} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle w-[140px]">
                      SIZE
                    </th>
                    <th colSpan={2} className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">
                      EXTRUDER
                    </th>
                    <th colSpan={1} className="px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50 border-r border-gray-200">
                      LOOMS
                    </th>
                    <th colSpan={2} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50 border-r border-gray-200">
                      FABRIC CHECKING
                    </th>
                    <th rowSpan={2} className="px-2 py-2 align-middle"></th>
                  </tr>
                  <tr className="bg-gray-50/80 border-b border-gray-300">
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap">Lumps waste</th>
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap">Looms waste</th>
                    
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-yellow-600 text-xs uppercase whitespace-nowrap">Looms/Yarn waste</th>
                    
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-purple-600 text-xs uppercase whitespace-nowrap">Fabric waste</th>
                    <th className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-purple-600 text-xs uppercase whitespace-nowrap">Bitwaste</th>
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
                      
                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-32 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-yellow-50/10 border-2 border-yellow-200 mx-auto" value={row.loomYarn} onChange={(e) => handleRowWeightChange(row.id, 'loomYarn', e.target.value)} />
                      </td>
                      
                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-28 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-purple-50/10 border-2 border-purple-200 mx-auto" value={row.fabWaste} onChange={(e) => handleRowWeightChange(row.id, 'fabWaste', e.target.value)} />
                      </td>
                      <td className="border-r border-gray-200 p-2 text-center">
                        <Input type="text" placeholder="Weight" className="w-24 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-purple-50/10 border-2 border-purple-200 mx-auto" value={row.fabBit} onChange={(e) => handleRowWeightChange(row.id, 'fabBit', e.target.value)} />
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
