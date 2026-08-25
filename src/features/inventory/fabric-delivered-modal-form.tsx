import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLookups, type Lookups } from '@/features/extruder/extruder-queries';
import { themes } from '@/features/production/day-entry-sections';
import { type FabricDeliveredDraft, emptyFabricDeliveredDraft } from '@/features/inventory/fabric-delivered-section';

interface FabricDeliveredModalFormProps {
  initialData?: FabricDeliveredDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  onSave: (data: FabricDeliveredDraft) => void;
}

export function FabricDeliveredModalForm({ initialData, isEditMode, onCancel, onSave }: FabricDeliveredModalFormProps) {
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.fabricDelivered;

  const [draft, setDraft] = useState<FabricDeliveredDraft>(initialData || { ...emptyFabricDeliveredDraft });

  const updateField = (field: keyof FabricDeliveredDraft, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="grid grid-cols-3 gap-4">
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
        <div className="space-y-2">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Delivered (kg)</Label>
          <Input 
            type="number" 
            placeholder="0.00" 
            value={draft.delivered} 
            onChange={(e) => updateField('delivered', e.target.value)} 
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} className="border-gray-300 text-gray-700">
          Cancel
        </Button>
        <Button onClick={handleSave} className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}>
          Save Delivery Entry
        </Button>
      </div>
    </div>
  );
}
