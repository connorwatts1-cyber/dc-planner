import React from 'react';
import { Box, Grid, Paper, Typography, Stack } from '@mui/material';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { exportMetrics } from '../mockData';

const cards = [
  ['Total Worked Hours', exportMetrics.totalWorkedHours],
  ['Uninfluencable Hours', exportMetrics.uninfluencableHours],
  ['Paid Absence', exportMetrics.paidAbsence],
  ['Holiday Hours', exportMetrics.holidayHours],
  ['Sickness Hours', exportMetrics.sicknessHours],
  ['Other Absence Hours', exportMetrics.otherAbsenceHours],
  ['Operational Hours', exportMetrics.operationalHours],
  ['DC Hours Excluding Transit', exportMetrics.dcHoursExcludingTransit],
  ['DC Hours Including Transit', exportMetrics.dcHoursIncludingTransit],
  ['Transit Hours', exportMetrics.transitHours],
  ['Picking Hours', exportMetrics.pickingHours],
  ['Un-Productive Hours', exportMetrics.unproductiveHours],
  ['Support Hours', exportMetrics.supportHours],
  ['Agency Hours', exportMetrics.agencyHours],
  ['Non-Operational Hours', exportMetrics.nonOperationalHours],
  ['Development & Training Hours', exportMetrics.developmentTrainingHours]
];

export default function ExportPage() {
  return (
    <Box>
      <PageHeader title="Export" subtitle="Generate Outputs" />
      <Paper className="table-wrap" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>MiP Information</Typography>
        <Grid container spacing={2} mt={1}>
          {cards.map(([label, value]) => (
            <Grid item xs={12} sm={6} md={3} key={label}>
              <Paper className="kpi-card" sx={{ height: '100%' }}>
                <Typography variant="overline" color="text.secondary">{label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>{value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box mt={4}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>Export Functions</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <ExportButton label="Export to Excel" type="Excel" />
            <ExportButton label="Export to CSV" type="CSV" />
            <ExportButton label="Export to PDF" type="PDF" />
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
