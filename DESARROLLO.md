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
  3 min) envían un **Field Service Report** y un **Equipment Service Report** con dos firmas, consultan el
  historial del equipo y mandan una **solicitud de partes** (una parte del stock y una a pedir).
- **Supervisores (TESTSUP1…)**: recorren todas las pestañas del panel (reportes, trabajos, facturas,
  solicitudes y pedidos, clientes, inventario, equipos, estadísticas, empleados, ajustes), abren registros y
  **contestan las solicitudes de partes** con una cotización. Al terminar la prueba se desactivan solos.
- Muestra en vivo peticiones por minuto, errores, tiempos, reportes por tipo y solicitudes, y al final un veredicto
  (✓ bien / ⚠ lento / ✗ no aguanta). No envía correos.
- **Recorrido de cada persona:**
  - *On screen*: a qué hora **abrió y cerró sesión**, cuánto tiempo estuvo, cuántas veces **tocó la pantalla**
    (movimientos del cursor), cuántas rondas hizo, y la lista de **estaciones** por las que pasó (pantalla o paso:
    "Signatures", "Requesting parts", "Invoices"…) con la hora y el tiempo en cada una.
  - *Simulated people*: para cada técnico y supervisor simulado, entrada, salida, tiempo conectado y las
    estaciones visitadas con cuántas veces.

**Verlo en pantalla y grabar un tutorial.** En *Show on screen* elige **A technician** o **A supervisor**. Al
empezar se abre una ventana nueva con la app real, donde TEST01 (o TESTSUP1) hace todo su proceso paso a paso,
con un círculo naranja que marca cada toque y un letrero con lo que está haciendo. Para el tutorial:
**Tutorials → Start recording** → comparte **esa ventana**. Los pasos de la guía se anotan solos. Si la ventana
no se abre, permite las ventanas emergentes (pop-ups) para tu dominio.

**Bloqueo del hosting (HTTP 403).** Todas las personas simuladas salen de **tu computadora, con una sola
conexión a internet**. La protección de Hostinger (Imunify360) bloquea por un rato una conexión que manda
demasiadas peticiones por minuto. Las tablets reales no tienen ese problema: cada una sale con su propia conexión.
- La prueba lo detecta y lo separa: *"blocked by the hosting"* (con el mensaje del hosting) no cuenta como error
  de la app. Dice **a cuántas peticiones por minuto** empezó el bloqueo y se **pausa 60 s** en vez de insistir
  (insistir alarga el bloqueo).
- Para medir la app sin que el hosting bloquee: pon **Max. requests per minute** un 30 % por debajo de ese
  número (la prueba te lo sugiere). Las personas entran repartidas en el primer tercio de la prueba, como en la vida real.
- Otras opciones: correr la mitad de la prueba desde otra red (por ejemplo, el celular como hotspot), o pedir al
  soporte de Hostinger que permita tu IP durante las pruebas.
- Si después de una prueba la página no abre desde tu computadora, es ese bloqueo: espera 15–60 minutos o usa otra red.
- La app del técnico trata ese 403 como "sin conexión": el reporte se queda en la tablet y se reenvía solo.

Si muchas personas entran en el mismo segundo, MySQL de Hostinger puede rechazar una conexión por un instante.
El servidor reintenta solo, hasta 5 veces en ~2 s. Si aun así está ocupado, responde **"Server busy"** (503) y la
tablet guarda el trabajo y lo reenvía sola unos segundos después. La prueba de carga hace lo mismo y lo muestra
como **"retried when busy"**: eso no es un error. Solo cuenta como error lo que falla después de 3 reintentos.

### Reset data
Borra de una vez en el servidor, eligiendo qué:
clientes · reportes de servicio · ventas y facturas (con sus pagos) · trabajos · solicitudes de partes y
pedidos a proveedores · cuentas de prueba TEST… y TESTSUP… y sus reportes · desactivar los demás técnicos ·
archivar el inventario · número de la próxima factura.
Los supervisores reales nunca se borran (solo los de prueba TESTSUP…) y las cantidades de inventario no se tocan.
La opción **Start a new number series** hace que la numeración empiece de nuevo como 1-001 (ver "Números"). Pide escribir `RESET`.

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

