import { createContext, useContext } from 'react';
import type { Company } from './mock-data';

export interface CompaniesContextValue {
  companies: Company[];
  addCompany: (input: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Company;
  updateCompany: (id: string, input: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const CompaniesContext = createContext<CompaniesContextValue | null>(null);

export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) throw new Error('useCompanies must be used within CompaniesProvider');
  return ctx;
}
