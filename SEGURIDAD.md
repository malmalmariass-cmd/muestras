# Cher Services — App de técnicos: seguridad, datos y capacidad

Revisión del `index.html` (app del técnico, PWA). **Solo se revisó el frontend**: el backend
(`api/api.php`), `pdf.js`, `sw.js`, `manifest.json` y el panel de administración no estaban
en los archivos recibidos. Casi todo lo que protege los datos ocurre en el servidor, así que
las secciones 3–6 son trabajo que hay que hacer (o verificar) en el backend.

---

## 1. Cambios hechos en `index.html`

| # | Cambio | Por qué |
|---|--------|---------|
| 1 | **Content-Security-Policy** (meta) | Bloquea scripts, iframes y objetos de dominios no autorizados. Si alguien logra inyectar HTML, no puede cargar código externo ni enviar datos a otro servidor (`connect-src 'self'`). |
| 2 | **SRI** (`integrity=`) en jsPDF del CDN | Si el CDN fuera comprometido, el navegador rechaza el archivo alterado en vez de ejecutarlo. |
| 3 | **Referrer-Policy** | Los enlaces externos (WhatsApp) no reciben la URL interna de la app. |
| 4 | **Validación de firmas** (`safeImg`) | Las firmas que vienen del servidor (`my_reports`) se insertaban en el HTML sin validar → posible XSS (robo del token de sesión). Ahora solo se aceptan imágenes `data:image/png|jpeg|webp;base64`. Probado con una firma maliciosa: bloqueada. |
| 5 | **Timeout en cada llamada al API** (20 s; 90 s con PDF) | Una petición colgada ya no congela la sincronización. |
| 6 | **429 / 502–504 se tratan como “sin conexión”** | Si el servidor está saturado, el trabajo queda en cola y se reintenta; no se pierde ni muestra errores técnicos al técnico. |
| 7 | **Sincronización con *jitter* y *backoff*** | Antes: todas las tablets llamaban cada 30 s exactos. Ahora: 24–36 s aleatorio, pausa cuando la app está en segundo plano, y si el servidor no responde espera 1→2→4→5 min. Evita picos con 50 usuarios. |
| 8 | **Peticiones duplicadas agrupadas** (`pullJobs`, `pullRequests`) | Al volver a la app se disparaban 3–4 llamadas iguales a la vez; ahora es una. |
| 9 | **Cola offline por técnico** | En una tablet compartida, las solicitudes de partes pendientes de un técnico se enviaban con la sesión del siguiente que entrara. Ahora cada una lleva su dueño. |
| 10 | **Al cerrar sesión se borran trabajos y solicitudes del caché** | El siguiente usuario de la tablet no ve los datos del anterior. Los reportes no enviados se conservan. |
| 11 | **WhatsApp**: `opener = null` y número solo dígitos | La pestaña nueva no puede controlar la app; el número no puede alterar la URL. |
| 12 | **Bug corregido: “Descargar mis reportes de la oficina” no descargaba nada** | `DB.get` devolvía el objeto de la petición en vez de `undefined` cuando el reporte no existía en la tablet. También afectaba abrir un trabajo cuyo reporte no estaba en la tablet. |

Probado en Chromium con un API simulado: login, historial, descarga de reportes, trabajos,
solicitudes, cierre de sesión — sin errores. El hash SRI se verificó contra el archivo oficial
de jsPDF 2.5.1 (npm). **Después de subirlo, abre la app y revisa que el PDF se genere**; si
`pdf.js` cargara algo de otro dominio, la CSP lo bloquearía y habría que añadir ese dominio.

---

## 2. Copia a cherservices21@gmail.com e info@cherservices.com

Esto **debe hacerse en el servidor**, no en la app: si la app enviara la lista de copias,
cualquiera podría usar el API para mandar correos a quien quisiera (relay de spam).

En `api/api.php`, donde se envía el correo de `send_report` (y donde el panel de admin envía
facturas), añadir las copias. Ejemplo con PHPMailer:

```php
// Copias fijas de la oficina: cada reporte firmado y cada factura
const OFFICE_COPIES = ['cherservices21@gmail.com', 'info@cherservices.com'];

foreach (OFFICE_COPIES as $cc) {
    if (strcasecmp($cc, $to) !== 0) $mail->addBCC($cc);   // BCC: el cliente no ve los correos internos
}
```

Con `mail()` nativo: `$headers .= "Bcc: cherservices21@gmail.com, info@cherservices.com\r\n";`

