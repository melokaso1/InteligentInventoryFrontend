# El Plonsazo

Panel de administración ERP mock para **El Plonsazo Store**: un dashboard de gestión empresarial con catálogo, inventario, ventas, facturas, chatbot y reportes. Construido con **React 19**, **Vite 8**, **TypeScript** y **Tailwind CSS v4**. Toda la interfaz y los datos son de demostración; no hay backend conectado.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (recomendado: LTS)
- [pnpm](https://pnpm.io/) como gestor de paquetes

## Instalación

```bash
pnpm install
```

## Desarrollo

```bash
pnpm dev
```

Vite arranca por defecto en **http://localhost:5173**. Si ese puerto está ocupado, usará **5174** automáticamente.

Para exponer el servidor con ngrok, el host `unhumanistic-maryann-stonefly.ngrok-free.dev` ya está permitido en `vite.config.ts` (`server.allowedHosts`).

## Build

```bash
pnpm build
pnpm preview
```

`build` compila TypeScript y genera los estáticos en `dist/`. `preview` sirve esa carpeta localmente para probar la build de producción.

Otros scripts disponibles:

```bash
pnpm lint   # oxlint
```

## Autenticación mock

La autenticación es simulada con `localStorage`:

| Clave        | Descripción                                      |
| ------------ | ------------------------------------------------ |
| `erp-auth`   | `'true'` cuando la sesión está activa            |
| `erp-role`   | Rol asignado al iniciar sesión (`admin`)         |
| `erp-users`  | Usuarios registrados vía `/register` (JSON)      |

- **Login** (`/login`): acepta cualquier credencial; al enviar el formulario se marca la sesión y redirige al panel.
- **Registro** (`/register`): guarda el usuario en `erp-users` y redirige al login.
- Las rutas protegidas exigen `erp-auth === 'true'`; si no hay sesión, redirigen a `/login`.

## Tema claro / oscuro

El tema se persiste en `localStorage` bajo la clave **`erp-theme`** (`light` | `dark`). El toggle del header aplica la clase `dark` en `<html>` y los tokens de color definidos en `App.css`.

## Rutas principales

| Ruta         | Página        | Descripción breve              |
| ------------ | ------------- | ------------------------------ |
| `/`          | Panel         | Dashboard con KPIs y actividad |
| `/products`  | Productos     | Catálogo y gestión de ítems    |
| `/inventory` | Inventario    | Stock y movimientos            |
| `/sales`     | Ventas        | Registro de ventas             |
| `/invoices`  | Facturas      | Facturación y cobros           |
| `/chatbot`   | Chatbot       | Asistente operativo mock       |
| `/reports`   | Reportes      | Informes y métricas            |
| `/support`   | Soporte       | FAQ y contacto                 |

Rutas públicas: `/login`, `/register`. Cualquier otra ruta desconocida redirige a `/`.

## Estructura del proyecto

```
src/
├── pages/           # Vistas por ruta (Dashboard, Products, Login, etc.)
├── components/
│   ├── auth/        # ProtectedRoute
│   ├── chat/        # Chatbot (mensajes, input, resumen)
│   ├── layout/      # AppLayout, Sidebar, Header
│   └── ui/          # DataTable, Modal, KpiCard, ThemeToggle, etc.
├── data/
│   └── mock.ts      # Datos estáticos del ERP
├── hooks/           # useAuth, useTheme, useSidebar
├── types/           # Tipos TypeScript compartidos
├── utils/           # format.ts (formato COP)
├── App.tsx          # Router y rutas
├── App.css          # Tokens de diseño (@theme Tailwind v4)
└── main.tsx         # Punto de entrada
```

Los diseños de referencia en `design/` se ignoran en el watch de Vite para no recargar en caliente al editar mockups.

## Datos mock

No hay API ni base de datos. Todos los listados, KPIs, facturas y conversaciones del chatbot provienen de `src/data/mock.ts`.

- Montos en **pesos colombianos (COP)**; el formateo está en `src/utils/format.ts`.
- Catálogo temático de **El Plonsazo** (productos ficticios y humorísticos para contexto académico).
- Almacenes, clientes, movimientos de stock y mensajes del chatbot son datos de ejemplo coherentes entre pantallas.

## Notas

- El diseño visual se basa en mockups generados con **Google Stitch** (tema *Executive Precision*).
- Por ahora solo existe el **panel de administración**; el rol `user` y rutas `/app/*` están reservados para un futuro portal de cliente.
- Proyecto de curso / universidad: interfaz funcional para demostrar flujos ERP sin integración real.
