const STORAGE_KEY = 'dc-planner-state-v1';
const MTP_BASELINE_MIGRATION_KEY = 'dc-planner-mtp-baseline-v2';
const BOOKING_OFFICE_SCOPE_MIGRATION_KEY = 'dc-planner-booking-office-scope-v1';

export interface PlannerStorageState {
  roles: import('./types').Role[];
  resourceMapping: import('./types').ResourceMapping;
  themeMode: 'light' | 'dark';
  roleScope?: 'ops' | 'non-ops' | 'both';
  uploadedFiles: import('./types').UploadedFileRecord[];
}

export const defaultStorageState = (): PlannerStorageState => ({
  roles: [],
  resourceMapping: {
    absence: 0.1,
    holiday: 0.07,
    training: 0.02,
    fte: 206,
    leavers: 1.5,
    truckVolumeM3: 60,
    productivityTargetM3PerHour: 7.3,
    monthValues: {
        September: { absence: 0.10, holiday: 0.07, training: 0.02, fte: 206, leavers: 1.5 },
        October: { absence: 0.10, holiday: 0.08, training: 0.02, fte: 204, leavers: 1.5 },
        November: { absence: 0.10, holiday: 0.08, training: 0.02, fte: 203, leavers: 1.5 },
        December: { absence: 0.10, holiday: 0.16, training: 0.02, fte: 201, leavers: 1.5 },
        January: { absence: 0.10, holiday: 0.10, training: 0.07, fte: 200, leavers: 1.5 },
        February: { absence: 0.10, holiday: 0.14, training: 0.03, fte: 198, leavers: 1.5 },
        March: { absence: 0.10, holiday: 0.14, training: 0.04, fte: 197, leavers: 1.5 },
        April: { absence: 0.10, holiday: 0.15, training: 0.05, fte: 195, leavers: 1.5 },
        May: { absence: 0.10, holiday: 0.18, training: 0.065, fte: 194, leavers: 1.5 },
        June: { absence: 0.10, holiday: 0.20, training: 0.075, fte: 192, leavers: 1.5 },
        July: { absence: 0.10, holiday: 0.10, training: 0.06, fte: 191, leavers: 1.5 },
        August: { absence: 0.10, holiday: 0.07, training: 0.01, fte: 189, leavers: 1.5 }
    }
  },
  themeMode: 'light',
  roleScope: 'both',
  uploadedFiles: []
});

const monthOrder = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];

function applyFteCarryForward(resourceMapping: PlannerStorageState['resourceMapping']) {
  const monthValues: PlannerStorageState['resourceMapping']['monthValues'] = {};
  monthOrder.forEach((month, index) => {
    const current = resourceMapping.monthValues[month] || {
      absence: resourceMapping.absence,
      holiday: resourceMapping.holiday,
      training: resourceMapping.training,
      fte: resourceMapping.fte,
      leavers: resourceMapping.leavers
    };
    if (index === 0) {
      monthValues[month] = current;
      return;
    }

    monthValues[month] = current;
  });

  return { ...resourceMapping, monthValues };
}

function applyMtpBaseline(resourceMapping: PlannerStorageState['resourceMapping']) {
  const months = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
  const holidays = [0.07, 0.08, 0.08, 0.16, 0.10, 0.14, 0.14, 0.15, 0.18, 0.20, 0.10, 0.07];
  const training = [0.02, 0.02, 0.02, 0.02, 0.07, 0.03, 0.04, 0.05, 0.065, 0.075, 0.06, 0.01];
  const fte = [206, 204, 203, 201, 200, 198, 197, 195, 194, 192, 191, 189];
  const monthValues = Object.fromEntries(months.map((month, index) => [
    month,
    { absence: 0.10, holiday: holidays[index], training: training[index], fte: fte[index], leavers: 1.5 }
  ]));
  return { ...resourceMapping, absence: 0.10, holiday: 0.07, training: 0.02, fte: 206, leavers: 1.5, monthValues };
}

import { Role, ResourceMapping } from './types';

