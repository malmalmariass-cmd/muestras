// Contenido SEO de cada página de aterrizaje. Cada página apunta a una búsqueda distinta
// y comparte la misma herramienta; el texto es único para no generar contenido duplicado.

const SITE_NAME = "YT Clipper";

const FEATURES = [
  [
    "Descarga en alta calidad",
    "Guarda videos en MP4 en 720p, 1080p o la máxima calidad disponible."
  ],
  [
    "Partes de máximo 10 minutos",
    "Divide un video largo en partes iguales de hasta 10 minutos con un clic."
  ],
  [
    "Highlights automáticos",
    "Encuentra los mejores momentos con “Lo más visto” de YouTube o con la intensidad del audio."
  ],
  [
    "Recorte manual preciso",
    "Marca inicio y fin mientras ves el video, con atajos de teclado."
  ],
  [
    "Formato vertical 9:16",
    "Exporta en 1080×1920 listo para YouTube Shorts, Instagram Reels y TikTok."
  ],
  [
    "Descarga en ZIP",
    "Baja cada clip por separado o todos juntos en un solo archivo ZIP."
  ]
];

const PLATFORMS = [
  "YouTube",
  "YouTube Shorts",
  "TikTok",
  "Instagram",
  "Facebook",
  "X (Twitter)",
  "Vimeo",
  "Twitch",
  "Reddit",
  "Dailymotion",
  "SoundCloud",
  "y más de 1000 sitios"
];

const GENERAL_FAQ = [
  [
    "¿YT Clipper es gratis?",
    "Sí. YT Clipper es gratis y de código abierto. No necesitas cuenta ni registro."
  ],
  [
    "¿Cuál es la duración máxima de cada clip?",
    "Cada clip puede durar como máximo 10 minutos. Si el video es más largo, la opción “Dividir en partes” lo corta automáticamente en partes iguales de hasta 10 minutos."
  ],
  [
    "¿En qué formato se descargan los videos?",
    "En MP4 (video H.264 y audio AAC), compatible con celulares, computadoras, editores y redes sociales."
  ],
  [
    "¿Funciona en el celular?",
    "Sí. La interfaz se adapta a pantallas de celular y tablet, y los clips se descargan directamente al dispositivo."
  ],
  [
    "¿Es legal descargar videos de YouTube?",
    "Depende del video y de tu país. Descarga solo videos propios, con licencia libre (Creative Commons) o con permiso del autor, y respeta los Términos de Servicio de cada plataforma."
  ]
];

