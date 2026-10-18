# Herramientas de desarrolladora, base de datos y respaldos

## 1. Activar las herramientas (una vez)

En hPanel → Administrador de archivos → abre `api/api.php`. Arriba del todo (línea 12) está:

```php
const DEV_PIN_AQUI = '';
```

Escribe tu PIN entre las dos comillas (sin borrar las comillas ni el `;`) y guarda.

- El PIN solo vive en el servidor. No aparece en el panel, en la app ni en GitHub (`api.php` no se sube al repositorio).
- También sirve `define('DEV_PIN', '…');` en `config.php`; si hay PIN en los dos sitios, manda el de `api.php`.
- Al subir un `api.php` nuevo, vuelve a escribir el PIN en esa línea.
- El servidor lo comprueba en cada acción. 5 intentos fallidos bloquean las herramientas 1 hora.
- Aprovecha y revisa en el mismo archivo que diga `define('DB_HOST', 'localhost');`.

## 2. La barra de desarrolladora (panel del supervisor)

- **Settings → Developer → 🛠 Developer tools** → PIN de desarrolladora → **Turn on / Turn off**.
- Mientras están **encendidas** aparece una **barra naranja** debajo del menú en todas las pantallas:
  **Load test · Reset data · Export data · Turn off**. Al apagarlas, la barra desaparece y el servidor
  rechaza borrar y la prueba de carga, aunque alguien tenga el PIN. Quedan registradas en el Activity log.
- **Siempre empiezan apagadas.** Solo quedan encendidas para la sesión que las encendió: al salir, al cerrar la
  pestaña o al cerrarse la sesión por inactividad, se apagan solas. Otro supervisor nunca las ve encendidas.

### Load test
Simula personas usando la app a la vez desde tu navegador:
- **Técnicos (TEST01…)**: entran, descargan todo (clientes, inventario, servicios, trabajos, solicitudes,
  historial), sincronizan cada ~30 s y recorren Jobs / Parts requests / History. **Cada periodo** (por defecto
  3 min) envían un **Fill Service Report** y un **Equipment Service Report** con dos firmas, consultan el
  historial del equipo y mandan una **solicitud de partes** (una parte del stock y una a pedir).
- **Supervisores (TESTSUP1…)**: recorren todas las pestañas del panel (reportes, trabajos, facturas,
  solicitudes y pedidos, clientes, inventario, equipos, estadísticas, empleados, ajustes), abren registros y
  **contestan las solicitudes de partes** con una cotización. Al terminar la prueba se desactivan solos.
- Muestra en vivo peticiones por minuto, errores, tiempos, reportes por tipo y solicitudes, y al final un veredicto
  (✓ bien / ⚠ lento / ✗ no aguanta). No envía correos.

**Verlo en pantalla y grabar un tutorial.** En *Show on screen* elige **A technician** o **A supervisor**. Al
empezar se abre una ventana nueva con la app real, donde TEST01 (o TESTSUP1) hace todo su proceso paso a paso,
con un círculo naranja que marca cada toque y un letrero con lo que está haciendo. Para el tutorial:
**Tutorials → Start recording** → comparte **esa ventana**. Los pasos de la guía se anotan solos. Si la ventana
no se abre, permite las ventanas emergentes (pop-ups) para tu dominio.

Si muchas personas entran en el mismo segundo, MySQL de Hostinger puede rechazar una conexión por un instante.
El servidor reintenta solo, hasta 5 veces en ~2 s. Si aun así está ocupado, responde **"Server busy"** (503) y la
tablet guarda el trabajo y lo reenvía sola unos segundos después. La prueba de carga hace lo mismo y lo muestra
como **"retried when busy"**: eso no es un error. Solo cuenta como error lo que falla después de 3 reintentos.

### Reset data
Borra de una vez en el servidor, eligiendo qué:
clientes · reportes de servicio · ventas y facturas (con sus pagos) · trabajos · solicitudes de partes y
pedidos a proveedores · cuentas de prueba TEST… y TESTSUP… y sus reportes · desactivar los demás técnicos ·
archivar el inventario · número de la próxima factura.
Los supervisores reales nunca se borran (solo los de prueba TESTSUP…) y las cantidades de inventario no se tocan. Pide escribir `RESET`.

### Export data
Un Excel con una hoja por cada parte de la app: clientes, reportes, partes de reportes, facturas, líneas de
factura, pagos, solicitudes de partes, pedidos a proveedores, inventario, movimientos de stock, trabajos,
empleados y registro de actividad. (Sin las imágenes de las firmas; el respaldo `.sql` sí las tiene.)
También está siempre en **Settings → Security & backup → Export all data (Excel)** con el PIN de supervisor,
aunque las herramientas estén apagadas.

### Tutorials (crear tutoriales de uso)
Graba un tutorial mientras usas la app, también durante una prueba de carga:
1. Developer tools → **Tutorials** → título (p. ej. "Cómo llenar un reporte") → opcional **Record my voice**.
2. **● Start recording**. El navegador pregunta qué compartir: **esta pestaña** para un tutorial del panel, o
   **Pantalla completa / Ventana** si también vas a usar la app del técnico (botón *Open the technician app in a
   new tab*; entra con un técnico de prueba).
