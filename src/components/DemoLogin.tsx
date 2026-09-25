import React, { FormEvent, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

interface DemoLoginProps {
  onAuthenticated: () => void;
}

const demoUsername = import.meta.env.VITE_DEMO_USERNAME || 'DC390';
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'Doncaster390!';

export default function DemoLogin({ onAuthenticated }: DemoLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (username === demoUsername && password === demoPassword) {
      sessionStorage.setItem('ficarad-demo-authenticated', 'true');
      onAuthenticated();
      return;
    }
    setError(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#eef4fb', p: 2 }}>
      <Paper component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: 3, boxShadow: '0 18px 45px rgba(25,72,140,0.14)' }}>
        <Stack spacing={2}>
          <Box sx={{ textAlign: 'center' }}>
            <LockOutlinedIcon color="primary" sx={{ fontSize: 42 }} />
            <Typography variant="h4" fontWeight={800}>Ficaråd</Typography>
            <Typography color="text.secondary">Where distribution centre planning happens</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">Demo access</Typography>
          {error && <Alert severity="error">Incorrect demo username or password.</Alert>}
          <TextField label="Username" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" fullWidth />
          <TextField label="Password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" fullWidth />
          <Button type="submit" variant="contained" size="large">Sign in</Button>
          <Typography variant="caption" color="text.secondary">Demo credentials: DC390 / Doncaster390!</Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
