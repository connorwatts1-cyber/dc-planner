import { UploadedFileRecord, UploadKind, AbsenceData, LabourData, Role, ResourceMapping } from '../types';
import { capabilityMetrics, trendData, absenceData, roleDefaults } from '../mockData';
import { historicalFollowUpWeeks } from '../historicalFollowUpData';
import { buildStpDemandPlan, getRoleTargetRate, getRoleTargetUnit, stpRoleMappingConfig } from './stpMappingService';

export interface PlanningSnapshot {
  scheduledHours: number;
  volume: number;
  plannedAbsenceHours: number;
  requiredHours: number;
  capability: number;
  variance: number;
  gap: number;
  lookaheadWeeks: number;
}

export interface FollowUpSnapshot {
  paidHours: number;
  actualVolume: number;
  actualAbsenceHours: number;
  requiredHours: number;
  variance: number;
  capability: number;
  gap: number;
  ytdStartLabel: string;
  productivityAssumption: number;
}

export interface DailyShiftCapacityRow {
  date: string;
  day: string;
  shift: 'AM' | 'PM' | 'Night' | 'Unspecified';
  role: string;
  rosteredHours: number;
  productiveHours: number;
  shiftCount: number;
}

export interface DailyShiftCapabilityRow extends DailyShiftCapacityRow {
  flow?: 'Inbound' | 'Outbound';
  requiredHours: number;
  variance: number;
  capability: number;
  demandAvailable: boolean;
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeRoleName(role: string): string {
  return String(role ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '');
}

export type RoleScope = 'ops' | 'non-ops' | 'both';
export type DcCdcScope = 'dc' | 'cdc' | 'both';
export type PlanningWeekSelection = number | number[] | null;

function isCdcScheduleRecord(record: Record<string, string | number>): boolean {
  const cdcCode = 'depserviceprovidersspdt00390';
  return Object.entries(record).some(([key, value]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const normalizedValue = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
    return (normalizedKey === 'rolescope' || normalizedValue.includes(cdcCode)) && normalizedValue.includes(cdcCode);
  });
}

function canonicalRoleName(role: string): string {
  const normalized = normalizeRoleName(role);
  const aliases: Record<string, string> = {
    picking: 'pick',
    pick: 'pick',
    bayclearing: 'bayclearingdc',
    bayclearingdc: 'bayclearingdc',
    bayclearingtransit: 'bayclearingtransit',
    transitbay: 'bayclearingtransit',
    transitbayclearing: 'bayclearingtransit',
    transittip: 'transittipping',
    transittipping: 'transittipping',
    transit: 'transittipping',
    replenishment: 'replens',
    replen: 'replens',
    bookingoffice: 'bookingoffice'
  };
  return aliases[normalized] ?? normalized;
}

export function filterFilesByRoleScope(files: UploadedFileRecord[], roles: Role[], scope: RoleScope): UploadedFileRecord[] {
  if (scope === 'both') return files;

  const allowedRoles = new Set(
    roles.filter(role => scope === 'ops' ? role.type === 'Operational' : role.type === 'Non-Ops')
      .flatMap(role => [canonicalRoleName(role.role), canonicalRoleName(role.translation)])
  );

  return files.map(file => ({
    ...file,
    records: file.records.filter(record => {
      if (file.kind !== 'schedule' && file.kind !== 'stp') return true;
      const recordRole = canonicalRoleName(String(record.role ?? record.workrole ?? record.WorkRole ?? ''));
      if (!recordRole.length) return false;
      return allowedRoles.has(recordRole) || !roles.some(role => canonicalRoleName(role.role) === recordRole || canonicalRoleName(role.translation) === recordRole);
    })
  }));
}

export function filterFilesByDcCdcScope(files: UploadedFileRecord[], scope: DcCdcScope): UploadedFileRecord[] {
  if (scope === 'both') return files;

  return files.map(file => file.kind !== 'schedule' ? file : {
    ...file,
    records: file.records.filter(record => isCdcScheduleRecord(record) === (scope === 'cdc'))
  });
}

function roleKey(record: Record<string, string | number>): string {
  const rawRole = String(record.role ?? record.workrole ?? record.WorkRole ?? 'Unmapped Role');
  const aliases: Record<string, string> = {
    picking: 'Pick',
    transittip: 'Transit Tipping',
    transitload: 'Transit Loading',
    transitbay: 'Bayclearing (Transit)',
    transitbayclearing: 'Bayclearing (Transit)',
    bayclearing: 'Bayclearing (DC)',
    transit: 'Transit Tipping',
    replenishment: 'Replens',
    replen: 'Replens'
  };
  return aliases[normalizeRoleName(rawRole)] ?? rawRole;
}

function demandRoleForScheduleRole(role: string): string {
  const normalized = canonicalRoleName(role);

  if (normalized === 'booking') return 'booking';
  if (normalized === 'bayclearingtransit' || normalized === 'transitbay' || normalized === 'transitbayclearing') return 'bayclearingtransit';
  if (normalized === 'bayclearingdc' || normalized === 'dcbayclear' || normalized === 'dcbayclearing' || normalized === 'bayclearing') return 'bayclearingdc';
  if (normalized === 'transitcycle' || normalized === 'transittransfer') return 'transitloading';
  if (normalized === 'transittip' || normalized === 'transittipping') return 'transittipping';
  if (normalized === 'transitload' || normalized === 'transitloading') return 'transitloading';
  if (normalized === 'dctip' || normalized === 'dctipping') return 'dctipping';
  if (normalized === 'dcload' || normalized === 'dcloading') return 'dcloading';
  if (normalized === 'pick' || normalized === 'picking') return 'pick';
  if (normalized === 'cycles') return 'cycles';
  if (normalized === 'replens' || normalized === 'replenishment') return 'replens';
  return normalized;
}

function lookupRole(rowRole: string, roles: Role[] = roleDefaults): Role | undefined {
  const normalized = normalizeRoleName(rowRole);
  const aliases: Record<string, string> = {
    pick: 'picking',
    transittipping: 'transittip',
    dcbayclear: 'bayclearingdc',
    transitbay: 'bayclearingtransit',
    transitbayclearing: 'bayclearingtransit'
  };
  const lookupKeys = new Set([normalized, aliases[normalized] ?? normalized]);
  return roles.find(candidate => lookupKeys.has(normalizeRoleName(candidate.role)) || lookupKeys.has(normalizeRoleName(candidate.translation)));
}

function deriveRequiredHoursFromStpRow(record: Record<string, string | number>, roles: Role[] = roleDefaults): number {
  const role = roleKey(record);
  const volume = normalizeNumber(record.volume ?? record.m2 ?? record.m3 ?? record.actualVolume ?? 0);
  if (volume <= 0) {
    return 0;
  }

  const matchingRole = lookupRole(role, roles);
  const m3PerPallet = matchingRole?.m3PerPallet ?? 0.82;
  const productivity = Math.max(matchingRole?.palletsPerHour ?? 22.5, 1);
  const pallets = volume / Math.max(m3PerPallet, 0.01);
  return Math.max(pallets / Math.max(productivity, 1), 0);
}

function sumRecords(files: UploadedFileRecord[], kind: UploadKind): number {
  return files
    .filter(file => file.kind === kind)
    .reduce((acc, file) => acc + file.records.reduce((inner, record) => {
      const fieldNames = kind === 'schedule'
        ? ['scheduledHours', 'hours', 'paidHours', 'plannedHours']
        : kind === 'stp'
          ? ['volume', 'm2', 'actualVolume']
          : kind === 'absence'
            ? ['absenceHours', 'plannedAbsenceHours', 'hours']
            : ['paidHours', 'hours'];

      for (const field of fieldNames) {
        const value = normalizeNumber(record[field]);
        if (value > 0) {
          return inner + value;
        }
      }

      return inner;
    }, 0), 0);
}

function sumField(files: UploadedFileRecord[], kind: UploadKind, fieldNames: string[]): number {
  return files
    .filter(file => file.kind === kind)
    .reduce((acc, file) => acc + file.records.reduce((inner, record) => {
      for (const field of fieldNames) {
        const value = normalizeNumber(record[field]);
        if (value > 0) {
          return inner + value;
        }
      }
      return inner;
    }, 0), 0);
}

function isSicknessAbsence(type: string): boolean {
  const normalized = normalizeRoleName(type);
  return normalized.includes('sick') || normalized.includes('sickness');
}

function sumCapacityReducingAbsence(files: UploadedFileRecord[]): number {
  return files
    .filter(file => file.kind === 'absence')
    .flatMap(file => file.records)
    .reduce((total, row) => {
      const type = String(row.absenceType ?? row.type ?? 'Other');
      return total + (isSicknessAbsence(type) ? 0 : normalizeNumber(row.absenceHours ?? row.hours ?? 0));
    }, 0);
}

function statusFromCapability(value: number): 'Green' | 'Amber' | 'Red' | 'Blue' {
  if (value > 110) return 'Blue';
  if (value >= 90) return 'Green';
  return 'Red';
}

function recommendationFromCapability(value: number): string {
  if (value < 90) {
    return '+ scenario: call on other functions; offer overtime; extend weekend/site hours; postpone classroom training; deploy leaders and office staff on trucks.';
  }
  if (value > 110) {
    return '- scenario: freeze recruitment; use borrowed resource and multiskilling; pull forward training; offer unpaid leave or move holidays forward.';
  }
  return '0% scenario: maintain the planned rota; complete mandatory training and MyLearning; continue multiskilling and monitor workload.';
}

function weekScale(selectedWeekIndex: PlanningWeekSelection): number {
  if (selectedWeekIndex === null || Array.isArray(selectedWeekIndex)) return 1;
  return 1 + Math.max(0, Math.min(selectedWeekIndex, 7)) * 0.035;
}

function weekScheduleScale(selectedWeekIndex: PlanningWeekSelection): number {
  if (selectedWeekIndex === null || Array.isArray(selectedWeekIndex)) return 1;
  return 1 - Math.max(0, Math.min(selectedWeekIndex, 7)) * 0.012;
}

export const planningWeekLabels = ['W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42', 'W43'];

function historicalScheduleEstimate(index: number): number {
  const week = planningWeekLabels[index];
  return historicalFollowUpWeeks.find(item => item.year === 2025 && item.week === week)?.loginHours ?? 0;
}

function selectedStpWeekCodes(selection: PlanningWeekSelection): string[] | undefined {
  if (selection === null) return undefined;
  const indices = Array.isArray(selection) ? selection : [selection];
  return indices.map(index => `2026${String(36 + index).padStart(2, '0')}`);
}

function selectedWeekIndexes(selection: PlanningWeekSelection): number[] {
  if (selection === null) return planningWeekLabels.map((_, index) => index);
  return Array.isArray(selection) ? selection : [selection];
}

function filterFilesToSelectedWeeks(files: UploadedFileRecord[], selection: PlanningWeekSelection): UploadedFileRecord[] {
  if (selection === null) return files;
  const selected = new Set(Array.isArray(selection) ? selection : [selection]);
  const recordsWithWeeks = files.flatMap(file => file.records).some(record => recordWeekIndex(record) !== undefined);
  if (!recordsWithWeeks) return files;
  return files.map(file => ({
    ...file,
    records: file.records.filter(record => {
      const index = recordWeekIndex(record);
      return index === undefined || selected.has(index);
    })
  }));
}

const defaultPlanningTrend: LabourData[] = [
  { date: 'W36', requiredHours: 5637, scheduledHours: 5550, variance: -87, capability: 98.5, gap: 87 },
  { date: 'W37', requiredHours: 5096, scheduledHours: 5350, variance: 254, capability: 105, gap: 0 },
  { date: 'W38', requiredHours: 5333, scheduledHours: 5050, variance: -283, capability: 94.7, gap: 283 },
  { date: 'W39', requiredHours: 4525, scheduledHours: 5200, variance: 675, capability: 114.9, gap: 0 },
  { date: 'W40', requiredHours: 5018, scheduledHours: 5018, variance: 0, capability: 100, gap: 0 },
  { date: 'W41', requiredHours: 5022, scheduledHours: 5018, variance: -4, capability: 99.9, gap: 4 },
  { date: 'W42', requiredHours: 4895, scheduledHours: 4904, variance: 9, capability: 100.2, gap: 0 },
  { date: 'W43', requiredHours: 4575, scheduledHours: 4596, variance: 21, capability: 100.5, gap: 0 }
];

export function filterPlanningWeeks<T>(data: T[], selectedIndices: number[]): T[] {
  if (selectedIndices.length === planningWeekLabels.length) return data;
  const selected = new Set(selectedIndices);
  return data.filter((_, index) => selected.has(index));
}

function isoWeekNumber(dateValue: string): number | undefined {
  const rawDate = String(dateValue ?? '').trim();
  const ukDateMatch = rawDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const date = ukDateMatch
    ? new Date(Number(ukDateMatch[3]), Number(ukDateMatch[2]) - 1, Number(ukDateMatch[1]))
    : new Date(rawDate);
  if (Number.isNaN(date.getTime())) return undefined;

  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function recordWeekIndex(record: Record<string, string | number>): number | undefined {
  const explicitWeek = String(record.weekCode ?? record.week ?? record.period ?? record.code ?? '');
  const explicitMatch = explicitWeek.match(/(?:20\d{2})?(?:W)?(\d{2})/i);
  if (explicitMatch) {
    const weekNumber = Number(explicitMatch[1]);
    if (weekNumber >= 36 && weekNumber <= 43) return weekNumber - 36;
  }

  const dateValue = String(record.date ?? record.shiftdate ?? record.absenceDate ?? '');
  if (dateValue) {
    const weekNumber = isoWeekNumber(dateValue);
    if (weekNumber !== undefined && weekNumber >= 36 && weekNumber <= 43) return weekNumber - 36;
  }
  const weekNumber = isoWeekNumber(dateValue);
  if (weekNumber !== undefined && weekNumber >= 36 && weekNumber <= 43) return weekNumber - 36;
  return undefined;
}

export function hasPlanningScheduleForWeek(files: UploadedFileRecord[], index: number): boolean {
  return files
    .filter(file => file.kind === 'schedule')
    .flatMap(file => file.records)
    .some(record => recordWeekIndex(record) === index && normalizeNumber(record.scheduledHours ?? record.hours ?? 0) > 0);
}

function weeklyValue<T extends Record<string, string | number>>(
  rows: T[],
  valueForRow: (row: T) => number
): number[] {
  const values = planningWeekLabels.map(() => 0);
  let matchedRows = 0;
  const total = rows.reduce((sum, row) => sum + valueForRow(row), 0);

  rows.forEach(row => {
    const index = recordWeekIndex(row);
    if (index === undefined) return;
    values[index] += valueForRow(row);
    matchedRows += 1;
  });

  if (!matchedRows || (total > 0 && values.every(value => value === 0))) {
    return values.map(() => total / planningWeekLabels.length);
  }

  return values;
}

function trainingRateForDate(dateValue: unknown, resourceMapping?: ResourceMapping): number {
  if (!resourceMapping) return 0;
  const raw = String(dateValue ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match ? new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return resourceMapping.training;
  const month = date.toLocaleString('en-GB', { month: 'long' });
  return resourceMapping.monthValues?.[month]?.training ?? resourceMapping.training;
}

export function productiveScheduledHours(record: Record<string, string | number>, resourceMapping?: ResourceMapping, allocatedRejectionMinutes = 0): number {
  const recordedHours = normalizeNumber(record.scheduledHours ?? record.hours ?? 0);
  const grossShiftHours = recordedHours > 0 ? recordedHours : Math.max(resourceMapping?.averageShiftHoursPerShift ?? 7.5, 0);
  const trainedHours = grossShiftHours * (1 - trainingRateForDate(record.date ?? record.shiftdate, resourceMapping));
  const additionalMinutes = Math.max(resourceMapping?.shiftHandoverMinutesPerShift ?? 10, 0)
    + Math.max(resourceMapping?.truckInspectionMinutesPerShift ?? 30, 0)
    + Math.max(resourceMapping?.palletlessMinutesPerShift ?? 0, 0)
    + Math.max(resourceMapping?.travelMinutesPerShift ?? 90, 0)
    + Math.max(allocatedRejectionMinutes, 0);
  const breakHours = Math.max(resourceMapping?.breakMinutesPerShift ?? 45, 0) / 60;
  return Math.max(trainedHours - breakHours - additionalMinutes / 60, 0);
}

export function productiveHoursByScheduleRecord(records: Array<Record<string, string | number>>, resourceMapping?: ResourceMapping, applyHistoricalCyclesExclusion = true): Map<Record<string, string | number>, number> {
  const rosteredHoursByDay = new Map<string, number>();
  records.forEach(record => {
    const date = scheduleDate(record);
    const key = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : String(record.date ?? record.shiftdate ?? 'unspecified');
    rosteredHoursByDay.set(key, (rosteredHoursByDay.get(key) ?? 0) + Math.max(normalizeNumber(record.scheduledHours ?? record.hours ?? 0), 0));
  });
  const dailyRejectionMinutes = Math.max(resourceMapping?.averageRejectionsPerDay ?? 224, 0) * Math.max(resourceMapping?.rejectionMinutesPerRejection ?? 1.5, 0);
  const productiveHours = new Map(records.map(record => {
    const date = scheduleDate(record);
    const key = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : String(record.date ?? record.shiftdate ?? 'unspecified');
    const rosteredHours = Math.max(normalizeNumber(record.scheduledHours ?? record.hours ?? 0), 0);
    const totalDayHours = rosteredHoursByDay.get(key) ?? 0;
    const allocatedRejectionMinutes = totalDayHours > 0 ? dailyRejectionMinutes * rosteredHours / totalDayHours : 0;
    return [record, productiveScheduledHours(record, resourceMapping, allocatedRejectionMinutes)];
  }));

  const cycleRowsByWeek = new Map<number, Array<Record<string, string | number>>>();
  records.forEach(record => {
    const cycleRole = canonicalRoleName(demandRoleForScheduleRole(roleKey(record))) === 'cycles';
    const weekIndex = recordWeekIndex(record);
    if (!cycleRole || weekIndex === undefined) return;
    const rows = cycleRowsByWeek.get(weekIndex) ?? [];
    rows.push(record);
    cycleRowsByWeek.set(weekIndex, rows);
  });

  if (applyHistoricalCyclesExclusion) cycleRowsByWeek.forEach(cycleRows => {
    const weeklyProductiveCyclesHours = cycleRows.reduce((total, record) => total + (productiveHours.get(record) ?? 0), 0);
    const cycleWeekIndex = recordWeekIndex(cycleRows[0]);
    const weeklyCyclesExclusion = cycleWeekIndex !== undefined && cycleWeekIndex > 2 ? 0 : 1000;
    const hoursToExclude = Math.min(weeklyCyclesExclusion, weeklyProductiveCyclesHours);
    if (hoursToExclude <= 0) return;
    cycleRows.forEach(record => {
      const rowHours = productiveHours.get(record) ?? 0;
      const allocatedExclusion = weeklyProductiveCyclesHours > 0 ? hoursToExclude * rowHours / weeklyProductiveCyclesHours : 0;
      productiveHours.set(record, Math.max(rowHours - allocatedExclusion, 0));
    });
  });

  return productiveHours;
}

function scheduleDate(record: Record<string, string | number>): Date | undefined {
  const raw = String(record.date ?? record.shiftdate ?? '').trim();
  const ukDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const normalized = ukDate
    ? `${ukDate[3]}-${String(ukDate[2]).padStart(2, '0')}-${String(ukDate[1]).padStart(2, '0')}`
    : raw.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function timeToMinutes(value: unknown): number | undefined {
  const match = String(value ?? '').trim().match(/(?:^|T)(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : undefined;
}

function shiftForScheduleRecord(record: Record<string, string | number>): DailyShiftCapacityRow['shift'] {
  const start = timeToMinutes(record.shiftstarttime ?? record.scheduledstarttime ?? record.shiftStartTime ?? record.scheduledStartTime ?? record.startTime);
  const end = timeToMinutes(record.shiftendtime ?? record.scheduledenddate ?? record.shiftEndTime ?? record.scheduledEndTime ?? record.endTime);
  if (start === undefined) return 'Unspecified';
  if (start >= 22 * 60 || (end !== undefined && end < start)) return 'Night';
  return start < 14 * 60 ? 'AM' : 'PM';
}

export function buildDailyShiftCapacityRows(files: UploadedFileRecord[], roles: Role[] = roleDefaults, resourceMapping?: ResourceMapping): DailyShiftCapacityRow[] {
  const grouped = new Map<string, DailyShiftCapacityRow>();
  const scheduleRecords = files.filter(file => file.kind === 'schedule').flatMap(file => file.records);
  const productiveHoursByRecord = productiveHoursByScheduleRecord(scheduleRecords, resourceMapping);
  scheduleRecords.forEach(record => {
    const date = scheduleDate(record);
    const rosteredHours = normalizeNumber(record.scheduledHours ?? record.hours ?? 0);
    if (!date || rosteredHours <= 0) return;
    const role = roleKey(record);
    const displayRole = lookupRole(role, roles)?.translation || role;
    const shift = shiftForScheduleRecord(record);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const key = `${dateKey}|${shift}|${displayRole}`;
    const existing = grouped.get(key);
    grouped.set(key, {
      date: dateKey,
      day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
      shift,
      role: displayRole,
      rosteredHours: (existing?.rosteredHours ?? 0) + rosteredHours,
      productiveHours: (existing?.productiveHours ?? 0) + (productiveHoursByRecord.get(record) ?? 0),
      shiftCount: (existing?.shiftCount ?? 0) + 1
    });
  });
  const shiftOrder = { AM: 0, PM: 1, Night: 2, Unspecified: 3 };
  return Array.from(grouped.values()).sort((left, right) => left.date.localeCompare(right.date)
    || shiftOrder[left.shift] - shiftOrder[right.shift]
    || left.role.localeCompare(right.role));
}

function stpWeekCode(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  if (value.getDay() === 0) value.setDate(value.getDate() + 1);
  const utcDate = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}${String(week).padStart(2, '0')}`;
}

export function buildDailyShiftCapabilityRows(files: UploadedFileRecord[], roles: Role[] = roleDefaults, resourceMapping?: ResourceMapping, inboundBacklogTrailers = 0): DailyShiftCapabilityRow[] {
  const rawCapacityRows = buildDailyShiftCapacityRows(files, roles, resourceMapping);
  const capacityRows = Array.from(rawCapacityRows.reduce((grouped, row) => {
    const demandRole = demandRoleForScheduleRole(row.role);
    const displayRole = lookupRole(demandRole, roles)?.translation || row.role;
    const key = `${row.date}|${row.shift}|${demandRole}`;
    const existing = grouped.get(key);
    grouped.set(key, {
      ...row,
      role: displayRole,
      rosteredHours: (existing?.rosteredHours ?? 0) + row.rosteredHours,
      productiveHours: (existing?.productiveHours ?? 0) + row.productiveHours,
      shiftCount: (existing?.shiftCount ?? 0) + row.shiftCount
    });
    return grouped;
  }, new Map<string, DailyShiftCapacityRow>()).values());
  const streamForRole = (role: string) => {
    const normalized = canonicalRoleName(role);
    if (normalized === 'dctipping') return 'dcInbound' as const;
    if (normalized === 'banding' || normalized === 'booking') return 'dcInbound' as const;
    if (normalized === 'bayclearingtransit') return 'transitInbound' as const;
    if (normalized === 'bayclearingdc') return 'dcInbound' as const;
    if (normalized === 'transittipping' || normalized === 'transittip') return 'transitInbound' as const;
    if (normalized === 'dcloading') return 'dcOutbound' as const;
    if (normalized === 'cycles') return 'cycles' as const;
    if (normalized === 'transitloading') return 'transitOutbound' as const;
    return 'picking' as const;
  };
  const demandsByWeek = new Map<string, ReturnType<typeof buildStpDemandPlan>>();
  const demandForWeek = (weekCode: string) => {
    if (!demandsByWeek.has(weekCode)) demandsByWeek.set(weekCode, buildStpDemandPlan(files, stpRoleMappingConfig, roles, [weekCode], resourceMapping));
    return demandsByWeek.get(weekCode)!;
  };
  const backlogRequirementsByWeek = new Map<string, Map<string, number>>();
  const backlogRequirementsForWeek = (weekCode: string) => {
    if (!backlogRequirementsByWeek.has(weekCode)) {
      const additions = new Map<string, number>();
      if (inboundBacklogTrailers > 0 && resourceMapping) {
        const demandRows = demandForWeek(weekCode).roleDemandRows;
        const dcInboundVolume = demandRows.find(item => canonicalRoleName(item.role) === 'dctipping')?.volume ?? 0;
        const transitInboundVolume = demandRows.find(item => canonicalRoleName(item.role) === 'transittipping')?.volume ?? 0;
        const totalInboundVolume = dcInboundVolume + transitInboundVolume;
        const backlogVolume = inboundBacklogTrailers * Math.max(resourceMapping.truckVolumeM3, 0);
        const dcBacklogVolume = totalInboundVolume > 0 ? backlogVolume * dcInboundVolume / totalInboundVolume : backlogVolume;
        const transitBacklogVolume = totalInboundVolume > 0 ? backlogVolume * transitInboundVolume / totalInboundVolume : 0;
        const addHours = (role: string, hours: number) => {
          const key = canonicalRoleName(role);
          additions.set(key, (additions.get(key) ?? 0) + hours);
        };
        addHours('DC Tipping', dcBacklogVolume / Math.max(getRoleTargetRate('DC Tipping', roles), 0.01));
        addHours('Transit Tipping', transitBacklogVolume / Math.max(getRoleTargetRate('Transit Tipping', roles), 0.01));
        addHours('Banding', dcBacklogVolume * 0.03 / Math.max(getRoleTargetRate('Banding', roles), 0.01));
        addHours('Booking', dcBacklogVolume * 0.02 / Math.max(getRoleTargetRate('Booking', roles), 0.01));
        addHours('Bayclearing (DC)', dcBacklogVolume / Math.max(resourceMapping.m3PerPallet, 0.01) / Math.max(resourceMapping.dcBayclearingPalletsPerHour, 0.01));
        addHours('Bayclearing (Transit)', transitBacklogVolume * 0.23 / Math.max(resourceMapping.m3PerPallet, 0.01) / Math.max(resourceMapping.transitBayclearingPalletsPerHour, 0.01));
      }
      backlogRequirementsByWeek.set(weekCode, additions);
    }
    return backlogRequirementsByWeek.get(weekCode)!;
  };

  const dates = Array.from(new Set(capacityRows.map(row => row.date)));
  const demandBackedRows: DailyShiftCapacityRow[] = [];
  for (const date of dates) {
    const weekCode = stpWeekCode(date);
    const demandPlan = demandForWeek(weekCode);
    const day = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long' });
    const existingKeys = new Set(capacityRows.filter(row => row.date === date).map(row => `${row.shift}|${canonicalRoleName(demandRoleForScheduleRole(row.role))}`));
    for (const demand of demandPlan.roleDemandRows) {
      const demandRole = demandRoleForScheduleRole(demand.role);
      const displayRole = lookupRole(demandRole, roles)?.translation || demand.role;
      const profile = resourceMapping?.demandStreamProfiles?.[streamForRole(demandRole)] ?? resourceMapping?.shiftDemandProfiles;
      const dayProfile = profile?.[day];
      if (!dayProfile || demand.requiredHours <= 0) continue;
      (['AM', 'PM', 'Night'] as const).forEach(shift => {
        const key = `${shift}|${canonicalRoleName(demandRole)}`;
        if (existingKeys.has(key)) return;
        demandBackedRows.push({ date, day, shift, role: displayRole, rosteredHours: 0, productiveHours: 0, shiftCount: 0 });
      });
    }
  }
  const allCapacityRows = [...capacityRows, ...demandBackedRows];

  const capabilityRows = allCapacityRows.map(row => {
    const profile = resourceMapping?.demandStreamProfiles?.[streamForRole(row.role)] ?? resourceMapping?.shiftDemandProfiles;
    const profileTotal = profile ? Object.values(profile).reduce((total, day) => total + day.AM + day.PM + day.Night, 0) : 0;
    const dayProfile = profile?.[row.day];
    if (row.shift === 'Unspecified' || !dayProfile || profileTotal <= 0) {
      return { ...row, requiredHours: 0, variance: 0, capability: 0, demandAvailable: false };
    }
    const weekCode = stpWeekCode(row.date);
    const demandRole = demandRoleForScheduleRole(row.role);
    const demand = demandForWeek(weekCode).roleDemandRows.find(item => canonicalRoleName(item.role) === demandRole);
    if (!demand || demand.requiredHours <= 0) {
      return { ...row, requiredHours: 0, variance: row.productiveHours, capability: 0, demandAvailable: false };
    }

    const shiftWeights = [dayProfile.AM ?? 0, dayProfile.PM ?? 0, dayProfile.Night ?? 0];
    const positiveWeights = shiftWeights.filter(weight => weight > 0);
    const floor = positiveWeights.length ? Math.min(...positiveWeights) * 0.1 : 1;
    const normalizedWeights = shiftWeights.map(weight => Math.max(weight, floor));
    const dayShiftTotal = normalizedWeights.reduce((total, weight) => total + weight, 0);
    const weeklyProfileTotal = profile
      ? Object.values(profile).reduce((total, day) => total + day.AM + day.PM + day.Night, 0)
      : 0;
    const rawDayTotal = shiftWeights.reduce((total, weight) => total + weight, 0);
    const dayShare = weeklyProfileTotal > 0 ? rawDayTotal / weeklyProfileTotal : 0;
    const shiftIndex = row.shift === 'AM' ? 0 : row.shift === 'PM' ? 1 : 2;
    const dayShiftShare = dayShiftTotal > 0 ? normalizedWeights[shiftIndex] / dayShiftTotal : 0;
    const backlogRequiredHours = backlogRequirementsForWeek(weekCode).get(canonicalRoleName(demandRole)) ?? 0;
    const requiredHours = (demand.requiredHours + backlogRequiredHours) * dayShare * dayShiftShare;
    if (requiredHours <= 0.01) {
      return { ...row, requiredHours: 0, variance: row.productiveHours, capability: 0, demandAvailable: false };
    }

    const rawCapability = row.productiveHours / requiredHours * 100;
    const variance = row.productiveHours - requiredHours;
    return {
      ...row,
      flow: demand.flow,
      requiredHours,
      variance,
      capability: Math.max(rawCapability, 0),
      demandAvailable: true
    };
  });

  const rowsByDateAndShift = new Map<string, Map<string, DailyShiftCapabilityRow>>();
  capabilityRows.forEach(row => {
    const key = `${row.date}|${row.shift}`;
    const rolesForShift = rowsByDateAndShift.get(key) ?? new Map<string, DailyShiftCapabilityRow>();
    rolesForShift.set(canonicalRoleName(row.role), row);
    rowsByDateAndShift.set(key, rolesForShift);
  });
  rowsByDateAndShift.forEach(rolesForShift => {
    const booking = rolesForShift.get('booking');
    const dcTipping = rolesForShift.get('dctipping');
    if (!booking || !dcTipping || !booking.demandAvailable || !dcTipping.demandAvailable) return;
    const transferredHours = Math.min(booking.requiredHours, dcTipping.productiveHours);
    const transferredPeople = dcTipping.productiveHours > 0
      ? dcTipping.shiftCount * transferredHours / dcTipping.productiveHours
      : 0;
    booking.productiveHours = transferredHours;
    booking.shiftCount = transferredPeople;
    booking.variance = booking.productiveHours - booking.requiredHours;
    booking.capability = booking.requiredHours > 0 ? booking.productiveHours / booking.requiredHours * 100 : 0;
    dcTipping.productiveHours -= transferredHours;
    dcTipping.shiftCount = Math.max(dcTipping.shiftCount - transferredPeople, 0);
    dcTipping.variance = dcTipping.productiveHours - dcTipping.requiredHours;
    dcTipping.capability = dcTipping.requiredHours > 0 ? dcTipping.productiveHours / dcTipping.requiredHours * 100 : 0;

    const banding = rolesForShift.get('banding');
    const dcBayclearing = rolesForShift.get('bayclearingdc');
    const transitBayclearing = rolesForShift.get('bayclearingtransit');
    if (!banding || !dcBayclearing || !transitBayclearing || !banding.demandAvailable || !dcBayclearing.demandAvailable || !transitBayclearing.demandAvailable) return;
    const equalShareHours = Math.min(banding.requiredHours / 2, dcBayclearing.productiveHours, transitBayclearing.productiveHours);
    if (equalShareHours <= 0) return;
    const dcPeople = dcBayclearing.productiveHours > 0 ? dcBayclearing.shiftCount * equalShareHours / dcBayclearing.productiveHours : 0;
    const transitPeople = transitBayclearing.productiveHours > 0 ? transitBayclearing.shiftCount * equalShareHours / transitBayclearing.productiveHours : 0;
    const bandingTransferredHours = equalShareHours * 2;
    banding.productiveHours = bandingTransferredHours;
    banding.shiftCount = dcPeople + transitPeople;
    banding.variance = banding.productiveHours - banding.requiredHours;
    banding.capability = banding.requiredHours > 0 ? banding.productiveHours / banding.requiredHours * 100 : 0;
    dcBayclearing.productiveHours -= equalShareHours;
    dcBayclearing.shiftCount = Math.max(dcBayclearing.shiftCount - dcPeople, 0);
    dcBayclearing.variance = dcBayclearing.productiveHours - dcBayclearing.requiredHours;
    dcBayclearing.capability = dcBayclearing.requiredHours > 0 ? dcBayclearing.productiveHours / dcBayclearing.requiredHours * 100 : 0;
    transitBayclearing.productiveHours -= equalShareHours;
    transitBayclearing.shiftCount = Math.max(transitBayclearing.shiftCount - transitPeople, 0);
    transitBayclearing.variance = transitBayclearing.productiveHours - transitBayclearing.requiredHours;
    transitBayclearing.capability = transitBayclearing.requiredHours > 0 ? transitBayclearing.productiveHours / transitBayclearing.requiredHours * 100 : 0;
  });

  return capabilityRows;
}

export function buildPlanningSnapshot(files: UploadedFileRecord[], roles: Role[] = roleDefaults, selectedWeekIndex: PlanningWeekSelection = 0, resourceMapping?: ResourceMapping): PlanningSnapshot {
  const scopedFiles = filterFilesToSelectedWeeks(files, selectedWeekIndex);
  const scheduleRows = files.filter(file => file.kind === 'schedule').flatMap(file => file.records);
  const productiveHoursByRecord = productiveHoursByScheduleRecord(scheduleRows, resourceMapping);
  const weeklyScheduledHours = weeklyValue(scheduleRows, row => productiveHoursByRecord.get(row) ?? 0);
  const selectedIndexes = selectedWeekIndexes(selectedWeekIndex);
  const scheduleHoursForScope = selectedWeekIndex === null
    ? weeklyScheduledHours.reduce((total, value, index) => total + (value || historicalScheduleEstimate(index)), 0)
    : selectedIndexes.reduce((total, index) => total + (weeklyScheduledHours[index] || historicalScheduleEstimate(index)), 0);
  const scopedScheduleHours = scheduleHoursForScope > 0
    ? scheduleHoursForScope
    : (() => {
      const scopedScheduleRows = scopedFiles.filter(file => file.kind === 'schedule').flatMap(file => file.records);
      const scopedProductiveHours = productiveHoursByScheduleRecord(scopedScheduleRows, resourceMapping);
      return scopedScheduleRows.reduce((total, record) => total + (scopedProductiveHours.get(record) ?? 0), 0);
    })();
  const scheduledHours = Math.max(0, scopedScheduleHours) * weekScheduleScale(selectedWeekIndex);
  const plannedAbsenceHours = sumField(scopedFiles, 'absence', ['absenceHours', 'plannedAbsenceHours', 'hours']);
  const stpDemandPlan = buildStpDemandPlan(files, stpRoleMappingConfig, roles, selectedStpWeekCodes(selectedWeekIndex), resourceMapping);

  const stpDerivedHours = stpDemandPlan.roleDemandRows.reduce((acc, row) => acc + row.requiredHours, 0);
  const volume = sumField(files, 'stp', ['volume', 'm2', 'm3', 'actualVolume']);

  const rawRequiredHours = stpDerivedHours > 0
    ? stpDerivedHours + plannedAbsenceHours * 0.15
    : scheduledHours > 0 ? scheduledHours : 0;

  const requiredHours = Math.max(rawRequiredHours, 0) * weekScale(selectedWeekIndex);

  const capability = (scheduledHours / Math.max(requiredHours, 1)) * 100;
  const variance = scheduledHours - requiredHours;
  const gap = Math.max(requiredHours - scheduledHours, 0);

  return {
    scheduledHours,
    volume,
    plannedAbsenceHours,
    requiredHours,
    capability,
    variance,
    gap,
    lookaheadWeeks: 8
  };
}

export function buildPlanningCapabilityRows(files: UploadedFileRecord[], roles: Role[] = roleDefaults, selectedWeekIndex: PlanningWeekSelection = 0, resourceMapping?: ResourceMapping) {
  if (!files.length) {
    return capabilityMetrics.map(item => {
      const requiredHours = item.requiredHours * weekScale(selectedWeekIndex);
      const scheduledHours = item.scheduledHours * weekScheduleScale(selectedWeekIndex);
      const capability = scheduledHours / Math.max(requiredHours, 1) * 100;
      return {
        id: item.role,
        role: lookupRole(item.role, roles)?.translation || item.role,
        requiredHours,
        scheduledHours,
        variance: scheduledHours - requiredHours,
        capability,
        status: statusFromCapability(capability),
        recommendation: recommendationFromCapability(capability)
      };
    });
  }

  const scopedFiles = filterFilesToSelectedWeeks(files, selectedWeekIndex);
  const scheduleRows = scopedFiles.filter(file => file.kind === 'schedule').flatMap(file => file.records);
  const stpDemandPlan = buildStpDemandPlan(files, stpRoleMappingConfig, roles, selectedStpWeekCodes(selectedWeekIndex), resourceMapping);

  const scheduledByRole = new Map<string, number>();
  const rawRequiredByRole = new Map<string, number>();
  const productiveHoursByRecord = productiveHoursByScheduleRecord(scheduleRows, resourceMapping);

  for (const record of scheduleRows) {
    const role = roleKey(record);
    const normalizedRole = canonicalRoleName(demandRoleForScheduleRole(role));
    const hours = productiveHoursByRecord.get(record) ?? 0;
    if (hours > 0) {
      scheduledByRole.set(normalizedRole, (scheduledByRole.get(normalizedRole) ?? 0) + hours);
    }
  }

  for (const row of stpDemandPlan.roleDemandRows) {
    const role = canonicalRoleName(demandRoleForScheduleRole(row.role));
    if (row.requiredHours > 0) {
      rawRequiredByRole.set(role, (rawRequiredByRole.get(role) ?? 0) + row.requiredHours);
    }
  }

  const bookingRoleKey = canonicalRoleName('Booking');
  const dcTippingRoleKey = canonicalRoleName('DC Tipping');
  const bookingRequiredHours = rawRequiredByRole.get(bookingRoleKey) ?? 0;
  const dcTippingScheduledHours = scheduledByRole.get(dcTippingRoleKey) ?? 0;
  const bookingTransferredHours = Math.min(bookingRequiredHours, dcTippingScheduledHours);
  if (bookingTransferredHours > 0) {
    scheduledByRole.set(bookingRoleKey, bookingTransferredHours);
    scheduledByRole.set(dcTippingRoleKey, dcTippingScheduledHours - bookingTransferredHours);
  }

  const bandingRoleKey = canonicalRoleName('Banding');
  const dcBayclearingRoleKey = canonicalRoleName('Bayclearing (DC)');
  const transitBayclearingRoleKey = canonicalRoleName('Bayclearing (Transit)');
  const bandingRequiredHours = rawRequiredByRole.get(bandingRoleKey) ?? 0;
  const dcBayclearingScheduledHours = scheduledByRole.get(dcBayclearingRoleKey) ?? 0;
  const transitBayclearingScheduledHours = scheduledByRole.get(transitBayclearingRoleKey) ?? 0;
  const equalBayclearingTransfer = Math.min(bandingRequiredHours / 2, dcBayclearingScheduledHours, transitBayclearingScheduledHours);
  if (equalBayclearingTransfer > 0) {
    scheduledByRole.set(bandingRoleKey, equalBayclearingTransfer * 2);
    scheduledByRole.set(dcBayclearingRoleKey, dcBayclearingScheduledHours - equalBayclearingTransfer);
    scheduledByRole.set(transitBayclearingRoleKey, transitBayclearingScheduledHours - equalBayclearingTransfer);
  }

  const totalScheduledHours = Array.from(scheduledByRole.values()).reduce((total, hours) => total + hours, 0);
  const scheduleAdjustment = 1;

  const roleKeys = new Set([
    ...scheduledByRole.keys(),
    ...rawRequiredByRole.keys(),
    ...(stpDemandPlan.missingMappings ?? []).map(item => canonicalRoleName(item.role))
  ]);
  if (!roleKeys.size) {
    return capabilityMetrics.map(item => ({
      id: item.role,
      role: lookupRole(item.role, roles)?.translation || item.role,
      requiredHours: item.requiredHours,
      scheduledHours: item.scheduledHours,
      variance: item.variance,
      capability: item.capability,
      status: statusFromCapability(item.capability),
      recommendation: recommendationFromCapability(item.capability)
    }));
  }

  return Array.from(roleKeys).map(role => {
    const scheduledHours = (scheduledByRole.get(canonicalRoleName(role)) ?? 0) * scheduleAdjustment * weekScheduleScale(selectedWeekIndex);
    const requiredHours = (rawRequiredByRole.get(role) ?? 0) * weekScale(selectedWeekIndex);
    const demand = stpDemandPlan.roleDemandRows.find(row => canonicalRoleName(row.role) === role);
    const targetRate = demand?.targetRate ?? getRoleTargetRate(role, roles);
    const displayRole = lookupRole(role, roles)?.translation || role;
    const hasMissingMapping = (stpDemandPlan.missingMappings ?? []).some(item => canonicalRoleName(item.role) === role);

    const variance = scheduledHours - requiredHours;
    const rawCapability = requiredHours > 0 ? (scheduledHours / Math.max(requiredHours, 1)) * 100 : 0;
    const capability = clamp(rawCapability, 0, 200);
    const status = hasMissingMapping ? 'No mapping' : statusFromCapability(capability);

    return {
      id: role,
      role: displayRole,
      flow: demand?.flow,
      volume: demand?.volume ?? 0,
      targetUnit: demand?.targetUnit ?? getRoleTargetUnit(role),
      targetRate,
      requiredHours,
      scheduledHours,
      variance,
      capability,
      status,
      recommendation: hasMissingMapping ? 'Configure an STP measure mapping' : recommendationFromCapability(capability)
    };
  });
}

export function buildPlanningTrendData(files: UploadedFileRecord[], roles: Role[] = roleDefaults, selectedWeekIndex: PlanningWeekSelection = 0, resourceMapping?: ResourceMapping): LabourData[] {
  if (!files.length) {
    return defaultPlanningTrend.map(item => ({
      ...item,
      date: planningWeekLabels[defaultPlanningTrend.indexOf(item)],
      requiredHours: item.requiredHours * weekScale(selectedWeekIndex),
      scheduledHours: item.scheduledHours * weekScheduleScale(selectedWeekIndex),
      variance: item.scheduledHours * weekScheduleScale(selectedWeekIndex) - item.requiredHours * weekScale(selectedWeekIndex),
      capability: item.scheduledHours * weekScheduleScale(selectedWeekIndex) / Math.max(item.requiredHours * weekScale(selectedWeekIndex), 1) * 100,
      gap: Math.max(item.requiredHours * weekScale(selectedWeekIndex) - item.scheduledHours * weekScheduleScale(selectedWeekIndex), 0)
    }));
  }

  const scheduleRows = files.filter(file => file.kind === 'schedule').flatMap(file => file.records);
  const stpDemandPlan = buildStpDemandPlan(files, stpRoleMappingConfig, roles, undefined, resourceMapping);

  const productiveHoursByRecord = productiveHoursByScheduleRecord(scheduleRows, resourceMapping);
  const weeklyScheduledHours = weeklyValue(scheduleRows, row => productiveHoursByRecord.get(row) ?? 0);
  const totalRequiredHours = stpDemandPlan.roleDemandRows.reduce((acc, row) => acc + row.requiredHours, 0);
  const out = planningWeekLabels.map((label, idx) => {
    const scheduledHours = weeklyScheduledHours[idx] || historicalScheduleEstimate(idx);
    const weekDemand = buildStpDemandPlan(files, stpRoleMappingConfig, roles, [
      `2026${String(36 + idx).padStart(2, '0')}`
    ], resourceMapping);
    const requiredHours = weekDemand.roleDemandRows.reduce((total, row) => total + row.requiredHours, 0);
    const calculatedRequired = requiredHours || 600;

    return {
      date: label,
      requiredHours: Math.round(calculatedRequired * weekScale(selectedWeekIndex)),
      scheduledHours: Math.round(scheduledHours * weekScheduleScale(selectedWeekIndex)),
      variance: Math.round(scheduledHours * weekScheduleScale(selectedWeekIndex) - calculatedRequired * weekScale(selectedWeekIndex)),
      capability: Math.round(((scheduledHours * weekScheduleScale(selectedWeekIndex) / Math.max(calculatedRequired * weekScale(selectedWeekIndex), 1)) * 100) * 10) / 10,
      gap: Math.max(Math.round(calculatedRequired * weekScale(selectedWeekIndex) - scheduledHours * weekScheduleScale(selectedWeekIndex)), 0),
      estimated: weeklyScheduledHours[idx] <= 0
    };
  });

  return out;
}

export function buildPlanningAbsenceTrendData(files: UploadedFileRecord[], selectedWeekIndex: PlanningWeekSelection = 0): Array<Record<string, string | number>> {
  const absenceRows = files.filter(file => file.kind === 'absence').flatMap(file => file.records);
  const fallbackTotal = absenceData.reduce((total, row) => total + row.absenceHours, 0);
  const totalAbsenceHours = absenceRows.length > 0
    ? absenceRows.reduce((total, row) => total + normalizeNumber(row.absenceHours ?? row.hours ?? 0), 0)
    : fallbackTotal;
  const hasMappedRows = absenceRows.some(row => recordWeekIndex(row) !== undefined);

  if (!absenceRows.length || !hasMappedRows) {
    return planningWeekLabels.map((label, index) => ({
      date: label,
      absenceHours: selectedWeekIndexes(selectedWeekIndex).includes(index) && index === selectedWeekIndexes(selectedWeekIndex)[0]
        ? totalAbsenceHours
        : 0
    }));
  }

  const weeklyAbsenceHours = weeklyValue(absenceRows, row => normalizeNumber(row.absenceHours ?? row.hours ?? 0));
  const selectedIndexes = selectedWeekIndexes(selectedWeekIndex);
  if (selectedIndexes.length < planningWeekLabels.length && totalAbsenceHours > 0 && selectedIndexes.every(index => weeklyAbsenceHours[index] === 0)) {
    weeklyAbsenceHours[selectedIndexes[0]] = totalAbsenceHours;
  }
  const scale = weekScale(selectedWeekIndex);

  return planningWeekLabels.map((label, index) => ({
    date: label,
    absenceHours: weeklyAbsenceHours[index] * scale
  }));
}

export function buildPlanningAbsenceBreakdown(files: UploadedFileRecord[], selectedWeekIndex: PlanningWeekSelection = 0): AbsenceData[] {
  if (!files.length) {
    return absenceData.map(item => ({ ...item, absenceHours: item.absenceHours * weekScale(selectedWeekIndex) }));
  }

  const scopedFiles = filterFilesToSelectedWeeks(files, selectedWeekIndex);
  const absenceRows = scopedFiles.filter(file => file.kind === 'absence').flatMap(file => file.records);
  const byType = new Map<string, number>();

  for (const row of absenceRows) {
    const type = String(row.absenceType ?? row.type ?? 'Other');
    const hours = normalizeNumber(row.absenceHours ?? row.hours ?? 0);
    byType.set(type, (byType.get(type) ?? 0) + hours);
  }

  if (!byType.size) {
    return absenceData.map(item => ({ ...item, absenceHours: item.absenceHours * weekScale(selectedWeekIndex) }));
  }

  return Array.from(byType.entries()).map(([absenceType, absenceHours]) => ({ absenceType, absenceHours: absenceHours * weekScale(selectedWeekIndex) }));
}

export function buildFollowUpYtdSnapshot(files: UploadedFileRecord[], roles: Role[] = roleDefaults, resourceMapping?: ResourceMapping): FollowUpSnapshot {
  const paidHours = sumField(files, 'paid-hours', ['paidHours', 'hours', 'workedHours']);
  const actualVolume = sumField(files, 'actual-volume', ['actualVolume', 'volume', 'm2']);
  const actualAbsenceHours = sumField(files, 'absence', ['absenceHours', 'hours']);
  const stpVolume = sumField(files, 'stp', ['volume', 'm2', 'actualVolume']);
  const stpDerivedHours = buildStpDemandPlan(files, stpRoleMappingConfig, roles, undefined, resourceMapping).roleDemandRows
    .reduce((acc, row) => acc + row.requiredHours, 0);

  const productivityAssumption = roles.length ? roles.reduce((acc, role) => acc + Math.max(role.palletsPerHour, 1), 0) / roles.length : 22.5;
  const derivedRequiredFromStp = Math.max(paidHours * 0.9, stpDerivedHours);
  const requiredHours = Math.max(paidHours * 0.8, derivedRequiredFromStp + actualAbsenceHours * 0.2);
  const variance = paidHours - requiredHours;
  const capability = (paidHours / Math.max(requiredHours, 1)) * 100;
  const gap = Math.max(requiredHours - paidHours, 0);

  return {
    paidHours,
    actualVolume,
    actualAbsenceHours,
    requiredHours,
    variance,
    capability,
    gap,
    ytdStartLabel: 'YTD starting Sep 1',
    productivityAssumption
  };
}
