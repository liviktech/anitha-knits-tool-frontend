import { Button } from '@/components/ui/button';

export function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
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

interface TablePaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Prev/page-number/next buttons, matching the pagination used on the Day Wise Production & Wastage Details table. */
export function TablePaginationControls({ currentPage, totalPages, onPageChange }: TablePaginationControlsProps) {
  return (
    <div className="flex flex-wrap gap-1 items-center">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-md border-gray-200 text-gray-900"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
      >
        &lt;
      </Button>
      {getPageNumbers(currentPage, totalPages).map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
        ) : (
          <Button
            key={p}
            variant={p === currentPage ? 'outline' : 'ghost'}
            size="icon"
            className={p === currentPage ? 'h-5 w-5 rounded-sm bg-[#004D40] text-white text-xs hover:bg-[#00382e] border-[#004D40]' : 'h-5 w-5 rounded-sm text-xs text-gray-600 hover:bg-gray-100'}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-md border-gray-200 text-gray-900"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        &gt;
      </Button>
    </div>
  );
}

interface RowsPerPageSelectProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
}

export function RowsPerPageSelect({ pageSize, onPageSizeChange, options = [10, 20, 50] }: RowsPerPageSelectProps) {
  return (
    <div className="flex items-center gap-2 font-medium text-gray-900 text-xs">
      Rows per page :
      <select
        className="border border-gray-400 rounded-md px-2 py-1.5 text-gray-700 font-semibold bg-white"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      >
        {options.map((size) => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </div>
  );
}
