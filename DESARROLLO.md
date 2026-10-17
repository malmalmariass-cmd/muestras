# Herramientas de desarrolladora y prueba de carga

## 1. El error "Cannot connect to the database (check DB_HOST…)"

Pasó a mitad de la importación: los primeros clientes entraron y los siguientes fallaron. Es el patrón
del límite de **conexiones por hora** de MySQL en Hostinger: unas **500 conexiones por hora** por usuario
de base de datos cuando la app se conecta por nombre de servidor o IP, y no por `localhost`. Cada
petición de la app abre una conexión, así que unas decenas de clientes importados, sumadas a las
tablets sincronizando, lo agotan.

**Arreglo (5 minutos, en hPanel → Archivos → Administrador de archivos → `api/config.php`):**

```php
define('DB_HOST', 'localhost');   // no la IP ni "srvXXX.hstgr.io"
```

Hostinger recomienda exactamente esto para este error. Con `localhost` la conexión es local y ese límite
deja de aplicar. **Es imprescindible antes de la prueba de 50 técnicos**: 50 tablets sincronizando cada
30 s hacen unas 6 000 peticiones por hora.

Si después de cambiarlo sigue fallando, en phpMyAdmin → SQL ejecuta `SHOW PROCESSLIST;` y mándame el
mensaje exacto del error (en `api/api.php` se puede registrar el error real de PDO en un log privado).

Cambios en la app para no repetirlo:
- La importación ahora va **de uno en uno** y **reintenta** (1,5 s, 6 s, 13,5 s) si el servidor falla.
- Si fallan 3 seguidos, **se pausa** en vez de seguir gastando conexiones, y deja un botón para
  reintentar solo los que faltaron. Volver a importar el mismo archivo tampoco duplica nada.

## 2. Herramientas de desarrolladora (panel → Settings → Developer)

Se desbloquean con el **PIN de desarrolladora**. 5 intentos fallidos bloquean 15 minutos.

### Prueba de carga (Load test)
Simula N técnicos desde tu navegador haciendo lo mismo que la app de la tablet: entrar, descargar
clientes/inventario/trabajos, sincronizar cada 24–36 s y enviar reportes con dos firmas.
- Crea o reactiva solos a **TEST01 … TEST50** con un PIN aleatorio nuevo en cada prueba.
- Los técnicos van entrando durante los primeros ~30 s, como en la vida real.
- Muestra en vivo: técnicos conectados, peticiones por minuto, errores, y tiempos por acción
  (promedio, el 95 % responde en menos de…, el más lento), con los mensajes de error agrupados.
- Veredicto al final: ✓ bien (sin errores, 95 % en < 3 s), ⚠ lento, o ✗ el servidor no aguanta.
- **No envía correos** (Hostinger limita los envíos por día).

### Borrar datos (Reset data)
Borra de una vez: reportes, facturas, trabajos, clientes (opcional), inventario (se archiva),
técnicos de prueba TEST… o todos los técnicos (se desactivan), y fija el próximo número de factura.
Pide tu PIN de supervisor (el servidor lo exige para borrar reportes y facturas), escribir `RESET`,
y ofrece descargar una copia de seguridad antes.

**Hoy funciona sin cambiar el servidor**: borra elemento por elemento con las mismas acciones que ya
usa el panel. Las copias de los reportes y facturas borrados quedan en el Activity log.
Las **solicitudes de partes** y los **pedidos a proveedores** no se pueden borrar desde el panel; para
eso, y para que el borrado sea instantáneo, añade al servidor el código de abajo.

### Sobre el PIN 2324
- Mientras el servidor no tenga `dev_check`, el panel compara el PIN con una huella (hash) guardada en
  `admin.html`. **El 2324 no aparece escrito** en el código, pero un PIN de 4 dígitos se puede adivinar
  probando las 10 000 combinaciones contra esa huella. Como estas herramientas solo hacen en bloque lo
  que un supervisor ya puede hacer uno por uno, no da poderes nuevos a nadie; aun así, la protección
  real es que el servidor compruebe el PIN (abajo).