## Números de reporte y factura
- Reportes y facturas comparten **un solo contador** en el servidor, para todas las cuentas (técnicos y
  supervisores): un número nunca se repite.
- **Se reserva al empezar el reporte.** En cuanto el técnico escribe algo (con internet), el reporte recibe su
  número y lo muestra arriba ("Número #0046 reservado"). Ese número es suyo hasta que lo guarde. Sin internet,
  el número llega al sincronizar.
- Si un reporte se borra sin guardarse, o pasa 24 horas sin guardarse, su número pasa al **siguiente reporte
  que se empiece**, para que no queden huecos. Por eso, alguna vez, un reporte nuevo puede tener un número
  algo menor que el anterior.
- **Series después de un reset de prueba.** En *Reset data* está marcada la opción **Start a new number series**:
  después del primer reset la numeración empieza en **1-001, 1-002…**, después del segundo en **2-001…**, y así.
  Los números viejos (0045…) no se tocan. En *Settings* se ve la serie actual y el próximo número. Si quieres que
  la nueva serie empiece en otro número, escríbelo en *Next invoice number after the reset*.

## Orden de trabajo y código de documento
- La **orden de trabajo (Work order #)** es el número que el sistema le da al reporte. En la tablet se llena sola y
  no se escribe a mano. Lo que estuviera escrito ahí antes (por ejemplo el PO del cliente) se guarda como
  *Customer reference*.
- Cada documento lleva un **código**: siglas del cliente, número de orden de trabajo y fecha (todo en números menos
  las siglas). Ejemplo: **AC-0046-20261018** = ACME Construction, orden 0046, 18 de octubre de 2026.
  - Siglas: la primera letra de cada palabra (hasta 4), sin "LLC", "Inc", "Corp", "de", "la"…; si el nombre es de una
    sola palabra, sus primeras 4 letras (Beta Corp → BETA).
  - El reporte y **todas sus facturas** comparten el inicio (**AC-0046**), aunque se hagan en fechas distintas: es
    su "carpeta". Buscar "AC-0046" en Reports o en Invoices trae todo lo de esa orden.
- **Al crear una factura hay que elegir la orden de trabajo** (el reporte de servicio). Si se crea desde el reporte
  ya viene elegida. Para una venta sin reporte se elige *Sale without a service report*: entonces la orden es el
  número de la propia factura.
- El código aparece en: la lista y el detalle de reportes y facturas, el campo *Reference* de la factura (si se deja
  vacío), el asunto de los correos (`[AC-0046-20261018]`) y el nombre de los PDF enviados por correo
  (`AC-0046-20261018_ServiceReport.pdf`, `AC-0046-20261025_Invoice-0051.pdf`) y del zip semanal.
- Los PDF que se **descargan o comparten** desde la tablet o el panel también se llaman con el código
  (`AC-0046-20261018_ServiceReport.pdf`, `AC-0046-20261025_Invoice-0051.pdf`) y lo muestran en la primera página
  (el reporte, debajo del número; la factura, encima de "Bill to", junto a la orden de trabajo). Lo hace el archivo
  `pdf-codes.js`, que se carga después de `pdf.js` (este no se toca).

## Enviar al cliente: elegir el contacto
- Al tocar **Send / PDF** (técnico) o **Email / WhatsApp** de una factura o reporte (panel) aparece la lista de
  contactos del cliente registrado: el principal y los **otros contactos**. Se toca uno y se envía.
- **+ Agregar un contacto**: nombre, correo y/o WhatsApp. Se usa en ese momento y queda guardado en el cliente
  (agregar no cambia nada de lo que ya tenía; si el cliente aún no está registrado, solo se usa para ese envío).
- En el panel, **Customers → (cliente) → Other contacts** se ven, cambian o quitan.
- Todos los correos llevan copia oculta a la oficina (ver `SEGURIDAD.md`).

## Resumen diario para la oficina (un solo correo al día)
- Ya **no** llega un correo por cada reporte o factura. Cada mañana desde las **7:00** llega a
  info@cherservices.com y cherservices21@gmail.com **un correo** con todo lo del día anterior (reportes y facturas):
  una tabla, un **Excel** (.xlsx) con los datos generales y, en cada línea, un enlace **Download PDF**.
- Los días sin movimiento no se manda nada.
- Settings → **Daily summary for the office**: *Send yesterday's summary now* / *Send today so far*.
- Cron (opcional, para que salga aunque nadie use la app temprano): `curl -s "https://TU-DOMINIO/api/api.php?cron=all"`
  todos los días a las 7:05 (hace el diario y, los lunes, el semanal).
- Si algún día quieres además un correo por documento: `define('OFFICE_COPY_EACH', true);` en `config.php`.

## Enlaces de los PDF (WhatsApp y resumen diario)
- El enlace abre una página de Cher Services con un **botón grande "Download PDF"**, la opción de abrirlo en el
  navegador y una vista previa. El archivo descargado se llama con el código del documento
  (`ACME-0046-20261018_ServiceReport.pdf`).
- Los enlaces viejos (`doc.php?t=…`) siguen funcionando como antes.

## Reportes vacíos o duplicados
- El servidor marca un reporte como **vacío** (nada escrito: ni fallas, ni servicios, ni partes, ni notas, ni firmas) o
  **posible duplicado** (mismo cliente, mismo día, mismo tipo y misma máquina que otro reporte anterior).
- El panel lo avisa: contador en **Reports & Jobs**, mensaje emergente y un recuadro con **Open · Keep · Delete**
  (borrar pide PIN y motivo, y queda en el Activity log). *Keep* quita el aviso para siempre.
- **Check all reports for empty or duplicate ones** revisa también los reportes guardados antes de esta versión.

## Mensajes emergentes
- Duran 5 segundos más un poco por cada palabra (hasta 15 s). Tocarlos los cierra.

## Copia semanal de los reportes (automática)
- Cada **lunes desde las 7:00** (hora de Florida) llega a **info@cherservices.com** y
  **cherservices21@gmail.com** un correo con los reportes de la semana anterior: resumen, una lista que abre en
  Excel y los **PDF firmados en un .zip** (si pesan mucho, llegan en varios correos).
- Se envía con el primer uso de la app del lunes. Para que salga aunque nadie use la app, crea un *Cron Job* en
  hPanel → Avanzado → Cron Jobs: lunes, 7:05, comando
  `curl -s "https://TU-DOMINIO/api/api.php?cron=weekly"` (no se manda dos veces la misma semana).
- **Settings → Weekly copy of the reports**: muestra la última enviada y tiene **Send last week's copy now** /
  **Send this week so far** para mandarla a mano.
- Los PDF se guardan en `api/files/reports/` (cerrada a la web) durante 6 semanas. Los reportes en sí quedan
  para siempre en la base de datos.
- Otras direcciones: `define('WEEKLY_TO', 'a@..., b@...');` en `config.php`.

## Trabajo sin guardar: 24 horas y avisos
- **Técnico:** un reporte que se empezó y no se guardó muestra una franja naranja arriba: *"no está guardado
  (empezado 9:40). Guárdalo: si no, se borra solo en 23 h"*, con **Abrir · Guardar** (el técnico no borra nada;
  "Nuevo" guarda primero el reporte actual). Cada 30 minutos
  vuelve a avisar (y con notificación si la app está en segundo plano y la tablet lo permite). A las **24 horas**
  se borra solo y su número reservado pasa al siguiente reporte.
