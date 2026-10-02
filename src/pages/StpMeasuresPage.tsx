import React from 'react';
import { Box, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import PageHeader from '../components/PageHeader';
import { usePlannerContext } from '../context/PlannerContext';
import { getRoleTargetRate, getRoleTargetUnit, stpDemandTasks } from '../services/stpMappingService';

export default function StpMeasuresPage() {
  const { roles, updateRole, resourceMapping, updateResourceMapping } = usePlannerContext();

  const roleForName = (name: string) => roles.find(role =>
    role.role.toLowerCase() === name.toLowerCase()
      || role.translation.toLowerCase() === name.toLowerCase()
      || (name === 'Pick' && role.role.toLowerCase() === 'picking')
      || (name === 'Booking' && role.role.toLowerCase() === 'booking')
      || (name === 'Transit Tipping' && ['transit tip', 'transit tipping'].includes(role.role.toLowerCase()))
  );

  const taskShare = (roleName: string, defaultShare: number) => ['Replens', 'Banding'].includes(roleName)
    ? roleForName(roleName)?.demandPercent ?? defaultShare
    : defaultShare;
  const roundRate = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  const exportMapping = () => {
    const rows = stpDemandTasks.map(task => {
      const role = roleForName(task.role);
      const targetUnit = getRoleTargetUnit(task.role);
      return {
        Flow: task.flow,
        Task: task.role,
        'STP measure': task.measure,
        'Source share': `${(taskShare(task.role, task.share) * 100).toFixed(1)}%`,
        'Mapped role': role?.translation ?? task.role,
        'Pallets/hour': task.rateSetting ? resourceMapping[task.rateSetting] : role?.palletsPerHour ?? 0,
        'M3/pallet': resourceMapping.m3PerPallet,
        'Target rate': task.rateSetting ? resourceMapping[task.rateSetting] : getRoleTargetRate(task.role, roles),
        Unit: targetUnit,
        'Calculation and planning use': `${Math.round(taskShare(task.role, task.share) * 1000) / 10}% of ${task.measure}${task.rateSetting ? ` ÷ ${resourceMapping.m3PerPallet} m3/pallet` : ''} ÷ ${task.rateSetting ? resourceMapping[task.rateSetting] : getRoleTargetRate(task.role, roles)} ${targetUnit}.`
      };
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 40 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 85 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'STP Mapping');
    XLSX.writeFile(workbook, 'Ficarad_STP_Mapping.xlsx');
  };

  return (
    <Box>
      <PageHeader title="STP Measures" subtitle="Review mapped demand measures and adjust target rates" />
      <Paper className="table-wrap" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField type="number" size="small" label="Global m3/pallet" value={roundRate(resourceMapping.m3PerPallet).toFixed(2)} inputProps={{ min: 0.01, step: '0.01' }} onChange={event => { const value = Number(event.target.value); if (!Number.isFinite(value) || value <= 0) return; const m3PerPallet = roundRate(value); updateResourceMapping('m3PerPallet', m3PerPallet); roles.forEach(role => { if (getRoleTargetUnit(role.role) !== 'm3/h' || role.baselineValue <= 0) return; const palletsPerHour = roundRate(role.palletsPerHour > 0 ? role.palletsPerHour : role.baselineValue / Math.max(resourceMapping.m3PerPallet, 0.01)); const targetRate = roundRate(palletsPerHour * m3PerPallet); updateRole(role.id, { palletsPerHour, m3PerPallet, baselineValue: targetRate, targetRate }); }); }} />
            <Typography variant="body2" color="text.secondary">Pallet productivity is converted to m3/h using this shared site assumption.</Typography>
          </Stack>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportMapping} sx={{ whiteSpace: 'nowrap' }}>Export Excel</Button>
        </Stack>
        {(['Inbound', 'Outbound'] as const).map(flow => <Box key={flow}>
          <Typography variant="subtitle2" sx={{ px: 1, py: 1, mt: 1, bgcolor: '#edf2f8', fontWeight: 800 }}>{flow}</Typography>
          {stpDemandTasks.filter(task => task.flow === flow).map(task => {
            const role = roleForName(task.role);
            const currentRate = task.rateSetting ? resourceMapping[task.rateSetting] : getRoleTargetRate(task.role, roles);
            const targetUnit = task.targetUnit ?? getRoleTargetUnit(task.role);
            return <Grid container spacing={1} key={`${flow}-${task.role}-${task.measure}`} sx={{ px: 1, py: 1.25, borderBottom: '1px solid #edf1f5', alignItems: 'center' }}>
              <Grid item xs={3}><Typography fontWeight={700}>{task.id === 'transit-bayclear' ? 'Transit Bayclear' : task.id === 'dc-bayclear' ? 'DC Bayclear' : task.role}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>{task.measure} × {(taskShare(task.role, task.share) * 100).toFixed(1)}%{task.rateSetting ? ` ÷ ${resourceMapping.m3PerPallet} m3/pallet` : targetUnit === 'm3/h' ? ` • Pallets/h × ${resourceMapping.m3PerPallet} m3/pallet = m3/h` : ''} ÷ target rate</Typography></Grid>
              <Grid item xs={2}><Typography>{role?.translation ?? task.role}</Typography></Grid>
              <Grid item xs={2}>{targetUnit === 'm3/h' || task.rateSetting ? <TextField type="number" size="small" label="Pallets/h" value={roundRate(task.rateSetting ? resourceMapping[task.rateSetting] : role?.palletsPerHour && role.palletsPerHour > 0 ? role.palletsPerHour : currentRate / Math.max(resourceMapping.m3PerPallet, 0.01)).toFixed(2)} inputProps={{ min: 0.1, step: '0.01' }} onChange={event => { const value = Number(event.target.value); if (!Number.isFinite(value) || value <= 0) return; const palletsPerHour = roundRate(value); if (task.rateSetting) updateResourceMapping(task.rateSetting, palletsPerHour); else if (role) { const targetRate = roundRate(palletsPerHour * resourceMapping.m3PerPallet); updateRole(role.id, { palletsPerHour, m3PerPallet: resourceMapping.m3PerPallet, baselineValue: targetRate, targetRate }); } }} fullWidth /> : <Typography variant="body2" color="text.secondary">—</Typography>}</Grid>
              <Grid item xs={2}><TextField type="number" size="small" label={targetUnit} value={roundRate(currentRate).toFixed(2)} inputProps={{ min: 0.1, step: '0.01' }} onChange={event => { const value = Number(event.target.value); if (!Number.isFinite(value) || value <= 0) return; const targetRate = roundRate(value); if (task.rateSetting) updateResourceMapping(task.rateSetting, targetRate); else if (role) { const updates = targetUnit === 'm3/h' ? { baselineValue: targetRate, targetRate, m3PerPallet: resourceMapping.m3PerPallet, palletsPerHour: roundRate(targetRate / Math.max(resourceMapping.m3PerPallet, 0.01)) } : { baselineValue: targetRate, targetRate }; updateRole(role.id, updates); } }} fullWidth /></Grid>
              <Grid item xs={2}>{['Replens', 'Banding'].includes(task.role) ? <TextField type="number" size="small" label={task.role === 'Replens' ? 'Pick OL %' : 'DC In %'} value={((role?.demandPercent ?? task.share) * 100).toFixed(1)} inputProps={{ min: 0, max: 100, step: '0.1' }} onChange={event => { if (!role) return; const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0) updateRole(role.id, { demandPercent: value / 100 }); }} fullWidth /> : <Typography variant="body2">{(task.share * 100).toFixed(0)}%</Typography>}</Grid>
            </Grid>;
          })}
        </Box>)}
      </Paper>
    </Box>
  );
}