3. Usa la app normalmente. La barra naranja muestra **● REC**, el tiempo y los pasos anotados.
4. **■ Stop** → revisa la lista de pasos (cada uno con su captura), corrige el texto o borra los que sobren.
5. **Download the guide** (HTML con logo, pasos numerados y capturas; se abre en cualquier navegador y se
   imprime a PDF) y **Download the video**.

Los pasos se escriben solos: "Toca «Customers»", "Escribe «ACME» en «Customer name»", "Marca «Frequent»"…
Los PIN nunca se anotan. Funciona en Chrome o Edge en computadora (las tablets no permiten grabar la pantalla).

## Sesiones: una por pestaña
- Cada pestaña o ventana tiene **su propia sesión**: en una puedes tener el panel del supervisor y en otra la app
  del técnico, al mismo tiempo.
- Al **cerrar la pestaña o la app** la sesión se cierra: al volver a abrir el enlace aparece la pantalla de inicio.
  Recargar la página (F5) no cierra la sesión.
- Para el técnico esto significa que **necesita internet para entrar** cada vez que abre la app. Los reportes a
  medio llenar y los no enviados se quedan guardados en la tablet y se recuperan al entrar.

## Cierre de sesión por inactividad
- La sesión (técnico y supervisor) se cierra sola tras **2 horas sin usar la app** (sin tocar la pantalla,
  hacer clic ni escribir). Las sincronizaciones automáticas no cuentan como uso.
- El servidor también lo comprueba: una sesión abandonada deja de servir aunque alguien copie su token.
- Los reportes que no se enviaron se quedan en la tablet y se envían al volver a entrar.
- Para cambiar el tiempo: en `api/config.php`, `define('SESSION_IDLE_MINUTES', 120);`.
- No se cierra en medio de una prueba de carga ni mientras grabas un tutorial.

## 3. ¿Qué pasa si se llena la base de datos?

Hostinger pone un tope de unos **3 GB por base de datos**. **Settings** muestra ahora el tamaño actual
("Database size: … of about 3 GB") y avisa en rojo al pasar el 70 %.

Si se llena, el servidor deja de poder **guardar** nada nuevo:

| Qué | Qué pasa |
|---|---|
| Reportes de las tablets | **No se pierden**: se quedan guardados en la tablet y reintentan solos, pero no llegan a la oficina, no reciben número de factura y no sale la copia por correo. |
| Iniciar sesión | **Falla**: cada inicio de sesión guarda un registro. Quien ya tiene la sesión abierta sigue viendo datos. |
| Facturas, clientes, inventario, trabajos | No se pueden crear ni cambiar desde el panel. |
| Ver, buscar, exportar | Sigue funcionando. |

Cómo evitarlo, en este orden:
1. Vigilar el tamaño en Settings (una vez al mes).
2. Las firmas son casi todo el peso (~75 KB por reporte). La solución definitiva es guardarlas como
   archivos aparte en el servidor; dímelo cuando quieras hacerlo.
3. Una vez al año: exportar a Excel + respaldo `.sql`, y archivar los reportes viejos en otra base de datos.

## 4. Respaldos: qué hacer para no perder nada

**Rutina**
1. **Automático (Hostinger):** el plan Business incluye copias automáticas de archivos y base de datos.
   Compruébalo en hPanel → Archivos → **Copias de seguridad**.
2. **Cada semana:** panel → Settings → **Download full backup (.sql)** (pide tu PIN de supervisor) y
   **Export all data (Excel)**. Guarda ambos fuera del hosting (Google Drive o tu computadora).
3. **Antes de subir cualquier cambio** (`index.html`, `admin.html`, `api.php`): descarga primero los
   archivos actuales y un respaldo `.sql`.

**Si algo sale mal**

| Problema | Qué hacer |
|---|---|
| Un archivo nuevo rompió la app | Vuelve a subir el archivo anterior. Los datos no se tocan. |
| Se borraron datos por error | hPanel → Copias de seguridad → restaurar **solo la base de datos** del día anterior. O phpMyAdmin → Importar el último `.sql`. |
| Se perdió todo el hosting | Sube de nuevo los archivos, abre la app una vez (crea las tablas) y luego phpMyAdmin → Importar el `.sql`. |
| Una tablet se rompió | Los reportes ya sincronizados están en el servidor. Solo se pierde lo que no llegó a sincronizar. |

Prueba la restauración una vez, con calma, en una base de datos de prueba. Así sabrás hacerlo el día que haga falta.

## 5. Plan para la prueba de carga

1. `api/config.php`: `DB_HOST` = `localhost`. `api/api.php`: tu PIN en `DEV_PIN_AQUI`.
2. Sube los archivos del paquete.
3. Settings → **Download full backup (.sql)**.
4. Developer tools → PIN → **Turn on** → **Load test**: primero 10 técnicos + 2 supervisores / 3 minutos, luego 50 + 5 / 10.
5. Mientras corre, usa la app en una tablet real.
6. **Reset data** (reportes, ventas, trabajos, solicitudes, técnicos de prueba) → `RESET`.
7. **Turn off** al terminar.