- **Supervisor:** una factura que se cerró sin guardar queda como borrador en ese navegador con la misma franja
  (**Open · Delete**), avisos cada 30 minutos y borrado a las 24 horas. Abrir una factura y cerrarla sin cambios no
  cuenta.
- Lo **guardado pero sin enviar** (sin internet) nunca se borra: se queda en la tablet hasta que llega a la oficina.

## Firma del supervisor: el trabajo se completa cuando firma
- En el panel, Reports & Jobs → abrir un reporte → **✍ Sign as supervisor** (si aún no ha firmado).
- La columna **Signatures** muestra T (técnico), C (cliente) y S (supervisor). Con las tres aparece **✔ Approved**.
- Filtros: "Waiting for my signature" y "Approved". El trabajo (job) pasa a *Done* solo con la firma del cliente **y** del supervisor.

## Listas de clientes (y proveedores) con ▼
Toda casilla de cliente o proveedor (`combo.js`) deja escribir para filtrar **o** tocar ▼ para ver la lista completa.
Las opciones salen de los mismos `<datalist>` de siempre.

## Factura a nombre de una empresa, para una persona de contacto
En **New invoice**: "A person pays for a company we already serve". Se elige la empresa de la lista (▼) y se escribe la persona
(nombre, correo, WhatsApp). La factura sale a nombre de la empresa con **Attn: persona**, se le envía a esa persona,
y queda guardada como contacto más de la empresa. Si se escribe un nombre nuevo, aparece el atajo
"Works for a company we serve? Bill the company". La orden de trabajo se elige entre los reportes de la empresa.

