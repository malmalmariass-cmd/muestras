# YT Clipper

Web app para **descargar videos de YouTube** y **cortarlos** en:

- **Highlights**: clips cortos con los mejores momentos. Se detectan automáticamente con
  el gráfico “Lo más visto” de YouTube (si el video lo tiene) o, si no, con la intensidad del audio.
  También puedes marcarlos a mano mientras ves el video.
- **Partes de máximo 10 minutos**: divide el video completo en partes iguales de ≤ 10 min
  (o del tamaño que elijas entre 1 y 10 min).

Cada clip se puede renombrar, ajustar (inicio/fin), previsualizar y exportar en formato
original o **vertical 9:16** (Shorts, Reels, TikTok). Se descargan uno por uno o todos en un ZIP.
Ningún clip puede superar los 10 minutos.

## Requisitos

- Node.js 18 o superior (recomendado 20 o 22)

No necesitas instalar Python, ffmpeg ni yt-dlp: `npm install` instala ffmpeg (`ffmpeg-static`)
y descarga el ejecutable de yt-dlp en `bin/`.

## Instalación y uso local

```bash
cd yt-clipper
npm install
npm start
```

Abre http://localhost:3000

1. Pega el enlace de YouTube y pulsa **Descargar** (o sube un archivo de video).
2. Elige **Dividir en partes** o **Highlights automáticos**, o marca clips a mano.
3. Revisa la lista de clips y pulsa **Exportar clips**.

## Publicar en Hostinger (Node.js Web Apps)

Requiere un plan con aplicaciones Node.js (Business, Cloud o VPS).

1. En hPanel: **Sitios web → Agregar sitio web → Node.js Apps**.
2. Elige **Importar desde GitHub** (este repositorio) o **Subir archivos** (el ZIP).
   Si subes el ZIP o el repositorio completo, indica `yt-clipper` como carpeta raíz de la app.
3. Configuración de compilación:
   - Framework: **Express** (u **Other** si no aparece)
   - Versión de Node: **20.x** o **22.x**
   - Comando de compilación: `npm install`
   - Archivo de entrada: `server.js` (comando de inicio: `npm start`)
4. Variables de entorno: `SITE_URL=https://tudominio.com` (y opcionales de la tabla de abajo).
5. Despliega y abre tu dominio.

En un VPS: `npm install`, `npm start` y mantenla viva con `pm2 start server.js --name yt-clipper`
detrás de Nginx con HTTPS.

### Si aparece `spawn … yt-dlp EACCES` (permiso denegado)

Hostinger copia la app a otra carpeta después de `npm install` y se pierde el permiso de ejecución.
La app lo arregla sola al arrancar, en este orden:

1. Devuelve el permiso de ejecución a yt-dlp y ffmpeg (`chmod 755`).
2. Si el servidor no deja ejecutar programas en esa carpeta, los copia a `data/.bin`, `~/.cache` o `/tmp` y los usa desde ahí.
3. Para yt-dlp, si nada de lo anterior funciona, usa la versión de Python (`python3`, 3.9 o superior).

En los registros de la app (Runtime logs) verás qué ruta usó: `ffmpeg: …` y `yt-dlp: …`.
Si aparece `Aviso: Este servidor no permite ejecutar…`, tu plan no deja ejecutar programas y hace falta un VPS.

### Si YouTube dice "Sign in to confirm you're not a bot"

YouTube bloquea muchas IP de servidores (Hostinger, AWS, etc.). No es un error de la app: hay que darle
a yt-dlp **cookies de una cuenta de YouTube** o usar un **proxy residencial**.

**Opción A: cookies (gratis)**

1. Usa una cuenta de Google **secundaria** (YouTube puede limitar la cuenta que se usa para descargar).
2. En tu computadora abre una **ventana de incógnito**, entra a youtube.com con esa cuenta.
3. Exporta las cookies en formato Netscape (`cookies.txt`) con una extensión como
   “Get cookies.txt LOCALLY” y **cierra la ventana de incógnito** (si sigues navegando, YouTube las cambia).
4. Súbelas al servidor con el Administrador de archivos de Hostinger a una de estas rutas
   (fuera de la carpeta de la app, para que no se borren al volver a desplegar):
   - `~/yt-clipper/cookies.txt` (recomendado), o
   - `~/cookies.txt`, o la ruta que pongas en la variable `YTDLP_COOKIES_FILE`.
5. Reinicia la app. Cuando las cookies caduquen (semanas o meses), repite los pasos.

**Nunca subas `cookies.txt` a GitHub**: da acceso a esa cuenta. Ya está en `.gitignore`.

