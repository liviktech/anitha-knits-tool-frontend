import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currentMonthStr, todayStr, type ReportPeriod } from './report-period';

interface ReportLayoutProps {
  displayTitle: string;
  allReports?: { id: string; label: string; moduleId: string }[];
  selectedReport?: string;
  onReportChange?: (tabId: string, moduleId: string) => void;

  // Period picker (Month range or exact Date range)
  period?: ReportPeriod;
  showPeriodPicker?: boolean;
  /** Set false to lock the picker to Month mode only (e.g. Payroll, which the backend only aggregates per calendar month). Defaults to true. */
  supportsDateMode?: boolean;

  // Custom sections (like checkboxes)
  sectionsPanel?: React.ReactNode;

  // PDF Preview State
  pdfBlobUrl: string | null;
  isGenerating: boolean;
  isLoading?: boolean;
  onDownload: () => void;
  onDownloadXlsx?: () => void;
  isGeneratingXlsx?: boolean;
  /** Set false once loading finishes and the report has no rows to show (for the selected period/sections) — shows "No preview available" instead of a blank PDF. Defaults to true. */
  hasData?: boolean;

  // Optional date format for the download file name fallback
  downloadFileName?: string;
}

export function ReportLayout({
  displayTitle,
  allReports,
  selectedReport,
  onReportChange,
  period,
  showPeriodPicker = false,
  supportsDateMode = true,
  sectionsPanel,
  pdfBlobUrl,
  isGenerating,
  isLoading,
  onDownload,
  onDownloadXlsx,
  isGeneratingXlsx,
  hasData = true,
}: ReportLayoutProps) {
  return (
    <div className="flex h-full min-h-0 bg-[#004D40]/5">
      {/* ── Left Control Panel ── */}
      <div className="w-[380px] shrink-0 bg-[#F4F1E8] border-r border-[#004D40]/20 flex flex-col h-full overflow-y-auto">
        {/* Title / Report Selector */}
        <div className="px-5 pt-5 pb-4 border-b border-[#004D40]/10">
          <p className="text-[11px] font-hanken font-bold text-[#004D40]/70 uppercase tracking-widest mb-1.5">Report Type</p>
          {allReports && onReportChange ? (
            <Select value={selectedReport} onValueChange={(val) => {
              const r = allReports.find((x) => x.id === val);
              if (r) onReportChange(val, r.moduleId);
            }}>
              <SelectTrigger className="w-full h-9 bg-white border border-[#004D40]/20 rounded-md px-3 py-2 text-sm font-semibold font-hanken text-gray-700 focus:ring-1 focus:ring-[#004D40] shadow-sm">
                <SelectValue placeholder="Select Report" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {allReports.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="font-hanken text-[13px] font-medium text-gray-700">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h2 className="text-[15px] font-bold font-hanken text-gray-800 leading-snug">{displayTitle} Report</h2>
          )}
        </div>

        {/* Period Picker (Month or Date range) */}
        {showPeriodPicker && period && (
          <div className="px-5 py-4 border-b border-[#004D40]/10">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-hanken font-bold text-[#004D40]/70 uppercase tracking-wider">Select Period</label>
              {supportsDateMode && (
                <div className="inline-flex items-center rounded-full border border-[#004D40]/20 bg-white p-0.5 text-[10px] font-hanken font-bold shadow-sm">
                  {(['month', 'date'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => period.setMode(m)}
                      className={`rounded-full px-2.5 py-1 capitalize transition-all duration-150 ${
                        period.mode === m ? 'bg-[#004D40] text-white shadow' : 'text-[#004D40]/60 hover:text-[#004D40]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <p className="text-[10px] text-[#004D40]/60 font-bold mb-1 ml-1 uppercase font-hanken">From</p>
                {period.mode === 'month' ? (
                  <Input
                    type="month"
                    value={period.fromMonthStr}
                    max={period.toMonthStr || currentMonthStr()}
                    onChange={(e) => period.setFromMonthStr(e.target.value)}
                    className="h-9 w-full bg-white border border-[#004D40]/20 rounded-md px-2 py-2 text-sm font-semibold font-hanken text-gray-700 focus-visible:ring-1 focus-visible:ring-[#004D40]"
                  />
                ) : (
                  <Input
                    type="date"
                    value={period.fromDateStr}
                    max={period.toDateStr || todayStr()}
                    onChange={(e) => period.setFromDateStr(e.target.value)}
                    className="h-9 w-full bg-white border border-[#004D40]/20 rounded-md px-2 py-2 text-sm font-semibold font-hanken text-gray-700 focus-visible:ring-1 focus-visible:ring-[#004D40]"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-[#004D40]/60 font-bold mb-1 ml-1 uppercase font-hanken">To</p>
                {period.mode === 'month' ? (
                  <Input
                    type="month"
                    value={period.toMonthStr}
                    min={period.fromMonthStr}
                    max={currentMonthStr()}
                    onChange={(e) => period.setToMonthStr(e.target.value)}
                    className="h-9 w-full bg-white border border-[#004D40]/20 rounded-md px-2 py-2 text-sm font-semibold font-hanken text-gray-700 focus-visible:ring-1 focus-visible:ring-[#004D40]"
                  />
                ) : (
                  <Input
                    type="date"
                    value={period.toDateStr}
                    min={period.fromDateStr}
                    max={todayStr()}
                    onChange={(e) => period.setToDateStr(e.target.value)}
                    className="h-9 w-full bg-white border border-[#004D40]/20 rounded-md px-2 py-2 text-sm font-semibold font-hanken text-gray-700 focus-visible:ring-1 focus-visible:ring-[#004D40]"
                  />
                )}
              </div>
            </div>
            <p className="mt-1 text-[12px] text-[#004D40]/60 font-medium text-center font-hanken">{period.label}</p>
          </div>
        )}

        {/* Custom Sections (e.g., Checkboxes) */}
        {sectionsPanel && (
          <div className="px-5 py-4 flex-1 border-b border-[#004D40]/10">
            <p className="text-[11px] font-hanken font-bold text-[#004D40]/70 uppercase tracking-wider mb-3">Sections to Include</p>
            {sectionsPanel}
          </div>
        )}

      </div>

      {/* ── Right Preview Panel ── */}
      <div className="flex-1 bg-transparent overflow-y-auto h-full flex flex-col">
        {/* Header bar (Breadcrumb + Actions) */}
        <div className="shrink-0 px-6 py-3 border-b border-[#004D40]/20 bg-[#F4F1E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold font-hanken text-[#004D40]/70 uppercase tracking-wide">Preview</span>
            <span className="text-[#004D40]/30 text-sm font-bold">›</span>
            <span className="text-[12px] font-bold font-hanken text-[#004D40]">{displayTitle} PDF</span>
            {showPeriodPicker && period && (
              <>
                <span className="text-[#004D40]/30 text-sm font-bold">·</span>
                <span className="text-[12px] font-bold font-hanken text-[#004D40]/70">{period.label}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onDownloadXlsx && (
              <Button
                onClick={onDownloadXlsx}
                disabled={isGeneratingXlsx || isLoading || !hasData}
                className="flex items-center justify-center gap-2 bg-[#004D40] font-hanken hover:bg-[#00382e] text-white rounded-md px-4 py-2 h-auto text-[13px] font-bold tracking-wide transition-colors shadow-sm"
              >
                {isGeneratingXlsx ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download XLSX
              </Button>
            )}
            <Button
              onClick={onDownload}
              disabled={!pdfBlobUrl || isGenerating || isLoading || !hasData}
              className="flex items-center justify-center gap-2 bg-[#004D40] font-hanken hover:bg-[#00382e] text-white rounded-md px-4 py-2 h-auto text-[13px] font-bold tracking-wide transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 p-6 flex items-stretch">
          <div className="flex-1 bg-white rounded-xl shadow-md border border-[#004D40]/10 overflow-hidden flex flex-col">
            {isLoading || isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-[#004D40]/60">
                <Loader size="lg" className="mb-4 text-[#004D40]" />
                <p className="text-sm font-hanken font-bold">Generating PDF Preview...</p>
              </div>
            ) : !hasData ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-base font-hanken font-bold text-[#004D40]">No preview available</p>
                <p className="text-sm font-hanken mt-1.5 text-gray-500">No data found for the selected period</p>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full flex-1 border-0"
                title={`${displayTitle} PDF Preview`}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center font-hanken font-bold text-[#004D40]/60 text-sm">
                Could not generate PDF.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
