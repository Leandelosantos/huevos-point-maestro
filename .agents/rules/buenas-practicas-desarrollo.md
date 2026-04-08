---
trigger: always_on
---

# Guía de Buenas Prácticas de Desarrollo de Software
**Nivel:** Senior / Líder Técnico | **Versión:** 1.0 | **Fecha:** 03/03/2026
**Propósito:** Referencia obligatoria para generación de código limpio, sólido, escalable y seguro. Todo desarrollador o IA que trabaje bajo esta guía debe respetar estos principios en cada línea de código.

---

## 1. Principios Fundamentales

**SOLID**
- **S** – Una clase/función hace una sola cosa. Más de 20 líneas es señal de exceso de responsabilidad.
- **O** – Extender comportamiento sin modificar código existente.
- **L** – Una subclase reemplaza a su padre sin romper el sistema.
- **I** – Interfaces pequeñas y específicas. No forzar implementación de métodos innecesarios.
- **D** – Depender de abstracciones. Inyectar dependencias, no instanciarlas internamente.

**DRY** – Cada pieza de lógica existe en un único lugar. Copiar y pegar código exige refactorizar.
**KISS** – La solución más simple que funciona es la mejor. Si no se entiende en 30 segundos, es demasiado compleja.
**YAGNI** – No implementar funcionalidad que no se necesita hoy.
**Fail Fast** – Validar entradas lo antes posible. Lanzar errores explícitos ante condiciones inválidas.
**SoC** – Separar siempre: lógica de negocio, acceso a datos, presentación y configuración.

---

## 2. Código Limpio

**Nomenclatura**
- Variables/funciones: `camelCase` | Clases/componentes: `PascalCase` | Constantes: `UPPER_SNAKE_CASE`
- Nombres descriptivos e intencionales. Prohibido: `data`, `res2`, `temp`, `x`, `flag`.

**Funciones**
- Una función = una responsabilidad. Máximo 3 parámetros; si se necesitan más, usar un objeto.
- Nombres en forma de verbo: `calculateTotal()`, `fetchUserById()`, `validateStock()`.

**Comentarios** – Comentar el *por qué*, nunca el *qué*. El código comentado se elimina antes del commit.

**Manejo de errores** – Nunca `catch(e) {}` vacío. Loguear siempre. Usar clases de error personalizadas.

**Sin números mágicos:**
```js
// ❌  if (attempts > 5) { ... }
// ✅  const MAX_LOGIN_ATTEMPTS = 5;  if (attempts > MAX_LOGIN_ATTEMPTS) { ... }
```

---

## 3. Arquitectura y Patrones

**Arquitectura en capas** (las superiores dependen de las inferiores, nunca al revés):
```
Presentación → Controladores → Servicios (negocio) → Repositorios → Base de datos
```

**Patrones esenciales:**
- **Repository Pattern** – Los servicios nunca hacen queries directamente. Toda interacción con la DB pasa por repositorios.
- **Middleware Pattern** – Autenticación, validación y logging como funciones encadenadas y reutilizables.
- **Strategy Pattern** – Para operaciones intercambiables (ej.: distintos métodos de cálculo).
- **Observer/Event-Driven** – Desacoplar efectos secundarios (ej.: venta → actualizar stock → registrar auditoría como eventos independientes).
- **Inyección de Dependencias** – Recibir dependencias desde afuera. Facilita testing y desacoplamiento.

**API REST:**
- Sustantivos en plural: `/api/v1/sales`, `/api/v1/products`. Versionar desde el inicio.
- Métodos HTTP correctos: `GET` leer, `POST` crear, `PUT/PATCH` actualizar, `DELETE` eliminar.
- Respuesta siempre consistente: `{ success, data, message, error }`.

---

## 4. Estructura de Proyectos

