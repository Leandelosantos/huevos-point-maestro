import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Button,
  Divider,
  Alert,
  Tooltip,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Switch,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import dayjs from 'dayjs';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

// Polling de métricas del día cada 60 segundos
const POLLING_INTERVAL_MS = 60 * 1000;

export default function TenantDetailPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [todayMetrics, setTodayMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayLoading, setTodayLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [enterLoading, setEnterLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const pollingRef = useRef(null);

  // Estado del modal "Nuevo usuario"
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    fullName: '', username: '', password: '', role: 'employee', email: '',
  });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [togglingUsers, setTogglingUsers] = useState({});

  const handleCreateUser = async () => {
    if (!createUserForm.fullName.trim() || !createUserForm.username.trim() || !createUserForm.password) return;
    setCreateUserLoading(true);
    setCreateUserError('');
    try {
      await api.post(`/tenants/${tenantId}/users`, {
        fullName: createUserForm.fullName,
        username: createUserForm.username,
        password: createUserForm.password,
        role: createUserForm.role,
        ...(createUserForm.email.trim() ? { email: createUserForm.email.trim() } : {}),
      });
      setCreateUserOpen(false);
      setCreateUserForm({ fullName: '', username: '', password: '', role: 'employee', email: '' });
      fetchDetail();
    } catch (err) {
      setCreateUserError(err.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleToggleUserActive = async (userId, currentIsActive) => {
    setTogglingUsers((prev) => ({ ...prev, [userId]: true }));
    // Actualización optimista
    setDetail((prev) => ({
      ...prev,
      users: prev.users.map((u) => u.id === userId ? { ...u, isActive: !currentIsActive } : u),
    }));
    try {
      await api.patch(`/tenants/${tenantId}/users/${userId}/active`);
    } catch {
      // Revertir si falla
      setDetail((prev) => ({
        ...prev,
        users: prev.users.map((u) => u.id === userId ? { ...u, isActive: currentIsActive } : u),
      }));
    } finally {
      setTogglingUsers((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Cargar detalle completo del tenant
  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/tenants/${tenantId}`);
      setDetail(data.data);
    } catch {
      setError('Error al cargar el detalle de la sucursal');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Cargar solo métricas del día (más liviano, para polling)
  const fetchToday = useCallback(async () => {
    try {
      setTodayLoading(true);
      const { data } = await api.get(`/tenants/${tenantId}/today`);
      setTodayMetrics(data.data);
    } catch {
      // No mostrar error por polling fallido, los datos del detalle ya existen
    } finally {
      setTodayLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDetail();
    fetchToday();

    // Polling automático de métricas del día
    pollingRef.current = setInterval(fetchToday, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchDetail, fetchToday]);

  // Ingresar al dashboard del tenant en la app de negocios
  const handleEnter = async () => {
    setEnterLoading(true);
    try {
      const { data } = await api.get(`/tenants/${tenantId}/access-token`);
      window.open(data.data.redirectUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Error al generar el acceso. Intentá de nuevo.');
    } finally {
      setEnterLoading(false);
    }
  };

  // Suspender tenant
  const handleSuspend = async () => {
    if (!window.confirm(`¿Seguro que querés suspender "${detail?.tenant?.name}"?`)) return;
    setActionLoading(true);
    try {
      await api.post(`/tenants/${tenantId}/suspend`);
      setSuccessMsg('Sucursal suspendida correctamente');
      fetchDetail();
    } catch {
      setError('Error al suspender la sucursal');
    } finally {
      setActionLoading(false);
    }
  };

  // Reactivar tenant
  const handleReactivate = async () => {
    if (!window.confirm(`¿Reactivar "${detail?.tenant?.name}"?`)) return;
    setActionLoading(true);
    try {
      await api.post(`/tenants/${tenantId}/reactivate`);
      setSuccessMsg('Sucursal reactivada correctamente');
      fetchDetail();
    } catch {
      setError('Error al reactivar la sucursal');
    } finally {
      setActionLoading(false);
    }
  };

  const tenant = detail?.tenant;
  const isActive = tenant?.isActive;
  const businessId = tenant?.businessId;

  // Usar métricas del día del polling si están disponibles, sino las del detalle
  const salesToday = todayMetrics?.totalVentasHoy ?? detail?.totalSalesToday ?? 0;
  const expensesToday = todayMetrics?.totalEgresosHoy ?? detail?.totalExpensesToday ?? 0;
  const netToday = todayMetrics?.netoCajaHoy ?? detail?.netBalanceToday ?? 0;
  const salesCount = todayMetrics?.cantidadVentas ?? 0;

  const metricCardsHoy = [
    {
      label: 'Ventas hoy',
      value: formatCurrency(salesToday),
      icon: <TrendingUpRoundedIcon />,
      bgGradient: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
      iconBg: '#2D6A4F',
      color: '#1B4332',
    },
    {
      label: 'Egresos hoy',
      value: formatCurrency(expensesToday),
      icon: <TrendingDownRoundedIcon />,
      bgGradient: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
      iconBg: '#C62828',
      color: '#B71C1C',
    },
    {
      label: 'Neto caja hoy',
      value: formatCurrency(netToday),
      icon: <AccountBalanceWalletRoundedIcon />,
      bgGradient: netToday >= 0
        ? 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)'
        : 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      iconBg: netToday >= 0 ? '#1565C0' : '#E65100',
      color: netToday >= 0 ? '#0D47A1' : '#BF360C',
    },
    {
      label: 'Transacciones hoy',
      value: salesCount,
      icon: <TodayRoundedIcon />,
      bgGradient: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
      iconBg: '#7B1FA2',
      color: '#4A148C',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => businessId ? navigate(`/businesses/${businessId}`) : navigate('/')}
          sx={{ color: 'text.secondary', mb: 1.5, textTransform: 'none', fontWeight: 500 }}
        >
          {businessId ? 'Volver al negocio' : 'Volver al panel'}
        </Button>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {loading ? (
              <Skeleton width={220} height={48} />
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {tenant?.name}
                </Typography>
                <Chip
                  label={isActive ? 'Activa' : 'Suspendida'}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    backgroundColor: isActive ? 'rgba(45, 106, 79, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                    color: isActive ? '#2D6A4F' : '#C62828',
                  }}
                />
              </>
            )}
          </Box>

          {/* Botones de acción */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Tooltip title="Actualizar métricas del día">
              <IconButton onClick={fetchToday} disabled={todayLoading} size="small" aria-label="Actualizar métricas">
                {todayLoading ? <CircularProgress size={18} /> : <RefreshRoundedIcon />}
              </IconButton>
            </Tooltip>

            {!loading && isActive && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleSuspend}
                disabled={actionLoading}
              >
                Suspender
              </Button>
            )}
            {!loading && !isActive && (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={handleReactivate}
                disabled={actionLoading}
              >
                Reactivar
              </Button>
            )}
            {!loading && isActive && (
              <Button
                variant="contained"
                startIcon={enterLoading ? <CircularProgress size={16} color="inherit" /> : <LaunchRoundedIcon />}
                onClick={handleEnter}
                disabled={enterLoading}
                size="small"
              >
                Ingresar a la sucursal
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Alertas */}
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      {/* Métricas del día */}
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 700 }}>
        Métricas de hoy — {dayjs().format('DD/MM/YYYY')}
        {todayLoading && <CircularProgress size={12} sx={{ ml: 1 }} />}
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCardsHoy.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card sx={{ background: card.bgGradient, border: 'none', position: 'relative', overflow: 'hidden' }}>
              <Box
                sx={{
                  position: 'absolute', top: -20, right: -20,
                  width: 90, height: 90, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
                }}
              />
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: card.color, fontWeight: 600, mb: 1, opacity: 0.8 }}>
                      {card.label}
                    </Typography>
                    {loading ? (
                      <Skeleton width={90} height={36} />
                    ) : (
                      <Typography variant="h5" sx={{ color: card.color, fontWeight: 800 }}>
                        {typeof card.value === 'number' ? card.value : card.value}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: '12px',
                      backgroundColor: card.iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFF', flexShrink: 0, position: 'relative', zIndex: 1,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Métricas 30 días */}
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 700 }}>
        Últimos 30 días
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Ventas', value: formatCurrency(detail?.totalSales30d ?? 0), color: '#2D6A4F' },
          { label: 'Egresos', value: formatCurrency(detail?.totalExpenses30d ?? 0), color: '#C62828' },
          { label: 'Balance neto', value: formatCurrency(detail?.netBalance30d ?? 0), color: (detail?.netBalance30d ?? 0) >= 0 ? '#1565C0' : '#C62828' },
        ].map((item) => (
          <Grid item xs={12} sm={4} key={item.label}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{item.label}</Typography>
                {loading ? <Skeleton width={120} height={32} /> : (
                  <Typography variant="h6" sx={{ fontWeight: 700, color: item.color }}>{item.value}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla de usuarios */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Usuarios de la sucursal
            </Typography>
            {!loading && (
              <Chip label={detail?.users?.length || 0} size="small" color="primary" variant="outlined" />
            )}
            <Box sx={{ ml: 'auto' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PersonAddRoundedIcon />}
                onClick={() => setCreateUserOpen(true)}
                disabled={loading}
              >
                Nuevo usuario
              </Button>
            </Box>
          </Box>
          <Divider />
          <TableContainer component={Paper} sx={{ boxShadow: 'none', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 450 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                ) : (detail?.users ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Sin usuarios en esta sucursal
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (detail?.users ?? []).map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{u.username}</TableCell>
                      <TableCell>{u.fullName}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{u.email || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Empleado'}
                          size="small"
                          color={u.role === 'superadmin' ? 'secondary' : u.role === 'admin' ? 'primary' : 'default'}
                          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}>
                          <Switch
                            checked={u.isActive}
                            onChange={() => handleToggleUserActive(u.id, u.isActive)}
                            disabled={!!togglingUsers[u.id]}
                            size="small"
                            color="success"
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modal: Nuevo usuario */}
      <Dialog
        open={createUserOpen}
        onClose={() => !createUserLoading && setCreateUserOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo usuario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
          {createUserError && (
            <Alert severity="error" onClose={() => setCreateUserError('')}>{createUserError}</Alert>
          )}
          <TextField
            label="Nombre completo"
            value={createUserForm.fullName}
            onChange={(e) => setCreateUserForm((f) => ({ ...f, fullName: e.target.value }))}
            required
            fullWidth
            disabled={createUserLoading}
          />
          <TextField
            label="Nombre de usuario"
            value={createUserForm.username}
            onChange={(e) => setCreateUserForm((f) => ({ ...f, username: e.target.value }))}
            required
            fullWidth
            disabled={createUserLoading}
            helperText="Debe ser único en todo el sistema"
          />
          <TextField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={createUserForm.password}
            onChange={(e) => setCreateUserForm((f) => ({ ...f, password: e.target.value }))}
            required
            fullWidth
            disabled={createUserLoading}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl fullWidth required>
            <InputLabel>Rol</InputLabel>
            <Select
              value={createUserForm.role}
              label="Rol"
              onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value }))}
              disabled={createUserLoading}
            >
              <MenuItem value="employee">Empleado</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="superadmin">Super Admin</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Email (opcional)"
            type="email"
            value={createUserForm.email}
            onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))}
            fullWidth
            disabled={createUserLoading}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => { setCreateUserOpen(false); setCreateUserError(''); }}
            disabled={createUserLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={createUserLoading || !createUserForm.fullName.trim() || !createUserForm.username.trim() || !createUserForm.password}
            startIcon={createUserLoading ? <CircularProgress size={16} color="inherit" /> : <PersonAddRoundedIcon />}
          >
            Crear usuario
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ventas recientes */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Ventas recientes (últimos 30 días)
            </Typography>
          </Box>
          <Divider />
          <TableContainer component={Paper} sx={{ boxShadow: 'none', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 350 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Medio de pago</TableCell>
                  <TableCell align="right">Importe</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                ) : (detail?.recentSales ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Sin ventas en los últimos 30 días
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (detail?.recentSales ?? []).map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">#{sale.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {dayjs(sale.saleDate).format('DD/MM/YYYY')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="body2">{sale.paymentMethod || '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D6A4F' }}>
                          {formatCurrency(sale.totalAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}