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
  flow: 'Inbound' | 'Outbound';
  volume: number;
  targetRate: number;
  targetUnit?: 'm3/h' | 'pallets/h' | 'OL/h';
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

export interface ForecastClassificationSummary {
  inboundDc: number;
  inboundTransit: number;
  outboundDc: number;
  outboundTransit: number;
  landDc: number;
  landTransit: number;
  oceanDc: number;
  oceanTransit: number;
}

export const stpRoleMappingConfig: StpRoleMappingConfig = {
  'Bayclearing (Transit)': ['Total Transit IN'],
  'Bayclearing (DC)': ['Total DC In to Stock (Queue Corrected)'],
  Replens: ['Picking OL'],
  Cycles: ['Total Outbound'],
  Pick: ['Picking OL'],
  'Transit Tipping': ['Total Transit IN'],
  'DC Tipping': ['Total DC In to Stock (Queue Corrected)'],
  'DC Loading': ['DC Out from Stock'],
  'Transit Loading': ['Total DC Out Transit'],
  'Tram Plock': ['Picking m3'],
  Banding: ['Total DC In to Stock (Queue Corrected)'],
  Booking: ['Total DC In to Stock (Queue Corrected)']
};

interface StpDemandTask {
  id: string;
  role: string;
  flow: 'Inbound' | 'Outbound';
  measure: string;
  share: number;
  targetUnit?: 'm3/h' | 'pallets/h' | 'OL/h';
  rateSetting?: 'transitBayclearingPalletsPerHour' | 'dcBayclearingPalletsPerHour';
}

export const stpDemandTasks: StpDemandTask[] = [
  { id: 'dc-tipping', role: 'DC Tipping', flow: 'Inbound', measure: 'Total DC In to Stock (Queue Corrected)', share: 1 },
  { id: 'transit-tipping', role: 'Transit Tipping', flow: 'Inbound', measure: 'Total Transit IN', share: 1 },
  { id: 'banding', role: 'Banding', flow: 'Inbound', measure: 'Total DC In to Stock (Queue Corrected)', share: 0.03 },
  { id: 'booking', role: 'Booking', flow: 'Inbound', measure: 'Total DC In to Stock (Queue Corrected)', share: 0.02 },
  { id: 'transit-bayclear', role: 'Bayclearing (Transit)', flow: 'Inbound', measure: 'Total Transit IN', share: 0.23, targetUnit: 'pallets/h', rateSetting: 'transitBayclearingPalletsPerHour' },
  { id: 'dc-bayclear', role: 'Bayclearing (DC)', flow: 'Inbound', measure: 'Total DC In to Stock (Queue Corrected)', share: 1, targetUnit: 'pallets/h', rateSetting: 'dcBayclearingPalletsPerHour' },
  { id: 'dc-loading', role: 'DC Loading', flow: 'Outbound', measure: 'DC Out from Stock', share: 1 },
  { id: 'transit-loading', role: 'Transit Loading', flow: 'Outbound', measure: 'Total DC Out Transit', share: 1 },
  { id: 'tram-plock', role: 'Tram Plock', flow: 'Outbound', measure: 'Picking m3', share: 1 },
  { id: 'picking', role: 'Pick', flow: 'Outbound', measure: 'Picking OL', share: 1 },
  { id: 'replens', role: 'Replens', flow: 'Outbound', measure: 'Picking OL', share: 0.25 },
  { id: 'cycles', role: 'Cycles', flow: 'Outbound', measure: 'Total Outbound', share: 1 }
];

const defaultTargetRates: Record<string, number> = {
  Replens: 10.5,
  Cycles: 24.19,
  Pick: 22.5,
  'Transit Tipping': 28,
  'DC Bay Clear': 28.7,
  Bayclearing: 28.7,
  'Bayclearing (Transit)': 37,
  'Bayclearing (DC)': 35,
  'DC Tipping': 32.8,
  'DC Loading': 34.44,
  'Transit Loading': 35.26,
  Booking: 49.2,
  Banding: 35.34,
  'CB Palletless': 49.2,
  'Transit Cycle': 24.19,
  'Transit Transfer': 24.19,
  'Transit Bay': 27,
  'Tram Plock': 22.14
};

