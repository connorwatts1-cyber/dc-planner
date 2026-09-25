import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import PageHeader from '../components/PageHeader';
import KPI from '../components/KPI';
import TrendChart from '../components/TrendChart';
import { parseUploadedFile } from '../services/fileParser';
import { productiveScheduledHours } from '../services/analytics';
import { usePlannerContext } from '../context/PlannerContext';
import WeekCalendarSelector, { PlanningCalendarWeek } from '../components/WeekCalendarSelector';
import { historicalFollowUpWeeks } from '../historicalFollowUpData';
import { MtpMonthData } from '../types';

const WINDOW_SIZE = 8;

function uploadedHistory(records: Array<Record<string, string | number>>) {
  return records.map(record => ({
    week: String(record.week ?? ''),
    year: Number(record.year ?? 0),
    start: String(record.start ?? ''),
    end: String(record.end ?? ''),
    m3Received: Number(record.m3Received ?? 0),
    m3Shipped: Number(record.m3Shipped ?? 0),
    m3Handled: Number(record.m3Handled ?? record.volume ?? 0),
    loginHours: Number(record.loginHours ?? record.paidHours ?? 0),
    pickingHours: Number(record.pickingHours ?? 0)
  })).filter(row => row.week && row.start && row.m3Handled > 0).sort((left, right) => left.start.localeCompare(right.start));
}

function compactAbsenceRecords(records: Array<Record<string, string | number>>) {
  const grouped = new Map<string, Record<string, string | number>>();
  records.forEach(record => {
    const date = String(record.date ?? record.absenceDate ?? '');
    const type = String(record.absenceType ?? record.type ?? 'Other');
    const week = String(record.weekCode ?? record.week ?? (date ? weekKey(date) : ''));
    const hours = Number(record.absenceHours ?? record.hours ?? 0);
    if (!week || hours <= 0) return;
    const key = `${week}|${type}`;
    const existing = grouped.get(key);
    grouped.set(key, {
      date: existing?.date ?? date,
      weekCode: week,
      absenceType: type,
      absenceHours: Number(existing?.absenceHours ?? 0) + hours,
      hours: Number(existing?.hours ?? 0) + hours
    });
  });
  return Array.from(grouped.values());
}