## Trabajos (jobs) y citas
- Solo el supervisor crea trabajos. El técnico **ve** el trabajo (instrucciones, dirección con mapa, equipo, contacto) y desde ahí
  elige *Service report* o *Equipment service*.
- **Received**: fecha y hora en que el cliente llamó. **Appointment date/time**: la cita.
- Colores en la app del técnico y en el panel: **amarillo = mañana**, **verde = hoy**.
- El técnico puede **aplazar** (otra hora, mismo día), **reprogramar** (hasta 1 mes; más lejos lo hace la oficina)
  y **pedir cancelar** (con motivo). La cancelación la aprueba o rechaza el supervisor en el trabajo (aviso en la pestaña).
- **Recordatorio por WhatsApp**: si el cliente dio su WhatsApp y permiso ("Customer agrees to WhatsApp reminders"),
  el técnico o el supervisor tocan "✆ WhatsApp reminder": se abre WhatsApp con el mensaje listo (hay que tocar Enviar).
- **Chequeo de seguimiento**: desde el reporte, "📅 Schedule follow-up check" (fecha, hora, qué revisar). Crea un trabajo con
  el **mismo número de reporte**. Ese día el técnico abre el mismo reporte (se agrega una fila de tiempo con la fecha nueva;
  aunque el reporte estuviera firmado y bloqueado, se puede trabajar ese día) y al terminar toca "Visit done".

## Solicitudes de partes: cotización → pago → factura
1. El técnico pide partes. El supervisor pone precios y **envía la cotización** (el inventario **no** se toca).
2. El técnico ve la cotización con precios y puede **verla, descargarla, enviarla por WhatsApp o correo, o imprimirla** (PDF "QUOTE").
3. Si el cliente acepta: **"Customer accepted — send payment"**: pago completo (pieza de proveedor) o parcial (pieza del taller),
   número de referencia y **foto del recibo** con la cámara. Llega al supervisor (aviso 💳).
4. El supervisor ve la foto, revisa y toca **Payment verified**: la **factura se crea sola** con el pago anotado,
   las piezas del taller salen del inventario y el técnico la ve en su pestaña (se revisa cada 30 s mientras espera).
   "Not valid" la devuelve al técnico con el motivo.
