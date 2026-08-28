import { useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { AddConfigurationDialog } from './add-configuration-dialog';
import {
  useCreateProductionConfig,
  useDeleteProductionConfig,
  useLatestProductionConfig,
  useProductionConfigHistory,
  useUpdateProductionConfig,
  type ColorConsumptionStandard,
  type ColorConsumptionStandardPayload,
} from './production-config-queries';

function formatConfigDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** HTML date inputs need "YYYY-MM-DD"; the API returns a full ISO timestamp. */
function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function toEditPayload(record: ColorConsumptionStandard): ColorConsumptionStandardPayload {
  return {
    date: toDateInputValue(record.date),
    hdpematerialbag: record.hdpematerialbag,
    basisWeightKg: record.basisWeightKg,
    whiteKgBasis: record.whiteKgBasis,
    blueKgBasis: record.blueKgBasis,
    greenKgBasis: record.greenKgBasis,
    chemicalWeight: record.chemicalWeight ?? undefined,
  };
}

export function ProductionConfigTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ColorConsumptionStandard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ColorConsumptionStandard | null>(null);

  const latestQuery = useLatestProductionConfig();
  const historyQuery = useProductionConfigHistory('?limit=100');

  const createMutation = useCreateProductionConfig();
  const updateMutation = useUpdateProductionConfig();
  const deleteMutation = useDeleteProductionConfig();

  const latest = latestQuery.data;
  const history = historyQuery.data?.data ?? [];
  const isLoading = latestQuery.isLoading || historyQuery.isLoading;
  const isError = latestQuery.isError || historyQuery.isError;

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (record: ColorConsumptionStandard) => {
    setEditingRecord(record);
    setIsAddOpen(true);
  };

  const handleDialogOpenChange = (next: boolean) => {
    setIsAddOpen(next);
    if (!next) {
      setEditingRecord(null);
      createMutation.resetError();
      updateMutation.resetError();
    }
  };

  const handleDialogSubmit = (payload: ColorConsumptionStandardPayload) =>
    editingRecord
      ? updateMutation.mutate({ id: editingRecord.id, payload })
      : createMutation.mutate(payload);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteMutation.mutate(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
        <Loader size="xl" className="text-[#004D40]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm font-semibold text-gray-900">Unable to load production configuration.</p>
        <p className="text-xs text-gray-500">Please try again.</p>
        <button
          type="button"
          onClick={() => { latestQuery.refetch(); historyQuery.refetch(); }}
          className="rounded-lg bg-[#004D40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#003D33]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ========================================================= */}
      {/* ACTIVE CONFIGURATION                                     */}
      {/* ========================================================= */}

      {latest && (
        <section
          className="
            relative overflow-hidden
            rounded-xl
            border border-gray-200
            border-l-4 border-l-[#004D40]
            bg-white
            shadow-sm mb-8
          "
        >
          {/* subtle decoration */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-gradient-to-l from-[#004D40]/[0.035] to-transparent" />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-gray-100 px-5 py-3">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#004D40]/10">
                <CheckCircle2 className="h-[18px] w-[18px] text-[#004D40]" />
              </div>

              <div>
                <h2 className="text-[18px] font-bold text-gray-900">
                  Active Configuration
                </h2>

                <p className="mt-0.5 text-[14px] font-medium text-gray-400">
                  Currently applied production ratio
                </p>
              </div>

            </div>

          </div>

          {/* Values */}
          <div className="relative px-5 py-4">

            <div className="grid grid-cols-2 gap-4 gap-y-4 border-gray-100 pt-4 md:grid-cols-7">

              {/* Effective From */}
              <div className="border-r border-gray-300 pr-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  Effective From
                </p>

                <p className="mt-1 text-[16px] font-bold text-gray-900">
                  {formatConfigDate(latest.date)}
                </p>
              </div>

              {/* HDPE */}
              <div className="border-r border-gray-300 px-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  HDPE Base
                </p>

                <p className="mt-1 text-[16px] font-bold text-gray-900">
                  {latest.basisWeightKg}
                  <span className="ml-1 text-[12px] font-normal text-gray-400">
                    kg
                  </span>
                </p>
              </div>

              {/* Bags */}
              <div className="border-r border-gray-300 px-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  Bags
                </p>

                <p className="mt-1 text-[16px] font-bold text-gray-900">
                  {latest.hdpematerialbag}
                </p>
              </div>

              {/* Chemical */}
              <div className="border-r border-gray-300 px-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  Chemical
                </p>

                <p className="mt-1 text-[16px] font-bold text-gray-900">
                  {latest.chemicalWeight ?? '—'}
                  <span className="ml-1 text-[12px] font-normal text-gray-400">
                    kg
                  </span>
                </p>
              </div>

              {/* White */}
              <div className="border-r border-gray-300 px-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  White
                </p>

                <p className="mt-1 text-[16px] font-bold text-gray-900">
                  {latest.whiteKgBasis}
                  <span className="ml-1 text-[12px] font-normal text-gray-400">
                    kg
                  </span>
                </p>
              </div>

              {/* Blue */}
              <div className="border-r border-gray-300 px-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  Blue
                </p>

                <p className="mt-1 text-[16px] font-bold text-gray-900">
                  {latest.blueKgBasis}
                  <span className="ml-1 text-[12px] font-normal text-gray-400">
                    kg
                  </span>
                </p>
              </div>

              {/* Green */}
              <div className="px-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-gray-400">
                  Green
                </p>

                <p className="mt-1 text-[16px] font-bold text-gray-900">
                  {latest.greenKgBasis}
                  <span className="ml-1 text-[12px] font-normal text-gray-400">
                    kg
                  </span>
                </p>
              </div>

            </div>

          </div>
        </section>
      )}


      {/* ========================================================= */}
      {/* CONFIGURATION HISTORY                                    */}
      {/* ========================================================= */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900">
            Configuration History
          </h2>

          <p className="mt-1 text-[14px] font-medium text-gray-400">
            Previous production configurations
          </p>

        </div>
        {/* ========================================================= */}
        {/* ADD CONFIGURATION                                       */}
        {/* ========================================================= */}

        <div className="flex justify-end">

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-[#004D40] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#003D33]"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>

        </div>
      </div>

      <section className="-mt-2 overflow-hidden rounded-xl border border-gray-400 bg-white shadow-sm">

        {/* Table */}
        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px] border-collapse">

            <thead>
              <tr className="border-b border-emerald-400 bg-emerald-50/30">

                <th className="px-5 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">
                  Effective Date
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">
                  Bags
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">
                  HDPE
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">
                  White
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">
                  Blue
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">
                  Green
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold tracking-wide text-gray-800">
                  Chemical
                </th>

                <th className="px-5 py-3 text-right text-sm font-semibold tracking-wide text-gray-800">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody>

              {history.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-[13px] text-gray-400">
                    No configuration records yet.
                  </td>
                </tr>
              )}

              {history.map((item) => {
                const isActive = item.id === latest?.id;
                return (
                  <tr
                    key={item.id}
                    className="group border-b border-emerald-100 last:border-b-0 transition-colors hover:bg-emerald-50/30"
                  >

                    {/* Date + LIVE */}
                    <td className="px-5 py-1.5">

                      <div className="flex items-center gap-2">

                        <span
                          className={
                            isActive
                              ? 'text-[13px] font-semibold text-gray-900'
                              : 'text-[13px] font-medium text-gray-700'
                          }
                        >
                          {formatConfigDate(item.date)}
                        </span>

                        {isActive && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-2 py-1">

                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                            </span>

                            <span className="text-[9px] font-bold uppercase tracking-[0.05em] text-green-700">
                              Live
                            </span>

                          </span>
                        )}
                      </div>
                    </td>

                    {/* Bags */}
                    <td className="px-4 py-1.5 text-[13px] text-gray-700">
                      {item.hdpematerialbag}
                    </td>

                    {/* HDPE */}
                    <td className="px-4 py-1.5 text-[13px] text-gray-700">
                      {item.basisWeightKg} kg
                    </td>

                    {/* White */}
                    <td className="px-4 py-1.5">
                      <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                        {item.whiteKgBasis} kg
                      </span>
                    </td>

                    {/* Blue */}
                    <td className="px-4 py-1.5">
                      <span className="inline-flex rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                        {item.blueKgBasis} kg
                      </span>
                    </td>

                    {/* Green */}
                    <td className="px-4 py-1.5">
                      <span className="inline-flex rounded-md border border-green-100 bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
                        {item.greenKgBasis} kg
                      </span>
                    </td>

                    {/* Chemical */}
                    <td className="px-4 py-1.5 text-[13px] text-gray-700">
                      {item.chemicalWeight !== null ? `${item.chemicalWeight} kg` : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-1.5">

                      <div className="flex justify-end gap-1">

                        <button
                          type="button"
                          title="Edit"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-md p-1.5 text-[#004D40] transition-colors hover:bg-[#004D40]/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </section>




      <AddConfigurationDialog
        open={isAddOpen}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleDialogSubmit}
        initial={editingRecord ? toEditPayload(editingRecord) : null}
        isPending={editingRecord ? updateMutation.isPending : createMutation.isPending}
        serverError={editingRecord ? updateMutation.error : createMutation.error}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(next) => { if (!next) { setDeleteTarget(null); deleteMutation.resetError(); } }}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
        title="Delete this configuration?"
        description={
          deleteMutation.error
          ?? (deleteTarget ? `Configuration from ${formatConfigDate(deleteTarget.date)} will be removed — this action cannot be undone.` : undefined)
        }
      />

    </div>
  );
}
