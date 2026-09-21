export type RoleType = 'Operational' | 'Non-Ops';

export interface Role {
  id: string;
  role: string;
  translation: string;
  palletsPerHour: number;
  m3PerPallet: number;
  targetRate?: number;
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
  productivityTargetM3PerHour: number;
  monthValues: Record<string, MonthlyResourceMapping>;
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
  | 'm2-history';

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
}
