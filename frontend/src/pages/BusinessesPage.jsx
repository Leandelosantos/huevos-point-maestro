import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Skeleton,
  Button,
  Alert,
} from '@mui/material';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function BusinessesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/businesses');
      setBusinesses(data.data);
    } catch {
      setError('Error al cargar los negocios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Panel Maestro
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bienvenido, {user?.fullName || user?.username} · Seleccioná un negocio para ver sus sucursales
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshRoundedIcon />}
          onClick={fetchBusinesses}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={{ mt: { xs: 0, sm: 1 } }}
        >
          Actualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Cards de negocios */}
      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Skeleton variant="rounded" height={220} />
              </Grid>
            ))
          : businesses.length === 0
          ? (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary">No hay negocios registrados</Typography>
                </CardContent>
              </Card>
            </Grid>
          )
          : businesses.map((business) => (
            <Grid item xs={12} md={6} lg={4} key={business.id}>
              <Card
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: business.isActive ? 'rgba(21,101,192,0.15)' : 'rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(21,101,192,0.15)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/businesses/${business.id}`)}
                  sx={{ height: '100%', alignItems: 'flex-start' }}
                >
                  <CardContent sx={{ p: 3, height: '100%' }}>
                    {/* Header de la card */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFF',
                            flexShrink: 0,
                          }}
                        >
                          <StorefrontRoundedIcon />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {business.name}
                          </Typography>
                          {business.slug && (
                            <Typography variant="caption" color="text.secondary">
                              {business.slug}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={business.isActive ? 'Activo' : 'Inactivo'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            backgroundColor: business.isActive
                              ? 'rgba(45, 106, 79, 0.1)'
                              : 'rgba(198, 40, 40, 0.1)',
                            color: business.isActive ? '#2D6A4F' : '#C62828',
                          }}
                        />
                        <ChevronRightRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                      </Box>
                    </Box>

                    {/* Stats */}
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'rgba(21,101,192,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <BusinessRoundedIcon sx={{ fontSize: 18, color: '#1565C0' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                              Sucursales
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0D47A1' }}>
                              {business.activeTenantCount} / {business.tenantCount}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      <Grid item xs={6}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'rgba(45,106,79,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <TrendingUpRoundedIcon sx={{ fontSize: 18, color: '#2D6A4F' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                              Ventas (30d)
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1B4332' }}>
                              {formatCurrency(business.salesLast30Days)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: (business.netLast30Days ?? 0) >= 0
                              ? 'rgba(21,101,192,0.06)'
                              : 'rgba(198,40,40,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <AccountBalanceWalletRoundedIcon
                            sx={{
                              fontSize: 18,
                              color: (business.netLast30Days ?? 0) >= 0 ? '#1565C0' : '#C62828',
                            }}
                          />
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                              Neto (30d)
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: (business.netLast30Days ?? 0) >= 0 ? '#0D47A1' : '#C62828',
                              }}
                            >
                              {formatCurrency(business.netLast30Days)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
      </Grid>
    </Box>
  );
}
