import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/shared/loader';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import { useLookups, findIdByName, type Lookups } from '@/features/extruder/extruder-queries';
import { loadSentKeys, type LoadSentCreatePayload } from '@/features/inventory/load-sent-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes } from '@/features/production/day-entry-sections';
import { type FabricDeliveredDraft, emptyFabricDeliveredDraft } from '@/features/inventory/fabric-delivered-section';

interface FabricDeliveredModalFormProps {
  productionDate: string;
  initialData?: FabricDeliveredDraft | null;
  isEditMode?: boolean;
  onCancel: () => void;
  /** Called after the entry is successfully persisted to the backend. */
  onSuccess: () => void;
}

export function FabricDeliveredModalForm({ productionDate, initialData, isEditMode, onCancel, onSuccess }: FabricDeliveredModalFormProps) {
  const queryClient = useQueryClient();
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };
  const theme = themes.fabricDelivered;

  const [draft, setDraft] = useState<FabricDeliveredDraft>(initialData || { ...emptyFabricDeliveredDraft });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FabricDeliveredDraft, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError(null);

    const colorId = findIdByName(lookups.colors, draft.color);
    const sizeId = findIdByName(lookups.sizes, draft.size);

    if (!colorId || !sizeId) {
      setError('Please select a valid size and color.');
      return;
    }

    const payload: LoadSentCreatePayload = {
      productionDate,
      colorId,
      sizeId,
      fabricWeight: parseFloat(draft.delivered) || 0,
      ...(draft.vehicleNo?.trim() ? { vehicleNo: draft.vehicleNo.trim() } : {}),
      ...(draft.driverName?.trim() ? { driverName: draft.driverName.trim() } : {}),
    };

    setSaving(true);
    try {
      const response = draft.id
        ? await apiFetch(`/load-sent/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        : await apiFetch('/load-sent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      if (!response.ok) {
        const msg = await extractApiErrorMessage(response, 'Failed to save fabric delivery entry.');
        setError(msg);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: loadSentKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      onSuccess();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 px-1">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Size</Label>
          <Select value={draft.size} onValueChange={(v) => updateField('size', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger>
            <SelectContent>{lookups.sizes?.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Color</Label>
          <Select value={draft.color} onValueChange={(v) => updateField('color', v)} disabled={isEditMode}>
            <SelectTrigger><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent>{lookups.colors?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Delivered (kg)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={draft.delivered}
            onChange={(e) => updateField('delivered', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Vehicle No</Label>
          <Input
            type="text"
            placeholder="TN 00 XX 0000"
            value={draft.vehicleNo}
            onChange={(e) => updateField('vehicleNo', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Driver Name</Label>
          <Input
            type="text"
            placeholder="Driver Name"
            value={draft.driverName}
            onChange={(e) => updateField('driverName', e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 mt-auto pt-3 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="border-gray-300 text-gray-700">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className={`${theme.iconBg} ${theme.iconColor} hover:opacity-90`}>
          {saving && <Loader className="mr-2" size="sm" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
