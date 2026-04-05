import { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Tooltip,
  Button,
  Alert,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function BusinessDetailPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/businesses/${businessId}`);
      setDetail(data.data);
    } catch {
      setError('Error al cargar el detalle del negocio');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const business = detail?.business;
  const tenants = detail?.tenants ?? [];
  const stats = detail?.totalStats;

  const statCards = [
    {
      label: 'Sucursales activas',
      value: loading ? null : `${stats?.activeTenantCount ?? 0} / ${stats?.tenantCount ?? 0}`,
      icon: <CheckCircleRoundedIcon />,
      bgGradient: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
      iconBg: '#1565C0',
      color: '#0D47A1',
    },
    {
      label: 'Ventas totales (30d)',
      value: loading ? null : formatCurrency(stats?.salesLast30Days ?? 0),
      icon: <TrendingUpRoundedIcon />,
      bgGradient: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
      iconBg: '#2D6A4F',
      color: '#1B4332',
    },
    {
      label: 'Egresos totales (30d)',
      value: loading ? null : formatCurrency(stats?.expensesLast30Days ?? 0),
      icon: <TrendingDownRoundedIcon />,
      bgGradient: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
      iconBg: '#C62828',
      color: '#B71C1C',
    },
    {
      label: 'Neto del negocio (30d)',
      value: loading ? null : formatCurrency(stats?.netLast30Days ?? 0),
      icon: <AccountBalanceWalletRoundedIcon />,
      bgGradient: (stats?.netLast30Days ?? 0) >= 0
        ? 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)'
        : 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      iconBg: (stats?.netLast30Days ?? 0) >= 0 ? '#7B1FA2' : '#E65100',
      color: (stats?.netLast30Days ?? 0) >= 0 ? '#4A148C' : '#BF360C',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/')}
          sx={{ color: 'text.secondary', mb: 1.5, textTransform: 'none', fontWeight: 500 }}
        >
          Volver a negocios
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {loading ? (
              <Skeleton width={220} height={48} />
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {business?.name}
                </Typography>
                <Chip
                  label={business?.isActive ? 'Activo' : 'Inactivo'}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    backgroundColor: business?.isActive
                      ? 'rgba(45, 106, 79, 0.1)'
                      : 'rgba(198, 40, 40, 0.1)',
                    color: business?.isActive ? '#2D6A4F' : '#C62828',
                  }}
                />
              </>
            )}
          </Box>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchDetail} disabled={loading} size="small" aria-label="Actualizar">
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
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
                      <Skeleton width={80} height={40} />
                    ) : (
                      <Typography variant="h5" sx={{ color: card.color, fontWeight: 800, fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                        {card.value}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: '14px',
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

      {/* Tabla de sucursales */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Sucursales
            </Typography>
            {!loading && (
              <Chip label={tenants.length} size="small" color="primary" variant="outlined" />
            )}
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Sucursal</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    Usuarios
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    Ventas (30d)
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    Neto (30d)
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Alta</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : tenants.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">Este negocio no tiene sucursales</Typography>
                      </TableCell>
                    </TableRow>
                  )
                  : tenants.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/tenants/${tenant.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tenant.name}
                        </Typography>
                        {tenant.slug && (
                          <Typography variant="caption" color="text.secondary">
                            {tenant.slug}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={tenant.isActive ? 'Activa' : 'Suspendida'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            backgroundColor: tenant.isActive
                              ? 'rgba(45, 106, 79, 0.1)'
                              : 'rgba(198, 40, 40, 0.1)',
                            color: tenant.isActive ? '#2D6A4F' : '#C62828',
                          }}
                        />
                      </TableCell>

                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {tenant.userCount}
                      </TableCell>

                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D6A4F' }}>
                          {formatCurrency(tenant.salesLast30Days)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: (tenant.netLast30Days ?? 0) >= 0 ? '#1565C0' : '#C62828',
                          }}
                        >
                          {formatCurrency(tenant.netLast30Days)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(tenant.createdAt)}
                        </Typography>
                      </TableCell>

                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/tenants/${tenant.id}`)}
                            sx={{ color: 'primary.main' }}
                            aria-label={`Ver detalle de ${tenant.name}`}
                          >
                            <OpenInNewRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