Recomiendo **BCC** (copia oculta). Si se prefiere que el cliente vea la copia, usar `addCC`.
La app ya envía automáticamente una “copia a la oficina” (`channel: 'office'`) cuando el
cliente firma; hay que confirmar en el backend a qué dirección va ese canal.

---

## 3. ¿Dónde se guardan los datos y por cuánto tiempo?

| Lugar | Qué guarda | Duración |
|-------|-----------|----------|
| **Servidor** (`api/api.php` → base de datos MySQL o archivos, según el hosting) | Reportes, facturas, firmas, clientes, trabajos, inventario. Es la copia oficial. | Indefinida mientras el hosting esté pagado. **Depende de que existan respaldos** (ver 4). |
| **Tablet – IndexedDB** (`cher-reports`) | Reportes del técnico, incluidos los no enviados. | Hasta que se borre la app/datos del navegador. La app pide almacenamiento “persistente”; en iPad Safari puede borrarse tras ~7 días sin abrir la app si no está instalada en la pantalla de inicio. |
| **Tablet – localStorage** | Sesión, borradores, caché de clientes/inventario/trabajos. | Igual que arriba. |

**Cambiar `index.html` no borra datos**, siempre que:
- se sirva desde el **mismo dominio** (los datos del navegador pertenecen al dominio), y
- no se cambie el nombre de la base `cher-reports` ni las claves `cher.*`.

Plazo legal sugerido (EE. UU./Florida): conservar facturas y registros contables **mínimo
5–7 años** (el IRS puede revisar hasta 3–6 años; 7 es la práctica segura). Definir una política
de retención por escrito y borrar datos personales que ya no se necesiten.

## 4. ¿Están respaldados los archivos?

- **Antes de esta sesión: no.** El repositorio solo tenía `README.md` y `Proyecto_Fenix_Vertical.html`.
  El `index.html` no estaba respaldado en ningún sitio que yo pueda ver.
- **Ahora:** `index.html` está en este repositorio (versión original + versión mejorada, con
  historial de git). Para recuperar la original: `git show <commit>:index.html`.
- **Falta respaldar:** `api/` (backend), `pdf.js`, `sw.js`, `manifest.json`, `icons/`, el panel
  de administración **y la base de datos**. Súbelos al repositorio (sin contraseñas — ver 6).
- **Base de datos:** activar respaldos automáticos diarios en el hosting (Hostinger: hPanel →
  Archivos → Copias de seguridad) y además una exportación semanal guardada **fuera** del
  hosting (Google Drive, etc.). Probar una restauración al menos una vez.

## 5. ¿Aguanta 50 usuarios a la vez sin caerse?

**El frontend sí.** 50 técnicos generan como máximo ~2–4 peticiones por segundo en uso normal,
y ahora están repartidas en el tiempo. El riesgo está en el servidor y depende de lo que no vi:

- **Plan de hosting**: los planes compartidos limitan procesos PHP simultáneos (a veces 20–40).
  Subir un PDF + firmas tarda varios segundos y ocupa un proceso. Verificar el límite del plan.
- **Base de datos**: índices en `employee_id`, `serial_no`, `invoice_no`, `report_id`, `updated_at`.
  Sin índices, `equipment_history` y `my_reports` se vuelven lentos al crecer.
- **Número de factura**: generarlo con `AUTO_INCREMENT` o transacción con `SELECT … FOR UPDATE`.
  Si se calcula “el último + 1” sin bloqueo, dos técnicos pueden recibir el **mismo número**.
- **Respuestas grandes**: `my_reports` devuelve todos los reportes con firmas; paginar o limitar
  a los últimos 90 días.
- **Prueba de carga**: antes de confiar, simular 50 usuarios (k6 o JMeter) contra un entorno de
  prueba, incluyendo `save_report` con PDF.

## 6. ¿Se puede filtrar algún dato desde el código?

En `index.html` **no hay contraseñas, claves de API ni datos de clientes**. Lo único público es
el correo y teléfonos de la empresa (intencional). Riesgos que quedan:

- **Token de sesión en localStorage**: si hubiera un XSS, se podría robar. Mitigado con la CSP y
  la validación de firmas. La solución completa es mover la sesión a una cookie `HttpOnly; Secure;
  SameSite=Strict` (requiere cambio en el backend).
- **El backend es el punto crítico**: verificar que cada acción (`my_reports`, `customers`,
  `equipment_history`, `preq_list`…) compruebe el token y **solo devuelva lo que ese usuario puede
  ver**. Un técnico no debe poder pedir reportes de otro cambiando un `id`.
