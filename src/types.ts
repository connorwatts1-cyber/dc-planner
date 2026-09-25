export type RoleType = 'Operational' | 'Non-Ops';

export interface Role {
  id: string;
  role: string;
  translation: string;
  palletsPerHour: number;
  m3PerPallet: number;
  targetRate?: number;
  demandPercent?: number;
  baselineValue: number;
  type: RoleType;
}

export interface CapabilityMetric {
  role: string;
  requiredHours: number;
  scheduledHours: number;
  variance: number;
  capability: number;
  gap: number;
  recommendation: string;
  status: 'Green' | 'Amber' | 'Red' | 'Blue';
}

export interface AbsenceData {
  absenceType: string;
  absenceHours: number;
}

export interface LabourData {
  date: string;
  requiredHours: number;
  scheduledHours: number;
  variance: number;
  capability: number;
  gap: number;
  estimated?: boolean;
}

export interface ScenarioData {
  name: string;
  requiredHours: number;
  scheduledHours: number;
  capability: number;
  gap: number;
  fteRequirement: number;
  variance: number;
}

export interface ResourceMapping {
  absence: number;
  holiday: number;
  training: number;
  fte: number;
  leavers: number;
  truckVolumeM3: number;
  m3PerPallet: number;
  productivityTargetM3PerHour: number;
  breakMinutesPerShift: number;
  productiveHoursPerShift: number;
  directTaskAvailability: number;
  shiftDemandProfiles: ShiftDemandProfiles;
  demandStreamProfiles: DemandStreamProfiles;
  monthValues: Record<string, MonthlyResourceMapping>;
}

export type OperationalShift = 'AM' | 'PM' | 'Night';
export type ShiftDemandProfiles = Record<string, Record<OperationalShift, number>>;
export type DemandStream = 'dcInbound' | 'transitInbound' | 'dcOutbound' | 'transitOutbound' | 'bayclearing' | 'cycles' | 'picking';
export type DemandStreamProfiles = Record<DemandStream, ShiftDemandProfiles>;

export function defaultShiftDemandProfiles(): ShiftDemandProfiles {
  const dayWeight = 1 / 7;
  return Object.fromEntries(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => [day, {
    AM: dayWeight * 0.4,
    PM: dayWeight * 0.4,
    Night: dayWeight * 0.2
  }])) as ShiftDemandProfiles;
}

export function defaultDemandStreamProfiles(): DemandStreamProfiles {
  const toProfile = (weights: number[]): ShiftDemandProfiles => {
    const total = weights.reduce((sum, value) => sum + value, 0);
    const weight = (index: number) => weights[index] / Math.max(total, 0.01);
    return {
      Sunday: { AM: weight(0), PM: 0, Night: weight(1) },
      Monday: { AM: weight(2), PM: weight(3), Night: weight(4) },
      Tuesday: { AM: weight(5), PM: weight(6), Night: weight(7) },
      Wednesday: { AM: weight(8), PM: weight(9), Night: weight(10) },
      Thursday: { AM: weight(11), PM: weight(12), Night: weight(13) },
      Friday: { AM: weight(14), PM: weight(15), Night: weight(16) },
      Saturday: { AM: weight(17), PM: 0, Night: weight(18) }
    };
  };
  return {
    dcInbound: toProfile([1879.04, 259.84, 1364.16, 1096.2, 24.36, 1818.88, 1282.96, 519.68, 1753.92, 1559.04, 519.68, 2208.64, 1477.84, 259.84, 2825.76, 1153.04, 0, 2598.72, 0]),
    transitInbound: toProfile([0, 517.65, 0, 262.276, 1046.803, 138.04, 1145.732, 1766.912, 0, 1739.304, 1766.912, 0, 1256.164, 1546.048, 0, 1297.576, 1766.912, 509.728, 883.456]),
    dcOutbound: toProfile([1395.744, 0, 1432.368, 1270.374, 616.714, 1040.172, 272.832, 818.496, 1091.328, 818.496, 818.496, 1091.328, 869.652, 818.496, 1909.824, 886.704, 272.832, 1532.16, 0]),
    transitOutbound: toProfile([2708.269, 0, 2234.624, 768.152, 0, 2025.128, 192.038, 0, 1955.296, 0, 0, 1955.296, 0, 0, 2234.624, 0, 0, 2019.968, 0]),
    bayclearing: toProfile([1219.96, 265.389, 1369.032, 1127.462, 358.904, 1539.552, 1364.16, 857.472, 1723.232, 1645.112, 857.472, 1836.912, 906.192, 857.472, 1435.21, 1057.63, 446.6, 2204.272, 0]),
    cycles: toProfile([3290.8, 432.491, 2690.968, 1993.054, 638.435, 2456.3, 1993.866, 704.004, 2884.224, 2283.75, 704.004, 2966.236, 1958.544, 704.004, 3000.746, 2124.192, 964.656, 3377.284, 331.296]),
    picking: toProfile([802.53, 146.16, 803.88, 319.725, 255.78, 675.99, 319.725, 255.78, 383.67, 182.7, 146.16, 529.83, 328.86, 0, 146.16, 146.16, 0, 719.64, 0])
  };
}

export interface MonthlyResourceMapping {
  absence: number;
  holiday: number;
  training: number;
  fte: number;
  leavers: number;
}

export interface ExportMetrics {
  totalWorkedHours: number;
  uninfluencableHours: number;
  paidAbsence: number;
  holidayHours: number;
  sicknessHours: number;
  otherAbsenceHours: number;
  operationalHours: number;
  dcHoursExcludingTransit: number;
  dcHoursIncludingTransit: number;
  transitHours: number;
  pickingHours: number;
  unproductiveHours: number;
  supportHours: number;
  agencyHours: number;
  nonOperationalHours: number;
  developmentTrainingHours: number;
}

export interface UploadItem {
  label: string;
  fileName: string;
}

export type UploadKind =
  | 'forecast'
  | 'schedule'
  | 'absence'
  | 'stp'
  | 'paid-hours'
  | 'actual-volume'
  | 'mtp'
  | 'm2-history'
  | 'holiday-ly'
  | 'holiday-ty';

export type UploadDocumentKind = 'forecast' | 'schedule' | 'absence' | 'stp' | 'paid-hours' | 'volume';

export interface ParsedRow {
  line: number;
  fields: Record<string, string | number>;
}

export interface UploadedDocument {
  id: string;
  kind: UploadDocumentKind;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  summary: string;
  status: string;
  data: ParsedRow[];
  parser: 'placeholder' | 'future-backend' | 'legacy';
}

export interface UploadedFileRecord {
  fileName: string;
  kind: UploadKind;
  importedAt: string;
  records: Array<Record<string, string | number>>;
  status: 'parsed' | 'placeholder' | 'error';
  message: string;
}

export interface MtpMonthData {
  month: string;
  weeksIncluded: number;
  inboundVolume: number;
  outflowVolume: number;
  totalHandlingVolume: number;
  averageWeeklyVolume: number;
  operationalHoursNeed: number;
  fteForFp: number;
  fteForPick: number;
  fteDevelopment: number;
  fteSickness: number;
  fteHolidays: number;
  totalFteNeed: number;
  handlingCapacity?: number;
}
