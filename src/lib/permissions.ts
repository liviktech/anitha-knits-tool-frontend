/**
 * Stable rightName strings for the modules with frontend permission gating (Production,
 * Employees, Inventory). Must match the backend's derivation exactly — see
 * rightService.ts's deriveRightName on the backend: `${moduleCode}_${tabCode ?? 'all'}_${action}`,
 * lowercased. moduleCode/tabCode values come from defaultAccessCatalog.ts.
 *
 * These are NOT looked up per-user — Right/Module/Tab CRUD is admin-only, so a non-admin
 * frontend session can't self-discover its own rightNames. The format is stable by
 * construction (derived from fixed moduleCode/tabCode/action, never from a database id), which
 * is exactly why the backend documents rightName as the frontend-safe identifier.
 */
export const RIGHTS = {
  production: {
    view: 'productiondetails_all_view',
    add: 'productiondetails_all_add',
    edit: 'productiondetails_all_edit',
    delete: 'productiondetails_all_delete',
  },
  employees: {
    directory: {
      view: 'employees_directory_view',
      add: 'employees_directory_add',
      edit: 'employees_directory_edit',
      delete: 'employees_directory_delete',
    },
    attendance: {
      view: 'employees_attendance_view',
      // The bulk mark/update-attendance call is a single create-or-update action, gated as EDIT
      // on the backend (see attendanceService.upsertDailyAttendance) — there is no separate ADD.
      edit: 'employees_attendance_edit',
    },
    payroll: {
      view: 'employees_payroll_view',
      add: 'employees_payroll_add',
      edit: 'employees_payroll_edit',
      delete: 'employees_payroll_delete',
    },
  },
  inventory: {
    view: 'inventory_all_view',
    add: 'inventory_all_add',
    edit: 'inventory_all_edit',
    delete: 'inventory_all_delete',
  },
  expenses: {
    view: 'expenses_all_view',
    add: 'expenses_all_add',
    edit: 'expenses_all_edit',
    delete: 'expenses_all_delete',
  },
  adminPanel: {
    productionConfig: {
      view: 'admin_panel_production-config_view',
      add: 'admin_panel_production-config_add',
      edit: 'admin_panel_production-config_edit',
      delete: 'admin_panel_production-config_delete',
    },
    openingBalance: {
      view: 'admin_panel_opening-balance_view',
      add: 'admin_panel_opening-balance_add',
      edit: 'admin_panel_opening-balance_edit',
      delete: 'admin_panel_opening-balance_delete',
    },
    rawMaterials: {
      view: 'admin_panel_raw-materials_view',
      add: 'admin_panel_raw-materials_add',
      edit: 'admin_panel_raw-materials_edit',
      delete: 'admin_panel_raw-materials_delete',
    },
  },
} as const;
