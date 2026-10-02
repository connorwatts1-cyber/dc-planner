import React from 'react';
import { Autocomplete, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

type PlannerPerson = { id: string; name: string; role: string; shift: string; hours: number; date: string; start: string; end: string };

interface RosterAdjustmentsProps {
  people: PlannerPerson[];
  allPeople: PlannerPerson[];
  removedPeople: PlannerPerson[];
  onRemove: (person: PlannerPerson) => void;
  onRestore: (person: PlannerPerson | null) => void;
  onHoursChange: (person: PlannerPerson, hours: number) => void;
  onTimeChange: (person: PlannerPerson, start: string, end: string) => void;
  roles: Array<{ id: string; role: string; translation: string }>;
  onRoleChange: (person: PlannerPerson, role: string) => void;
  open: boolean;
  selectedPerson: PlannerPerson | null;
  onClose: () => void;
  onOpen: () => void;
}

export default function RosterAdjustments({ people, allPeople, removedPeople, onRemove, onRestore, onHoursChange, onTimeChange, roles, onRoleChange, open, selectedPerson, onClose, onOpen }: RosterAdjustmentsProps) {
  return <>
    {open && <Paper className="table-wrap roster-adjustments-overlay" elevation={8} sx={{ p: 2, position: 'fixed', top: 92, right: 24, zIndex: 1400, width: { xs: 'calc(100vw - 32px)', sm: 560 }, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', border: '1px solid #cbd5e1' }}>
      <Typography variant="h6" fontWeight={800}>Roster adjustments</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Search MyTime to add someone, or select a planned employee to adjust their shift or remove them.</Typography>
      <Grid container spacing={1.5}>
        {!selectedPerson && <Grid item xs={12} md={7}><Autocomplete size="small" options={allPeople.filter(person => !people.some(current => current.name === person.name))} getOptionLabel={person => person.name} onChange={(_, person) => onRestore(person)} value={null} componentsProps={{ popper: { sx: { zIndex: 1501 } } }} renderInput={params => <TextField {...params} label="Add from MyTime" />} /></Grid>}
        {selectedPerson && <Grid item xs={12}><Stack spacing={1.5} sx={{ p: 1.5, border: '1px solid #e2e8f0' }}><Typography fontWeight={800}>{selectedPerson.name}</Typography><Grid container spacing={1.5}><Grid item xs={12} sm={5}><TextField select size="small" fullWidth label="Work role" value={selectedPerson.role} onChange={event => onRoleChange(selectedPerson, event.target.value)}>{roles.map(role => <MenuItem key={role.id} value={role.role}>{role.translation}</MenuItem>)}</TextField></Grid><Grid item xs={6} sm={2.5}><TextField size="small" fullWidth type="time" label="Start" value={selectedPerson.start.match(/\d{2}:\d{2}/)?.[0] ?? ''} onChange={event => onTimeChange(selectedPerson, event.target.value, selectedPerson.end.match(/\d{2}:\d{2}/)?.[0] ?? '')} InputLabelProps={{ shrink: true }} /></Grid><Grid item xs={6} sm={2.5}><TextField size="small" fullWidth type="time" label="Finish" value={selectedPerson.end.match(/\d{2}:\d{2}/)?.[0] ?? ''} onChange={event => onTimeChange(selectedPerson, selectedPerson.start.match(/\d{2}:\d{2}/)?.[0] ?? '', event.target.value)} InputLabelProps={{ shrink: true }} /></Grid><Grid item xs={6} sm={2}><TextField size="small" fullWidth type="number" label="Hours" value={selectedPerson.hours} onChange={event => onHoursChange(selectedPerson, Math.max(Number(event.target.value) || 0, 0))} inputProps={{ min: 0, step: 0.5 }} /></Grid></Grid><Stack direction="row" spacing={1} justifyContent="flex-end"><Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onRemove(selectedPerson)}>Remove</Button><Button size="small" onClick={onClose}>Close</Button></Stack></Stack></Grid>}
      </Grid>
    </Paper>}
  </>;
}
