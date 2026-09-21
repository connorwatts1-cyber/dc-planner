import * as XLSX from 'xlsx';
import { MtpMonthData, UploadedFileRecord, UploadKind } from '../types';
import { stpRoleMappingConfig } from './stpMappingService';

export interface ParsedFileOptions {
  fileName: string;
  kind: UploadKind;
}

function normalizeHeader(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

function normalizeMeasure(name: string): string {
  return normalizeHeader(name).replace(/(actual|forecast|fcst)$/, '');
}

const reverseStpRoleLookup = new Map<string, string>();
for (const [role, measures] of Object.entries(stpRoleMappingConfig)) {
  for (const measure of measures) {
    reverseStpRoleLookup.set(normalizeMeasure(measure), role);
  }
}

const requiredHeaderAliases = new Set([
  'requiredhours', 'requirehours', 'required', 'reqhours', 'reqhrs', 'reqhr', 'hoursrequired', 'hourrequired', 'neededhours',
  'requiredhrs', 'requiredhour', 'hoursreq', 'hoursneeded', 'reqdhrs', 'stprequiredhours', 'stpreqhours',
  'reqdhours', 'hourreq', 'hoursreqd', 'reqdhr', 'reqdhours', 'requiredperiodhours', 'labourrequiredhours',
  'tothoursrequired', 'hoursrequiredstp'
]);

const roleHeaderAliases = new Set([
  'workrole', 'role', 'resourcerole', 'resource', 'jobrole', 'resourcetype', 'workarearole', 'functionrole',
  'resourceworkrole', 'workarearesource', 'workrolecode', 'stprole', 'resourcecategory', 'rolecategory'
]);

const volumeHeaderAliases = new Set([
  'volume', 'm2', 'm3', 'actualvolume', 'actualm3', 'stpvolume', 'plannedvolume', 'volumem2', 'volumem3',
  'totalvolume', 'plannedm2', 'plannedm3', 'stpm2', 'stpm3', 'actualm2', 'inboundvolume', 'outboundvolume',
  'inboundm2', 'outboundm2', 'inboundm3', 'outboundm3'
]);

const roleTranslationMap = new Map<string, string>([
  ['banding', 'Banding'],
  ['bayclearing', 'Bayclearing'],
  ['bayclearm', 'Bayclearing'],
  ['bay', 'Bayclearing'],
  ['booking', 'Booking Office'],
  ['bookingoffice', 'Booking Office'],
  ['picking', 'Picking'],
  ['pick', 'Pick'],
  ['picker', 'Picking'],
  ['pickinginbound', 'Picking'],
  ['replens', 'Replens'],
  ['replenishment', 'Replens'],
  ['replen', 'Replens'],
  ['dcloading', 'DC Loading'],
  ['loading', 'DC Loading'],
  ['dctipping', 'DC Tipping'],
  ['transitbay', 'Transit Bay'],
  ['transitbayclearing', 'Transit Bay'],
  ['transitload', 'Transit Load'],
  ['transittip', 'Transit Tip'],
  ['transittipping', 'Transit Tipping'],
  ['dcbayclear', 'DC Bay Clear'],
  ['transitcycle', 'Transit Cycle'],
  ['transittransfer', 'Transit Transfer'],
  ['tramplock', 'Tram Plock'],
  ['mat', 'Mats'],
  ['mats', 'Mats'],
  ['mct', 'MCT'],
  ['cbpalletless', 'CB Palletless'],
  ['cycles', 'Cycles'],
  ['gatekeeper', 'Gatekeeper'],
  ['coworker', 'Co-Worker'],
  ['recovery', 'Recovery'],
  ['shunting', 'Shunting']
]);

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map(cell => cell.trim());
}

function isStpWorkbookSheet(sheet: XLSX.WorkSheet): boolean {
  const firstRow = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, header: 1 }) as unknown as Array<string[]>;
  const allRows = firstRow.flat().map(value => String(value ?? '').trim());
  return allRows.some(value => value === 'DC_Summary_Measures' || value === 'DC Summary Measures');
}

function toNumber(value: unknown): number {
  const valueString = String(value ?? '').replace(/[^0-9.-]/g, '');
  const raw = Number(valueString);
  return Number.isFinite(raw) ? raw : 0;
}

function toMtpNumber(value: unknown): number {
  const raw = Number(String(value ?? '').replace(/[%£$,]/g, '').trim());
  return Number.isFinite(raw) ? raw : 0;
}

function isoWeekDetails(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return { year: utcDate.getUTCFullYear(), week: Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7) };
}

