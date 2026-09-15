import { UploadedFileRecord } from '../types';
import { Role } from '../types';
import { roleDefaults } from '../mockData';

export type MissingStpMappingError = {
  role: string;
  error: 'No STP mapping';
};

export type StpRoleMappingConfig = Record<string, string[]>;

export interface StpDemandRoleRow {
  role: string;
  volume: number;
  targetRate: number;
  requiredHours: number;
  weekCode?: string;
  forecastFlag?: string;
  mappingStatus?: 'Mapped' | 'No mapping';
}

export interface StpDemandPlan {
  roleDemandRows: StpDemandRoleRow[];
  scheduledByWeekAndRole: Record<string, Record<string, number>>;
  missingMappings?: MissingStpMappingError[];
}

export const stpRoleMappingConfig: StpRoleMappingConfig = {
  Bayclearing: ['Additional Bay Clear Queue Corrected'],
  Replens: ['DC Replenishment and Other Inflow', 'DC Replenishment Volume', 'Replenishment', 'Additional Replenishment Queue Corrected'],
  Cycles: ['Full Pallet OL', 'Full Pallet Orderlines', 'Additional Cycles Queue Corrected'],
  Pick: ['Picking m3'],
  'Transit Tipping': ['Total Transit IN'],
  'DC Tipping': ['Total DC In to Stock (Queue Corrected)', 'DC In to Stock (Queue Corrected)'],
  'DC Loading': ['Total DC Out from Stock', 'DC Out from Stock'],
  'Transit Loading': ['Total DC Out Transit', 'DC Out Transit']
};

const defaultTargetRates: Record<string, number> = {
  Replens: 7,
  Cycles: 15.435,
  Pick: 3.1,
  'Transit Tipping': 28,
  'DC Bay Clear': 23.5,
  'DC Tipping': 26,
  'DC Loading': 25.5,
  'Transit Loading': 25.5
};

function normalizeHeader(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function normalizeMeasure(name: string): string {
  return normalizeHeader(name).replace(/(actual|forecast|fcst)$/, '');
}

function normalizeRoleKey(role: string): string {
  return String(role ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '');
}

function toNumber(value: unknown): number {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function lookupRole(role: string, roles: Role[] = roleDefaults): Role | undefined {
  const normalizedRole = normalizeRoleKey(role);
  return roles.find(candidate => normalizeRoleKey(candidate.role) === normalizedRole
    || normalizeRoleKey(candidate.translation) === normalizedRole
    || (normalizedRole === 'pick' && normalizeRoleKey(candidate.role) === 'picking')
    || (normalizedRole === 'dcbayclear' && normalizeRoleKey(candidate.role) === 'bayclearing')
    || (normalizedRole === 'transitloading' && normalizeRoleKey(candidate.role) === 'transitload'));
}

export function getRoleTargetRate(role: string, roles: Role[] = roleDefaults): number {
  const matchingRole = lookupRole(role, roles);
  const configuredRate = matchingRole?.baselineValue;
  if (configuredRate !== undefined && configuredRate > 0) return configuredRate;
  if (matchingRole?.targetRate !== undefined && matchingRole.targetRate > 0) return matchingRole.targetRate;
  return defaultTargetRates[role] ?? Math.max((lookupRole(role, roles)?.palletsPerHour ?? 0) * (lookupRole(role, roles)?.m3PerPallet ?? 0), 0);
}

function summaryRoleName(role: string): string {
  return String(role ?? '').trim();
}

function getMeasureKeysForRole(role: string, config: StpRoleMappingConfig): string[] {
  const keys = config[role] ?? [];
  return keys.map(measure => normalizeHeader(measure));
}

export function aggregateScheduledHoursByWeekAndRole(files: UploadedFileRecord[]): Record<string, Record<string, number>> {
  const weeklySchedule: Record<string, Record<string, number>> = {};
  const scheduleRows = files
    .filter(file => file.kind === 'schedule')
    .flatMap(file => file.records);

  for (const row of scheduleRows) {
    const role = summaryRoleName(String(row.role ?? ''));
    if (!role) continue;

    const date = String(row.date ?? row.shiftdate ?? 'Week 1');
    const shiftedHours = toNumber(row.scheduledHours ?? row.hours ?? row.workedHours ?? 0);
    if (shiftedHours <= 0) continue;

    const week = date.length >= 10 && date.includes('-')
      ? `Week ${Math.max(1, Number(date.slice(5, 7)) % 52)}`
      : date;

    if (!weeklySchedule[week]) {
      weeklySchedule[week] = {};
    }
    weeklySchedule[week][role] = (weeklySchedule[week][role] ?? 0) + shiftedHours;
  }

  return weeklySchedule;
}

export function buildStpDemandPlan(files: UploadedFileRecord[], config: StpRoleMappingConfig = stpRoleMappingConfig, roles: Role[] = roleDefaults, selectedWeekCodes?: string[]): StpDemandPlan {
  const stpRows = files
    .filter(file => file.kind === 'stp')
    .flatMap(file => file.records);

  const roleDemand = new Map<string, { volume: number; weekCode?: string; forecastFlag?: string }>();
  const missingMappings: MissingStpMappingError[] = [];

  const selected = selectedWeekCodes?.length ? new Set(selectedWeekCodes) : undefined;

  for (const row of stpRows) {
    const role = summaryRoleName(String(row.role ?? ''));
    if (!role) {
      continue;
    }

    if (role === '__TOTAL_HANDLING_QUEUE_CORRECTED__') {
      continue;
    }

    if (!config[role]) {
      missingMappings.push({ role, error: 'No STP mapping' });
      continue;
    }

    const mappedMeasureFields = config[role].map(measure => normalizeMeasure(measure));
    const rowMeasure = normalizeMeasure(String(row.dcsummarymeasures ?? row.measure ?? row['DC_Summary_Measures'] ?? ''));
    const rowMatchesConfiguredMeasure = mappedMeasureFields.includes(rowMeasure) || mappedMeasureFields.length === 0;

    if (!rowMatchesConfiguredMeasure) {
      continue;
    }

    const volume = toNumber(row.volume ?? row.m3 ?? row.m2 ?? row.actualVolume ?? 0);
    if (volume <= 0) {
      continue;
    }

    const weekCode = String(row.weekCode ?? row.week ?? '');
    if (selected && weekCode && !selected.has(weekCode)) continue;
    const current = roleDemand.get(role);
    roleDemand.set(role, {
      volume: (current?.volume ?? 0) + volume,
      weekCode: current?.weekCode ?? weekCode,
      forecastFlag: current?.forecastFlag ?? String(row.forecastFlag ?? '')
    });
  }

  const roleDemandRows: StpDemandRoleRow[] = [];
  for (const [role, demand] of roleDemand.entries()) {
    const volume = demand.volume;
    const targetRate = getRoleTargetRate(role, roles);
    const requiredHours = Math.max(volume / Math.max(targetRate, 0.01), 0);

    roleDemandRows.push({ role, volume, targetRate, requiredHours, weekCode: demand.weekCode, forecastFlag: demand.forecastFlag, mappingStatus: 'Mapped' });
  }

  return {
    roleDemandRows,
    scheduledByWeekAndRole: aggregateScheduledHoursByWeekAndRole(files),
    missingMappings: missingMappings.length ? missingMappings : undefined
  };
}
