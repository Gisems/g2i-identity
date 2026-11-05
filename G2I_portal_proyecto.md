# Portal de clientes G2I Digital: especificación del proyecto

Documento para construir el portal en código (pensado para pasárselo a Claude Code o a un desarrollador). Resume todo lo decidido hasta ahora.

## 1. Qué es y para qué sirve

Portal **interno** del equipo de G2I Digital para registrar y dar seguimiento a los clientes de la empresa. G2I vende creación de webs, integraciones y productos digitales, y ofrece un **diagnóstico gratuito** (analizar la web actual del cliente, marcar puntos de mejora y mostrar una idea de cómo se vería con los cambios).

- Usuarios: solo el equipo de G2I (no hay acceso para clientes).
- Escala: base de datos chica, uso interno, costo objetivo **$0**.
- Idioma de la interfaz: español (Perú). Moneda por defecto: soles (PEN), también USD.
- Dominio: se publica en un **subdominio** del dominio existente (por ejemplo `clientes.tudominio.com`).

## 2. Stack decidido

| Capa | Herramienta | Notas |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind CSS v4** | Es el mismo stack del sitio g2i.netlify.app, así se reutilizan tokens y fuentes. |
| Base de datos, login y archivos | **Supabase (plan Free)** | Postgres + Auth + Storage en un solo servicio. |
| Hosting | **Netlify (plan Free)** | Se prefiere sobre Vercel Hobby, que está pensado para uso no comercial (verificar términos vigentes de ambos). |
| Subdominio | CNAME en el DNS apuntando al sitio de Netlify | SSL automático. |
| Tareas programadas | **GitHub Actions** | Keep-alive y respaldo semanal. |
| Cliente Supabase | `@supabase/supabase-js` + `@supabase/ssr` | Sesión en cookies para Next.js. |

### Límites del plan gratuito de Supabase (verificar en supabase.com/pricing)

- 500 MB de base de datos, 1 GB de archivos, 5 GB de transferencia al mes, 2 proyectos activos.
- **El proyecto se pausa tras 1 semana sin actividad.** Solución: una GitHub Action que haga una consulta liviana cada 3 o 4 días.
- No incluye backups diarios. Solución: GitHub Action semanal con `pg_dump` hacia un repositorio privado.
- Los logos pesados, fotos y material de marca se quedan en Google Drive; en la base solo se guarda el link (para no gastar el 1 GB).

## 3. Marca (tokens de g2i.netlify.app)

Fuentes (cargar con `next/font`): **Space Grotesk** para titulares, **Satoshi** para texto, **IBM Plex Mono** para detalles (RUC, horas, números de operación).

```css
:root {
  --radius: 0.625rem;
  --background: #ffffff;
  --background-primary: #004952;
  --background-primary-subtle: #f5f8f8;
  --background-accent-subtle: #fdf8f7;
  --background-secondary-subtle: #faf7f1;
  --background-neutral: #e8ecec;
  --foreground: #001b1f;
  --foreground-secondary: #616161;
  --foreground-muted: #7a8585;
  --primary: #004952;
  --primary-dark: #00363d;
  --primary-light: #00707c;
  --accent: #ed7755;
  --accent-hover: #ff8f70;
  --accent-light: #ffb199;
  --secondary: #ffdf9f;
  --border: #ccdbdc;
  --border-accent: #ffd5cd;
  --border-secondary: #ffdf9f;
  --success: #4caf50;
  --warning: #ffb74d;
  --destructive: #d9534f;
  --shadow-card: 0 1px 3px rgba(0,27,31,.06), 0 4px 16px rgba(0,27,31,.06);
  --shadow-card-hover: 0 4px 24px rgba(0,27,31,.12);
  --shadow-button: 0 10px 24px rgba(255,141,110,.35);
  --gradient-primary: linear-gradient(135deg, #004952 0%, #00707c 100%);
  --gradient-footer: linear-gradient(180deg, #004952 0%, #00363d 100%);
}
```

