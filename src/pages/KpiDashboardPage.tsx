import React, { useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PageHeader from '../components/PageHeader';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import WeekCalendarSelector, { planningCalendar } from '../components/WeekCalendarSelector';
import { usePlannerContext } from '../context/PlannerContext';
import { buildPlanningCapabilityRows, buildPlanningSnapshot, buildPlanningTrendData, filterPlanningWeeks, hasPlanningScheduleForWeek } from '../services/analytics';
import { exportKpiPowerPoint } from '../services/kpiPowerPoint';

function statusForKpi(value: number) {
  if (value >= 100) return { label: 'Optimal', color: '#00875a', background: '#d1fae5' };
  return { label: 'Under', color: '#c62828', background: '#fee2e2' };
}

function comparableRole(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z]+/g, '');
  return ({ picking: 'pick', pick: 'pick', replenishment: 'replens', replens: 'replens', transitbay: 'bayclearing', transitbayclearing: 'bayclearing', bayclearing: 'bayclearing', transittip: 'transittipping', transittipping: 'transittipping', transitload: 'transitloading', transitloading: 'transitloading' } as Record<string, string>)[normalized] ?? normalized;
}

export default function KpiDashboardPage() {
  const { scopedUploadedFiles: uploadedFiles, roles, roleScope, resourceMapping } = usePlannerContext();
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<number[]>([2]);
  const allWeeksSelected = selectedWeekIndices.length === planningCalendar.length;
  const selectedWeekScope = allWeeksSelected ? null : selectedWeekIndices;
  const planning = buildPlanningSnapshot(uploadedFiles, roles, selectedWeekScope, resourceMapping);
  const rawCapabilityRows = buildPlanningCapabilityRows(uploadedFiles, roles, selectedWeekScope, resourceMapping);
  const selectedRoleType = roleScope === 'non-ops' ? 'Non-Ops' : 'Operational';
  const configuredRoleKeys = new Set(roles.filter(role => role.type === selectedRoleType).flatMap(role => [comparableRole(role.role), comparableRole(role.translation)]));
  const existingRoleKeys = new Set(rawCapabilityRows.map(row => comparableRole(String(row.role))));
  const missingScopedRows = roles
    .filter(role => role.type === selectedRoleType && !existingRoleKeys.has(comparableRole(role.role)))
    .map(role => ({ id: role.id, role: role.translation, volume: 0, targetRate: role.targetRate ?? 0, requiredHours: 0, scheduledHours: 0, variance: 0, capability: 0, status: 'No mapping', recommendation: 'No volume or schedule data in the selected scope.' }));
  const capabilityRows = [...rawCapabilityRows, ...missingScopedRows].filter(row => configuredRoleKeys.has(comparableRole(String(row.role))) && (selectedRoleType === 'Non-Ops' || Number((row as typeof row & { volume?: number }).volume ?? 0) > 0));
  const trend = filterPlanningWeeks(buildPlanningTrendData(uploadedFiles, roles, selectedWeekScope, resourceMapping), selectedWeekIndices);
  const selectedLabel = allWeeksSelected ? 'All 8 weeks' : selectedWeekIndices.map(index => planningCalendar[index].week).join(', ');
  const calendarTrend = buildPlanningTrendData(uploadedFiles, roles, null, resourceMapping);
  const calendarWeeks = planningCalendar.map((fallback, index) => {
    const actual = calendarTrend[index];
    if (!actual) return fallback;
    const capability = actual.requiredHours > 0 ? actual.scheduledHours / actual.requiredHours * 100 : 0;
    return {
      ...fallback,
      estimated: !hasPlanningScheduleForWeek(uploadedFiles, index),
      req: `${Math.round(actual.requiredHours)}h`,
      sch: `${Math.round(actual.scheduledHours)}h`,
      capability: `${capability.toFixed(1)}%`,
      status: capability < 90 ? 'UNDER CAPABILITY' : capability > 110 ? 'OVER CAPABILITY' : 'OPTIMAL'
    };
  });
  const selectedCalendarRequired = selectedWeekIndices.reduce((total, index) => total + Number.parseFloat(calendarWeeks[index].req.replace('h', '')), 0);
  const selectedCalendarScheduled = selectedWeekIndices.reduce((total, index) => total + Number.parseFloat(calendarWeeks[index].sch.replace('h', '')), 0);
  const selectedCalendarCapability = selectedCalendarScheduled / Math.max(selectedCalendarRequired, 1) * 100;
  const selectedCalendarVariance = selectedCalendarScheduled - selectedCalendarRequired;

  const roleCards = useMemo(() => capabilityRows.map(row => {
    const rowWithProductivity = row as typeof row & { volume?: number; targetRate?: number };
    const volume = Number(rowWithProductivity.volume ?? 0);
    const actualProductivity = row.scheduledHours > 0 && volume > 0 ? volume / Number(row.scheduledHours) : 0;
    const targetProductivity = Number(rowWithProductivity.targetRate ?? 0);
    const productivityKpi = targetProductivity > 0 ? actualProductivity / targetProductivity * 100 : 0;
    const status = statusForKpi(productivityKpi);
    const targetHours = Number(row.requiredHours ?? 0);
    const scheduledHours = Number(row.scheduledHours ?? 0);
    const achievedWeeks = selectedWeekIndices.filter(weekIndex => {
      const weekRows = buildPlanningCapabilityRows(uploadedFiles, roles, [weekIndex], resourceMapping);
      const weekRole = weekRows.find(weekRow => comparableRole(String(weekRow.role)) === comparableRole(String(row.role)));
      const weekVolume = Number((weekRole as typeof weekRole & { volume?: number; targetRate?: number } | undefined)?.volume ?? 0);
      const weekTargetRate = Number((weekRole as typeof weekRole & { volume?: number; targetRate?: number } | undefined)?.targetRate ?? 0);
      if (!weekRole || Number(weekRole.scheduledHours) <= 0 || weekVolume <= 0 || weekTargetRate <= 0) return false;
      const weekActualProductivity = weekVolume / Number(weekRole.scheduledHours);
      const weekKpi = weekActualProductivity / weekTargetRate * 100;
      return weekKpi >= 100;
    }).length;

    return {
      ...row,
      volume,
      actualProductivity,
      targetProductivity,
      productivityKpi,
      status,
      targetHours,
      scheduledHours,
      hourVariance: scheduledHours - targetHours,
      achievedWeeks
    };
  }), [capabilityRows, trend]);

  const selectWeek = (index: number, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedWeekIndices(current => current.includes(index)
        ? current.length === 1 ? current : current.filter(item => item !== index)
        : [...current, index].sort((left, right) => left - right));
      return;
    }
    setSelectedWeekIndices([index]);
  };

  const downloadPowerPoint = async () => {
    await exportKpiPowerPoint({
      label: selectedLabel,
      requiredHours: selectedCalendarRequired,
      scheduledHours: selectedCalendarScheduled,
      capability: selectedCalendarCapability,
      variance: selectedCalendarVariance
    }, roleCards, `DC_Planner_KPI_Pack_${selectedLabel.replace(/[^A-Za-z0-9]+/g, '_')}.pptx`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <PageHeader title="KPI Dashboard" subtitle={`Role productivity and hours review — ${selectedLabel}`} />
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadPowerPoint} sx={{ mt: 1, whiteSpace: 'nowrap' }}>PowerPoint Pack</Button>
      </Box>
      <WeekCalendarSelector
        weeks={calendarWeeks}
        selectedIndices={selectedWeekIndices}
        onSelect={selectWeek}
        onSelectAll={() => setSelectedWeekIndices(planningCalendar.map((_, index) => index))}
      />

      <Grid container className="card-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><Paper className="kpi-card" sx={{ height: '100%' }}><Typography variant="overline">Required Hours</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{Math.ceil(selectedCalendarRequired)}</Typography><Typography variant="caption">Selected scope</Typography></Paper></Grid>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><Paper className="kpi-card" sx={{ height: '100%' }}><Typography variant="overline">Scheduled Hours</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{Math.ceil(selectedCalendarScheduled)}</Typography><Typography variant="caption">Selected scope</Typography></Paper></Grid>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><Paper className="kpi-card" sx={{ height: '100%' }}><Typography variant="overline">Overall KPI</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{selectedCalendarCapability.toFixed(1)}%</Typography><Typography variant="caption">Scheduled / required</Typography></Paper></Grid>
        <Grid item sx={{ width: 'auto', maxWidth: 'none', p: 0 }}><Paper className="kpi-card" sx={{ height: '100%' }}><Typography variant="overline">Hour Variance</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{Math.ceil(selectedCalendarVariance)}</Typography><Typography variant="caption">Scheduled minus target</Typography></Paper></Grid>
      </Grid>

      <Paper className="table-wrap" sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Role KPI & Productivity Breakdown</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Actual productivity is calculated from selected STP volume divided by selected scheduled hours. Baseline targets come from Settings.</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 1180 }}>
            <Grid container sx={{ px: 1, py: 1, bgcolor: '#f4f7fb', fontWeight: 800 }}>
              {['Role', 'KPI', 'Actual / Target Rate', 'Target Hours', 'Scheduled Hours', 'Hours Variance', 'Weeks Achieved', 'Status'].map(label => <Grid item xs={label === 'Role' ? 2 : label === 'Actual / Target Rate' ? 2.2 : 1.3} key={label}><Typography variant="caption">{label}</Typography></Grid>)}
            </Grid>
            {roleCards.map(role => (
              <Grid container key={role.id} sx={{ px: 1, py: 1.25, borderBottom: '1px solid #dce3ec', alignItems: 'center' }}>
                <Grid item xs={2}><Typography sx={{ fontWeight: 800 }}>{role.role}</Typography><Typography variant="caption" color="text.secondary">{Math.ceil(Number(role.volume))} volume units</Typography></Grid>
                <Grid item xs={1.3}><Typography sx={{ fontWeight: 800, color: role.status.color }}>{role.productivityKpi.toFixed(1)}%</Typography></Grid>
                <Grid item xs={2.2}><Typography>{role.actualProductivity.toFixed(1)} / {role.targetProductivity.toFixed(1)}</Typography></Grid>
                <Grid item xs={1.3}><Typography>{Math.ceil(role.targetHours)}</Typography></Grid>
                <Grid item xs={1.3}><Typography>{Math.ceil(role.scheduledHours)}</Typography></Grid>
                <Grid item xs={1.3}><Typography color={role.hourVariance >= 0 ? 'success.main' : 'error.main'}>{Math.ceil(role.hourVariance)}</Typography></Grid>
                <Grid item xs={1.3}><Typography>{role.achievedWeeks} / {trend.length}</Typography></Grid>
                <Grid item xs={1.3}><Chip label={role.status.label} size="small" sx={{ color: role.status.color, bgcolor: role.status.background, fontWeight: 800 }} /></Grid>
              </Grid>
            ))}
          </Box>
        </Box>
      </Paper>

      <Paper className="table-wrap" sx={{ mt: 2, p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Role KPI Donuts ({selectedLabel})</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Green shows weeks at or above target capability; red shows weeks below target.</Typography>
        <Grid container spacing={1}>
          {roleCards.map(role => {
            const achieved = Math.min(role.achievedWeeks, trend.length);
            const remaining = Math.max(trend.length - achieved, 0);
            const donutData = [{ name: 'Achieved', value: achieved }, { name: 'Remaining', value: remaining }];
            return (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={`donut-${role.id}`}>
                <Card variant="outlined" sx={{ height: '100%', borderColor: '#16202b', borderRadius: 0 }}>
                  <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Typography align="center" sx={{ fontWeight: 800, minHeight: 24 }}>{role.role}</Typography>
                    <Typography align="center" variant="caption" sx={{ display: 'block', color: role.status.color }}>{role.productivityKpi.toFixed(1)}% KPI</Typography>
                    <Box sx={{ height: 125, position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" innerRadius={34} outerRadius={49} paddingAngle={1} startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={1}>
                            <Cell fill={role.status.color === '#c62828' ? '#c62828' : '#6caf45'} />
                            <Cell fill="#f1f3f5" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <Typography sx={{ fontWeight: 800 }}>{achieved}/{trend.length}</Typography>
                      </Box>
                    </Box>
                    <Typography align="center" variant="caption" sx={{ textDecoration: 'underline', display: 'block' }}>Weeks achieved</Typography>
                    <Typography align="center" variant="body2" sx={{ fontWeight: 700 }}>{Math.ceil(role.volume).toLocaleString()} volume</Typography>
                    <Typography align="center" variant="caption" color="text.secondary">{role.status.label} · {Math.ceil(role.hourVariance)}h variance</Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}
