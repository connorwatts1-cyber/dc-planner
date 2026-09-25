import DemoLogin from './components/DemoLogin';
import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, PaletteMode, Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, IconButton, Grid, Container, ButtonBase } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import { PlannerProvider, usePlannerContext } from './context/PlannerContext';
import type { DcCdcScope, RoleScope } from './services/analytics';
import { getAppTheme } from './theme';
const PlanningPage = lazy(() => import('./pages/PlanningPage'));
const FollowUpPage = lazy(() => import('./pages/FollowUpPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StpMeasuresPage = lazy(() => import('./pages/StpMeasuresPage'));
const ScenarioPage = lazy(() => import('./pages/ScenarioPage'));
const ExportPage = lazy(() => import('./pages/ExportPage'));
const LiveScheduleDashboardPage = lazy(() => import('./pages/LiveScheduleDashboardPage'));
const KpiDashboardPage = lazy(() => import('./pages/KpiDashboardPage'));
const HeadcountPage = lazy(() => import('./pages/HeadcountPage'));
const HolidayPlanningPage = lazy(() => import('./pages/HolidayPlanningPage'));

const navigation = [
  { label: 'Planning', path: '/', icon: <FactCheckIcon /> },
  { label: 'Follow Up', path: '/follow-up', icon: <QueryStatsIcon /> },
  { label: 'Scenario Tool', path: '/scenario-tool', icon: <QueryStatsIcon /> },
  { label: 'KPI Dashboard', path: '/kpi-dashboard', icon: <QueryStatsIcon /> },
  { label: 'Headcount', path: '/headcount', icon: <QueryStatsIcon /> },
  { label: 'Holiday Planning', path: '/holiday-planning', icon: <BeachAccessIcon /> },
  { label: 'Live Schedule Dashboard', path: '/live-schedule-dashboard', icon: <CalendarMonthIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { label: 'STP Measures', path: '/stp-measures', icon: <TuneIcon /> },
  { label: 'Import / Export', path: '/export', icon: <DownloadIcon /> }
];

function AppShell() {
  const { themeMode, setThemeMode, roleScope, setRoleScope, dcCdcScope, setDcCdcScope } = usePlannerContext();
  const location = useLocation();
  const [logoLoaded, setLogoLoaded] = useState(true);
  const theme = getAppTheme(themeMode);
  const actualMode = themeMode;
  const signOut = () => {
    sessionStorage.removeItem('ficarad-demo-authenticated');
    window.location.reload();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Drawer variant="permanent" sx={{ width: 260, flexShrink: 0, '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box', bgcolor: '#172b55', color: '#eefbf5' } }}>
          <Toolbar sx={{ alignItems: 'center', gap: 1 }}>
            <Box component="img" src={`${import.meta.env.BASE_URL}ficarad-logo.png`} alt="Ficaråd logo" sx={{ width: 38, height: 38, objectFit: 'contain', bgcolor: '#fff', borderRadius: 1 }} onLoad={() => setLogoLoaded(true)} onError={(event: React.SyntheticEvent<HTMLImageElement>) => { setLogoLoaded(false); event.currentTarget.style.display = 'none'; }} />
            {!logoLoaded && <WarehouseIcon sx={{ mr: 0.25 }} />}
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Ficaråd</Typography>
          </Toolbar>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          <List>
            {navigation.map(item => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton component={NavLink} to={item.path} end={item.path === '/'} sx={{ color: '#eefbf5', '&.active': { bgcolor: '#254598' } }}>
                  <ListItemIcon sx={{ color: '#eefbf5', minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="caption" sx={{ color: '#b9c9e8', display: 'block', mb: 1, fontWeight: 700 }}>ROLE SCOPE</Typography>
            <Box sx={{ display: 'grid', gap: 0.75 }}>
              {(['ops', 'non-ops', 'both'] as RoleScope[]).map(scope => (
                <ButtonBase key={scope} onClick={() => setRoleScope(scope)} sx={{ color: '#eefbf5', justifyContent: 'flex-start', px: 1, py: 0.75, borderRadius: 1, textTransform: 'capitalize', bgcolor: roleScope === scope ? '#254598' : 'transparent', '&:hover': { bgcolor: '#203b77' } }}>
                  <Typography variant="body2">{scope === 'non-ops' ? 'Non-Ops' : scope === 'ops' ? 'Ops' : 'Ops + Non-Ops'}</Typography>
                </ButtonBase>
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: '#b9c9e8', display: 'block', mt: 2, mb: 1, fontWeight: 700 }}>DC / CDC</Typography>
            <Box sx={{ display: 'grid', gap: 0.75 }}>
              {(['dc', 'cdc', 'both'] as DcCdcScope[]).map(scope => (
                <ButtonBase key={scope} onClick={() => setDcCdcScope(scope)} sx={{ color: '#eefbf5', justifyContent: 'flex-start', px: 1, py: 0.75, borderRadius: 1, textTransform: 'capitalize', bgcolor: dcCdcScope === scope ? '#254598' : 'transparent', '&:hover': { bgcolor: '#203b77' } }}>
                  <Typography variant="body2">{scope === 'both' ? 'DC + CDC' : scope.toUpperCase()}</Typography>
                </ButtonBase>
              ))}
            </Box>
          </Box>
        </Drawer>

        <Box sx={{ flexGrow: 1 }}>
          {location.pathname === '/live-schedule-dashboard' && (
            <Box className="app-gradient-banner">
              <Typography className="banner-text">Find the people and shifts you need, or upload the latest schedule export for this browse session.</Typography>
            </Box>
          )}
          <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Toolbar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>Ficaråd</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.35 }}>Where distribution centre planning happens</Typography>
              </Box>
              <ButtonBase onClick={signOut} sx={{ mr: 1, px: 1, py: 0.5, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Demo sign out</Typography>
              </ButtonBase>
              <IconButton onClick={() => setThemeMode(actualMode === 'light' ? 'dark' : 'light')}>
                {actualMode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
              </IconButton>
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Suspense fallback={<Typography sx={{ p: 3 }} color="text.secondary">Loading view...</Typography>}>
              <Routes>
                <Route path="/" element={<PlanningPage />} />
                <Route path="/follow-up" element={<FollowUpPage />} />
                <Route path="/scenario-tool" element={<ScenarioPage />} />
                <Route path="/kpi-dashboard" element={<KpiDashboardPage />} />
                <Route path="/headcount" element={<HeadcountPage />} />
                <Route path="/holiday-planning" element={<HolidayPlanningPage />} />
                <Route path="/live-schedule-dashboard" element={<LiveScheduleDashboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/stp-measures" element={<StpMeasuresPage />} />
                <Route path="/export" element={<ExportPage />} />
              </Routes>
            </Suspense>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('ficarad-demo-authenticated') === 'true');

  return (
    <PlannerProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        {authenticated ? <AppShell /> : <DemoLogin onAuthenticated={() => setAuthenticated(true)} />}
      </BrowserRouter>
    </PlannerProvider>
  );
}
