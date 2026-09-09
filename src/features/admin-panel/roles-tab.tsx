import { useMemo, useState } from 'react';
import { Award, Layers, ShieldCheck, Users } from 'lucide-react';
import { Loader } from '@/components/shared/loader';
import { useEmployees } from '@/features/employee/employee-queries';
import {
  useAssignRoleAccess,
  useCreateRight,
  useCreateRoleAccess,
  useDeleteRight,
  useDeleteRoleAccess,
  useModules,
  useRights,
  useRoleAccesses,
  useTabs,
  useUnassignRoleAccess,
  useUpdateRight,
  useUpdateRoleAccess,
} from './roles-tab-queries';
import { RolesSubTab } from './roles-subtab';
import { RightsSubTab } from './rights-subtab';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function RolesTab() {
  const [subTab, setSubTab] = useState<'roles' | 'rights'>('roles');

  const modulesQuery = useModules();
  const tabsQuery = useTabs();
  const rightsQuery = useRights();
  const roleAccessQuery = useRoleAccesses();
  const employeesQuery = useEmployees('limit=100');

  const createRight = useCreateRight();
  const updateRight = useUpdateRight();
  const deleteRight = useDeleteRight();

  const createRoleAccess = useCreateRoleAccess();
  const updateRoleAccess = useUpdateRoleAccess();
  const deleteRoleAccess = useDeleteRoleAccess();
  const assignRoleAccess = useAssignRoleAccess();
  const unassignRoleAccess = useUnassignRoleAccess();

  const modules = modulesQuery.data ?? [];
  const tabs = tabsQuery.data ?? [];
  const rights = rightsQuery.data ?? [];
  const roles = roleAccessQuery.data ?? [];
  const employees = employeesQuery.data ?? [];

  const roleEmployeeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    employees.forEach((e) => {
      if (e.roleAccessId) counts.set(e.roleAccessId, (counts.get(e.roleAccessId) ?? 0) + 1);
    });
    return counts;
  }, [employees]);

  const mostActiveRole = useMemo(() => {
    if (roles.length === 0) return null;
    return roles.reduce((best, r) => {
      const count = roleEmployeeCounts.get(r.id) ?? 0;
      const bestCount = roleEmployeeCounts.get(best.id) ?? 0;
      return count > bestCount ? r : best;
    }, roles[0]);
  }, [roles, roleEmployeeCounts]);

  const recentActivityCount = useMemo(() => {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const countRecent = (items: { createdAt: string }[]) => items.filter((i) => new Date(i.createdAt).getTime() >= cutoff).length;
    return countRecent(roles) + countRecent(rights);
  }, [roles, rights]);

  const isLoading = modulesQuery.isLoading || tabsQuery.isLoading || rightsQuery.isLoading || roleAccessQuery.isLoading || employeesQuery.isLoading;
  const isError = modulesQuery.isError || tabsQuery.isError || rightsQuery.isError || roleAccessQuery.isError || employeesQuery.isError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
        <Loader size="xl" className="text-[#004D40]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm font-semibold text-gray-900">Unable to load roles &amp; rights.</p>
        <p className="text-xs text-gray-500">Please try again.</p>
        <button
          type="button"
          onClick={() => {
            modulesQuery.refetch();
            tabsQuery.refetch();
            rightsQuery.refetch();
            roleAccessQuery.refetch();
            employeesQuery.refetch();
          }}
          className="rounded-lg bg-[#004D40] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#003D33]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-hidden py-1 px-3 flex-1 min-h-0">
      <div className="border-b border-gray-200 shrink-0">
        <nav className="-mb-px flex items-center gap-5">
          {(['roles', 'rights'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSubTab(tab)}
              className={`flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pt-1 text-[14px] font-semibold transition-colors ${subTab === tab
                ? 'border-[#004D40] text-[#004D40]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab === 'roles' ? (
                <Users className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {tab === 'roles' ? 'Roles' : 'Rights'}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 shrink-0">
        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              Total Roles
            </span>
            <span className="block text-[20px] font-bold leading-tight text-gray-900">
              {roles.length}
            </span>
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#004D40]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              System Rights
            </span>
            <span className="block text-[20px] font-bold leading-tight text-gray-900">
              {rights.length}
            </span>
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              Most Active
            </span>
            <span className="block truncate text-[16px] font-bold leading-tight text-gray-900">
              {mostActiveRole ? mostActiveRole.roleName : '—'}
            </span>
          </div>
        </div>

        <div className="flex min-h-[72px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#004D40]/10 text-[#004D40]">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              Recent Updates
            </span>
            <span className="block text-[20px] font-bold leading-tight text-gray-900">
              {recentActivityCount}
            </span>
          </div>
        </div>
      </div>

      {subTab === 'roles' && (
        <RolesSubTab
          roles={roles}
          rights={rights}
          employees={employees}
          roleEmployeeCounts={roleEmployeeCounts}
          createRoleAccess={createRoleAccess}
          updateRoleAccess={updateRoleAccess}
          deleteRoleAccess={deleteRoleAccess}
          assignRoleAccess={assignRoleAccess}
          unassignRoleAccess={unassignRoleAccess}
        />
      )}

      {subTab === 'rights' && (
        <RightsSubTab
          rights={rights}
          modules={modules}
          tabs={tabs}
          createRight={createRight}
          updateRight={updateRight}
          deleteRight={deleteRight}
        />
      )}
    </div>
  );
}