const roleAliases: Record<string, string> = {
  dctipping: 'DC Tipping',
  dctip: 'DC Tipping',
  dcloading: 'DC Loading',
  dcload: 'DC Loading',
  bayclearing: 'Bayclearing (DC)',
  bayclear: 'Bayclearing (DC)',
  dcbayclear: 'Bayclearing (DC)',
  dcbayclearing: 'Bayclearing (DC)',
  bayclearingtransit: 'Bayclearing (Transit)',
  transitbayclearing: 'Bayclearing (Transit)',
  bayclearingdc: 'Bayclearing (DC)',
  dcbayclearingrole: 'Bayclearing (DC)',
  transittipping: 'Transit Tipping',
  transittip: 'Transit Tipping',
  transitloading: 'Transit Loading',
  transitload: 'Transit Loading',
  transitcycle: 'Transit Cycle',
  transittransfer: 'Transit Transfer',
  transitbay: 'Bayclearing (Transit)',
  tramplock: 'Tram Plock',
  banding: 'Banding',
  cbpalletless: 'CB Palletless',
  replens: 'Replens',
  replenishment: 'Replens',
  cycles: 'Cycles',
  pick: 'Pick',
  picking: 'Pick',
  booking: 'Booking'
};

const supportRoleDemandShare: Record<string, number> = {
  banding: 0.35,
  cbpalletless: 0.35,
  transitcycle: 0.4,
  transittransfer: 0.4,
  transitbay: 0.5,
  tramplock: 0.5
};

export function resolveMappedRoleName(role: string): string {
  const normalized = normalizeRoleKey(String(role ?? ''));
  return roleAliases[normalized] ?? String(role ?? '').trim();
}

