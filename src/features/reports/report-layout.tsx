import { Loader } from '@/components/shared/loader';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function getMonthName(monthStr?: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface ReportLayoutProps {
  displayTitle: string;
  allReports?: { id: string; label: string; moduleId: string }[];
  selectedReport?: string;
  onReportChange?: (tabId: string, moduleId: string) => void;
  
  // Date/Month range picker
  fromMonthStr?: string;
  toMonthStr?: string;
  onFromMonthChange?: (val: string) => void;
  onToMonthChange?: (val: string) => void;
  showMonthPicker?: boolean;

  // Custom sections (like checkboxes)
  sectionsPanel?: React.ReactNode;

  // PDF Preview State
  pdfBlobUrl: string | null;
  isGenerating: boolean;
  isLoading?: boolean;
  onDownload: () => void;
  onDownloadXlsx?: () => void;
  isGeneratingXlsx?: boolean;
  
  // Optional date format for the download file name fallback
  downloadFileName?: string;
}

export function ReportLayout({
  displayTitle,
  allReports,
  selectedReport,
  onReportChange,
  fromMonthStr,
  toMonthStr,
  onFromMonthChange,
  onToMonthChange,
  showMonthPicker = false,
  sectionsPanel,
  pdfBlobUrl,
  isGenerating,
  isLoading,
  onDownload,
  onDownloadXlsx,
  isGeneratingXlsx,
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

        {/* Month Picker */}
        {showMonthPicker && onFromMonthChange && onToMonthChange && (
          <div className="px-5 py-4 border-b border-[#004D40]/10">
            <label className="block text-[11px] font-hanken font-bold text-[#004D40]/70 uppercase tracking-wider mb-2">Select Period</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <p className="text-[10px] text-[#004D40]/60 font-bold mb-1 ml-1 uppercase font-hanken">From</p>
                <Input
                  type="month"
                  value={fromMonthStr || ''}
                  max={toMonthStr || `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
                  onChange={(e) => onFromMonthChange(e.target.value)}
                  className="h-9 w-full bg-white border border-[#004D40]/20 rounded-md px-2 py-2 text-sm font-semibold font-hanken text-gray-700 focus-visible:ring-1 focus-visible:ring-[#004D40]"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-[#004D40]/60 font-bold mb-1 ml-1 uppercase font-hanken">To</p>
                <Input
                  type="month"
                  value={toMonthStr || ''}
                  min={fromMonthStr || ''}
                  max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
                  onChange={(e) => onToMonthChange(e.target.value)}
                  className="h-9 w-full bg-white border border-[#004D40]/20 rounded-md px-2 py-2 text-sm font-semibold font-hanken text-gray-700 focus-visible:ring-1 focus-visible:ring-[#004D40]"
                />
              </div>
            </div>
            {fromMonthStr && toMonthStr && (
              <p className="mt-1 text-[12px] text-[#004D40]/60 font-medium text-center font-hanken">
                {fromMonthStr === toMonthStr 
                  ? getMonthName(fromMonthStr) 
                  : `${getMonthName(fromMonthStr)} — ${getMonthName(toMonthStr)}`}
              </p>
            )}
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
            {showMonthPicker && fromMonthStr && toMonthStr && (
              <>
                <span className="text-[#004D40]/30 text-sm font-bold">·</span>
                <span className="text-[12px] font-bold font-hanken text-[#004D40]/70">
                  {fromMonthStr === toMonthStr 
                    ? getMonthName(fromMonthStr) 
                    : `${getMonthName(fromMonthStr)} - ${getMonthName(toMonthStr)}`}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onDownloadXlsx && (
              <Button
                onClick={onDownloadXlsx}
                disabled={isGeneratingXlsx || isLoading}
                variant="outline"
                className="flex items-center justify-center gap-2 border-[#004D40] font-hanken text-[#004D40] hover:bg-[#E0F2F1] rounded-md px-4 py-2 h-auto text-[13px] font-bold tracking-wide transition-colors shadow-sm"
              >
                {isGeneratingXlsx ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download XLSX
              </Button>
            )}
            <Button
              onClick={onDownload}
              disabled={!pdfBlobUrl || isGenerating || isLoading}
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
