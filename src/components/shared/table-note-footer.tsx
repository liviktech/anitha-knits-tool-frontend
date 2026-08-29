interface TableNoteFooterProps {
  note?: string;
}

/** Matches the note bar in the Day Wise Production & Wastage Details table footer. */
export function TableNoteFooter({ note = 'All weights are measured in Kilogram (KG)' }: TableNoteFooterProps) {
  return (
    <div className="border-t border-gray-300 p-2 text-sm text-gray-500 bg-white">
      <div className="font-medium text-gray-600 text-xs">{note}</div>
    </div>
  );
}
