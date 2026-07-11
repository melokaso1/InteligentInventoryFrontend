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
pnpm preview  # Sirve la build local
pnpm lint     # oxlint
```

## Conexión con la API

La capa `src/api/` centraliza las llamadas HTTP:

| Módulo | Uso |
|--------|-----|
| `client.ts` | `apiFetch`, errores, tipos paginados |
| `index.ts` | `fetchProducts`, `fetchSales`, `sendChatMessage`, etc. |
| `normalize.ts` | Convierte respuestas JSON a camelCase antes de mapear a tipos UI |

En desarrollo, `VITE_API_URL` debe quedar vacío: las rutas usan `/api/...` y el proxy de Vite apunta a `http://127.0.0.1:5151`.

Si el login o el dashboard devuelven **502**, la API .NET no está corriendo en el puerto **5151**.

## Arranque del monorepo (local)

Todo el proyecto corre en local. Solo PostgreSQL usa Docker:

```bash
# 1. Base de datos
cd Backend && docker compose up -d

# 2. API .NET — http://localhost:5151
cd Backend/Api && dotnet run

# 3. Chatbot (si no arranca solo con Chatbot__AutoStart)
cd LLMChatBot && python run.py

# 4. Frontend — http://localhost:5173
cd Frontend && pnpm dev
```

Detalle: `Backend/INSTALACION.md` y `Backend/README.md`.

## ngrok (túnel local opcional)

Para compartir la UI en desarrollo (`ngrok http 5173`):

```bash
# Terminal 1 — API + chatbot + Vite según Backend/README.md
cd Frontend && pnpm dev

# Terminal 2 — túnel
ngrok http 5173
# o, con config de ejemplo en la raíz del monorepo:
ngrok start el-plonsazo --config ../ngrok.yml.example
```

### Qué hace el proyecto

| Capa | Archivo | Comportamiento |
|------|---------|----------------|
| Bootstrap temprano | `index.html` | Parchea `window.fetch` en hosts `*ngrok*` antes de cargar React. |
| Utilidad | `src/utils/ngrok.ts` | `ngrokSkipHeaders()`, `installNgrokFetchPatch()`. |
| API | `src/api/client.ts`, `index.ts` | Todas las llamadas HTTP incluyen `ngrok-skip-browser-warning: true`. |
| Proxy dev | `vite.config.ts` | Reenvía el header al backend .NET en `:5151`. |
| Chatbot | `LLMChatBot/app/tools/dotnet_tools.py` | Peticiones a `DOTNET_API_URL` con el mismo header si la URL contiene `ngrok`. |

### Limitaciones (plan gratuito ngrok)

1. **Primera navegación HTML** en un dispositivo nuevo muestra la interstitial **Visit Site**. Los navegadores no permiten enviar headers personalizados en la barra de direcciones.
2. Tras pulsar **Visit Site**, ngrok guarda una cookie ~7 días; las peticiones `fetch` y la app funcionan con normalidad.
3. Si cada demo usa un dispositivo distinto, considera **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:5173`).

Si apuntas `VITE_API_URL` directamente a un túnel ngrok de la API (no al proxy de Vite), el header también se envía automáticamente.

## Chatbot

- `sessionId` persistido en `sessionStorage` (`elplonsazo-chat-session`).
- `POST /api/chat/message` → proxy .NET → FastAPI.
- `OperationSummary` se actualiza con `operationSummary` de la respuesta.
- Invitados entran al chatbot por defecto; el login solo se pide al iniciar sesión o en acciones protegidas.

## Autenticación

La autenticación es real contra la API .NET (JWT):

| Clave | Descripción |
|-------|-------------|
| Token JWT | Guardado tras `POST /api/auth/login` / `register` |
| Rol | `Admin` o `Cliente` según el usuario |

- **Login** (`/login`): credenciales reales (`admin@elplonsazo.com` / `Admin123!` en desarrollo).
- Rutas de administración exigen rol **Admin**.
- Clientes usan chatbot, pedidos y perfil.

## Tema claro / oscuro

Persistido en `localStorage` (`erp-theme`: `light` | `dark`). El toggle aplica la clase `dark` en `<html>`.

## Rutas

| Ruta | Página | Acceso |
|------|--------|--------|
| `/` | Redirige al home según rol | Público / autenticado |
| `/chatbot` | Chatbot (inicio para invitados) | Público |
| `/products` | Productos | Admin |
| `/inventory` | Inventario | Admin |
| `/sales` | Ventas | Admin |
| `/dispatch` | Despacho | Admin |
| `/invoices` | Facturas | Admin |
| `/reports` | Reportes | Admin |
| `/my-orders` | Mis pedidos | Cliente |
| `/settings` | Configuración | Autenticado |
| `/login`, `/register` | Auth | Público |

## Estructura

```
src/
├── api/             # Cliente HTTP y funciones por recurso
├── pages/           # Vistas por ruta
├── components/
│   ├── auth/        # ProtectedRoute
│   ├── chat/        # Mensajes, input, resumen de operación
│   ├── layout/      # AppLayout, Sidebar, Header, UserMenu
│   └── ui/          # DataTable, Modal, KpiCard, etc.
├── hooks/           # useAuth, useTheme, useSidebar, useNotifications
├── types/           # Tipos compartidos
├── utils/           # format.ts (COP), ngrok, a11y
├── App.tsx
└── main.tsx
```

Montos en **pesos colombianos (COP)** — ver `src/utils/format.ts`.

## Notas

- Diseño basado en mockups **Google Stitch** (*Executive Precision*).
- Proyecto académico: panel admin funcional con backend real para el taller SmartInventory AI.
- **No hay despliegue en Netlify ni en la nube**: el entorno previsto es local (Docker solo para PostgreSQL).