function parseM2WorkbookSheet(sheet: XLSX.WorkSheet): Array<Record<string, string | number>> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: false });
  const top = rows[1] ?? [];
  const picking = rows[37] ?? [];
  const range = String(top[2] ?? '');
  const [start = '', end = ''] = range.split(' - ');
  if (!start || !range.includes(' - ')) return [];
  const week = isoWeekDetails(start);
  return [{
    weekCode: `${week.year}-W${String(week.week).padStart(2, '0')}`,
    week: `W${String(week.week).padStart(2, '0')}`,
    year: week.year,
    start,
    end,
    m3Received: toMtpNumber(top[19]),
    m3Shipped: toMtpNumber(top[20]),
    m3Handled: toMtpNumber(top[21]),
    volume: toMtpNumber(top[21]),
    actualVolume: toMtpNumber(top[21]),
    loginHours: toMtpNumber(top[26]),
    paidHours: toMtpNumber(top[26]),
    pickingHours: toMtpNumber(picking[4])
  }];
}

function parseMtpWorkbookSheet(sheet: XLSX.WorkSheet): MtpMonthData[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: false });
  const flowHeaderIndex = rows.findIndex(row => String(row[0] ?? '').trim().toLowerCase() === 'flow');
  if (flowHeaderIndex < 0) return [];

  const monthNames = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
  const findRow = (label: string) => rows.find(row => String(row[0] ?? '').trim().toLowerCase() === label.toLowerCase());
  const weeksRow = rows[0];
  const inbound = findRow('TOTAL INBOUND');
  const outflow = findRow('Total Outflow');
  const handling = findRow('Total Handling ');
  const weekly = findRow('Average Weekly volume ');
  const hours = findRow('Operational hrs need');
  const fp = findRow('FTE for FP');
  const pick = findRow('FTE for Pick');
  const development = findRow('FTE to cover development');
  const sickness = findRow('FTE to cover sickness');
  const holidays = findRow('FTE to cover holidays');
  const total = findRow('Total FTE need');

  return monthNames.map((month, index) => {
    const column = index + 2;
    return {
      month,
      weeksIncluded: toMtpNumber(weeksRow?.[column]),
      inboundVolume: toMtpNumber(inbound?.[column]),
      outflowVolume: toMtpNumber(outflow?.[column]),
      totalHandlingVolume: toMtpNumber(handling?.[column]),
      averageWeeklyVolume: toMtpNumber(weekly?.[column]),
      operationalHoursNeed: toMtpNumber(hours?.[column]),
      fteForFp: toMtpNumber(fp?.[column]),
      fteForPick: toMtpNumber(pick?.[column]),
      fteDevelopment: toMtpNumber(development?.[column]),
      fteSickness: toMtpNumber(sickness?.[column]),
      fteHolidays: toMtpNumber(holidays?.[column]),
      totalFteNeed: toMtpNumber(total?.[column])
    };
  });
}

function normalizeRoleName(role: string): string {
  const trimmed = String(role ?? '').trim();
  if (!trimmed) return '';

  const normalized = trimmed.toLowerCase().replace(/[^a-z]+/g, '');
  if (!normalized) return '';

  return roleTranslationMap.get(normalized) ?? trimmed;
}

function looksLikeRoleHeader(name: string): boolean {
  return roleHeaderAliases.has(name)
    || /role/.test(name)
    || /resource/.test(name)
    || /work/.test(name)
    || /function/.test(name)
    || /resourcetype/.test(name);
}

function looksLikeVolumeHeader(name: string): boolean {
  return volumeHeaderAliases.has(name)
    || /volume/.test(name)
    || /m2/.test(name)
    || /m3/.test(name)
    || /inbound/.test(name)
    || /outbound/.test(name)
    || /demand/.test(name)
    || /activity/.test(name);
}

function looksLikeRequiredHoursHeader(name: string): boolean {
  return requiredHeaderAliases.has(name)
    || /required.*hours/.test(name)
    || /req.*hours/.test(name)
    || /hours.*req/.test(name)
    || /hours.*required/.test(name)
    || /req.*hr/.test(name)
    || /needed.*hours/.test(name)
    || /hours.*needed/.test(name);
}

function applyField(record: Record<string, string | number>, name: string, cleaned: string) {
  if (name === 'shiftdate' || name === 'date') {
    record.date = cleaned;
  } else if (name === 'shiftstarttime' || name === 'shiftendtime') {
    record[name] = cleaned;
  } else if (name === 'scheduledhours' || name === 'schedulehours' || name === 'plannedhours' || name === 'rosteredhours') {
    record.scheduledHours = toNumber(cleaned);
    record.hours = toNumber(cleaned);
  } else if (looksLikeRoleHeader(name)) {
    const translated = normalizeRoleName(cleaned);
    if (translated) {
      record.role = translated;
    }
  } else if (name === 'absencedate') {
    record.date = cleaned;
  } else if (name === 'absencetype' || name === 'absencecategory' || name === 'type') {
    record.absenceType = cleaned;
  } else if (name === 'absencehours' || name === 'plannedabsencehours') {
    record.absenceHours = toNumber(cleaned);
  } else if (looksLikeVolumeHeader(name)) {
    const parsed = toNumber(cleaned);
    record.volume = parsed;
    record.m3 = parsed;
    record.m2 = parsed;
    record.actualVolume = parsed;
  } else if (looksLikeRequiredHoursHeader(name)) {
    record.requiredHours = toNumber(cleaned);
  } else if (name === 'paidhours' || name === 'paidhours' || name === 'workedhours') {
    record.paidHours = toNumber(cleaned);
  } else {
    record[name] = cleaned;
  }
}

