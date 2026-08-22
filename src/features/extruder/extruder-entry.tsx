import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import {
  useExtruderProductions,
  useLookups,
  extruderKeys,
  findIdByName,
  type Lookups,
  type ExtruderCreatePayload,
} from './extruder-queries';
import { apiFetch } from '@/lib/api-client';
import { sumWastageByCode } from '@/lib/api-types';
import { X, Edit, FileText } from 'lucide-react';

interface ExtruderEntryProps {
  onClose: () => void;
}

interface ExtruderRow {
  id: string;
  productionDate: string;
  size: string;
  color: string;
  brand: string;
  chemical: string;
  raw: number;
  chemicalKg: number;
  colorConsumedKg: number;
  output: number;
  lumpsKg: number;
  yarnWasteKg: number;
}

export function ExtruderEntry({ onClose }: ExtruderEntryProps) {
  const queryClient = useQueryClient();
  const { data: productionsData, isLoading: loading } = useExtruderProductions();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  // Map backend DTO to match the UI rendering variables.
  // Names (not ids) are kept so an edit click can prefill the form's Selects directly.
  const entries = useMemo<ExtruderRow[]>(() => {
    const items = productionsData?.data ?? [];
    return items.map((item) => ({
      id: item.id,
      productionDate: item.productionDate,
      size: item.size?.name ?? 'N/A',
      color: item.color?.name ?? 'N/A',
      brand: item.extruder?.brand?.name ?? 'N/A',
      chemical: item.extruder?.chemical?.name ?? 'N/A',
      raw: item.extruder?.rawMaterialKg ?? 0,
      chemicalKg: item.extruder?.chemicalKg ?? 0,
      colorConsumedKg: item.extruder?.colorConsumedKg ?? 0,
      output: item.extruder?.yarnOutputKg ?? 0,
      lumpsKg: sumWastageByCode(item.wastages, 'LUMPS'),
      yarnWasteKg: sumWastageByCode(item.wastages, 'YARN_WASTE'),
    }));
  }, [productionsData]);

  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const editLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [date, setDate] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [colorConsumedKg, setColorConsumedKg] = useState('');
  const [chemical, setChemical] = useState('');
  const [chemWt, setChemWt] = useState('');
  const [brand, setBrand] = useState('');
  const [raw, setRaw] = useState('');
  const [output, setOutput] = useState('');
  const [lumpsKg, setLumpsKg] = useState('');
  const [yarnWasteKg, setYarnWasteKg] = useState('');

  useEffect(() => {
    return () => {
      if (editLoadTimeoutRef.current) clearTimeout(editLoadTimeoutRef.current);
    };
  }, []);

  const resetForm = () => {
    setDate('');
    setColorConsumedKg('');
    setChemWt('');
    setRaw('');
    setOutput('');
    setLumpsKg('');
    setYarnWasteKg('');
  };

  const buildPayload = (): ExtruderCreatePayload | null => {
    const sizeId = findIdByName(lookups.sizes, size);
    const colorId = findIdByName(lookups.colors, color);
    const brandId = findIdByName(lookups.brands, brand);
    const chemicalId = findIdByName(lookups.chemicals, chemical);

    if (!sizeId || !colorId || !brandId || !chemicalId) {
      console.error('Unable to resolve size/color/brand/chemical to a known master data id');
      return null;
    }

    return {
      productionDate: date,
      sizeId,
      colorId,
      brandId,
      chemicalId,
      rawMaterialKg: parseFloat(raw) || 0,
      chemicalKg: parseFloat(chemWt) || 0,
      yarnOutputKg: parseFloat(output) || 0,
      lumpsKg: parseFloat(lumpsKg) || 0,
      yarnWasteKg: parseFloat(yarnWasteKg) || 0,
      ...(colorConsumedKg ? { colorConsumedKg: parseFloat(colorConsumedKg) } : {}),
    };
  };

  const handleAddEntry = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setSubmitting(true);
    try {
      const response = await apiFetch('/production/extruder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create entry');

      await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
      resetForm();
    } catch (error) {
      console.error('Error adding entry:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (row: ExtruderRow) => {
    setEditingId(row.id);
    setDate(row.productionDate ? row.productionDate.slice(0, 10) : '');
    setSize(row.size);
    setColor(row.color);
    setColorConsumedKg(String(row.colorConsumedKg));
    setChemical(row.chemical);
    setChemWt(String(row.chemicalKg));
    setBrand(row.brand);
    setRaw(String(row.raw));
    setOutput(String(row.output));
    setLumpsKg(String(row.lumpsKg ?? 0));
    setYarnWasteKg(String(row.yarnWasteKg ?? 0));
  };

  const EDIT_LOAD_DELAY_MS = 1000;

  const handleEditButtonClick = (row: ExtruderRow) => {
    setLoadingEditId(row.id);
    editLoadTimeoutRef.current = setTimeout(() => {
      handleEditClick(row);
      setLoadingEditId(null);
    }, EDIT_LOAD_DELAY_MS);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleUpdateEntry = async () => {
    if (!editingId) return;
    const payload = buildPayload();
    if (!payload) return;

    setSubmitting(true);
    try {
      const response = await apiFetch(`/production/extruder/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update entry');

      await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating entry:', error);
    } finally {
      setSubmitting(false);
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
            <CardTitle className="text-xl font-bold text-gray-900">Extruder Production</CardTitle>
            <p className="text-sm text-gray-500">Add extruder run details and chemicals used.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5 text-gray-400" />
        </Button>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="relative bg-green-50/30 p-6 rounded-lg border border-green-100 mb-8">
          {loadingEditId && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-white/70 text-gray-500">
              <Loader size="lg" />
              Loading entry...
            </div>
          )}
          <div className="flex flex-col gap-4 mb-4">
            {/* Row 1 */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-gray-500">Date *</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Size *</label>
                <Select value={size || undefined} onValueChange={setSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Color *</label>
                <Select value={color || undefined} onValueChange={setColor}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[130px]">
                <label className="text-xs font-semibold text-gray-500">Color Consumed (kg)</label>
                <Input type="text" value={colorConsumedKg} onChange={(e) => setColorConsumedKg(e.target.value)} className="w-full" placeholder="auto" />
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Chemical Used *</label>
                <Select value={chemical || undefined} onValueChange={setChemical}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.chemicals.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Chem. Wt (kg) *</label>
                <Input type="text" value={chemWt} onChange={(e) => setChemWt(e.target.value)} className="w-full" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap gap-4 items-end mt-2">
              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Brand *</label>
                <Select value={brand || undefined} onValueChange={setBrand}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.brands.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[100px]">
                <label className="text-xs font-semibold text-gray-500">Raw Material (kg) *</label>
                <Input type="text" value={raw} onChange={(e) => setRaw(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Yarn Output (kg) *</label>
                <Input type="text" value={output} onChange={(e) => setOutput(e.target.value)} className="w-full" />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-end mt-2">
              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Lumps (kg)</label>
                <Input type="text" value={lumpsKg} onChange={(e) => setLumpsKg(e.target.value)} className="w-full" />
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-500">Yarn Waste (kg)</label>
                <Input type="text" value={yarnWasteKg} onChange={(e) => setYarnWasteKg(e.target.value)} className="w-full" />
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
              {submitting && <Loader className="mr-2" />}
              {submitting ? (editingId ? 'Updating...' : 'Adding...') : editingId ? 'Edit Entry' : '+ Add Entry'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-700" />
            Entries ({entries.length})
          </h3>
          <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center font-semibold bg-gray-50">Size</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Color</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Brand</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Chemical</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Raw Mat. (kg)</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Chem. Wt (kg)</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Color Consumed (kg)</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Yarn Output (kg)</TableHead>
                  <TableHead className="text-center font-semibold bg-gray-50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2 text-gray-500">
                        <Loader size="lg" />
                        Loading entries...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                      No entries found.
                    </TableCell>
                  </TableRow>
                ) : entries.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center border-r">{row.size}</TableCell>
                    <TableCell className="text-center border-r">{row.color}</TableCell>
                    <TableCell className="text-center border-r">{row.brand}</TableCell>
                    <TableCell className="text-center border-r">{row.chemical}</TableCell>
                    <TableCell className="text-center font-bold text-green-600 border-r">{row.raw.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-medium border-r">{row.chemicalKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-medium border-r">{row.colorConsumedKg.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold text-green-700 border-r">{row.output.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-green-50 text-green-600 hover:bg-green-100"
                          onClick={() => handleEditButtonClick(row)}
                          disabled={loadingEditId === row.id}
                        >
                          {loadingEditId === row.id ? (
                            <Loader size="sm" />
                          ) : (
                            <Edit className="h-3 w-3" />
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
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </CardContent>
    </Card>
  );
}
