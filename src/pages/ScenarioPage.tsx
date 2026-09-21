import React, { useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography, Stack, TextField, Chip, Slider } from '@mui/material';
import PageHeader from '../components/PageHeader';
import KPI from '../components/KPI';
import CapabilityTable from '../components/CapabilityTable';
import TrendChart from '../components/TrendChart';
import { usePlannerContext } from '../context/PlannerContext';
import { buildPlanningSnapshot, buildPlanningCapabilityRows, buildPlanningTrendData, filterPlanningWeeks } from '../services/analytics';
import { buildStpDemandPlan, stpRoleMappingConfig } from '../services/stpMappingService';
import WeekCalendarSelector, { planningCalendar } from '../components/WeekCalendarSelector';
import { roleDefaults } from '../mockData';

function scenarioFromInputs(requiredHours: number, scheduledHours: number, m3Uplift: number, inboundTrucks: number, outboundTrucks: number, stpInboundVolume: number, stpOutboundVolume: number, inboundAdjustmentPercent: number, outboundAdjustmentPercent: number, truckVolumeM3: number, roles = roleDefaults) {
  const truckInboundM3 = inboundTrucks * truckVolumeM3;
  const truckOutboundM3 = outboundTrucks * truckVolumeM3;
  const adjustedStpInboundM3 = stpInboundVolume * inboundAdjustmentPercent / 100;
  const adjustedStpOutboundM3 = stpOutboundVolume * outboundAdjustmentPercent / 100;
  const rawScenarioVolume = m3Uplift + truckInboundM3 + truckOutboundM3;
  const adjustedScenarioVolume = rawScenarioVolume + adjustedStpInboundM3 + adjustedStpOutboundM3;
  const configurationRole = roles.find(role => role.role === 'Picking') ?? roles[0];
  const avgM3PerPallet = configurationRole?.m3PerPallet ?? 0.82;
  const avgPalletsPerHour = Math.max(configurationRole?.palletsPerHour ?? 22.5, 1);
  const palletsFromVolume = adjustedScenarioVolume / Math.max(avgM3PerPallet, 0.1);
  const extraRequiredHours = palletsFromVolume / Math.max(avgPalletsPerHour, 1);

  const scenarioRequiredHours = requiredHours + extraRequiredHours;
  const scenarioScheduledHours = scheduledHours;
  const scenarioVariance = scenarioScheduledHours - scenarioRequiredHours;
  const scenarioCapability = scenarioScheduledHours / Math.max(scenarioRequiredHours, 1) * 100;
  const gap = Math.max(scenarioRequiredHours - scenarioScheduledHours, 0);
  const surplus = Math.max(scenarioScheduledHours - scenarioRequiredHours, 0);

  return {
    extraRequiredHours,
    truckInboundM3,
    truckOutboundM3,
    stpInboundVolume,
    stpOutboundVolume,
    adjustedStpInboundM3,
    adjustedStpOutboundM3,
    rawScenarioVolume,
    adjustedScenarioVolume,
    scenarioRequiredHours,
    scenarioScheduledHours,
    scenarioVariance,
    scenarioCapability,
    gap,
    surplus,
    needStatus: scenarioRequiredHours > scenarioScheduledHours ? 'Need' : 'Surplus'
  };
}

