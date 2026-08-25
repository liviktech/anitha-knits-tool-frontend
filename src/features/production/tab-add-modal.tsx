import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { themes, type Theme } from '@/features/production/day-entry-sections';
import { ExtruderModalForm } from './extruder-modal-form';
import type { ExtruderGroupDraft } from '@/features/extruder/extruder-section-new';

interface TabAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  initialExtruderData?: ExtruderGroupDraft | null;
  isEditMode?: boolean;
  onSaveExtruder?: (data: ExtruderGroupDraft) => void;
}

export function TabAddModal({ isOpen, onClose, activeTab, initialExtruderData, isEditMode, onSaveExtruder }: TabAddModalProps) {
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

        <div className="flex-1 overflow-y-auto p-6">
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
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
              <p className="font-medium mb-2">Form fields will be displayed here.</p>
              <p className="text-sm">The existing inline fields in the tabs have not been moved yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
