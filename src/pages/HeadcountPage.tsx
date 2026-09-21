import React from 'react';
import { Alert, Box, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader';
import UploadComponent from '../components/UploadComponent';
import { usePlannerContext } from '../context/PlannerContext';
import { mtpMonths as defaultMtpMonths } from '../mockData';
import { MtpMonthData } from '../types';

const workbookHolidayRates: Record<string, number> = {
  September: 0.07, October: 0.08, November: 0.08, December: 0.16, January: 0.10, February: 0.14,
  March: 0.14, April: 0.15, May: 0.18, June: 0.20, July: 0.10, August: 0.07
};
const numberValue = (value: unknown) => Number(value) || 0;

function recordsToMtp(records: Array<Record<string, string | number>>): MtpMonthData[] {
  return records.map(record => ({
    month: String(record.month ?? ''),
    weeksIncluded: numberValue(record.weeksIncluded),
    inboundVolume: numberValue(record.inboundVolume),
    outflowVolume: numberValue(record.outflowVolume),
    totalHandlingVolume: numberValue(record.totalHandlingVolume),
    averageWeeklyVolume: numberValue(record.averageWeeklyVolume),
    operationalHoursNeed: numberValue(record.operationalHoursNeed),
    fteForFp: numberValue(record.fteForFp),
    fteForPick: numberValue(record.fteForPick),
    fteDevelopment: numberValue(record.fteDevelopment),
    fteSickness: numberValue(record.fteSickness),
    fteHolidays: numberValue(record.fteHolidays),
    totalFteNeed: numberValue(record.totalFteNeed)
  })).filter(row => row.month && row.totalHandlingVolume > 0);
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
const formatFte = (value: number) => value.toFixed(0);

export default function HeadcountPage() {
  const { resourceMapping, uploadedFiles } = usePlannerContext();
  const mtpUpload = uploadedFiles.find(file => file.kind === 'mtp' && file.status === 'parsed');
  const uploadedMtp = mtpUpload ? recordsToMtp(mtpUpload.records) : [];
  const sourceRows = uploadedMtp.length ? uploadedMtp : defaultMtpMonths;
  const rows = sourceRows.map(source => {
    const assumptions = resourceMapping.monthValues?.[source.month] ?? resourceMapping;
    const absenceRate = assumptions.absence ?? resourceMapping.absence;
    const holidayRate = assumptions.holiday ?? resourceMapping.holiday;
    const trainingRate = assumptions.training ?? resourceMapping.training;
    const sicknessFte = Math.round(source.fteSickness * absenceRate / 0.10);
    const holidayFte = Math.round(source.fteHolidays * holidayRate / (workbookHolidayRates[source.month] || 0.10));
    const developmentFte = Math.round(source.fteDevelopment * trainingRate / 0.02);
    return {
      ...source,
      fteDevelopment: developmentFte,
      fteSickness: sicknessFte,
      fteHolidays: holidayFte,
      totalFteNeed: source.fteForFp + source.fteForPick + developmentFte + sicknessFte + holidayFte
    };
  });
  const totalHandling = rows.reduce((sum, row) => sum + row.totalHandlingVolume, 0);
  const averageNeed = rows.length ? rows.reduce((sum, row) => sum + row.totalFteNeed, 0) / rows.length : 0;
  const peakNeed = rows.reduce((peak, row) => Math.max(peak, row.totalFteNeed), 0);
  const scenarioRows = [-20, 0, 20].map(change => {
    const factor = 1 + change / 100;
    const scenario = rows.map(row => ({
      month: row.month.slice(0, 3),
      volume: Math.round(row.totalHandlingVolume * factor),
      fte: Math.round(row.totalFteNeed * factor)
    }));
    return {
      change,
      averageFte: scenario.length ? scenario.reduce((sum, row) => sum + row.fte, 0) / scenario.length : 0,
      peakFte: scenario.reduce((peak, row) => Math.max(peak, row.fte), 0),
      totalVolume: scenario.reduce((sum, row) => sum + row.volume, 0)
    };
  });
  const chartRows = rows.map(row => ({ month: row.month.slice(0, 3), volume: row.totalHandlingVolume, fte: row.totalFteNeed, plusTwentyFte: Math.round(row.totalFteNeed * 1.2) }));

  return (
    <Box>
      <PageHeader title="Headcount" subtitle="MTP volume converted into monthly operational FTE need" />
      <Stack spacing={2}>
        <UploadComponent title="Upload latest MTP workbook" accept=".xlsx,.xls" kind="mtp" />
        <Alert severity="info">
          {mtpUpload ? `Using ${mtpUpload.fileName}. ` : 'Using the Connor MTP workbook values supplied with the project. '}
          Absence, holiday, and training adjustments are linked to Settings &gt; Resource Mapping.
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><Paper className="kpi-card"><Typography variant="caption">12-month handling volume</Typography><Typography variant="h4" fontWeight={800}>{formatNumber(totalHandling)}</Typography></Paper></Grid>
          <Grid item xs={12} sm={4}><Paper className="kpi-card"><Typography variant="caption">Average monthly FTE need</Typography><Typography variant="h4" fontWeight={800}>{formatFte(averageNeed)}</Typography></Paper></Grid>
          <Grid item xs={12} sm={4}><Paper className="kpi-card"><Typography variant="caption">Peak monthly FTE need</Typography><Typography variant="h4" fontWeight={800}>{formatFte(peakNeed)}</Typography></Paper></Grid>
        </Grid>
        <Paper className="table-wrap" sx={{ overflowX: 'auto' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>MTP volume and headcount requirement</Typography>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 1040 }}>
              <TableHead><TableRow>
                {['Month', 'Inbound', 'Outflow', 'Total handling', '+20% handling', 'Op hours', 'FP', 'Pick', 'Development', 'Sickness', 'Holidays', 'Total FTE need', '+20% FTE need'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}
              </TableRow></TableHead>
              <TableBody>{rows.map(row => <TableRow key={row.month} hover>
                <TableCell sx={{ fontWeight: 700 }}>{row.month}</TableCell>
                <TableCell>{formatNumber(row.inboundVolume)}</TableCell>
                <TableCell>{formatNumber(row.outflowVolume)}</TableCell>
                <TableCell>{formatNumber(row.totalHandlingVolume)}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'success.main' }}>{formatNumber(row.totalHandlingVolume * 1.2)}</TableCell>
                <TableCell>{formatNumber(row.operationalHoursNeed)}</TableCell>
                <TableCell>{formatFte(row.fteForFp)}</TableCell>
                <TableCell>{formatFte(row.fteForPick)}</TableCell>
                <TableCell>{formatFte(row.fteDevelopment)}</TableCell>
                <TableCell>{formatFte(row.fteSickness)}</TableCell>
                <TableCell>{formatFte(row.fteHolidays)}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{formatFte(row.totalFteNeed)}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'success.main' }}>{formatFte(row.totalFteNeed * 1.2)}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Paper className="chart-card" sx={{ height: 390 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>12-month MTP calendar</Typography>
              <ResponsiveContainer width="100%" height="88%">
                <ComposedChart data={chartRows} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dce5f0" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="volume" tickFormatter={value => `${Math.round(value / 1000)}k`} />
                  <YAxis yAxisId="fte" orientation="right" />
                  <Tooltip formatter={(value: number, name: string) => [name === 'volume' ? formatNumber(value) : formatFte(value), name === 'volume' ? 'Handling volume' : 'FTE need']} />
                  <Legend />
                  <Bar yAxisId="volume" dataKey="volume" name="Handling volume" fill="#2f6fed" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="fte" type="monotone" dataKey="fte" name="FTE need" stroke="#e86a33" strokeWidth={3} dot={{ r: 3 }} />
                  <Line yAxisId="fte" type="monotone" dataKey="plusTwentyFte" name="+20% FTE need" stroke="#2e8b57" strokeWidth={2.5} strokeDasharray="7 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper className="table-wrap" sx={{ height: 390, overflowX: 'auto' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Volume scenarios</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Volume changes are applied proportionally to the MTP FTE requirement.</Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell sx={{ fontWeight: 800 }}>Scenario</TableCell><TableCell sx={{ fontWeight: 800 }}>12-month volume</TableCell><TableCell sx={{ fontWeight: 800 }}>Average FTE</TableCell><TableCell sx={{ fontWeight: 800 }}>Peak FTE</TableCell></TableRow></TableHead>
                <TableBody>{scenarioRows.map(scenario => <TableRow key={scenario.change} hover>
                  <TableCell sx={{ fontWeight: 800, color: scenario.change > 0 ? 'success.main' : scenario.change < 0 ? 'error.main' : 'text.primary' }}>{scenario.change > 0 ? '+' : ''}{scenario.change}%</TableCell>
                  <TableCell>{formatNumber(scenario.totalVolume)}</TableCell>
                  <TableCell>{formatFte(scenario.averageFte)}</TableCell>
                  <TableCell>{formatFte(scenario.peakFte)}</TableCell>
                </TableRow>)}</TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
        <Paper className="table-wrap" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <UploadFileIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={800}>Applied monthly assumptions</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Settings values are applied per month: absence {Math.round((resourceMapping.monthValues?.September?.absence ?? resourceMapping.absence) * 100)}%, holiday {Math.round((resourceMapping.monthValues?.September?.holiday ?? resourceMapping.holiday) * 100)}%, training {Math.round((resourceMapping.monthValues?.September?.training ?? resourceMapping.training) * 100)}%. Edit the monthly mapping in Settings to update this calculation.
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}
