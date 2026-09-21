import React, { useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PageHeader from '../components/PageHeader';
import UploadComponent from '../components/UploadComponent';

interface DailySchedule { day: string; date: string; inboundBooked: number; forecastOutboundLoads: number; bookedOutboundLoads: number; inboundCapability: number; outboundCapability: number; cycleCapability: number; }

const currentWeek: DailySchedule[] = [
  { day: 'Sunday', date: '20 Sep', inboundBooked: 23, forecastOutboundLoads: 25, bookedOutboundLoads: 14, inboundCapability: 82, outboundCapability: 112, cycleCapability: 100 },
  { day: 'Monday', date: '21 Sep', inboundBooked: 43, forecastOutboundLoads: 39, bookedOutboundLoads: 28, inboundCapability: 81, outboundCapability: 79, cycleCapability: 100 },
  { day: 'Tuesday', date: '22 Sep', inboundBooked: 46, forecastOutboundLoads: 38, bookedOutboundLoads: 20, inboundCapability: 76, outboundCapability: 115, cycleCapability: 100 },
  { day: 'Wednesday', date: '23 Sep', inboundBooked: 58, forecastOutboundLoads: 44, bookedOutboundLoads: 28, inboundCapability: 73, outboundCapability: 71, cycleCapability: 100 },
  { day: 'Thursday', date: '24 Sep', inboundBooked: 54, forecastOutboundLoads: 43, bookedOutboundLoads: 28, inboundCapability: 75, outboundCapability: 71, cycleCapability: 100 },
  { day: 'Friday', date: '25 Sep', inboundBooked: 52, forecastOutboundLoads: 44, bookedOutboundLoads: 37, inboundCapability: 82, outboundCapability: 62, cycleCapability: 100 },
  { day: 'Saturday', date: '26 Sep', inboundBooked: 36, forecastOutboundLoads: 33, bookedOutboundLoads: 18, inboundCapability: 84, outboundCapability: 117, cycleCapability: 100 }
];
const nextWeek = currentWeek.map((row, index) => ({ ...row, date: `${27 + index} Sep`, inboundBooked: Math.round(row.inboundBooked * 1.05), forecastOutboundLoads: Math.round(row.forecastOutboundLoads * 1.08), bookedOutboundLoads: Math.round(row.bookedOutboundLoads * 1.04) }));
const capabilityColor = (value: number) => value < 90 ? 'error.main' : value > 110 ? 'info.main' : 'success.main';

export default function LiveScheduleDashboardPage() {
  const [period, setPeriod] = useState<'current' | 'next'>('current');
  const [selectedDay, setSelectedDay] = useState(0);
  const rows = period === 'current' ? currentWeek : nextWeek;
  const selected = rows[selectedDay] ?? rows[0];
  return (
    <Box>
      <PageHeader title="Live Schedule Dashboard" subtitle="Current and next-week daily operational view" />
      <Stack spacing={2}>
        <Paper className="table-wrap" sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}><Box><Typography variant="h6" fontWeight={800}>Daily flow and capability</Typography><Typography variant="body2" color="text.secondary">Select a day to inspect booked volume and resource capability.</Typography></Box><ToggleButtonGroup value={period} exclusive onChange={(_, value) => { if (value) { setPeriod(value); setSelectedDay(0); } }} size="small"><ToggleButton value="current">Current week</ToggleButton><ToggleButton value="next">Next week</ToggleButton></ToggleButtonGroup></Stack></Paper>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><Paper className="kpi-card"><Typography variant="caption">Booked inbound</Typography><Typography variant="h4" fontWeight={800}>{rows.reduce((sum, row) => sum + row.inboundBooked, 0)}</Typography><Typography variant="caption">loads across 7 days</Typography></Paper></Grid>
          <Grid item xs={12} sm={4}><Paper className="kpi-card"><Typography variant="caption">Forecast outbound</Typography><Typography variant="h4" fontWeight={800}>{rows.reduce((sum, row) => sum + row.forecastOutboundLoads, 0)}</Typography><Typography variant="caption">loads across 7 days</Typography></Paper></Grid>
          <Grid item xs={12} sm={4}><Paper className="kpi-card"><Typography variant="caption">Booked outbound</Typography><Typography variant="h4" fontWeight={800}>{rows.reduce((sum, row) => sum + row.bookedOutboundLoads, 0)}</Typography><Typography variant="caption">loads already booked</Typography></Paper></Grid>
        </Grid>
        <Paper className="calendar-section" sx={{ p: 2, overflow: 'hidden' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>Daily schedule calendar</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Choose a day to update the selected-day panel.</Typography>
          <Grid container spacing={1.5}>
            {rows.map((row, index) => <Grid item xs={12} sm={6} md={12 / 7} key={row.day}>
              <Card onClick={() => setSelectedDay(index)} sx={{ cursor: 'pointer', height: '100%', border: `2px solid ${selectedDay === index ? '#102d6e' : capabilityColor(row.inboundCapability)}`, borderRadius: 2, boxShadow: selectedDay === index ? '0 0 0 2px rgba(16,45,110,0.18)' : '0 6px 14px rgba(25,72,140,0.06)' }}>
                <CardContent sx={{ p: 1.25 }}>
                  <Typography variant="subtitle2" fontWeight={800}>{row.day}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{row.date}</Typography>
                  <Typography variant="body2" fontWeight={700}>In: {row.inboundBooked}</Typography>
                  <Typography variant="body2" fontWeight={700}>Out: {row.bookedOutboundLoads}</Typography>
                  <Typography variant="body2" fontWeight={800} color={capabilityColor(row.inboundCapability)} sx={{ mt: 1 }}>In {row.inboundCapability}%</Typography>
                  <Typography variant="body2" fontWeight={800} color={capabilityColor(row.outboundCapability)}>Out {row.outboundCapability}%</Typography>
                </CardContent>
              </Card>
            </Grid>)}
          </Grid>
        </Paper>
        <Grid container spacing={2}><Grid item xs={12} md={7}><Paper className="table-wrap" sx={{ overflowX: 'auto' }}><Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Daily schedule</Typography><Table size="small" sx={{ minWidth: 720 }}><TableHead><TableRow>{['Day', 'Booked inbound', 'Forecast outbound', 'Booked outbound', 'Inbound cap.', 'Outbound cap.', 'Cycles'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map(row => <TableRow key={row.day} hover><TableCell sx={{ fontWeight: 700 }}>{row.day}<Typography variant="caption" display="block" color="text.secondary">{row.date}</Typography></TableCell><TableCell>{row.inboundBooked}</TableCell><TableCell>{row.forecastOutboundLoads}</TableCell><TableCell>{row.bookedOutboundLoads}</TableCell><TableCell sx={{ color: capabilityColor(row.inboundCapability), fontWeight: 800 }}>{row.inboundCapability}%</TableCell><TableCell sx={{ color: capabilityColor(row.outboundCapability), fontWeight: 800 }}>{row.outboundCapability}%</TableCell><TableCell sx={{ color: capabilityColor(row.cycleCapability), fontWeight: 800 }}>{row.cycleCapability}%</TableCell></TableRow>)}</TableBody></Table></Paper></Grid><Grid item xs={12} md={5}><Paper className="chart-card" sx={{ height: '100%' }}><Typography variant="h6" fontWeight={800}>Selected day: {selected.day}</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selected.date}</Typography><Stack spacing={1.5}><Stack direction="row" justifyContent="space-between"><Typography>Booked inbound</Typography><Typography fontWeight={800}>{selected.inboundBooked} loads</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography>Forecast outbound</Typography><Typography fontWeight={800}>{selected.forecastOutboundLoads} loads</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography>Booked outbound</Typography><Typography fontWeight={800}>{selected.bookedOutboundLoads} loads</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography>Inbound capability</Typography><Chip size="small" label={`${selected.inboundCapability}%`} color={selected.inboundCapability < 90 ? 'error' : 'success'} /></Stack><Stack direction="row" justifyContent="space-between"><Typography>Outbound capability</Typography><Chip size="small" label={`${selected.outboundCapability}%`} color={selected.outboundCapability < 90 ? 'error' : 'success'} /></Stack></Stack><Alert severity="info" sx={{ mt: 3 }}>Daily fixture is based on the WK38 workbook. Upload a current schedule file below to replace it with live data.</Alert></Paper></Grid></Grid>
        <Paper className="upload-panel"><Typography variant="h6" fontWeight={800}>Live data upload</Typography><Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}><UploadComponent title="Schedule File (MyTime)" accept=".csv,.xlsx" kind="schedule" /><UploadComponent title="STP forecast file" accept=".csv,.xlsx" kind="stp" /></Stack></Paper>
        <Paper elevation={0} sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(0,0,0,0.14)', bgcolor: 'background.paper' }}>
          <Typography variant="h6" fontWeight={800} sx={{ px: 1, pt: 1 }}>Embedded Live Schedule HTML</Typography>
          <Box component="iframe" title="Embedded Live Schedule Dashboard" src="https://christopherrichardson-rgb.github.io/Live-schedule-Dashboard/" sx={{ width: '100%', minHeight: '760px', height: 'calc(100vh - 270px)', border: 'none', borderRadius: 1, display: 'block', bgcolor: 'background.paper', mt: 1 }} />
        </Paper>
      </Stack>
    </Box>
  );
}
