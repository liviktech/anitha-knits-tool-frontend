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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-[#004D40] hover:bg-[#003D33]"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending && <Loader className="mr-2" />}
            {isPending ? 'Approving...' : 'Approve'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
