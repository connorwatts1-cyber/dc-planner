import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, PaletteMode, Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, IconButton, Grid, Container, ButtonBase } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { PlannerProvider, usePlannerContext } from './context/PlannerContext';
import type { RoleScope } from './services/analytics';
import { getAppTheme } from './theme';
import PlanningPage from './pages/PlanningPage';
import FollowUpPage from './pages/FollowUpPage';
import SettingsPage from './pages/SettingsPage';
import ScenarioPage from './pages/ScenarioPage';
import ExportPage from './pages/ExportPage';
import LiveScheduleDashboardPage from './pages/LiveScheduleDashboardPage';

const navigation = [
  { label: 'Planning', path: '/', icon: <FactCheckIcon /> },
  { label: 'Follow Up', path: '/follow-up', icon: <QueryStatsIcon /> },
  { label: 'Scenario Tool', path: '/scenario-tool', icon: <QueryStatsIcon /> },
  { label: 'Live Schedule Dashboard', path: '/live-schedule-dashboard', icon: <CalendarMonthIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { label: 'Export', path: '/export', icon: <DownloadIcon /> }
];

function AppShell() {
  const { themeMode, setThemeMode, roleScope, setRoleScope } = usePlannerContext();
  const location = useLocation();
  const theme = getAppTheme(themeMode);
  const actualMode = themeMode;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Drawer variant="permanent" sx={{ width: 260, flexShrink: 0, '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box', bgcolor: '#172b55', color: '#eefbf5' } }}>
          <Toolbar>
            <WarehouseIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>DC Planner</Typography>
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
                <ButtonBase key={scope} selected={roleScope === scope} onClick={() => setRoleScope(scope)} sx={{ color: '#eefbf5', justifyContent: 'flex-start', px: 1, py: 0.75, borderRadius: 1, textTransform: 'capitalize', bgcolor: roleScope === scope ? '#254598' : 'transparent', '&:hover': { bgcolor: '#203b77' } }}>
                  <Typography variant="body2">{scope === 'non-ops' ? 'Non-Ops' : scope === 'ops' ? 'Ops' : 'Ops + Non-Ops'}</Typography>
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
              <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 800, color: 'text.primary' }}>Distribution Centre Planning</Typography>
              <IconButton onClick={() => setThemeMode(actualMode === 'light' ? 'dark' : 'light')}>
                {actualMode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
              </IconButton>
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Routes>
              <Route path="/" element={<PlanningPage />} />
              <Route path="/follow-up" element={<FollowUpPage />} />
              <Route path="/scenario-tool" element={<ScenarioPage />} />
              <Route path="/live-schedule-dashboard" element={<LiveScheduleDashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/export" element={<ExportPage />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <PlannerProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell />
      </BrowserRouter>
    </PlannerProvider>
  );
}
