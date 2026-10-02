import React, { useState } from 'react';
import { Autocomplete, Button, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type MovePerson = { id: string; name: string; role: string; shift: string; hours: number };
type MoveRecommendation = { key: string; from: string; to: string; people: MovePerson[] };

interface MoveQueuePopoverProps {
  moves: MoveRecommendation[];
  selectedPeople: Record<string, string>;
  onSelectPerson: (key: string, personId: string) => void;
  onMove: (move: MoveRecommendation) => void;
  onMoveAll: () => void;
}

export default function MoveQueuePopover({ moves, selectedPeople, onSelectPerson, onMove, onMoveAll }: MoveQueuePopoverProps) {
  const [open, setOpen] = useState(false);
  if (!moves.length && !open) return null;

  return <>
    <Button variant={open ? 'outlined' : 'contained'} onClick={() => setOpen(current => !current)} sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1200, boxShadow: 3 }}>
      {open ? 'Close move planner' : `Review ${moves.length} recommended move${moves.length === 1 ? '' : 's'}`}
    </Button>
    {open && <Paper elevation={8} sx={{ position: 'fixed', right: 24, bottom: 82, zIndex: 1199, width: { xs: 'calc(100vw - 32px)', sm: 520 }, maxHeight: '70vh', overflowY: 'auto', p: 2, border: '1px solid #cbd5e1' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <BoxTitle moves={moves} />
        <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close move planner"><CloseIcon /></IconButton>
      </Stack>
      <Stack spacing={1.5}>
        {moves.map(move => <Stack key={move.key} spacing={0.75} sx={{ p: 1.25, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Typography variant="body2" fontWeight={800}>{move.from} to {move.to}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Autocomplete size="small" options={move.people} getOptionLabel={person => `${person.name} · ${person.role} · ${person.shift}`} value={move.people.find(person => person.id === selectedPeople[move.key]) ?? move.people[0] ?? null} onChange={(_, person) => onSelectPerson(move.key, person?.id ?? '')} renderInput={params => <TextField {...params} label="Scheduled employee" />} sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" onClick={() => onMove(move)}>Move</Button>
          </Stack>
        </Stack>)}
        <Button variant="contained" onClick={onMoveAll}>Do all recommended moves</Button>
      </Stack>
    </Paper>}
  </>;
}

function BoxTitle({ moves }: { moves: MoveRecommendation[] }) {
  return <div><Typography variant="h6" fontWeight={800}>Recommended moves</Typography><Typography variant="caption" color="text.secondary">{moves.length} scheduled employee move{moves.length === 1 ? '' : 's'} available</Typography></div>;
}
