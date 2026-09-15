import React from 'react';
import { Button, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

interface ExportButtonProps {
  label: string;
  type: 'Excel' | 'CSV' | 'PDF';
}

export default function ExportButton({ label, type }: ExportButtonProps) {
  return (
    <Button variant="contained" color="primary" startIcon={<DownloadIcon />} sx={{ px: 3 }} onClick={() => console.log(`Export ${label} as ${type}`)}>
      {label}
    </Button>
  );
}