export default function ScenarioPage() {
  const { scopedUploadedFiles: uploadedFiles, roles, resourceMapping } = usePlannerContext();
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<number[]>([2]);
  const [m3Uplift, setM3Uplift] = useState(0);
  const [inboundTrucks, setInboundTrucks] = useState(0);
  const [outboundTrucks, setOutboundTrucks] = useState(0);
  const [inboundAdjustmentPercent, setInboundAdjustmentPercent] = useState(0);
  const [outboundAdjustmentPercent, setOutboundAdjustmentPercent] = useState(0);
  const allWeeksSelected = selectedWeekIndices.length === planningCalendar.length;
  const analyticsWeekIndex = allWeeksSelected ? null : selectedWeekIndices;
  const planning = buildPlanningSnapshot(uploadedFiles, roles, analyticsWeekIndex);
  const tableRows = buildPlanningCapabilityRows(uploadedFiles, roles, analyticsWeekIndex);
  const trendData = filterPlanningWeeks(buildPlanningTrendData(uploadedFiles, roles, analyticsWeekIndex), selectedWeekIndices);
  const stpDemand = buildStpDemandPlan(uploadedFiles, stpRoleMappingConfig, roles, allWeeksSelected ? undefined : selectedWeekIndices.map(index => `2026${String(36 + index).padStart(2, '0')}`));
  const stpInboundVolume = stpDemand.roleDemandRows.filter(row => row.role === 'DC Tipping' || row.role === 'Transit Tipping').reduce((total, row) => total + row.volume, 0);
  const stpOutboundVolume = stpDemand.roleDemandRows.filter(row => row.role === 'DC Loading' || row.role === 'Transit Loading').reduce((total, row) => total + row.volume, 0);
  const truckVolumeAssumption = Math.max(resourceMapping.truckVolumeM3, 0.01);
  const estimatedInboundTrucks = Math.ceil(stpInboundVolume / truckVolumeAssumption);
  const estimatedOutboundTrucks = Math.ceil(stpOutboundVolume / truckVolumeAssumption);
  const calendarTrend = buildPlanningTrendData(uploadedFiles, roles, null);
  const calendarWeeks = planningCalendar.map((fallback, index) => {
    const actual = calendarTrend[index];
    if (!actual) return fallback;
    const capability = actual.requiredHours > 0 ? actual.scheduledHours / actual.requiredHours * 100 : 0;
    return { ...fallback, req: `${Math.round(actual.requiredHours)}h`, sch: `${Math.round(actual.scheduledHours)}h`, capability: `${capability.toFixed(1)}%`, status: capability < 95 ? 'UNDER CAPABILITY' : capability > 110 ? 'OVER CAPABILITY' : 'OPTIMAL' };
  });
  const selectedLabel = allWeeksSelected ? 'All 8 weeks' : selectedWeekIndices.map(index => planningCalendar[index].week).join(', ');
  const selectedRequiredHours = selectedWeekIndices.reduce((total, index) => total + Number.parseFloat(calendarWeeks[index].req.replace('h', '')), 0);
  const selectedScheduledHours = selectedWeekIndices.reduce((total, index) => total + Number.parseFloat(calendarWeeks[index].sch.replace('h', '')), 0);
  const selectedCapability = selectedRequiredHours > 0 ? selectedScheduledHours / selectedRequiredHours * 100 : 0;
  const selectedVariance = selectedScheduledHours - selectedRequiredHours;
  const selectWeek = (index: number, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedWeekIndices(current => current.includes(index)
        ? current.length === 1 ? current : current.filter(item => item !== index)
        : [...current, index].sort((left, right) => left - right));
      return;
    }
    setSelectedWeekIndices([index]);
  };

  const scenario = useMemo(() => scenarioFromInputs(
    selectedRequiredHours,
    selectedScheduledHours,
    m3Uplift,
    inboundTrucks,
    outboundTrucks,
    stpInboundVolume,
    stpOutboundVolume,
    inboundAdjustmentPercent,
    outboundAdjustmentPercent,
    resourceMapping.truckVolumeM3,
    roles
  ), [selectedRequiredHours, selectedScheduledHours, m3Uplift, inboundTrucks, outboundTrucks, stpInboundVolume, stpOutboundVolume, inboundAdjustmentPercent, outboundAdjustmentPercent, resourceMapping.truckVolumeM3, roles]);

  return (
    <Box>
      <PageHeader title="Scenario Tool" subtitle={`Model staffing scenarios — ${selectedLabel}`} />

      <WeekCalendarSelector weeks={calendarWeeks} selectedIndices={selectedWeekIndices} onSelect={selectWeek} onSelectAll={() => setSelectedWeekIndices(planningCalendar.map((_, index) => index))} />

      <Grid container spacing={2} className="card-grid">
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Required Hours" value={Math.round(selectedRequiredHours)} subtitle="Current" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Scheduled Hours" value={Math.round(selectedScheduledHours)} subtitle="Rostered" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Capability %" value={`${Math.round(selectedCapability * 10) / 10}%`} subtitle="Current" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><KPI title="Variance" value={Math.round(selectedVariance)} subtitle="Base" /></Grid>
      </Grid>

      <Paper className="table-wrap" sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Estimated Trucks ({selectedLabel})</Typography>
        <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
          <Grid item xs={12} sm={6} md={4}><Paper className="kpi-card" sx={{ height: '100%' }}><Typography variant="overline">Estimated Inbound Trucks</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{estimatedInboundTrucks}</Typography><Typography variant="caption">{Math.ceil(stpInboundVolume).toLocaleString()} m3 ÷ {truckVolumeAssumption} m3/truck</Typography></Paper></Grid>
          <Grid item xs={12} sm={6} md={4}><Paper className="kpi-card" sx={{ height: '100%' }}><Typography variant="overline">Estimated Outbound Trucks</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{estimatedOutboundTrucks}</Typography><Typography variant="caption">{Math.ceil(stpOutboundVolume).toLocaleString()} m3 ÷ {truckVolumeAssumption} m3/truck</Typography></Paper></Grid>
        </Grid>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Scenario Inputs ({selectedLabel})</Typography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} md={4}>
            <TextField label="M3 uplift" type="number" fullWidth value={m3Uplift} onChange={event => setM3Uplift(Number(event.target.value || 0))} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Inbound trucks" type="number" fullWidth value={inboundTrucks} onChange={event => setInboundTrucks(Number(event.target.value || 0))} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Outbound trucks" type="number" fullWidth value={outboundTrucks} onChange={event => setOutboundTrucks(Number(event.target.value || 0))} />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Inbound volume adjustment</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: inboundAdjustmentPercent >= 0 ? 'success.main' : 'error.main' }}>
                  {inboundAdjustmentPercent >= 0 ? '+' : ''}{inboundAdjustmentPercent}%
                </Typography>
              </Box>
              <Slider value={inboundAdjustmentPercent} min={-50} max={100} step={1} valueLabelDisplay="auto" onChange={(_, value) => setInboundAdjustmentPercent(value as number)} />
              <Typography variant="caption" color="text.secondary">Adjusts selected STP inbound volume only</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Outbound volume adjustment</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: outboundAdjustmentPercent >= 0 ? 'success.main' : 'error.main' }}>
                  {outboundAdjustmentPercent >= 0 ? '+' : ''}{outboundAdjustmentPercent}%
                </Typography>
              </Box>
              <Slider value={outboundAdjustmentPercent} min={-50} max={100} step={1} valueLabelDisplay="auto" onChange={(_, value) => setOutboundAdjustmentPercent(value as number)} />
              <Typography variant="caption" color="text.secondary">Adjusts selected STP outbound volume only</Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Truck volume assumption: {resourceMapping.truckVolumeM3} m3 per inbound or outbound truck</Typography>
        </Box>

        <Box mt={2} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label={`STP inbound change ${scenario.adjustedStpInboundM3 >= 0 ? '+' : ''}${Math.round(scenario.adjustedStpInboundM3)} m3`} color="primary" variant="outlined" />
          <Chip label={`STP outbound change ${scenario.adjustedStpOutboundM3 >= 0 ? '+' : ''}${Math.round(scenario.adjustedStpOutboundM3)} m3`} color="primary" variant="outlined" />
          <Chip label={`Trucks ${Math.round(scenario.truckInboundM3 + scenario.truckOutboundM3)} m3`} variant="outlined" />
          <Chip label={`Total volume ${Math.round(scenario.adjustedScenarioVolume)} m3`} variant="outlined" />
          <Chip label={`Extra demand ${Math.round(scenario.extraRequiredHours)} hrs`} color="primary" variant="outlined" />
          <Chip label={scenario.needStatus === 'Need' ? `${Math.round(scenario.gap)} hrs need` : `${Math.round(scenario.surplus)} hrs surplus`} color={scenario.needStatus === 'Need' ? 'warning' : 'success'} variant="filled" />
        </Box>
      </Paper>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Current State Panel ({selectedLabel})</Typography>
            <Box mt={2}>
              <Stack spacing={1}>
                <Typography>Required Hours: {Math.round(selectedRequiredHours)}</Typography>
                <Typography>Scheduled Hours: {Math.round(selectedScheduledHours)}</Typography>
                <Typography>Capability %: {`${Math.round(selectedCapability * 10) / 10}%`}</Typography>
                <Typography>Variance: {Math.round(selectedVariance)}</Typography>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Scenario State Panel ({selectedLabel})</Typography>
            <Box mt={2}>
              <Stack spacing={1}>
                <Typography>Required Hours: {Math.round(scenario.scenarioRequiredHours)}</Typography>
                <Typography>Scheduled Hours: {Math.round(scenario.scenarioScheduledHours)}</Typography>
                <Typography>Capability %: {`${Math.round(scenario.scenarioCapability * 10) / 10}%`}</Typography>
                <Typography>Variance: {Math.round(scenario.scenarioVariance)}</Typography>
                <Typography>Status: {scenario.needStatus}</Typography>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box mt={3} className="table-wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Capability Planning Table ({selectedLabel})</Typography>
        <CapabilityTable key={selectedLabel} rows={tableRows} />
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Before Scenario ({selectedLabel})</Typography>
            <TrendChart key={`scenario-before-${selectedLabel}`} data={trendData} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="chart-card">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>After Scenario ({selectedLabel})</Typography>
            <TrendChart key={`scenario-after-${selectedLabel}`} data={trendData.map(item => ({ ...item, requiredHours: Math.round(item.requiredHours + scenario.extraRequiredHours / trendData.length), scheduledHours: item.scheduledHours }))} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
