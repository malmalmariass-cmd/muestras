# Mi Recetario

Tu diario y libro de cocina, con una amiga chef (Canela) que te ayuda a guardar las recetas que ves en Instagram, YouTube y TikTok, hacer el súper y cocinar cada vez más rico y más sano.

## Qué hace

- **Sacar la receta de un link**: pega el link (o compártelo directo a la app desde el celular) y la IA extrae ingredientes, cantidades, pasos, porciones, tiempo y nutrición. Si el post no trae la receta completa, puedes pegar el caption; si aun así falta información, la app la completa y la marca como "inferida".
- **Objetivo**: comer rico, bajar de peso o subir de peso. Todas las recetas (las tuyas y las que trae el app) tienen una calificación del 1 al 10 para cada objetivo, con la razón y un tip para hacerla más pro ese objetivo. Las recetas se ordenan según tu objetivo.
- **Lista del súper**: eliges las recetas que vas a cocinar y las porciones; la app suma los ingredientes repetidos, redondea a lo que realmente compras (piezas, latas) y los agrupa por pasillo.
- **"No lo encuentro"**: te dice cómo se llama el producto en tu país, qué debe decir la etiqueta y en qué pasillo buscarlo, y te da alternativas (marcando las mejores para tu objetivo). Puedes cambiar el ingrediente por el sustituto en la lista.
- Compartir la lista por WhatsApp o mensaje.
- **Cocinar conmigo**: modo cocina paso a paso a pantalla completa, con temporizadores que detecta en cada paso, la pantalla siempre encendida y una lección de técnica de Canela en cada paso.
- **Mi diario**: al terminar calificas con estrellas, eliges cómo te quedó y escribes una nota; se guarda como página de tu diario con tu racha de días cocinando.
- **Platicar con Canela**: chat para preguntar técnicas, sustitutos o qué cocinar con lo que tienes (usa la IA).
- **Secretos de chef** en cada receta: trucos que explican por qué funcionan.

La paleta está definida como variables CSS al inicio de `public/styles.css` (papel crema, terracota, salvia, mantequilla, rosa y ciruela); el color principal cambia según tu objetivo.

Tus recetas, tu objetivo y tu lista se guardan en el navegador del dispositivo.

## Cómo correrla

```bash
cd recetas-app
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # necesaria para extraer recetas y alternativas con IA
npm start                             # http://localhost:3000
```

Sin `ANTHROPIC_API_KEY` la app funciona con las recetas incluidas, la lista del súper y un diccionario básico de nombres por país, pero no puede extraer recetas de links.

Para poder "compartir a la app" desde Instagram, TikTok o YouTube en Android, ábrela en Chrome desde un dominio con HTTPS e instálala ("Agregar a pantalla de inicio").

## Estructura

- `server.js` – API Express: `/api/extract`, `/api/chef`, `/api/alternatives`, `/api/score`, `/api/status`.
- `lib/sources.js` – lee el título, caption o descripción públicos del post (oEmbed de YouTube/TikTok, metadatos de Instagram y sitios web).
- `lib/schemas.js` – esquemas JSON de salida estructurada para Claude.
- `lib/fallback.js` – nombres regionales y sustitutos sin IA.
- `public/chef.js` – la voz de la amiga chef: lecciones de técnica por paso, tip del día, frases.
- `public/` – la app (HTML/CSS/JS sin build), recetas base y manifest PWA con share target.
