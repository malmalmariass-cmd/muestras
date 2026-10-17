# Herramientas de desarrolladora, base de datos y respaldos

## 1. Activar las herramientas (una vez)

En hPanel → Administrador de archivos → `api/config.php`, añade una línea al final:

```php
define('DEV_PIN', 'TU-PIN-DE-DESARROLLADORA');
```

- El PIN **solo** vive en `config.php`, en el servidor. No aparece en el panel, en la app ni en GitHub.
- El servidor lo comprueba en cada acción. 5 intentos fallidos bloquean las herramientas 1 hora.
- Aprovecha y revisa en el mismo archivo que diga `define('DB_HOST', 'localhost');`.

## 2. La barra de desarrolladora (panel del supervisor)

- **Settings → Developer → 🛠 Developer tools** → PIN de desarrolladora → **Turn on / Turn off**.
- Mientras están **encendidas** aparece una **barra naranja** debajo del menú en todas las pantallas:
  **Load test · Reset data · Export data · Turn off**. Al apagarlas, la barra desaparece y el servidor
  rechaza borrar y la prueba de carga, aunque alguien tenga el PIN. Quedan registradas en el Activity log.

### Load test
Simula N técnicos (TEST01, TEST02…) usando la app a la vez: entran, descargan clientes/inventario/
trabajos, sincronizan cada ~30 s y envían reportes con dos firmas. Muestra en vivo peticiones por minuto,
errores y tiempos de respuesta, y al final un veredicto (✓ bien / ⚠ lento / ✗ no aguanta). No envía correos.

### Reset data
Borra de una vez en el servidor, eligiendo qué:
clientes · reportes de servicio · ventas y facturas (con sus pagos) · trabajos · solicitudes de partes y
pedidos a proveedores · técnicos de prueba TEST… y sus reportes · desactivar los demás técnicos ·
archivar el inventario · número de la próxima factura.
Los supervisores nunca se borran y las cantidades de inventario no se tocan. Pide escribir `RESET`.

### Export data
Un Excel con una hoja por cada parte de la app: clientes, reportes, partes de reportes, facturas, líneas de
factura, pagos, solicitudes de partes, pedidos a proveedores, inventario, movimientos de stock, trabajos,
empleados y registro de actividad. (Sin las imágenes de las firmas; el respaldo `.sql` sí las tiene.)
También está siempre en **Settings → Security & backup → Export all data (Excel)** con el PIN de supervisor,
aunque las herramientas estén apagadas.

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

1. `api/config.php`: `DB_HOST` = `localhost` y la línea `DEV_PIN`.
2. Sube los archivos del paquete.
3. Settings → **Download full backup (.sql)**.
4. Developer tools → PIN → **Turn on** → **Load test**: primero 10 técnicos / 3 minutos, luego 50 / 10.
5. Mientras corre, usa la app en una tablet real.
6. **Reset data** (reportes, ventas, trabajos, solicitudes, técnicos de prueba) → `RESET`.
7. **Turn off** al terminar.
