# Crear Usuarios en Huevos Point desde Dashboard Maestro

> Instrucción para Claude de Dashboard Maestro.  
> La API pública de Huevos Point es solo lectura. Para crear usuarios hay que usar la **API interna** autenticada con JWT.

---

## Por qué no se puede usar la API pública

`POST /api/public/v1/...` no existe — la API pública solo expone `GET`s. Intentar escribir ahí devuelve **405 Method Not Allowed**.

La escritura de usuarios se hace via `POST /api/users` en la API interna, autenticada con un JWT de superadmin.

---

## Flujo completo

```
Dashboard Maestro backend
        │
        ├─ 1. Firmar JWT (con JWT_SECRET compartido)
        │
        ├─ 2. POST https://huevos-point.vercel.app/api/auth/auto-login
        │       Body: { token }
        │       ← Responde con { token: <JWT validado>, user: {...} }
        │
        └─ 3. POST https://huevos-point.vercel.app/api/users
                Headers: Authorization: Bearer <JWT validado>
                Body: { fullName, username, password, role, tenantIds }
                ← Responde con el usuario creado (201)
```

---

## Paso 1 — Generar el JWT firmado

Dashboard Maestro debe firmar un JWT con el mismo `JWT_SECRET` que usa Huevos Point.

**Variables de entorno necesarias en Dashboard Maestro:**
```env
JWT_SECRET=<mismo valor que usa Huevos Point>
HP_APP_URL=https://huevos-point.vercel.app
```

**Payload del JWT:**
```json
{
  "id": 1,
  "username": "leanSuper",
  "fullName": "Leandro Superadmin",
  "role": "superadmin",
  "tenants": [],
  "_source": "dashboard-maestro"
}
```

> `_source: "dashboard-maestro"` es **obligatorio** — Huevos Point lo valida y rechaza el token si no está presente.  
> `role: "superadmin"` es **obligatorio** — solo superadmins pueden usar el auto-login.

**Ejemplo en Node.js:**
```js
const jwt = require('jsonwebtoken');

function generateAutoLoginToken(superadminUser) {
  return jwt.sign(
    {
      id: superadminUser.id,
      username: superadminUser.username,
      fullName: superadminUser.fullName,
      role: 'superadmin',
      tenants: [],
      _source: 'dashboard-maestro',
    },
    process.env.JWT_SECRET,
    { expiresIn: '5m' } // Token de vida corta, solo para esta operación
  );
}
```

---

## Paso 2 — Validar el token via auto-login

```
POST /api/auth/auto-login
```

**Request:**
```js
const axios = require('axios');

const HP_BASE = process.env.HP_APP_URL; // https://huevos-point.vercel.app

const autoLoginResponse = await axios.post(`${HP_BASE}/api/auth/auto-login`, {
  token: generateAutoLoginToken(superadminUser),
});

const hpToken = autoLoginResponse.data.data.token;
```

**Respuesta de Huevos Point:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "username": "leanSuper",
      "role": "superadmin",
      "tenants": [],
      "_source": "dashboard-maestro"
    }
  }
}
```

**Errores posibles en este paso:**

| HTTP | Mensaje | Causa |
|------|---------|-------|
| 400 | `Token requerido` | Body vacío |
| 401 | `Token inválido o expirado` | JWT mal firmado o expirado |
| 403 | `Token no autorizado para auto-login` | Falta `_source: "dashboard-maestro"` |
| 403 | `Solo superadmins pueden usar auto-login` | `role` no es `"superadmin"` |

---

## Paso 3 — Crear el usuario

```
POST /api/users
Authorization: Bearer <hpToken del paso 2>
Content-Type: application/json
```

### Campos del body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `fullName` | string | ✅ | Nombre completo visible en el sistema |
| `username` | string | ✅ | Nombre de usuario para login. Único en todo el sistema |
| `password` | string | ✅ | Contraseña en texto plano (se hashea con bcrypt internamente) |
| `role` | string | ✅ | `"employee"`, `"admin"` o `"superadmin"` |
| `tenantIds` | number[] | ✅* | IDs de sucursales. Requerido si `role != "superadmin"` |
| `email` | string | ❌ | Opcional. Si se envía, debe ser único en el sistema |

> *Para `role: "superadmin"`, enviar `tenantIds: []` o no enviarlo.

### Ejemplo — crear un admin para una sucursal

```js
const createResponse = await axios.post(
  `${HP_BASE}/api/users`,
  {
    fullName: 'María González',
    username: 'maria_admin',
    password: 'claveSegura123',
    role: 'admin',
    tenantIds: [tenantId], // ID de la sucursal en Huevos Point
    email: 'maria@empresa.com', // opcional
  },
  {
    headers: {
      Authorization: `Bearer ${hpToken}`,
      'Content-Type': 'application/json',
    },
  }
);