**Backend (Node.js/Express):**
```
src/
├── config/          # Entorno, DB
├── middlewares/     # Auth, errores, validadores
├── modules/         # Cada módulo: routes, controller, service, repository
├── models/          # Modelos ORM
├── utils/           # Logger, AppError, helpers
├── app.js / server.js
```

**Frontend (React):**
```
src/
├── components/      # UI reutilizable (common/ y layout/)
├── pages/           # Una página por ruta
├── hooks/           # Custom hooks (useAuth, useSales…)
├── services/        # Llamadas a la API (axios)
├── context/         # React Context global
├── utils/           # Helpers, formatters, validators
├── constants/       # Roles, rutas, valores fijos
├── theme/           # Configuración MUI
```

---

## 5. Frontend – Buenas Prácticas

- Componentes funcionales con hooks. Si supera 150 líneas, dividir.
- Separar lógica de presentación: la lógica va en custom hooks, el componente solo renderiza.
- No usar `useState` para valores derivables → usar `useMemo`.
- Limpiar suscripciones y timers en el `return` del `useEffect`.
- Centralizar todas las llamadas a la API en `/services` con una instancia axios configurada (baseURL + interceptors).
- Formularios con **React Hook Form**. Validar en frontend (UX) y en backend (seguridad).
- Deshabilitar el botón submit durante el procesamiento para evitar doble envío.
- Evitar prop drilling de más de 2 niveles → Context o estado global.

---

## 6. Backend – Buenas Prácticas

- **Controladores:** reciben request, llaman al service, devuelven response. Máximo 15 líneas por método.
- **Servicios:** contienen la lógica de negocio. No conocen `req`/`res`. Son testeables de forma independiente.
- **Variables de entorno:** nunca hardcodear credenciales. Usar `.env` + `dotenv`. Incluir `.env.example`. Agregar `.env` al `.gitignore`.
- **Logging:** usar Winston o Pino. Niveles: `error`, `warn`, `info`, `debug`. Prohibido `console.log` en producción.
- **Transacciones:** toda operación que modifica múltiples tablas debe usar transacción SQL con rollback ante error.

```js
const t = await sequelize.transaction();
try {
  await Sale.create(data, { transaction: t });
  await updateStock(items, { transaction: t });
  await t.commit();
} catch (e) {
  await t.rollback(); throw e;
}
```

---

## 7. Base de Datos

- Normalizar hasta 3FN. Toda tabla tiene `id` (PK), `created_at` y `updated_at`.
- Eliminación lógica: usar `is_active` o `deleted_at`. Nunca borrar datos con valor histórico.
- Índices en columnas usadas en `WHERE`, `JOIN` y `ORDER BY`. No sobre-indexar.
- Nunca construir queries con concatenación de strings → siempre prepared statements u ORM.
- Evitar el problema N+1: usar `JOIN` o eager loading en lugar de queries dentro de loops.
- Todo cambio de esquema mediante archivo de migración versionado. Nunca modificar producción manualmente.

---

## 8. Seguridad y Ciberseguridad

**Autenticación y autorización:**
- JWT con expiración corta (ej.: 8h). Token en `httpOnly cookie` o en memoria, nunca en `localStorage`.
- Verificar rol y permisos en **cada endpoint del backend**, no solo en el frontend.
- Bloquear cuenta tras N intentos fallidos de login.

**Contraseñas:** bcrypt con mínimo 10 salt rounds. Nunca almacenar, loguear ni transmitir en texto plano.

**Validación:** validar y sanitizar todos los inputs en el backend. Validar tipos, rangos y longitudes. Prevenir XSS e inyección SQL.

**Protección de la API:**
- Rate limiting para fuerza bruta y DoS.
- Helmet.js para headers HTTP de seguridad.
- CORS configurado explícitamente, solo orígenes autorizados.
- No exponer stack traces al cliente en producción.

**Datos sensibles:** excluir campos sensibles (`password`, tokens) de todas las respuestas de API. HTTPS obligatorio en producción.

**Auditoría:** registrar toda acción crítica con usuario, acción, timestamp e IP. Los logs no deben ser modificables desde la app.

