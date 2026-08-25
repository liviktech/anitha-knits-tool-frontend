import React from 'react';
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
  initialExtruderData?: ExtruderGroupDraft | null;
  initialLoomData?: LoomDraft | null;
  initialFabricData?: FabricDraft | null;
  initialDeliveredData?: FabricDeliveredDraft | null;
  isEditMode?: boolean;
  onSaveExtruder?: (data: ExtruderGroupDraft) => void;
  onSaveLoom?: (data: LoomDraft) => void;
  onSaveFabric?: (data: FabricDraft) => void;
  onSaveDelivered?: (data: FabricDeliveredDraft) => void;
}

export function TabAddModal({
  isOpen, onClose, activeTab,
  initialExtruderData, initialLoomData, initialFabricData, initialDeliveredData,
  isEditMode,
  onSaveExtruder, onSaveLoom, onSaveFabric, onSaveDelivered
}: TabAddModalProps) {
  const activeThemeKey = activeTab === 'delivered' ? 'fabricDelivered' : activeTab as Theme;
  const theme = themes[activeThemeKey];

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
      <DialogContent className={`!bg-white shadow-2xl sm:max-w-[1000px] max-h-[90vh] flex flex-col border-2 ${theme.border} p-0 overflow-hidden`}>
        <DialogHeader className={`p-4 pb-4 border-b border-gray-200 ${theme.headerBg} shrink-0`}>
          <DialogTitle className={`text-lg font-extrabold uppercase tracking-wider ${theme.headerText}`}>
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2.5">
          {activeTab === 'extruder' ? (
            <ExtruderModalForm
              initialData={initialExtruderData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSave={(data) => {
                if (onSaveExtruder) onSaveExtruder(data);
                onClose();
              }}
            />
          ) : activeTab === 'looms' ? (
            <LoomModalForm
              initialData={initialLoomData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSave={(data) => {
                if (onSaveLoom) onSaveLoom(data);
                onClose();
              }}
            />
          ) : activeTab === 'fabric' ? (
            <FabricModalForm
              initialData={initialFabricData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSave={(data) => {
                if (onSaveFabric) onSaveFabric(data);
                onClose();
              }}
            />
          ) : activeTab === 'delivered' ? (
            <FabricDeliveredModalForm
              initialData={initialDeliveredData}
              isEditMode={isEditMode}
              onCancel={onClose}
              onSave={(data) => {
                if (onSaveDelivered) onSaveDelivered(data);
                onClose();
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
