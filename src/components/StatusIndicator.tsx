import React from 'react';
import { Chip } from '@mui/material';

interface StatusIndicatorProps {
  status: 'Green' | 'Amber' | 'Red' | string;
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const palette: Record<string, string> = {
    Green: '#1b8a5a',
    Amber: '#b98200',
    Red: '#c53535',
    Blue: '#2563eb'
  };
  return <Chip label={status} sx={{ bgcolor: palette[status] || '#607d8b', color: '#fff', fontWeight: 700 }} size="small" />;
}
