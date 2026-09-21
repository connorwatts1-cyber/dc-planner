import React from 'react';
import { Card, CardContent, Typography, Stack } from '@mui/material';

interface KPIProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  showCatIcon?: boolean;
}

export default function KPI({ title, value, subtitle, trend, showCatIcon = false }: KPIProps) {
  return (
    <Card className="kpi-card" sx={{ borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.07)', position: 'relative' }}>
      {showCatIcon && <Typography component="span" role="img" aria-label="cat icon" sx={{ position: 'absolute', top: 10, right: 12, fontSize: 24, lineHeight: 1 }}>🐈</Typography>}
      <CardContent>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>{title}</Typography>
          {trend && <Typography variant="caption" sx={{ color: 'primary.main' }}>{trend}</Typography>}
        </Stack>
        <Typography variant="h4" sx={{ mt: 2, fontWeight: 800 }}>{value}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{subtitle}</Typography>}
      </CardContent>
    </Card>
  );
}
