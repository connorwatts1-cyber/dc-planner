import React from 'react';
import { Box, Button, Grid, Paper, Typography, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PageHeader from '../components/PageHeader';
import UploadComponent from '../components/UploadComponent';
import { usePlannerContext } from '../context/PlannerContext';
import { exportMetrics } from '../mockData';
import { exportKpiPowerPoint } from '../services/kpiPowerPoint';
import { buildPlanningCapabilityRows, buildPlanningSnapshot } from '../services/analytics';
import { buildStpDemandPlan, stpRoleMappingConfig } from '../services/stpMappingService';
import * as XLSX from 'xlsx';

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
  const { uploadedFiles, roles, resourceMapping } = usePlannerContext();
  const planning = buildPlanningSnapshot(uploadedFiles, roles, 0, resourceMapping);
  const capabilityRows = buildPlanningCapabilityRows(uploadedFiles, roles, 0, resourceMapping) as Array<{ role: string; capability: number; requiredHours: number; scheduledHours: number; variance: number; status: string; targetRate?: number; volume?: number }>;
  const downloadKpi = async () => {
    await exportKpiPowerPoint({ label: 'Current planning week', requiredHours: planning.requiredHours, scheduledHours: planning.scheduledHours, capability: planning.capability, variance: planning.variance }, capabilityRows.map(row => ({
      role: row.role,
      productivityKpi: row.capability,
      actualProductivity: row.scheduledHours > 0 ? Number(row.volume ?? 0) / row.scheduledHours : 0,
      targetProductivity: Number(row.targetRate ?? 0),
      targetHours: row.requiredHours,
      scheduledHours: row.scheduledHours,
      hourVariance: row.variance,
      achievedWeeks: row.capability >= 100 ? 1 : 0,
      volume: Number(row.volume ?? 0),
      status: { label: row.status, color: row.status === 'Red' ? '#c62828' : '#6caf45' }
    })), 'DC_Planner_KPI_Pack.pptx');
  };
  const downloadExecutiveSummary = async () => {
    const pptxgen = (await import('pptxgenjs')).default;
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'DC Planner';
    pptx.title = 'DC Planner Executive Summary';
    const slide = pptx.addSlide();
    slide.background = { color: '102D6E' };
    slide.addText('DC Planner Executive Summary', { x: 0.7, y: 0.8, w: 11.5, h: 0.6, fontSize: 28, bold: true, color: 'FFFFFF' });
    slide.addText('Current planning week', { x: 0.7, y: 1.55, w: 11.5, h: 0.3, fontSize: 15, color: 'DCE7FF' });
    [['Required hours', planning.requiredHours.toFixed(0)], ['Scheduled hours', planning.scheduledHours.toFixed(0)], ['Capability', `${planning.capability.toFixed(1)}%`], ['Gap', planning.gap.toFixed(0)]].forEach(([label, value], index) => {
      const x = 0.7 + index * 3;
      slide.addText(label, { x, y: 2.5, w: 2.5, h: 0.25, fontSize: 11, color: 'DCE7FF' });
      slide.addText(value, { x, y: 2.85, w: 2.5, h: 0.45, fontSize: 24, bold: true, color: 'FFFFFF' });
    });
    slide.addText('Role capability', { x: 0.7, y: 4.1, w: 3, h: 0.3, fontSize: 17, bold: true, color: 'FFFFFF' });
    slide.addTable(capabilityRows.map(row => [row.role, `${row.capability.toFixed(1)}%`, `${row.requiredHours.toFixed(1)}h`, `${row.scheduledHours.toFixed(1)}h`, row.status]) as any, { x: 0.7, y: 4.55, w: 11.6, h: 1.5, color: '172B55', fill: { color: 'FFFFFF' }, fontSize: 11, rowH: 0.3, colW: [3.2, 2, 2, 2, 2] });
    await pptx.writeFile({ fileName: 'DC_Planner_Executive_Summary.pptx' });
  };
  const downloadMip = () => {
    const rows = buildStpDemandPlan(uploadedFiles, stpRoleMappingConfig, roles).roleDemandRows.map(row => ({ Role: row.role, Volume: row.volume, 'Target rate': row.targetRate, Unit: row.targetUnit ?? 'm3/h', 'Required hours': row.requiredHours }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : cards.map(([label, value]) => ({ Metric: label, Value: value })));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MIP');
    XLSX.writeFile(workbook, 'DC_Planner_MIP.xlsx');
  };
  return (
    <Box>
      <PageHeader title="Import / Export" subtitle="Manage source documents and generate planning outputs" />
      <Paper className="table-wrap" sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Required document uploads</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Upload each current source file once. All pages use the stored files from this hub.</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="STP forecast / demand file" accept=".csv,.xlsx,.xls" kind="stp" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="Schedule file (MyTime)" accept=".csv,.xlsx,.xls" kind="schedule" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="MTP workbook" accept=".xlsx,.xls" kind="mtp" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="Absence file (MyTime)" accept=".csv,.xlsx,.xls" kind="absence" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="Paid hours file (MyTime)" accept=".csv,.xlsx,.xls" kind="paid-hours" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="Actual volume file" accept=".csv,.xlsx,.xls" kind="actual-volume" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="Historical M2 volume" accept=".csv,.xlsx,.xls" kind="m2-history" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="LY holiday plan" accept=".csv,.xlsx,.xls" kind="holiday-ly" /></Grid>
          <Grid item xs={12} sm={6} md={4}><UploadComponent title="TY holiday plan" accept=".csv,.xlsx,.xls" kind="holiday-ty" /></Grid>
        </Grid>
      </Paper>
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
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadMip}>Export MIP (Excel)</Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadKpi}>Export KPI pack (PPT)</Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadExecutiveSummary}>Export executive summary (PPT)</Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