const PAGES = [
  {
    "slug": "",
    "title": "Descargar videos de YouTube y cortarlos en clips gratis | YT Clipper",
    "description": "Descarga videos de YouTube gratis y córtalos en highlights o en partes de máximo 10 minutos. Exporta en MP4 o vertical 9:16 para Shorts, Reels y TikTok.",
    "h1": "Descarga videos de YouTube y córtalos en clips",
    "lead": "Pega el enlace, descarga el video y divídelo en <b>highlights</b> o en <b>partes de máximo 10 minutos</b>. Gratis, sin registro y en MP4.",
    "about": "YT Clipper es una herramienta web gratuita para descargar videos de YouTube y otros sitios, y cortarlos en clips cortos. Detecta los mejores momentos de forma automática, divide videos largos en partes de hasta 10 minutos y exporta en formato horizontal o vertical 9:16.",
    "steps": [
      [
        "Pega el enlace",
        "Copia la URL del video de YouTube y pégala en el campo de arriba."
      ],
      [
        "Elige cómo cortar",
        "Divide el video en partes de máximo 10 minutos o genera highlights automáticos."
      ],
      [
        "Exporta y descarga",
        "Exporta los clips en MP4 o vertical 9:16 y descárgalos uno a uno o en ZIP."
      ]
    ],
    "faq": [
      [
        "¿Cómo descargo un video de YouTube?",
        "Copia el enlace del video, pégalo en YT Clipper, elige la calidad y pulsa “Descargar”. Cuando termine podrás verlo, cortarlo y exportarlo en MP4."
      ]
    ]
  },
  {
    "slug": "descargar-videos-de-youtube",
    "title": "Descargar videos de YouTube en MP4 gratis (720p, 1080p) | YT Clipper",
    "description": "Descargador de videos de YouTube gratis y sin registro. Guarda videos en MP4 en 720p, 1080p o la máxima calidad, y córtalos en clips si lo necesitas.",
    "h1": "Descargar videos de YouTube en MP4",
    "lead": "Descarga cualquier video público de YouTube en <b>MP4</b> en 720p, 1080p o la máxima calidad disponible.",
    "about": "Para descargar un video de YouTube con YT Clipper solo necesitas el enlace. La herramienta obtiene el mejor video y audio disponibles, los une en un MP4 compatible con cualquier dispositivo y te permite recortarlo antes de guardarlo.",
    "steps": [
      [
        "Copia el enlace",
        "En YouTube pulsa “Compartir” y copia la URL (también funcionan enlaces youtu.be y Shorts)."
      ],
      [
        "Elige la calidad",
        "Selecciona 720p para archivos ligeros, 1080p o la máxima calidad disponible."
      ],
      [
        "Descarga",
        "Pulsa “Descargar”. Luego puedes exportar el video completo o solo las partes que quieras."
      ]
    ],
    "faq": [
      [
        "¿Puedo descargar videos de YouTube en 1080p?",
        "Sí. Elige 1080p o “Máxima” y YT Clipper descargará la mejor calidad disponible del video."
      ],
      [
        "¿Funciona con enlaces de YouTube Shorts y youtu.be?",
        "Sí. Acepta enlaces youtube.com/watch, youtu.be y youtube.com/shorts."
      ]
    ]
  },
  {
    "slug": "cortar-videos-de-youtube",
    "title": "Cortar videos de YouTube online y descargar el fragmento | YT Clipper",
    "description": "Recorta un video de YouTube y descarga solo la parte que necesitas. Marca inicio y fin, previsualiza y exporta el fragmento en MP4 con corte preciso.",
    "h1": "Cortar videos de YouTube y descargar solo un fragmento",
    "lead": "Marca el <b>inicio</b> y el <b>fin</b> mientras ves el video y descarga solo ese fragmento en MP4.",
    "about": "Con YT Clipper puedes recortar un video de YouTube sin instalar un editor. Marca el inicio con la tecla I, el fin con la tecla O y añade el clip con A. Puedes ajustar los tiempos a mano, previsualizar cada clip y exportar con corte preciso al décimo de segundo.",
    "steps": [
      [
        "Carga el video",
        "Pega el enlace de YouTube y espera a que termine la descarga."
      ],
      [
        "Marca el fragmento",
        "Usa “Marcar inicio” (I) y “Marcar fin” (O), o escribe los tiempos en mm:ss."
      ],
      [
        "Exporta el recorte",
        "Elige “Preciso” para un corte exacto y descarga el fragmento en MP4."
      ]
    ],
    "faq": [
      [
        "¿Puedo cortar varios fragmentos del mismo video?",
        "Sí. Añade todos los clips que quieras a la lista y expórtalos juntos; se descargan por separado o en un ZIP."
      ],
      [
        "¿Qué diferencia hay entre corte preciso y rápido?",
        "El corte preciso vuelve a codificar el video y corta en el segundo exacto. El rápido no re-codifica, es casi instantáneo, pero el corte puede moverse unos segundos hasta el fotograma clave más cercano."
      ]
    ]
  },
  {
    "slug": "dividir-video-en-partes-de-10-minutos",
    "title": "Dividir un video en partes de 10 minutos online gratis | YT Clipper",
    "description": "Divide videos largos de YouTube en partes iguales de máximo 10 minutos automáticamente. Ideal para redes sociales o WhatsApp. Descarga en MP4 o ZIP.",
    "h1": "Dividir un video en partes de máximo 10 minutos",
    "lead": "Convierte un video largo en <b>partes iguales de hasta 10 minutos</b> con un solo clic.",
    "about": "La función “Dividir en partes” calcula cuántas partes necesita el video y las hace del mismo tamaño, para no dejar un último trozo de pocos segundos. Por ejemplo, un video de 25 minutos se divide en 3 partes de 8 min 20 s en lugar de 10 + 10 + 5. También puedes elegir un límite menor, de 1 a 10 minutos.",
    "steps": [
      [
        "Carga el video",
        "Pega el enlace o sube un archivo de video desde tu dispositivo."
      ],
      [
        "Elige el tamaño",
        "En “Dividir en partes” deja 10 minutos o elige un máximo menor."
      ],
      [
        "Descarga las partes",
        "Pulsa “Generar partes”, luego “Exportar clips” y baja todo en un ZIP."
      ]
    ],
    "faq": [
      [
        "¿Por qué dividir un video en partes de 10 minutos?",
        "Muchas plataformas y apps de mensajería limitan la duración o el tamaño de los videos. Partes de 10 minutos o menos son más fáciles de subir, compartir y ver."
      ],
      [
        "¿Puedo hacer partes de 1, 3 o 5 minutos?",
        "Sí. Escribe el máximo de minutos por parte (de 1 a 10) antes de generar las partes."
      ]
    ]
  },
  {
    "slug": "highlights-de-youtube",
    "title": "Crear highlights de videos de YouTube automáticamente | YT Clipper",
    "description": "Encuentra los mejores momentos de un video de YouTube de forma automática usando “Lo más visto” o la intensidad del audio, y descárgalos como clips cortos.",
    "h1": "Crear highlights de YouTube automáticamente",
    "lead": "Detecta los <b>mejores momentos</b> de un video y conviértelos en clips listos para compartir.",
    "about": "YT Clipper sugiere highlights usando dos señales. Si el video tiene el gráfico “Lo más visto” de YouTube, elige los fragmentos más repetidos por los espectadores. Si no lo tiene, analiza la intensidad del audio segundo a segundo y elige los momentos más fuertes, como risas, aplausos, goles o gritos. Tú decides cuántos highlights quieres y cuánto dura cada uno.",
    "steps": [
      [
        "Carga el video",
        "Pega el enlace de YouTube; si existe, verás “Lo más visto” en la línea de tiempo."
      ],
      [
        "Sugiere highlights",
        "Elige cantidad y duración (por ejemplo, 5 clips de 30 s) y pulsa “Sugerir highlights”."
      ],
      [
        "Revisa y exporta",
        "Ajusta los tiempos si hace falta y exporta en horizontal o vertical."
      ]
    ],
    "faq": [
      [
        "¿Cómo sabe YT Clipper cuáles son los mejores momentos?",
        "Usa los datos de “Lo más visto” de YouTube (las partes más repetidas) y, si no existen, la intensidad del audio para encontrar los momentos con más energía."
      ],
      [
        "¿Puedo editar los highlights sugeridos?",
        "Sí. Cada highlight aparece en la lista de clips, donde puedes cambiar nombre, inicio y fin o eliminarlo."
      ]
    ]
  },
  {
    "slug": "youtube-a-shorts",
    "title": "Convertir video de YouTube a Shorts, Reels y TikTok (9:16) | YT Clipper",
    "description": "Convierte videos horizontales de YouTube en clips verticales 9:16 (1080×1920) para Shorts, Reels y TikTok. Gratis y sin marca de agua.",
    "h1": "Convertir videos de YouTube a formato vertical para Shorts",
    "lead": "Exporta tus clips en <b>vertical 9:16 (1080×1920)</b> listos para Shorts, Reels y TikTok.",
    "about": "Al exportar con la opción “Vertical 9:16”, YT Clipper recorta el centro del video horizontal y lo escala a 1080×1920, la resolución recomendada para YouTube Shorts, Instagram Reels y TikTok. Combínalo con los highlights automáticos para sacar varios Shorts de un video largo.",
    "steps": [
      [
        "Carga el video",
        "Pega el enlace del video horizontal de YouTube."
      ],
      [
        "Elige los momentos",
        "Genera highlights automáticos o marca los clips a mano (hasta 10 min cada uno)."
      ],
      [
        "Exporta en vertical",
        "En “Formato” elige “Vertical 9:16” y descarga los clips."
      ]
    ],
    "faq": [
      [
        "¿Qué resolución tienen los clips verticales?",
        "1080×1920 píxeles (relación 9:16), la recomendada para Shorts, Reels y TikTok."
      ],
      [
        "¿YT Clipper agrega marca de agua?",
        "No. Los clips se exportan sin ninguna marca de agua de la herramienta."
      ]
    ]
  },
  {
    "slug": "descargar-videos-de-internet",
    "title": "Descargar videos de cualquier página de internet gratis | YT Clipper",
    "description": "Descarga videos de YouTube, TikTok, Instagram, Facebook, X, Vimeo y más de 1000 sitios en MP4. Pega el enlace, descarga y corta el video en clips.",
    "h1": "Descargar videos de internet desde cualquier sitio",
    "lead": "Pega el enlace de un video de <b>YouTube, TikTok, Instagram, Facebook, X, Vimeo</b> y muchos sitios más.",
    "about": "YT Clipper usa yt-dlp, un descargador de código abierto compatible con más de 1000 sitios de video. Funciona con videos públicos: pega el enlace de la página donde está el video y la herramienta se encarga de encontrar el archivo, descargarlo en MP4 y dejarlo listo para cortar.",
    "steps": [
      [
        "Copia el enlace",
        "Abre el video en su página y copia la URL desde la barra del navegador o el botón “Compartir”."
      ],
      [
        "Pega y descarga",
        "Pega la URL en YT Clipper, elige la calidad y pulsa “Descargar”."
      ],
      [
        "Recorta si quieres",
        "Divide el video, crea highlights o expórtalo completo en MP4."
      ]
    ],
    "faq": [
      [
        "¿De qué páginas puedo descargar videos?",
        "De YouTube, TikTok, Instagram, Facebook, X (Twitter), Vimeo, Twitch, Reddit, Dailymotion y más de 1000 sitios compatibles con yt-dlp, siempre que el video sea público."
      ],
      [
        "¿Puedo descargar videos privados?",
        "No. Solo se pueden descargar videos públicos a los que cualquiera puede acceder."
      ]
    ]
  },
  {
    "slug": "descargar-videos-de-tiktok",
    "title": "Descargar videos de TikTok en MP4 gratis | YT Clipper",
    "description": "Descarga videos públicos de TikTok en MP4 gratis y sin registro. Pega el enlace, descarga y recorta el video si solo necesitas una parte.",
    "h1": "Descargar videos de TikTok en MP4",
    "lead": "Pega el enlace de un video público de <b>TikTok</b> y descárgalo en MP4.",
    "about": "Para descargar un video de TikTok, pulsa “Compartir” en la app, elige “Copiar enlace” y pégalo en YT Clipper. El video se guarda en MP4 y puedes recortarlo antes de descargarlo.",
    "steps": [
      [
        "Copia el enlace",
        "En TikTok pulsa “Compartir” y luego “Copiar enlace”."
      ],
      [
        "Pega y descarga",
        "Pega el enlace en YT Clipper y pulsa “Descargar”."
      ],
      [
        "Recorta y guarda",
        "Exporta el video completo o solo la parte que quieras."
      ]
    ],
    "faq": [
      [
        "¿Funciona con enlaces cortos de TikTok (vm.tiktok.com)?",
        "Sí. Los enlaces cortos se redirigen automáticamente al video original."
      ]
    ]
  },
  {
    "slug": "descargar-videos-de-instagram",
    "title": "Descargar videos y Reels de Instagram en MP4 | YT Clipper",
    "description": "Descarga Reels y videos públicos de Instagram en MP4 gratis. Pega el enlace, descarga y recorta el video en clips si lo necesitas.",
    "h1": "Descargar videos y Reels de Instagram",
    "lead": "Descarga <b>Reels</b> y videos públicos de <b>Instagram</b> en MP4.",
    "about": "Copia el enlace del Reel o la publicación desde el menú “···” o el botón de compartir de Instagram y pégalo en YT Clipper. Funciona con publicaciones de cuentas públicas.",
    "steps": [
      [
        "Copia el enlace",
        "En Instagram toca “···” o compartir y elige “Copiar enlace”."
      ],
      [
        "Pega y descarga",
        "Pega el enlace en YT Clipper y pulsa “Descargar”."
      ],
      [
        "Recorta si quieres",
        "Corta el Reel o expórtalo completo en MP4."
      ]
    ],
    "faq": [
      [
        "¿Puedo descargar videos de cuentas privadas de Instagram?",
        "No. Solo se pueden descargar publicaciones de cuentas públicas."
      ]
    ]
  },
  {
    "slug": "descargar-videos-de-facebook",
    "title": "Descargar videos de Facebook en MP4 gratis | YT Clipper",
    "description": "Descarga videos públicos de Facebook en MP4 en alta calidad. Pega el enlace, descarga y divide el video en partes de máximo 10 minutos.",
    "h1": "Descargar videos de Facebook en MP4",
    "lead": "Descarga videos públicos de <b>Facebook</b> y córtalos en clips o en partes de 10 minutos.",
    "about": "Abre el video en Facebook, pulsa “Compartir” y “Copiar enlace”, y pégalo en YT Clipper. Los videos largos, como transmisiones en vivo guardadas, se pueden dividir en partes de hasta 10 minutos.",
    "steps": [
      [
        "Copia el enlace",
        "En el video de Facebook pulsa “Compartir” y “Copiar enlace”."
      ],
      [
        "Pega y descarga",
        "Pega el enlace en YT Clipper y pulsa “Descargar”."
      ],
      [
        "Corta o divide",
        "Exporta el video completo, en partes o solo los mejores momentos."
      ]
    ],
    "faq": [
      [
        "¿Puedo descargar transmisiones en vivo de Facebook?",
        "Sí, cuando la transmisión ya terminó y quedó publicada como video público."
      ]
    ]
  },
  {
    "slug": "descargar-videos-de-x-twitter",
    "title": "Descargar videos de X (Twitter) en MP4 gratis | YT Clipper",
    "description": "Descarga videos de X (antes Twitter) en MP4 gratis. Pega el enlace del post, descarga el video y recórtalo en clips si lo necesitas.",
    "h1": "Descargar videos de X (Twitter)",
    "lead": "Pega el enlace de un post de <b>X (Twitter)</b> con video y descárgalo en MP4.",
    "about": "Copia el enlace del post desde el botón de compartir de X y pégalo en YT Clipper. La herramienta descarga el video en la mejor calidad disponible y lo deja listo para cortar.",
    "steps": [
      [
        "Copia el enlace",
        "En X toca compartir y elige “Copiar enlace”."
      ],
      [
        "Pega y descarga",
        "Pega el enlace en YT Clipper y pulsa “Descargar”."
      ],
      [
        "Recorta si quieres",
        "Exporta el video completo o solo un fragmento."
      ]
    ],
    "faq": [
      [
        "¿Funciona con enlaces de twitter.com y x.com?",
        "Sí. Acepta enlaces de ambos dominios."
      ]
    ]
  }
];

const NAV = [
  [
    "",
    "Inicio"
  ],
  [
    "descargar-videos-de-youtube",
    "Descargar de YouTube"
  ],
  [
    "cortar-videos-de-youtube",
    "Cortar videos"
  ],
  [
    "dividir-video-en-partes-de-10-minutos",
    "Partes de 10 min"
  ],
  [
    "highlights-de-youtube",
    "Highlights"
  ],
  [
    "youtube-a-shorts",
    "YouTube a Shorts"
  ],
  [
    "descargar-videos-de-internet",
    "Videos de internet"
  ],
  [
    "descargar-videos-de-tiktok",
    "TikTok"
  ],
  [
    "descargar-videos-de-instagram",
    "Instagram"
  ],
  [
    "descargar-videos-de-facebook",
    "Facebook"
  ],
  [
    "descargar-videos-de-x-twitter",
    "X (Twitter)"
  ]
];

const PAGES_BY_SLUG = Object.fromEntries(PAGES.map((p) => [p.slug, p]));

module.exports = { SITE_NAME, FEATURES, PLATFORMS, GENERAL_FAQ, PAGES, NAV, PAGES_BY_SLUG };
