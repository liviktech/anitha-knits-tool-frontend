import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { Trash2, Edit2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import {
  useExtruderProductions,
  useLookups,
  extruderKeys,
  type Lookups,
} from '@/features/extruder/extruder-queries';
import { themes, type SectionProps, type SectionRef } from '@/features/production/day-entry-sections';
import { sumWastageByCode } from '@/lib/api-types';

export interface ExtruderBrandDraft {
  key: string;
  id?: string; // If editing existing
  brand: string;
  bags: string;
  weightPerBag: string;
  looseWeight: string;
  raw: string;
}

export interface ExtruderGroupDraft {
  key: string; // "sizeId-colorId" for existing, or random UUID for new
  size: string;
  color: string;
  output: string;
  chemical: string;
  chemicalKg: string;
  lumpsKg: string;
  yarnWasteKg: string;
  brands: ExtruderBrandDraft[];
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

export const ExtruderSection = forwardRef<SectionRef, SectionProps>(({ productionDate, autoAdd, readOnly, hideExisting, hideBanner, onEditExtruderGroup }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useExtruderProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );

  const [newGroups, setNewGroups] = useState<ExtruderGroupDraft[]>([]);




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
          chemical: '',
          chemicalKg: '0',
          lumpsKg: '0',
          yarnWasteKg: '0',
          brands: []
        });
      }

      const group = map.get(key)!;
      // Combine yarn output (it should only be >0 on one of the items realistically)
      const currentOutput = parseFloat(group.output) || 0;
      group.output = (currentOutput + item.extruder.yarnOutputKg).toString();

      if (!group.chemical && item.extruder?.chemical?.name) {
        group.chemical = item.extruder.chemical.name;
      }
      group.chemicalKg = ((parseFloat(group.chemicalKg) || 0) + (item.extruder?.chemicalKg || 0)).toString();
      group.lumpsKg = ((parseFloat(group.lumpsKg) || 0) + sumWastageByCode(item.wastages, 'LUMPS')).toString();
      group.yarnWasteKg = ((parseFloat(group.yarnWasteKg) || 0) + sumWastageByCode(item.wastages, 'YARN_WASTE')).toString();

      group.brands.push({
        key: item.id,
        id: item.id,
        brand: item.extruder?.brand?.name ?? '',
        bags: '', // Not tracked by API yet
        weightPerBag: '', // Not tracked by API yet
        looseWeight: '',
        raw: item.extruder?.rawMaterialKg?.toString() ?? '0',
      });
    });

    return Array.from(map.values());
  }, [data?.data, productionDate, hideExisting]);

  const [deleteTarget, setDeleteTarget] = useState<{ groupId: string, size: string, color: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const removeGroup = (groupKey: string) => {
    setNewGroups((groups) => groups.filter((g) => g.key !== groupKey));
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
    addExtruderGroup: (group: ExtruderGroupDraft) => {
      setNewGroups(prev => {
        const existingIndex = prev.findIndex(g => g.size === group.size && g.color === group.color);
        if (existingIndex >= 0) {
          const newArray = [...prev];
          const existing = newArray[existingIndex];

          const updated = { ...existing };
          updated.brands = [...existing.brands, ...group.brands];

          if (!updated.chemical && group.chemical) {
            updated.chemical = group.chemical;
          }
          updated.chemicalKg = ((parseFloat(updated.chemicalKg) || 0) + (parseFloat(group.chemicalKg) || 0)).toString();
          updated.lumpsKg = ((parseFloat(updated.lumpsKg) || 0) + (parseFloat(group.lumpsKg) || 0)).toString();
          updated.yarnWasteKg = ((parseFloat(updated.yarnWasteKg) || 0) + (parseFloat(group.yarnWasteKg) || 0)).toString();
          updated.output = ((parseFloat(updated.output) || 0) + (parseFloat(group.output) || 0)).toString();

          newArray[existingIndex] = updated;
          return newArray;
        }
        return [...prev, group];
      });
    },
    updateExtruderGroup: (group: ExtruderGroupDraft) => {
      setNewGroups(prev => {
        const existingIndex = prev.findIndex(g => g.key === group.key);
        if (existingIndex >= 0) {
          const newArray = [...prev];
          newArray[existingIndex] = group;
          return newArray;
        }
        return prev;
      });
    }
  }));

  const theme = themes.extruder;
  const roundedClass = hideBanner ? 'rounded-b-xl rounded-tr-xl rounded-tl-none' : 'rounded-xl';

  const renderGroup = (group: ExtruderGroupDraft, isNew: boolean) => {
    return (
      <React.Fragment key={group.key}>
        {group.brands.map((brandRow, idx) => (
          <TableRow key={brandRow.key} className="hover:bg-gray-50/50">
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2">
                <span className="font-medium text-gray-700">{group.size || '-'}</span>
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 w-32 py-1.5 px-2">
                <span className="font-medium text-gray-700">{group.color || '-'}</span>
              </TableCell>
            )}

            <TableCell className="py-1.5 px-2">
              <span className="block text-center">{parseFloat(brandRow.bags) > 0 ? brandRow.bags : '-'}</span>
            </TableCell>
            <TableCell className="w-32 py-1.5 px-2">
              <span>{brandRow.brand || '-'}</span>
            </TableCell>
            <TableCell className="py-1.5 px-2">
              <span className="block text-center">{parseFloat(brandRow.weightPerBag) > 0 ? brandRow.weightPerBag : '-'}</span>
            </TableCell>
            <TableCell className="py-1.5 px-2">
              <span className="block text-center">{parseFloat(brandRow.looseWeight) > 0 ? brandRow.looseWeight : '-'}</span>
            </TableCell>
            <TableCell className="border-r border-gray-200 py-1.5 px-2">
              <span className="block text-center font-medium">{parseFloat(brandRow.raw) > 0 ? parseFloat(brandRow.raw).toFixed(2) : '-'}</span>
            </TableCell>

            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2">
                <span>{group.chemical || '-'}</span>
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2">
                <span className="block text-center">{parseFloat(group.chemicalKg) > 0 ? parseFloat(group.chemicalKg).toFixed(2) : '-'}</span>
              </TableCell>
            )}

            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2">
                <span className="block text-center text-yellow-700">{parseFloat(group.lumpsKg) > 0 ? parseFloat(group.lumpsKg).toFixed(2) : '-'}</span>
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2">
                <span className="block text-center text-yellow-700">{parseFloat(group.yarnWasteKg) > 0 ? parseFloat(group.yarnWasteKg).toFixed(2) : '-'}</span>
              </TableCell>
            )}

            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2">
                <span className="font-semibold text-green-700 block text-center">{parseFloat(group.output) > 0 ? parseFloat(group.output).toFixed(2) : '-'}</span>
              </TableCell>
            )}

            {idx === 0 && !readOnly && (
              <TableCell rowSpan={group.brands.length} className="text-center align-middle border-l border-gray-200">
                <div className="flex flex-row items-center justify-center gap-1.5 mt-1">
                  <Button variant="ghost" size="icon-sm" className="h-6 w-6 p-0 rounded bg-blue-50 text-blue-500 hover:bg-blue-100" onClick={() => onEditExtruderGroup?.(group)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {isNew ? (
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6 p-0 rounded bg-red-50 text-red-500 hover:bg-red-100" onClick={() => removeGroup(group.key)} title="Remove Group">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6 p-0 rounded bg-red-50 text-red-500 hover:bg-red-100" onClick={() => setDeleteTarget({ groupId: group.key, size: group.size, color: group.color })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
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
              <TableHead rowSpan={2} className={`align-middle text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10 py-1 px-2`}>Size</TableHead>
              <TableHead rowSpan={2} className={`align-middle w-32 min-w-32 text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10 py-1 px-2`}>Color</TableHead>

              <TableHead colSpan={5} className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-b border-r border-black/10 py-1 px-2`}>HDPE Material</TableHead>
              <TableHead colSpan={2} className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-b border-r border-black/10 py-1 px-2`}>Chemicals</TableHead>
              <TableHead colSpan={2} className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-b border-black/10 py-1 px-2`}>Waste (kg)</TableHead>
              <TableHead rowSpan={2} className={`align-middle text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10 py-1 px-2`}>Yarn Production (kg)</TableHead>
              {!readOnly && <TableHead rowSpan={2} className={`align-middle text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} py-1 px-2`}>Action</TableHead>}
            </TableRow>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} py-1 px-2`}>Bag</TableHead>
              <TableHead className={`w-32 min-w-32 text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} py-1 px-2`}>Brand</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} py-1 px-2`}>Bag Weight</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} py-1 px-2`}>Loose Wt</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10 py-1 px-2`}>Total (kg)</TableHead>
              <TableHead className={`text-xs font-semibold uppercase tracking-wide ${theme.headerText} py-1 px-2`}>Chemical</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10 py-1 px-2`}>Chem Wt</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} py-1 px-2`}>Lumps</TableHead>
              <TableHead className={`text-center text-xs font-semibold uppercase tracking-wide ${theme.headerText} border-r border-black/10 py-1 px-2`}>Looms Waste</TableHead>
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
                {!readOnly && newGroups.map((group) => renderGroup(group, true))}

                {existingGroups.map((group) => {
                  return renderGroup(group, false);
                })}

                {newGroups.length === 0 && existingGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="h-20 !text-center text-gray-500">No entries yet.</TableCell>

                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

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