function uploadedMtpMonths(records: Array<Record<string, string | number>>): MtpMonthData[] {
  return records.map(record => ({
    month: String(record.month ?? ''),
    weeksIncluded: Number(record.weeksIncluded ?? 0),
    inboundVolume: Number(record.inboundVolume ?? 0),
    outflowVolume: Number(record.outflowVolume ?? 0),
    totalHandlingVolume: Number(record.totalHandlingVolume ?? 0),
    averageWeeklyVolume: Number(record.averageWeeklyVolume ?? 0),
    operationalHoursNeed: Number(record.operationalHoursNeed ?? 0),
    fteForFp: Number(record.fteForFp ?? 0),
    fteForPick: Number(record.fteForPick ?? 0),
    fteDevelopment: Number(record.fteDevelopment ?? 0),
    fteSickness: Number(record.fteSickness ?? 0),
    fteHolidays: Number(record.fteHolidays ?? 0),
    totalFteNeed: Number(record.totalFteNeed ?? 0)
  })).filter(row => row.month && row.totalHandlingVolume > 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`));
}

function weekKey(value: string) {
  const raw = String(value ?? '').trim();
  const ukDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const date = ukDate
    ? new Date(`${ukDate[3]}-${String(ukDate[2]).padStart(2, '0')}-${String(ukDate[1]).padStart(2, '0')}T00:00:00`)
    : new Date(`${raw}T00:00:00`);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function toCalendarWeek(week: typeof historicalFollowUpWeeks[number], targetM3PerHour: number): PlanningCalendarWeek {
  const requiredHours = week.m3Handled / targetM3PerHour;
  const capability = week.loginHours / Math.max(requiredHours, 1) * 100;
  return {
    week: `${week.week} ${week.year}`,
    label: `${formatDate(week.start)}-${formatDate(week.end)}`,
    req: `${Math.round(requiredHours)}h`,
    sch: `${Math.round(week.loginHours)}h`,
    capability: `${capability.toFixed(1)}%`,
    status: capability < 95 ? 'UNDER CAPABILITY' : capability > 110 ? 'OVER CAPABILITY' : 'OPTIMAL',
    tone: capability < 95 ? 'orange' : capability > 110 ? 'blue' : 'green'
  };
}

export default function FollowUpPage() {
  const { uploadedFiles, resourceMapping, roles, addUploadedFile } = usePlannerContext();
  useEffect(() => {
    const existingAbsence = uploadedFiles.find(file => file.kind === 'absence' && file.status === 'parsed');
    if (existingAbsence && existingAbsence.records.length > 500) {
      const compacted = compactAbsenceRecords(existingAbsence.records);
      if (compacted.length < existingAbsence.records.length) {
        addUploadedFile({ ...existingAbsence, fileName: `${existingAbsence.fileName} (weekly summary)`, records: compacted, message: `Compacted ${existingAbsence.records.length} rows into ${compacted.length} weekly absence summaries.` });
        return;
      }
    }
    if (uploadedFiles.some(file => file.kind === 'absence' && file.fileName.includes('Absence (2).xls'))) return;
    fetch(`${import.meta.env.BASE_URL}Absence%20(2).xls`)
      .then(response => response.ok ? response.blob() : Promise.reject(new Error('Historical absence file unavailable')))
      .then(blob => parseUploadedFile(new File([blob], 'Absence (2).xls'), 'absence'))
      .then(parsed => {
        if (parsed.status !== 'parsed') return;
        const existingRecords = uploadedFiles.filter(file => file.kind === 'absence' && file.status === 'parsed').flatMap(file => file.records);
        addUploadedFile({
          ...parsed,
          fileName: existingRecords.length ? `Uploaded absence + ${parsed.fileName}` : parsed.fileName,
          records: [...existingRecords, ...parsed.records],
          message: existingRecords.length ? `Merged ${existingRecords.length + parsed.records.length} absence records from uploaded and historical MyTime files.` : parsed.message
        });
      })
      .catch(() => undefined);
  }, [uploadedFiles, addUploadedFile]);
  const targetM3PerHour = Math.max(resourceMapping.productivityTargetM3PerHour, 0.1);
  const m2Upload = uploadedFiles.find(file => file.kind === 'm2-history' && file.status === 'parsed');
  const mtpUpload = uploadedFiles.find(file => file.kind === 'mtp' && file.status === 'parsed');
  const mtpMonths = mtpUpload ? uploadedMtpMonths(mtpUpload.records) : [];
  const history = useMemo(() => m2Upload ? uploadedHistory(m2Upload.records) : historicalFollowUpWeeks, [m2Upload]);
  const [windowStart, setWindowStart] = useState(Math.max(history.length - WINDOW_SIZE, 0));
  const [fullYear, setFullYear] = useState(false);
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<number[]>(() => history.slice(-WINDOW_SIZE).map((_, index) => history.length - WINDOW_SIZE + index));
  useEffect(() => {
    const start = Math.max(history.length - WINDOW_SIZE, 0);
    setWindowStart(start);
    setSelectedWeekIndices(history.slice(start).map((_, index) => start + index));
    setFullYear(false);
  }, [m2Upload?.importedAt]);
  const visibleWeeks = fullYear ? history : history.slice(windowStart, windowStart + WINDOW_SIZE);
  const selectedWeeks = history.filter((_, index) => selectedWeekIndices.includes(index));
  const historyWeekKeyForDate = (value: string) => {
    const raw = String(value ?? '').trim();
    const ukDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    const normalized = ukDate
      ? `${ukDate[3]}-${String(ukDate[2]).padStart(2, '0')}-${String(ukDate[1]).padStart(2, '0')}`
      : raw.slice(0, 10);
    const date = new Date(`${normalized}T00:00:00`);
    const matchingWeek = history.find(week => date >= new Date(`${week.start}T00:00:00`) && date <= new Date(`${week.end}T00:00:00`));
    return matchingWeek ? `${matchingWeek.year}-${matchingWeek.week}` : weekKey(value);
  };
  const selectedLabel = fullYear ? 'Full year' : selectedWeeks.length === 1 ? `${selectedWeeks[0].week} ${selectedWeeks[0].year}` : `${selectedWeeks.length} selected weeks`;
  const calendarWeeks = useMemo(() => visibleWeeks.map(week => toCalendarWeek(week, targetM3PerHour)), [visibleWeeks, targetM3PerHour]);
  const selectedRows = selectedWeeks.length ? selectedWeeks : visibleWeeks;
  const requiredHours = selectedRows.reduce((sum, week) => sum + week.m3Handled / targetM3PerHour, 0);
  const loginHours = selectedRows.reduce((sum, week) => sum + week.loginHours, 0);
  const actualVolume = selectedRows.reduce((sum, week) => sum + week.m3Handled, 0);
  const hasMyTimeAbsence = useMemo(() => uploadedFiles.some(file => file.kind === 'absence' && file.status === 'parsed' && file.records.length > 0), [uploadedFiles]);
  const estimateAbsence = (week: typeof history[number]) => {
    const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(`${week.start}T00:00:00`));
    const assumptions = resourceMapping.monthValues?.[month] ?? resourceMapping;
    const fte = assumptions.fte ?? resourceMapping.fte;
    const weeklyHours = fte * 37.5;
    return {
      sickness: weeklyHours * (assumptions.absence ?? resourceMapping.absence),
      holiday: weeklyHours * (assumptions.holiday ?? resourceMapping.holiday),
      training: weeklyHours * (assumptions.training ?? resourceMapping.training)
    };
  };
  const actualAbsenceByWeek = useMemo(() => {
    const values = new Map<string, number>();
    uploadedFiles.filter(file => file.kind === 'absence' && file.status === 'parsed').flatMap(file => file.records).forEach(record => {
      const date = String(record.date ?? record.absenceDate ?? '');
      const key = String(record.weekCode ?? record.week ?? (date ? historyWeekKeyForDate(date) : ''));
      const hours = Number(record.absenceHours ?? record.hours ?? 0);
      if (key && hours > 0) values.set(key, (values.get(key) ?? 0) + hours);
    });
    return values;
  }, [uploadedFiles, history]);
  const absenceHoursForWeek = (week: typeof history[number]) => hasMyTimeAbsence
    ? actualAbsenceByWeek.has(`${week.year}-${week.week}`)
      ? actualAbsenceByWeek.get(`${week.year}-${week.week}`) ?? 0
      : (() => { const estimate = estimateAbsence(week); return estimate.sickness + estimate.holiday + estimate.training; })()
    : (() => { const estimate = estimateAbsence(week); return estimate.sickness + estimate.holiday + estimate.training; })();
  const actualAbsenceHours = selectedRows.reduce((sum, week) => {
    return sum + absenceHoursForWeek(week);
  }, 0);
  const capability = loginHours / Math.max(requiredHours, 1) * 100;
  const trend = selectedRows.map(week => {
    const required = week.m3Handled / targetM3PerHour;
    return { date: week.week, requiredHours: required, scheduledHours: week.loginHours, variance: week.loginHours - required, capability: week.loginHours / Math.max(required, 1) * 100, gap: Math.max(required - week.loginHours, 0) };
  });
  const weeklyRows = useMemo(() => selectedRows.map(week => {
    const required = week.m3Handled / targetM3PerHour;
    const absence = absenceHoursForWeek(week);
    const weeklyCapability = week.loginHours / Math.max(required, 1) * 100;
    return { ...week, required, absence, available: week.loginHours, variance: week.loginHours - required, capability: weeklyCapability, status: weeklyCapability < 90 ? 'Under' : weeklyCapability > 110 ? 'Over' : 'Optimal' };
  }), [selectedRows, targetM3PerHour, absenceHoursForWeek]);
  const actualByWeek = new Map(selectedRows.map(week => [`${week.year}-${week.week}`, week]));
  const stpByWeek = useMemo(() => {
    const values = new Map<string, number>();
    uploadedFiles.filter(file => file.kind === 'stp').flatMap(file => file.records).forEach(record => {
      const week = String(record.weekCode ?? record.week ?? '');
      const volume = Number(record.volume ?? record.m3 ?? record.m2 ?? 0);
      if (!week || volume <= 0) return;
      values.set(week, (values.get(week) ?? 0) + volume);
    });
    return values;
  }, [uploadedFiles]);
  const forecastVsActualRows = useMemo(() => {
    const weeksByMonth = new Map<string, typeof selectedRows>();
    selectedRows.forEach(week => {
      const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(`${week.start}T00:00:00`));
      weeksByMonth.set(month, [...(weeksByMonth.get(month) ?? []), week]);
    });
    const mtpByMonth = new Map(mtpMonths.map(month => [month.month, month.totalHandlingVolume]));
    return selectedRows.map(week => {
    const key = `${week.year}-${week.week}`;
    const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(`${week.start}T00:00:00`));
    const monthlyForecast = mtpByMonth.get(month);
    const forecastVolume = monthlyForecast !== undefined
      ? monthlyForecast / Math.max((weeksByMonth.get(month) ?? []).length, 1)
      : stpByWeek.get(key) ?? 0;
    const actualVolume = actualByWeek.get(key)?.m3Handled ?? 0;
    const volumeVariance = actualVolume - forecastVolume;
    const productivity = actualVolume / Math.max(week.loginHours, 1);
      return { ...week, forecastVolume, actualVolume, volumeVariance, productivity, forecastSource: monthlyForecast !== undefined ? 'MTP' : stpByWeek.has(key) ? 'STP' : 'None' };
    });
  }, [selectedRows, mtpMonths, stpByWeek, actualByWeek]);
  const absenceEstimates = useMemo(() => selectedRows.map(week => ({ week, ...estimateAbsence(week) })), [selectedRows, resourceMapping]);
  const actualAbsenceByType = useMemo(() => {
    const totals = { sickness: 0, holiday: 0, training: 0 };
    uploadedFiles.filter(file => file.kind === 'absence' && file.status === 'parsed').flatMap(file => file.records).forEach(record => {
      const type = String(record.absenceType ?? record.type ?? '').toLowerCase();
      const hours = Number(record.absenceHours ?? record.hours ?? 0);
      const date = String(record.date ?? record.absenceDate ?? '');
      const matchesSelectedWeek = !date || selectedRows.some(week => historyWeekKeyForDate(date) === `${week.year}-${week.week}`);
      if (!matchesSelectedWeek || hours <= 0) return;
      if (type.includes('holiday')) totals.holiday += hours;
      else if (type.includes('train') || type.includes('talk')) totals.training += hours;
      else if (type.includes('sick') || type.includes('absence')) totals.sickness += hours;
    });
    return totals;
  }, [uploadedFiles, selectedRows, history]);
  const goalHours = absenceEstimates.reduce((total, item) => ({
    sickness: total.sickness + item.sickness,
    holiday: total.holiday + item.holiday,
    training: total.training + item.training
  }), { sickness: 0, holiday: 0, training: 0 });
  const hoursVsGoal = [
    { label: 'Absence / sickness', actual: hasMyTimeAbsence ? actualAbsenceByType.sickness : goalHours.sickness, goal: goalHours.sickness },
    { label: 'Holiday', actual: hasMyTimeAbsence ? actualAbsenceByType.holiday : goalHours.holiday, goal: goalHours.holiday },
    { label: 'Training', actual: hasMyTimeAbsence ? actualAbsenceByType.training : goalHours.training, goal: goalHours.training }
  ].map(item => ({ ...item, variance: item.actual - item.goal, source: hasMyTimeAbsence ? 'MyTime' : 'Settings assumption' }));
  const absencePercentageRows = [
    { label: 'Sickness / absence', hours: hasMyTimeAbsence ? actualAbsenceByType.sickness : goalHours.sickness },
    { label: 'Holiday', hours: hasMyTimeAbsence ? actualAbsenceByType.holiday : goalHours.holiday },
    { label: 'Training', hours: hasMyTimeAbsence ? actualAbsenceByType.training : goalHours.training }
  ].map(row => ({ ...row, percentage: loginHours > 0 ? row.hours / loginHours * 100 : 0 }));
  const absenceTotalHours = absencePercentageRows.reduce((total, row) => total + row.hours, 0);
  const absenceTotalPercentage = loginHours > 0 ? absenceTotalHours / loginHours * 100 : 0;
  const normalizedRole = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z]+/g, '');
  const nonOpsRoles = new Set(roles.filter(role => role.type === 'Non-Ops').flatMap(role => [normalizedRole(role.role), normalizedRole(role.translation)]));
  const scheduleRows = uploadedFiles.filter(file => file.kind === 'schedule' && file.status === 'parsed').flatMap(file => file.records);
  const selectedScheduleRows = scheduleRows.filter(record => {
    const date = String(record.date ?? record.shiftdate ?? '');
    return !date || selectedRows.some(week => weekKey(date) === `${week.year}-${week.week}`);
  });
  const nonOpsHours = selectedScheduleRows.reduce((total, record) => {
    const role = normalizedRole(record.role ?? record.workrole ?? record.WorkRole);
    return total + (nonOpsRoles.has(role) ? productiveScheduledHours(record, resourceMapping) : 0);
  }, 0);
  const scheduledRoleHours = selectedScheduleRows.reduce((total, record) => total + productiveScheduledHours(record, resourceMapping), 0);
  const nonOpsPercentage = scheduledRoleHours > 0 ? nonOpsHours / scheduledRoleHours * 100 : undefined;
  const roleBreakdownRows = useMemo(() => {
    const roleLabels: Record<string, string> = {
      dctipping: 'DC Tipping',
      dcloading: 'DC Loading',
      transittipping: 'Transit Tipping',
      transittip: 'Transit Tipping',
      transitloading: 'Transit Loading',
      transitload: 'Transit Loading',
      bayclearing: 'Bayclearing',
      transitbay: 'Bayclearing',
      transitbayclearing: 'Bayclearing',
      picking: 'Picking',
      pick: 'Picking',
      replenishment: 'Replens',
      replen: 'Replens'
    };
    const totals = new Map<string, number>();
    selectedScheduleRows.forEach(record => {
      const rawRole = String(record.role ?? record.workrole ?? record.WorkRole ?? 'Unmapped role').trim();
      const normalizedRoleName = normalizedRole(rawRole);
      const label = roleLabels[normalizedRoleName] ?? (rawRole || 'Unmapped role');
      const hours = productiveScheduledHours(record, resourceMapping);
      if (hours > 0) totals.set(label, (totals.get(label) ?? 0) + hours);
    });
    return Array.from(totals.entries())
      .map(([role, hours]) => ({ role, hours, percentage: scheduledRoleHours > 0 ? hours / scheduledRoleHours * 100 : 0 }))
      .sort((left, right) => right.hours - left.hours);
  }, [selectedScheduleRows, scheduledRoleHours, resourceMapping]);
  const absenceTrend = absenceEstimates.map(item => ({ date: item.week.week, absenceHours: hasMyTimeAbsence ? actualAbsenceByWeek.get(`${item.week.year}-${item.week.week}`) ?? 0 : item.sickness + item.holiday + item.training }));
  const weekKeys = history.map(week => `${week.year}-${week.week}`);
  const duplicateWeeks = weekKeys.filter((week, index) => weekKeys.indexOf(week) !== index);
  const expectedWeekKeys = new Set<string>();
  const firstDate = new Date(`${history[0].start}T00:00:00`);
  for (let index = 0; index < history.length; index += 1) {
    const date = new Date(firstDate);
    date.setDate(firstDate.getDate() + index * 7);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const day = date.getUTCDay() || 7;
    const thursday = new Date(date);
    thursday.setUTCDate(date.getUTCDate() + 4 - day);
    const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    expectedWeekKeys.add(`${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`);
  }
  const missingWeeks = Array.from(expectedWeekKeys).filter(week => !weekKeys.includes(week));
  const latestWeek = history[history.length - 1];
  const selectWeek = (index: number, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedWeekIndices(current => current.includes(index)
        ? current.length === 1 ? current : current.filter(item => item !== index)
        : [...current, index].sort((left, right) => left - right));
      return;
    }
    setSelectedWeekIndices([index]);
  };

  const toggleFullYear = () => {
    if (fullYear) {
      const start = Math.max(history.length - WINDOW_SIZE, 0);
      setWindowStart(start);
      setSelectedWeekIndices(history.slice(start).map((_, index) => start + index));
      setFullYear(false);
      return;
    }
    setSelectedWeekIndices(history.map((_, index) => index));
    setFullYear(true);
  };

  const moveWindow = (direction: number) => {
    const nextStart = Math.min(Math.max(windowStart + direction, 0), history.length - WINDOW_SIZE);
    setWindowStart(nextStart);
    setSelectedWeekIndices(history.slice(nextStart, nextStart + WINDOW_SIZE).map((_, index) => nextStart + index));
  };

  return (
    <Box>
      <PageHeader title="Follow Up" subtitle={`Historical weekly review - ${selectedLabel}`} />
      <Grid container className="card-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 2 }}>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><KPI title="Required Hours" value={Math.round(requiredHours)} /></Grid>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><KPI title="Login Hours" value={Math.round(loginHours)} /></Grid>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><KPI title="Absence Hours" value={Math.round(actualAbsenceHours)} /></Grid>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><KPI title="Variance" value={Math.round(loginHours - requiredHours)} /></Grid>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><KPI title="Capability %" value={`${capability.toFixed(1)}%`} showCatIcon /></Grid>
      </Grid>

      <Paper className="table-wrap" sx={{ mt: 2, p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Data quality and coverage</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">M2 source coverage</Typography><Typography variant="h6" fontWeight={800}>{history.length} weekly files</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Latest week loaded</Typography><Typography variant="h6" fontWeight={800}>{latestWeek.week} {latestWeek.year}</Typography><Typography variant="caption" color="text.secondary">{formatDate(latestWeek.start)} to {formatDate(latestWeek.end)}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Duplicate weeks</Typography><Typography variant="h6" fontWeight={800} color={duplicateWeeks.length ? 'error.main' : 'success.main'}>{duplicateWeeks.length}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Missing weeks in range</Typography><Typography variant="h6" fontWeight={800} color={missingWeeks.length ? 'warning.main' : 'success.main'}>{missingWeeks.length}</Typography></Grid>
        </Grid>
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Alert severity="info">M2 files provide handled volume, paid login hours, and picking hours. Required hours use the current 7.3 M3/hour productivity target.</Alert>
          <Alert severity={hasMyTimeAbsence ? 'success' : 'warning'}>{hasMyTimeAbsence ? 'MyTime absence data is used where covered; Settings assumptions fill weeks without historical MyTime records.' : 'MyTime absence data is not loaded. Follow Up is using Settings assumptions: monthly FTE x 37.5 hours x absence, holiday, and training rates.'}</Alert>
        </Stack>
      </Paper>

      <WeekCalendarSelector weeks={calendarWeeks} selectedIndices={selectedWeekIndices} indexOffset={fullYear ? 0 : windowStart} windowStart={fullYear ? 0 : windowStart} onSelect={selectWeek} onSelectAll={toggleFullYear} onPrevious={() => moveWindow(-1)} onNext={() => moveWindow(1)} canPrevious={!fullYear && windowStart > 0} canNext={!fullYear && windowStart < history.length - WINDOW_SIZE} fullYearSelected={fullYear} />

      <Box mt={3} className="table-wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Capability Follow-Up Table ({selectedLabel})</Typography>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead><TableRow>
              {['Week', 'M2 handled', 'Required hours', 'Login hours', 'Absence', 'Logged hours', 'Variance', 'Capability', 'Status'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>{weeklyRows.map(row => <TableRow key={`${row.week}-${row.year}`} hover>
              <TableCell sx={{ fontWeight: 700 }}>{row.week} {row.year}</TableCell>
              <TableCell>{Math.round(row.m3Handled).toLocaleString('en-GB')}</TableCell>
              <TableCell>{Math.round(row.required).toLocaleString('en-GB')}</TableCell>
              <TableCell>{Math.round(row.loginHours).toLocaleString('en-GB')}</TableCell>
              <TableCell>{Math.round(row.absence).toLocaleString('en-GB')}</TableCell>
              <TableCell>{Math.round(row.available).toLocaleString('en-GB')}</TableCell>
              <TableCell sx={{ color: row.variance < 0 ? 'error.main' : 'success.main', fontWeight: 700 }}>{Math.round(row.variance).toLocaleString('en-GB')}</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>{row.capability.toFixed(1)}%</TableCell>
              <TableCell sx={{ color: row.status === 'Under' ? 'error.main' : row.status === 'Over' ? 'info.main' : 'success.main', fontWeight: 800 }}>{row.status}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box mt={2} className="table-wrap" sx={{ overflowX: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{mtpUpload ? 'MTP forecast versus actual M2' : 'STP forecast versus actual M2'} ({selectedLabel})</Typography>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 920 }}>
            <TableHead><TableRow>{['Week', mtpUpload ? 'MTP forecast m3' : 'STP forecast m3', 'Actual handled m3', 'Volume variance', 'Login hours', 'Actual m3/hour', 'Source'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>{forecastVsActualRows.map(row => <TableRow key={`${row.week}-${row.year}`} hover>
              <TableCell sx={{ fontWeight: 700 }}>{row.week} {row.year}</TableCell>
              <TableCell>{Math.round(row.forecastVolume).toLocaleString('en-GB')}</TableCell>
              <TableCell>{Math.round(row.actualVolume).toLocaleString('en-GB')}</TableCell>
              <TableCell sx={{ color: row.volumeVariance < 0 ? 'error.main' : 'success.main', fontWeight: 700 }}>{Math.round(row.volumeVariance).toLocaleString('en-GB')}</TableCell>
              <TableCell>{Math.round(row.loginHours).toLocaleString('en-GB')}</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>{row.productivity.toFixed(1)}</TableCell>
              <TableCell>{row.forecastSource}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box mt={2} className="table-wrap" sx={{ overflowX: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Hours versus Settings goals ({selectedLabel})</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>MyTime values are used when uploaded. Otherwise the Settings monthly assumptions are shown as the current estimate.</Typography>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead><TableRow>{['Measure', 'Actual / estimate hours', 'Goal hours', 'Variance', 'Source'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>{hoursVsGoal.map(item => <TableRow key={item.label} hover>
              <TableCell sx={{ fontWeight: 700 }}>{item.label}</TableCell>
              <TableCell>{Math.round(item.actual).toLocaleString('en-GB')}</TableCell>
              <TableCell>{Math.round(item.goal).toLocaleString('en-GB')}</TableCell>
              <TableCell sx={{ color: item.variance > 0 ? 'error.main' : 'success.main', fontWeight: 700 }}>{Math.round(item.variance).toLocaleString('en-GB')}</TableCell>
              <TableCell>{item.source}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box mt={2} className="table-wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Non-Ops hours usage ({selectedLabel})</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Calculated from productive scheduled role hours and the Non-Ops role classifications in Settings.</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Non-Ops hours</Typography><Typography variant="h5" fontWeight={800}>{nonOpsPercentage === undefined ? 'Unavailable' : Math.round(nonOpsHours).toLocaleString('en-GB')}</Typography></Grid>
          <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Total scheduled role hours</Typography><Typography variant="h5" fontWeight={800}>{nonOpsPercentage === undefined ? 'Unavailable' : Math.round(scheduledRoleHours).toLocaleString('en-GB')}</Typography></Grid>
          <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Non-Ops percentage</Typography><Typography variant="h5" fontWeight={800}>{nonOpsPercentage === undefined ? 'Upload schedule' : `${nonOpsPercentage.toFixed(1)}%`}</Typography></Grid>
        </Grid>
      </Box>

      <Box mt={2} className="table-wrap" sx={{ overflowX: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Role breakdown ({selectedLabel})</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Productive scheduled hours are grouped from the uploaded schedule for the selected weeks, after the Settings break deduction. Historical M2 totals do not contain role-level hours.</Typography>
        {roleBreakdownRows.length ? <TableContainer>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead><TableRow>{['Role', 'Productive scheduled hours', '% of role hours'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>{roleBreakdownRows.map(row => <TableRow key={row.role} hover>
              <TableCell sx={{ fontWeight: 700 }}>{row.role}</TableCell>
              <TableCell>{Math.round(row.hours).toLocaleString('en-GB')}</TableCell>
              <TableCell>{row.percentage.toFixed(1)}%</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer> : <Alert severity="info">Upload a schedule with role and hours columns to see DC Tipping, Transit Loading, and other role-level breakdowns.</Alert>}
      </Box>

      <Box mt={2} className="table-wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Absence as % of total hours ({selectedLabel})</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Percentages use total Login Hours for the selected period. Source: {hasMyTimeAbsence ? 'MyTime where available, Settings estimates for uncovered weeks.' : 'Settings assumptions.'}</Typography>
        <Grid container spacing={2}>
          {absencePercentageRows.map(row => <Grid item xs={12} sm={6} md={3} key={row.label}><Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}><Typography variant="caption" color="text.secondary">{row.label}</Typography><Typography variant="h5" fontWeight={800}>{row.percentage.toFixed(1)}%</Typography><Typography variant="caption">{Math.round(row.hours).toLocaleString('en-GB')} hours</Typography></Paper></Grid>)}
          <Grid item xs={12} sm={6} md={3}><Paper variant="outlined" sx={{ p: 1.5, height: '100%', bgcolor: '#f4f7fb' }}><Typography variant="caption" color="text.secondary">Total absence-related</Typography><Typography variant="h5" fontWeight={800}>{absenceTotalPercentage.toFixed(1)}%</Typography><Typography variant="caption">{Math.round(absenceTotalHours).toLocaleString('en-GB')} hours</Typography></Paper></Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Capability Trend ({selectedLabel})</Typography>
            <TrendChart data={trend} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Absence Trend ({selectedLabel})</Typography>
            <TrendChart data={absenceTrend} type="bar" />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly M2 Breakdown ({selectedLabel})</Typography>
            <Box sx={{ mt: 2 }}>
              {selectedRows.map(week => (
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #d0d9d5' }} key={`${week.week}-${week.year}`}>
                  <Typography>{week.week} {week.year}</Typography>
                  <Typography>{Math.round(week.m3Handled).toLocaleString('en-GB')} m2</Typography>
                </Stack>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      {uploadedFiles.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Uploaded files remain available for the other planning workflows.</Typography>}
    </Box>
  );
}
