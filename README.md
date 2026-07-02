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

Variable opcional para producción:

```bash
VITE_API_URL=https://tu-api.ejemplo.com
```

Si no se define, las rutas usan rutas relativas `/api/...` (proxy en dev o mismo origen en prod).

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
