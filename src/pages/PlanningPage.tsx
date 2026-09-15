import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Grid, Paper, Typography, Stack } from '@mui/material';
import PageHeader from '../components/PageHeader';
import KPI from '../components/KPI';
import CapabilityTable from '../components/CapabilityTable';
import TrendChart from '../components/TrendChart';
import UploadComponent from '../components/UploadComponent';
import { usePlannerContext } from '../context/PlannerContext';
import { buildPlanningSnapshot, buildPlanningCapabilityRows, buildPlanningTrendData, buildPlanningAbsenceBreakdown, buildPlanningAbsenceTrendData, filterPlanningWeeks, planningWeekLabels } from '../services/analytics';

export default function PlanningPage() {
  const { scopedUploadedFiles: uploadedFiles, roles } = usePlannerContext();
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<number[]>([2]);

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
  const trendDataForPlanning = filterPlanningWeeks(buildPlanningTrendData(uploadedFiles, roles, analyticsWeekIndex), selectedWeekIndices);
  const absenceRows = buildPlanningAbsenceBreakdown(uploadedFiles, analyticsWeekIndex);
  const absenceTrendData = filterPlanningWeeks(buildPlanningAbsenceTrendData(uploadedFiles, analyticsWeekIndex), selectedWeekIndices);
  const selectedWeeks = selectedWeekIndices.map(index => calendar[index]);
  const selectedRequired = selectedWeeks.reduce((sum, week) => sum + Number.parseFloat(week.req.replace('h', '')), 0) || planning.requiredHours;
  const selectedScheduled = selectedWeeks.reduce((sum, week) => sum + Number.parseFloat(week.sch.replace('h', '')), 0) || planning.scheduledHours;
  const selectedCapability = selectedRequired > 0 ? (selectedScheduled / selectedRequired) * 100 : planning.capability;
  const selectedWeekLabel = allWeeksSelected ? 'All 8 weeks' : selectedWeeks.map(week => week.week).join(', ');

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
        <CapabilityTable key={`capability-table-${selectedWeekLabel}`} rows={tableRows} />
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
