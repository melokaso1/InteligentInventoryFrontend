# El Plonsazo — Frontend

Panel de administración ERP para **El Plonsazo Store**: dashboard, catálogo, inventario, ventas, facturas y chatbot conectado a la API .NET.

## Stack

- **React 19** + **TypeScript**
- **Vite 8**
- **Tailwind CSS v4**
- **React Router 7**

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (LTS recomendado)
- [pnpm](https://pnpm.io/)
- API .NET en **http://localhost:5151** (y chatbot FastAPI para el asistente)

## Instalación

```bash
pnpm install
```

El repositorio incluye **`.env`** con valores de desarrollo listos para usar (no hace falta copiar desde `.env.example`). En local, `VITE_API_URL` va vacío para que el proxy de Vite reenvíe `/api` a la API .NET.

## Desarrollo

```bash
pnpm dev
```

Vite arranca en **http://localhost:5173**. Las peticiones a `/api/*` se reenvían al backend .NET vía proxy (`vite.config.ts`).

```bash
pnpm build    # TypeScript + bundle en dist/
pnpm preview  # Sirve la build de producción
pnpm lint     # oxlint
```

## Conexión con la API

La capa `src/api/` centraliza las llamadas HTTP:

| Módulo | Uso |
|--------|-----|
| `client.ts` | `apiFetch`, errores, tipos paginados |
| `index.ts` | `fetchProducts`, `fetchSales`, `sendChatMessage`, etc. |
| `normalize.ts` | Convierte respuestas JSON a camelCase antes de mapear a tipos UI |

## Producción (Netlify)

Sitio: **https://elplonsazo.netlify.app/**

El frontend en Netlify es estático. **Login y toda la API requieren un backend .NET accesible desde internet** (por ejemplo con ngrok en desarrollo). `localhost:5151` no es accesible desde los usuarios.

### Configuración en Netlify

1. **Despliega** `Backend/Api` con PostgreSQL y variables `ConnectionStrings:*`, `Jwt:*`.
2. En Netlify → **Site configuration → Environment variables** (scope **Build**), elige una opción:

| Opción | Variable | Valor |
|--------|----------|--------|
| **A — directa (recomendada)** | `VITE_API_URL` | `https://tu-api-publica.ejemplo.com` (sin `/` final) |
| **B — proxy same-origin** | `NETLIFY_API_PROXY_URL` | Misma URL; deja `VITE_API_URL` vacío |

3. **Redeploy** el sitio (Build & deploy → Trigger deploy).

Detalle completo: `.env.production.example` y `netlify.toml`.

CORS en `Backend/Api/Program.cs` ya permite `https://elplonsazo.netlify.app` (opción A). Con la opción B, el navegador llama a `/api` en Netlify y no necesita CORS hacia la API.

### Verificación

```bash
# Sustituye TU_API por tu URL pública
curl -s -o /dev/null -w "%{http_code}" -X POST https://TU_API/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elplonsazo.com","password":"..."}'
# Esperado: 401 (credenciales) o 200 — no 404 ni HTML
```

Variable opcional para builds locales de producción:

```bash
# En Netlify → Site settings → Environment variables
VITE_API_URL=https://tu-api.ejemplo.com
```

Producción: **https://elplonsazo.netlify.app/** — el backend .NET debe permitir ese origen en CORS.

Si no se define `VITE_API_URL`, las rutas usan rutas relativas `/api/...` (proxy en dev). En Netlify debes definir la URL de la API; no hay proxy de `/api` en el hosting estático (solo fallback SPA vía `public/_redirects`).

## ngrok (túnel local opcional)

Para compartir la UI en desarrollo (`ngrok http 5173`):

```bash
# Terminal 1 — API + chatbot + Vite según Backend/README.md
cd Frontend && pnpm dev

# Terminal 2 — túnel (dominio free, ej. *.ngrok-free.app)
ngrok http 5173
# o, con config de ejemplo en la raíz del monorepo:
ngrok start el-plonsazo --config ngrok.yml
```

### Qué hace el proyecto

| Capa | Archivo | Comportamiento |
|------|---------|----------------|
| Bootstrap temprano | `index.html` | Parchea `window.fetch` en hosts `*ngrok*` antes de cargar React. |
| Utilidad | `src/utils/ngrok.ts` | `ngrokSkipHeaders()`, `installNgrokFetchPatch()`. |
| API | `src/api/client.ts`, `index.ts` | Todas las llamadas HTTP incluyen `ngrok-skip-browser-warning: true`. |
| Proxy dev | `vite.config.ts` | Reenvía el header al backend .NET en `:5151`. |
| Carga alternativa | `public/ngrok.html` | Intenta cargar `/` vía `fetch` con header (útil tras aceptar la pantalla de ngrok; **no** evita la primera visita HTML). |
| Chatbot | `LLMChatBot/app/tools/dotnet_tools.py` | Peticiones a `DOTNET_API_URL` con el mismo header si la URL contiene `ngrok`. |

### Limitaciones (plan gratuito ngrok)

1. **Primera navegación HTML** en un dispositivo nuevo muestra la interstitial **Visit Site**. Los navegadores no permiten enviar headers personalizados en la barra de direcciones; ngrok **prohíbe** inyectar `ngrok-skip-browser-warning` con `traffic_policy` en cuentas free.
2. Tras pulsar **Visit Site**, ngrok guarda una cookie ~7 días; las peticiones `fetch` y la app funcionan con normalidad.
3. Si cada demo usa un dispositivo distinto, considera **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:5173`) o extensión tipo Requestly que añada el header en `https://*.ngrok-free.app/*`.

Si apuntas `VITE_API_URL` directamente a un túnel ngrok de la API (no al proxy de Vite), el header también se envía automáticamente.

## Chatbot

- `sessionId` persistido en `sessionStorage` (`elplonsazo-chat-session`).
- `POST /api/chat/message` → proxy .NET → FastAPI.
- `OperationSummary` se actualiza con `operationSummary` de la respuesta.

## Autenticación mock

La autenticación del panel sigue siendo simulada con `localStorage`:

| Clave | Descripción |
|-------|-------------|
| `erp-auth` | `'true'` cuando hay sesión |
| `erp-role` | Rol (`admin`) |
| `erp-users` | Usuarios de registro (JSON) |

- **Login** (`/login`): acepta cualquier credencial.
- Rutas protegidas exigen `erp-auth === 'true'`.

## Tema claro / oscuro

Persistido en `localStorage` (`erp-theme`: `light` | `dark`). El toggle aplica la clase `dark` en `<html>`.

## Rutas

| Ruta | Página | Datos |
|------|--------|-------|
| `/` | Dashboard | API |
| `/products` | Productos | API |
| `/inventory` | Inventario | API |
| `/sales` | Ventas | API |
| `/invoices` | Facturas | API |
| `/chatbot` | Chatbot | API + proxy chat |
| `/reports` | Reportes | Mock |
| `/support` | Soporte | Mock |

Rutas públicas: `/login`, `/register`.

## Estructura

```
src/
├── api/             # Cliente HTTP y funciones por recurso
├── pages/           # Vistas por ruta
├── components/
│   ├── auth/        # ProtectedRoute
│   ├── chat/        # Mensajes, input, resumen de operación
│   ├── layout/      # AppLayout, Sidebar, Header
│   └── ui/          # DataTable, Modal, KpiCard, etc.
├── data/
│   └── mock.ts      # Solo Reports/Support (referencia)
├── hooks/           # useAuth, useTheme, useSidebar
├── types/           # Tipos compartidos
├── utils/           # format.ts (COP)
├── App.tsx
└── main.tsx
```

Montos en **pesos colombianos (COP)** — ver `src/utils/format.ts`.

## Notas

- Diseño basado en mockups **Google Stitch** (*Executive Precision*).
- `design/` se ignora en el watch de Vite.
- Proyecto académico: panel admin funcional con backend real para el taller SmartInventory AI.
