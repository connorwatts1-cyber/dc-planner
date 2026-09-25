import React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';
import StatusIndicator from './StatusIndicator';

interface CapabilityTableProps {
  rows: Array<any>;
}

function ceilDisplay(value: unknown): string {
  return String(Math.ceil(Number(value ?? 0)));
}

export default function CapabilityTable({ rows }: CapabilityTableProps) {
  const columns: GridColDef[] = [
    { field: 'role', headerName: 'Role', flex: 1, minWidth: 140 },
    {
      field: 'volume',
      headerName: 'STP Volume (m3)',
      flex: 1,
      minWidth: 140,
      renderCell: params => <Typography>{Number(params.value ?? 0).toFixed(1)}</Typography>
    },
    {
      field: 'targetRate',
      headerName: 'Target Rate',
      flex: 1,
      minWidth: 150,
      renderCell: params => <Typography>{Number(params.value ?? 0).toFixed(1)} {(params.row as { targetUnit?: string }).targetUnit ?? 'm3/h'}</Typography>
    },
    {
      field: 'requiredHours',
      headerName: 'Target Hours',
      flex: 1,
      minWidth: 130,
      renderCell: params => <Typography>{ceilDisplay(params.value)}</Typography>
    },
    {
      field: 'scheduledHours',
      headerName: 'Scheduled Hours',
      flex: 1,
      minWidth: 140,
      renderCell: params => <Typography>{ceilDisplay(params.value)}</Typography>
    },
    {
      field: 'variance',
      headerName: 'Variance',
      flex: 1,
      minWidth: 110,
      renderCell: params => <Typography>{ceilDisplay(params.value)}</Typography>
    },
    {
      field: 'capability',
      headerName: 'Capability %',
      flex: 1,
      minWidth: 130,
      renderCell: params => <Typography>{ceilDisplay(params.value)}</Typography>
    },
    {
      field: 'status',
      headerName: 'Status Indicator',
      flex: 1,
      minWidth: 160,
      renderCell: params => <StatusIndicator status={params.value} />
    },
    { field: 'recommendation', headerName: 'Recommendation', flex: 1.2, minWidth: 210 }
  ];

  return (
    <Box sx={{ height: 320, width: '100%' }}>
      <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick autoHeight={false} density="compact" />
    </Box>
  );
}
