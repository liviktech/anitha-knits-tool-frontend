import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/inter';
import { parseISO, format } from 'date-fns';
import { Trash2, Calendar, Plus, Download, Edit2, Edit, Layers, ChevronRight, CheckCircle2 } from 'lucide-react';
import { LoadSentFormDialog } from '../inventory/load-sent-form-dialog';
import { type LoadSentRecord } from '../inventory/load-sent-queries';
import { Loader } from '@/components/shared/loader';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { ApproveConfirmDialog } from '@/components/shared/approve-confirm-dialog';
import { useAuth } from '@/features/auth/auth-context';
import { canCreateProductionRecord, canDeleteProductionRecord, canEditProductionRecord } from '@/lib/production-permissions';
import { apiFetch, fetchJson } from '@/lib/api-client';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';
import { useExtruderProductions, extruderKeys } from '@/features/extruder/extruder-queries';
import { useLoomsProductions, loomsKeys } from '@/features/looms/loom-queries';
import { useFabricCheckingRecords, fabricCheckingKeys } from '@/features/fabric/fabric-queries';
import { useLoadSentRecords, loadSentKeys } from '@/features/inventory/load-sent-queries';
import { useDayWiseProduction, dashboardProductionKey, type DayWiseRow } from './day-wise-queries';
import { mapExtruderItem, mapLoomItem, mapFabricItem } from './day-entry-sections';
import { DayWiseReportModal } from './day-wise-report-modal';
import { useProductionHeader } from './production-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useNavigate, useLocation } from 'react-router-dom';

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

const stageTheme = {
  extruder: {
    circle: 'bg-[#0B8457]',
    text: 'text-[#0B8457]',
    pillBg: 'bg-emerald-50',
    pillText: 'text-emerald-700',
    pillBorder: 'border-emerald-100',
  },
  looms: {
    circle: 'bg-[#1D4E89]',
    text: 'text-[#1D4E89]',
    pillBg: 'bg-blue-50',
    pillText: 'text-blue-700',
    pillBorder: 'border-blue-100',
  },
  fabric: {
    circle: 'bg-[#6D3FA0]',
    text: 'text-[#6D3FA0]',
    pillBg: 'bg-purple-50',
    pillText: 'text-purple-700',
    pillBorder: 'border-purple-100',
  },
  fabricDelivered: {
    circle: 'bg-[#61401E]',
    text: 'text-[#61401E]',
    pillBg: 'bg-[#f2caa0]',
    pillText: 'text-[#61401E]',
    pillBorder: 'border-gray-400',
  },
} as const;

interface FabricDeliveredDetailRow {
  id: string;
  size: string;
  color: string;
  delivered: number;
  original: LoadSentRecord;
}

function getFabricDeliveredRows(data: unknown, date: string): FabricDeliveredDetailRow[] {
  const records = (data ?? []) as LoadSentRecord[];
  return records
    .filter((record) => (record.productionDate ?? record.date ?? '').startsWith(date))
    .map((record: any) => ({
      id: record.id,
      size: record.size?.name ?? '',
      color: record.color?.name ?? '',
      delivered: record.loadSent?.fabricWeight ?? record.fabricWeight ?? record.weightKg ?? 0,
      original: record as LoadSentRecord,
    }))
    .filter((record) => record.delivered > 0);
}

interface StageBlockProps {
  number: number;
  icon?: React.ReactNode;
  title: string;
  description: string;
  theme: (typeof stageTheme)[keyof typeof stageTheme];
  producedLabel: string;
  producedValue: string;
  producedUnit: string;
  wasteLabel: string;
  wasteValue: string;
  wasteUnit: string;
  pills?: { label: string; value: string }[];
  expanded: boolean;
  onToggle: () => void;
  tableHeads: string[];
  children: React.ReactNode;
  isLast?: boolean;
}

