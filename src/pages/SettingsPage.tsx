import React from 'react';
import { Box, Grid, Paper, Typography, Stack, TextField, Button, MenuItem, Select, InputLabel, FormControl, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import { usePlannerContext } from '../context/PlannerContext';

export default function SettingsPage() {
  const { roles, updateRole, addRole, deleteRole, resourceMapping, updateResourceMapping, updateShiftDemandProfile, updateMonthlyResourceMapping } = usePlannerContext();
  const profileTotal = Object.values(resourceMapping.shiftDemandProfiles).reduce((total, day) => total + day.AM + day.PM + day.Night, 0);

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Master Configuration" />
      <Paper className="table-wrap" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Baseline Assumptions</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={addRole}>Add Role</Button>
        </Box>
        <Grid container spacing={2}>
          {roles.map(role => (
            <Grid item xs={12} key={role.id} sx={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 1fr) minmax(150px, 180px) 48px', gap: 1, alignItems: 'center', p: 1, borderBottom: '1px solid #e0e7e5' }}>
              <TextField value={role.role} label="Role" onChange={(e) => updateRole(role.id, { role: e.target.value })} fullWidth variant="outlined" size="small" />
              <TextField value={role.translation} label="Role Translation" onChange={(e) => updateRole(role.id, { translation: e.target.value })} fullWidth variant="outlined" size="small" />
              <FormControl size="small">
                <InputLabel>Type</InputLabel>
                <Select value={role.type} label="Type" onChange={(e) => updateRole(role.id, { type: e.target.value as 'Operational' | 'Non-Ops' })}>
                  <MenuItem value="Operational">Operational</MenuItem>
                  <MenuItem value="Non-Ops">Non-Ops</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={() => deleteRole(role.id)} color="error"><DeleteIcon /></IconButton>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper className="table-wrap" sx={{ p: 3, overflowX: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Resource Mapping</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>STP measure mappings and productivity rates are managed on the STP Measures page.</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><TextField label="Absence" type="number" value={resourceMapping.absence} onChange={(e) => updateResourceMapping('absence', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Holiday" type="number" value={resourceMapping.holiday} onChange={(e) => updateResourceMapping('holiday', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Training" type="number" value={resourceMapping.training} onChange={(e) => updateResourceMapping('training', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="FTE" type="number" value={resourceMapping.fte} onChange={(e) => updateResourceMapping('fte', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Leavers" type="number" value={resourceMapping.leavers} onChange={(e) => updateResourceMapping('leavers', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Truck Volume (m3)" type="number" value={resourceMapping.truckVolumeM3} onChange={(e) => updateResourceMapping('truckVolumeM3', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Productivity Target (m3/h)" type="number" value={resourceMapping.productivityTargetM3PerHour} onChange={(e) => updateResourceMapping('productivityTargetM3PerHour', Number(e.target.value))} fullWidth inputProps={{ min: 0.1, step: '0.1' }} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Break per shift (minutes)" type="number" value={resourceMapping.breakMinutesPerShift} onChange={(e) => updateResourceMapping('breakMinutesPerShift', Math.max(Number(e.target.value), 0))} fullWidth inputProps={{ min: 0, step: 5 }} helperText="Deducted once from each scheduled shift when calculating productive scheduled hours." /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Productive hours per shift" type="number" value={resourceMapping.productiveHoursPerShift} onChange={(e) => updateResourceMapping('productiveHoursPerShift', Math.max(Number(e.target.value), 0))} fullWidth inputProps={{ min: 0, step: 0.1 }} helperText="WK38 baseline: 6.5 hours. Caps productive capacity after break and training deductions." /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Direct task availability (%)" type="number" value={(resourceMapping.directTaskAvailability * 100).toFixed(0)} onChange={(e) => updateResourceMapping('directTaskAvailability', Math.min(Math.max(Number(e.target.value) / 100, 0), 1))} fullWidth inputProps={{ min: 0, max: 100, step: 1 }} helperText="Default 90%. Allows for handovers, travel, waiting and task switching within productive shift time." /></Grid>
        </Grid>
        <Typography variant="subtitle2" sx={{ mt: 3 }}>Daily and Shift Demand Profile</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Distributes weekly STP required hours across the operational week. Values are normalized to 100% when calculating capability. Current total: <strong>{(profileTotal * 100).toFixed(1)}%</strong>.</Typography>
        <Box sx={{ minWidth: 680 }}>
          <Grid container spacing={1} sx={{ px: 1, mb: 1 }}>
            {['Day', 'AM %', 'PM %', 'Night %', 'Total %'].map(label => <Grid item xs={label === 'Day' ? 4 : 2} key={label}><Typography variant="caption" fontWeight={800}>{label}</Typography></Grid>)}
          </Grid>
          {Object.entries(resourceMapping.shiftDemandProfiles).map(([day, values]) => {
            const total = values.AM + values.PM + values.Night;
            return <Grid container spacing={1} key={day} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid item xs={4}><Typography fontWeight={700}>{day}</Typography></Grid>
              {(['AM', 'PM', 'Night'] as const).map(shift => <Grid item xs={2} key={shift}><TextField type="number" size="small" value={(values[shift] * 100).toFixed(1)} onChange={event => updateShiftDemandProfile(day, shift, Number(event.target.value) / 100)} inputProps={{ min: 0, step: 0.1 }} fullWidth /></Grid>)}
              <Grid item xs={2}><Typography fontWeight={800}>{(total * 100).toFixed(1)}%</Typography></Grid>
            </Grid>;
          })}
        </Box>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Monthly Mapping</Typography>
        <Box sx={{ minWidth: 980, mt: 1 }}>
          <Grid container spacing={1} sx={{ mb: 1, px: 1 }}>
            {['Month', 'Absence', 'Holiday', 'Training', 'FTE', 'Leavers'].map(label => (
              <Grid item xs={2} key={label}><Typography variant="caption" sx={{ fontWeight: 800 }}>{label}</Typography></Grid>
            ))}
          </Grid>
          {Object.entries(resourceMapping.monthValues || {}).map(([month, values]) => (
            <Grid container spacing={1} key={month} sx={{ mb: 1 }}>
              <Grid item xs={2}><Typography sx={{ pt: 1, fontWeight: 700 }}>{month}</Typography></Grid>
              {(['absence', 'holiday', 'training', 'fte', 'leavers'] as const).map(key => (
                <Grid item xs={2} key={`${month}-${key}`}>
                  <TextField type="number" size="small" value={values?.[key] ?? 0} onChange={event => updateMonthlyResourceMapping(month, key, Number(event.target.value))} fullWidth inputProps={{ step: 'any' }} />
                </Grid>
              ))}
            </Grid>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