```js
// ✅ Excluir password de la respuesta
const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
```

---

## 9. UX/UI y Diseño Gráfico

**Principios de UX:**
- **Visibilidad del estado:** el usuario siempre sabe qué está pasando (spinners, confirmaciones, errores claros).
- **Prevención de errores:** deshabilitar acciones no disponibles, confirmar acciones destructivas.
- **Feedback inmediato:** validaciones en tiempo real, no solo al hacer submit.
- **Consistencia:** mismos colores, tipografías, espaciados e íconos en toda la app.

**Principios de UI:**
- **Jerarquía visual:** lo importante tiene mayor tamaño y contraste. Guiar el ojo hacia la acción principal.
- **Espaciado:** sistema basado en múltiplos de 8px. El espacio en blanco es parte del diseño.
- **Color:** paleta limitada (1 primario, 1 secundario, 1 acento, neutros, colores semánticos). Contraste mínimo **4.5:1** (WCAG AA). El color nunca es el único indicador de estado.
- **Tipografía:** máximo 2 familias. Escala definida: H1→H2→H3→body→caption. Line-height 1.5 en cuerpo.

**Responsividad (Mobile First):**
- Diseñar desde 320px hacia arriba. Elementos táctiles mínimo 44×44px.
- Tablas en mobile: colapsar en cards o scroll horizontal. Modales en mobile: pantalla casi completa.

**Accesibilidad:** navegación por teclado, `aria-label` en íconos, `alt` en imágenes, `label` en cada input.

**Microinteracciones:** transiciones entre 150ms y 300ms. Botones con estados `hover`, `active` y `disabled` visibles. Skeleton screens en vez de spinners para contenido estructurado.

**Formularios:** label siempre visible (no reemplazar con placeholder). Error debajo del campo que lo generó. Botón primario al final, alineado a la derecha (full-width en mobile).

---

## 10. Testing, Git y Performance

**Testing – Pirámide:**
- Base: tests **unitarios** (muchos, rápidos, lógica aislada).
- Medio: tests de **integración** (capas juntas, API + DB).
- Cima: tests **E2E** (pocos, flujos completos).
- Patrón **AAA**: Arrange → Act → Assert. Tests independientes entre sí. Cobertura mínima 70% en lógica crítica.

**Git – Convenciones:**
- Branches: `main` (prod) / `develop` / `feature/xxx` / `fix/xxx` / `hotfix/xxx`.
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Un commit = un cambio lógico atómico. PRs de máximo 400 líneas. Nunca commitear `.env` ni credenciales.

**Performance:**
- Backend: paginación obligatoria en listas, cachear respuestas costosas, monitorear queries lentas con `EXPLAIN ANALYZE`.
- Frontend: lazy loading de rutas con `React.lazy`, `React.memo` y `useMemo` donde sea necesario (no por defecto), imágenes en WebP con dimensiones correctas.

---

## 11. Checklist de Calidad

**Código:** ☐ Sin lógica duplicada ☐ Funciones con una responsabilidad ☐ Sin números mágicos ☐ Errores manejados en todos los flujos ☐ Sin `console.log` ☐ Credenciales en `.env`

**Seguridad:** ☐ Inputs validados/sanitizados en backend ☐ Rutas con auth y autorización ☐ Sin datos sensibles expuestos ☐ Operaciones críticas con transacciones ☐ Passwords hasheadas

**Frontend/UX:** ☐ Funciona en mobile, tablet y desktop ☐ Estados manejados: carga, éxito, error, vacío ☐ Validación en tiempo real ☐ Confirmación en acciones destructivas ☐ Contraste WCAG AA

**General:** ☐ Tests críticos escritos y pasando ☐ Código revisado ☐ README actualizado ☐ Sin archivos sensibles en el repo

---
*"El código se escribe una vez y se lee cientos de veces. Escribí para quien lo leerá mañana."*