Decisiones de diseño ya tomadas:

- Menú lateral con `--gradient-footer`; login con `--gradient-primary` y manchas de color que flotan lento (única animación decorativa).
- Botón de acción principal de cada página en **coral con texto oscuro** (`#001b1f`). El blanco sobre `#ed7755` no alcanza contraste AA. Botones de formulario y de tabla en verde `--primary`.
- Para texto de estados usar tonos más oscuros que `--success` y `--destructive` (ok `#2a6b2e`, error `#a8312d`, aviso `#7a4b00`) sobre fondos suaves. Texto secundario `#4d5a5a` y terciario `#5c6969`.
- Sin modo oscuro (el manual de marca no lo define).
- Logo: hoy es un wordmark de texto "G2I digital". Reemplazar por el archivo oficial cuando se tenga (SVG o PNG).

## 4. Modelo de datos

El script completo está en **`g2i_portal_schema.sql`** (adjuntarlo al proyecto). Resumen:

| Tabla | Para qué | Campos clave |
|---|---|---|
| `usuarios` | Equipo interno, 1 a 1 con `auth.users` | rol: admin, ventas, dev, diseño |
| `clientes` | Empresa cliente | nombre, ruc (único), teléfono, email, estado (prospecto, activo, inactivo, perdido), origen, responsable |
| `representantes` | Uno o varios por cliente | nombre, cargo, teléfono, `es_principal` (solo uno por cliente) |
| `cliente_detalles` | 1 a 1 con cliente | descripción, rubro, web actual, `redes` (jsonb), `colores` (jsonb), `logo_url`, `carpeta_drive_url` |
| `servicios` | Catálogo | tipo: web, tienda, integración, producto digital, SEO, mantenimiento, diagnóstico |
| `proyectos` | Lo que se vende a cada cliente | cliente, servicio, estado, monto_total, moneda, fechas |
| `pagos` | Plan de pago de un proyecto (1 a 1) | modalidad: contado, cuotas, adelanto_saldo, recurrente |
| `cuotas` | Cada cuota del plan | monto, vencimiento, fecha_pago, método, número de operación, `comprobante_url`, estado |
| `contratos` | Contrato por proyecto | fecha_firma, `archivo_url`, estado |
| `diagnosticos` | Diagnóstico gratuito | url_analizada, estado, `puntos_mejora` (jsonb), puntaje 0-100, `mockup_url`, `informe_url`, `convertido_en_proyecto_id` |
| `citas` | Agenda con clientes | tipo, inicio, fin, modalidad, lugar_o_link, estado, `google_event_id` |
| `seguimientos` | Cada contacto con el cliente = 1 registro | canal, motivo, resultado, comentario, próxima acción y su fecha |

Decisión clave: pagos y contratos cuelgan del **proyecto**, no del cliente, porque un cliente puede contratar varios servicios con el tiempo.

### Lógica en la base (ya incluida en el script)

- Trigger que mantiene `actualizado_en`.
- Al registrar `fecha_pago` en una cuota, pasa a `pagada` sola.
- Al marcar una cita como `realizada`, se crea automáticamente su seguimiento (con `cita_id`).
- Vistas: `resumen_clientes` (total de seguimientos, últimos 30 días, último contacto, días sin contacto, citas, saldo y cuotas vencidas), `resumen_pagos_proyecto` y `embudo_diagnosticos` (conversión mensual y seguimientos promedio hasta el cierre).
- El conteo de seguimientos **no** se guarda como contador: se calcula en la vista.

### Seguridad

