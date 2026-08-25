import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLookups, type Lookups } from '@/features/extruder/extruder-queries';
import { themes } from '@/features/production/day-entry-sections';
import { type LoomDraft, emptyLoomDraft, suggestLoomOutput } from '@/features/looms/loom-section';

interface LoomModalFormProps {
  initialData?: LoomDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  onSave: (data: LoomDraft) => void;
}

export function LoomModalForm({ initialData, isEditMode, onCancel, onSave }: LoomModalFormProps) {
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.looms;

  const [draft, setDraft] = useState<LoomDraft>(initialData || { ...emptyLoomDraft });
  const [outputManuallyEdited, setOutputManuallyEdited] = useState(!!initialData);

  const updateField = (field: keyof LoomDraft, value: string) => {
    setDraft(prev => {
      const next = { ...prev, [field]: value };
      if (!outputManuallyEdited && (field === 'input' || field === 'loomsWasteKg')) {
        next.output = suggestLoomOutput(next);
      }
      return next;
    });
  };

  const handleManualOutputChange = (value: string) => {
    setOutputManuallyEdited(true);
    updateField('output', value);
  };

  const handleSave = () => {
    // Note: Validation is still handled by the parent saving logic in this architecture, 
    // but we could add basic required checks here.
    onSave(draft);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Size</Label>
          <Select value={draft.size} onValueChange={(v) => updateField('size', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger>
            <SelectContent>{lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Color</Label>
          <Select value={draft.color} onValueChange={(v) => updateField('color', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent>{lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
        <h3 className={`text-sm font-semibold uppercase tracking-wider border-b pb-2 ${theme.headerText}`}>Production Details</h3>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-2">
            <Label className="text-gray-600 text-xs font-semibold">Loom Production (kg)</Label>
            <Input type="number" placeholder="0.00" value={draft.input} onChange={(e) => updateField('input', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-600 text-xs font-semibold">Looms/Yarn Waste (kg)</Label>
            <Input type="number" placeholder="0.00" value={draft.loomsWasteKg} onChange={(e) => updateField('loomsWasteKg', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-yellow-50/50 p-4 rounded-lg border border-yellow-100">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-yellow-800 border-b border-yellow-200 pb-2">Fabric Production</h3>
        <div className="w-1/2 space-y-2 pt-1">
          <Label className="text-yellow-800 text-xs font-semibold">Total Fabric Production (kg)</Label>
          <Input
            type="number"
            className="border-yellow-200 focus-visible:ring-yellow-400 font-bold text-yellow-700 bg-white"
            placeholder="0.00"
            value={draft.output}
            onChange={(e) => handleManualOutputChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} className="border-gray-300 text-gray-700">
          Cancel
        </Button>
        <Button onClick={handleSave} className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}>
          Save Looms Entry
        </Button>
      </div>
    </div>
  );
}
