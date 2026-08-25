import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useLookups, type Lookups } from '@/features/extruder/extruder-queries';
import { themes } from '@/features/production/day-entry-sections';
import type { ExtruderGroupDraft, ExtruderBrandDraft } from '@/features/extruder/extruder-section-new';

interface ExtruderModalFormProps {
  initialData?: ExtruderGroupDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  onSave: (data: ExtruderGroupDraft) => void;
}

const emptyBrandDraft = (): ExtruderBrandDraft => ({
  key: crypto.randomUUID(),
  brand: '',
  bags: '',
  weightPerBag: '',
  looseWeight: '',
  raw: '',
});

const emptyGroupDraft = (): ExtruderGroupDraft => ({
  key: crypto.randomUUID(),
  size: '',
  color: '',
  output: '',
  chemical: '',
  chemicalKg: '',
  lumpsKg: '',
  yarnWasteKg: '',
  brands: [emptyBrandDraft()],
});

export function ExtruderModalForm({ initialData, isEditMode, onCancel, onSave }: ExtruderModalFormProps) {
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.extruder;

  const [group, setGroup] = useState<ExtruderGroupDraft>(initialData || emptyGroupDraft());

  const updateGroupField = (field: keyof ExtruderGroupDraft, value: string) => {
    setGroup(prev => ({ ...prev, [field]: value }));
  };

  const updateBrandField = (brandKey: string, field: keyof ExtruderBrandDraft, value: string) => {
    setGroup(prev => ({
      ...prev,
      brands: prev.brands.map(b => {
        if (b.key !== brandKey) return b;
        const updated = { ...b, [field]: value };
        if (field === 'bags' || field === 'weightPerBag' || field === 'looseWeight') {
          const bags = parseFloat(updated.bags) || 0;
          const wpb = parseFloat(updated.weightPerBag) || 0;
          const lw = parseFloat(updated.looseWeight) || 0;
          if (bags > 0 && wpb > 0) {
            updated.raw = (bags * wpb + lw).toFixed(2);
          } else if (lw > 0) {
            updated.raw = lw.toFixed(2);
          } else {
            updated.raw = '';
          }
        }
        return updated;
      })
    }));
  };

  const addBrand = () => {
    setGroup(prev => ({ ...prev, brands: [...prev.brands, emptyBrandDraft()] }));
  };

  const removeBrand = (brandKey: string) => {
    setGroup(prev => {
      if (prev.brands.length <= 1) return prev;
      return { ...prev, brands: prev.brands.filter(b => b.key !== brandKey) };
    });
  };

  const handleSave = () => {
    onSave(group);
  };

  return (
    <div className="flex flex-col gap-6 px-1">

      {/* General Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Size</Label>
          <Select value={group.size} onValueChange={(v) => updateGroupField('size', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger>
            <SelectContent>{lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Color</Label>
          <Select value={group.color} onValueChange={(v) => updateGroupField('color', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent>{lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* HDPE Material */}
      <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${theme.headerText}`}>HDPE Material</h3>
          <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-2 flex items-center gap-1" onClick={addBrand}>
            <Plus className="h-3.5 w-3.5" /> <span className="text-xs">Add Brand</span>
          </Button>
        </div>
        <div className="space-y-3 pt-1">
          {group.brands.map((brandRow, idx) => (
            <div key={brandRow.key} className="flex items-end gap-3">
              <div className="space-y-1.5 flex-1 min-w-[80px]">
                {idx === 0 && <Label className="text-xs text-gray-500">Bags</Label>}
                <Input type="number" placeholder="Bags" value={brandRow.bags} onChange={(e) => updateBrandField(brandRow.key, 'bags', e.target.value)} />
              </div>
              <div className="space-y-1.5 flex-[2] min-w-[140px]">
                {idx === 0 && <Label className="text-xs text-gray-500">Brand</Label>}
                <Select value={brandRow.brand} onValueChange={(v) => updateBrandField(brandRow.key, 'brand', v)}>
                  <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
                  <SelectContent>{lookups.brands.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-[1] min-w-[80px]">
                {idx === 0 && <Label className="text-xs text-gray-500">Bag Weight</Label>}
                <Input type="number" placeholder="Bag Weight" value={brandRow.weightPerBag} onChange={(e) => updateBrandField(brandRow.key, 'weightPerBag', e.target.value)} />
              </div>
              <div className="space-y-1.5 flex-[1] min-w-[80px]">
                {idx === 0 && <Label className="text-xs text-gray-500">Loose Wt</Label>}
                <Input type="number" placeholder="Loose Wt" value={brandRow.looseWeight} onChange={(e) => updateBrandField(brandRow.key, 'looseWeight', e.target.value)} />
              </div>
              <div className="space-y-1.5 flex-[1] min-w-[100px]">
                {idx === 0 && <Label className="text-xs text-gray-500">Total (kg)</Label>}
                <Input type="number" placeholder="Total" readOnly className="bg-white font-medium" value={brandRow.raw} onChange={(e) => updateBrandField(brandRow.key, 'raw', e.target.value)} />
              </div>
              <div className={`flex items-center ${idx === 0 ? 'pb-1' : ''}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 text-red-500 hover:bg-red-50 ${group.brands.length <= 1 ? 'opacity-0 pointer-events-none' : ''}`}
                  onClick={() => removeBrand(brandRow.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Chemicals */}
        <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
          <h3 className={`text-sm font-semibold uppercase tracking-wider border-b pb-2 ${theme.headerText}`}>Chemicals</h3>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-gray-600 text-xs font-semibold">Chemical Type</Label>
              <Select value={group.chemical} onValueChange={(v) => updateGroupField('chemical', v)} disabled={isEditMode}>
                <SelectTrigger><SelectValue placeholder="Select Chem" /></SelectTrigger>
                <SelectContent>{lookups.chemicals.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600 text-xs font-semibold">Chemical Weight (kg)</Label>
              <Input type="number" placeholder="0.00" value={group.chemicalKg} onChange={(e) => updateGroupField('chemicalKg', e.target.value)} disabled={isEditMode} />
            </div>
          </div>
        </div>

        {/* Wastage */}
        <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
          <h3 className={`text-sm font-semibold uppercase tracking-wider border-b pb-2 ${theme.headerText}`}>Wastage</h3>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-gray-600 text-xs font-semibold">Lumps (kg)</Label>
              <Input type="number" placeholder="0.00" value={group.lumpsKg} onChange={(e) => updateGroupField('lumpsKg', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600 text-xs font-semibold">Looms Waste (kg)</Label>
              <Input type="number" placeholder="0.00" value={group.yarnWasteKg} onChange={(e) => updateGroupField('yarnWasteKg', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Yarn Production */}
      <div className="space-y-3 bg-green-50/30 p-4 rounded-lg border border-green-100">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-green-800 border-b border-green-200 pb-2">Yarn Production</h3>
        <div className="w-1/2 space-y-2 pt-1">
          <Label className="text-green-800 text-xs font-semibold">Total Yarn Production (kg)</Label>
          <Input type="number" className="border-green-200 focus-visible:ring-green-400 font-bold text-green-700 bg-white" placeholder="0.00" value={group.output} onChange={(e) => updateGroupField('output', e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} className="border-gray-300 text-gray-700">
          Cancel
        </Button>
        <Button onClick={handleSave} className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}>
          Save Extruder Entry
        </Button>
      </div>
    </div>
  );
}