- **Archivos en el servidor**: confirmar que `api/config.php`, archivos `.sql`, `.env`, `.json` de
  datos y respaldos **no** sean descargables por URL.

---

## 7. Lista de ciberseguridad (para evitar ataques)

### Acceso y autenticación
- [ ] PINs de al menos 6 dígitos; prohibir 123456, 000000, fecha de nacimiento.
- [ ] **Bloqueo por intentos**: 5 fallos → bloquear 15 min por usuario **y** por IP.
- [ ] PINs guardados con `password_hash()` (bcrypt/argon2), nunca en texto plano.
- [ ] Tokens de sesión aleatorios (`random_bytes(32)`), con caducidad (p. ej. 12 h) y revocables al cerrar sesión.
- [ ] Panel de admin: contraseña fuerte + **verificación en dos pasos (2FA)**.
- [ ] Desactivar de inmediato las cuentas de empleados que se van.
- [ ] Roles: técnico solo ve lo suyo; admin ve todo; nadie más.

### Servidor y API
- [ ] **HTTPS obligatorio** con redirección y cabecera HSTS.
- [ ] Cabeceras HTTP: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
      `X-Frame-Options: DENY` (o `frame-ancestors 'none'`), `Referrer-Policy`, `Permissions-Policy`.
- [ ] Consultas SQL **siempre** con sentencias preparadas (PDO), nunca concatenando texto.
- [ ] Validar en el servidor todo lo que llega: tipos, longitudes, tamaño máximo del PDF (p. ej. 10 MB).
- [ ] Comprobar permisos en **cada** acción del API (no confiar en lo que diga la app).
- [ ] **Rate limiting** por token/IP (p. ej. 60 peticiones/min) → responder `429`.
- [ ] Errores genéricos al cliente; detalles solo en el log del servidor.
- [ ] No exponer `phpinfo`, listados de directorios, `.git`, `.env`, `config.php`, respaldos `.sql`.
- [ ] PHP y librerías (PHPMailer, etc.) actualizados.
- [ ] Los enlaces públicos de reportes (los de WhatsApp) deben ser aleatorios y largos, no `?id=123`, y con caducidad.

### Correo
- [ ] Configurar **SPF, DKIM y DMARC** en `cherservices.com` (evita que suplanten la empresa y que los reportes caigan en spam).
- [ ] Enviar por SMTP autenticado, no `mail()` sin autenticar.
- [ ] El destinatario y las copias los decide el servidor (sección 2).
- [ ] Limitar envíos por usuario/hora.

### Datos
- [ ] Respaldos automáticos diarios + copia semanal fuera del hosting + prueba de restauración.
- [ ] Cifrado en tránsito (HTTPS) y, si el hosting lo permite, en reposo.
- [ ] Registro de auditoría: quién creó, editó, firmó, envió o borró cada reporte/factura.
- [ ] Política de retención (5–7 años facturas) y borrado de lo que ya no hace falta.
- [ ] No poner contraseñas, claves SMTP ni tokens en el repositorio de GitHub (usar `config.php` fuera de git o variables de entorno). Mantener el repositorio **privado**.

### Tablets y empleados
- [ ] Bloqueo de pantalla con código en todas las tablets; cifrado del dispositivo activado.
- [ ] Sistema operativo y navegador actualizados.
- [ ] Gestión remota (MDM) para borrar una tablet perdida o robada.
- [ ] Instalar la app en la pantalla de inicio (evita que Safari borre los datos locales).
- [ ] Formación básica: no compartir PINs, reconocer correos de phishing, avisar si se pierde una tablet.

### Disponibilidad (que no se caiga)
- [ ] Plan de hosting con suficientes procesos PHP para picos (ver sección 5).
- [ ] Protección DDoS / WAF (p. ej. Cloudflare plan gratuito delante del dominio).
- [ ] Monitor de disponibilidad (UptimeRobot, gratis) que avise si la web cae.
- [ ] Límite de tamaño de subida y de tiempo de ejecución en PHP.
- [ ] La app ya funciona sin internet y reintenta sola: un corte del servidor no hace perder reportes.

### Dependencias externas
- [ ] jsPDF desde CDN con SRI (hecho). Alternativa más robusta: copiar `jspdf.umd.min.js` al propio servidor.
- [ ] Revisar `pdf.js` y `sw.js`: el service worker no debe guardar en caché respuestas del API con datos personales.