const nuevoUsuario = createResponse.data.data;
// { id, username, fullName, email, role, isActive, tenants: [...] }
```

### Respuesta exitosa (201)

```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": 42,
    "username": "maria_admin",
    "fullName": "María González",
    "email": "maria@empresa.com",
    "role": "admin",
    "isActive": true,
    "tenants": [
      { "id": 5, "name": "Sucursal Centro" }
    ]
  }
}
```

### Errores posibles en este paso

| HTTP | Mensaje | Causa |
|------|---------|-------|
| 400 | `El nombre de usuario ya está en uso` | `username` duplicado |
| 400 | `El correo electrónico ya está registrado` | `email` duplicado |
| 400 | `Debe asignar al menos una sucursal al usuario` | `tenantIds` vacío con rol no-superadmin |
| 401 | `Token de autenticación no proporcionado` | Falta el header `Authorization` |
| 401 | `Token inválido o expirado` | JWT expirado (emitir uno nuevo) |

---

## Función completa lista para usar

```js
const jwt = require('jsonwebtoken');
const axios = require('axios');

const HP_BASE = process.env.HP_APP_URL; // https://huevos-point.vercel.app

/**
 * Crea un usuario en Huevos Point autenticándose via auto-login.
 *
 * @param {object} superadminUser - Usuario superadmin del Dashboard Maestro
 *   { id, username, fullName }
 * @param {object} newUser - Datos del usuario a crear
 *   { fullName, username, password, role, tenantIds, email? }
 * @returns {object} Usuario creado por Huevos Point
 */
async function createUserInHuevosPoint(superadminUser, newUser) {
  // 1. Generar token de auto-login (vida corta)
  const autoLoginToken = jwt.sign(
    {
      id: superadminUser.id,
      username: superadminUser.username,
      fullName: superadminUser.fullName,
      role: 'superadmin',
      tenants: [],
      _source: 'dashboard-maestro',
    },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );

  // 2. Validar token y obtener JWT de sesión de Huevos Point
  const autoLoginRes = await axios.post(`${HP_BASE}/api/auth/auto-login`, {
    token: autoLoginToken,
  });
  const hpToken = autoLoginRes.data.data.token;

  // 3. Crear el usuario con el JWT obtenido
  const createRes = await axios.post(
    `${HP_BASE}/api/users`,
    {
      fullName: newUser.fullName,
      username: newUser.username,
      password: newUser.password,
      role: newUser.role,
      tenantIds: newUser.tenantIds || [],
      ...(newUser.email ? { email: newUser.email } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${hpToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return createRes.data.data;
}
```

---

## Obtener el `tenantId` correcto

Para asociar el usuario a la sucursal correcta, necesitás el `id` de la tabla `tenants` de Huevos Point. Podés obtenerlo con la API pública:

```
GET /api/public/v1/tenants
x-api-key: hp_live_...
```

Respuesta:
```json
{
  "data": [
    { "id": 3, "name": "Sucursal Centro", "business_id": 1 }
  ]
}
```

Filtrar por `business_id` del negocio activo en Dashboard Maestro para mostrar solo las sucursales del business correspondiente.

---

## Notas importantes

- El token generado en el Paso 1 es de **uso único y vida corta** (`expiresIn: '5m'`). No reutilizarlo.
- El JWT devuelto por `/api/auth/auto-login` (Paso 2) tampoco debe almacenarse — usarlo solo para la operación inmediata.
- Si el JWT del Paso 2 expira entre llamadas, reiniciar desde el Paso 1.
- No hay refresh token en Huevos Point — el auto-login es el mecanismo de obtención de tokens para llamadas server-to-server.
