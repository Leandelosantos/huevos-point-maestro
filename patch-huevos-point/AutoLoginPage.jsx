/**
 * PATCH para la app de negocios (huevos-point client)
 *
 * INSTRUCCIONES:
 * 1. Copiar este archivo a: client/src/pages/AutoLoginPage.jsx
 * 2. Agregar la ruta en client/src/App.jsx (ver comentario al final del archivo)
 *
 * ¿Qué hace?
 * - Recibe un token JWT por query string (?token=xxx)
 * - Lo guarda en sessionStorage como si fuera un login normal
 * - Selecciona el tenant indicado por el parámetro ?tenant=id
 * - Redirige al dashboard principal
 *
 * El token es generado por el Dashboard Maestro usando el mismo JWT_SECRET.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

export default function AutoLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const tenantId = searchParams.get('tenant');

    if (!token) {
      setError('Token de acceso no encontrado');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    try {
      // Decodificar el payload del JWT (sin verificar firma — el servidor ya lo hizo)
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));

      // Verificar que el token no esté expirado
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        setError('El enlace de acceso expiró. Generá uno nuevo desde el Panel Maestro.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      // Verificar que sea un superadmin (seguridad adicional)
      if (payload.role !== 'superadmin') {
        setError('Acceso denegado: solo para administradores');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }

      // Guardar token en sessionStorage (igual que el login normal)
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify({
        id: payload.id,
        username: payload.username,
        fullName: payload.fullName,
        role: payload.role,
        tenants: payload.tenants || [],
      }));

      // Seleccionar el tenant indicado por el parámetro ?tenant=
      // Si no hay parámetro, usar el primer tenant del payload
      let activeTenant = null;
      if (tenantId && payload.tenants?.length) {
        const parsedId = parseInt(tenantId, 10);
        activeTenant = payload.tenants.find((t) => t.id === parsedId) || payload.tenants[0];
      } else if (payload.tenants?.length) {
        activeTenant = payload.tenants[0];
      }

      if (activeTenant) {
        sessionStorage.setItem('activeTenant', JSON.stringify(activeTenant));
      }

      // Redirigir al dashboard principal
      navigate('/', { replace: true });
    } catch {
      setError('Error al procesar el acceso. El enlace puede ser inválido.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    }
  }, [searchParams, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
        </Alert>
      ) : (
        <>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Ingresando al sistema...
          </Typography>
        </>
      )}
    </Box>
  );
}

/*
 * ──────────────────────────────────────────────────────────────────
 * AGREGAR en client/src/App.jsx, dentro del bloque <Routes>:
 *
 * import AutoLoginPage from './pages/AutoLoginPage';
 *
 * // Ruta pública (no requiere autenticación):
 * <Route path="/auto-login" element={<AutoLoginPage />} />
 *
 * Debe ir ANTES de las rutas protegidas para que funcione correctamente.
 * ──────────────────────────────────────────────────────────────────
 */
