import React, { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/shared/loader';
import { TableNoteFooter } from '@/components/shared/table-note-footer';
import { Trash2, Edit2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { apiFetch, extractApiErrorMessage } from '@/lib/api-client';
import {
  useExtruderProductions,
  useLookups,
  findIdByName,
  extruderKeys,
  type Lookups,
  type ExtruderCreatePayload,
  type ExtruderUpdatePayload,
} from '@/features/extruder/extruder-queries';
import { themes, type SectionProps, type SectionRef } from '@/features/production/day-entry-sections';
import { dashboardProductionKey } from '@/features/production/day-wise-queries';
import { sumWastageByCode } from '@/lib/api-types';

export interface ExtruderBrandDraft {
  key: string;
  id?: string; // If editing existing
  brand: string;
  bags: string;
  basisWeightKg: string;
  looseWeight: string;
  raw: string;
}

/** Extracts a brand row's bag breakdown for the create/update payload — omits any field that isn't filled in. */
function brandBagFields(brand: ExtruderBrandDraft): Pick<ExtruderCreatePayload, 'bagCount' | 'bagWeightKg' | 'looseWeightKg' | 'totalWeightKg'> {
  const fields: Pick<ExtruderCreatePayload, 'bagCount' | 'bagWeightKg' | 'looseWeightKg' | 'totalWeightKg'> = {};
  const bagCount = parseInt(brand.bags, 10);
  const bagWeightKg = parseFloat(brand.basisWeightKg);
  const looseWeightKg = parseFloat(brand.looseWeight);
  const totalWeightKg = parseFloat(brand.raw);
  if (!isNaN(bagCount) && bagCount > 0) fields.bagCount = bagCount;
  if (!isNaN(bagWeightKg) && bagWeightKg > 0) fields.bagWeightKg = bagWeightKg;
  if (!isNaN(looseWeightKg) && looseWeightKg > 0) fields.looseWeightKg = looseWeightKg;
  if (!isNaN(totalWeightKg) && totalWeightKg > 0) fields.totalWeightKg = totalWeightKg;
  return fields;
}

export interface ExtruderGroupDraft {
  key: string; // "sizeId-colorId" for existing, or random UUID for new
  size: string;
  color: string;
  output: string;
  chemical: string;
  chemicalKg: string;
  colorConsumedKg: string;
  lumpsKg: string;
  yarnWasteKg: string;
  brands: ExtruderBrandDraft[];
}

export const ExtruderSection = forwardRef<SectionRef, SectionProps>(({ productionDate, readOnly, hideExisting, hideBanner, onEditExtruderGroup }, ref) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useExtruderProductions(
    productionDate ? `?date_from=${productionDate}&date_to=${productionDate}` : '',
    !hideExisting,
  );
  const { data: lookupsData } = useLookups();
  const lookups: Lookups = lookupsData ?? { brands: [], colors: [], chemicals: [], sizes: [] };

  const [newGroups, setNewGroups] = useState<ExtruderGroupDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pendingKeys = useMemo(() => new Set(newGroups.map((g) => g.key)), [newGroups]);
  // --- EXISTING ENTRIES STATE ---
  const existingGroups = useMemo(() => {
    if (hideExisting || !data?.data) return [];
    const map = new Map<string, ExtruderGroupDraft>();

    data.data.forEach((item) => {
      if (productionDate && !item.productionDate.startsWith(productionDate)) return;

      const sizeName = item.size?.name ?? '';
      const colorName = item.color?.name ?? '';

      const key = `${sizeName}-${colorName}`;
      if (pendingKeys.has(key)) return;
      if (!map.has(key)) {
        map.set(key, {
          key,
          size: sizeName,
          color: colorName,
          output: '0',
          chemical: '',
          chemicalKg: '0',
          colorConsumedKg: '0',
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
      group.colorConsumedKg = ((parseFloat(group.colorConsumedKg) || 0) + (item.extruder?.colorConsumedKg || 0)).toString();
      group.lumpsKg = ((parseFloat(group.lumpsKg) || 0) + sumWastageByCode(item.wastages, 'LUMPS')).toString();
      group.yarnWasteKg = ((parseFloat(group.yarnWasteKg) || 0) + sumWastageByCode(item.wastages, 'YARN_WASTE')).toString();

      group.brands.push({
        key: item.id,
        id: item.id,
        brand: item.extruder?.brand?.name ?? '',
        bags: item.extruder?.bagCount != null ? item.extruder.bagCount.toString() : '',
        basisWeightKg: item.extruder?.bagWeightKg != null ? item.extruder.bagWeightKg.toString() : '',
        looseWeight: item.extruder?.looseWeightKg != null ? item.extruder.looseWeightKg.toString() : '',
        raw: item.extruder?.rawMaterialKg?.toString() ?? '0',
      });
    });

    return Array.from(map.values());
  }, [data?.data, productionDate, hideExisting, pendingKeys]);

  const [deleteTarget, setDeleteTarget] = useState<{ groupId: string, size: string, color: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const removeGroup = (groupKey: string) => {
    setNewGroups((groups) => groups.filter((g) => g.key !== groupKey));
  };

  const handleDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const group = [...newGroups, ...existingGroups].find((g) => g.key === deleteTarget.groupId);
      const recordIds = (group?.brands ?? []).map((b) => b.id).filter((id): id is string => !!id);
      const results = await Promise.all(recordIds.map((id) => apiFetch(`/production/extruder/${id}`, { method: 'DELETE' })));
      if (results.some((r) => !r.ok)) throw new Error('Failed to delete one or more extruder entries');
      setNewGroups((groups) => groups.filter((g) => g.key !== deleteTarget.groupId));
      await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting extruder group:', error);
    } finally {
      setDeleting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (newGroups.length === 0) return true;
      setSaving(true);
      setSaveError(null);
      const failed: ExtruderGroupDraft[] = [];
      let errorMessage: string | null = null;

      for (const group of newGroups) {
        const colorId = findIdByName(lookups.colors, group.color);
        const sizeId = findIdByName(lookups.sizes, group.size);
        const chemicalId = findIdByName(lookups.chemicals, group.chemical);
        if (!colorId || !sizeId) {
          failed.push(group);
          errorMessage = 'Could not resolve color/size for one or more entries.';
          continue;
        }

        let groupFailed = false;
        for (const [index, brand] of group.brands.entries()) {
          const isFirst = index === 0;
          const brandId = findIdByName(lookups.brands, brand.brand);
          try {
            if (brand.id) {
              const payload: ExtruderUpdatePayload = {
                rawMaterialKg: parseFloat(brand.raw) || 0,
                ...brandBagFields(brand),
              };
              if (isFirst) {
                payload.chemicalId = chemicalId;
                payload.chemicalKg = parseFloat(group.chemicalKg) || 0;
                payload.lumpsKg = parseFloat(group.lumpsKg) || 0;
                payload.yarnWasteKg = parseFloat(group.yarnWasteKg) || 0;
                payload.yarnOutputKg = parseFloat(group.output) || 0;
              }
              const response = await apiFetch(`/production/extruder/${brand.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!response.ok) {
                groupFailed = true;
                errorMessage = await extractApiErrorMessage(response, 'Failed to save one or more extruder entries.');
              }
            } else {
              if (!brandId || !chemicalId) {
                groupFailed = true;
                errorMessage = 'Could not resolve brand/chemical for one or more entries.';
                continue;
              }
              const payload: ExtruderCreatePayload = {
                productionDate: productionDate ?? '',
                colorId,
                sizeId,
                brandId,
                chemicalId,
                rawMaterialKg: parseFloat(brand.raw) || 0,
                chemicalKg: isFirst ? parseFloat(group.chemicalKg) || 0 : 0,
                yarnOutputKg: isFirst ? parseFloat(group.output) || 0 : 0,
                lumpsKg: isFirst ? parseFloat(group.lumpsKg) || 0 : 0,
                yarnWasteKg: isFirst ? parseFloat(group.yarnWasteKg) || 0 : 0,
                ...brandBagFields(brand),
              };
              const response = await apiFetch('/production/extruder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!response.ok) {
                groupFailed = true;
                errorMessage = await extractApiErrorMessage(response, 'Failed to save one or more extruder entries.');
              }
            }
          } catch {
            groupFailed = true;
            errorMessage = 'Failed to save one or more extruder entries.';
          }
        }
        if (groupFailed) failed.push(group);
      }

      setNewGroups(failed);
      await queryClient.invalidateQueries({ queryKey: extruderKeys.all });
      await queryClient.invalidateQueries({ queryKey: dashboardProductionKey });
      setSaving(false);
      if (failed.length > 0) {
        setSaveError(errorMessage);
        return false;
      }
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
        return [...prev, group];
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
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2 w-20 min-w-20 !text-center">
                <span className="font-medium text-gray-700 text-center block">{group.size || '-'}</span>
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2 w-24 min-w-24">
                <span className="font-medium text-gray-700 text-center block">{group.color || '-'}</span>
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2 w-20 min-w-20">
                <span className="font-medium text-gray-700 text-center block">{parseFloat(group.colorConsumedKg) > 0 ? parseFloat(group.colorConsumedKg).toFixed(2) : '-'}</span>
              </TableCell>
            )}

            <TableCell className="py-1.5 px-2 border border-black/10">
              <span className="block text-center">{parseFloat(brandRow.bags) > 0 ? brandRow.bags : '-'}</span>
            </TableCell>
            <TableCell className="w-36 min-w-36 py-1.5 px-2 border border-black/10">
              <span className="text-center block">{brandRow.brand || '-'}</span>
            </TableCell>
            <TableCell className="py-1.5 px-2 border border-black/10">
              <span className="block text-center">{parseFloat(brandRow.basisWeightKg) > 0 ? brandRow.basisWeightKg : '-'}</span>
            </TableCell>
            <TableCell className="py-1.5 px-2 border border-black/10">
              <span className="block text-center">{parseFloat(brandRow.looseWeight) > 0 ? brandRow.looseWeight : '-'}</span>
            </TableCell>
            <TableCell className="border-r border-gray-200 py-1.5 px-2 border border-black/10">
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
                <span className="block text-center">{parseFloat(group.lumpsKg) > 0 ? parseFloat(group.lumpsKg).toFixed(2) : '-'}</span>
              </TableCell>
            )}
            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-2">
                <span className="block text-center">{parseFloat(group.yarnWasteKg) > 0 ? parseFloat(group.yarnWasteKg).toFixed(2) : '-'}</span>
              </TableCell>
            )}

            {idx === 0 && (
              <TableCell rowSpan={group.brands.length} className="align-middle border-r border-gray-200 py-1.5 px-0.5 w-24 min-w-24">
                <span className="block text-center text-xs sm:text-sm">{parseFloat(group.output) > 0 ? parseFloat(group.output).toFixed(2) : '-'}</span>
              </TableCell>
            )}

            {idx === 0 && !readOnly && (
              <TableCell rowSpan={group.brands.length} className="!text-center align-middle border-l border-gray-200">
                <div className="flex flex-row items-center justify-center gap-1.5 mt-1">
                  <Button variant="ghost" size="icon-sm" disabled={saving} className="h-6 w-6 p-0 rounded bg-blue-50 text-blue-500 hover:bg-blue-100" onClick={() => onEditExtruderGroup?.(group)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {isNew ? (
                    <Button variant="ghost" size="icon-sm" disabled={saving} className="h-6 w-6 p-0 rounded bg-red-50 text-red-500 hover:bg-red-100" onClick={() => removeGroup(group.key)} title="Remove Group">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon-sm" disabled={saving} className="h-6 w-6 p-0 rounded bg-red-50 text-red-500 hover:bg-red-100" onClick={() => setDeleteTarget({ groupId: group.key, size: group.size, color: group.color })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
        {/* Separator row between groups */}
        <TableRow className="h-2 bg-gray-50/50"><TableCell colSpan={15} className="p-0 border-b-2 border-gray-200" /></TableRow>
      </React.Fragment>
    );
  };

  return (
    <div className={`${roundedClass} border ${theme.border} bg-white shadow-sm overflow-hidden`}>
      {!hideBanner && (
        <div className={`p-3 ${theme.headerBg} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className={`flex items-center gap-3 text-[13px] font-extrabold ${theme.headerText} tracking-wider`}>
            <div className={`${theme.iconBg} ${theme.iconColor} h-5 w-5 flex items-center justify-center rounded-sm text-[10px] font-bold`}>
              1
            </div>
            EXTRUDER PRODUCTION (KG)
          </div>
        </div>
      )}

      {saveError && (
        <p className="px-3 pt-2 text-sm text-red-600">{saveError}</p>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={`${theme.headerBg}`}>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead rowSpan={2} className={`align-middle !text-center text-sm font-semibold  tracking-wide ${theme.headerText} border  border-black/10 py-1 px-2 w-20 min-w-20`}>Size</TableHead>
              <TableHead colSpan={2} className={`align-middle !text-center text-sm font-semibold  tracking-wide ${theme.headerText} border border-black/10 py-1 px-2`}>Color</TableHead>

              <TableHead colSpan={5} className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} border border-black/10 py-1 px-2`}>HDPE Material</TableHead>
              <TableHead colSpan={2} className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} border border-black/10 py-1 px-2`}>Chemicals</TableHead>
              <TableHead colSpan={2} className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} border border-black/10 py-1 px-2`}>Waste</TableHead>
              <TableHead rowSpan={2} className={`align-middle !text-center text-sm font-semibold  tracking-wide ${theme.headerText} border border-black/10 py-1 px-2 w-32 min-w-32`}>Loom Production</TableHead>
              {!readOnly && <TableHead rowSpan={2} className={`align-middle !text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2`}>Action</TableHead>}
            </TableRow>
            <TableRow className="hover:!bg-transparent border-b-0">
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10 w-24 min-w-24`}>Name</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10 w-20 min-w-20`}>Weight</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10`}>Bag</TableHead>
              <TableHead className={`w-36 min-w-36 !text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10`}>Brand</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10`}>Bag Weight</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10`}>Loose Weight</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText}  border border-black/10`}>Total</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10`}>Chemical</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText}  border border-black/10`}>Chemical Weight</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText} py-1 px-2  border border-black/10`}>Lumps</TableHead>
              <TableHead className={`!text-center text-sm font-semibold  tracking-wide ${theme.headerText}  py-1 px-2 border border-black/10`}>Loom Waste</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={15} className="h-20 text-center text-gray-500">
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
                    <TableCell colSpan={15} className="h-20 !text-center text-gray-500">No entries yet.</TableCell>

                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <TableNoteFooter />

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
