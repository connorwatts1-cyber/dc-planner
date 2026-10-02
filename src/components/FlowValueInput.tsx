import React, { useEffect, useState } from 'react';
import { TextField } from '@mui/material';

interface FlowValueInputProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}

export default function FlowValueInput({ label, value, onCommit }: FlowValueInputProps) {
  const [draft, setDraft] = useState(value.toFixed(1));
  useEffect(() => setDraft(value.toFixed(1)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(value.toFixed(1));
      return;
    }
    onCommit(parsed);
  };

  return <TextField
    label={label}
    type="text"
    size="small"
    fullWidth
    value={draft}
    onChange={event => setDraft(event.target.value)}
    onBlur={commit}
    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
    inputProps={{ inputMode: 'decimal', 'aria-label': label }}
  />;
}
