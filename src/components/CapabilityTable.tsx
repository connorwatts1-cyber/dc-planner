import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import StatusIndicator from './StatusIndicator';

interface CapabilityTableProps {
  rows: Array<any>;
}

function ceilDisplay(value: unknown): string {
  return String(Math.ceil(Number(value ?? 0)));
}

export default function CapabilityTable({ rows }: CapabilityTableProps) {
  const flowOrder = ['Inbound', 'Outbound'];
  const groups = flowOrder.map(flow => ({
    flow,
    rows: rows.filter(row => row.flow === flow)
  })).filter(group => group.rows.length > 0);
  const otherRows = rows.filter(row => !flowOrder.includes(String(row.flow)));
  if (otherRows.length) groups.push({ flow: 'Other', rows: otherRows });
  const formatVolume = (row: any) => {
    const targetUnit = String(row.targetUnit ?? 'm3/h');
    const unit = targetUnit === 'pallets/h' ? 'pallets' : targetUnit === 'OL/h' ? 'OL' : 'm3';
    return `${Number(row.volume ?? 0).toFixed(1)} ${unit}`;
  };
  const flowTotals = (flowRows: any[]) => {
    const requiredHours = flowRows.reduce((total, row) => total + Number(row.requiredHours ?? 0), 0);
    const productiveHours = flowRows.reduce((total, row) => total + Number(row.scheduledHours ?? 0), 0);
    const variance = productiveHours - requiredHours;
    const capability = requiredHours > 0 ? productiveHours / requiredHours * 100 : 0;
    const status = capability < 90 ? 'Red' : capability > 110 ? 'Blue' : capability >= 100 ? 'Green' : 'Amber';
    return { requiredHours, productiveHours, variance, capability, status };
  };

  return (
    <Box sx={{ width: '100%' }}>
      {groups.map(group => {
        const totals = flowTotals(group.rows);
        return <TableContainer component={Paper} variant="outlined" key={group.flow} sx={{ mb: 1.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell colSpan={9} sx={{ bgcolor: '#edf2f8', color: '#172b55', fontWeight: 800 }}>{group.flow}</TableCell></TableRow>
              <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                {['Role', 'STP Volume', 'Target Rate', 'Required Hours', 'Productive Hours', 'Variance', 'Capability', 'Status', 'Recommendation'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {group.rows.map((row: any) => <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{row.role}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatVolume(row)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{Number(row.targetRate ?? 0).toFixed(2)} {row.targetUnit ?? 'm3/h'}</TableCell>
                <TableCell>{ceilDisplay(row.requiredHours)}</TableCell>
                <TableCell>{ceilDisplay(row.scheduledHours)}</TableCell>
                <TableCell>{ceilDisplay(row.variance)}</TableCell>
                <TableCell>{ceilDisplay(row.capability)}%</TableCell>
                <TableCell><StatusIndicator status={row.status} /></TableCell>
                <TableCell sx={{ minWidth: 210 }}>{row.recommendation}</TableCell>
              </TableRow>)}
              <TableRow sx={{ bgcolor: '#f4f7fb' }}>
                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>{group.flow} Total</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{ceilDisplay(totals.requiredHours)}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{ceilDisplay(totals.productiveHours)}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{ceilDisplay(totals.variance)}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{totals.capability.toFixed(1)}%</TableCell>
                <TableCell><StatusIndicator status={totals.status} /></TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>;
      })}
    </Box>
  );
}