function normalizeHeader(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function normalizeMeasure(name: string): string {
  return normalizeHeader(name).replace(/^total/, '').replace(/(actual|forecast|fcst)$/, '');
}

function forecastMeasureText(record: UploadedFileRecord['records'][number]): string {
  return String(record.measure ?? record.dcsummarymeasures ?? record['DC_Summary_Measures'] ?? record['DC Summary Measures'] ?? record.__EMPTY ?? record.Measure ?? '').toLowerCase();
}

function isActualRecord(record: UploadedFileRecord['records'][number]): boolean {
  const flag = String(record.forecastFlag ?? '').toLowerCase();
  const measure = forecastMeasureText(record);
  return flag.includes('actual') || flag === 'act' || measure.includes('actual');
}

function measureVolume(record: UploadedFileRecord['records'][number]): number {
  return toNumber(record.volume ?? record.m3 ?? record.m2 ?? record.actualVolume ?? 0);
}

export function buildForecastClassificationSummary(files: UploadedFileRecord[], forecastOnly = true, selectedWeekCodes?: string[]): ForecastClassificationSummary {
  const summary: ForecastClassificationSummary = { inboundDc: 0, inboundTransit: 0, outboundDc: 0, outboundTransit: 0, landDc: 0, landTransit: 0, oceanDc: 0, oceanTransit: 0 };
  const records = files.filter(file => file.kind === 'stp').flatMap(file => file.records);
  const matchingWeekRecords = selectedWeekCodes?.length
    ? records.filter(record => selectedWeekCodes.includes(String(record.weekCode ?? record.week ?? '')))
    : records;
  const sourceRecords = matchingWeekRecords.length ? matchingWeekRecords : records;
  const preferredRecords = new Map<string, UploadedFileRecord['records'][number]>();
  sourceRecords.forEach(record => {
    const measure = forecastMeasureText(record);
    const week = String(record.weekCode ?? record.week ?? 'all');
    if (!measure || measureVolume(record) <= 0) return;
    const key = `${normalizeMeasure(measure)}|${week}`;
    const current = preferredRecords.get(key);
    if (!current || (isActualRecord(current) && !isActualRecord(record))) preferredRecords.set(key, record);
  });
  const recordsToSummarize = Array.from(preferredRecords.values());
  const landOceanActuals = new Map<string, Array<{ week: string; value: number }>>();
  const landOceanForecasts = new Set<string>();

  recordsToSummarize.forEach(record => {
    const measure = forecastMeasureText(record);
    const normalizedMeasure = normalizeHeader(measure).replace(/(actual|forecast|fcst)$/g, '');
    const role = normalizeRoleKey(String(record.role ?? ''));
    const volume = measureVolume(record);
    if (volume <= 0) return;
    const isLandOrOcean = normalizedMeasure.includes('landvolumedcstock')
      || normalizedMeasure.includes('landvolumetransit')
      || normalizedMeasure.includes('oceanvolumedcstock')
      || normalizedMeasure.includes('oceanvolumetransit');
    if (isLandOrOcean) {
      if (isActualRecord(record)) {
        const values = landOceanActuals.get(normalizedMeasure) ?? [];
        values.push({ week: String(record.weekCode ?? record.week ?? 'all'), value: volume });
        landOceanActuals.set(normalizedMeasure, values);
      } else {
        landOceanForecasts.add(normalizedMeasure);
        if (normalizedMeasure.includes('landvolumedcstock')) summary.landDc += volume;
        else if (normalizedMeasure.includes('landvolumetransit')) summary.landTransit += volume;
        else if (normalizedMeasure.includes('oceanvolumedcstock')) summary.oceanDc += volume;
        else if (normalizedMeasure.includes('oceanvolumetransit')) summary.oceanTransit += volume;
      }
      return;
    }
    if (normalizedMeasure.includes('landvolumedcstock')) summary.landDc += volume;
    else if (normalizedMeasure.includes('landvolumetransit')) summary.landTransit += volume;
    else if (normalizedMeasure.includes('oceanvolumedcstock')) summary.oceanDc += volume;
    else if (normalizedMeasure.includes('oceanvolumetransit')) summary.oceanTransit += volume;
    else if (normalizedMeasure.includes('totaltransitin') || role.includes('transittipping')) summary.inboundTransit += volume;
    else if (normalizedMeasure.includes('totaldcintostock') || role.includes('dctipping')) summary.inboundDc += volume;
    else if (normalizedMeasure.includes('totaldcouttransit') || role.includes('transitloading')) summary.outboundTransit += volume;
    else if (normalizedMeasure.includes('totaldcoutfromstock') || role.includes('dcloading')) summary.outboundDc += volume;
  });

  landOceanActuals.forEach((values, measure) => {
    if (landOceanForecasts.has(measure)) return;
    const trendValues = values.slice().sort((left, right) => left.week.localeCompare(right.week)).slice(-4);
    const trendAverage = trendValues.reduce((total, item) => total + item.value, 0) / Math.max(trendValues.length, 1);
    if (measure.includes('landvolumedcstock')) summary.landDc += trendAverage;
    else if (measure.includes('landvolumetransit')) summary.landTransit += trendAverage;
    else if (measure.includes('oceanvolumedcstock')) summary.oceanDc += trendAverage;
    else if (measure.includes('oceanvolumetransit')) summary.oceanTransit += trendAverage;
  });

  return summary;
}

function normalizeRoleKey(role: string): string {
  return String(role ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '');
}

function resolveConfigRoleName(role: string, config: StpRoleMappingConfig): string {
  const normalized = resolveMappedRoleName(role);
  const directMatch = Object.keys(config).find(candidate => {
    const candidateName = resolveMappedRoleName(candidate);
    return candidateName === normalized || normalizeRoleKey(candidateName) === normalizeRoleKey(normalized);
  });
  return directMatch ?? normalized;
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
    || (normalizedRole === 'transittipping' && ['transittip', 'transittipping'].includes(normalizeRoleKey(candidate.role)))
    || (normalizedRole === 'dcbayclear' && normalizeRoleKey(candidate.role) === 'bayclearing')
    || (normalizedRole === 'transitloading' && normalizeRoleKey(candidate.role) === 'transitload'));
}

