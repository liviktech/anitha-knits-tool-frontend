import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader } from '@/components/shared/loader';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isPending?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Delete this entry?',
  description = 'This action cannot be undone.',
  isPending = false,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <AlertDialogContent className="sm:max-w-md border border-gray-400 gap-2 p-3">
        <AlertDialogHeader className="-mx-3 -mt-3 flex items-center text-left rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-3 py-2">
          <AlertDialogTitle className="text-lg font-bold text-black">{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-sm text-gray-600">{description}</AlertDialogDescription>
        <AlertDialogFooter className="-mx-3 -mb-3 p-3 pt-2 border-gray-200 bg-white">
          <AlertDialogCancel disabled={isPending} className="h-8 text-xs">Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            className="h-8 text-xs"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending && <Loader size="sm" className="mr-1.5" />}
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
