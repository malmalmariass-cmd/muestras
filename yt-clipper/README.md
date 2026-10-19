# ✂️ YT Clipper

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
