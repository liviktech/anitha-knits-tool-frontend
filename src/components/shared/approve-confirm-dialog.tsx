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

interface ApproveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isPending?: boolean;
}

/** Admin-only, one-way approval — mirrors DeleteConfirmDialog's shape/props but with non-destructive styling. */
export function ApproveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Approve this entry?',
  description = 'Once approved, it can no longer be edited or deleted by a Manager — this cannot be undone.',
  isPending = false,
}: ApproveConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <AlertDialogContent className="sm:max-w-md border border-gray-400">
        <AlertDialogHeader className="-mx-4 -mt-4 mb-2 flex items-center text-left rounded-t-xl border-b border-gray-200 bg-[#A8DCAB] px-4 py-3">
          <AlertDialogTitle className="text-lg font-bold text-black">{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-sm text-gray-600">{description}</AlertDialogDescription>
        <AlertDialogFooter className="border-gray-200 bg-white">
          <AlertDialogCancel disabled={isPending} className="h-8 text-xs">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="h-8 text-xs bg-[#004D40] hover:bg-[#00332a]"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending && <Loader size="sm" className="mr-1.5" />}
            {isPending ? 'Approving...' : 'Approve'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
