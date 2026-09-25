import React, { useEffect, useMemo } from 'react';
import { Alert, Box, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader';
import { usePlannerContext } from '../context/PlannerContext';
import { historicalFollowUpWeeks } from '../historicalFollowUpData';
import { parseUploadedFile } from '../services/fileParser';

const monthNames = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
const shortMonth = (month: string) => month.slice(0, 3);
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const formatNumber = (value: number) => numberFormat.format(Math.round(value));
const numericValue = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

function normalizeMonthName(value: unknown): string {
  const raw = String(value ?? '').trim();
  const monthCode = raw.match(/^20\d{2}(\d{2})$/)?.[1];
  if (monthCode) {
    const calendarMonth = Number(monthCode);
    const financialYearIndex = calendarMonth >= 9 ? calendarMonth - 9 : calendarMonth + 3;
    return monthNames[financialYearIndex] ?? raw;
  }
  return monthNames.find(month => month.toLowerCase() === raw.toLowerCase())
    ?? monthNames.find(month => month.toLowerCase().startsWith(raw.toLowerCase().slice(0, 3)))
    ?? raw;
}

function monthForDate(value: unknown): string | undefined {
  const raw = String(value ?? '').trim();
  const ukDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const normalized = ukDate ? `${ukDate[3]}-${ukDate[2].padStart(2, '0')}-${ukDate[1].padStart(2, '0')}` : raw.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleString('en-GB', { month: 'long' });
}

function yearForDate(value: unknown): number | undefined {
  const raw = String(value ?? '').trim();
  const ukDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const normalized = ukDate ? `${ukDate[3]}-${ukDate[2].padStart(2, '0')}-${ukDate[1].padStart(2, '0')}` : raw.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.getFullYear();
}

function financialYearForDate(value: unknown): number | undefined {
  const year = yearForDate(value);
  const month = monthForDate(value);
  if (year === undefined || !month) return undefined;
  return ['September', 'October', 'November', 'December'].includes(month) ? year : year - 1;
}

export default function HolidayPlanningPage() {
  const { uploadedFiles, resourceMapping, addUploadedFile } = usePlannerContext();
  useEffect(() => {
    if (uploadedFiles.some(file => file.kind === 'absence' && file.fileName.includes('Absence (2).xls'))) return;
    fetch(`${import.meta.env.BASE_URL}Absence%20(2).xls`)
      .then(response => response.ok ? response.blob() : Promise.reject(new Error('Historical absence file unavailable')))
      .then(blob => parseUploadedFile(new File([blob], 'Absence (2).xls'), 'absence'))
      .then(parsed => {
        if (parsed.status !== 'parsed') return;
        const existingRecords = uploadedFiles.filter(file => file.kind === 'absence' && file.status === 'parsed').flatMap(file => file.records);
        addUploadedFile({ ...parsed, fileName: existingRecords.length ? `Uploaded absence + ${parsed.fileName}` : parsed.fileName, records: [...existingRecords, ...parsed.records] });
      })
      .catch(() => undefined);
  }, [uploadedFiles, addUploadedFile]);
  const absenceRows = uploadedFiles.filter(file => file.kind === 'absence' && file.status === 'parsed').flatMap(file => file.records);
  const mtpRows = uploadedFiles.filter(file => file.kind === 'mtp' && file.status === 'parsed').flatMap(file => file.records);
  const lyHolidayRows = uploadedFiles.filter(file => file.kind === 'holiday-ly' && file.status === 'parsed').flatMap(file => file.records);
  const tyHolidayRows = uploadedFiles.filter(file => file.kind === 'holiday-ty' && file.status === 'parsed').flatMap(file => file.records);

  const holidayHoursByMonth = (records: Array<Record<string, string | number>>) => {
    const totals = new Map<string, number>();
    records.forEach(record => {
      const month = normalizeMonthName(record.month ?? record.period ?? monthForDate(record.date ?? record.holidayDate ?? record.absenceDate));
      const hours = numericValue(record.holidayHours ?? record.absenceHours ?? record.hours ?? record.value);
      if (month && hours > 0) totals.set(month, (totals.get(month) ?? 0) + hours);
    });
    return totals;
  };

  const rows = useMemo(() => {
    const lyVolumeByMonth = new Map<string, number>();
    const lyHolidayByMonth = new Map<string, number>();
    absenceRows.forEach(record => {
      const type = String(record.absenceType ?? record.type ?? '').toLowerCase();
      const date = record.date ?? record.absenceDate;
      const month = monthForDate(date);
      const hours = Number(record.absenceHours ?? record.hours ?? 0);
      if (type.includes('holiday') && financialYearForDate(date) === 2025 && month && hours > 0) {
        lyHolidayByMonth.set(month, (lyHolidayByMonth.get(month) ?? 0) + hours);
      }
    });
    historicalFollowUpWeeks.filter(week => financialYearForDate(week.start) === 2025).forEach(week => {
      const month = new Date(`${week.start}T00:00:00`).toLocaleString('en-GB', { month: 'long' });
      lyVolumeByMonth.set(month, (lyVolumeByMonth.get(month) ?? 0) + week.m3Handled);
    });
    const tyVolumeByMonth = new Map<string, number>();
    mtpRows.forEach(record => {
      const month = normalizeMonthName(record.month ?? record.monthCode ?? record.period ?? record.date);
      const totalHandling = numericValue(record.totalHandlingVolume ?? record.totalHandling ?? record.volume);
      const volume = totalHandling > 0
        ? totalHandling
        : numericValue(record.inboundVolume ?? record.inbound) + numericValue(record.outflowVolume ?? record.outboundVolume ?? record.outflow);
      if (month && volume > 0) tyVolumeByMonth.set(month, volume);
    });
    if (!tyVolumeByMonth.size) {
      historicalFollowUpWeeks.filter(week => financialYearForDate(week.start) === 2026).forEach(week => {
        const month = new Date(`${week.start}T00:00:00`).toLocaleString('en-GB', { month: 'long' });
        tyVolumeByMonth.set(month, (tyVolumeByMonth.get(month) ?? 0) + week.m3Handled);
      });
    }
    historicalFollowUpWeeks.filter(week => financialYearForDate(week.start) === 2026).forEach(week => {
      const month = new Date(`${week.start}T00:00:00`).toLocaleString('en-GB', { month: 'long' });
      if (!tyVolumeByMonth.has(month)) tyVolumeByMonth.set(month, week.m3Handled);
    });

    const baseRows = monthNames.map(month => {
      const assumptions = resourceMapping.monthValues?.[month] ?? resourceMapping;
      const fte = Number(assumptions.fte ?? resourceMapping.fte);
      const totalHours = fte * 37.5;
      const holidayRate = Number(assumptions.holiday ?? resourceMapping.holiday);
      const tyHolidayHours = totalHours * holidayRate;
      const lyVolume = lyVolumeByMonth.get(month) ?? 0;
      const tyVolume = tyVolumeByMonth.get(month) ?? 0;
      return {
        month,
        lyVolume,
        tyVolume,
        lyHolidayHours: lyHolidayByMonth.get(month) ?? 0,
        tyHolidayHours,
        totalHours,
        holidayRate,
        variance: tyHolidayHours,
        holidayHoursPer1000: tyVolume > 0 ? tyHolidayHours / tyVolume * 1000 : 0
      };
    });
    const uploadedLyHolidayByMonth = holidayHoursByMonth(lyHolidayRows);
    const uploadedTyHolidayByMonth = holidayHoursByMonth(tyHolidayRows);
    return baseRows.map(row => ({
        ...row,
        lyHolidayHours: uploadedLyHolidayByMonth.get(row.month) ?? row.lyHolidayHours,
        tyHolidayHours: uploadedTyHolidayByMonth.get(row.month) ?? row.tyHolidayHours
      }));
  }, [absenceRows, mtpRows, lyHolidayRows, tyHolidayRows, resourceMapping]);

  const totalLyHoliday = rows.reduce((total, row) => total + row.lyHolidayHours, 0);
  const totalTyHoliday = rows.reduce((total, row) => total + row.tyHolidayHours, 0);
  const totalTyVolume = rows.reduce((total, row) => total + row.tyVolume, 0);
  const peakHoliday = rows.reduce((peak, row) => row.tyHolidayHours > peak.tyHolidayHours ? row : peak, rows[0]);
  const sourceLabel = mtpRows.length ? 'MTP TY forecast' : 'Current-year historical volume fallback';

  return (
    <Box>
      <PageHeader title="Holiday Planning" subtitle="FY September to August: booked holidays against annual operational volume" />
      <Stack spacing={2}>
        <Alert severity="info">
          LY is FY2025/26 (September to August). TY is FY2026/27. TY holiday hours are forecast as monthly total hours ({'FTE × 37.5'}) × the Settings holiday percentage; TY volume source: {sourceLabel}.
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><Paper className="kpi-card"><Typography variant="caption">LY booked holiday hours</Typography><Typography variant="h4" fontWeight={800}>{formatNumber(totalLyHoliday)}</Typography></Paper></Grid>
          <Grid item xs={12} sm={6} md={3}><Paper className="kpi-card"><Typography variant="caption">TY forecast holiday hours</Typography><Typography variant="h4" fontWeight={800}>{formatNumber(totalTyHoliday)}</Typography></Paper></Grid>
          <Grid item xs={12} sm={6} md={3}><Paper className="kpi-card"><Typography variant="caption">TY forecast volume</Typography><Typography variant="h4" fontWeight={800}>{formatNumber(totalTyVolume)} m³</Typography></Paper></Grid>
          <Grid item xs={12} sm={6} md={3}><Paper className="kpi-card"><Typography variant="caption">Peak TY holiday month</Typography><Typography variant="h4" fontWeight={800}>{peakHoliday?.month ?? 'None'}</Typography></Paper></Grid>
        </Grid>
        <Paper className="chart-card" sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800}>LY baseline versus TY forecast</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Historical LY volume and booked holidays are compared with the TY volume forecast and Settings-based holiday requirement.</Typography>
          <Box sx={{ width: '100%', height: 360 }}>
            <ResponsiveContainer>
              <ComposedChart data={rows} margin={{ top: 12, right: 20, left: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dce3ec" />
                <XAxis dataKey="month" tickFormatter={shortMonth} />
                <YAxis yAxisId="hours" tickFormatter={value => `${Math.round(value)}h`} />
                <YAxis yAxisId="volume" orientation="right" tickFormatter={value => `${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value: number, name: string) => [name.toLowerCase().includes('volume') ? `${formatNumber(value)} m³` : `${formatNumber(value)}h`, name]} />
                <Legend />
                <Bar yAxisId="hours" dataKey="lyHolidayHours" name="LY booked holiday hours" fill="#8b6f47" barSize={24} />
                <Bar yAxisId="hours" dataKey="tyHolidayHours" name="TY forecast holiday hours" fill="#e66a4e" barSize={24} />
                <Line yAxisId="volume" type="monotone" dataKey="lyVolume" name="LY volume" stroke="#8b6f47" strokeWidth={2} dot={false} />
                <Line yAxisId="volume" type="monotone" dataKey="tyVolume" name="TY forecast volume" stroke="#1d5c8b" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
        <Paper className="table-wrap" sx={{ overflowX: 'auto' }}>
          <Typography variant="h6" fontWeight={800} sx={{ p: 2, pb: 0 }}>Annual LY versus TY detail</Typography>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead><TableRow>{['Month', 'LY volume (m³)', 'TY forecast volume (m³)', 'LY booked holidays (h)', 'TY total hours', 'TY holiday %', 'TY forecast holidays (h)', 'TY holiday hours / 1,000 m³'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
              <TableBody>{rows.map(row => <TableRow key={row.month} hover>
                <TableCell sx={{ fontWeight: 700 }}>{row.month}</TableCell>
                  <TableCell>{formatNumber(row.lyVolume)}</TableCell>
                  <TableCell>{formatNumber(row.tyVolume)}</TableCell>
                  <TableCell>{formatNumber(row.lyHolidayHours)}</TableCell>
                  <TableCell>{formatNumber(row.totalHours)}</TableCell>
                  <TableCell>{(row.holidayRate * 100).toFixed(1)}%</TableCell>
                  <TableCell>{formatNumber(row.tyHolidayHours)}</TableCell>
                <TableCell>{row.holidayHoursPer1000.toFixed(1)}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    </Box>
  );
}