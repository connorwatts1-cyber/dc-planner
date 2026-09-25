import React from 'react';
import { Box, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import PageHeader from '../components/PageHeader';
import { usePlannerContext } from '../context/PlannerContext';
import { getRoleTargetRate, getRoleTargetUnit, stpRoleMappingConfig } from '../services/stpMappingService';

export default function StpMeasuresPage() {
  const { roles, updateRole, resourceMapping, updateResourceMapping } = usePlannerContext();

  const roleForName = (name: string) => roles.find(role =>
    role.role.toLowerCase() === name.toLowerCase()
      || role.translation.toLowerCase() === name.toLowerCase()
      || (name === 'Pick' && role.role.toLowerCase() === 'picking')
      || (name === 'Transit Tipping' && ['transit tip', 'transit tipping'].includes(role.role.toLowerCase()))
  );

  const measureDetail = (measure: string, roleName: string, unit: string) => {
    if (roleName === 'Replens') return 'Actual calculation: Picking order lines × configured Replens percentage. Used for Replens labour demand.';
    const normalized = measure.toLowerCase();
    if (roleName === 'Cycles') return `Actual calculation: ${measure} volume ÷ ${unit} target rate. Used for cycle/orderline capacity and required hours.`;
    if (normalized.includes('picking')) return `Actual calculation: picking m3 ÷ ${unit} target rate. Used for picking required hours and productivity.`;
    if (normalized.includes('replen')) return `Actual calculation: replenishment volume ÷ ${unit} target rate. Used for Replens labour demand.`;
    if (normalized.includes('transit in')) return `Actual calculation: transit inbound m3 ÷ ${unit} target rate. Used for Transit Tipping demand.`;
    if (normalized.includes('in to stock')) return `Actual calculation: DC inbound m3 ÷ ${unit} target rate. Used for DC Tipping demand.`;
    if (normalized.includes('out transit')) return `Actual calculation: transit outbound m3 ÷ ${unit} target rate. Used for Transit Loading demand.`;
    if (normalized.includes('out from stock')) return `Actual calculation: DC outbound m3 ÷ ${unit} target rate. Used for DC Loading demand.`;
    if (normalized.includes('bay clear')) return `Actual calculation: mapped bay-clearing volume ÷ ${unit} target rate. Used for Bayclearing demand.`;
    return `Actual calculation: measure volume ÷ ${unit} target rate. Used for ${roleName} required hours.`;
  };

  const exportMapping = () => {
    const rows = Object.entries(stpRoleMappingConfig).flatMap(([roleName, measures]) => (measures.length ? measures : ['Replens demand (% of Picking OL)']).map(measure => {
      const role = roleForName(roleName);
      const targetUnit = getRoleTargetUnit(roleName);
      const currentRate = getRoleTargetRate(roleName, roles);
      return {
        'STP measure': measure,
        'Mapped role': roleForName(roleName)?.translation ?? roleName,
        'Pallets/hour': role?.palletsPerHour ?? 0,
        'M3/pallet': resourceMapping.m3PerPallet,
        'Target rate': targetUnit === 'm3/h' ? (role?.palletsPerHour ?? 0) * resourceMapping.m3PerPallet : currentRate,
        'Unit': targetUnit,
        'Calculation and planning use': measureDetail(measure, roleName, targetUnit)
      };
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 42 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'STP Mapping');
    XLSX.writeFile(workbook, 'Ficarad_STP_Mapping.xlsx');
  };

  return (
    <Box>
      <PageHeader title="STP Measures" subtitle="Review mapped demand measures and adjust target rates" />
      <Paper className="table-wrap" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField type="number" size="small" label="Global m3/pallet" value={resourceMapping.m3PerPallet} inputProps={{ min: 0.01, step: '0.01' }} onChange={event => { const value = Number(event.target.value); if (!Number.isFinite(value) || value <= 0) return; updateResourceMapping('m3PerPallet', value); roles.forEach(role => { if (getRoleTargetUnit(role.role) === 'm3/h') updateRole(role.id, { m3PerPallet: value, baselineValue: role.palletsPerHour * value }); }); }} />
            <Typography variant="body2" color="text.secondary">Pallet productivity is converted to m3/h using this shared site assumption.</Typography>
          </Stack>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportMapping} sx={{ whiteSpace: 'nowrap' }}>Export Excel</Button>
        </Stack>
        <Grid container spacing={1} sx={{ px: 1, pb: 1, borderBottom: '1px solid #dce3ec' }}>
          <Grid item xs={4}><Typography variant="caption" fontWeight={800}>STP measure</Typography></Grid>
          <Grid item xs={3}><Typography variant="caption" fontWeight={800}>Mapped role</Typography></Grid>
          <Grid item xs={2}><Typography variant="caption" fontWeight={800}>Pallets/hour</Typography></Grid>
          <Grid item xs={2}><Typography variant="caption" fontWeight={800}>Target rate</Typography></Grid>
          <Grid item xs={2}><Typography variant="caption" fontWeight={800}>Adjustment</Typography></Grid>
        </Grid>
        {Object.entries(stpRoleMappingConfig).flatMap(([roleName, measures]) => (measures.length ? measures : ['Replens demand (% of Picking OL)']).map(measure => {
          const role = roleForName(roleName);
          const currentRate = getRoleTargetRate(roleName, roles);
          const targetUnit = getRoleTargetUnit(roleName);
          return (
            <Grid container spacing={1} key={`${roleName}-${measure}`} sx={{ px: 1, py: 1.25, borderBottom: '1px solid #edf1f5', alignItems: 'center' }}>
              <Grid item xs={3}><Typography fontWeight={700}>{measure}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>{measureDetail(measure, roleName, targetUnit)}</Typography></Grid>
              <Grid item xs={2}><Typography>{role?.translation ?? roleName}</Typography></Grid>
              <Grid item xs={2}>{roleName !== 'Replens' ? <TextField type="number" size="small" label="Pallets/h" value={role?.palletsPerHour ?? 0} inputProps={{ min: 0, step: '0.1' }} onChange={event => { if (!role) return; const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0) updateRole(role.id, { palletsPerHour: value, baselineValue: targetUnit === 'm3/h' ? value * resourceMapping.m3PerPallet : role.baselineValue }); }} fullWidth /> : <Typography variant="caption" color="text.secondary">37% of Pick OL</Typography>}</Grid>
              <Grid item xs={2}>
                <TextField
                  type="number"
                  size="small"
                  label={targetUnit}
                  value={currentRate}
                  disabled={false}
                  inputProps={{ min: 0.1, step: '0.1' }}
                  onChange={event => {
                    if (!role) return;
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value > 0) updateRole(role.id, { baselineValue: value, targetRate: value });
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>{roleName === 'Replens' ? <TextField type="number" size="small" label="Pick OL %" value={((role?.demandPercent ?? 0.37) * 100).toFixed(1)} inputProps={{ min: 0, max: 100, step: '0.1' }} onChange={event => { if (!role) return; const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0) updateRole(role.id, { demandPercent: value / 100 }); }} /> : <Typography variant="caption" color="text.secondary">Derived from inputs</Typography>}</Grid>
            </Grid>
          );
        }))}
      </Paper>
    </Box>
  );
}