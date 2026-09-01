import { createContext, useContext, type ReactNode } from 'react';

interface ProductionHeaderContextType {
  setHeaderRight: (node: ReactNode) => void;
  setShowBackButton: (show: boolean) => void;
  setOnBackClick: (cb: (() => void) | undefined) => void;
  setHeaderTitle: (title: string | null) => void;
}

export const ProductionHeaderContext = createContext<ProductionHeaderContextType | null>(null);

export function useProductionHeader() {
  const ctx = useContext(ProductionHeaderContext);
  if (!ctx) throw new Error('useProductionHeader must be used within ProductionLayout');
  return ctx;
}
