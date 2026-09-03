import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { useLookups, findIdByName } from '@/lib/lookups';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Loader } from '@/components/shared/loader';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import {
  useOpeningBalanceRawMaterials,
  openingBalanceRawMaterialKeys,
  type OpeningBalanceRawMaterialGroupPayload,
  type OpeningBalanceRawMaterialItemPayload,
} from './opening-balance-queries';
import { useConfigForDate } from './production-config-queries';

type OpeningBalanceHDPEGroup = {
  groupId: string;
  date: string;
  hdpe: Record<string, { bags?: number; weightKg?: number }>;
  chemicals: Record<string, number>;
  colors: Record<string, number>;
};

export function OpeningBalanceHDPETab() {
  const queryClient = useQueryClient();
  const { data: lookupsData, isLoading: isLookupsLoading } = useLookups();
  const { data: recordsData, isLoading: isRecordsLoading } = useOpeningBalanceRawMaterials('?limit=100');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OpeningBalanceHDPEGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OpeningBalanceHDPEGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const groups = useMemo<OpeningBalanceHDPEGroup[]>(() => {
    const byGroup = new Map<string, OpeningBalanceHDPEGroup>();
    for (const r of recordsData?.data ?? []) {
      let group = byGroup.get(r.groupId);
      if (!group) {
        group = { groupId: r.groupId, date: r.date, hdpe: {}, chemicals: {}, colors: {} };
        byGroup.set(r.groupId, group);
      }
      if (r.type === 'HDPE' && r.brand) {
        group.hdpe[r.brand.name] = { bags: r.bagCount ?? undefined, weightKg: r.weightKg };
      } else if (r.type === 'CHEMICAL' && r.chemical) {
        group.chemicals[r.chemical.name] = r.weightKg;
      } else if (r.type === 'COLOR' && r.color) {
        group.colors[r.color.name] = r.weightKg;
      }
    }
    return Array.from(byGroup.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [recordsData]);

  if (isLookupsLoading || isRecordsLoading) return <Loader className="m-auto mt-10" />;

  const hdpeNames = useMemo(() => (lookupsData?.brands ?? []).map((b: any) => b.name).sort(), [lookupsData?.brands]);
  const chemicalNames = useMemo(() => (lookupsData?.chemicals ?? []).map((c: any) => c.name).sort(), [lookupsData?.chemicals]);
  const colorNames = useMemo(() => (lookupsData?.colors ?? []).map((c: any) => c.name).sort(), [lookupsData?.colors]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/opening-balance/raw-materials/${deleteTarget.groupId}`, { method: 'DELETE' });
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: openingBalanceRawMaterialKeys.all });
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (record: OpeningBalanceHDPEGroup) => {
    setEditingRecord(record);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: OpeningBalanceRawMaterialGroupPayload) => {
    setSaveError(null);
    try {
      const response = editingRecord
        ? await apiFetch(`/opening-balance/raw-materials/${editingRecord.groupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        : await apiFetch('/opening-balance/raw-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

      if (!response.ok) {
        setSaveError(await extractApiErrorMessage(response, 'Failed to save opening balance.'));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: openingBalanceRawMaterialKeys.all });
      setIsModalOpen(false);
    } catch {
      setSaveError('Could not save opening balance. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">HDPE Opening Balance</h3>
        <Button onClick={handleOpenAdd} className="bg-[#004D40] hover:bg-[#004D40]/90 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Opening Balance
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="text-sm border-collapse bg-white w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th rowSpan={3} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200 align-middle">
                  DATE
                </th>
                {hdpeNames.length > 0 && (
                  <th colSpan={hdpeNames.length * 2 + 2} className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">
                    HDPE
                  </th>
                )}
                {chemicalNames.length > 0 && (
                  <th colSpan={chemicalNames.length + 1} className="px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50 border-r border-gray-200">
                    CHEMICALS
                  </th>
                )}
                {colorNames.length > 0 && (
                  <th colSpan={colorNames.length + 1} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50 border-r border-gray-200">
                    COLORS
                  </th>
                )}
                <th rowSpan={3} className="px-3 py-2 text-center font-bold text-gray-700 uppercase tracking-wide align-middle">
                  ACTIONS
                </th>
              </tr>
              <tr className="bg-gray-50/80 border-b border-gray-300">
                {hdpeNames.length > 0 && (
                  <React.Fragment>
                    {hdpeNames.map(name => (
                      <th key={name} colSpan={2} className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-blue-600 text-[10px] sm:text-xs uppercase whitespace-nowrap">
                        {name}
                      </th>
                    ))}
                    <th colSpan={2} className="border-r border-gray-200 px-2 py-1 text-center font-bold text-teal-700 text-[10px] sm:text-xs uppercase whitespace-nowrap bg-teal-50/30">
                      TOTAL
                    </th>
                  </React.Fragment>
                )}
                {chemicalNames.length > 0 && (
                  <React.Fragment>
                    {chemicalNames.map(name => (
                      <th key={name} rowSpan={2} className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-yellow-600 text-[10px] sm:text-xs uppercase whitespace-nowrap align-middle">
                        {name}
                      </th>
                    ))}
                    <th rowSpan={2} className="border-r border-gray-200 px-2 py-1 text-center font-bold text-yellow-700 text-[10px] sm:text-xs uppercase whitespace-nowrap bg-yellow-50/30 align-middle">
                      TOTAL
                    </th>
                  </React.Fragment>
                )}
                {colorNames.length > 0 && (
                  <React.Fragment>
                    {colorNames.map(name => (
                      <th key={name} rowSpan={2} className="border-r border-gray-200 px-2 py-1 text-center font-semibold text-purple-600 text-[10px] sm:text-xs uppercase whitespace-nowrap align-middle">
                        {name}
                      </th>
                    ))}
                    <th rowSpan={2} className="border-r border-gray-200 px-2 py-1 text-center font-bold text-purple-700 text-[10px] sm:text-xs uppercase whitespace-nowrap bg-purple-50/30 align-middle">
                      TOTAL
                    </th>
                  </React.Fragment>
                )}
              </tr>
              <tr className="bg-gray-50/80 border-b border-gray-300">
                {hdpeNames.length > 0 && (
                  <React.Fragment>
                    {hdpeNames.map(name => (
                      <React.Fragment key={'hdpe-sub-' + name}>
                        <th className="border-r border-gray-200 px-1 py-1 text-center font-semibold text-blue-600 text-[11px] sm:text-xs uppercase whitespace-nowrap">BAGS</th>
                        <th className="border-r border-gray-200 px-1 py-1 text-center font-semibold text-blue-600 text-[11px] sm:text-xs uppercase whitespace-nowrap">WEIGHT <span className="normal-case">(kg)</span></th>
                      </React.Fragment>
                    ))}
                    <th className="border-r border-gray-200 px-1 py-1 text-center font-bold text-teal-700 text-[11px] sm:text-xs uppercase whitespace-nowrap bg-teal-50/30">BAGS</th>
                    <th className="border-r border-gray-200 px-1 py-1 text-center font-bold text-teal-700 text-[11px] sm:text-xs uppercase whitespace-nowrap bg-teal-50/30">WEIGHT <span className="normal-case">(kg)</span></th>
                  </React.Fragment>
                )}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-gray-500 text-sm">
                    No opening balances found. Add one to get started.
                  </td>
                </tr>
              ) : (
                groups.map((r) => {
                  let totalHdpeBags = 0;
                  let totalHdpeWeight = 0;
                  let totalChemWeight = 0;
                  let totalColorWeight = 0;

                  return (
                    <tr key={r.groupId} className="border-b border-gray-200 hover:bg-gray-50/50">
                      <td className="border-r border-gray-200 px-3 py-2 text-center font-medium text-gray-900 whitespace-nowrap">
                        {format(new Date(r.date), 'dd MMM yyyy')}
                      </td>

                      {hdpeNames.length > 0 && (
                        <React.Fragment>
                          {hdpeNames.map(name => {
                            const bags = r.hdpe[name]?.bags || 0;
                            const weight = r.hdpe[name]?.weightKg || 0;
                            totalHdpeBags += bags;
                            totalHdpeWeight += weight;
                            return (
                              <React.Fragment key={'row-hdpe-' + name}>
                                <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">{bags || '—'}</td>
                                <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">{weight ? weight.toFixed(2) : '—'}</td>
                              </React.Fragment>
                            );
                          })}
                          <td className="border-r border-gray-200 px-2 py-2 text-center font-bold text-teal-800 bg-teal-50/20">{totalHdpeBags || '—'}</td>
                          <td className="border-r border-gray-200 px-2 py-2 text-center font-bold text-teal-800 bg-teal-50/20">{totalHdpeWeight ? totalHdpeWeight.toFixed(2) : '—'}</td>
                        </React.Fragment>
                      )}

                      {chemicalNames.length > 0 && (
                        <React.Fragment>
                          {chemicalNames.map(name => {
                            const weight = r.chemicals[name] || 0;
                            totalChemWeight += weight;
                            return (
                              <td key={'row-chem-' + name} className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                                {weight ? weight.toFixed(2) : '—'}
                              </td>
                            );
                          })}
                          <td className="border-r border-gray-200 px-2 py-2 text-center font-bold text-yellow-800 bg-yellow-50/20">
                            {totalChemWeight ? totalChemWeight.toFixed(2) : '—'}
                          </td>
                        </React.Fragment>
                      )}

                      {colorNames.length > 0 && (
                        <React.Fragment>
                          {colorNames.map(name => {
                            const weight = r.colors[name] || 0;
                            totalColorWeight += weight;
                            return (
                              <td key={'row-col-' + name} className="border-r border-gray-200 px-2 py-2 text-center text-gray-600">
                                {weight ? weight.toFixed(2) : '—'}
                              </td>
                            );
                          })}
                          <td className="border-r border-gray-200 px-2 py-2 text-center font-bold text-purple-800 bg-purple-50/20">
                            {totalColorWeight ? totalColorWeight.toFixed(2) : '—'}
                          </td>
                        </React.Fragment>
                      )}

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
                  );
                })
              )}
            </tbody>
            <tfoot>
              {groups.length > 0 && (
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td className="px-3 py-3 text-center text-gray-800 uppercase tracking-wide border-r border-gray-200">Grand Total</td>

                  {hdpeNames.length > 0 && (
                    <React.Fragment>
                      {hdpeNames.map(name => {
                        const totalBags = groups.reduce((acc, r) => acc + (r.hdpe[name]?.bags || 0), 0);
                        const totalWeight = groups.reduce((acc, r) => acc + (r.hdpe[name]?.weightKg || 0), 0);
                        return (
                          <React.Fragment key={'grand-hdpe-' + name}>
                            <td className="border-r border-gray-200 px-2 py-3 text-center text-blue-800">{totalBags || '—'}</td>
                            <td className="border-r border-gray-200 px-2 py-3 text-center text-blue-800">{totalWeight ? totalWeight.toFixed(2) : '—'}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className="border-r border-gray-200 px-2 py-3 text-center font-bold text-teal-900 bg-teal-100/50">
                        {groups.reduce((acc, r) => acc + hdpeNames.reduce((sum, n) => sum + (r.hdpe[n]?.bags || 0), 0), 0) || '—'}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-3 text-center font-bold text-teal-900 bg-teal-100/50">
                        {groups.reduce((acc, r) => acc + hdpeNames.reduce((sum, n) => sum + (r.hdpe[n]?.weightKg || 0), 0), 0).toFixed(2) || '—'}
                      </td>
                    </React.Fragment>
                  )}

                  {chemicalNames.length > 0 && (
                    <React.Fragment>
                      {chemicalNames.map(name => {
                        const totalWeight = groups.reduce((acc, r) => acc + (r.chemicals[name] || 0), 0);
                        return (
                          <td key={'grand-chem-' + name} className="border-r border-gray-200 px-2 py-3 text-center text-yellow-800">
                            {totalWeight ? totalWeight.toFixed(2) : '—'}
                          </td>
                        );
                      })}
                      <td className="border-r border-gray-200 px-2 py-3 text-center font-bold text-yellow-900 bg-yellow-100/50">
                        {groups.reduce((acc, r) => acc + chemicalNames.reduce((sum, n) => sum + (r.chemicals[n] || 0), 0), 0).toFixed(2) || '—'}
                      </td>
                    </React.Fragment>
                  )}

                  {colorNames.length > 0 && (
                    <React.Fragment>
                      {colorNames.map(name => {
                        const totalWeight = groups.reduce((acc, r) => acc + (r.colors[name] || 0), 0);
                        return (
                          <td key={'grand-color-' + name} className="border-r border-gray-200 px-2 py-3 text-center text-purple-800">
                            {totalWeight ? totalWeight.toFixed(2) : '—'}
                          </td>
                        );
                      })}
                      <td className="border-r border-gray-200 px-2 py-3 text-center font-bold text-purple-900 bg-purple-100/50">
                        {groups.reduce((acc, r) => acc + colorNames.reduce((sum, n) => sum + (r.colors[n] || 0), 0), 0).toFixed(2) || '—'}
                      </td>
                    </React.Fragment>
                  )}
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <HDPEModal
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
        title="Delete this opening balance?"
        description="This action cannot be undone."
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

function HDPEModal({ onClose, onSave, initialData, lookupsData, error }: {
  onClose: () => void;
  onSave: (data: OpeningBalanceRawMaterialGroupPayload) => Promise<void>;
  initialData: OpeningBalanceHDPEGroup | null;
  lookupsData: any;
  error: string | null;
}) {
  const [date, setDate] = useState<Date | undefined>(initialData ? new Date(initialData.date) : new Date());
  const { data: configData } = useConfigForDate(date ? format(date, 'yyyy-MM-dd') : null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [hdpeBags, setHdpeBags] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (initialData?.hdpe) {
      Object.entries(initialData.hdpe).forEach(([k, v]) => { if (v.bags) init[k] = String(v.bags); });
    }
    return init;
  });
  const [hdpeWeights, setHdpeWeights] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (initialData?.hdpe) {
      Object.entries(initialData.hdpe).forEach(([k, v]) => { if (v.weightKg) init[k] = String(v.weightKg); });
    }
    return init;
  });
  const [chemWeights, setChemWeights] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (initialData?.chemicals) {
      Object.entries(initialData.chemicals).forEach(([k, v]) => { if (v) init[k] = String(v); });
    }
    return init;
  });
  const [colorWeights, setColorWeights] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (initialData?.colors) {
      Object.entries(initialData.colors).forEach(([k, v]) => { if (v) init[k] = String(v); });
    }
    return init;
  });
  const [isSaving, setIsSaving] = useState(false);

  const hdpeNames = useMemo(() => (lookupsData?.brands ?? []).map((b: any) => b.name).sort(), [lookupsData?.brands]);
  const chemicalNames = useMemo(() => (lookupsData?.chemicals ?? []).map((c: any) => c.name).sort(), [lookupsData?.chemicals]);
  const colorNames = useMemo(() => (lookupsData?.colors ?? []).map((c: any) => c.name).sort(), [lookupsData?.colors]);

  const handleHdpeBagChange = (name: string, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setHdpeBags(prev => ({ ...prev, [name]: cleaned }));

    if (cleaned && configData?.basisWeightKg) {
      const bags = parseInt(cleaned, 10);
      if (!isNaN(bags)) {
        setHdpeWeights(prev => ({ ...prev, [name]: String(bags * configData.basisWeightKg) }));
      }
    } else if (!cleaned) {
      setHdpeWeights(prev => ({ ...prev, [name]: '' }));
    }
  };
  const handleHdpeWeightChange = (name: string, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setHdpeWeights(prev => ({ ...prev, [name]: cleaned }));
  };
  const handleChemChange = (name: string, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setChemWeights(prev => ({ ...prev, [name]: cleaned }));
  };
  const handleColorChange = (name: string, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setColorWeights(prev => ({ ...prev, [name]: cleaned }));
  };

  const handleSubmit = async () => {
    if (!date) return;

    const items: OpeningBalanceRawMaterialItemPayload[] = [];

    hdpeNames.forEach((n: string) => {
      const b = parseInt(hdpeBags[n]);
      const w = parseFloat(hdpeWeights[n]);
      if (!isNaN(b) || !isNaN(w)) {
        const brandId = findIdByName(lookupsData?.brands ?? [], n);
        if (brandId) {
          items.push({ type: 'HDPE', brandId, weightKg: !isNaN(w) ? w : 0, bagCount: !isNaN(b) ? b : undefined });
        }
      }
    });

    chemicalNames.forEach((n: string) => {
      const w = parseFloat(chemWeights[n]);
      if (!isNaN(w)) {
        const chemicalId = findIdByName(lookupsData?.chemicals ?? [], n);
        if (chemicalId) items.push({ type: 'CHEMICAL', chemicalId, weightKg: w });
      }
    });

    colorNames.forEach((n: string) => {
      const w = parseFloat(colorWeights[n]);
      if (!isNaN(w)) {
        const colorId = findIdByName(lookupsData?.colors ?? [], n);
        if (colorId) items.push({ type: 'COLOR', colorId, weightKg: w });
      }
    });

    if (items.length === 0) return;

    setIsSaving(true);
    try {
      await onSave({ date: date.toISOString().slice(0, 10), items });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[95vw] w-max lg:max-w-none overflow-hidden flex flex-col max-h-[90vh] border border-gray-400 p-4 bg-[#F4F1E8]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 -mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-black">{initialData ? 'Edit' : 'Add'} Raw Material Opening Balance</DialogTitle>
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
          <div className="flex justify-center w-full">
            <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm w-max max-w-[95vw]">
              <table className="text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300">
                    {hdpeNames.length > 0 && (
                      <th colSpan={hdpeNames.length * 2} className="px-3 py-2 text-center font-bold text-blue-700 uppercase tracking-wide bg-blue-50/50 border-r border-gray-200">
                        HDPE
                      </th>
                    )}
                    {chemicalNames.length > 0 && <th colSpan={chemicalNames.length} className="px-3 py-2 text-center font-bold text-yellow-700 uppercase tracking-wide bg-yellow-50/50 border-r border-gray-200">CHEMICALS</th>}
                    {colorNames.length > 0 && <th colSpan={colorNames.length} className="px-3 py-2 text-center font-bold text-purple-700 uppercase tracking-wide bg-purple-50/50">COLORS</th>}
                  </tr>
                  <tr className="bg-gray-50/80 border-b border-gray-300">
                    {hdpeNames.length > 0 && (
                      <React.Fragment>
                        {hdpeNames.map((name: string, idx: number) => <th key={name} colSpan={2} className={`border-r ${idx === hdpeNames.length - 1 && chemicalNames.length === 0 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-3 py-2 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap`}>{name}</th>)}
                      </React.Fragment>
                    )}
                    {chemicalNames.length > 0 && (
                      <React.Fragment>
                        {chemicalNames.map((name: string, idx: number) => <th key={name} colSpan={1} className={`border-r ${idx === chemicalNames.length - 1 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-3 py-2 text-center font-semibold text-yellow-600 text-xs uppercase whitespace-nowrap`}>{name}</th>)}
                      </React.Fragment>
                    )}
                    {colorNames.length > 0 && (
                      <React.Fragment>
                        {colorNames.map((name: string, idx: number) => <th key={name} colSpan={1} className={`border-r ${idx === colorNames.length - 1 ? 'border-transparent' : 'border-gray-200'} px-3 py-2 text-center font-semibold text-purple-600 text-xs uppercase whitespace-nowrap`}>{name}</th>)}
                      </React.Fragment>
                    )}
                  </tr>
                  <tr className="bg-gray-50/80 border-b border-gray-300">
                    {hdpeNames.length > 0 && hdpeNames.map((name: string, idx: number) => (
                      <React.Fragment key={'hdpe-' + name + '-sub'}>
                        <th className="border-r border-gray-200 px-1 py-1 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap">Bags</th>
                        <th className={`border-r ${idx === hdpeNames.length - 1 && chemicalNames.length === 0 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-1 py-1 text-center font-semibold text-blue-600 text-xs uppercase whitespace-nowrap`}>Weight <span className="normal-case">(kg)</span></th>
                      </React.Fragment>
                    ))}
                    {chemicalNames.length > 0 && chemicalNames.map((name: string, idx: number) => (
                      <React.Fragment key={'chem-' + name + '-sub'}>
                        <th className={`border-r ${idx === chemicalNames.length - 1 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} px-1 py-1 text-center font-semibold text-yellow-600 text-xs uppercase whitespace-nowrap`}>Weight <span className="normal-case">(kg)</span></th>
                      </React.Fragment>
                    ))}
                    {colorNames.length > 0 && colorNames.map((name: string, idx: number) => (
                      <React.Fragment key={'col-' + name + '-sub'}>
                        <th className={`border-r ${idx === colorNames.length - 1 ? 'border-transparent' : 'border-gray-200'} px-1 py-1 text-center font-semibold text-purple-600 text-xs uppercase whitespace-nowrap`}>Weight <span className="normal-case">(kg)</span></th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {hdpeNames.length > 0 && (
                      <React.Fragment>
                        {hdpeNames.map((name: string, idx: number) => (
                          <React.Fragment key={'hdpe-' + name + '-inputs'}>
                            <td className="border-r border-gray-200 p-1">
                              <Input type="text" placeholder="Bags" className="w-16 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-blue-50/10 border-2 border-blue-200 mx-auto" value={hdpeBags[name] || ''} onChange={(e) => handleHdpeBagChange(name, e.target.value)} />
                            </td>
                            <td className={`border-r ${idx === hdpeNames.length - 1 && chemicalNames.length === 0 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} p-1`}>
                              <Input type="text" placeholder="Weight" className="w-20 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-blue-50/10 border-2 border-blue-200 mx-auto" value={hdpeWeights[name] || ''} onChange={(e) => handleHdpeWeightChange(name, e.target.value)} />
                            </td>
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    )}

                    {chemicalNames.length > 0 && (
                      <React.Fragment>
                        {chemicalNames.map((name: string, idx: number) => (
                          <React.Fragment key={'chem-' + name + '-inputs'}>
                            <td className={`border-r ${idx === chemicalNames.length - 1 && colorNames.length === 0 ? 'border-transparent' : 'border-gray-200'} p-1`}>
                              <Input type="text" placeholder="Weight" className="w-20 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-yellow-50/10 border-2 border-yellow-200 mx-auto" value={chemWeights[name] || ''} onChange={(e) => handleChemChange(name, e.target.value)} />
                            </td>
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    )}

                    {colorNames.length > 0 && (
                      <React.Fragment>
                        {colorNames.map((name: string, idx: number) => (
                          <React.Fragment key={'col-' + name + '-inputs'}>
                            <td className={`border-r ${idx === colorNames.length - 1 ? 'border-transparent' : 'border-gray-200'} p-1`}>
                              <Input type="text" placeholder="Weight" className="w-20 rounded-full text-center h-9 text-sm placeholder:text-xs font-medium bg-purple-50/10 border-2 border-purple-200 mx-auto" value={colorWeights[name] || ''} onChange={(e) => handleColorChange(name, e.target.value)} />
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
