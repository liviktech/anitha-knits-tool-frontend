import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { themes, type Theme } from '@/features/production/day-entry-sections';
import { ExtruderModalForm } from './extruder-modal-form';
import type { ExtruderGroupDraft } from '@/features/extruder/extruder-section-new';
import { LoomModalForm } from './loom-modal-form';
import type { LoomDraft } from '@/features/looms/loom-section';
import { FabricModalForm } from './fabric-modal-form';
import type { FabricDraft } from '@/features/fabric/fabric-section';
import { FabricDeliveredModalForm } from '@/features/inventory/fabric-delivered-modal-form';
import type { FabricDeliveredDraft } from '@/features/inventory/fabric-delivered-section';

interface TabAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  productionDate: string;
  initialExtruderData?: ExtruderGroupDraft | null;
  initialLoomData?: LoomDraft | null;
  initialFabricData?: FabricDraft | null;
  initialDeliveredData?: FabricDeliveredDraft | null;
  isEditMode?: boolean;
  // Legacy callbacks kept for backward compatibility with pending-draft editing flow
  onSaveExtruder?: (data: ExtruderGroupDraft) => void;
  onSaveLoom?: (data: LoomDraft) => void;
  onSaveFabric?: (data: FabricDraft) => void;
  onSaveDelivered?: (data: FabricDeliveredDraft) => void;
}

export function TabAddModal({
  isOpen, onClose, activeTab, productionDate,
  initialExtruderData, initialLoomData, initialFabricData, initialDeliveredData,
  isEditMode,
}: TabAddModalProps) {
  const activeThemeKey = activeTab === 'delivered' ? 'fabricDelivered' : activeTab as Theme;
  const theme = themes[activeThemeKey];
  const maxWidth = activeTab === 'extruder' ? 'sm:max-w-[600px]' : 'sm:max-w-[500px]';

  const getTitle = () => {
    switch (activeTab) {
      case 'extruder': return 'Add Extruder Production Details';
      case 'looms': return 'Add Looms Production Details';
      case 'fabric': return 'Add Fabric Checking Details';
      case 'delivered': return 'Add Fabric Delivered Details';
      default: return 'Add Details';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className={`!bg-white shadow-2xl ${maxWidth} max-h-[90vh] flex flex-col border-2 ${theme.border} p-0 overflow-hidden`}>
        <DialogHeader className={`p-3 pb-2 pr-10 border-b border-gray-200 ${theme.headerBg} shrink-0`}>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className={`text-lg font-extrabold tracking-wider ${theme.headerText}`}>
              {getTitle()}
            </DialogTitle>
            <span className={`shrink-0 text-xs font-semibold ${theme.headerText} bg-white/70 border ${theme.border} rounded-md px-2.5 py-1`}>
              {format(parseISO(productionDate), 'dd MMM, yyyy')}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2.5">
          {activeTab === 'extruder' ? (
            <ExtruderModalForm
              productionDate={productionDate}
              initialData={initialExtruderData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : activeTab === 'looms' ? (
            <LoomModalForm
              productionDate={productionDate}
              initialData={initialLoomData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : activeTab === 'fabric' ? (
            <FabricModalForm
              productionDate={productionDate}
              initialData={initialFabricData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : activeTab === 'delivered' ? (
            <FabricDeliveredModalForm
              productionDate={productionDate}
              initialData={initialDeliveredData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
