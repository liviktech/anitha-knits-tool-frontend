import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { X, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/loader';
import { apiFetch } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { todayIso } from './inventory-utils';
import { inventoryKeys, type InventoryRecord, type InventoryType } from './inventory-queries';
import { useLatestProductionConfig } from '../admin-panel/production-config-queries';

interface InventoryFormDialogProps {
  onClose: () => void;
  editDate?: string;
  editRecords?: InventoryRecord[];
  selectedMonth?: string;
}

export function InventoryFormDialog({ onClose, editDate, editRecords, selectedMonth }: InventoryFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData, isLoading: isLookupsLoading, isError: isLookupsError, refetch: refetchLookups } = useLookups();
  const { data: latestConfig } = useLatestProductionConfig();
  const isEdit = !!editDate;

  const findDcForType = (type: InventoryType) => editRecords?.find(r => r.type === type && r.DC_NUMBER)?.DC_NUMBER ?? '';

  const [date, setDate] = useState(() => {
    if (editDate) return editDate;
    if (selectedMonth && !todayIso().startsWith(selectedMonth)) {
      return `${selectedMonth}-01`;
    }
    return todayIso();
  });
  const [dcHdpe, setDcHdpe] = useState(() => findDcForType('HDPE'));
  const [dcChemical, setDcChemical] = useState(() => findDcForType('CHEMICAL'));
  const [dcColor, setDcColor] = useState(() => findDcForType('COLOR'));

  const [weights, setWeights] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (editRecords) {
      for (const r of editRecords) {
        if (r.name) init[`${r.type}-${r.name}`] = String(r.weightKg);
      }
    }
    return init;
  });

  const [bags, setBags] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (editRecords) {
      for (const r of editRecords) {
        if (r.name && (r as any).bagCount != null) init[`${r.type}-${r.name}`] = String((r as any).bagCount);
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
    const cleaned = val.replace(/[^0-9.]/g, '');
    setWeights(prev => ({ ...prev, [`${type}-${name}`]: cleaned }));
  };

  const handleBagChange = (type: InventoryType, name: string, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setBags(prev => ({ ...prev, [`${type}-${name}`]: cleaned }));

    if (type === 'HDPE' && latestConfig?.basisWeightKg) {
      const numBags = parseInt(cleaned, 10);
      if (!isNaN(numBags)) {
        const weight = numBags * latestConfig.basisWeightKg;
        setWeights(prev => ({ ...prev, [`${type}-${name}`]: String(weight) }));
      } else {
        setWeights(prev => ({ ...prev, [`${type}-${name}`]: '' }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!date) {
      setError('Date is required');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const promises: Promise<unknown>[] = [];
      const types = [
        { type: 'HDPE' as InventoryType, names: hdpeNames, dc: dcHdpe },
        { type: 'CHEMICAL' as InventoryType, names: chemicalNames, dc: dcChemical },
        { type: 'COLOR' as InventoryType, names: colorNames, dc: dcColor },
      ];

      // Validate: if any weight is entered for a type, DC must be provided
      for (const t of types) {
        const hasAnyWeight = t.names.some(name => {
          const val = parseFloat(weights[`${t.type}-${name}`]);
          return !isNaN(val) && val > 0;
        });
        if (hasAnyWeight && !t.dc.trim()) {
          setError(`DC number is required for ${t.type === 'HDPE' ? 'HDPE' : t.type === 'CHEMICAL' ? 'Chemicals' : 'Colors'} when entering quantities.`);
          setSaving(false);
          return;
        }
      }

      for (const t of types) {
        for (const name of t.names) {
          const key = `${t.type}-${name}`;
          const str = weights[key];
          const val = parseFloat(str);
          const bagValStr = bags[key];
          const bagVal = parseInt(bagValStr, 10);
          const existing = editRecords?.find(r => r.type === t.type && r.name === name);

          if (!isNaN(val) && val > 0) {
            if (existing) {
              const dc = t.dc.trim();
              if (existing.weightKg !== val || (dc && existing.DC_NUMBER !== dc) || (existing as any).bagCount !== bagVal) {
                promises.push(apiFetch(`/inventory/${existing.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ weightKg: val, date, ...(dc && { DC: dc }), ...(!isNaN(bagVal) && bagVal > 0 && { bagCount: bagVal }) }),
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
                  DC: t.dc,
                  ...(!isNaN(bagVal) && bagVal > 0 && { bagCount: bagVal }),
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
      <DialogContent showCloseButton={false} className="max-w-[95vw] w-max lg:max-w-none overflow-hidden flex flex-col max-h-[90vh] border border-gray-400 p-4">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 -mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-black">{isEdit ? 'Edit Stock' : 'Add Received Stock'}</DialogTitle>
          <div className="flex items-center gap-3">
            {/* <Label htmlFor="inv-date" className="text-sm font-medium whitespace-nowrap text-black">Date</Label> */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center bg-white border border-gray-400 rounded-md px-3 py-1 h-8 shadow-sm hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-800 mr-2">
                    {date ? format(parseISO(date), 'dd/MM/yyyy') : 'Select Date'}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-gray-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date ? parseISO(date) : undefined}
                  onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" className="text-black hover:bg-white/50">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex flex-col py-1">
          {isLookupsLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-8">
              <Loader size="sm" /> Loading form fields...
            </div>
          ) : isLookupsError ? (
            <div className="flex flex-col items-center justify-center gap-2 text-gray-500 text-sm py-8">
              <span>Unable to load HDPE, chemical and color fields.</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetchLookups()}>Retry</Button>
            </div>
          ) : hdpeNames.length === 0 && chemicalNames.length === 0 && colorNames.length === 0 ? (
            <div className="flex items-center justify-center text-gray-500 text-sm py-8">
              No HDPE, chemical or color raw materials configured yet.
            </div>
          ) : (
                                    <div className="flex justify-center w-full">
              <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm w-max max-w-[95vw]">
                <table className="text-sm border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      {hdpeNames.length > 0 && <th colSpan={hdpeNames.length * 2 + 1} className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">HDPE</th>}
                      {chemicalNames.length > 0 && <th colSpan={chemicalNames.length * 1 + 1} className="px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50 border-r border-gray-200">CHEMICALS</th>}
                      {colorNames.length > 0 && <th colSpan={colorNames.length * 1 + 1} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50">COLORS</th>}
                    </tr>
                    <tr className="bg-gray-50/80 border-b border-gray-300">
                      {hdpeNames.length > 0 && (
                        <React.Fragment>
                          <th rowSpan={2} className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-blue-800 text-xs uppercase whitespace-nowrap">DC</th>
                          {hdpeNames.map((name, idx) => <th key={name} colSpan={2} className={`border-r ${idx === hdpeNames.length - 1 && chemicalNames.length === 0 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-3 py-2 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap`}>{name}</th>)}
                        </React.Fragment>
                      )}
                      {chemicalNames.length > 0 && (
                        <React.Fragment>
                          <th rowSpan={2} className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-yellow-800 text-xs uppercase whitespace-nowrap">DC</th>
                          {chemicalNames.map((name, idx) => <th key={name} colSpan={1} className={`border-r ${idx === chemicalNames.length - 1 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-3 py-2 text-center font-semibold text-yellow-600 text-xs uppercase whitespace-nowrap`}>{name}</th>)}
                        </React.Fragment>
                      )}
                      {colorNames.length > 0 && (
                        <React.Fragment>
                          <th rowSpan={2} className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-purple-800 text-xs uppercase whitespace-nowrap">DC</th>
                          {colorNames.map((name, idx) => <th key={name} colSpan={1} className={`border-r ${idx === colorNames.length - 1 ? 'border-transparent' : 'border-gray-200'} px-3 py-2 text-center font-semibold text-purple-600 text-xs uppercase whitespace-nowrap`}>{name}</th>)}
                        </React.Fragment>
                      )}
                    </tr>
                    <tr className="bg-gray-50/80 border-b border-gray-300">
                      {hdpeNames.length > 0 && hdpeNames.map((name, idx) => (
                        <React.Fragment key={'hdpe-'+name+'-sub'}>
                          <th className="border-r border-gray-200 px-1 py-1 text-center font-semibold text-blue-600 text-[11px] uppercase whitespace-nowrap">Bags</th>
                          <th className={`border-r ${idx === hdpeNames.length - 1 && chemicalNames.length === 0 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-1 py-1 text-center font-semibold text-blue-600 text-[11px] uppercase whitespace-nowrap`}>Weight (Kg)</th>
                        </React.Fragment>
                      ))}
                      {chemicalNames.length > 0 && chemicalNames.map((name, idx) => (
                        <React.Fragment key={'chem-'+name+'-sub'}>
                          <th className={`border-r ${idx === chemicalNames.length - 1 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-1 py-1 text-center font-semibold text-yellow-600 text-[11px] uppercase whitespace-nowrap`}>Weight (Kg)</th>
                        </React.Fragment>
                      ))}
                      {colorNames.length > 0 && colorNames.map((name, idx) => (
                        <React.Fragment key={'col-'+name+'-sub'}>
                          <th className={`border-r ${idx === colorNames.length - 1 ? 'border-transparent' : 'border-gray-200'} px-1 py-1 text-center font-semibold text-purple-600 text-[11px] uppercase whitespace-nowrap`}>Weight (Kg)</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {hdpeNames.length > 0 && (
                        <React.Fragment>
                          <td className="border-r border-gray-200 p-2">
                            <div className="flex justify-center">
                              <Input type="text" maxLength={8} placeholder="DC No" className="w-28 rounded-full text-center h-9 text-sm placeholder:text-xs font-bold bg-blue-50 border-2 border-blue-300" value={dcHdpe} onChange={(e) => setDcHdpe(e.target.value.slice(0, 8))} />
                            </div>
                          </td>
                          {hdpeNames.map((name, idx) => (
                            <React.Fragment key={'hdpe-'+name+'-inputs'}>
                              <td className="border-r border-gray-200 p-1">
                                <Input type="text" placeholder="Bags" className="w-16 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-blue-50/10 border-2 border-blue-200 mx-auto" value={bags[`HDPE-${name}`] || ''} onChange={(e) => handleBagChange('HDPE', name, e.target.value)} />
                              </td>
                              <td className={`border-r ${idx === hdpeNames.length - 1 && chemicalNames.length === 0 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} p-1`}>
                                <Input type="text" placeholder="Weight" className="w-20 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-blue-50/10 border-2 border-blue-200 mx-auto" value={weights[`HDPE-${name}`] || ''} onChange={(e) => handleWeightChange('HDPE', name, e.target.value)} />
                              </td>
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      )}

                      {chemicalNames.length > 0 && (
                        <React.Fragment>
                          <td className="border-r border-gray-200 p-2">
                            <div className="flex justify-center">
                              <Input type="text" maxLength={8} placeholder="DC No" className="w-28 rounded-full text-center h-9 text-sm placeholder:text-xs font-bold bg-yellow-50 border-2 border-yellow-300" value={dcChemical} onChange={(e) => setDcChemical(e.target.value.slice(0, 8))} />
                            </div>
                          </td>
                          {chemicalNames.map((name, idx) => (
                            <React.Fragment key={'chem-'+name+'-inputs'}>
                              <td className={`border-r ${idx === chemicalNames.length - 1 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} p-1`}>
                                <Input type="text" placeholder="Weight" className="w-20 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-yellow-50/10 border-2 border-yellow-200 mx-auto" value={weights[`CHEMICAL-${name}`] || ''} onChange={(e) => handleWeightChange('CHEMICAL', name, e.target.value)} />
                              </td>
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      )}

                      {colorNames.length > 0 && (
                        <React.Fragment>
                          <td className="border-r border-gray-200 p-2">
                            <div className="flex justify-center">
                              <Input type="text" maxLength={8} placeholder="DC No" className="w-28 rounded-full text-center h-9 text-sm placeholder:text-xs font-bold bg-purple-50 border-2 border-purple-300" value={dcColor} onChange={(e) => setDcColor(e.target.value.slice(0, 8))} />
                            </div>
                          </td>
                          {colorNames.map((name, idx) => (
                            <React.Fragment key={'col-'+name+'-inputs'}>
                              <td className={`border-r ${idx === colorNames.length - 1 ? 'border-transparent' : 'border-gray-200'} p-1`}>
                                <Input type="text" placeholder="Weight" className="w-20 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-purple-50/10 border-2 border-purple-200 mx-auto" value={weights[`COLOR-${name}`] || ''} onChange={(e) => handleWeightChange('COLOR', name, e.target.value)} />
                              </td>
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <DialogFooter className="mt-2 border-gray-200 bg-white sm:justify-between items-center">
          <p className="text-xs font-medium text-gray-600">All weights are measured in Kilogram (KG)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-[#004D40] hover:bg-[#00332a] text-white min-w-24">
              {saving ? <Loader size="sm" className="mr-2" /> : null}
              {isEdit ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
