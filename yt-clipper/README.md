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

- Python 3.10+
- [ffmpeg](https://ffmpeg.org/) instalado y en el PATH

## Instalación y uso

```bash
cd yt-clipper
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Abre http://127.0.0.1:5000

1. Pega el enlace de YouTube y pulsa **Descargar** (o sube un archivo de video).
2. Elige **Dividir en partes** o **Highlights automáticos**, o marca clips a mano.
3. Revisa la lista de clips y pulsa **Exportar clips**.

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
| `PORT` | `5000` | Puerto |
| `HOST` | `127.0.0.1` | Usa `0.0.0.0` para abrirla en tu red local |
| `YTCLIPPER_DATA` | `./data` | Carpeta de videos y clips |

> Si la descarga de YouTube falla, actualiza yt-dlp: `pip install -U yt-dlp`.

Usa esta herramienta solo con videos propios o con permiso del autor, respetando los Términos de Servicio de YouTube.

## SEO, GEO y AEO (posicionamiento en Google y buscadores con IA)

La app ya incluye:

| Qué | Dónde |
|---|---|
| 11 páginas de aterrizaje, una por búsqueda (descargar de YouTube, cortar, partes de 10 min, highlights, Shorts, TikTok, Instagram, Facebook, X, internet en general) | `pages.py` |
| `<title>`, meta description, canonical, hreflang, Open Graph y Twitter Card por página | `templates/index.html` |
| Datos estructurados JSON-LD: WebSite, Organization, WebApplication, WebPage, HowTo, FAQPage, BreadcrumbList | `templates/index.html` |
| Contenido visible: qué es, cómo funciona, funciones, sitios compatibles, preguntas frecuentes, enlaces internos | `templates/index.html` |
| `robots.txt` que permite Google, Bing y rastreadores de IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) | `/robots.txt` |
| `sitemap.xml` con todas las páginas | `/sitemap.xml` |
| `llms.txt`: resumen para ChatGPT, Claude, Perplexity y Gemini | `/llms.txt` |
| Manifest PWA, favicon, íconos e imagen para compartir 1200×630 | `/manifest.webmanifest`, `static/icons/` |

Para editar textos o agregar una página nueva, añade un elemento a `PAGES` y a `NAV` en `pages.py`.

### Al publicarla en tu dominio

1. Define la URL pública: `SITE_URL=https://tudominio.com python app.py` (se usa en canonical, sitemap y Open Graph).
2. Sírvela con HTTPS detrás de un servidor (Nginx, Caddy) o en un hosting con Python (Railway, Render, un VPS).
   Activa compresión gzip/brotli en el servidor.
3. Registra el sitio en **Google Search Console** y **Bing Webmaster Tools** y envía `https://tudominio.com/sitemap.xml`
   (Bing alimenta a ChatGPT y Copilot).
4. Valida los datos estructurados en https://search.google.com/test/rich-results.
5. Consigue enlaces y menciones: publica la herramienta en Reddit, foros, Product Hunt, directorios de herramientas
   y videos propios. Para GEO, las IA citan más los sitios mencionados en otras páginas.
6. Revisa en Search Console qué búsquedas traen visitas y crea páginas nuevas para las que falten.

> Nota: los descargadores de YouTube compiten con miles de sitios, y Google puede bajarlos de posición si
> reciben reclamos de derechos de autor (DMCA). Mantén el aviso legal y no promociones la descarga de
> contenido protegido. Evita usar “YouTube” o “YT” en el dominio para no tener problemas de marca.