- Cuando termines las pruebas, desactiva las herramientas: `DEV_TOOLS_ENABLED` en `false`.

## 3. Código para `api/api.php` (añadir cuando me pases ese archivo)

En `api/config.php` (fuera del alcance del navegador):

```php
define('DEV_TOOLS_ENABLED', true);   // false cuando termine la etapa de pruebas
define('DEV_PIN_HASH', '$2y$10$...'); // password_hash('2324', PASSWORD_DEFAULT) — nunca el PIN en texto
```

En `api/api.php`, dentro del `switch ($action)`:

```php
case 'dev_check':
case 'dev_reset':
    if (!DEV_TOOLS_ENABLED) out(['ok' => false, 'error' => 'Developer tools are off'], 403);
    require_supervisor($user);
    // máx. 5 intentos fallidos por hora por usuario → "locked"
    if (dev_attempts($user) >= 5) out(['ok' => false, 'error' => 'Developer PIN locked for 1 hour'], 429);
    if (!password_verify((string)($in['pin'] ?? ''), DEV_PIN_HASH)) { dev_fail($user); out(['ok' => false, 'error' => 'Wrong developer PIN'], 403); }
    if ($action === 'dev_check') out(['ok' => true, 'dev' => true]);

    $w = $in['wipe'] ?? []; $deleted = [];
    $pdo->beginTransaction();
    // ⚠ Adaptar los nombres de las tablas a los reales de la base de datos
    if (!empty($w['reports']))   { $deleted['reports']   = $pdo->exec('DELETE FROM reports'); }
    if (!empty($w['invoices']))  { $deleted['invoices']  = $pdo->exec('DELETE FROM invoices'); $pdo->exec('DELETE FROM invoice_lines'); $pdo->exec('DELETE FROM payments'); }
    if (!empty($w['jobs']))      { $deleted['jobs']      = $pdo->exec('DELETE FROM jobs'); }
    if (!empty($w['reports']) || !empty($w['jobs'])) { $pdo->exec('DELETE FROM parts_requests'); $pdo->exec('DELETE FROM orders'); }
    if (!empty($w['customers'])) { $deleted['customers'] = $pdo->exec('DELETE FROM customers'); }
    if (!empty($w['inventory'])) { $deleted['inventory'] = $pdo->exec('UPDATE inventory SET active = 0'); }
    if (!empty($w['testTechs'])) { $deleted['testTechs'] = $pdo->exec("DELETE FROM employees WHERE role = 'tech' AND code LIKE 'TEST%'"); }
    if (!empty($w['allTechs']))  { $deleted['techs']     = $pdo->exec("UPDATE employees SET active = 0 WHERE role = 'tech'"); }
    if (!empty($in['nextInvoice'])) { /* actualizar el contador de facturas igual que settings_save */ }
    $pdo->commit();
    audit($user, 'developer_reset', json_encode($deleted));   // queda registrado quién y cuándo
    out(['ok' => true, 'dev' => true, 'deleted' => $deleted]);
```

Los supervisores nunca se borran, así que no te puedes quedar fuera del sistema.

## 4. Plan para la prueba de mañana

1. Cambia `DB_HOST` a `localhost` (sección 1).
2. Sube `index.html`, `admin.html` y la carpeta `vendor/` completa.
3. Panel → Settings → **Download full backup** (por si acaso).
4. Panel → Settings → Developer → PIN → **Load test**: empieza con **10 técnicos, 3 minutos**.
   Si sale ✓, repite con **50 técnicos, 10 minutos**.
5. Mientras corre, abre la app en una tablet real y usa todo normal: así ves cómo se siente.
6. Mira el veredicto y los errores. Si aparece algo, hazle captura y mándamela.
7. **Reset data** → marca Service reports, Invoices, Jobs y Test technicians → tu PIN de supervisor →
   `RESET` → pon el próximo número de factura que quieras para empezar en limpio.

Lo que puede limitar a 50 usuarios en Hostinger Business (además de las conexiones por hora):
procesos PHP simultáneos y CPU del plan. Si el resultado es ⚠ lento, hPanel → **Uso de recursos**
muestra cuál se llenó durante la prueba.
