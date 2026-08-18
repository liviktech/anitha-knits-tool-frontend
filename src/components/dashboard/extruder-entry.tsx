import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Edit, Trash2, FileText, Loader2 } from 'lucide-react';

interface ExtruderEntryProps {
  onClose: () => void;
}

interface LookupItem {
  id: string;
  name: string;
}

interface Lookups {
  brands: LookupItem[];
  colors: LookupItem[];
  chemicals: LookupItem[];
  sizes: LookupItem[];
}

function findIdByName(items: LookupItem[], value: string): string | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalize(value);
  return items.find((item) => normalize(item.name) === target || normalize(item.name).startsWith(target))?.id;
}

// Reverses the mapping above: given a master-data name (e.g. "160mm", "White"),
// produce the value the existing hardcoded <SelectItem> options use.
function toSizeSelectValue(name: string): string {
  return name.replace(/[^0-9]/g, '');
}

function toLowerSelectValue(name: string): string {
  return name.toLowerCase();
}

export function ExtruderEntry({ onClose }: ExtruderEntryProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lookups, setLookups] = useState<Lookups>({ brands: [], colors: [], chemicals: [], sizes: [] });

  // Form states
  const [date, setDate] = useState('');
  const [size, setSize] = useState('160');
  const [color, setColor] = useState('white');
  const [colorWt, setColorWt] = useState('');
  const [chemical, setChemical] = useState('acm');
  const [chemWt, setChemWt] = useState('');
  const [brand, setBrand] = useState('reliance');
  const [bags, setBags] = useState('');
  const [raw, setRaw] = useState('');
  const [loose, setLoose] = useState('');
  const [lumps, setLumps] = useState('');

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/extruder-productions');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      
      // Map backend DTO to match the UI rendering variables.
      // Raw ids/numbers are kept (not pre-formatted) so an edit click can prefill the form.
      const mappedData = result.items.map((item: any) => {
        const itemDate = new Date(item.createdAt);
        return {
          id: item.id,
          time: itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          productionDate: item.productionDate,
          size: item.size?.name || 'N/A',
          color: item.color?.name || 'N/A',
          brand: item.rawProduct?.brand?.name || 'N/A',
          bags: item.rawProduct?.bagCount || 0,
          raw: item.rawProduct?.weightKg ?? 0,
          loose: item.waste?.looseWasteKg ?? 0,
          lumps: item.waste?.lumsWasteKg ?? 0,
          chemicals: item.chemical?.chemical?.name || 'None',
          chemWt: item.chemical?.weightKg ?? 0,
          colorWt: item.colorWeightKg ?? 0,
        };
      });
      setEntries(mappedData);
    } catch (error) {
      console.error('Error fetching extruder entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const response = await fetch('/api/v1/lookups');
      if (!response.ok) throw new Error('Failed to fetch lookups');
      const result = await response.json();
      setLookups(result);
    } catch (error) {
      console.error('Error fetching lookups:', error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchLookups();
  }, []);

  const handleAddEntry = async () => {
    const sizeId = findIdByName(lookups.sizes, size);
    const colorId = findIdByName(lookups.colors, color);
    const brandId = findIdByName(lookups.brands, brand);
    const chemicalId = findIdByName(lookups.chemicals, chemical);

    if (!sizeId || !colorId || !brandId) {
      console.error('Unable to resolve size/color/brand to a known master data id');
      return;
    }

    setSubmitting(true);
    try {
      const parsedDate = new Date(date);
      const payload = {
        productionDate: isNaN(parsedDate.getTime()) ? date : parsedDate.toISOString(),
        sizeId,
        colorId,
        colorWeightKg: parseFloat(colorWt) || 0,
        createdBy: 'devs@liviktech.com',
        rawProduct: {
          brandId,
          bagCount: parseInt(bags, 10) || 0,
          weightKg: parseFloat(raw) || 0,
        },
        waste: {
          looseWasteKg: parseFloat(loose) || 0,
          lumsWasteKg: parseFloat(lumps) || 0,
        },
        ...(chemicalId
          ? { chemical: { chemicalId, weightKg: parseFloat(chemWt) || 0 } }
          : {}),
      };

      const response = await fetch('/api/v1/extruder-productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create entry');
      
      // Re-fetch to update the table
      await fetchEntries();
      resetForm();
    } catch (error) {
      console.error('Error adding entry:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate('');
    setColorWt('');
    setChemWt('');
    setBags('');
    setRaw('');
    setLoose('');
    setLumps('');
  };

  const handleEditClick = (row: any) => {
    setEditingId(row.id);
    setDate(row.productionDate ? new Date(row.productionDate).toISOString().slice(0, 10) : '');
    setSize(toSizeSelectValue(row.size));
    setColor(toLowerSelectValue(row.color));
    setColorWt(String(row.colorWt));
    if (row.chemicals !== 'None') {
      setChemical(toLowerSelectValue(row.chemicals));
    }
    setChemWt(String(row.chemWt));
    setBrand(toLowerSelectValue(row.brand));
    setBags(String(row.bags));
    setRaw(String(row.raw));
    setLoose(String(row.loose));
    setLumps(String(row.lumps));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleUpdateEntry = async () => {
    if (!editingId) return;

    const sizeId = findIdByName(lookups.sizes, size);
    const colorId = findIdByName(lookups.colors, color);
    const brandId = findIdByName(lookups.brands, brand);
    const chemicalId = findIdByName(lookups.chemicals, chemical);

    if (!sizeId || !colorId || !brandId) {
      console.error('Unable to resolve size/color/brand to a known master data id');
      return;
    }

    setSubmitting(true);
    try {
      const parsedDate = new Date(date);
      const payload = {
        productionDate: isNaN(parsedDate.getTime()) ? date : parsedDate.toISOString(),
        sizeId,
        colorId,
        colorWeightKg: parseFloat(colorWt) || 0,
        updatedBy: 'devs@liviktech.com',
        rawProduct: {
          brandId,
          bagCount: parseInt(bags, 10) || 0,
          weightKg: parseFloat(raw) || 0,
        },
        waste: {
          looseWasteKg: parseFloat(loose) || 0,
          lumsWasteKg: parseFloat(lumps) || 0,
        },
        ...(chemicalId
          ? { chemical: { chemicalId, weightKg: parseFloat(chemWt) || 0 } }
          : {}),
      };

      const response = await fetch(`/api/v1/extruder-productions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update entry');

      await fetchEntries();
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating entry:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/v1/extruder-productions/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete entry');

      if (editingId === id) handleCancelEdit();
      await fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="shadow-sm border-gray-200 mx-auto w-full max-w-7xl">
      <CardHeader className="flex flex-row items-start justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 text-green-700 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Extruder Production – 30 Jul 2026</CardTitle>
            <p className="text-sm text-gray-500">Add extruder run details and chemicals used.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5 text-gray-400" />
        </Button>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="bg-green-50/30 p-6 rounded-lg border border-green-100 mb-8">
          <div className="flex flex-col gap-4 mb-4">
            {/* Row 1 */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-gray-500">Date *</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Size *</label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="160">160</SelectItem>
                    <SelectItem value="180">180</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Color *</label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Color Wt (kg)</label>
                <Input type="text" value={colorWt} onChange={(e) => setColorWt(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Chemical Used</label>
                <Select value={chemical} onValueChange={setChemical}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acm">ACM</SelectItem>
                    <SelectItem value="dm+">DM+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Chem. Wt (kg)</label>
                <Input type="text" value={chemWt} onChange={(e) => setChemWt(e.target.value)} className="w-full" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap gap-4 items-end mt-2">
              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Brand</label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reliance">Reliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Bags (qty)</label>
                <Input type="text" value={bags} onChange={(e) => setBags(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Raw (kg)</label>
                <Input type="text" value={raw} onChange={(e) => setRaw(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Loose (kg)</label>
                <Input type="text" value={loose} onChange={(e) => setLoose(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Lumps (kg)</label>
                <Input type="text" value={lumps} onChange={(e) => setLumps(e.target.value)} className="w-full" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {editingId && (
              <Button variant="outline" onClick={handleCancelEdit} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-8"
              onClick={editingId ? handleUpdateEntry : handleAddEntry}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? (editingId ? 'Updating...' : 'Adding...') : editingId ? 'Edit Entry' : '+ Add Entry'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-700" />
            Today's Entries ({entries.length})
          </h3>
          <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead rowSpan={2} className="w-[50px] text-center font-semibold align-middle border-r border-b bg-gray-50">#</TableHead>
                  <TableHead rowSpan={2} className="text-center font-semibold align-middle border-r border-b bg-gray-50">Time</TableHead>
                  <TableHead rowSpan={2} className="text-center font-semibold align-middle border-r border-b bg-gray-50">Size</TableHead>
                  <TableHead rowSpan={2} className="text-center font-semibold align-middle border-r border-b bg-gray-50">Color</TableHead>
                  <TableHead rowSpan={2} className="text-center font-semibold align-middle border-r border-b bg-gray-50">Brand</TableHead>
                  <TableHead colSpan={3} className="text-center text-green-700 font-semibold bg-green-50/50 border-r border-b">Production Input</TableHead>
                  <TableHead colSpan={4} className="text-center text-red-700 font-semibold bg-red-50/50 border-r border-b">Wastage & Chemicals</TableHead>
                  <TableHead rowSpan={2} className="text-center font-semibold align-middle border-b bg-gray-50">Actions</TableHead>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-center font-medium text-gray-500 border-r border-b">Bags Used</TableHead>
                  <TableHead className="text-center font-medium text-gray-500 border-r border-b">Raw Mat. (kg)</TableHead>
                  <TableHead className="text-center font-medium text-gray-500 border-r border-b">Color Wt (kg)</TableHead>
                  <TableHead className="text-center font-medium text-gray-500 border-r border-b">Loose (kg)</TableHead>
                  <TableHead className="text-center font-medium text-gray-500 border-r border-b">Lumps (kg)</TableHead>
                  <TableHead className="text-center font-medium text-gray-500 border-r border-b">Chemical Used</TableHead>
                  <TableHead className="text-center font-medium text-gray-500 border-r border-b">Chem. Wt (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading entries...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center text-gray-500">
                      No entries found for today.
                    </TableCell>
                  </TableRow>
                ) : entries.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-center border-r">{row.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-center border-r">{row.time}</TableCell>
                    <TableCell className="text-center border-r">{row.size}</TableCell>
                    <TableCell className="text-center border-r">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${row.color === 'White' ? 'bg-white border' : 'bg-blue-600'}`}></div>
                        {row.color}
                      </div>
                    </TableCell>
                    <TableCell className="text-center border-r">{row.brand}</TableCell>
                    <TableCell className="text-center font-medium border-r">{row.bags}</TableCell>
                    <TableCell className="text-center font-bold text-green-600 border-r">{row.raw.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-medium border-r">{row.colorWt.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-red-500 font-medium border-r">{row.loose.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-red-500 font-medium border-r">{row.lumps.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-medium border-r">{row.chemicals}</TableCell>
                    <TableCell className="text-center font-bold text-red-600 border-r">{row.chemWt.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-green-50 text-green-600 hover:bg-green-100"
                          onClick={() => handleEditClick(row)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-red-50 text-red-500 hover:bg-red-100"
                          onClick={() => handleDeleteEntry(row.id)}
                          disabled={deletingId === row.id}
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </CardContent>
    </Card>
  );
}
