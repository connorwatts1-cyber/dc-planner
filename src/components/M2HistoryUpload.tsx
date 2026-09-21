import React, { ChangeEvent, useRef, useState } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { parseUploadedFile } from '../services/fileParser';
import { usePlannerContext } from '../context/PlannerContext';
import { UploadedFileRecord } from '../types';

export default function M2HistoryUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { addUploadedFile } = usePlannerContext();
  const [result, setResult] = useState<UploadedFileRecord | null>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const parsed = await Promise.all(files.map(file => parseUploadedFile(file, 'm2-history')));
    const successful = parsed.filter(file => file.status === 'parsed');
    const records = successful.flatMap(file => file.records);
    const aggregate: UploadedFileRecord = {
      fileName: `${successful.length} M2 workbook${successful.length === 1 ? '' : 's'}`,
      kind: 'm2-history',
      importedAt: new Date().toISOString(),
      records,
      status: successful.length ? 'parsed' : 'error',
      message: successful.length
        ? `Loaded ${records.length} weekly record${records.length === 1 ? '' : 's'} from ${successful.length} workbook${successful.length === 1 ? '' : 's'}.`
        : 'No valid M2 productivity workbooks were found.'
    };
    setResult(aggregate);
    addUploadedFile(aggregate);
    event.target.value = '';
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderStyle: 'dashed', bgcolor: 'background.paper' }}>
      <Stack spacing={1}>
        <Typography fontWeight={700}>Historical M2 folder</Typography>
        <Typography variant="body2" color="text.secondary">Select the weekly Excel files together. The latest import replaces the previous M2 history.</Typography>
        <Button startIcon={<CloudUploadIcon />} variant="contained" sx={{ width: 'fit-content' }} onClick={() => inputRef.current?.click()}>Upload M2 files</Button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple hidden onChange={handleUpload} {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>} />
        {result && <Alert severity={result.status === 'parsed' ? 'success' : 'error'}>{result.message}</Alert>}
      </Stack>
    </Paper>
  );
}
