import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { Plus, Trash2, X as XIcon, Edit2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import {
  useExtruderProductions,
  useLookups,
  extruderKeys,
  findIdByName,
  type Lookups,
  type ExtruderCreatePayload,
  type ExtruderProductionItem
} from '@/features/extruder/extruder-queries';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { themes, type SectionProps, type SectionRef, type ExtruderRow } from '@/features/production/day-entry-sections';
import { sumWastageByCode } from '@/lib/api-types';

export interface ExtruderBrandDraft {
  key: string;
  id?: string; // If editing existing
  brand: string;
  bags: string;
  weightPerBag: string;
  raw: string;
  chemical: string;
  chemicalKg: string;
  colorConsumedKg: string;
  lumpsKg: string;
  yarnWasteKg: string;
}

export interface ExtruderGroupDraft {
  key: string; // "sizeId-colorId" for existing, or random UUID for new
  size: string;
  color: string;
  output: string;
  brands: ExtruderBrandDraft[];
}

const emptyBrandDraft = (): ExtruderBrandDraft => ({
  key: crypto.randomUUID(),
  brand: '',
  bags: '',
  weightPerBag: '',
  raw: '',
  chemical: '',
  chemicalKg: '',
  colorConsumedKg: '',
  lumpsKg: '',
  yarnWasteKg: '',
});

const emptyGroupDraft = (): ExtruderGroupDraft => ({
  key: crypto.randomUUID(),
  size: '',
  color: '',
  output: '',
  brands: [emptyBrandDraft()],
});

export const ExtruderSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting, hideBanner }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useExtruderProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  // --- NEW ENTRIES STATE ---
  const [newGroups, setNewGroups] = useState<ExtruderGroupDraft[]>([]);
  const hasAutoAddedRef = useRef(false);

  const startAddGroup = useCallback(() => {
    setNewGroups((current) => [...current, emptyGroupDraft()]);
  }, []);

  useEffect(() => {
    if (readOnly || !autoAdd || isLoading || hasAutoAddedRef.current) return;
    if (newGroups.length === 0) {
      hasAutoAddedRef.current = true;
      startAddGroup();
    }
  }, [readOnly, autoAdd, isLoading, newGroups.length, startAddGroup]);

  // --- EXISTING ENTRIES STATE ---
  const existingGroups = useMemo(() => {
    if (hideExisting || !data?.data) return [];
    const map = new Map<string, ExtruderGroupDraft>();

    data.data.forEach((item) => {
      if (productionDate && !item.productionDate.startsWith(productionDate)) return;

      const sizeName = item.size?.name ?? '';
      const colorName = item.color?.name ?? '';

      const key = `${sizeName}-${colorName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          size: sizeName,
          color: colorName,
          output: '0',
          brands: []
        });
      }

      const group = map.get(key)!;
      // Combine yarn output (it should only be >0 on one of the items realistically)
      const currentOutput = parseFloat(group.output) || 0;
      group.output = (currentOutput + item.extruder.yarnOutputKg).toString();

      group.brands.push({
        key: item.id,
        id: item.id,
        brand: item.extruder?.brand?.name ?? '',
        bags: '', // Not tracked by API yet
        weightPerBag: '', // Not tracked by API yet
        raw: item.extruder?.rawMaterialKg?.toString() ?? '0',
        chemical: item.extruder?.chemical?.name ?? '',
        chemicalKg: item.extruder?.chemicalKg?.toString() ?? '0',
        colorConsumedKg: item.extruder?.colorConsumedKg?.toString() ?? '0',
        lumpsKg: sumWastageByCode(item.wastages, 'LUMPS').toString(),
        yarnWasteKg: sumWastageByCode(item.wastages, 'YARN_WASTE').toString(),
      });
    });

    return Array.from(map.values());
  }, [data?.data, productionDate, hideExisting]);

  // --- EDIT & DELETE STATE ---
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupDraft, setEditGroupDraft] = useState<ExtruderGroupDraft | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ groupId: string, size: string, color: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- STATE MUTATIONS ---
  const updateBrandField = (setter: React.Dispatch<React.SetStateAction<ExtruderGroupDraft[]>>, groupKey: string, brandKey: string, field: keyof ExtruderBrandDraft, value: string) => {
    setter((groups) => groups.map((g) => {
      if (g.key !== groupKey) return g;
      return {
        ...g,
        brands: g.brands.map((b) => {
          if (b.key !== brandKey) return b;
          const updated = { ...b, [field]: value };
          if (field === 'bags' || field === 'weightPerBag') {
            const bags = parseFloat(updated.bags) || 0;
            const wpb = parseFloat(updated.weightPerBag) || 0;
            if (bags > 0 && wpb > 0) {
              updated.raw = (bags * wpb).toFixed(2);
            }
          }
          return updated;
        })
      };
    }));
  };

  const updateGroupField = (setter: React.Dispatch<React.SetStateAction<ExtruderGroupDraft[]>>, groupKey: string, field: keyof ExtruderGroupDraft, value: string) => {
    setter((groups) => groups.map((g) => (g.key === groupKey ? { ...g, [field]: value } : g)));
  };

  const addBrandToGroup = (setter: React.Dispatch<React.SetStateAction<ExtruderGroupDraft[]>>, groupKey: string) => {
    setter((groups) => groups.map((g) => (g.key === groupKey ? { ...g, brands: [...g.brands, emptyBrandDraft()] } : g)));
  };

  const removeBrandFromGroup = (setter: React.Dispatch<React.SetStateAction<ExtruderGroupDraft[]>>, groupKey: string, brandKey: string) => {
    setter((groups) => groups.map((g) => {
      if (g.key !== groupKey) return g;
      if (g.brands.length === 1) return g;
      return { ...g, brands: g.brands.filter((b) => b.key !== brandKey) };
    }));
  };

  const startEditGroup = (group: ExtruderGroupDraft) => {
    setEditingGroupId(group.key);
    setEditGroupDraft(JSON.parse(JSON.stringify(group))); // Deep copy
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
    setEditGroupDraft(null);
  };

  const handleDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // In a real app we'd need to delete all records in the group
    // For now we'll just simulate the action
    try {
      // Mock delete
      await new Promise(r => setTimeout(r, 500));
      await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      // Stub for saving new groups and edit groups
      return true;
    },
  }));

  const theme = themes.extruder;
  const roundedClass = hideBanner ? 'rounded-b-xl rounded-tr-xl rounded-tl-none' : 'rounded-xl';

  const renderGroup = (group: ExtruderGroupDraft, isEditable: boolean, stateSetter: React.Dispatch<React.SetStateAction<ExtruderGroupDraft[]>> | null) => {
    return (
      <React.Fragment key={group.key}>
        {group.brands.map((brandRow, idx) => (
          <TableRow key={brandRow.key} className={`group ${isEditable ? 'bg-blue-50/20' : 'hover:bg-gray-50/50'}`}>
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-top border-r border-gray-200">
                {isEditable && stateSetter ? (
                  <Select value={group.size} onValueChange={(v) => updateGroupField(stateSetter, group.key, 'size', v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Size" /></SelectTrigger>
                    <SelectContent>{lookups.sizes.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium text-gray-700">{group.size}</span>
                )}
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-top border-r border-gray-200 w-32">
                {isEditable && stateSetter ? (
                  <Select value={group.color} onValueChange={(v) => updateGroupField(stateSetter, group.key, 'color', v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Color" /></SelectTrigger>
                    <SelectContent>{lookups.colors.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium text-gray-700">{group.color}</span>
                )}
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className={`align-top border-r border-gray-200 ${isEditable ? 'bg-green-50/30' : ''}`}>
                {isEditable && stateSetter ? (
                  <Input type="number" className="h-9 text-center bg-transparent border-green-200 font-semibold text-green-700" placeholder="Yarn Prod." value={group.output} onChange={(e) => updateGroupField(stateSetter, group.key, 'output', e.target.value)} />
                ) : (
                  <span className="font-semibold text-green-700 block text-center">{parseFloat(group.output) > 0 ? parseFloat(group.output).toFixed(2) : '-'}</span>
                )}
              </TableCell>
            )}

            {/* Brand Row Inputs */}
            <TableCell className="w-32">
              {isEditable && stateSetter ? (
                <Select value={brandRow.brand} onValueChange={(v) => updateBrandField(stateSetter, group.key, brandRow.key, 'brand', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Brand" /></SelectTrigger>
                  <SelectContent>{lookups.brands.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <span>{brandRow.brand}</span>
              )}
            </TableCell>

            <TableCell>
              {isEditable && stateSetter ? (
                <Input type="number" className="h-9 text-center w-16" value={brandRow.bags} onChange={(e) => updateBrandField(stateSetter, group.key, brandRow.key, 'bags', e.target.value)} />
              ) : (
                <span className="block text-center">{brandRow.bags || '-'}</span>
              )}
            </TableCell>

            <TableCell>
              {isEditable && stateSetter ? (
                <Input type="number" className="h-9 text-center w-16" value={brandRow.weightPerBag} onChange={(e) => updateBrandField(stateSetter, group.key, brandRow.key, 'weightPerBag', e.target.value)} />
              ) : (
                <span className="block text-center">{brandRow.weightPerBag || '-'}</span>
              )}
            </TableCell>

            <TableCell className="border-r border-gray-200">
              {isEditable && stateSetter ? (
                <Input type="number" className="h-9 text-center w-20 font-medium" value={brandRow.raw} onChange={(e) => updateBrandField(stateSetter, group.key, brandRow.key, 'raw', e.target.value)} />
              ) : (
                <span className="block text-center font-medium">{parseFloat(brandRow.raw) > 0 ? parseFloat(brandRow.raw).toFixed(2) : '-'}</span>
              )}
            </TableCell>

            <TableCell>
              {isEditable && stateSetter ? (
                <Select value={brandRow.chemical} onValueChange={(v) => updateBrandField(stateSetter, group.key, brandRow.key, 'chemical', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Chem" /></SelectTrigger>
                  <SelectContent>{lookups.chemicals.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <span>{brandRow.chemical}</span>
              )}
            </TableCell>

            <TableCell>
              {isEditable && stateSetter ? (
                <Input type="number" className="h-9 text-center w-16" value={brandRow.chemicalKg} onChange={(e) => updateBrandField(stateSetter, group.key, brandRow.key, 'chemicalKg', e.target.value)} />
              ) : (
                <span className="block text-center">{parseFloat(brandRow.chemicalKg) > 0 ? parseFloat(brandRow.chemicalKg).toFixed(2) : '-'}</span>
              )}
            </TableCell>

            <TableCell className="border-r border-gray-200">
              {isEditable && stateSetter ? (
                <Input type="number" className="h-9 text-center w-16" value={brandRow.colorConsumedKg} onChange={(e) => updateBrandField(stateSetter, group.key, brandRow.key, 'colorConsumedKg', e.target.value)} />
              ) : (
                <span className="block text-center">{parseFloat(brandRow.colorConsumedKg) > 0 ? parseFloat(brandRow.colorConsumedKg).toFixed(2) : '-'}</span>
              )}
            </TableCell>

            <TableCell className={isEditable ? "bg-yellow-50/30" : ""}>
              {isEditable && stateSetter ? (
                <Input type="number" className="h-9 text-center w-16 bg-transparent border-yellow-200" value={brandRow.lumpsKg} onChange={(e) => updateBrandField(stateSetter, group.key, brandRow.key, 'lumpsKg', e.target.value)} />
              ) : (
                <span className="block text-center text-yellow-700">{parseFloat(brandRow.lumpsKg) > 0 ? parseFloat(brandRow.lumpsKg).toFixed(2) : '-'}</span>
              )}
            </TableCell>

            <TableCell className={`border-r border-gray-200 ${isEditable ? "bg-yellow-50/30" : ""}`}>
              {isEditable && stateSetter ? (
                <Input type="number" className="h-9 text-center w-16 bg-transparent border-yellow-200" value={brandRow.yarnWasteKg} onChange={(e) => updateBrandField(stateSetter, group.key, brandRow.key, 'yarnWasteKg', e.target.value)} />
              ) : (
                <span className="block text-center text-yellow-700">{parseFloat(brandRow.yarnWasteKg) > 0 ? parseFloat(brandRow.yarnWasteKg).toFixed(2) : '-'}</span>
              )}
            </TableCell>

            <TableCell className="text-center align-top">
              {isEditable && stateSetter ? (
                <div className="flex items-center justify-center gap-1">
                  {idx === group.brands.length - 1 && (
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => addBrandToGroup(stateSetter, group.key)} title="Add Brand to this Group">
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {group.brands.length > 1 ? (
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeBrandFromGroup(stateSetter, group.key, brandRow.key)} title="Remove Brand">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-gray-400 hover:bg-gray-100" onClick={() => {
                      if (stateSetter === setNewGroups) removeGroup(group.key);
                      else cancelEdit();
                    }} title={stateSetter === setNewGroups ? "Remove Group" : "Cancel Edit"}>
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                idx === 0 && !readOnly && editingGroupId !== group.key && (
                  <div className="flex flex-col items-center justify-center gap-2 mt-1">
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100" onClick={() => startEditGroup(group)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7 rounded-full bg-red-50 text-red-500 hover:bg-red-100" onClick={() => setDeleteTarget({ groupId: group.key, size: group.size, color: group.color })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )
              )}
            </TableCell>
          </TableRow>
        ))}
        {/* Separator row between groups */}
        <TableRow className="h-2 bg-gray-50/50"><TableCell colSpan={14} className="p-0 border-b-2 border-gray-200" /></TableRow>
      </React.Fragment>
    );
  };

  return (
    <div className={`${roundedClass} border ${theme.border} bg-white shadow-sm overflow-hidden`}>
      {!hideBanner && (
        <div className={`p-3 ${theme.headerBg} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className={`flex items-center gap-3 text-[13px] font-extrabold ${theme.headerText} uppercase tracking-wider`}>
            <div className={`${theme.iconBg} ${theme.iconColor} h-5 w-5 flex items-center justify-center rounded-sm text-[10px] font-bold`}>
              1
            </div>
            EXTRUDER PRODUCTION (KG)
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead rowSpan={2} className={`align-middle text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10`}>Size</TableHead>
              <TableHead rowSpan={2} className={`align-middle w-32 min-w-32 text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10`}>Color</TableHead>

              <TableHead colSpan={4} className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-b border-r border-black/10`}>HDPE Material</TableHead>
              <TableHead colSpan={3} className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-b border-r border-black/10`}>Chemicals</TableHead>
              <TableHead colSpan={2} className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-b border-black/10`}>Waste (kg)</TableHead>
              <TableHead rowSpan={2} className={`align-middle text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10`}>Yarn Output (kg)</TableHead>
              {!readOnly && <TableHead rowSpan={2} className={`align-middle text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Action</TableHead>}
            </TableRow>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Bag</TableHead>
              <TableHead className={`w-32 min-w-32 text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Brand</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Wt / Bag</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10`}>Total (kg)</TableHead>
              <TableHead className={`text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Chemical</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Chem Wt</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10`}>Col Cons</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>Lumps</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10`}>Looms Waste</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={14} className="h-20 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader size="sm" /> Loading entries...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {!readOnly && newGroups.map((group) => renderGroup(group, true, setNewGroups))}

                {existingGroups.map((group) => {
                  if (editingGroupId === group.key && editGroupDraft) {
                    return renderGroup(editGroupDraft, true, setEditGroupDraft as any); // Using as any to avoid complex dispatch typing for null
                  }
                  return renderGroup(group, false, null);
                })}

                {newGroups.length === 0 && existingGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="h-20 text-center text-gray-500">No entries yet.</TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-1 rounded-full ${theme.buttonBorder} ${theme.buttonText} ${theme.buttonHover}`}
              onClick={startAddGroup}
              disabled={saving}
            >
              <Plus className="h-3 w-3" /> Add new size & color group
            </Button>
          </div>
          {errorMessage && <p className="text-xs font-medium text-red-600">{errorMessage}</p>}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this color group?"
        description={deleteTarget ? `${deleteTarget.size} / ${deleteTarget.color} — All brands in this run will be deleted. This action cannot be undone.` : undefined}
        isPending={deleting}
        onConfirm={handleDeleteGroup}
      />
    </div>
  );
});