export function aggregateDemandRole(role: string): string {
  return resolveMappedRoleName(role) || 'Unmapped';
}

export function supportRoleDemandWeight(role: string): number {
  return supportRoleDemandShare[normalizeRoleKey(String(role ?? ''))] ?? 1;
}

export function getRoleTargetRate(role: string, roles: Role[] = roleDefaults): number {
  const matchingRole = lookupRole(role, roles);
  const normalized = normalizeRoleKey(role);
  if (matchingRole && getRoleTargetUnit(role) === 'm3/h' && matchingRole.palletsPerHour > 0) {
    const palletSize = matchingRole.m3PerPallet > 0 ? matchingRole.m3PerPallet : 0.82;
    return Math.round(matchingRole.palletsPerHour * palletSize * 100) / 100;
  }
  const workbookDefaults: Record<string, number> = {
    dctipping: 32.8,
    transittipping: 28,
    banding: 35.34,
    booking: 49.2,
    bookingoffice: 49.2,
    bayclearing: 28.7,
    bayclearingtransit: 37,
    bayclearingdc: 35,
    dcloading: 34.44,
    transitloading: 35.26,
    picking: 22.5,
    pick: 22.5,
    replenishment: 10.5,
    replens: 10.5,
    cycles: 24.19,
    tramplock: 22.14
  };
  const oldDefaults: Record<string, number[]> = {
    dctipping: [40, 26], transittipping: [34, 28], bayclearing: [35, 23.5], dcloading: [42, 25.5],
    transitloading: [43, 25.5], picking: [109.8], pick: [109.8], cycles: [13.94, 15.435], replens: [7]
  };
  const workbookDefault = workbookDefaults[normalized];
  if (matchingRole && workbookDefault !== undefined && oldDefaults[normalized]?.includes(matchingRole.baselineValue) && matchingRole.targetRate === undefined) return workbookDefault;
  const configuredRate = matchingRole?.baselineValue;
  if (configuredRate !== undefined && configuredRate > 0) return configuredRate;
  if (matchingRole?.targetRate !== undefined && matchingRole.targetRate > 0) return matchingRole.targetRate;
  return defaultTargetRates[role] ?? Math.max((lookupRole(role, roles)?.palletsPerHour ?? 0) * (lookupRole(role, roles)?.m3PerPallet ?? 0), 0);
}

function summaryRoleName(role: string): string {
  return String(role ?? '').trim();
}

function getMeasureKeysForRole(role: string, config: StpRoleMappingConfig): string[] {
  const configuredRole = resolveConfigRoleName(role, config);
  const keys = config[configuredRole] ?? [];
  return keys.map(measure => normalizeHeader(measure));
}

