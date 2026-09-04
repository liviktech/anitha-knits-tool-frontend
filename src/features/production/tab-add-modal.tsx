import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  entryType?: 'PRODUCTION' | 'SAMPLE';
}

export function TabAddModal({
  isOpen, onClose, activeTab, productionDate,
  initialExtruderData, initialLoomData, initialFabricData, initialDeliveredData,
  isEditMode, entryType = 'PRODUCTION'
}: TabAddModalProps) {
  const activeThemeKey = activeTab === 'delivered' ? 'fabricDelivered' : activeTab as Theme;
  const theme = themes[activeThemeKey];
  const maxWidth = activeTab === 'extruder' ? 'sm:max-w-[600px]' : 'sm:max-w-[500px]';

  const getTitle = () => {
    const prefix = isEditMode ? 'Edit' : 'Add';
    switch (activeTab) {
      case 'extruder': return `${prefix} Extruder Production Details`;
      case 'looms': return `${prefix} Looms Production Details`;
      case 'fabric': return `${prefix} Fabric Checking Details`;
      case 'delivered': return `${prefix} Fabric Delivered Details`;
      default: return `${prefix} Details`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className={`!bg-white shadow-2xl ${maxWidth} max-h-[90vh] flex flex-col border-2 ${theme.border} p-0 overflow-hidden`}>
        <DialogHeader className={`p-3 pb-2 border-b border-gray-200 ${theme.headerBg} shrink-0`}>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className={`text-lg font-extrabold tracking-wider ${theme.headerText}`}>
              {getTitle()}
            </DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`shrink-0 text-xs font-semibold ${theme.headerText} bg-white/70 border ${theme.border} rounded-md px-2.5 py-1`}>
                {format(parseISO(productionDate), 'dd MMM, yyyy')}
              </span>
              <DialogClose asChild>
                <Button variant="ghost" size="icon-sm" className={`bg-red-700 text-white cursor-pointer hover:bg-red-400 focus:ring-red-400`}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2.5">
          {activeTab === 'extruder' ? (
            <ExtruderModalForm
              productionDate={productionDate}
              initialData={initialExtruderData}
              isEditMode={isEditMode}
              entryType={entryType}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : activeTab === 'looms' ? (
            <LoomModalForm
              productionDate={productionDate}
              initialData={initialLoomData}
              isEditMode={isEditMode}
              entryType={entryType}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : activeTab === 'fabric' ? (
            <FabricModalForm
              productionDate={productionDate}
              initialData={initialFabricData}
              isEditMode={isEditMode}
              entryType={entryType}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : activeTab === 'delivered' ? (
            <FabricDeliveredModalForm
              productionDate={productionDate}
              initialData={initialDeliveredData}
              isEditMode={isEditMode}
              entryType={entryType}
              onCancel={onClose}
              onSuccess={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
