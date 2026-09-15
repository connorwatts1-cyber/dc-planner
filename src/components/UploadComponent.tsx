import React, { ChangeEvent, useRef, useState } from 'react';
import { Button, Stack, Typography, Paper, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { parseUploadedFile } from '../services/fileParser';
import { usePlannerContext } from '../context/PlannerContext';
import { UploadedFileRecord, UploadKind } from '../types';

interface UploadComponentProps {
  title: string;
  accept?: string;
  kind?: UploadKind;
}

export default function UploadComponent({ title, accept = '.csv,.xlsx,.xls,.txt', kind = 'forecast' }: UploadComponentProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { addUploadedFile, clearUploadedFiles } = usePlannerContext();
  const [lastUpload, setLastUpload] = useState<UploadedFileRecord | null>(null);

  const handle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseUploadedFile(file, kind);
      setLastUpload(parsed);
      addUploadedFile(parsed);
      console.log('Parsed:', parsed);
    } catch (error) {
      const fallback: UploadedFileRecord = {
        fileName: file.name,
        kind,
        importedAt: new Date().toISOString(),
        records: [],
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to parse uploaded file.'
      };
      setLastUpload(fallback);
      addUploadedFile(fallback);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderStyle: 'dashed', bgcolor: 'background.paper' }}>
      <Stack spacing={1}>
        <Typography fontWeight={700}>{title}</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button startIcon={<CloudUploadIcon />} variant="contained" sx={{ width: 'fit-content' }} onClick={() => inputRef.current?.click()}>
            Upload
          </Button>
          {kind === 'stp' && (
            <Button variant="outlined" color="warning" sx={{ width: 'fit-content' }} onClick={() => clearUploadedFiles('stp')}>
              Clear STP Cache
            </Button>
          )}
        </Stack>
        <input ref={inputRef} type="file" accept={accept} hidden onChange={handle} />
        {lastUpload && (
          <Alert severity={lastUpload.status === 'parsed' ? 'success' : lastUpload.status === 'error' ? 'error' : 'info'}>
            {lastUpload.fileName} — {lastUpload.message}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
