import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Grid, Paper, Typography, Stack } from '@mui/material';
import PageHeader from '../components/PageHeader';
import KPI from '../components/KPI';
import CapabilityTable from '../components/CapabilityTable';
import TrendChart from '../components/TrendChart';
import UploadComponent from '../components/UploadComponent';
import { usePlannerContext } from '../context/PlannerContext';
import { buildPlanningSnapshot, buildPlanningCapabilityRows, buildPlanningTrendData, buildPlanningAbsenceBreakdown, buildPlanningAbsenceTrendData, filterPlanningWeeks, planningWeekLabels } from '../services/analytics';
import { buildForecastClassificationSummary } from '../services/stpMappingService';
import { historicalFollowUpWeeks } from '../historicalFollowUpData';

export default function PlanningPage() {
  const { scopedUploadedFiles: uploadedFiles, uploadedFiles: allUploadedFiles, roles, resourceMapping } = usePlannerContext();
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<number[]>([2]);
  const [showPriorYearActuals, setShowPriorYearActuals] = useState(false);

  const fallbackCalendar = [
    { week: 'W36', label: 'Sep', req: '5637h', sch: '5550h', capability: '98.5%', status: 'OPTIMAL', tone: 'green' },
    { week: 'W37', label: 'Sep', req: '5096h', sch: '5350h', capability: '105.0%', status: 'OPTIMAL', tone: 'blue' },
    { week: 'W38', label: 'Sep', req: '5333h', sch: '5050h', capability: '94.7%', status: 'OPTIMAL', tone: 'green' },
    { week: 'W39', label: 'Sep', req: '4525h', sch: '5200h', capability: '114.9%', status: 'OVER CAPABILITY', tone: 'orange' },
    { week: 'W40', label: 'Oct', req: '5018h', sch: '5018h', capability: '100.0%', status: 'OPTIMAL', tone: 'purple' },
    { week: 'W41', label: 'Oct', req: '5022h', sch: '5018h', capability: '99.9%', status: 'OPTIMAL', tone: 'purple' },
    { week: 'W42', label: 'Oct', req: '4895h', sch: '4904h', capability: '100.2%', status: 'OPTIMAL', tone: 'purple' },
    { week: 'W43', label: 'Oct', req: '4575h', sch: '4596h', capability: '100.5%', status: 'OPTIMAL', tone: 'purple' }
  ];
  const allWeeksTrend = buildPlanningTrendData(uploadedFiles, roles, null);
  const calendar = fallbackCalendar.map((fallback, index) => {
    const actual = allWeeksTrend[index];
    if (!actual) return fallback;
    const capability = actual.requiredHours > 0 ? actual.scheduledHours / actual.requiredHours * 100 : 0;
    return {
      ...fallback,
      week: planningWeekLabels[index],
      req: `${Math.round(actual.requiredHours)}h`,
      sch: `${Math.round(actual.scheduledHours)}h`,
      capability: `${capability.toFixed(1)}%`,
      status: capability < 95 ? 'UNDER CAPABILITY' : capability > 110 ? 'OVER CAPABILITY' : 'OPTIMAL',
      tone: capability < 90 ? 'orange' as const : capability > 110 ? 'blue' as const : 'green' as const
    };
  });

  const allWeeksSelected = selectedWeekIndices.length === calendar.length;
  const analyticsWeekIndex = allWeeksSelected ? null : selectedWeekIndices;
  const planning = buildPlanningSnapshot(uploadedFiles, roles, analyticsWeekIndex);
  const tableRows = buildPlanningCapabilityRows(uploadedFiles, roles, analyticsWeekIndex);
  const mappedTableRows = tableRows.filter(row => row.status !== 'No mapping' && !String(row.role).startsWith('No mapping'));
  const trendDataForPlanning = filterPlanningWeeks(buildPlanningTrendData(uploadedFiles, roles, analyticsWeekIndex), selectedWeekIndices);
  const absenceRows = buildPlanningAbsenceBreakdown(uploadedFiles, analyticsWeekIndex);
  const absenceTrendData = filterPlanningWeeks(buildPlanningAbsenceTrendData(uploadedFiles, analyticsWeekIndex), selectedWeekIndices);
  const selectedWeeks = selectedWeekIndices.map(index => calendar[index]);
  const selectedRequired = selectedWeeks.reduce((sum, week) => sum + Number.parseFloat(week.req.replace('h', '')), 0) || planning.requiredHours;
  const selectedScheduled = selectedWeeks.reduce((sum, week) => sum + Number.parseFloat(week.sch.replace('h', '')), 0) || planning.scheduledHours;
  const selectedCapability = selectedRequired > 0 ? (selectedScheduled / selectedRequired) * 100 : planning.capability;
  const selectedWeekLabel = allWeeksSelected ? 'All 8 weeks' : selectedWeeks.map(week => week.week).join(', ');
  const forecastWeekCodes = allWeeksSelected ? undefined : selectedWeekIndices.map(index => `2026${String(36 + index).padStart(2, '0')}`);
  const forecastSummary = buildForecastClassificationSummary(allUploadedFiles, true, forecastWeekCodes);
  const landTotal = forecastSummary.landDc + forecastSummary.landTransit;
  const oceanTotal = forecastSummary.oceanDc + forecastSummary.oceanTransit;
  const inboundForecast = forecastSummary.inboundDc + forecastSummary.inboundTransit;
  const outboundForecast = forecastSummary.outboundDc + forecastSummary.outboundTransit;
  const truckVolume = Math.max(resourceMapping.truckVolumeM3, 0.1);
  const inboundLoads = inboundForecast / truckVolume;
  const outboundLoads = outboundForecast / truckVolume;
  const capabilityRows = mappedTableRows as Array<typeof mappedTableRows[number] & { targetRate?: number }>;
  const inboundCapacity = capabilityRows
    .filter(row => /tipping|transit tip/i.test(String(row.role)))
    .reduce((total, row) => total + Number(row.scheduledHours ?? 0) * Number(row.targetRate ?? 0), 0);
  const outboundCapacity = capabilityRows
    .filter(row => /loading|transit load/i.test(String(row.role)))
    .reduce((total, row) => total + Number(row.scheduledHours ?? 0) * Number(row.targetRate ?? 0), 0);
  const inboundCapability = inboundForecast > 0 ? inboundCapacity / inboundForecast * 100 : 0;
  const outboundCapability = outboundForecast > 0 ? outboundCapacity / outboundForecast * 100 : 0;
  const selectedForecastVolume = inboundForecast + outboundForecast;
  const currentYearActual = historicalFollowUpWeeks.find(week => week.year === 2026 && week.week === planningWeekLabels[selectedWeekIndices[0]]);
  const priorYearActual = historicalFollowUpWeeks.find(week => week.year === 2025 && week.week === planningWeekLabels[selectedWeekIndices[0]]);
  const comparisonForecast = showPriorYearActuals ? priorYearActual?.m3Handled ?? 0 : selectedForecastVolume;
  const comparisonActual = currentYearActual?.m3Handled ?? 0;

  const selectWeek = (index: number, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedWeekIndices(current => current.includes(index)
        ? current.length === 1 ? current : current.filter(item => item !== index)
        : [...current, index].sort((left, right) => left - right));
      return;
    }
    setSelectedWeekIndices([index]);
  };

  return (
    <Box>
      <PageHeader title="Planning" subtitle={`8 Week Lookahead — ${planning.lookaheadWeeks} weeks • ${selectedWeekLabel} selected`} />
      <Grid container spacing={2} className="card-grid">
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Required Hours" value={Math.round(selectedRequired)} subtitle="Forecast" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Scheduled Hours" value={Math.round(selectedScheduled)} subtitle="Rostered" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Variance" value={Math.round(selectedScheduled - selectedRequired)} subtitle="Hours" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Capability %" value={`${Math.round(selectedCapability * 10) / 10}%`} subtitle="Forecast" /></Grid>
      </Grid>

      <Paper className="table-wrap" sx={{ mt: 2, p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Box><Typography variant="h6" sx={{ fontWeight: 800 }}>Forecast Weekly View</Typography><Typography variant="body2" color="text.secondary">Forecast and actual volume comparison for the selected planning week.</Typography></Box>
          <Button variant={showPriorYearActuals ? 'contained' : 'outlined'} size="small" onClick={() => setShowPriorYearActuals(current => !current)}>{showPriorYearActuals ? 'Showing prior-year actuals' : 'Show prior-year actuals'}</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Forecast STP volumes classified from the uploaded workbook. Values are shown in m3.</Typography>
        <Grid container spacing={2}>
          {[
            ['Inbound DC', forecastSummary.inboundDc],
            ['Inbound Transit', forecastSummary.inboundTransit],
            ['Outbound DC', forecastSummary.outboundDc],
            ['Outbound Transit', forecastSummary.outboundTransit],
            ['Land total', landTotal],
            ['Ocean total', oceanTotal]
          ].map(([label, value]) => <Grid item xs={12} sm={6} md={2} key={label as string}><Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={800}>{Math.round(value as number).toLocaleString('en-GB')}</Typography></Paper></Grid>)}
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Land split: DC {Math.round(forecastSummary.landDc).toLocaleString('en-GB')} m3, Transit {Math.round(forecastSummary.landTransit).toLocaleString('en-GB')} m3. Ocean split: DC {Math.round(forecastSummary.oceanDc).toLocaleString('en-GB')} m3, Transit {Math.round(forecastSummary.oceanTransit).toLocaleString('en-GB')} m3.</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Comparison source</Typography><Typography fontWeight={800}>{showPriorYearActuals ? 'Prior-year actuals' : 'Current forecast'}</Typography></Grid>
          <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Comparison volume</Typography><Typography fontWeight={800}>{Math.round(comparisonForecast).toLocaleString('en-GB')} m3</Typography></Grid>
          <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Current-year actual / variance</Typography><Typography fontWeight={800}>{Math.round(comparisonActual).toLocaleString('en-GB')} m3 / {Math.round(comparisonActual - comparisonForecast).toLocaleString('en-GB')} m3</Typography></Grid>
        </Grid>
      </Paper>

      <Paper className="table-wrap" sx={{ mt: 2, p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Forecast volume versus scheduled capability</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Load estimates use the Settings truck-volume assumption. Role capacity uses scheduled hours multiplied by the configured role target rate.</Typography>
        <Grid container spacing={2}>
          {[
            ['Inbound loads', inboundLoads, inboundCapacity, inboundCapability],
            ['Outbound loads', outboundLoads, outboundCapacity, outboundCapability]
          ].map(([label, loads, capacity, capabilityValue]) => <Grid item xs={12} md={6} key={label as string}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={800}>{label}</Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Forecast loads</Typography><Typography variant="h6" fontWeight={800}>{Math.ceil(loads as number)}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Supported m3</Typography><Typography variant="h6" fontWeight={800}>{Math.round(capacity as number).toLocaleString('en-GB')}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Capability</Typography><Typography variant="h6" fontWeight={800} color={(capabilityValue as number) >= 100 ? 'success.main' : 'error.main'}>{(capabilityValue as number).toFixed(1)}%</Typography></Grid>
              </Grid>
            </Paper>
          </Grid>)}
        </Grid>
      </Paper>

      <Box className="calendar-section" sx={{ mt: 3, mb: 3, background: '#fff', borderRadius: 3, border: '1px solid #dceaff', boxShadow: '0 8px 20px rgba(25,72,140,0.06)', p: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>8-Week Resource Calendar <span style={{ color: '#58617a' }}>(Week 36 = Sep 1 Start)</span></Typography>
            <Typography variant="body2" sx={{ color: '#58617a' }}>Click any week card below to inspect role distribution and workload details, or view all 8 weeks.</Typography>
          </Box>
          <Button variant="contained" className="calendar-button" onClick={() => setSelectedWeekIndices(calendar.map((_, index) => index))}>View All 8 Weeks</Button>
        </Box>
        <Grid container spacing={1.5} className="calendar-grid">
          {calendar.map((item, index) => {
            const selected = selectedWeekIndices.includes(index);
            const capabilityValue = Number.parseFloat(item.capability.replace('%', '')) || 0;
            const isUnder = capabilityValue < 90;
            const isOver = capabilityValue > 110;
            const capabilityColor = isUnder ? '#c62828' : isOver ? '#2563eb' : '#00875a';
            const capabilityBorder = isUnder ? '#ef4444' : isOver ? '#3b82f6' : '#00a878';
            const capabilityBadge = isUnder ? '#fee2e2' : isOver ? '#dbeafe' : '#d1fae5';
            const capabilityStatus = isUnder ? 'UNDER CAPABILITY' : isOver ? 'OVER CAPABILITY' : 'OPTIMAL';
            return (
              <Grid item xs={12} sm={6} md={1.5} key={item.week}>
                <Card
                  className={`calendar-card ${item.tone === 'orange' ? 'card-over' : ''} ${selected ? 'calendar-card-selected' : ''}`}
                  onClick={(event) => selectWeek(index, event)}
                  sx={{ cursor: 'pointer', border: `2px solid ${selected ? '#102d6e' : capabilityBorder}`, borderRadius: 2, boxShadow: selected ? '0 0 0 2px rgba(16,45,110,0.18)' : '0 8px 20px rgba(25,72,140,0.06)' }}
                >
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.week}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: item.tone === 'orange' ? '#a84300' : '#2a6eaf', background: item.tone === 'orange' ? '#ffe0cc' : '#e6f1ff', px: 1, py: 0.2, borderRadius: 1 }}>{index === 4 || index === 5 || index === 6 || index === 7 ? '>4W' : 'ROTA'}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', color: '#58617a', mb: 1 }}>{item.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Req: {item.req}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Sch: {item.sch}</Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 800, color: capabilityColor }}>{item.capability}</Typography>
                    <Box sx={{ mt: 1, borderTop: '1px solid #dceaff', pt: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: capabilityColor, background: capabilityBadge, borderRadius: 1, py: 0.35, letterSpacing: '0.06em' }}>{capabilityStatus}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Box mt={3} className="table-wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Capability Planning Table <Typography component="span" variant="body2" sx={{ color: '#58617a' }}>({selectedWeekLabel})</Typography></Typography>
        <CapabilityTable key={`capability-table-${selectedWeekLabel}`} rows={mappedTableRows} />
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card" key={`capability-trend-${selectedWeekLabel}`}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Capability Trend <Typography component="span" variant="body2" sx={{ color: '#58617a' }}>({selectedWeekLabel})</Typography></Typography>
            <TrendChart key={`capability-chart-${selectedWeekLabel}`} data={trendDataForPlanning} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card" key={`absence-trend-${selectedWeekLabel}`}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Absence Trend <Typography component="span" variant="body2" sx={{ color: '#58617a' }}>({selectedWeekLabel})</Typography></Typography>
            <TrendChart key={`absence-chart-${selectedWeekLabel}`} data={absenceTrendData} type="bar" />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card" key={`absence-breakdown-${selectedWeekLabel}`}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Absence Breakdown <Typography component="span" variant="body2" sx={{ color: '#58617a' }}>({selectedWeekLabel})</Typography></Typography>
            <TrendChart key={`absence-breakdown-chart-${selectedWeekLabel}`} data={absenceRows.map(item => ({ date: item.absenceType, absenceHours: item.absenceHours }))} type="bar" />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card" key={`absence-table-${selectedWeekLabel}`}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Absence Table <Typography component="span" variant="body2" sx={{ color: '#58617a' }}>({selectedWeekLabel})</Typography></Typography>
            <Box sx={{ mt: 2 }}>
              {absenceRows.map(item => (
                <Stack direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #d0d9d5' }} key={item.absenceType}>
                  <Typography>{item.absenceType}</Typography>
                  <Typography>{Math.ceil(item.absenceHours)}</Typography>
                </Stack>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper className="upload-panel" sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Data Upload Section</Typography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} md={4}><UploadComponent title="STP Tool file" accept=".csv,.xlsx" kind="stp" /></Grid>
          <Grid item xs={12} md={4}><UploadComponent title="Schedule File (MyTime)" accept=".csv,.xlsx" kind="schedule" /></Grid>
          <Grid item xs={12} md={4}><UploadComponent title="Absence File (MyTime)" accept=".csv,.xlsx" kind="absence" /></Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
