import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLookups, type Lookups } from '@/features/extruder/extruder-queries';
import { themes } from '@/features/production/day-entry-sections';
import { type FabricDraft, emptyFabricDraft, suggestFabricOutput } from '@/features/fabric/fabric-section';

interface FabricModalFormProps {
  initialData?: FabricDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  onSave: (data: FabricDraft) => void;
}

export function FabricModalForm({ initialData, isEditMode, onCancel, onSave }: FabricModalFormProps) {
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.fabric;

  const [draft, setDraft] = useState<FabricDraft>(initialData || { ...emptyFabricDraft });
  const [outputManuallyEdited, setOutputManuallyEdited] = useState(!!initialData);

  const updateField = (field: keyof FabricDraft, value: string) => {
    setDraft(prev => {
      const next = { ...prev, [field]: value };
      if (!outputManuallyEdited && (field === 'input' || field === 'fwKg' || field === 'bwKg')) {
        next.output = suggestFabricOutput(next);
      }
      return next;
    });
  };

  const handleManualOutputChange = (value: string) => {
    setOutputManuallyEdited(true);
    updateField('output', value);
  };

  const handleSave = () => {
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
            <Label className="text-gray-600 text-xs font-semibold">Kora</Label>
            <Input type="text" placeholder="Kora details" value={draft.kora} onChange={(e) => updateField('kora', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-600 text-xs font-semibold">Fabric Production (kg)</Label>
            <Input type="number" placeholder="0.00" value={draft.input} onChange={(e) => updateField('input', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
        <h3 className={`text-sm font-semibold uppercase tracking-wider border-b pb-2 ${theme.headerText}`}>Wastage</h3>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-2">
            <Label className="text-gray-600 text-xs font-semibold">Fabric Waste (kg)</Label>
            <Input type="number" placeholder="0.00" value={draft.fwKg} onChange={(e) => updateField('fwKg', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-600 text-xs font-semibold">Bit Waste (kg)</Label>
            <Input type="number" placeholder="0.00" value={draft.bwKg} onChange={(e) => updateField('bwKg', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-fuchsia-50/50 p-4 rounded-lg border border-fuchsia-100">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-fuchsia-800 border-b border-fuchsia-200 pb-2">Fabric Production</h3>
        <div className="w-1/2 space-y-2 pt-1">
          <Label className="text-fuchsia-800 text-xs font-semibold">Total Fabric Stock (kg)</Label>
          <Input
            type="number"
            className="border-fuchsia-200 focus-visible:ring-fuchsia-400 font-bold text-fuchsia-700 bg-white"
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
          Save Fabric Entry
        </Button>
      </div>
    </div>
  );
}