export function getRoleTargetUnit(role: string): 'm3/h' | 'pallets/h' | 'OL/h' {
  if (normalizeRoleKey(role).includes('bayclearing')) return 'pallets/h';
  return ['pick', 'picking', 'replens', 'replenishment'].includes(normalizeRoleKey(role)) ? 'OL/h' : 'm3/h';
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

export function buildStpDemandPlan(files: UploadedFileRecord[], config: StpRoleMappingConfig = stpRoleMappingConfig, roles: Role[] = roleDefaults, selectedWeekCodes?: string[], resourceMapping?: Pick<import('../types').ResourceMapping, 'm3PerPallet' | 'transitBayclearingPalletsPerHour' | 'dcBayclearingPalletsPerHour'>): StpDemandPlan {
  const stpRows = files
    .filter(file => file.kind === 'stp')
    .flatMap(file => file.records);
  const selected = selectedWeekCodes?.length ? new Set(selectedWeekCodes) : undefined;
  const preferredRows = new Map<string, typeof stpRows[number]>();
  const missingMappings: MissingStpMappingError[] = [];
  for (const row of stpRows) {
    const rowMeasure = normalizeMeasure(String(row.dcsummarymeasures ?? row.measure ?? row['DC_Summary_Measures'] ?? ''));
    const volume = measureVolume(row);
    if (!rowMeasure || volume <= 0) continue;
    const weekCode = String(row.weekCode ?? row.week ?? '');
    if (selected && (!weekCode || !selected.has(weekCode))) continue;
    const rowKey = `${rowMeasure}|${weekCode}`;
    const currentRow = preferredRows.get(rowKey);
    const isForecast = String(row.forecastFlag ?? '').toLowerCase().includes('fc') || String(row.forecastFlag ?? '').toLowerCase().includes('forecast');
    const currentIsForecast = String(currentRow?.forecastFlag ?? '').toLowerCase().includes('fc') || String(currentRow?.forecastFlag ?? '').toLowerCase().includes('forecast');
    if (!currentRow || (isForecast && !currentIsForecast)) preferredRows.set(rowKey, row);
  }

  const roleDemand = new Map<string, { volume: number; requiredHours: number; flow: 'Inbound' | 'Outbound'; targetUnit: 'm3/h' | 'pallets/h' | 'OL/h'; weekCode?: string; forecastFlag?: string }>();
  const configuredTasks = stpDemandTasks.filter(task => (config[task.role] ?? []).some(measure => normalizeMeasure(measure) === normalizeMeasure(task.measure)));
  for (const task of configuredTasks) {
    const measureKey = normalizeMeasure(task.measure);
    for (const [key, row] of preferredRows) {
      if (!key.startsWith(`${measureKey}|`)) continue;
      const rawRole = summaryRoleName(String(row.role ?? ''));
      if (rawRole.startsWith('No mapping:')) missingMappings.push({ role: rawRole.replace(/^No mapping:\s*/i, ''), error: 'No STP mapping' });
      const weekCode = String(row.weekCode ?? row.week ?? '');
      const aggregateRole = aggregateDemandRole(task.role);
      const current = roleDemand.get(aggregateRole);
      const configuredRole = lookupRole(task.role, roles);
      const share = task.role === 'Replens' ? configuredRole?.demandPercent ?? task.share : task.share;
      const sourceVolume = measureVolume(row) * share;
      const targetUnit = task.targetUnit ?? getRoleTargetUnit(task.role);
      const volume = task.rateSetting
        ? sourceVolume / Math.max(resourceMapping?.m3PerPallet ?? 0.82, 0.01)
        : sourceVolume;
      const targetRate = task.rateSetting
        ? resourceMapping?.[task.rateSetting] ?? (task.rateSetting === 'transitBayclearingPalletsPerHour' ? 37 : 35)
        : getRoleTargetRate(task.role, roles);
      const requiredHours = volume / Math.max(targetRate, 0.01);
      roleDemand.set(aggregateRole, {
        volume: (current?.volume ?? 0) + volume,
        requiredHours: (current?.requiredHours ?? 0) + requiredHours,
        flow: task.flow,
        targetUnit,
        weekCode: current?.weekCode ?? weekCode,
        forecastFlag: current?.forecastFlag ?? String(row.forecastFlag ?? '')
      });
    }
  }

  const roleDemandRows: StpDemandRoleRow[] = [];
  for (const [role, demand] of roleDemand.entries()) {
    const volume = demand.volume;
    const requiredHours = Math.max(demand.requiredHours, 0);
    const targetRate = volume / Math.max(requiredHours, 0.01);
    roleDemandRows.push({ role, flow: demand.flow, volume, targetRate, targetUnit: demand.targetUnit, requiredHours, weekCode: demand.weekCode, forecastFlag: demand.forecastFlag, mappingStatus: 'Mapped' });
  }

  return {
    roleDemandRows,
    scheduledByWeekAndRole: aggregateScheduledHoursByWeekAndRole(files),
    missingMappings: missingMappings.length ? Array.from(new Map(missingMappings.map(item => [item.role, item])).values()) : undefined
  };
}
