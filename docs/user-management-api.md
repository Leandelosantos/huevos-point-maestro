# Gestión de Usuarios — API de Huevos Point

> Documento para Dashboard Maestro: cómo crear, editar y desactivar usuarios en Huevos Point vía API interna (JWT).

---

## Autenticación

Todos los endpoints requieren un JWT válido en el header:

```
Authorization: Bearer <JWT>
```

El JWT se obtiene mediante el flujo de **auto-login** (`POST /api/auth/auto-login`) con el token firmado por Dashboard Maestro, o mediante login estándar (`POST /api/auth/login`).

**Requisito de rol:** El token debe pertenecer a un usuario con rol `superadmin` o `admin`.  
- `superadmin` puede gestionar todos los usuarios de todas las sucursales.  
- `admin` solo puede gestionar usuarios de su propia sucursal (filtrado automático por `x-tenant-id`).

**Header adicional requerido para todos los requests (excepto superadmin):**

```
x-tenant-id: <tenantId>
```

---

## Endpoints

### 1. Listar usuarios

```
GET /api/users
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "juan_admin",
      "fullName": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "role": "admin",
      "isActive": true,
      "tenants": [
        { "id": 3, "name": "Sucursal Centro" }
      ]
    }
  ]
}
```

> `superadmin`: devuelve todos los usuarios de todas las sucursales.  
> `admin`: devuelve solo los usuarios de su sucursal (`x-tenant-id`).  
> La contraseña (`password`) nunca se incluye en la respuesta.

---

### 2. Obtener usuario por ID

```
GET /api/users/:id
```

**Respuesta:** igual que el objeto de usuario en la lista.

---

### 3. Crear usuario ✅

```
POST /api/users
Content-Type: application/json
```

**Body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `fullName` | string | ✅ | Nombre completo visible |
| `username` | string | ✅ | Nombre de usuario para login. Debe ser único en el sistema |
| `password` | string | ✅ | Contraseña en texto plano (el backend la hashea con bcrypt, 10 rounds) |
| `role` | string | ✅ | `"employee"`, `"admin"` o `"superadmin"` |
| `tenantIds` | number[] | ✅ (si no es superadmin) | Array de IDs de sucursales a las que pertenece el usuario |
| `email` | string | ❌ | Email (opcional, debe ser único si se provee) |

**Ejemplo — crear un admin para dos sucursales:**
```json
{
  "fullName": "María González",
  "username": "maria_admin",
  "password": "claveSegura123",
  "role": "admin",
  "tenantIds": [2, 5],
  "email": "maria@empresa.com"
}
```

**Ejemplo — crear un empleado en una sucursal:**
```json
{
  "fullName": "Carlos López",
  "username": "carlos_emp",
  "password": "clave456",
  "role": "employee",
  "tenantIds": [3]
}
```

**Ejemplo — crear un superadmin (sin sucursales):**
```json
{
  "fullName": "Admin Central",
  "username": "admin_central",
  "password": "claveMaestra",
  "role": "superadmin",
  "tenantIds": []
}
```

**Respuesta exitosa (201):**
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
      { "id": 2, "name": "Sucursal Norte" },
      { "id": 5, "name": "Sucursal Sur" }
    ]
  }
}
```

**Errores posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | `El nombre de usuario ya está en uso` | `username` duplicado |
| 400 | `El correo electrónico ya está registrado` | `email` duplicado |
| 400 | `Debe asignar al menos una sucursal al usuario` | `tenantIds` vacío en un rol que no es superadmin |
| 401 | `Token de autenticación no proporcionado` | Falta el header Authorization |
| 403 | `Acceso denegado` | El rol del token no es admin ni superadmin |

---

### 4. Editar usuario

```
PUT /api/users/:id
Content-Type: application/json
```

**Body:** mismos campos que `POST`. La contraseña es **opcional** en edición:
- Si se envía vacía (`""`) o no se envía, **no se actualiza**.
- Si se envía con valor, se hashea y actualiza.

```json
{
  "fullName": "María González Modificada",
  "username": "maria_admin",
  "role": "admin",
  "tenantIds": [2, 5, 8]
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": { ...usuario actualizado... }
}
```

---

### 5. Desactivar usuario

```
DELETE /api/users/:id
```

**Nota:** No elimina físicamente el usuario. Setea `is_active = false`. El usuario no puede hacer login pero sus datos se conservan.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario desactivado exitosamente"
}
```

---

## Esquema de la base de datos

### Tabla `users`

```sql
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  full_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(255) UNIQUE,          -- nullable
  password     VARCHAR(255) NOT NULL,        -- bcrypt hash
  role         ENUM('superadmin','admin','employee') NOT NULL DEFAULT 'employee',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id    INTEGER REFERENCES tenants(id), -- columna legacy, el vínculo real es via user_tenants
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla `user_tenants` (relación M:N)

```sql
CREATE TABLE user_tenants (
  user_id   INTEGER NOT NULL REFERENCES users(id),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  PRIMARY KEY (user_id, tenant_id)
);
```

Un usuario puede pertenecer a **múltiples sucursales** (`tenants`). La asignación se gestiona completamente vía `tenantIds` en el payload — no hay que tocar `user_tenants` directamente.

---

## Reglas de negocio importantes

1. **`superadmin`** no tiene sucursales asignadas. `tenantIds` debe ser `[]` (o no enviarse). El sistema ignora cualquier ID que se envíe para este rol.
2. **`admin` / `employee`** requieren al menos una sucursal. Si `tenantIds` está vacío, el endpoint devuelve 400.
3. El `username` es **global**: no puede repetirse entre sucursales distintas.
4. El `email` es **global y opcional**. Si se envía, no puede repetirse.
5. La desactivación es **suave** (`is_active = false`). No hay endpoint de reactivación en la API actual — se haría directamente en la DB o habría que agregarlo.
6. La contraseña nunca se devuelve en ningún endpoint de lectura.

---

## Flujo recomendado para Dashboard Maestro

Al crear un nuevo tenant/sucursal, el Dashboard Maestro puede querer crear automáticamente un usuario admin para esa sucursal:

```
1. POST /api/tenants          → obtener { id } del tenant creado
2. POST /api/users            → crear admin con tenantIds: [id]
```

El JWT utilizado debe ser de un `superadmin` (obtenido vía auto-login).

---

## Notas sobre el JWT para llamadas desde Dashboard Maestro

- Usar el JWT obtenido del endpoint `/api/auth/auto-login` con el token firmado por Dashboard Maestro.
- El JWT tiene expiración configurada en `JWT_EXPIRES_IN` (variable de entorno, ej: `"8h"`).
- Si el JWT expira, hay que hacer un nuevo auto-login.
- No hay refresh token — emitir un nuevo token cuando sea necesario.