export function loadState(): PlannerStorageState {
  const fallback = defaultStorageState();
  fallback.roles = roleDefaults() as Role[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...fallback, resourceMapping: applyFteCarryForward(fallback.resourceMapping) };
    const parsed = JSON.parse(raw) as Partial<PlannerStorageState>;
    const merged = { ...fallback, ...parsed };
    if (!localStorage.getItem(BOOKING_OFFICE_SCOPE_MIGRATION_KEY)) {
      merged.roles = (merged.roles || []).map(role => role.role === 'Booking Office' ? { ...role, type: 'Non-Ops' } : role);
      localStorage.setItem(BOOKING_OFFICE_SCOPE_MIGRATION_KEY, 'applied');
    }
    if (!localStorage.getItem(MTP_BASELINE_MIGRATION_KEY)) {
      merged.resourceMapping = applyMtpBaseline(merged.resourceMapping);
      localStorage.setItem(MTP_BASELINE_MIGRATION_KEY, 'applied');
    }
    const monthValues = merged.resourceMapping?.monthValues || {};
    const migratedMonthValues = Object.fromEntries(Object.entries(monthValues).map(([month, value]) => [
      month,
      typeof value === 'number'
        ? { absence: value, holiday: merged.resourceMapping.holiday, training: merged.resourceMapping.training, fte: merged.resourceMapping.fte, leavers: merged.resourceMapping.leavers }
        : value
    ]));
    merged.resourceMapping = applyFteCarryForward({ ...merged.resourceMapping, truckVolumeM3: merged.resourceMapping.truckVolumeM3 ?? 60, productivityTargetM3PerHour: merged.resourceMapping.productivityTargetM3PerHour ?? 7.3, monthValues: migratedMonthValues });
    return merged;
  } catch {
    return fallback;
  }
}

export function saveState(state: PlannerStorageState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function roleDefaults() {
  return [
    { id: '1', role: 'Banding', translation: 'Banding', palletsPerHour: 43.1, m3PerPallet: 0.82, baselineValue: 35.34, type: 'Operational' },
    { id: '2', role: 'Bayclearing', translation: 'Bayclearing', palletsPerHour: 35, m3PerPallet: 0.82, baselineValue: 28.7, type: 'Operational' },
    { id: '3', role: 'Booking Office', translation: 'Booking Office', palletsPerHour: 60, m3PerPallet: 0.82, baselineValue: 49.2, type: 'Non-Ops' },
    { id: '4', role: 'Co-Worker', translation: 'Co-Worker', palletsPerHour: 0, m3PerPallet: 0.82, baselineValue: 0, type: 'Non-Ops' },
    { id: '5', role: 'Cycles', translation: 'Cycles', palletsPerHour: 17, m3PerPallet: 0.82, baselineValue: 13.94, type: 'Operational' },
    { id: '6', role: 'DC Loading', translation: 'DC Loading', palletsPerHour: 42, m3PerPallet: 0.82, baselineValue: 34.44, type: 'Operational' },
    { id: '7', role: 'DC Tipping', translation: 'DC Tipping', palletsPerHour: 40, m3PerPallet: 0.82, baselineValue: 32.8, type: 'Operational' },
    { id: '8', role: 'Gatekeeper', translation: 'Gatekeeper', palletsPerHour: 0, m3PerPallet: 0.82, baselineValue: 0, type: 'Non-Ops' },
    { id: '9', role: 'Mats', translation: 'Mats', palletsPerHour: 0, m3PerPallet: 0.82, baselineValue: 0, type: 'Operational' },
    { id: '10', role: 'MCT', translation: 'MCT', palletsPerHour: 0, m3PerPallet: 1, baselineValue: 0, type: 'Operational' },
    { id: '11', role: 'CB Palletless', translation: 'CB Palletless', palletsPerHour: 60, m3PerPallet: 0.82, baselineValue: 49.2, type: 'Operational' },
    { id: '12', role: 'Picking', translation: 'Picking', palletsPerHour: 22.5, m3PerPallet: 1, baselineValue: 24.5, type: 'Operational' },
    { id: '13', role: 'Recovery', translation: 'Recovery', palletsPerHour: 0, m3PerPallet: 0.82, baselineValue: 0, type: 'Non-Ops' },
    { id: '14', role: 'Replens', translation: 'Replenishment', palletsPerHour: 10.5, m3PerPallet: 1, baselineValue: 10.5, type: 'Operational' },
    { id: '15', role: 'Shunting', translation: 'Shunting', palletsPerHour: 0, m3PerPallet: 0.82, baselineValue: 0, type: 'Non-Ops' },
    { id: '16', role: 'Transit Cycle', translation: 'Transit Cycle', palletsPerHour: 29.5, m3PerPallet: 0.82, baselineValue: 24.19, type: 'Operational' },
    { id: '17', role: 'Transit Transfer', translation: 'Transit Transfer', palletsPerHour: 29.5, m3PerPallet: 0.82, baselineValue: 24.19, type: 'Operational' },
    { id: '18', role: 'Transit Tip', translation: 'Transit Tip', palletsPerHour: 34, m3PerPallet: 0.82, baselineValue: 27.88, type: 'Operational' },
    { id: '19', role: 'Transit Bay', translation: 'Transit Bayclearing', palletsPerHour: 27, m3PerPallet: 0.82, baselineValue: 22.14, type: 'Operational' },
    { id: '20', role: 'Transit Load', translation: 'Transit Loading', palletsPerHour: 43, m3PerPallet: 0.82, baselineValue: 35.26, type: 'Operational' },
    { id: '21', role: 'Tram Plock', translation: 'Tram Plock', palletsPerHour: 27, m3PerPallet: 1, baselineValue: 27, type: 'Operational' }
  ];
}
