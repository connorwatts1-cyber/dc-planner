import React from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';

export type AssignmentPerson = { id: string; name: string; date: string; shift: string; start: string; end: string; hours: number; role: string };

interface RoleAssignmentCardsProps {
  groups: Array<[string, AssignmentPerson[]]>;
  onPersonClick: (person: AssignmentPerson) => void;
  onAddClick: () => void;
  onExportChanges: () => void;
  colourForRole: (role: string) => { accent: string; background: string };
}

export default function RoleAssignmentCards({ groups, onPersonClick, onAddClick, onExportChanges, colourForRole }: RoleAssignmentCardsProps) {
  return <PaperSection groups={groups.filter(([role]) => !['booking', 'banding'].includes(role.toLowerCase().replace(/[^a-z]+/g, '')))} onAddClick={onAddClick} onExportChanges={onExportChanges} colourForRole={colourForRole} onPersonClick={onPersonClick} />;
}

function PaperSection({ groups, onAddClick, onExportChanges, colourForRole, onPersonClick }: RoleAssignmentCardsProps) {
  return <Box className="role-assignment-cards" sx={{ p: 2, bgcolor: '#fff', border: '1px solid #dceaff', borderRadius: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      <Box><Typography variant="h6" fontWeight={800}>Assignments by work role</Typography><Typography variant="body2" color="text.secondary">Click an employee to edit their shift, role, hours, or remove them.</Typography></Box>
      <Stack direction="row" spacing={1} alignItems="center"><Button variant="outlined" size="small" onClick={onExportChanges}>Export changes Excel</Button><Button variant="outlined" onClick={onAddClick} sx={{ minWidth: 38, width: 38, height: 38, fontSize: 22, fontWeight: 800 }} aria-label="Add employee">+</Button><Chip label={`${groups.length} work roles`} variant="outlined" /></Stack>
    </Stack>
    <Grid container spacing={2}>{groups.map(([role, people]) => { const colour = colourForRole(role); const hours = people.reduce((sum, person) => sum + person.hours, 0); return <Grid item xs={12} md={6} lg={4} key={role}><Card variant="outlined" sx={{ height: '100%', borderTop: `5px solid ${colour.accent}`, bgcolor: colour.background, borderRadius: 2 }}><CardContent sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}><Box><Typography variant="subtitle1" fontWeight={800}>{role}</Typography><Typography variant="caption" color="text.secondary">{people.length} people · {hours.toFixed(1)} roster hours</Typography></Box><Chip size="small" label={people.length} sx={{ bgcolor: colour.accent, color: '#fff', fontWeight: 800 }} /></Stack><Stack spacing={1}>{people.map(person => <Box key={person.id} onClick={() => onPersonClick(person)} sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,23,42,0.08)', cursor: 'pointer', '&:hover': { borderColor: colour.accent, boxShadow: `0 0 0 2px ${colour.accent}33` } }}><Stack direction="row" justifyContent="space-between"><Typography variant="body2" fontWeight={700}>{person.name}</Typography><Typography variant="caption" fontWeight={800}>{person.hours.toFixed(1)}h</Typography></Stack><Typography variant="caption" color="text.secondary">{person.shift} · {person.start} - {person.end}</Typography></Box>)}</Stack></CardContent></Card></Grid>; })}</Grid>
  </Box>;
}