**Opción B: proxy residencial (de pago)**

Define `YTDLP_PROXY=http://usuario:clave@host:puerto` con un proveedor de proxies residenciales.

Mientras tanto, la **subida de archivos** y los demás sitios (TikTok, Instagram, etc.) siguen funcionando.

> Si YouTube cambia algo y la descarga falla, actualiza yt-dlp: `npm run update-yt-dlp` (o vuelve a desplegar).

### Atajos de teclado (en el editor)

| Tecla | Acción |
|---|---|
| `I` | Marcar inicio |
| `O` | Marcar fin |
| `A` | Añadir clip con las marcas |
| `Espacio` | Reproducir / pausar |
| `←` / `→` | −5 s / +5 s (`Shift` = 1 s) |

### Opciones de exportación

- **Preciso**: re-codifica (H.264/AAC); el corte es exacto.
- **Rápido**: copia sin re-codificar; muy veloz, pero el corte cae en el keyframe más cercano.
- **Vertical 9:16**: recorta el centro del video y lo escala a 1080×1920.

### Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto (Hostinger lo define solo) |
| `SITE_URL` | URL de la petición | URL pública para canonical, sitemap y Open Graph |
| `YTCLIPPER_DATA` | `./data` | Carpeta de videos y clips |
| `KEEP_HOURS` | `6` | Horas que se guardan los videos y clips antes de borrarse |
| `YTDLP_PATH` | `bin/yt-dlp` | Ruta a otro yt-dlp, si prefieres uno instalado en el sistema |
| `YTDLP_COOKIES_FILE` | `~/yt-clipper/cookies.txt` | Archivo de cookies de YouTube (formato Netscape) |
| `YTDLP_COOKIES` | — | Alternativa: contenido de cookies.txt (usa `\n` para los saltos de línea) |
| `YTDLP_PROXY` | — | Proxy para las descargas, p. ej. `http://usuario:clave@host:puerto` |

Usa esta herramienta solo con videos propios o con permiso del autor, respetando los Términos de Servicio de YouTube.

## SEO, GEO y AEO (posicionamiento en Google y buscadores con IA)

La app ya incluye:

| Qué | Dónde |
|---|---|
| 11 páginas de aterrizaje, una por búsqueda (descargar de YouTube, cortar, partes de 10 min, highlights, Shorts, TikTok, Instagram, Facebook, X, internet en general) | `pages.js` |
| `<title>`, meta description, canonical, hreflang, Open Graph y Twitter Card por página | `views/index.ejs` + `server.js` |
| Datos estructurados JSON-LD: WebSite, Organization, WebApplication, WebPage, HowTo, FAQPage, BreadcrumbList | `views/index.ejs` + `server.js` |
| Contenido visible: qué es, cómo funciona, funciones, sitios compatibles, preguntas frecuentes, enlaces internos | `views/index.ejs` + `server.js` |
| `robots.txt` que permite Google, Bing y rastreadores de IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) | `/robots.txt` |
| `sitemap.xml` con todas las páginas | `/sitemap.xml` |
| `llms.txt`: resumen para ChatGPT, Claude, Perplexity y Gemini | `/llms.txt` |
| Manifest PWA, favicon, íconos e imagen para compartir 1200×630 | `/manifest.webmanifest`, `static/icons/` |

Para editar textos o agregar una página nueva, añade un elemento a `PAGES` y a `NAV` en `pages.js`.

### Al publicarla en tu dominio

1. Define la variable de entorno `SITE_URL=https://tudominio.com` (se usa en canonical, sitemap y Open Graph).
2. Sírvela con HTTPS (Hostinger lo activa con SSL gratis) y activa la compresión gzip/brotli si tu hosting lo permite.
3. Registra el sitio en **Google Search Console** y **Bing Webmaster Tools** y envía `https://tudominio.com/sitemap.xml`
   (Bing alimenta a ChatGPT y Copilot).
4. Valida los datos estructurados en https://search.google.com/test/rich-results.
5. Consigue enlaces y menciones: publica la herramienta en Reddit, foros, Product Hunt, directorios de herramientas
   y videos propios. Para GEO, las IA citan más los sitios mencionados en otras páginas.
6. Revisa en Search Console qué búsquedas traen visitas y crea páginas nuevas para las que falten.

> Nota: los descargadores de YouTube compiten con miles de sitios, y Google puede bajarlos de posición si
> reciben reclamos de derechos de autor (DMCA). Mantén el aviso legal y no promociones la descarga de
> contenido protegido. Evita usar “YouTube” o “YT” en el dominio para no tener problemas de marca.
