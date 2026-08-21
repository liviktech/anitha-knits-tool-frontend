import { useMemo, useState, type ReactNode } from 'react';
import { companies as seedCompanies, type Company } from './mock-data';
import { CompaniesContext, type CompaniesContextValue } from './companies-store';

function formatNow() {
  return new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Holds the Livik Admin panel's company list in memory so Add/Edit made from
 * the Companies table are reflected on Company Details too — there's no
 * backend for this panel yet, so this context is the only shared state.
 */
export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(seedCompanies);

  const value = useMemo<CompaniesContextValue>(
    () => ({
      companies,
      addCompany: (input) => {
        const now = formatNow();
        const created: Company = { ...input, id: String(Date.now()), createdAt: now, updatedAt: now };
        setCompanies((current) => [...current, created]);
        return created;
      },
      updateCompany: (id, input) => {
        setCompanies((current) =>
          current.map((c) => (c.id === id ? { ...c, ...input, updatedAt: formatNow() } : c)),
        );
      },
    }),
    [companies],
  );

  return <CompaniesContext.Provider value={value}>{children}</CompaniesContext.Provider>;
}
