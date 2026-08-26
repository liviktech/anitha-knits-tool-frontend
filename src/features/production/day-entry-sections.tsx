import { sumWastageByCode } from '@/lib/api-types';
import type { ExtruderProductionItem } from '@/features/extruder/extruder-queries';

/**
 * Shared between the day-close view (day-details.tsx) and the entry modal
 * (new-entry.tsx) — both render the exact same summary + category sections,
 * so the markup lives here once instead of being duplicated per file.
 */

interface DaySummary {
  dnPlusKg: string;
  wasteKg: string;
  efficiencyPct: string;
  checkedKg: string;
}

export function DaySummaryCards({ dnPlusKg, wasteKg, efficiencyPct, checkedKg }: DaySummary) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 mt-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-green-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">DN+</p>
        <p className="mt-1 text-xl font-bold text-green-600">
          {dnPlusKg} <span className="text-2xs font-normal text-gray-400">kg</span>
        </p>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Waste</p>
        <p className="mt-1 text-xl font-bold text-red-600">
          {wasteKg} <span className="text-2xs font-normal text-gray-400">kg</span>
        </p>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Efficiency</p>
        <p className="mt-1 text-xl font-bold text-blue-600">{efficiencyPct}%</p>
        <div className="mt-2 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${efficiencyPct}%` }} />
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-purple-500" />
        <p className="text-2xs font-semibold uppercase tracking-wide text-gray-500">Checked</p>
        <p className="mt-1 text-xl font-bold text-purple-600">
          {checkedKg} <span className="text-2xs font-normal text-gray-400">kg</span>
        </p>
      </div>
    </div>
  );
}