- Row Level Security activada en todas las tablas: solo usuarios autenticados, activos y registrados en `usuarios` pueden leer y escribir; solo `admin` puede borrar.
- Buckets de Storage **privados**: `logos`, `contratos`, `comprobantes`, `diagnosticos`. Acceso con URLs firmadas que expiran.
- Convención de rutas: `logos/{cliente_id}/logo.png`, `contratos/{proyecto_id}/{contrato_id}.pdf`, `comprobantes/{proyecto_id}/cuota-{n}.jpg`, `diagnosticos/{diagnostico_id}/informe.pdf`.
- Registro público desactivado en Supabase Auth; los usuarios se crean por invitación.
- Nunca guardar contraseñas de clientes en la base. Solo la referencia de dónde están (gestor de contraseñas del equipo).

## 5. Pantallas y comportamiento

El prototipo funcional (datos de ejemplo, sin base de datos) está en **`g2i_portal.html`**. Sirve como referencia visual y de comportamiento: replicarlo en componentes de Next.js.

### Login
Correo y contraseña con validación, botón mostrar/ocultar contraseña, estado de carga, recuperar contraseña (`resetPasswordForEmail`) y cerrar sesión. Sin botón de registro. Rutas protegidas con middleware de Next.js.

### Panel
Citas de hoy, seguimientos para hoy o atrasados (con botón "Hecho"), cuotas vencidas, por cobrar total y embudo de diagnósticos con tasa de conversión.

### Clientes
- Listado con búsqueda (nombre, RUC, representante) y filtros: todos, activos, prospectos, inactivos, con saldo pendiente, sin contacto hace 14+ días.
- Columnas: cliente, representante, estado, **cantidad de seguimientos**, último contacto, próxima cita, saldo pendiente.
- Ficha con pestañas: Resumen, Marca y assets, Proyectos y pagos, Contratos, Seguimientos, Citas.
- Formulario de cliente (crear y editar) con varios representantes y varios colores de marca.

### Agenda
Vista semanal tipo calendario (8:00 a 20:00, navegación por semanas, citas que se superponen se reparten en carriles) y vista en lista. Al hacer clic en una cita se puede cambiar estado, fecha, hora, modalidad, link y notas.

### Diagnósticos
Listado con filtros por estado y puntaje con barra. Detalle con hallazgos (área, prioridad, texto), link a propuesta visual, informe en PDF y botón **Convertir en proyecto**. Se puede crear un diagnóstico para un cliente nuevo (queda como prospecto con origen "diagnóstico").

### Pagos
Indicadores (cobrado del mes, por cobrar, vencido, vence en 7 días), filtros (pendientes, vencidas, pagadas, todas) y búsqueda. "Registrar pago" pide fecha, método (transferencia, Yape, Plin, tarjeta, efectivo, otro), número de operación y comprobante.

### Proyecto con plan de pago
Al crear un proyecto se generan las cuotas según la modalidad:

- **Contado:** 1 cuota.
- **Adelanto y saldo:** 50 % y 50 %, con el saldo un mes después.
- **En cuotas:** N cuotas iguales mensuales (la última absorbe el redondeo).
- **Recurrente:** N meses con el mismo monto mensual.

Si el proyecto se crea desde un diagnóstico, el diagnóstico pasa a `convertido` y guarda el id del proyecto. Si el proyecto queda `aprobado` o `en_curso`, el cliente pasa a `activo`.

## 6. Reglas de negocio

1. Cada contacto con un cliente es un **seguimiento**; el total sale de contar registros.
2. Una cita realizada genera su seguimiento automáticamente (sin cargarlo dos veces).
3. Un seguimiento puede dejar una próxima acción con fecha; aparece en el panel hasta que se marque como hecha.
4. Una cuota es `vencida` si no está pagada y su vencimiento es anterior a hoy.
5. Un cliente solo puede tener un representante principal.
6. El RUC es único (11 dígitos).

## 7. Estructura de carpetas sugerida

