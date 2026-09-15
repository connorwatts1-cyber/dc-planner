import { createTheme, CssBaseline, ThemeProvider, PaletteMode } from '@mui/material';

export const getAppTheme = (mode: PaletteMode = 'light') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#315cf7',
      light: '#dce8ff',
      dark: '#132d86'
    },
    secondary: {
      main: '#7c4dff'
    },
    background: {
      default: mode === 'light' ? '#eef4fb' : '#101826'
    },
    text: {
      primary: mode === 'light' ? '#17324d' : '#eef5ff'
    }
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode === 'light' ? '#eef4fb' : '#101826'
        }
      }
    }
  }
});