export const themes = {
  extruder: {
    border: 'border-gray-400',
    headerBg: 'bg-[#D6EEF7]',
    headerText: 'text-[#0B5566]',
    iconBg: 'bg-[#0B5566]',
    iconColor: 'text-white',
    iconHoverBg: 'hover:bg-[#5AAAC8]',
    iconHoverColor: 'hover:text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
  looms: {
    border: 'border-gray-400',
    headerBg: 'bg-[#FFF6BF]',
    headerText: 'text-[#7A6A00]',
    iconBg: 'bg-[#7A6A00]',
    iconColor: 'text-white',
    iconHoverBg: 'hover:bg-[#C5B238]',
    iconHoverColor: 'hover:text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
  fabric: {
    border: 'border-gray-400',
    headerBg: 'bg-[#DCEEDB]',
    headerText: 'text-[#2F6B2F]',
    iconBg: 'bg-[#2F6B2F]',
    iconColor: 'text-white',
    iconHoverBg: 'hover:bg-[#469646]',
    iconHoverColor: 'hover:text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
  fabricDelivered: {
    border: 'border-gray-400',
    headerBg: 'bg-[#f2caa0]',
    headerText: 'text-[#61401E]',
    iconBg: 'bg-[#61401E]',
    iconColor: 'text-white',
    iconHoverBg: 'hover:bg-[#e4b88e]',
    iconHoverColor: 'hover:text-white',
    buttonBorder: 'border-gray-300',
    buttonText: 'text-gray-700',
    buttonHover: 'hover:bg-gray-50 hover:text-gray-900',
  },
} as const;

export type Theme = keyof typeof themes;

export interface ExtruderRow {
  id: string;
  size: string;
  color: string;
  brand: string;
  chemical: string;
  raw: number;
  chemicalKg: number;
  output: number;
  colorConsumedKg: number;
  lumpsKg: number;
  yarnWasteKg: number;
}

export function mapExtruderItem(item: ExtruderProductionItem): ExtruderRow {
  return {
    id: item.id,
    size: item.size?.name ?? '',
    color: item.color?.name ?? '',
    brand: item.extruder?.brand?.name ?? '',
    chemical: item.extruder?.chemical?.name ?? '',
    raw: item.extruder?.rawMaterialKg ?? 0,
    chemicalKg: item.extruder?.chemicalKg ?? 0,
    output: item.extruder?.yarnOutputKg ?? 0,
    colorConsumedKg: item.extruder?.colorConsumedKg ?? 0,
    lumpsKg: sumWastageByCode(item.wastages, 'LUMPS'),
    yarnWasteKg: sumWastageByCode(item.wastages, 'YARN_WASTE'),
  };
}

export interface ExtruderDraft {
  size: string;
  color: string;
  brand: string;
  chemical: string;
  raw: string;
  chemicalKg: string;
  output: string;
  colorConsumedKg: string;
  lumpsKg: string;
  yarnWasteKg: string;
}

export const emptyExtruderDraft: ExtruderDraft = { size: '', color: '', brand: '', chemical: '', raw: '', chemicalKg: '', output: '', colorConsumedKg: '', lumpsKg: '', yarnWasteKg: '' };

/** One pending (unsaved) new-entry row — several of these can be open at once. */
export interface ExtruderNewRow {
  key: string;
  draft: ExtruderDraft;
  outputManuallyEdited: boolean;
}

/**
 * Suggests Yarn Output as a mass balance — raw material + chemical + colour
 * consumed, minus recorded waste — so it pre-fills as the user enters
 * input/waste but can still be typed over freely (see outputManuallyEdited).
 * Chemical/colour mass is ADDED during extrusion (PRD), so this is not a
 * simple input-minus-waste subtraction. Never negative; blank until there's
 * something to suggest.
 */
export function suggestExtruderOutput(draft: Pick<ExtruderDraft, 'raw' | 'chemicalKg' | 'colorConsumedKg' | 'lumpsKg' | 'yarnWasteKg'>): string {
  const inputMassKg = (parseFloat(draft.raw) || 0) + (parseFloat(draft.chemicalKg) || 0) + (parseFloat(draft.colorConsumedKg) || 0);
  const wasteKg = (parseFloat(draft.lumpsKg) || 0) + (parseFloat(draft.yarnWasteKg) || 0);
  const suggested = Math.max(0, inputMassKg - wasteKg);
  return suggested > 0 ? suggested.toFixed(2) : '';
}

/**
 * Extruder is the only category wired to the real API so far (CRUD only —
 * there's no delete endpoint, and approve/reject/pending status handling is
 * out of scope for now). Loom and Fabric below stay on static mock data
 * until their endpoints are available.
 *
 * Fields match the real ExtruderCreateRequest exactly (additionalProperties
 * is false server-side, so extra fields would be rejected): productionDate
 * defaults to today since this compact view has no date column;
 * colorConsumedKg is omitted so the backend auto-computes it from the
 * colour's configured standard. Waste isn't a real API field — the table
 * shows rawMaterialKg and yarnOutputKg (both real), not a derived waste
 * column, to avoid implying a value the backend doesn't track per-record.
 */
export interface SectionProps {
  /** ISO date (yyyy-MM-dd) new rows are recorded against; defaults to today. */
  productionDate?: string;
  autoAdd?: boolean;
  /** View-only: hides Add row / Edit actions and renders existing rows as plain text. */
  readOnly?: boolean;
  /**
   * "Add New Entry" is a pure create flow, not a browse-and-edit one — it
   * must always present a blank draft, even when the selected date already
   * has records. Skips fetching/showing existing rows entirely so it can't
   * be confused with the Edit flow.
   */
  hideExisting?: boolean;
  /** Hides the colored title banner when rendered inside a tab. */
  hideBanner?: boolean;
  onEditExtruderGroup?: (group: any) => void;
  onEditLoomGroup?: (group: any) => void;
  onEditFabricGroup?: (group: any) => void;
  onEditDeliveredGroup?: (group: any) => void;
}

export interface SectionRef {
  saveDraft: () => Promise<boolean>;
  addExtruderGroup?: (group: any) => void;
  updateExtruderGroup?: (group: any) => void;
  addLoomRow?: (draft: any) => void;
  updateLoomRow?: (draft: any) => void;
  addFabricRow?: (draft: any) => void;
  updateFabricRow?: (draft: any) => void;
  addDeliveredRow?: (draft: any) => void;
  updateDeliveredRow?: (draft: any) => void;
}

export { ExtruderSection } from '@/features/extruder/extruder-section-new';

export * from '@/features/looms/loom-section';
export * from '@/features/fabric/fabric-section';
export * from '@/features/inventory/fabric-delivered-section';



