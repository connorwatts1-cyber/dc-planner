import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, mb: 2 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      <Chip label="*Forecasted Information" color="success" variant="outlined" />
    </Box>
  );
}
