import React from 'react';
import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export interface PlanningCalendarWeek {
  week: string;
  label: string;
  req: string;
  sch: string;
  capability: string;
  status: string;
  tone: 'green' | 'blue' | 'orange' | 'purple';
}

export const planningCalendar: PlanningCalendarWeek[] = [
  { week: 'W36', label: 'Sep', req: '5637h', sch: '5550h', capability: '98.5%', status: 'OPTIMAL', tone: 'green' },
  { week: 'W37', label: 'Sep', req: '5096h', sch: '5350h', capability: '105.0%', status: 'OPTIMAL', tone: 'blue' },
  { week: 'W38', label: 'Sep', req: '5333h', sch: '5050h', capability: '94.7%', status: 'OPTIMAL', tone: 'green' },
  { week: 'W39', label: 'Sep', req: '4525h', sch: '5200h', capability: '114.9%', status: 'OVER CAPABILITY', tone: 'orange' },
  { week: 'W40', label: 'Oct', req: '5018h', sch: '5018h', capability: '100.0%', status: 'OPTIMAL', tone: 'purple' },
  { week: 'W41', label: 'Oct', req: '5022h', sch: '5018h', capability: '99.9%', status: 'OPTIMAL', tone: 'purple' },
  { week: 'W42', label: 'Oct', req: '4895h', sch: '4904h', capability: '100.2%', status: 'OPTIMAL', tone: 'purple' },
  { week: 'W43', label: 'Oct', req: '4575h', sch: '4596h', capability: '100.5%', status: 'OPTIMAL', tone: 'purple' }
];

function capabilityStyle(value: number) {
  if (value < 90) return { color: '#c62828', border: '#ef4444', badge: '#fee2e2', label: 'UNDER CAPABILITY' };
  if (value > 110) return { color: '#2563eb', border: '#3b82f6', badge: '#dbeafe', label: 'OVER CAPABILITY' };
  return { color: '#00875a', border: '#00a878', badge: '#d1fae5', label: 'OPTIMAL' };
}

interface WeekCalendarSelectorProps {
  selectedIndices: number[];
  weeks?: PlanningCalendarWeek[];
  onSelect: (index: number, event: React.MouseEvent) => void;
  onSelectAll: () => void;
  indexOffset?: number;
  windowStart?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  canPrevious?: boolean;
  canNext?: boolean;
  fullYearSelected?: boolean;
}

export default function WeekCalendarSelector({ selectedIndices, weeks = planningCalendar, onSelect, onSelectAll, indexOffset = 0, windowStart = 0, onPrevious, onNext, canPrevious = false, canNext = false, fullYearSelected = false }: WeekCalendarSelectorProps) {
  return (
    <Box className="calendar-section" sx={{ mt: 3, mb: 3, background: '#fff', borderRadius: 3, border: '1px solid #dceaff', boxShadow: '0 8px 20px rgba(25,72,140,0.06)', p: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{fullYearSelected ? 'Full-Year Resource Calendar' : '8-Week Resource Calendar'}</Typography>
          <Typography variant="body2" sx={{ color: '#58617a' }}>Weeks {windowStart + 1}-{windowStart + weeks.length} of the available history. Click a week, or hold Ctrl/Cmd to select multiple weeks.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {onPrevious && <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onPrevious} disabled={!canPrevious}>Previous 8</Button>}
          {onNext && <Button variant="outlined" endIcon={<ArrowForwardIcon />} onClick={onNext} disabled={!canNext}>Next 8</Button>}
          <Button variant="contained" className="calendar-button" onClick={onSelectAll}>{fullYearSelected ? 'Return to 8 Weeks' : 'View Full Year'}</Button>
        </Box>
      </Box>
      <Grid container spacing={1.5} className="calendar-grid">
        {weeks.map((item, index) => {
          const globalIndex = index + indexOffset;
          const selected = selectedIndices.includes(globalIndex);
          const capability = Number.parseFloat(item.capability.replace('%', '')) || 0;
          const style = capabilityStyle(capability);
          return (
            <Grid item xs={12} sm={6} md={1.5} key={item.week}>
              <Card
                onClick={event => onSelect(globalIndex, event)}
                sx={{ cursor: 'pointer', border: `2px solid ${selected ? '#102d6e' : style.border}`, borderRadius: 2, boxShadow: selected ? '0 0 0 2px rgba(16,45,110,0.18)' : '0 8px 20px rgba(25,72,140,0.06)' }}
              >
                <CardContent sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.week}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', color: '#58617a', mb: 1 }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Req: {item.req}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Sch: {item.sch}</Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 800, color: style.color }}>{item.capability}</Typography>
                  <Box sx={{ mt: 1, borderTop: '1px solid #dceaff', pt: 1, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: style.color, background: style.badge, borderRadius: 1, py: 0.35, letterSpacing: '0.06em' }}>{style.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
