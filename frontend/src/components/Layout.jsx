import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Panel Maestro', icon: <DashboardRoundedIcon />, path: '/' },
];

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Logo / Brand */}
      <Box
        sx={{
          px: 2.5,
          py: 3,
          background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <AdminPanelSettingsRoundedIcon sx={{ color: '#FFF', fontSize: 28 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ color: '#FFF', fontWeight: 800, lineHeight: 1.2 }}>
            Panel Maestro
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
            Huevos Point SaaS
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navegación */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive ? 'rgba(21, 101, 192, 0.12)' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': { backgroundColor: 'rgba(21, 101, 192, 0.08)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, fontSize: '0.9rem' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Usuario en el footer del sidebar */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {user?.fullName?.charAt(0)?.toUpperCase() || 'S'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, truncate: true }} noWrap>
              {user?.fullName || user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Superadmin
            </Typography>
          </Box>
          <Tooltip title="Cerrar sesión">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar — solo en mobile */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              aria-label="Abrir menú"
            >
              <MenuRoundedIcon />
            </IconButton>
            <AdminPanelSettingsRoundedIcon sx={{ ml: 1, mr: 1 }} />
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
              Panel Maestro
            </Typography>
            <Tooltip title={user?.fullName || user?.username}>
              <IconButton onClick={handleMenuOpen} size="small" aria-label="Menú de usuario">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'S'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user?.fullName || user?.username}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutRoundedIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
                <Typography color="error">Cerrar sesión</Typography>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar — permanente en desktop, drawer en mobile */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(0,0,0,0.08)',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          mt: { xs: 8, md: 0 }, // compensar AppBar en mobile
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: '100%',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}