function StageBlock({
  number,
  title,
  description,
  theme,
  producedLabel,
  producedValue,
  producedUnit,
  wasteLabel,
  wasteValue,
  wasteUnit,
  expanded,
  onToggle,
  tableHeads,
  children,
  isLast,
}: StageBlockProps) {
  return (
    <div className="relative flex gap-4">
      {!isLast && <div className="absolute left-4.75 top-10 -bottom-5 w-px bg-gray-200" />}
      <div className="flex flex-col items-center gap-2 shrink-0 z-10">
        <div className={`w-10 h-10 rounded-full ${theme.circle} text-white font-bold text-[14px] flex items-center justify-center ring-4 ring-[#F3F5F4]`}>
          {number}
        </div>
        {/* <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
          {icon}
        </div> */}
      </div>

      <div className="flex-1 flex flex-col gap-2 pb-5 min-w-0">
        <p className={`font-bold text-[22px] ${theme.text}`}>{title}</p>

        <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <p className={`text-[10px] font-extrabold uppercase tracking-wide ${theme.text} mb-1`}>{producedLabel}</p>
                <p className={`text-[20px] font-extrabold ${theme.text} leading-none`}>
                  {producedValue} <span className="text-[11px] font-medium text-gray-400">{producedUnit}</span>
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-extrabold uppercase tracking-wide ${theme.text} mb-1`}>{wasteLabel}</p>
                <p className="text-[20px] font-extrabold text-red-500 leading-none">
                  {wasteValue} <span className="text-[11px] font-medium text-gray-400">{wasteUnit}</span>
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={`h-7 px-3 rounded-md ${theme.pillBg} ${theme.pillText} text-[11px] font-bold gap-1 hover:opacity-80 shrink-0 self-start md:self-auto`}
            >
              View Details <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>

          {description && (
            <p className="text-[12px] text-gray-500 italic mt-[-8px]">{description}</p>
          )}

          {expanded && (
            <div className="overflow-x-auto -mx-1 border-t border-gray-100 pt-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {tableHeads.map((h, i) => (
                      <TableHead
                        key={h}
                        className={`text-[9.5px] font-extrabold uppercase tracking-wide text-gray-500 whitespace-nowrap ${i === 0 ? 'text-left' : i === tableHeads.length - 1 ? 'text-right' : 'text-center'}`}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>{children}</TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DayDetailView({
  date,
  onClose,
  dayWiseRows,
  fabricDeliveredRows,
  loadingLoadSent,
  onEditFabricDelivered,
}: {
  date: string;
  onClose: () => void;
  dayWiseRows: DayWiseRow[];
  fabricDeliveredRows: FabricDeliveredDetailRow[];
  loadingLoadSent: boolean;
  onEditFabricDelivered: (record: LoadSentRecord) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { setHeaderTitle } = useProductionHeader();
  const row = dayWiseRows.find((r) => r.date === date) || dayWiseRows[0];
  const formattedDate = format(parseISO(date), 'dd MMM, yyyy');

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ extruder: true, looms: true, fabric: true, fabricDelivered: true });
  const toggleStage = (key: string) => setExpandedStages((s) => ({ ...s, [key]: !s[key] }));

  useEffect(() => {
    setHeaderTitle('View daily production details');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  const dateQuery = `?date_from=${date}&date_to=${date}`;
  const { data: extruderData } = useExtruderProductions(dateQuery);
  const { data: loomsData } = useLoomsProductions(dateQuery);
  const { data: fabricData } = useFabricCheckingRecords(dateQuery);

  const dayHasApprovedRecord =
    (extruderData?.data ?? []).some((r) => r.isApproved)
    || (loomsData?.data ?? []).some((r) => r.isApproved)
    || (fabricData?.data ?? []).some((r) => r.isApproved);
  const canEditDay = canEditProductionRecord(user, dayHasApprovedRecord);

  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [approvingDay, setApprovingDay] = useState(false);

  const handleApproveDay = async () => {
    setApprovingDay(true);
    try {
      const targets = [
        ...(extruderData?.data ?? []).filter((r) => !r.isApproved).map((r) => ({ path: '/production/extruder', id: r.id })),
        ...(loomsData?.data ?? []).filter((r) => !r.isApproved).map((r) => ({ path: '/production/looms', id: r.id })),
        ...(fabricData?.data ?? []).filter((r) => !r.isApproved).map((r) => ({ path: '/fabric-checking', id: r.id })),
      ];
      const results = await Promise.all(targets.map(({ path, id }) => apiFetch(`${path}/${id}/approve`, { method: 'PATCH' })));
      if (results.some((r) => !r.ok)) throw new Error('Failed to approve one or more entries');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extruderKeys.all }),
        queryClient.invalidateQueries({ queryKey: loomsKeys.all }),
        queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all }),
      ]);
      setConfirmApproveOpen(false);
    } catch (error) {
      console.error('Error approving day entries:', error);
    } finally {
      setApprovingDay(false);
    }
  };

  const { setHeaderRight } = useProductionHeader();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingDay, setDeletingDay] = useState(false);

  useEffect(() => {
    setHeaderRight(
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 mr-4">
          <Calendar className="w-[18px] h-[18px] text-[#004D40]" />
          <span className="text-[15px] font-bold text-[#004D40]">{formattedDate}</span>
        </div>
        {canEditDay && (
          <Button
            variant="outline"
            size="sm"
            className="h-[34px] px-4 text-[#00897B] border-[#00897B]/20 font-bold uppercase tracking-wider text-[11px] gap-2 hover:bg-[#00897B]/5 bg-white"
            onClick={() => navigate(`/production/new-entry?date=${date}&from=details`)}
          >
            <Edit className="w-3.5 h-3.5" /> EDIT ENTRY
          </Button>
        )}
      </div>
    );
    return () => setHeaderRight(null);
  }, [setHeaderRight, formattedDate, date, navigate, canEditDay]);

  const handleDeleteDay = async () => {
    setDeletingDay(true);
    try {
      const targets = [
        ...(extruderData?.data ?? []).map((r) => ({ path: '/production/extruder', id: r.id })),
        ...(loomsData?.data ?? []).map((r) => ({ path: '/production/looms', id: r.id })),
        ...(fabricData?.data ?? []).map((r) => ({ path: '/fabric-checking', id: r.id })),
        ...fabricDeliveredRows.map((r) => ({ path: '/load-sent', id: r.id })),
      ];
      const results = await Promise.all(targets.map(({ path, id }) => apiFetch(`${path}/${id}`, { method: 'DELETE' })));
      if (results.some((r) => !r.ok)) throw new Error('Failed to delete one or more entries');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extruderKeys.all }),
        queryClient.invalidateQueries({ queryKey: loomsKeys.all }),
        queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all }),
        queryClient.invalidateQueries({ queryKey: loadSentKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardProductionKey }),
      ]);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (error) {
      console.error('Error deleting day entries:', error);
    } finally {
      setDeletingDay(false);
    }
  };

  const extruderRows = useMemo(
    () =>
      (extruderData?.data ?? [])
        .filter((item) => item.productionDate.startsWith(date))
        .map(mapExtruderItem)
        .filter((r) => r.raw > 0 || r.output > 0 || r.chemicalKg > 0),
    [extruderData, date],
  );
  const loomRows = useMemo(
    () =>
      (loomsData?.data ?? [])
        .filter((item) => item.productionDate.startsWith(date))
        .map(mapLoomItem)
        .filter((r) => r.input > 0 || r.output > 0 || r.loomsWasteKg > 0),
    [loomsData, date],
  );
  const fabricRows = useMemo(
    () =>
      (fabricData?.data ?? [])
        .filter((item) => item.productionDate.startsWith(date))
        .map(mapFabricItem)
        .filter((r) => r.input > 0 || r.output > 0 || r.fwKg > 0 || r.bwKg > 0),
    [fabricData, date],
  );
  const fabricDeliveredTotal = fabricDeliveredRows.reduce((sum, record) => sum + record.delivered, 0);

  return (
    <>
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-3">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col">
            <StageBlock
              number={1}
              icon={<img src={extruderIcon} alt="Extruder" className="w-6 h-6 object-contain" />}
              title="Extruder Production"
              description=""
              theme={stageTheme.extruder}
              producedLabel="Extruder PRODUCED"
              producedValue={formatNum(row.extruder.output)}
              producedUnit="kg"
              wasteLabel="WASTE + LUMPS"
              wasteValue={formatNum(row.extruder.wastage)}
              wasteUnit="kg"
              expanded={expandedStages.extruder}
              onToggle={() => toggleStage('extruder')}
              tableHeads={['SIZE', 'COLOR', 'BRAND', 'HDPE MATERIALS (KG)', 'WASTE (KG)', 'LUMPS (KG)', 'ACTION']}
            >
              {extruderRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center text-gray-400 text-xs">No entries for this date.</TableCell>
                </TableRow>
              ) : (
                extruderRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[12px] text-gray-800 text-left">{r.size}</TableCell>
                    <TableCell className="text-center text-[12px] text-gray-800">{r.color}</TableCell>
                    <TableCell className="text-center text-[12px] text-gray-800">{r.brand}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-gray-900">{formatNum(r.raw)}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-red-500">{formatNum(r.yarnWasteKg)}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-gray-700">{formatNum(r.lumpsKg)}</TableCell>
                    <TableCell className="text-right"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" /></TableCell>
                  </TableRow>
                ))
              )}
            </StageBlock>

            <StageBlock
              number={2}
              icon={<img src={loomsIcon} alt="Looms" className="w-6 h-6 object-contain" />}
              title="Looms Production"
              description=""
              theme={stageTheme.looms}
              producedLabel="FABRIC PRODUCED"
              producedValue={formatNum(row.looms.output)}
              producedUnit="kg"
              wasteLabel="LOOMS WASTE"
              wasteValue={formatNum(row.looms.wastage)}
              wasteUnit="kg"
              expanded={expandedStages.looms}
              onToggle={() => toggleStage('looms')}
              tableHeads={['SIZE', 'COLOR', 'INPUT WEIGHT (KG)', 'WASTE (KG)', 'FINAL WEIGHT (KG)', 'ACTION']}
            >
              {loomRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-gray-400 text-xs">No entries for this date.</TableCell>
                </TableRow>
              ) : (
                loomRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[12px] text-gray-800 text-left">{r.size}</TableCell>
                    <TableCell className="text-center text-[12px] text-gray-800">{r.color}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-gray-900">{formatNum(r.input)}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-red-500">{formatNum(r.loomsWasteKg)}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-gray-900">{formatNum(r.output)}</TableCell>
                    <TableCell className="text-right"><CheckCircle2 className="w-4 h-4 text-blue-500 inline-block" /></TableCell>
                  </TableRow>
                ))
              )}
            </StageBlock>

            <StageBlock
              number={3}
              icon={<Layers className="w-5 h-5 text-[#6D3FA0]" />}
              title="Fabric Checking"
              description=""
              theme={stageTheme.fabric}
              producedLabel="FABRIC CHECKED"
              producedValue={formatNum(row.fabric.output)}
              producedUnit="kg"
              wasteLabel="FW + BW WASTE"
              wasteValue={formatNum(row.fabric.wastage)}
              wasteUnit="kg"
              expanded={expandedStages.fabric}
              onToggle={() => toggleStage('fabric')}
              tableHeads={['SIZE', 'COLOR', 'CHECKED WEIGHT (KG)', 'FW WASTAGE (KG)', 'BW WASTAGE (KG)', 'FINAL WEIGHT (KG)', 'ACTION']}
            >
              {fabricRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center text-gray-400 text-xs">No entries for this date.</TableCell>
                </TableRow>
              ) : (
                fabricRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[12px] text-gray-800 text-left">{r.size}</TableCell>
                    <TableCell className="text-center text-[12px] text-gray-800">{r.color}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-gray-900">{formatNum(r.input)}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-red-500">{formatNum(r.fwKg)}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-red-500">{formatNum(r.bwKg)}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-gray-900">{formatNum(r.output)}</TableCell>
                    <TableCell className="text-right"><CheckCircle2 className="w-4 h-4 text-purple-500 inline-block" /></TableCell>
                  </TableRow>
                ))
              )}
            </StageBlock>

            <StageBlock
              number={4}
              icon={<div className="text-[#61401E] text-xs font-bold">DEL</div>}
              title="Fabric Delivered"
              description=""
              theme={stageTheme.fabricDelivered}
              producedLabel="DELIVERED"
              producedValue={formatNum(fabricDeliveredTotal)}
              producedUnit="kg"
              wasteLabel="WASTAGE"
              wasteValue={formatNum(0)}
              wasteUnit="kg"
              expanded={expandedStages.fabricDelivered}
              onToggle={() => toggleStage('fabricDelivered')}
              tableHeads={['SIZE', 'COLOR', 'DELIVERED (KG)', 'ACTION']}
              isLast
            >
              {loadingLoadSent ? (
                <TableRow><TableCell colSpan={4} className="h-16 text-center text-gray-400 text-xs"><Loader size="sm" /></TableCell></TableRow>
              ) : fabricDeliveredRows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-16 text-center text-gray-400 text-xs">No entries for this date.</TableCell></TableRow>
              ) : (
                fabricDeliveredRows.map((deliveredRow) => (
                  <TableRow key={deliveredRow.id}>
                    <TableCell className="text-[12px] text-gray-800 text-left">{deliveredRow.size}</TableCell>
                    <TableCell className="text-center text-[12px] text-gray-800">{deliveredRow.color}</TableCell>
                    <TableCell className="text-center text-[12px] font-semibold text-gray-900">{formatNum(deliveredRow.delivered)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); onEditFabricDelivered(deliveredRow.original); }}>
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        <CheckCircle2 className="w-4 h-4 text-[#61401E]" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </StageBlock>
          </div>
        </div>
      </div>
      <DeleteConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete this day's entries?"
        description={`Removes every Extruder, Looms, Fabric Checking, and Fabric Delivered record for ${formattedDate}. This action cannot be undone.`}
        isPending={deletingDay}
        onConfirm={handleDeleteDay}
      />
      <ApproveConfirmDialog
        open={confirmApproveOpen}
        onOpenChange={setConfirmApproveOpen}
        title="Approve this day's entries?"
        description={`Approves every not-yet-approved Extruder, Looms, and Fabric Checking record for ${formattedDate}. Once approved, a Manager can no longer edit them — this cannot be undone.`}
        isPending={approvingDay}
        onConfirm={handleApproveDay}
      />
    </>
  );
}

export function ProductionDesign2() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(location.state?.selectedDate || null);

  useEffect(() => {
    if (location.state?.selectedDate) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const { user } = useAuth();
  // Aggregated day-wise rows here have no per-record isApproved data (that lives on the
  // individual Extruder/Looms/Fabric Checking records), so this optimistically assumes
  // not-yet-approved — the Detail view (DayDetailView above) is where approval-aware edit
  // gating actually happens, and the backend enforces the real per-record check regardless.
  const canEditProduction = canEditProductionRecord(user, false);
  const canDeleteProduction = canDeleteProductionRecord(user);

  const [isNavigating, setIsNavigating] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [deleteTargetDate, setDeleteTargetDate] = useState<string | null>(null);
  const [deletingDate, setDeletingDate] = useState(false);
  const [approveTargetDate, setApproveTargetDate] = useState<string | null>(null);
  const [approvingDate, setApprovingDate] = useState(false);
  const [editingLoadSent, setEditingLoadSent] = useState<LoadSentRecord | null>(null);
  const [filterDate, setFilterDate] = useState<Date>(() => {
    const saved = sessionStorage.getItem('productionMonthFilter');
    return saved ? parseISO(`${saved}-01`) : new Date();
  });
  const monthStr = format(filterDate, 'yyyy-MM');
  const { rows: dayWiseRows, totals: dayWiseTotals, isLoading: loadingDayWise, apiSummary } = useDayWiseProduction(monthStr);
  const { data: loadSentData, isLoading: loadingLoadSent } = useLoadSentRecords('?limit=100');
  const selectedMonthDeliveryRows = useMemo(
    () => getFabricDeliveredRows(loadSentData?.data, monthStr),
    [loadSentData, monthStr],
  );
  const selectedMonthDeliveryTotal = selectedMonthDeliveryRows.reduce((sum, record) => sum + record.delivered, 0);

  // Deletes every Extruder/Looms/Fabric Checking record for one date — the
  // day-wise table only has aggregated totals for each row, not record ids,
  // so this fetches the real records for that date first, then removes each.
  const handleDeleteDate = async () => {
    if (!deleteTargetDate) return;
    setDeletingDate(true);
    try {
      const dateQuery = `?date_from=${deleteTargetDate}&date_to=${deleteTargetDate}&limit=100`;
      const [extruderRes, loomsRes, fabricRes, loadSentRes] = await Promise.all([
        fetchJson<{ data: { id: string }[] }>(`/production/extruder${dateQuery}`),
        fetchJson<{ data: { id: string }[] }>(`/production/looms${dateQuery}`),
        fetchJson<{ data: { id: string }[] }>(`/fabric-checking${dateQuery}`),
        fetchJson<{ data: { id: string }[] }>(`/load-sent${dateQuery}`),
      ]);

      const results = await Promise.all([
        ...extruderRes.data.map((r) => apiFetch(`/production/extruder/${r.id}`, { method: 'DELETE' })),
        ...loomsRes.data.map((r) => apiFetch(`/production/looms/${r.id}`, { method: 'DELETE' })),
        ...fabricRes.data.map((r) => apiFetch(`/fabric-checking/${r.id}`, { method: 'DELETE' })),
        ...loadSentRes.data.map((r) => apiFetch(`/load-sent/${r.id}`, { method: 'DELETE' })),
      ]);
      if (results.some((r) => !r.ok)) throw new Error('Failed to delete one or more entries');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extruderKeys.all }),
        queryClient.invalidateQueries({ queryKey: loomsKeys.all }),
        queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all }),
        queryClient.invalidateQueries({ queryKey: loadSentKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardProductionKey }),
      ]);
      setDeleteTargetDate(null);
    } catch (error) {
      console.error('Error deleting day entries:', error);
    } finally {
      setDeletingDate(false);
    }
  };

  // Approves every not-yet-approved Extruder/Looms/Fabric Checking record for one date — the
  // day-wise table only has aggregated totals for each row, not record ids, so this fetches
  // the real records for that date first, then approves each unapproved one.
  const handleApproveDate = async () => {
    if (!approveTargetDate) return;
    setApprovingDate(true);
    try {
      const dateQuery = `?date_from=${approveTargetDate}&date_to=${approveTargetDate}&limit=100`;
      const [extruderRes, loomsRes, fabricRes] = await Promise.all([
        fetchJson<{ data: { id: string; isApproved: boolean }[] }>(`/production/extruder${dateQuery}`),
        fetchJson<{ data: { id: string; isApproved: boolean }[] }>(`/production/looms${dateQuery}`),
        fetchJson<{ data: { id: string; isApproved: boolean }[] }>(`/fabric-checking${dateQuery}`),
      ]);

      const results = await Promise.all([
        ...extruderRes.data.filter((r) => !r.isApproved).map((r) => apiFetch(`/production/extruder/${r.id}/approve`, { method: 'PATCH' })),
        ...loomsRes.data.filter((r) => !r.isApproved).map((r) => apiFetch(`/production/looms/${r.id}/approve`, { method: 'PATCH' })),
        ...fabricRes.data.filter((r) => !r.isApproved).map((r) => apiFetch(`/fabric-checking/${r.id}/approve`, { method: 'PATCH' })),
      ]);
      if (results.some((r) => !r.ok)) throw new Error('Failed to approve one or more entries');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extruderKeys.all }),
        queryClient.invalidateQueries({ queryKey: loomsKeys.all }),
        queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardProductionKey }),
      ]);
      setApproveTargetDate(null);
    } catch (error) {
      console.error('Error approving day entries:', error);
    } finally {
      setApprovingDate(false);
    }
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(dayWiseRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(
    () => dayWiseRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [dayWiseRows, currentPage, pageSize],
  );

  const { setHeaderRight, setShowBackButton, setOnBackClick } = useProductionHeader();

  useEffect(() => {
    if (selectedDate) {
      setShowBackButton(true);
      setOnBackClick(() => () => setSelectedDate(null));
      // Right header will be set by DayDetailView component
    } else {
      setShowBackButton(false);
      setOnBackClick(undefined);

      setHeaderRight(
        <>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={format(filterDate, 'yyyy-MM')}
              onChange={(e) => {
                if (e.target.value) {
                  setFilterDate(parseISO(`${e.target.value}-01`));
                  sessionStorage.setItem('productionMonthFilter', e.target.value);
                }
              }}
              className="h-9 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-sm font-semibold text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
            />
          </div>
          {canCreateProductionRecord(user) && (
            <Button
              className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)] cursor-pointer"
              onClick={() => navigate('/production/new-entry')}
            >
              <Plus className="w-3 h-3" />
              ADD NEW ENTRY
            </Button>
          )}
        </>
      );
    }

    return () => {
      setHeaderRight(null);
      setShowBackButton(false);
      setOnBackClick(undefined);
    };
  }, [setHeaderRight, setShowBackButton, setOnBackClick, navigate, selectedDate, filterDate, user]);

  if (loadingDayWise) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader size="xl" />
          Loading production details...
        </div>
      </div>
    );
  }

  const extruderSummary = {
    input: apiSummary?.extruder.inputKg ?? 0,
    output: apiSummary?.extruder.outputKg ?? 0,
    wastage: apiSummary?.extruder.wastageKg ?? 0,
  };
  const efficiency = apiSummary?.extruder.efficiencyPct ?? 0;
  const wastePct = apiSummary?.extruder.wastePct ?? 0;

  const loomsSummary = {
    input: apiSummary?.looms.inputKg ?? 0,
    output: apiSummary?.looms.outputKg ?? 0,
    wastage: apiSummary?.looms.wastageKg ?? 0,
  };
  const loomsEfficiency = apiSummary?.looms.efficiencyPct ?? 0;
  const loomsWastePct = apiSummary?.looms.wastePct ?? 0;

  const fabricSummary = {
    input: apiSummary?.fabricChecking.inputKg ?? 0,
    checked: apiSummary?.fabricChecking.outputKg ?? 0,
    wastage: apiSummary?.fabricChecking.wastageKg ?? 0,
  };
  const fabricEfficiency = apiSummary?.fabricChecking.efficiencyPct ?? 0;
  const fabricWastePct = apiSummary?.fabricChecking.wastePct ?? 0;

  return (
    <div id="production-design-2-page" className="flex flex-col bg-[#004D40]/5 min-h-full relative">
      <style>{`
        #production-design-2-page, #production-design-2-page * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #production-design-2-page .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      {isNavigating ? (
        <div className="flex-1 flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-3 text-[#00897B]">
            <Loader size="xl" />
            <p className="font-semibold text-sm">Loading daily details...</p>
          </div>
        </div>
      ) : selectedDate ? (
        <DayDetailView
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          dayWiseRows={dayWiseRows}
          fabricDeliveredRows={getFabricDeliveredRows(loadSentData?.data, selectedDate)}
          loadingLoadSent={loadingLoadSent}
          onEditFabricDelivered={setEditingLoadSent}
        />
      ) : (
        <div className="p-2 flex flex-col gap-2 flex-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <Card className="bg-white rounded-[14px] p-2 hover:shadow-md transition-all">
              <div className="bg-[#00897B]/5 border border-[#B8DCD0] rounded-[10px] h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                  <CardTitle className="text-[19px] font-extrabold text-[#0B5566] flex items-center gap-3">
                    <div className="bg-[#0B5566] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">1</div>
                    Extruder Production
                  </CardTitle>
                  <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <img src={extruderIcon} alt="Extruder" className="w-[35px] h-[35px] object-contain opacity-90" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
                  <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
                    <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                      <p className="text-[18px] font-bold text-[#004D40] leading-none font-inter">{formatNum(extruderSummary.output)}</p>
                    </div>
                    <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                      <p className="text-[17px] font-bold text-[#004D40] leading-none font-inter">{formatNum(extruderSummary.wastage)}</p>
                    </div>
                    <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">EFFICIENCY</p>
                      <p className="text-[17px] font-bold text-[#00A87E] leading-none font-inter">{efficiency.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center px-1">
                    <div className="flex-1">
                      <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1.5">WASTE %</p>
                      <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">{wastePct.toFixed(2)}%</p>
                    </div>
                    {/* TODO: wire up a real Lums-only wastage figure, then uncomment.
                    <div className="flex-[1.7]">
                      <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1.5">LUMS WASTAGE (KG)</p>
                      <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">{formatNum(lumsWastageKg)}</p>
                    </div>
                    */}
                  </div>
                </CardContent>
              </div>
            </Card>

            <Card className="bg-white rounded-[14px] p-2 hover:shadow-md transition-all">
              <div className="bg-[#004D40]/5 border border-[#B8D8D5] rounded-[10px] h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                  <CardTitle className="text-[19px] font-extrabold text-[#7A6A00] flex items-center gap-3">
                    <div className="bg-[#7A6A00] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">2</div>
                    Looms Production
                  </CardTitle>
                  <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <img src={loomsIcon} alt="Looms" className="w-[35px] h-[35px] object-contain opacity-90" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
                  <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
                    <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                      <p className="text-[18px] font-bold text-[#004D40] leading-none font-inter">{loomsSummary.output.toFixed(2)}</p>
                    </div>
                    <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                      <p className="text-[17px] font-bold text-[#004D40] leading-none font-inter">{loomsSummary.wastage.toFixed(2)}</p>
                    </div>
                    <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">EFFICIENCY</p>
                      <p className="text-[17px] font-bold text-[#00A87E] leading-none font-inter">{loomsEfficiency.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center px-1">
                    <div className="flex-1">
                      <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                      <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">{loomsWastePct.toFixed(2)}%</p>
                    </div>

                  </div>
                </CardContent>
              </div>
            </Card>

            <Card className="bg-white rounded-[14px] p-2 hover:shadow-md transition-all">
              <div className="bg-[#004D40]/5 border border-[#C5D8C2] rounded-[10px] h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                  <CardTitle className="text-[19px] font-extrabold text-[#2F6B2F] flex items-center gap-3">
                    <div className="bg-[#2F6B2F] border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm">3</div>
                    Fabric Production
                  </CardTitle>
                  <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#004D40] flex items-center justify-center">
                    <img src="/fabric-prod.png" alt="Fabric Production" className="w-[35px] h-[35px] object-contain" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
                  <div className="flex border border-gray-100 rounded-lg mb-4 bg-white overflow-hidden">
                    <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
                      <p className="text-[18px] font-bold text-[#004D40] leading-none font-inter">{fabricSummary.checked.toFixed(2)}</p>
                    </div>
                    <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
                      <p className="text-[17px] font-bold text-[#004D40] leading-none font-inter">{fabricSummary.wastage.toFixed(2)}</p>
                    </div>
                    <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">EFFICIENCY</p>
                      <p className="text-[17px] font-bold text-[#00A87E] leading-none font-inter">{fabricEfficiency.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center px-1">
                    <div className="flex-1">
                      <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTE %</p>
                      <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">{fabricWastePct.toFixed(2)}%</p>
                    </div>
                    {/* TODO: decide what "Wastage Value" should represent (Bit Waste only? Fabric
                    Waste only? Same as Total Wastage above?), wire it up, then uncomment.
                    <div className="flex-[1.7]">
                      <p className="text-[10px] px-3 font-extrabold uppercase tracking-wide text-gray-600 mb-1">WASTAGE VALUE (KG)</p>
                      <p className="text-[17px] px-3 font-bold text-gray-900 leading-none font-inter">0.00</p>
                    </div>
                    */}
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>


          {/* Data Table Area */}
          <Card className="shadow-sm border-0 bg-white rounded-xl overflow-hidden gap-0 p-0 flex flex-col">
            <CardHeader className="flex flex-col gap-1 border-b border-gray-300 px-3 py-1.5 !pb-1.5 sm:flex-row sm:items-center sm:justify-between bg-white">
              <CardTitle className="text-[17px] font-bold text-[#004D40] leading-tight flex items-center">
                <img src="/Table-icon.jpg" alt="" className="w-10 h-10 object-contain rounded-sm" />
                Day Wise Production & Wastage Details
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex gap-2 font-bold uppercase tracking-wider text-[11px] h-8 px-3 text-gray-600 border-gray-400"
                  onClick={() => setIsReportOpen(true)}
                >
                  <Download className="w-[14px] h-[14px]" /> REPORT
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto w-full">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-gray-300">
                    <TableHead rowSpan={2} className="!text-center font-bold text-gray-800 align-middle border-r border-gray-300 w-[95px] min-w-[95px] px-1.5 bg-white text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead colSpan={3} className="w-[22%] text-[#0B5566] font-bold bg-[#D6EEF7] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                      <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">
                        {/* <span className="bg-[#0B5566] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">1</span> */}
                        EXTRUDER PRODUCTION
                      </span>
                    </TableHead>
                    <TableHead colSpan={3} className="w-[22%] text-[#7A6A00] font-bold bg-[#FFF6BF] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                      <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">
                        {/* <span className="bg-[#7A6A00] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">2</span> */}
                        LOOMS PRODUCTION
                      </span>
                    </TableHead>
                    <TableHead colSpan={3} className="w-[22%] text-[#2F6B2F] font-bold bg-[#DCEEDB] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                      <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">
                        {/* <span className="bg-[#2F6B2F] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">3</span> */}
                        FABRIC PRODUCTION
                      </span>
                    </TableHead>
                    <TableHead colSpan={3} className="w-[22%] text-[#61401E] font-bold bg-[#f2caa0] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                      <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">
                        {/* <span className="bg-[#61401E] text-white w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold">4</span> */}
                        FABRIC DELIVERED
                      </span>
                    </TableHead>
                    <TableHead rowSpan={2} className="!text-center font-extrabold text-gray-800 align-middle border-gray-300 w-[90px] min-w-[90px] px-1 bg-white text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent bg-white border-b border-gray-300">
                    {/* Extruder */}
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Input</TableHead>
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Wastage</TableHead>
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                    {/* Looms */}
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Input</TableHead>
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Wastage</TableHead>
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                    {/* Fabric */}
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Input</TableHead>
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Wastage</TableHead>
                    <TableHead className="w-[7.34%] !text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                    {/* Fabric Delivered */}
                    <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">size</TableHead>
                    <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">color</TableHead>
                    <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {loadingDayWise ? (
                    <TableRow>
                      <TableCell colSpan={14} className="h-32 !text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500 font-medium">
                          <Loader size="sm" /> Loading records...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="h-32 !text-center text-gray-500 font-medium">No production records found.</TableCell>
                    </TableRow>
                  ) : (
                    pagedRows.map((row) => {
                      const rowDelivered = selectedMonthDeliveryRows.filter(r => (r.original.productionDate ?? r.original.date ?? '').startsWith(row.date));
                      const rowDeliveredTotal = rowDelivered.reduce((sum, r) => sum + r.delivered, 0);
                      const sizes = Array.from(new Set(rowDelivered.map(r => r.size).filter(Boolean)));
                      const colors = Array.from(new Set(rowDelivered.map(r => r.color).filter(Boolean)));
                      return (
                        <TableRow key={row.date} className="border-b border-gray-300 hover:bg-gray-50 transition-colors group">
                          <TableCell
                            className="!text-center font-bold text-[#004D40] border-r border-gray-300 text-[14px] py-1 cursor-pointer hover:underline px-4"
                            onClick={() => {
                              setIsNavigating(true);
                              setTimeout(() => {
                                setSelectedDate(row.date);
                                setIsNavigating(false);
                              }, 500);
                            }}
                          >
                            {format(parseISO(row.date), 'dd MMM')}
                          </TableCell>

                          {/* Extruder */}
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(row.extruder.input)}</TableCell>
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(row.extruder.wastage)}</TableCell>
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(row.extruder.output)}</TableCell>

                          {/* Looms */}
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(row.looms.input)}</TableCell>
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(row.looms.wastage)}</TableCell>
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(row.looms.output)}</TableCell>

                          {/* Fabric */}
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(row.fabric.input)}</TableCell>
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(row.fabric.wastage)}</TableCell>
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(row.fabric.output)}</TableCell>

                          {/* Fabric Delivered */}
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1" title={sizes.join(', ') || '-'}>{sizes.length > 1 ? 'Mixed' : (sizes[0] || '-')}</TableCell>
                          <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1" title={colors.join(', ') || '-'}>{colors.length > 1 ? 'Mixed' : (colors[0] || '-')}</TableCell>
                          <TableCell className="!text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(rowDeliveredTotal)}</TableCell>

                          {/* Actions */}
                          <TableCell className="py-1">
                            <div className="flex items-center justify-center gap-2">
                              {user?.role === 'ADMIN' &&
                                (<span title={row.isApproved ? 'Already Approved' : 'Approve'} className="inline-flex">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 text-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
                                    onClick={() => setApproveTargetDate(row.date)}
                                    disabled={row.isApproved}
                                  >
                                    <CheckCircle2 className="h-[13px] w-[13px]" />
                                  </Button>
                                </span>)
                              }
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 text-[#004D40] hover:bg-[#004D40]/10"
                                onClick={() => navigate(`/production/new-entry?date=${row.date}`)}
                                disabled={!canEditProduction}
                              >
                                <Edit className="h-[13px] w-[13px]" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteTargetDate(row.date)}
                                disabled={!canDeleteProduction}
                              >
                                <Trash2 className="h-[13px] w-[13px]" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}

                  {!loadingDayWise && dayWiseRows.length > 0 && (
                    <TableRow className="bg-white font-bold hover:bg-white border-t-2 border-gray-200">
                      <TableCell className="!text-center border-r border-gray-300 text-gray-900 text-[13px] py-1 px-1.5">TOTAL</TableCell>
                      {/* Extruder Total */}
                      <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.extruder.input)}</TableCell>
                      <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.extruder.wastage)}</TableCell>
                      <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-300">{formatNum(dayWiseTotals.extruder.output)}</TableCell>
                      {/* Looms Total */}
                      <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.looms.input)}</TableCell>
                      <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.looms.wastage)}</TableCell>
                      <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-300">{formatNum(dayWiseTotals.looms.output)}</TableCell>
                      {/* Fabric Total */}
                      <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.fabric.input)}</TableCell>
                      <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(dayWiseTotals.fabric.wastage)}</TableCell>
                      <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-300">{formatNum(dayWiseTotals.fabric.output)}</TableCell>
                      {/* Fabric Delivered Total */}
                      <TableCell className="text-center text-[#00897B] text-[14px]">-</TableCell>
                      <TableCell className="text-center text-[#00897B] text-[14px]">-</TableCell>
                      <TableCell className="!text-center text-[#00897B] text-[14px] border-r border-gray-200">{formatNum(selectedMonthDeliveryTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 p-2 text-sm text-gray-500 bg-white">
              <div className="font-medium text-gray-600 text-xs">
                All weights are measured in Kilogram (KG)
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-gray-200 text-gray-600" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>&lt;</Button>
                {getPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? 'outline' : 'ghost'}
                      size="icon"
                      className={p === currentPage ? 'h-6 w-6 rounded-md bg-[#004D40] text-white text-sm hover:bg-[#00382e] border-[#004D40]' : 'h-6 w-6 rounded-md text-sm text-gray-600 hover:bg-gray-100'}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ),
                )}
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-gray-200 text-gray-600" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>&gt;</Button>
              </div>
              <div className="flex items-center gap-2 font-medium text-gray-600 text-xs">
                Rows per page:
                <select
                  className="border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 font-semibold bg-white"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      )}
      <DayWiseReportModal open={isReportOpen} onOpenChange={setIsReportOpen} />
      <DeleteConfirmDialog
        open={!!deleteTargetDate}
        onOpenChange={(open) => !open && setDeleteTargetDate(null)}
        title="Delete this day's entries?"
        description={
          deleteTargetDate
            ? `Removes every Extruder, Looms, Fabric Checking, and Fabric Delivered record for ${format(parseISO(deleteTargetDate), 'dd MMM, yyyy')}. This action cannot be undone.`
            : undefined
        }
        isPending={deletingDate}
        onConfirm={handleDeleteDate}
      />
      <ApproveConfirmDialog
        open={!!approveTargetDate}
        onOpenChange={(open) => !open && setApproveTargetDate(null)}
        title="Approve this day's entries?"
        description={
          approveTargetDate
            ? `Approves every not-yet-approved Extruder, Looms, and Fabric Checking record for ${format(parseISO(approveTargetDate), 'dd MMM, yyyy')}. Once approved, a Manager can no longer edit them — this cannot be undone.`
            : undefined
        }
        isPending={approvingDate}
        onConfirm={handleApproveDate}
      />
      {editingLoadSent && (
        <LoadSentFormDialog
          record={editingLoadSent}
          onClose={() => setEditingLoadSent(null)}
        />
      )}
    </div>
  );
}
