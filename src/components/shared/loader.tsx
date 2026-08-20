import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const loaderSizeClasses = {
  sm: 'h-3 w-3',
  default: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
} as const;

interface LoaderProps {
  size?: keyof typeof loaderSizeClasses;
  className?: string;
}

export function Loader({ size = 'default', className }: LoaderProps) {
  return <Loader2 className={cn(loaderSizeClasses[size], 'animate-spin', className)} />;
}