function normalizeRecordForKind(record: Record<string, string | number>, kind: UploadKind): Record<string, string | number> {
  if (kind === 'schedule') {
    const scheduledHours = toNumber(record.scheduledHours ?? record.hours ?? 0);
    const role = String(record.role ?? record.workrole ?? 'Schedule Role');
    const shiftDate = String(record.date ?? record.shiftdate ?? 'Week 1');
    record.role = role;
    record.scheduledHours = scheduledHours;
    record.date = shiftDate;
    record.hours = scheduledHours;
  }

  if (kind === 'absence') {
    const absenceHours = toNumber(record.absenceHours ?? record.absencehours ?? record.hours ?? 0);
    const absenceType = String(record.absenceType ?? record.absencetype ?? record.type ?? 'Absence');
    const absenceDate = String(record.date ?? record.absencedate ?? 'N/A');
    record.absenceType = absenceType;
    record.absenceHours = absenceHours;
    record.date = absenceDate;
  }

  if (kind === 'stp') {
    record.source = record.source ?? 'STP Tool';
    const volume = toNumber(record.volume ?? record.m3 ?? record.m2 ?? record.actualvolume ?? record.actualm3 ?? record.stpvolume ?? 0);
    record.volume = volume;
    record.m3 = volume;
    record.m2 = volume;

    const role = normalizeRoleName(String(record.role ?? record.workrole ?? ''));
    if (role) {
      record.role = role;
    } else {
      delete record.role;
    }

    if (toNumber(record.requiredHours ?? 0) > 0) {
      record.requiredHours = toNumber(record.requiredHours ?? 0);
    } else {
      delete record.requiredHours;
    }
  }

  if (kind === 'actual-volume') {
    record.period = record.period ?? 'Period';
    record.actualVolume = toNumber(record.actualvolume ?? record.volume ?? record.m2 ?? 0);
    record.volume = record.actualVolume;
  }

  if (kind === 'paid-hours') {
    record.paidHours = toNumber(record.paidHours ?? record.paidhours ?? record.hours ?? 0);
    record.hours = record.paidHours;
  }

  return record;
}

