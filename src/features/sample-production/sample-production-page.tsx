import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/inter';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { apiFetch, fetchJson } from '@/lib/api-client';
import { currentMonthStr } from '@/lib/date-utils';
import extruderIcon from '@/assets/extruder-icon.png';
import loomsIcon from '@/assets/looms-icon.png';
import { sumWastageByCode } from '@/lib/api-types';
import { useAuth } from '@/features/auth/auth-context';
import { canDeleteProductionRecord } from '@/lib/production-permissions';
import { useExtruderProductions, extruderKeys } from '@/features/extruder/extruder-queries';
import { useLoomsProductions, loomsKeys } from '@/features/looms/loom-queries';
import { useFabricCheckingRecords, fabricCheckingKeys } from '@/features/fabric/fabric-queries';
import { useLoadSentRecords, getLoadSentWeight, type LoadSentRecord, loadSentKeys } from '@/features/inventory/load-sent-queries';
import { LoadSentFormDialog } from '@/features/inventory/load-sent-form-dialog';
import { ProductionHeaderContext } from '@/features/production/production-context';
import { NewEntry } from '@/features/production/new-entry';
import { DayDetailView } from '@/features/production/production-design-2';

// Shared header chrome for both the entry form and the day-detail view — mirrors
// ProductionLayout's header from production-details.tsx (back button, title, header-right
// slot), driven by the same ProductionHeaderContext both NewEntry and DayDetailView already
// use to publish their own title/back-button/header-right content.
function SampleHeaderShell({ fallbackTitle, onClose, scrollContent = false, children }: {
  fallbackTitle: string;
  onClose: () => void;
  /** DayDetailView has no internal scroll container of its own (unlike NewEntry); set true for it. */
  scrollContent?: boolean;
  children: React.ReactNode;
}) {
  const [headerRight, setHeaderRight] = useState<React.ReactNode>(null);
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  const [, setShowBackButton] = useState(false);
  const [onBackClick, setOnBackClick] = useState<(() => void) | undefined>(undefined);

  const ctxValue = useMemo(() => ({
    setHeaderRight, setShowBackButton, setOnBackClick, setHeaderTitle
  }), []);

  return (
    <ProductionHeaderContext.Provider value={ctxValue}>
      <div id="sample-production-page" className="flex flex-col h-full w-full flex-1">
        <style>{`
          #sample-production-page, #sample-production-page * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
          #sample-production-page .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
        `}</style>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => (onBackClick ? onBackClick() : onClose())} className="h-8 w-8 text-gray-900 bg-white rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[20px] font-bold text-black leading-tight px-2">{headerTitle || fallbackTitle}</h1>
              <p className="text-[12.5px] text-gray-500 font-medium px-2">Track sample/trial production and wastage</p>
            </div>
          </div>
          <div>{headerRight}</div>
        </div>
        <div className={`flex-1 flex flex-col relative bg-white ${scrollContent ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          {children}
        </div>
      </div>
    </ProductionHeaderContext.Provider>
  );
}

function SampleNewEntryWrapper({ date, onClose }: { date: string | null; onClose: () => void }) {
  return (
    <SampleHeaderShell fallbackTitle="Sample Production Details" onClose={onClose}>
      <NewEntry onClose={onClose} defaultDate={date} entryType="SAMPLE" />
    </SampleHeaderShell>
  );
}

/** Read-only day view (StageBlock cards) — mirrors production-design-2.tsx's own DayDetailView usage, reused here with entryType="SAMPLE" so it only ever shows Sample records. */
function SampleDayDetailWrapper({ date, onClose, onEdit }: { date: string; onClose: () => void; onEdit: () => void }) {
  const [editingLoadSent, setEditingLoadSent] = useState<LoadSentRecord | null>(null);

  return (
    <SampleHeaderShell fallbackTitle="View Sample Production" onClose={onClose} scrollContent>
      <DayDetailView date={date} onClose={onClose} onEditClick={onEdit} onEditFabricDelivered={setEditingLoadSent} entryType="SAMPLE" />
      {editingLoadSent && (
        <LoadSentFormDialog record={editingLoadSent} onClose={() => setEditingLoadSent(null)} />
      )}
    </SampleHeaderShell>
  );
}
function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type StageTotals = { input: number; wastage: number; output: number };

function statCard(opts: {
  key: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  icon: string;
  iconAlt: string;
  title: string;
  totals: StageTotals;
}) {
  const { key, accent, cardBg, cardBorder, titleColor, icon, iconAlt, title, totals } = opts;
  // Wastage % = (wastage / production) * 100
  const wastePct = totals.output > 0 ? (totals.wastage / totals.output) * 100 : 0;

  return (
    <Card key={key} className="bg-white rounded-[14px] p-2 hover:shadow-md transition-all">
      <div className={`${cardBg} border ${cardBorder} rounded-[10px] h-full flex flex-col`}>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
          <CardTitle className={`text-[19px] font-extrabold ${titleColor} flex items-center gap-3`}>
            <div className={`${accent} border text-white w-8 h-8 rounded-[4px] flex items-center justify-center text-sm font-bold shadow-sm`}>{key}</div>
            {title}
          </CardTitle>
          <div className="bg-white p-1.5 rounded-md border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <img src={icon} alt={iconAlt} className="w-[35px] h-[35px] object-contain opacity-90" />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4 pt-0 flex-1 flex flex-col justify-between">
          <div className="flex border border-gray-100 rounded-lg bg-white overflow-hidden">
            <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL PRODUCTION (KG)</p>
              <p className="text-[18px] font-bold text-[#004D40] leading-none font-inter">{formatNum(totals.output)}</p>
            </div>
            <div className="flex-1 border-r border-gray-100 px-2 sm:px-3 py-3 flex flex-col justify-center">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">TOTAL WASTAGE (KG)</p>
              <p className="text-[17px] font-bold text-[#004D40] leading-none font-inter">{formatNum(totals.wastage)}</p>
            </div>
            <div className="flex-1 px-2 sm:px-3 py-3 flex flex-col justify-center">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-600 mb-1.5 whitespace-nowrap">WASTAGE %</p>
              <p className="text-[17px] font-bold text-[#D32F2F] leading-none font-inter">{wastePct.toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

type View = { kind: 'list' } | { kind: 'detail'; date: string } | { kind: 'entry'; date: string | null };

export function SampleProductionPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canDeleteProduction = canDeleteProductionRecord(user);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [monthFilter, setMonthFilter] = useState<Date>(new Date());
  const [deleteTargetDate, setDeleteTargetDate] = useState<string | null>(null);
  const [deletingDate, setDeletingDate] = useState(false);

  const monthStr = format(monthFilter, 'yyyy-MM');

  const { data: extruderData } = useExtruderProductions('?limit=100&type=SAMPLE');
  const { data: loomsData } = useLoomsProductions('?limit=100&type=SAMPLE');
  const { data: fabricData } = useFabricCheckingRecords('?limit=100&type=SAMPLE');
  const { data: deliveredData } = useLoadSentRecords('?limit=100&type=SAMPLE');

  const rows = useMemo(() => {
    const dates = new Map<string, any>();

    const getDay = (date: string) => {
      const d = date.split('T')[0];
      if (!dates.has(d)) {
        dates.set(d, {
          date: d,
          extruder: { input: 0, wastage: 0, output: 0 },
          looms: { input: 0, wastage: 0, output: 0 },
          fabric: { input: 0, wastage: 0, output: 0 },
          delivered: { input: 0, wastage: 0, output: 0, colors: new Set<string>() },
        });
      }
      return dates.get(d);
    };

    for (const item of (extruderData?.data || [])) {
      if (!item.productionDate.startsWith(monthStr)) continue;
      const d = getDay(item.productionDate);
      d.extruder.input += item.extruder?.rawMaterialKg || 0;
      d.extruder.wastage += sumWastageByCode(item.wastages, 'LUMPS') + sumWastageByCode(item.wastages, 'YARN_WASTE');
      d.extruder.output += item.extruder?.yarnOutputKg || 0;
    }

    for (const item of (loomsData?.data || [])) {
      if (!item.productionDate.startsWith(monthStr)) continue;
      const d = getDay(item.productionDate);
      d.looms.input += item.loom?.yarnInputKg || 0;
      d.looms.wastage += sumWastageByCode(item.wastages, 'LOOMS_WASTE');
      d.looms.output += item.loom?.fabricOutputKg || 0;
    }

    for (const item of (fabricData?.data || [])) {
      if (!item.productionDate.startsWith(monthStr)) continue;
      const d = getDay(item.productionDate);
      d.fabric.input += item.fabricCheck?.fabricInputKg || 0;
      d.fabric.wastage += sumWastageByCode(item.wastages, 'FW') + sumWastageByCode(item.wastages, 'BW');
      d.fabric.output += item.fabricCheck?.outputKg || 0;
    }

    for (const item of (deliveredData?.data || [])) {
      const date = (item as any).date || item.createdAt;
      const dStr = typeof date === 'string' ? date.split('T')[0] : '';
      if (!dStr.startsWith(monthStr)) continue;
      const d = getDay(dStr);
      const wt = getLoadSentWeight(item);
      d.delivered.input += wt;
      d.delivered.output += wt;
      if (item.color?.name) d.delivered.colors.add(item.color.name);
    }

    return Array.from(dates.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [extruderData, loomsData, fabricData, deliveredData, monthStr]);

  const totals = useMemo(() => {
    const acc = {
      extruder: { input: 0, wastage: 0, output: 0 },
      looms: { input: 0, wastage: 0, output: 0 },
      fabric: { input: 0, wastage: 0, output: 0 },
      delivered: { input: 0, wastage: 0, output: 0 },
    };
    for (const day of rows) {
      (['extruder', 'looms', 'fabric', 'delivered'] as const).forEach((stage) => {
        acc[stage].input += day[stage].input;
        acc[stage].wastage += day[stage].wastage;
        acc[stage].output += day[stage].output;
      });
    }
    return acc;
  }, [rows]);

  // Deletes every SAMPLE-type Extruder/Looms/Fabric Checking/Fabric Delivered record for one
  // date — mirrors production-design-2.tsx's own handleDeleteDate, scoped to type=SAMPLE so a
  // real Production entry sharing the same date is never touched.
  const handleDeleteDate = async () => {
    if (!deleteTargetDate) return;
    setDeletingDate(true);
    try {
      const dateQuery = `?date_from=${deleteTargetDate}T00:00:00.000Z&date_to=${deleteTargetDate}T23:59:59.999Z&limit=100&type=SAMPLE`;
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
      if (results.length > 0 && results.some((r) => !r.ok)) throw new Error('Failed to delete one or more entries');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: extruderKeys.all }),
        queryClient.invalidateQueries({ queryKey: loomsKeys.all }),
        queryClient.invalidateQueries({ queryKey: fabricCheckingKeys.all }),
        queryClient.invalidateQueries({ queryKey: loadSentKeys.all }),
      ]);
    } catch (error) {
      console.error('Error deleting sample day entries:', error);
    } finally {
      setDeletingDate(false);
      setDeleteTargetDate(null);
    }
  };

  if (view.kind === 'entry') {
    return <SampleNewEntryWrapper date={view.date} onClose={() => setView(view.date ? { kind: 'detail', date: view.date } : { kind: 'list' })} />;
  }

  if (view.kind === 'detail') {
    return (
      <SampleDayDetailWrapper
        date={view.date}
        onClose={() => setView({ kind: 'list' })}
        onEdit={() => setView({ kind: 'entry', date: view.date })}
      />
    );
  }

  return (
    <div id="sample-production-page" className="flex flex-col bg-[#004D40]/5 min-h-full flex-1">
      <style>{`
        #sample-production-page, #sample-production-page * { font-family: 'Hanken Grotesk Variable', 'Hanken Grotesk', sans-serif !important; }
        #sample-production-page .font-inter { font-family: 'Inter Variable', 'Inter', sans-serif !important; }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[#F4F1E8] border-b border-[#004D40] shrink-0">
        <div>
          <h1 className="text-[20px] font-bold text-black leading-tight px-2">Sample Production</h1>
          <p className="text-[12.5px] text-gray-500 font-medium px-2">Track sample/trial production and wastage — stored locally for now</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="month"
            value={monthStr}
            max={currentMonthStr()}
            onChange={(e) => e.target.value && setMonthFilter(parseISO(`${e.target.value}-01`))}
            className="h-9 w-40 bg-white border border-gray-400 rounded-md px-3 py-2 text-sm font-semibold text-[#003140] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-[#004D40]"
          />
          <Button
            className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-md px-3 py-2 h-auto text-[12px] font-bold tracking-wide shadow-[0_1px_2px_rgba(0,45,35,0.2)] cursor-pointer"
            onClick={() => setView({ kind: 'entry', date: null })}
          >
            <Plus className="w-3 h-3" /> ADD NEW ENTRY
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {statCard({
            key: '1', accent: 'bg-[#0B5566]', cardBg: 'bg-[#00897B]/5', cardBorder: 'border-[#B8DCD0]', titleColor: 'text-[#0B5566]',
            icon: extruderIcon, iconAlt: 'Extruder', title: 'Extruder Production', totals: totals.extruder,
          })}
          {statCard({
            key: '2', accent: 'bg-[#7A6A00]', cardBg: 'bg-[#004D40]/5', cardBorder: 'border-[#B8D8D5]', titleColor: 'text-[#7A6A00]',
            icon: loomsIcon, iconAlt: 'Looms', title: 'Looms Production', totals: totals.looms,
          })}
          {statCard({
            key: '3', accent: 'bg-[#2F6B2F]', cardBg: 'bg-[#004D40]/5', cardBorder: 'border-[#C5D8C2]', titleColor: 'text-[#2F6B2F]',
            icon: '/fabric-prod.png', iconAlt: 'Fabric Production', title: 'Fabric Production', totals: totals.fabric,
          })}
        </div>

        <Card className="shadow-sm border-0 bg-white rounded-xl overflow-hidden gap-0 p-0 flex flex-col">
          <CardHeader className="flex flex-col gap-1 border-b border-gray-300 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between bg-white">
            <CardTitle className="text-[17px] font-bold text-[#004D40] leading-tight">Day Wise Sample Production Details</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto w-full">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-gray-300">
                  <TableHead rowSpan={2} className="!text-center font-bold text-gray-800 align-middle border-r border-gray-300 w-[95px] min-w-[95px] px-1.5 bg-white text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead colSpan={3} className="text-[#0B5566] font-bold bg-[#D6EEF7] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">EXTRUDER</span>
                  </TableHead>
                  <TableHead colSpan={3} className="text-[#7A6A00] font-bold bg-[#FFF6BF] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">LOOMS</span>
                  </TableHead>
                  <TableHead colSpan={3} className="text-[#2F6B2F] font-bold bg-[#DCEEDB] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">FABRIC</span>
                  </TableHead>
                  <TableHead colSpan={3} className="text-[#61401E] font-bold bg-[#f2caa0] border-r border-gray-300 py-2 text-xs uppercase tracking-wider">
                    <span className="flex items-center justify-center gap-2 text-[13px] font-extrabold">DELIVERED</span>
                  </TableHead>
                  <TableHead rowSpan={2} className="!text-center font-extrabold text-gray-800 align-middle border-gray-300 w-[130px] min-w-[130px] px-1 bg-white text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent bg-white border-b border-gray-300">
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Input</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Wastage</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Input</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Wastage</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Input</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Wastage</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Input</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider h-8">Color</TableHead>
                  <TableHead className="!text-center text-gray-800 font-extrabold text-[12px] uppercase tracking-wider border-r border-gray-300 h-8">Output</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-32 !text-center text-gray-500 font-medium">No sample production records found.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((day) => {
                    const extruder = day.extruder;
                    const looms = day.looms;
                    const fabric = day.fabric;
                    const delivered = day.delivered;
                    const deliveredColors: string[] = Array.from(delivered.colors ?? []);
                    return (
                      <TableRow key={day.date} className="border-b border-gray-300 hover:bg-gray-50 transition-colors group">
                        <TableCell
                          className="!text-center font-bold text-[#004D40] border-r border-gray-300 text-[14px] py-1 cursor-pointer hover:underline px-4"
                          onClick={() => setView({ kind: 'detail', date: day.date })}
                        >
                          {format(parseISO(day.date), 'dd MMM')}
                        </TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(extruder.input)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(extruder.wastage)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(extruder.output)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(looms.input)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(looms.wastage)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(looms.output)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(fabric.input)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(fabric.wastage)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(fabric.output)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1">{formatNum(delivered.input)}</TableCell>
                        <TableCell className="text-center text-gray-800 font-medium text-[14px] py-1" title={deliveredColors.join(', ') || '-'}>
                          {deliveredColors.length > 1 ? 'Mixed' : (deliveredColors[0] || '-')}
                        </TableCell>
                        <TableCell className="!text-center text-gray-800 font-medium text-[14px] py-1 border-r border-gray-300">{formatNum(delivered.output)}</TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="icon" className="h-6 w-6 text-[#004D40] hover:bg-[#004D40]/10" onClick={() => setView({ kind: 'entry', date: day.date })}>
                              <Edit className="h-[13px] w-[13px]" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteTargetDate(day.date)}
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

                {rows.length > 0 && (
                  <TableRow className="bg-white font-bold hover:bg-white border-t-2 border-gray-200">
                    <TableCell className="!text-center border-r border-gray-300 text-gray-900 text-[13px] py-1 px-1.5">TOTAL</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(totals.extruder.input)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(totals.extruder.wastage)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-300">{formatNum(totals.extruder.output)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(totals.looms.input)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(totals.looms.wastage)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-300">{formatNum(totals.looms.output)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(totals.fabric.input)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px]">{formatNum(totals.fabric.wastage)}</TableCell>
                    <TableCell className="text-center text-[#00897B] text-[14px] border-r border-gray-300">{formatNum(totals.fabric.output)}</TableCell>
                    <TableCell className="!text-center text-[#00897B] text-[14px]">{formatNum(totals.delivered.input)}</TableCell>
                    <TableCell className="!text-center text-[#00897B] text-[14px]">-</TableCell>
                    <TableCell className="!text-center text-[#00897B] text-[14px] border-r border-gray-300">{formatNum(totals.delivered.output)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 p-2 text-sm text-gray-500 bg-white">
            <div className="font-medium text-gray-600 text-xs">All weights are measured in Kilogram (KG)</div>
          </div>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTargetDate}
        onOpenChange={(open) => !open && setDeleteTargetDate(null)}
        title="Delete this day's entries?"
        description={deleteTargetDate ? 'Are you sure want to delete this record?' : undefined}
        isPending={deletingDate}
        onConfirm={handleDeleteDate}
      />
    </div>
  );
}
