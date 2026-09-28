# ToolMaster Pro - Sistema de Control de Herramientas, Maquinaria, Mantenimientos y Préstamos

**ToolMaster Pro** es una solución web empresarial diseñada específicamente para empresas de construcción, talleres mecánicos, plantas industriales y contratistas que necesitan controlar su inventario de herramientas y maquinaria, registrar préstamos a técnicos con vales de entrega oficiales, gestionar mantenimientos preventivos y correctivos, y **restringir el acceso mediante usuarios, claves y niveles de permisos**.

---

## 🚀 Inicio Rápido y Credenciales de Acceso

La aplicación está protegida con clave de acceso y autenticación criptográfica (**SHA-256**). No requiere instalar Python, Node.js ni bases de datos complejas.

### Para abrir la aplicación:
1. Haz doble clic en el archivo `iniciar_app.bat`.
2. O abre directamente `index.html` en tu navegador (Edge, Chrome, etc.).

### 🔑 Cuentas y Claves de Acceso Iniciales:
La plataforma incluye 3 perfiles listos para probar:

| Rol | Usuario | Clave de Acceso | Alcance y Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` | **Acceso Total:** Crear/editar usuarios, cambiar claves, gestionar todo el catálogo, préstamos, talleres y respaldos. |
| **Almacenista / Operador** | `operador` | `almacen123` | **Operativo:** Despachar herramientas, recibir devoluciones, registrar equipos y mantenimientos. |
| **Consulta / Auditor** | `supervisor` | `consulta123` | **Solo Lectura:** Visualizar inventario, ver préstamos e imprimir vales oficiales sin modificar datos. |

*(Desde la pestaña **Usuarios** con la cuenta `admin`, puedes cambiar estas contraseñas, crear nuevos usuarios con roles a medida o desactivar cuentas).*

---

## 📦 Módulos y Funcionalidades del Sistema

### 1. 🔐 Autenticación y Control de Usuarios (Nuevo)
- Pantalla de inicio de sesión con validación de credenciales.
- Almacenamiento seguro con **hash criptográfico SHA-256** mediante la Web Crypto API nativa.
- Recordar sesión de trabajo en el equipo para mayor comodidad.
- **Directorio de Usuarios**:
  - Crear usuarios con Nombre, Usuario (`@login`), Correo, Rol y Clave.
  - Editar datos y resetear contraseñas de cualquier usuario.
  - Activar o desactivar usuarios con un clic (los usuarios inactivos no pueden ingresar).
  - Protección de seguridad para evitar eliminar la cuenta del administrador maestro.

### 2. 📊 Panel de Control (Dashboard)
- **Métricas en tiempo real**: Contadores de inventario total, disponibles, prestados en obra y en taller.
- **Alertas automáticas de Préstamos Vencidos**: Notificaciones resaltadas en rojo con el número de días de atraso.
- **Mantenimientos Próximos**: Calendario de servicios programados para evitar paradas operativas.
- **Accesos Rápidos**: Botones directos para despachos y devoluciones.

### 3. 🧰 Catálogo de Herramientas y Maquinaria
- Ficha técnica completa: Código interno (SKU), Nombre, Categoría, Marca, Modelo, Número de Serie, Ubicación física, Costo de adquisición y Notas.
- **Buscador instantáneo** en vivo y filtros por categoría o estado operativo.
- Modos de visualización conmutable: **Cuadrícula de Tarjetas** o **Tabla Detallada**.
- Historial acumulado por cada máquina: consulta todos los técnicos que la han utilizado y todas las intervenciones de mantenimiento a lo largo de su vida útil.

### 4. 👷 Control de Entregas y Devoluciones a Técnicos (Préstamos)
- **Módulo de Entrega (Check-out)**:
  - Asignación a técnico con selector multi-equipo de herramientas disponibles.
  - Registro de fecha pactada de retorno, obra/proyecto y condición inicial.
  - Generación automática de **Vale Oficial de Entrega Imprimible** (con formato legal y cuadros de firma para el almacén y el técnico).
- **Módulo de Devolución (Check-in con Inspección)**:
  - Registro de condición al retornar (Excelente, Buena, Dañada, Incompleta).
  - **Derivación automática a taller**: Si el técnico devuelve la herramienta con fallas o roturas, con una sola casilla se crea automáticamente la orden de mantenimiento correctivo y el equipo queda bloqueado en taller.

### 5. 🔧 Gestión de Mantenimientos
- Registro de mantenimientos **Preventivos** y **Correctivos**.
- Programación de fechas, asignación de taller/proveedor y responsable.
- Cierre de mantenimiento con registro de costo final, trabajo realizado, repuestos cambiados y reprogramación sugerida para el próximo servicio preventivo.

### 6. 👥 Directorio de Personal Técnico
- Registro de cédula/DNI, nombres, teléfono, correo y especialidad.
- Monitoreo en vivo de cuántas herramientas tiene cada técnico bajo su custodia actualmente.
- Historial completo de vales y récord de devoluciones por técnico.

### 7. 📈 Reportes, Exportación a Excel y Copias de Seguridad
- **Exportación a Excel (.CSV)** con codificación **UTF-8 con BOM** (garantiza visualización correcta de tildes y ñ en Excel):
  - Inventario de Equipos
  - Historial de Préstamos y Devoluciones
  - Control de Mantenimientos y Costos
- **Copia de Seguridad (.JSON)**: Descarga un archivo de respaldo con todos tus datos y usuarios.
- **Restauración Total (.JSON)**: Carga tu copia de seguridad en cualquier momento para restaurar el sistema.
- **Datos de Demostración**: Botón para cargar ejemplos industriales preconfigurados para capacitar a tu personal.

### 8. 📥 Carga Masiva mediante Plantilla Excel (Exclusivo Administrador)
- **Plantillas Oficiales Autogeneradas**: La app genera y descarga directamente plantillas `.CSV` preformateadas para abrir en **Microsoft Excel** sin configurar asistentes de importación:
  - **Equipos y Herramientas**: `Código;Nombre;Categoría;Marca;Modelo;Número de Serie;Ubicación;Costo;Fecha Adquisición;Notas`
  - **Personal Técnico**: `Identificación (DNI/Cédula);Nombre Completo;Teléfono;Correo Electrónico;Especialidad / Cargo`
- **Previsualización y Auditoría Pre-Carga**: Al subir el archivo, la app analiza todas las filas, valida que los campos requeridos estén presentes y muestra cuántos registros son válidos y cuántos presentan errores antes de guardar.
- **Actualización Inteligente de Duplicados**: Casilla para actualizar registros existentes si el código de equipo o DNI del técnico ya existe en la base de datos, o conservarlos.
- **Sincronización en Tiempo Real con Supabase**: Si la conexión a Supabase está activa, la importación se replica instantáneamente a la nube para todos los dispositivos conectados.
- **Seguridad Estricta de Acceso**: La función está restringida exclusivamente a usuarios con rol `admin`. Los usuarios con rol `almacen` o `consulta` no pueden ver los botones de carga ni ejecutar importaciones.

---

## ⚡ Conexión a la Nube con Supabase (PostgreSQL en Tiempo Real)

**ToolMaster Pro** cuenta con integración completa a **Supabase**, permitiendo que varios usuarios y almacenes trabajen simultáneamente desde cualquier computadora o dispositivo móvil con sincronización en vivo mediante WebSockets.

### 📋 Pasos para conectar Supabase en 2 minutos:

1. **Crear tu Proyecto en Supabase**:
   - Ingresa a [https://supabase.com](https://supabase.com) y crea una cuenta o inicia sesión.
   - Crea un nuevo proyecto (ej. `toolmaster-control`).
2. **Crear las Tablas y Políticas de Seguridad (RLS)**:
   - En el menú lateral izquierdo de Supabase, entra al **SQL Editor**.
   - Haz clic en **New query**.
   - Abre el archivo `supabase_schema.sql` ubicado en esta carpeta, copia todo su contenido, pégalo en el SQL Editor de Supabase y pulsa **Run**.
   - ¡Listo! Se crearán automáticamente las 6 tablas (`company`, `users`, `tools`, `technicians`, `loans`, `maintenances`), las políticas de seguridad y la suscripción Realtime activa.
3. **Obtener las Credenciales del Proyecto**:
   - Ve a **Project Settings > Data API** (o API).
   - Copia la **Project URL** (ej: `https://xyzabcdefg.supabase.co`).
   - Copia la **Project API Key** con etiqueta `anon` / `public`.
