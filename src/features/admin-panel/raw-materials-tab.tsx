import { useState } from 'react';
import { Boxes, Droplets, Edit2, Info, Palette, Plus, Ruler, Trash2, type LucideIcon } from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { AddMaterialItemDialog } from './add-material-item-dialog';
import {
  useCreateLookupItem,
  useDeleteLookupItem,
  useLookups,
  useUpdateLookupItem,
  type LookupItem,
  type LookupResource,
} from './raw-materials-queries';

interface CategoryMeta {
  key: LookupResource;
  title: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const CATEGORY_META: CategoryMeta[] = [
  {
    key: 'brands',
    title: 'Brands',
    singular: 'Brand',
    description: 'Registered raw material suppliers and brands.',
    icon: Boxes,
    accent: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    key: 'chemicals',
    title: 'Chemicals',
    singular: 'Chemical',
    description: 'Additive chemicals used in the color masterbatch mix.',
    icon: Droplets,
    accent: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  },
  {
    key: 'colors',
    title: 'Colors',
    singular: 'Color',
    description: 'Available color options for extruder and fabric production.',
    icon: Palette,
    accent: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  {
    key: 'sizes',
    title: 'Sizes',
    singular: 'Size',
    description: 'Standard fitting sizes used across production lines.',
    icon: Ruler,
    accent: 'border-green-200 bg-green-50 text-green-700',
  },
];

function formatLastUpdated(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function RawMaterialsTab() {
  const [selectedKey, setSelectedKey] = useState<LookupResource>('brands');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LookupItem | null>(null);

  const lookupsQuery = useLookups();
  const createMutation = useCreateLookupItem(selectedKey);
  const updateMutation = useUpdateLookupItem(selectedKey);
  const deleteMutation = useDeleteLookupItem(selectedKey);

  const lookups = lookupsQuery.data;
  const selectedMeta = CATEGORY_META.find((c) => c.key === selectedKey) ?? CATEGORY_META[0];
  const selectedItems = lookups?.[selectedKey] ?? [];
  // const totalItems = lookups ? lookups.brands.length + lookups.colors.length + lookups.chemicals.length + lookups.sizes.length : 0;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: LookupItem) => {
    setEditingItem(item);
    setIsAddOpen(true);
  };

  const handleDialogOpenChange = (next: boolean) => {
    setIsAddOpen(next);
    if (!next) {
      setEditingItem(null);
      createMutation.resetError();
      updateMutation.resetError();
    }
  };

  const handleDialogSubmit = (name: string) =>
    editingItem
      ? updateMutation.mutate({ id: editingItem.id, name })
      : createMutation.mutate(name);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteMutation.mutate(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  if (lookupsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
        <Loader size="xl" className="text-[#004D40]" />
      </div>
    );
  }

  if (lookupsQuery.isError || !lookups) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm font-semibold text-gray-900">Unable to load raw materials.</p>
        <p className="text-xs text-gray-500">Please try again.</p>
        <button
          type="button"
          onClick={() => lookupsQuery.refetch()}
          className="rounded-lg bg-[#004D40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#003D33]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ========================================================= */}
      {/* CATEGORY CARDS                                           */}
      {/* ========================================================= */}

      {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORY_META.map((category) => {
          const Icon = category.icon;
          const isSelected = category.key === selectedKey;
          const count = lookups[category.key].length;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelectedKey(category.key)}
              className={`flex items-stretch gap-3 rounded-lg border p-2.5 text-left transition-all ${isSelected
                ? 'border-[#004D40] bg-[#004D40]/5 ring-1 ring-[#004D40]'
                : 'border-gray-200 bg-white hover:border-[#004D40]/40 hover:shadow-sm'
                }`}
            >
              <div className={`flex w-16 shrink-0 items-center justify-center rounded-md border ${category.accent}`}>
                <Icon className="h-6 w-6" />
              </div>

              <div className="flex flex-col justify-end gap-1">
                <h3 className={`text-[14px] font-semibold ${isSelected ? 'text-[#004D40]' : 'text-gray-900'}`}>
                  {category.title}
                </h3>
                <span className={`text-[16px] font-bold ${isSelected ? 'text-[#004D40]' : 'text-gray-800'}`}>
                  {count} Items
                </span>
              </div>
            </button>
          );
        })}
      </div> */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORY_META.map((category) => {
          const Icon = category.icon;
          const isSelected = category.key === selectedKey;
          const count = lookups[category.key].length;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelectedKey(category.key)}
              className={`flex h-[100px] w-full items-center justify-start rounded-lg border p-[5px] text-left transition-all ${isSelected
                ? 'border-[#004D40] bg-[#004D40]/5 ring-1 ring-[#004D40]'
                : 'border-gray-200 bg-white hover:border-[#004D40]/40 hover:shadow-sm'
                }`}
            >
              {/* Icon - fills the card height */}
              <div
                className={`flex h-full w-[100px] shrink-0 items-center justify-center rounded-md border ${category.accent}`}
              >
                <Icon className="h-10 w-10" />
              </div>

              {/* Category content - pushed toward right */}
              <div className="ml-auto flex flex-col items-end justify-center pr-3">
                <h3
                  className={`text-[15px] font-semibold ${isSelected ? 'text-[#004D40]' : 'text-gray-900'
                    }`}
                >
                  {category.title}
                </h3>

                <span
                  className={`mt-1 text-[20px] font-bold ${isSelected ? 'text-[#004D40]' : 'text-gray-700'
                    }`}
                >
                  {count} Items
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* DETAIL VIEW                                              */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">

        <section className="overflow-hidden rounded-xl border border-gray-400 bg-white shadow-sm lg:col-span-2">

          <div className="flex flex-col gap-4 border-b border-gray-100 bg-[#F8FAF9] px-5 py-3.5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md border ${selectedMeta.accent}`}>
                <selectedMeta.icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">{selectedMeta.title}</h2>
                <p className="mt-0.5 text-[11px] font-medium text-gray-400">{selectedMeta.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-[#004D40] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#003D33]"
            >
              <Plus className="h-4 w-4" />
              Add {selectedMeta.singular}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-emerald-300 bg-emerald-50/30">
                  <th className="px-5 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">Name</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold tracking-wide text-gray-800">Last Updated</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold tracking-wide text-gray-800">Actions</th>
                </tr>
              </thead>

              <tbody>
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-[13px] text-gray-400">
                      None configured yet.
                    </td>
                  </tr>
                ) : (
                  selectedItems.map((item) => (
                    <tr key={item.id} className="group border-b border-emerald-300 last:border-b-0 transition-colors hover:bg-emerald-50/30">
                      <td className="px-5 py-1.5 text-[13px] font-medium text-gray-900">{item.name}</td>
                      <td className="px-5 py-1.5 text-right text-[12px] text-gray-500">{formatLastUpdated(item.updatedAt)}</td>
                      <td className="px-5 py-1.5">
                        <div className="flex justify-end gap-1">
                          <button type="button" title="Edit" onClick={() => handleOpenEdit(item)} className="rounded-md p-1.5 text-[#004D40] transition-colors hover:bg-[#004D40]/10">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" title="Delete" onClick={() => setDeleteTarget(item)} className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-400 bg-emerald-50/20 px-5 py-3 text-xs text-gray-700">
            <span>Showing {selectedItems.length} of {selectedItems.length} items</span>
          </div>

        </section>

        <aside className="flex h-fit flex-col gap-4 self-start">

          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-amber-600">
                <Info className="h-4 w-4" />
              </div>
              <h3 className="text-[13px] font-bold text-amber-900">Operational Impact</h3>
            </div>

            <p className="text-[12px] leading-relaxed text-amber-800">
              Raw material categories are shared master data used across production entry, inventory, and cost calculations elsewhere in the app. Add or rename items carefully.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-blue-600">
                <Info className="h-4 w-4" />
              </div>
              <h3 className="text-[13px] font-bold text-blue-900">Configurable Categories</h3>
            </div>

            <p className="text-[12px] leading-relaxed text-blue-800">
              Colors, Sizes, Chemicals, and Brands are configurable here today. More category types may be added later.
            </p>
          </div>

        </aside>

      </div>

      <AddMaterialItemDialog
        open={isAddOpen}
        onOpenChange={handleDialogOpenChange}
        categoryLabel={selectedMeta.singular}
        onSubmit={handleDialogSubmit}
        initialName={editingItem?.name}
        isPending={editingItem ? updateMutation.isPending : createMutation.isPending}
        serverError={editingItem ? updateMutation.error : createMutation.error}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(next) => { if (!next) { setDeleteTarget(null); deleteMutation.resetError(); } }}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
        title={`Delete this ${selectedMeta.singular.toLowerCase()}?`}
        description={
          deleteMutation.error
          ?? (deleteTarget ? `Are you sure you want to delete this record?` : undefined)
        }
      />

    </div>
  );
}
