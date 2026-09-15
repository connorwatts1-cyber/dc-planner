import React from 'react';
import { Box, Paper } from '@mui/material';
import PageHeader from '../components/PageHeader';

export default function LiveScheduleDashboardPage() {
  return (
    <Box>
      <PageHeader title="Live Schedule Dashboard" subtitle="Embedded schedule view" />

      <Paper elevation={0} sx={{ mt: 2, p: 1, borderRadius: 2, border: '1px solid rgba(0,0,0,0.14)', bgcolor: 'background.paper' }}>
        <Box
          component="iframe"
          title="Live Schedule Dashboard"
          src="https://christopherrichardson-rgb.github.io/Live-schedule-Dashboard/"
          sx={{
            width: '100%',
            minHeight: '760px',
            height: 'calc(100vh - 270px)',
            border: 'none',
            borderRadius: 1,
            display: 'block',
            bgcolor: 'background.paper'
          }}
        />
      </Paper>
    </Box>
  );
}