4. **Conectar en la Aplicación**:
   - **Opción A (Desde la Aplicación en Vivo / Vercel)**:
     - Haz clic en el botón **🟡 Base de Datos Nube (Supabase)** en la pantalla de login o en la barra superior.
     - Pega la URL y la Anon Key y presiona **Probar y Conectar a Supabase**.
     - Pulsa **Subir Datos Locales a Supabase** para migrar tu inventario a la nube con 1 clic.
   - **Opción B (Preconfiguración en código)**:
     - Abre el archivo `supabase-config.js` y coloca tu `url` y `anonKey`. Al subir los cambios a GitHub/Vercel, todos tus usuarios quedarán automáticamente conectados a la nube.

---

## 📱 Aplicación Web Progresiva (PWA Instalable)

**ToolMaster Pro** está construida bajo el estándar **PWA (Progressive Web App)**, lo que permite instalarla como si fuera una aplicación nativa en cualquier dispositivo sin necesidad de descargarla de Google Play o App Store:

- **En Android (Chrome / Edge)**: Al abrir la web en Vercel, aparecerá el botón **"Instalar App"** o puedes ir a los 3 puntos (⋮) de Chrome y tocar **"Instalar aplicación"**. Se agregará a tu pantalla de inicio con su ícono y abrirá a pantalla completa.
- **En iPhone / iPad (Safari)**: Abre tu web en Safari, presiona el botón **Compartir** (cuadrado con flecha hacia arriba) y selecciona **"Agregar a pantalla de inicio"**.
- **En Windows y Mac (Chrome / Edge)**: Verás el ícono de instalación en la barra de direcciones o el botón **"Instalar App"** en el encabezado. Se ejecutará en su propia ventana sin barra de navegador.
- **Soporte Offline**: El Service Worker (`sw.js`) almacena en caché la interfaz, librerías y estilos para que funcione incluso en sótanos o zonas de obra sin señal celular.

---

## 📂 Estructura de Archivos del Proyecto

```
control-equipos/
├── index.html            # Interfaz de usuario completa, login, vistas y modales PWA
├── app.js                # Lógica Vue 3, autenticación, mappers, Supabase y registro PWA
├── styles.css            # Estilos CSS, tema verde claro y diseño de impresión de vales
├── manifest.json         # Manifiesto oficial PWA (nombre, colores, tema, iconos)
├── sw.js                 # Service Worker con soporte offline y caché inteligente
├── supabase_schema.sql   # Script SQL con tablas, RLS, Realtime y seed data
├── supabase-config.js    # Archivo opcional para preconfigurar URL y Anon Key
├── iniciar_app.bat       # Acceso directo para iniciar la aplicación en Windows
├── README.md             # Documentación y guía de uso
├── icons/                # Íconos de alta resolución en todos los tamaños para PWA
│   ├── icon-32.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   ├── icon-maskable-512.png
│   └── icon.svg
└── lib/                  # Librerías locales para funcionamiento offline
    ├── vue.global.prod.js
    ├── tailwind.js
    └── supabase.js       # SDK cliente de Supabase JS v2
```