export function normalizeRows(rawLines: string[], kind: UploadKind): Array<Record<string, string | number>> {
  const rows = rawLines
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (rows.length === 0) {
    return [];
  }

  const header = parseCsvLine(rows[0]).map(cell => normalizeHeader(cell));
  const records: Array<Record<string, string | number>> = [];

  for (let index = 1; index < rows.length; index += 1) {
    const cells = parseCsvLine(rows[index]);
    const record: Record<string, string | number> = {};

    header.forEach((name, columnIndex) => {
      const value = cells[columnIndex] ?? '';
      const cleaned = value.replace(/"/g, '').trim();
      applyField(record, name, cleaned);
    });

    normalizeRecordForKind(record, kind);

    if (!record.role || String(record.role).trim() === '') {
      continue;
    }

    if (Object.keys(record).length > 0) {
      records.push(record);
    }
  }

  return records;
}

function normalizeObjectRows(rows: Array<Record<string, unknown>>, kind: UploadKind): Array<Record<string, string | number>> {
  const records: Array<Record<string, string | number>> = [];

  if (kind === 'stp') {
    const forecastByWeek = new Map<string, string>();
    for (const row of rows) {
      const measure = String(row.DC_Summary_Measures ?? row.dcsummarymeasures ?? '').trim();
      if (normalizeHeader(measure) !== 'forecastflag') continue;
      for (const [key, value] of Object.entries(row)) {
        if (/^20\d{4}$/.test(key)) forecastByWeek.set(key, String(value ?? '').trim());
      }
    }

    for (const row of rows) {
      const measure = String(row.DC_Summary_Measures ?? row.dcsummarymeasures ?? '').trim();
      const roleFromMeasure = reverseStpRoleLookup.get(normalizeMeasure(measure));
      const isTotalHandlingQueueCorrected = normalizeMeasure(measure) === normalizeMeasure('Total Handling (Queue Corrected)');
      for (const [weekCode, value] of Object.entries(row)) {
        if (!/^20\d{4}$/.test(weekCode)) continue;
        const volume = toNumber(value);
        if (volume <= 0) continue;
        const forecastFlag = forecastByWeek.get(weekCode) ?? '';
        records.push({ role: isTotalHandlingQueueCorrected ? '__TOTAL_HANDLING_QUEUE_CORRECTED__' : roleFromMeasure ?? `No mapping: ${measure}`, measure, weekCode, forecastFlag, volume, m3: volume, m2: volume, actualVolume: volume });
        if (isTotalHandlingQueueCorrected) {
          const additionalTasks = [
            ['Bayclearing', 'Additional Bay Clear Queue Corrected', 0.37],
            ['Replens', 'Additional Replenishment Queue Corrected', 0.30],
            ['Cycles', 'Additional Cycles Queue Corrected', 0.30]
          ] as const;
          additionalTasks.forEach(([role, additionalMeasure, share]) => {
            const additionalVolume = volume * share;
            records.push({ role, measure: additionalMeasure, weekCode, forecastFlag, volume: additionalVolume, m3: additionalVolume, m2: additionalVolume, actualVolume: additionalVolume });
          });
        }
      }
    }

    return records;
  }

  for (const row of rows) {
    const record: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = normalizeHeader(key);
      const cleaned = String(value ?? '').replace(/"/g, '').trim();
      applyField(record, normalizedKey, cleaned);
    }

    normalizeRecordForKind(record, kind);

    if (!record.role || String(record.role).trim() === '') {
      continue;
    }

    if (Object.keys(record).length > 0) {
      records.push(record);
    }
  }

  return records;
}

export async function parseUploadedFile(file: File, kind: UploadKind = 'forecast'): Promise<UploadedFileRecord> {
  const fileName = file.name || 'upload.csv';
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'xlsx' || extension === 'xls') {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      if (!workbook.SheetNames.length) {
        throw new Error('No worksheet found in workbook.');
      }

      if (kind === 'mtp') {
        const mtpRows = workbook.SheetNames.flatMap(sheetName => parseMtpWorkbookSheet(workbook.Sheets[sheetName]));
        if (!mtpRows.some(row => row.totalHandlingVolume > 0)) throw new Error('No MTP summary rows found in workbook.');
        return {
          fileName,
          kind,
          importedAt: new Date().toISOString(),
          records: mtpRows as unknown as Array<Record<string, string | number>>,
          status: 'parsed',
          message: `Parsed ${mtpRows.length} monthly MTP records from ${fileName}.`
        };
      }

      if (kind === 'm2-history') {
        const records = workbook.SheetNames.flatMap(sheetName => parseM2WorkbookSheet(workbook.Sheets[sheetName]));
        if (!records.length) throw new Error('No weekly M2 productivity rows found in workbook.');
        return {
          fileName,
          kind,
          importedAt: new Date().toISOString(),
          records,
          status: 'parsed',
          message: `Parsed ${records.length} weekly M2 record${records.length === 1 ? '' : 's'} from ${fileName}.`
        };
      }

      const records: Array<Record<string, string | number>> = [];
      const sheets = workbook.SheetNames.filter(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        return kind !== 'stp' || isStpWorkbookSheet(sheet);
      });

      for (const sheetName of sheets) {
        const sheet = workbook.Sheets[sheetName];
        const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
        records.push(...normalizeObjectRows(objectRows, kind));
      }

      if (!records.length) {
        return {
          fileName,
          kind,
          importedAt: new Date().toISOString(),
          records: [],
          status: 'error',
          message: 'No records could be parsed from the workbook.'
        };
      }

      return {
        fileName,
        kind,
        importedAt: new Date().toISOString(),
        records,
        status: 'parsed',
        message: `Parsed ${records.length} record${records.length === 1 ? '' : 's'} from ${fileName}.`
      };
    } catch (error) {
      return {
        fileName,
        kind,
        importedAt: new Date().toISOString(),
        records: [],
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to read workbook.'
      };
    }
  }

  const content = await file.text();
  const rawLines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  if (rawLines.length === 0) {
    return {
      fileName,
      kind,
      importedAt: new Date().toISOString(),
      records: [],
      status: 'error',
      message: 'No readable rows found in file.'
    };
  }

  const records = normalizeRows(rawLines, kind);

  if (!records.length) {
    return {
      fileName,
      kind,
      importedAt: new Date().toISOString(),
      records: [],
      status: 'error',
      message: 'No records could be parsed from the file.'
    };
  }

  return {
    fileName,
    kind,
    importedAt: new Date().toISOString(),
    records,
    status: 'parsed',
    message: `Parsed ${records.length} record${records.length === 1 ? '' : 's'} from ${fileName}.`
  };
}
