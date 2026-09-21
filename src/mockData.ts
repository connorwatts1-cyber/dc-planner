import { AbsenceData, CapabilityMetric, ExportMetrics, LabourData, MtpMonthData, ResourceMapping, Role, ScenarioData } from './types';

export const mtpMonths: MtpMonthData[] = [
  { month: 'September', weeksIncluded: 217835, inboundVolume: 101342, outflowVolume: 99109, totalHandlingVolume: 200451, averageWeeklyVolume: 46294, operationalHoursNeed: 19385, fteForFp: 127, fteForPick: 8, fteDevelopment: 3, fteSickness: 21, fteHolidays: 14, totalFteNeed: 173 },
  { month: 'October', weeksIncluded: 239404, inboundVolume: 96798, outflowVolume: 97766, totalHandlingVolume: 194565, averageWeeklyVolume: 44934, operationalHoursNeed: 18845, fteForFp: 124, fteForPick: 8, fteDevelopment: 3, fteSickness: 20, fteHolidays: 16, totalFteNeed: 171 },
  { month: 'November', weeksIncluded: 208653, inboundVolume: 99731, outflowVolume: 98840, totalHandlingVolume: 198571, averageWeeklyVolume: 45859, operationalHoursNeed: 19216, fteForFp: 132, fteForPick: 9, fteDevelopment: 3, fteSickness: 20, fteHolidays: 16, totalFteNeed: 180 },
  { month: 'December', weeksIncluded: 179123, inboundVolume: 90098, outflowVolume: 90270, totalHandlingVolume: 180368, averageWeeklyVolume: 41656, operationalHoursNeed: 17412, fteForFp: 110, fteForPick: 7, fteDevelopment: 2, fteSickness: 20, fteHolidays: 32, totalFteNeed: 171 },
  { month: 'January', weeksIncluded: 189940, inboundVolume: 84662, outflowVolume: 83263, totalHandlingVolume: 167925, averageWeeklyVolume: 38782, operationalHoursNeed: 16239, fteForFp: 111, fteForPick: 8, fteDevelopment: 8, fteSickness: 20, fteHolidays: 20, totalFteNeed: 167 },
  { month: 'February', weeksIncluded: 189307, inboundVolume: 93477, outflowVolume: 87451, totalHandlingVolume: 180928, averageWeeklyVolume: 41785, operationalHoursNeed: 17312, fteForFp: 125, fteForPick: 8, fteDevelopment: 4, fteSickness: 20, fteHolidays: 28, totalFteNeed: 185 },
  { month: 'March', weeksIncluded: 208813, inboundVolume: 100920, outflowVolume: 91336, totalHandlingVolume: 192256, averageWeeklyVolume: 44401, operationalHoursNeed: 18389, fteForFp: 116, fteForPick: 7, fteDevelopment: 5, fteSickness: 20, fteHolidays: 28, totalFteNeed: 175 },
  { month: 'April', weeksIncluded: 165058, inboundVolume: 83825, outflowVolume: 88690, totalHandlingVolume: 172515, averageWeeklyVolume: 39842, operationalHoursNeed: 16590, fteForFp: 109, fteForPick: 7, fteDevelopment: 6, fteSickness: 20, fteHolidays: 29, totalFteNeed: 171 },
  { month: 'May', weeksIncluded: 197341, inboundVolume: 72212, outflowVolume: 85642, totalHandlingVolume: 157853, averageWeeklyVolume: 36456, operationalHoursNeed: 15110, fteForFp: 103, fteForPick: 7, fteDevelopment: 7, fteSickness: 19, fteHolidays: 35, totalFteNeed: 172 },
  { month: 'June', weeksIncluded: 170234, inboundVolume: 84494, outflowVolume: 79698, totalHandlingVolume: 164192, averageWeeklyVolume: 37920, operationalHoursNeed: 15589, fteForFp: 103, fteForPick: 6, fteDevelopment: 8, fteSickness: 19, fteHolidays: 38, totalFteNeed: 175 },
  { month: 'July', weeksIncluded: 206494, inboundVolume: 101698, outflowVolume: 95861, totalHandlingVolume: 197559, averageWeeklyVolume: 45626, operationalHoursNeed: 18737, fteForFp: 123, fteForPick: 8, fteDevelopment: 8, fteSickness: 19, fteHolidays: 19, totalFteNeed: 177 },
  { month: 'August', weeksIncluded: 232039, inboundVolume: 107262, outflowVolume: 106670, totalHandlingVolume: 213931, averageWeeklyVolume: 49407, operationalHoursNeed: 20321, fteForFp: 134, fteForPick: 9, fteDevelopment: 1, fteSickness: 19, fteHolidays: 13, totalFteNeed: 176 }
];

export const roleDefaults: Role[] = [
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

export const capabilityMetrics: CapabilityMetric[] = [
  { role: 'Bayclearing', requiredHours: 120, scheduledHours: 116, variance: -4, capability: 96.7, gap: 4, recommendation: 'Monitor', status: 'Amber' },
  { role: 'Cycles', requiredHours: 68, scheduledHours: 70, variance: 2, capability: 102.9, gap: -2, recommendation: 'Sufficient Capacity', status: 'Green' },
  { role: 'DC Loading', requiredHours: 150, scheduledHours: 137, variance: -13, capability: 91.3, gap: 13, recommendation: 'Increase staffing or reduce planned volume', status: 'Red' },
  { role: 'Picking', requiredHours: 190, scheduledHours: 185, variance: -5, capability: 97.4, gap: 5, recommendation: 'Monitor', status: 'Amber' },
  { role: 'Replens', requiredHours: 94, scheduledHours: 98, variance: 4, capability: 104.3, gap: -4, recommendation: 'Sufficient Capacity', status: 'Green' }
];

export const trendData: LabourData[] = [
  { date: 'Week 1', requiredHours: 580, scheduledHours: 554, variance: -26, capability: 95.5, gap: 26 },
  { date: 'Week 2', requiredHours: 590, scheduledHours: 575, variance: -15, capability: 97.5, gap: 15 },
  { date: 'Week 3', requiredHours: 602, scheduledHours: 600, variance: -2, capability: 99.7, gap: 2 },
  { date: 'Week 4', requiredHours: 620, scheduledHours: 610, variance: -10, capability: 98.4, gap: 10 },
  { date: 'Week 5', requiredHours: 610, scheduledHours: 640, variance: 30, capability: 104.9, gap: -30 }
];

export const absenceData: AbsenceData[] = [
  { absenceType: 'Sickness', absenceHours: 42 },
  { absenceType: 'Holiday', absenceHours: 33 },
  { absenceType: 'Training', absenceHours: 12 },
  { absenceType: 'Other', absenceHours: 18 }
];

export const resourceMapping: ResourceMapping = {
  absence: 0.10,
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
};

export const scenarioData: ScenarioData = {
  name: 'Baseline Scenario',
  requiredHours: 612,
  scheduledHours: 610,
  capability: 99.84,
  gap: 2,
  fteRequirement: 184,
  variance: -2
};

export const exportMetrics: ExportMetrics = {
  totalWorkedHours: 128206,
  uninfluencableHours: 4328,
  paidAbsence: 1812,
  holidayHours: 920,
  sicknessHours: 540,
  otherAbsenceHours: 150,
  operationalHours: 98500,
  dcHoursExcludingTransit: 74600,
  dcHoursIncludingTransit: 82100,
  transitHours: 7500,
  pickingHours: 23400,
  unproductiveHours: 1200,
  supportHours: 3400,
  agencyHours: 680,
  nonOperationalHours: 2840,
  developmentTrainingHours: 326
};
