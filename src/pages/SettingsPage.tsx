import React from 'react';
import { Box, Grid, Paper, Typography, Stack, TextField, Button, MenuItem, Select, InputLabel, FormControl, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../components/PageHeader';
import { usePlannerContext } from '../context/PlannerContext';

export default function SettingsPage() {
  const { roles, updateRole, addRole, deleteRole, resourceMapping, updateResourceMapping, updateMonthlyResourceMapping } = usePlannerContext();

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
            <Grid item xs={12} key={role.id} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: 1, alignItems: 'center', p: 1, borderBottom: '1px solid #e0e7e5' }}>
              <TextField value={role.role} label="Role" onChange={(e) => updateRole(role.id, { role: e.target.value })} fullWidth variant="outlined" size="small" />
              <TextField value={role.translation} label="Role Translation" onChange={(e) => updateRole(role.id, { translation: e.target.value })} fullWidth variant="outlined" size="small" />
              <TextField type="number" value={role.palletsPerHour} label="Pallets/Hour" onChange={(e) => updateRole(role.id, { palletsPerHour: Number(e.target.value) })} fullWidth variant="outlined" size="small" />
              <TextField type="number" value={role.m3PerPallet} label="M3/Pallet" onChange={(e) => updateRole(role.id, { m3PerPallet: Number(e.target.value) })} fullWidth variant="outlined" size="small" />
              <TextField type="number" value={role.targetRate ?? ''} label="Target Rate (m3/h)" onChange={(e) => updateRole(role.id, { targetRate: Number(e.target.value) })} fullWidth variant="outlined" size="small" />
              <TextField type="number" value={role.baselineValue} label="Baseline" onChange={(e) => updateRole(role.id, { baselineValue: Number(e.target.value) })} fullWidth variant="outlined" size="small" />
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
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><TextField label="Absence" type="number" value={resourceMapping.absence} onChange={(e) => updateResourceMapping('absence', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Holiday" type="number" value={resourceMapping.holiday} onChange={(e) => updateResourceMapping('holiday', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Training" type="number" value={resourceMapping.training} onChange={(e) => updateResourceMapping('training', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="FTE" type="number" value={resourceMapping.fte} onChange={(e) => updateResourceMapping('fte', Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Leavers" type="number" value={resourceMapping.leavers} onChange={(e) => updateResourceMapping('leavers', Number(e.target.value))} fullWidth /></Grid>
        </Grid>
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