```
g2i-portal/
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (portal)/layout.tsx            # sidebar + guardia de sesión
│  ├─ (portal)/page.tsx              # Panel
│  ├─ (portal)/clientes/page.tsx
│  ├─ (portal)/clientes/[id]/page.tsx
│  ├─ (portal)/agenda/page.tsx
│  ├─ (portal)/diagnosticos/page.tsx
│  ├─ (portal)/pagos/page.tsx
│  └─ globals.css                    # tokens de marca (sección 3)
├─ components/                       # Drawer, Badge, StatBlock, Tabs, WeekCalendar, ...
├─ lib/
│  ├─ supabase/{client,server,middleware}.ts
│  ├─ queries/                       # clientes, citas, pagos, diagnosticos
│  └─ cuotas.ts                      # genCuotas() del prototipo
├─ middleware.ts                     # protege rutas
├─ supabase/schema.sql               # el script SQL
└─ .github/workflows/{keepalive,backup}.yml
```

## 8. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # pública por diseño; la seguridad la dan las políticas RLS
SUPABASE_DB_URL=...                      # solo en GitHub Secrets, para el respaldo con pg_dump
```

La clave `service_role` **no** se usa en el frontend ni se sube al repositorio.

## 9. Despliegue

1. Crear el proyecto en Supabase y ejecutar `schema.sql` en el SQL Editor.
2. Invitar a cada integrante en Authentication → Users y registrarlo en `public.usuarios` con su UUID y rol (instrucciones al final del script). Desactivar "Allow new users to sign up".
3. Subir el repositorio a GitHub y conectarlo a Netlify; cargar las variables de entorno.
4. Agregar el subdominio en Netlify y crear el registro CNAME en el DNS del dominio.
5. Configurar las dos GitHub Actions (keep-alive y respaldo semanal).

## 10. Orden de construcción sugerido

1. Proyecto Next.js, tokens de marca, fuentes y layout con sidebar.
2. Supabase: script SQL, usuarios y login con middleware.
3. Clientes: listado, ficha, formulario (con representantes y detalles de marca).
4. Proyectos, plan de pago, cuotas y registro de pagos con comprobante.
5. Citas y seguimientos (incluido el flujo cita realizada, seguimiento automático).
6. Diagnósticos y conversión a proyecto.
7. Panel con las vistas SQL.
8. Subida de archivos a Storage (logo, contrato, comprobante, informe).
9. Despliegue, subdominio, keep-alive y respaldos.

## 11. Detalles a unificar al conectar el prototipo con la base

- `diagnosticos.puntos_mejora`: el comentario del SQL usa la clave `hallazgo`, el prototipo usa `texto`. Elegir una y usarla en ambos lados.
- `contratos.tipo`: el SQL espera minúsculas (`servicio`, `mantenimiento`, `confidencialidad`, `adenda`); el prototipo las guarda con mayúscula inicial.
- Estados y modalidades del prototipo coinciden con los `check` del SQL; revisar `cuotas.metodo_pago` (en SQL va en minúsculas: `transferencia`, `yape`, `plin`, ...).
- Los campos de archivo del prototipo solo guardan el nombre; en producción deben subirse a los buckets y guardar la ruta.
- En el prototipo "hoy" está fijo al 4 de noviembre de 2026; en producción usar la fecha real.
- Los seguimientos del prototipo guardan `prox` como objeto; en la base son tres columnas (`proxima_accion`, `fecha_proxima_accion`, `proxima_accion_hecha`).

## 12. Extras opcionales (gratis)

- **Cal.com** (plan gratuito) para que el cliente reserve solo la cita del diagnóstico, con un webhook que cree la cita en Supabase.
- **Google Calendar API** para sincronizar las citas con el calendario del equipo (campo `google_event_id`).
- Tipo de pago recurrente ya contemplado para cobrar hosting o mantenimiento mensual.

## 13. Archivos de referencia

| Archivo | Contenido |
|---|---|
| `g2i_portal_schema.sql` | Tablas, triggers, vistas, RLS, buckets y servicios iniciales |
| `g2i_portal.html` | Prototipo funcional con login y las 5 vistas, datos de ejemplo |