- **Approve** (cliente dijo que sí, sin pago todavía): las piezas del taller quedan **reservadas 2 horas** (+2 h, +8 h, +1 día).
  Mientras están reservadas no cuentan como disponibles. Salen del inventario cuando se hace la factura.
  (Solicitudes aprobadas antes de esta versión ya habían descontado el inventario; se respetan así.)
- Buscar por número de reporte: escribe 46, 0046 o 1-005 en la búsqueda de Parts requests. PR-0012 busca la solicitud.
- La foto se guarda 15 días (carpeta `api/files/pay`, cerrada a la web); después queda solo la referencia.
- **Verificar la referencia**: el sistema avisa si el mismo número ya se usó en otra solicitud o factura.
  Confirmar que el pago es real solo se puede en el banco / Zelle / procesador de tarjetas (no hay conexión con ellos).

## Proveedores (Vendors)
Parts & Orders → **Vendors**: nombre, contacto, teléfono, WhatsApp, correo, web, dirección, notas y número de cuenta (solo oficina).
El técnico los ve en Parts Requests → "📇 Vendors" (y al pedir una pieza a proveedor) con botones para llamar, WhatsApp, correo y web.

## Borrar empleados
Employees → **Delete** (pide tu PIN). Sin historial se borra del todo. Con reportes/facturas/solicitudes se quita de la lista y
no puede entrar, pero su nombre sigue en esos documentos; su ID queda libre. Sus trabajos pendientes quedan "sin asignar".

## Pantallas de cualquier tamaño y modo tutorial (`ui-help.js`)
- Probado en teléfono (360 px), tablet vertical y horizontal, y Chromebook (1366×768): ninguna pantalla se sale por los lados.
- En pantallas angostas, los menús (pestañas del técnico, menú del panel, sub-pestañas) quedan en **una sola fila que se desliza**.
- **"Hay más aquí"**: cuando algo queda fuera de vista aparecen flechas ‹ › y un desvanecido en el borde (menús, tablas);
  si una notificación quedó escondida, la flecha lleva un **punto rojo**. En ventanas largas aparece "▼ hay más abajo".
- **Modo tutorial**: en la pantalla de inicio de sesión, junto al idioma, la casilla "💡 Modo tutorial" (activada por defecto).
  - Cada sección muestra una tarjeta con para qué sirve y qué hacer (una vez por sesión; "Entendido" la cierra).
  - Pasando el mouse sobre un botón (o manteniendo el dedo encima en la tablet) sale una nota de lo que hace.
  - El botón **💡** arriba lo enciende o apaga en cualquier momento; queda guardado en ese dispositivo.
  - Los textos van en el idioma elegido (inglés o español). Para cambiar o agregar notas: `G` (tarjetas de sección) y `TIPS` (notas de botones) en `ui-help.js`.

## Sin internet (app del técnico)
- `sw.js` guarda la app en la tablet (páginas, scripts, motor de PDF, iconos): abre sin señal. La API nunca se guarda ahí.
- El motor de PDF (jsPDF 2.5.1) va dentro de la app: `vendor/jspdf.umd.min.js` (antes venía de internet).
- **Entrar sin internet**: después de iniciar sesión UNA vez con internet en esa tablet, el técnico puede volver a entrar
  sin señal durante 30 días con su mismo ID y PIN. La tablet guarda solo una huella del PIN (PBKDF2), nunca el PIN.
  5 PIN incorrectos sin internet bloquean la entrada sin internet 15 minutos.
- Sin señal se puede: ver trabajos y clientes ya descargados, llenar y guardar reportes, firmar, hacer el PDF y pedir partes
  (quedan en cola). Al volver la señal todo se envía solo y se asignan los números.
- El supervisor también puede entrar sin internet (después de una vez con internet): se abre la app de reportes, porque el panel necesita internet.
- Necesitan internet: el panel del supervisor, enviar por correo/WhatsApp, cotizaciones nuevas y pagos.
- Al subir una versión nueva, la app se recarga sola una vez para usarla.

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
