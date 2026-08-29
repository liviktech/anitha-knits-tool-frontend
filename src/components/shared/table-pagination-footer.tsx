import { TablePaginationControls, RowsPerPageSelect } from '@/components/shared/table-pagination-controls';

interface TablePaginationFooterProps {
  note?: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

/** Matches the pagination footer used on the Day Wise Production & Wastage Details table. */
export function TablePaginationFooter({
  note = 'All weights are measured in Kilogram (KG)',
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: TablePaginationFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 p-2 text-sm text-gray-500 bg-white">
      <div className="font-medium text-gray-600 text-xs">{note}</div>
      <TablePaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      <RowsPerPageSelect pageSize={pageSize} onPageSizeChange={onPageSizeChange} options={pageSizeOptions} />
    </div>
  );
}
