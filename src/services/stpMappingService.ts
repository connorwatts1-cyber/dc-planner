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
  Bayclearing: ['Additional Bay Clear Queue Corrected'],
  Replens: [],
  Cycles: ['Full Pallet OL'],
  Pick: ['Total OL'],
  'Transit Tipping': ['Total Transit IN'],
  'DC Tipping': ['Total DC In to Stock (Queue Corrected)'],
  'DC Loading': ['Total DC Out from Stock'],
  'Transit Loading': ['DC Out Transit'],
  Banding: ['Banding / Strapping'],
  'CB Palletless': ['CB Palletless'],
  'Transit Cycle': ['Transit Cycle'],
  'Transit Transfer': ['Transit Transfer'],
  'Transit Bay': ['Bayclear / Transit Bay'],
  'Tram Plock': ['Tram Plock']
};

const defaultTargetRates: Record<string, number> = {
  Replens: 7,
  Cycles: 15.435,
  Pick: 109.8,
  'Transit Tipping': 28,
  'DC Bay Clear': 23.5,
  'DC Tipping': 26,
  'DC Loading': 25.5,
  'Transit Loading': 25.5,
  Banding: 35.34,
  'CB Palletless': 49.2,
  'Transit Cycle': 24.19,
  'Transit Transfer': 24.19,
  'Transit Bay': 27,
  'Tram Plock': 27
};

const roleAliases: Record<string, string> = {
  dctipping: 'DC Tipping',
  dctip: 'DC Tipping',
  dcloading: 'DC Loading',
  dcload: 'DC Loading',
  bayclearing: 'Bayclearing',
  bayclear: 'Bayclearing',
  dcbayclear: 'Bayclearing',
  dcbayclearing: 'Bayclearing',
  transittipping: 'Transit Tipping',
  transittip: 'Transit Tipping',
  transitloading: 'Transit Loading',
  transitload: 'Transit Loading',
  transitcycle: 'Transit Cycle',
  transittransfer: 'Transit Transfer',
  transitbay: 'Transit Bay',
  transitbayclearing: 'Transit Bay',
  tramplock: 'Tram Plock',
  banding: 'Banding',
  cbpalletless: 'CB Palletless',
  replens: 'Replens',
  replenishment: 'Replens',
  cycles: 'Cycles',
  pick: 'Pick',
  picking: 'Pick'
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
  const normalized = normalizeRoleKey(String(role ?? ''));
  if (normalized === 'banding' || normalized === 'cbpalletless') return 'DC Tipping';
  if (normalized === 'transitcycle' || normalized === 'transittransfer' || normalized === 'tramplock' || normalized === 'transitbay') return 'Transit Loading';
  return String(role ?? '').trim() || 'Unmapped';
}

export function supportRoleDemandWeight(role: string): number {
  return supportRoleDemandShare[normalizeRoleKey(String(role ?? ''))] ?? 1;
}

export function getRoleTargetRate(role: string, roles: Role[] = roleDefaults): number {
  const matchingRole = lookupRole(role, roles);
  if (normalizeRoleKey(role) === 'pick' && matchingRole && matchingRole.targetRate === undefined && matchingRole.baselineValue === 24.5) return 109.8;
  if (normalizeRoleKey(role) === 'cycles') return defaultTargetRates.Cycles;
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
  return ['cycles', 'pick'].includes(normalizeRoleKey(role)) ? 'OL/h' : 'm3/h';
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

  const preferredStpRows = new Map<string, typeof stpRows[number]>();
  for (const row of stpRows) {
    const rawRole = summaryRoleName(String(row.role ?? ''));
    if (!rawRole) {
      continue;
    }

    if (rawRole === '__TOTAL_HANDLING_QUEUE_CORRECTED__') {
      continue;
    }

    const mappedRole = resolveConfigRoleName(rawRole, config);
    if (!config[mappedRole]) {
      missingMappings.push({ role: mappedRole, error: 'No STP mapping' });
      continue;
    }

    const mappedMeasureFields = config[mappedRole].map(measure => normalizeMeasure(measure));
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
    if (selected && (!weekCode || !selected.has(weekCode))) continue;
    const rowKey = `${mappedRole}|${normalizeMeasure(String(row.measure ?? row.dcsummarymeasures ?? row['DC_Summary_Measures'] ?? ''))}|${weekCode}`;
    const currentRow = preferredStpRows.get(rowKey);
    const isForecast = String(row.forecastFlag ?? '').toLowerCase().includes('fc') || String(row.forecastFlag ?? '').toLowerCase().includes('forecast');
    const currentIsForecast = String(currentRow?.forecastFlag ?? '').toLowerCase().includes('fc') || String(currentRow?.forecastFlag ?? '').toLowerCase().includes('forecast');
    if (!currentRow || (isForecast && !currentIsForecast)) preferredStpRows.set(rowKey, row);
  }

  for (const row of preferredStpRows.values()) {
    const rawRole = summaryRoleName(String(row.role ?? ''));
    const mappedRole = resolveConfigRoleName(rawRole, config);
    if (!rawRole || rawRole === '__TOTAL_HANDLING_QUEUE_CORRECTED__' || !config[mappedRole]) continue;
    const volume = toNumber(row.volume ?? row.m3 ?? row.m2 ?? row.actualVolume ?? 0);
    if (volume <= 0) continue;
    const weekCode = String(row.weekCode ?? row.week ?? '');
    const aggregateRole = aggregateDemandRole(mappedRole);
    const volumeShare = supportRoleDemandWeight(mappedRole);
    const weightedVolume = volume * volumeShare;
    const current = roleDemand.get(aggregateRole);
    roleDemand.set(aggregateRole, {
      volume: (current?.volume ?? 0) + weightedVolume,
      weekCode: current?.weekCode ?? weekCode,
      forecastFlag: current?.forecastFlag ?? String(row.forecastFlag ?? '')
    });
  }

  const pickDemand = roleDemand.get('Pick');
  if (pickDemand && config.Replens?.length === 0) {
    const replensRole = roles.find(role => normalizeRoleKey(role.role) === 'replens');
    roleDemand.set('Replens', {
      volume: pickDemand.volume * (replensRole?.demandPercent ?? 0.37),
      weekCode: pickDemand.weekCode,
      forecastFlag: pickDemand.forecastFlag
    });
  }

  const roleDemandRows: StpDemandRoleRow[] = [];
  for (const [role, demand] of roleDemand.entries()) {
    const volume = demand.volume;
    const targetRate = getRoleTargetRate(role, roles);
    const requiredHours = Math.max(volume / Math.max(targetRate, 0.01), 0);

    roleDemandRows.push({ role, volume, targetRate, targetUnit: getRoleTargetUnit(role), requiredHours, weekCode: demand.weekCode, forecastFlag: demand.forecastFlag, mappingStatus: 'Mapped' });
  }

  return {
    roleDemandRows,
    scheduledByWeekAndRole: aggregateScheduledHoursByWeekAndRole(files),
    missingMappings: missingMappings.length ? missingMappings : undefined
  };
}
