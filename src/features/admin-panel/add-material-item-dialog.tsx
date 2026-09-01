import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/shared/loader';
import { useTranslation } from 'react-i18next';

interface AddMaterialItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: string;
  onSubmit: (name: string) => Promise<boolean>;
  /** Present when editing an existing item instead of adding a new one. */
  initialName?: string | null;
  isPending?: boolean;
  /** Server-side error surfaced by the calling mutation (e.g. a name-conflict response). */
  serverError?: string | null;
}

export function AddMaterialItemDialog({
  open,
  onOpenChange,
  categoryLabel,
  onSubmit,
  initialName,
  isPending = false,
  serverError,
}: AddMaterialItemDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = initialName != null;

  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
      setFormError(null);
    }
  }, [open, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError(t('dialogs.rawMaterials.nameError', 'Please enter a name.'));
      return;
    }
    setFormError(null);
    const ok = await onSubmit(name.trim());
    if (ok) onOpenChange(false);
  };

  const displayError = formError ?? serverError;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-sm border border-gray-400">
        <DialogHeader className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <DialogTitle className="text-black">{isEdit ? t('dialogs.rawMaterials.editTitle', 'Edit {{category}}', { category: categoryLabel }) : t('dialogs.rawMaterials.addTitle', 'Add {{category}}', { category: categoryLabel })}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <Label htmlFor="material-item-name" className="text-xs font-semibold text-gray-600">{t('common.name', 'Name')}</Label>
          <Input
            id="material-item-name"
            placeholder={t('dialogs.rawMaterials.namePlaceholder', 'e.g. {{category}} name', { category: categoryLabel })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {displayError && <p className="text-xs text-red-600">{displayError}</p>}

        <DialogFooter className="border-gray-200 bg-white">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>{t('common.cancel', 'Cancel')}</Button>
          <Button size="sm" className="bg-[#004D40] hover:bg-[#00332a]" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader size="sm" className="mr-2" />}
            {isEdit ? t('common.update', 'Update') : t('common.add', 'Add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
