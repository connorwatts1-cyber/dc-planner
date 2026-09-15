import React, { useState } from 'react';
import { Box, Grid, Paper, Typography, Stack } from '@mui/material';
import PageHeader from '../components/PageHeader';
import KPI from '../components/KPI';
import CapabilityTable from '../components/CapabilityTable';
import TrendChart from '../components/TrendChart';
import UploadComponent from '../components/UploadComponent';
import { usePlannerContext } from '../context/PlannerContext';
import WeekCalendarSelector, { planningCalendar } from '../components/WeekCalendarSelector';
import { buildPlanningSnapshot, buildPlanningCapabilityRows, buildPlanningTrendData, buildPlanningAbsenceBreakdown, buildPlanningAbsenceTrendData, filterPlanningWeeks } from '../services/analytics';

export default function FollowUpPage() {
  const { scopedUploadedFiles: uploadedFiles, roles } = usePlannerContext();
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<number[]>([2]);
  const allWeeksSelected = selectedWeekIndices.length === planningCalendar.length;
  const analyticsWeekIndex = allWeeksSelected ? null : selectedWeekIndices;
  const followUp = buildPlanningSnapshot(uploadedFiles, roles, analyticsWeekIndex);
  const rows = buildPlanningCapabilityRows(uploadedFiles, roles, analyticsWeekIndex);
  const trend = filterPlanningWeeks(buildPlanningTrendData(uploadedFiles, roles, analyticsWeekIndex), selectedWeekIndices);
  const calendarTrend = buildPlanningTrendData(uploadedFiles, roles, null);
  const calendarWeeks = planningCalendar.map((fallback, index) => {
    const actual = calendarTrend[index];
    if (!actual) return fallback;
    const capability = actual.requiredHours > 0 ? actual.scheduledHours / actual.requiredHours * 100 : 0;
    return { ...fallback, req: `${Math.round(actual.requiredHours)}h`, sch: `${Math.round(actual.scheduledHours)}h`, capability: `${capability.toFixed(1)}%`, status: capability < 95 ? 'UNDER CAPABILITY' : capability > 110 ? 'OVER CAPABILITY' : 'OPTIMAL' };
  });
  const absenceRows = buildPlanningAbsenceBreakdown(uploadedFiles, analyticsWeekIndex);
  const absenceTrend = filterPlanningWeeks(buildPlanningAbsenceTrendData(uploadedFiles, analyticsWeekIndex), selectedWeekIndices);
  const selectedLabel = allWeeksSelected ? 'All 8 weeks' : selectedWeekIndices.map(index => planningCalendar[index].week).join(', ');
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
      <PageHeader title="Follow Up" subtitle={`Weekly Review — ${selectedLabel}`} />
      <Grid container spacing={2} className="card-grid">
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Required Hours" value={Math.round(followUp.requiredHours)} /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Paid Hours" value={Math.round(followUp.paidHours)} /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Variance" value={Math.round(followUp.variance)} /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Capability %" value={`${Math.round(followUp.capability * 10) / 10}%`} /></Grid>
      </Grid>

      <WeekCalendarSelector weeks={calendarWeeks} selectedIndices={selectedWeekIndices} onSelect={selectWeek} onSelectAll={() => setSelectedWeekIndices(planningCalendar.map((_, index) => index))} />

      <Box mt={3} className="table-wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Capability Follow-Up Table ({selectedLabel})</Typography>
        <CapabilityTable key={selectedLabel} rows={rows} />
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Capability Trend ({selectedLabel})</Typography>
            <TrendChart key={`follow-up-capability-${selectedLabel}`} data={trend} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Absence Trend ({selectedLabel})</Typography>
            <TrendChart key={`follow-up-absence-${selectedLabel}`} data={absenceTrend} type="bar" />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Absence Breakdown ({selectedLabel})</Typography>
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
        <Grid item xs={12} md={6}>
          <Paper className="upload-panel">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Upload Area</Typography>
            <Stack spacing={2} mt={2}>
              <UploadComponent title="Actual Volume (M2)" accept=".csv,.xlsx" kind="actual-volume" />
              <UploadComponent title="Paid Hours File (MyTime)" accept=".csv,.xlsx" kind="paid-hours" />
              <UploadComponent title="Absence File (MyTime)" accept=".csv,.xlsx" kind="absence" />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
