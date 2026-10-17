# Visitante repetido en el aviso de WhatsApp

La página (`index.html`) ya envía a `notify.php`, junto con la entrada de cada visita, un campo `vis` así:

```json
"vis": { "uid": "f19e1d11…", "n": 3, "first": 1782000000000, "prev": 1791000000000 }
```

- `uid`: ID anónimo guardado en el navegador del visitante
- `n`: número de visita desde ese navegador
- `first`: fecha de la primera visita (milisegundos)
- `prev`: fecha de la visita anterior (milisegundos)

## Instalación

Si usas el `notify.php` que te pasó Claude (ya integrado), solo sube `notify.php` y la carpeta `bot/`
y cambia `MAL_VIS_SALT` en `bot/visitas.php`. Lo de abajo es para integrarlo a mano.

### Integración manual

1. Sube la carpeta `bot/` a tu servidor, en la misma carpeta que `notify.php`.
2. En `bot/visitas.php`, cambia `MAL_VIS_SALT` por una frase secreta tuya.
3. En `notify.php`, donde se recibe la **entrada** (el POST JSON con `tz`, `lang`, `ref` y `screen`) y se arma el texto de WhatsApp, añade:

```php
require_once __DIR__ . '/bot/visitas.php';
$linea = mal_linea_visita($data);   // $data = el JSON recibido, ya decodificado como array
$mensaje .= "\n" . $linea;          // usa el nombre de variable que tenga tu texto
```

## Qué recibirás

```
🆕 Primera visita
🔁 REPETIDO · 2.ª visita · la última fue ayer (15 oct 2026)
🔁 REPETIDO · 3.ª visita · la última fue hace 12 días (4 oct 2026) · primera: 8 jul 2026
🔁 REPETIDO · 5.ª visita · la última fue hace 3 meses (13 jul 2026) · primera: 30 mar 2026
```

## Notas

- El historial se guarda en `bot/visitas-data/visitas.json`. Esa carpeta se protege sola con un `.htaccess` para que nadie la pueda descargar.
- Si el visitante borra los datos del navegador o usa modo incógnito, el servidor intenta reconocerlo por una huella cifrada de IP y navegador. Ese método es menos exacto: una IP compartida o un cambio de red puede confundirlo.
- Los registros con más de 2 años sin actividad se borran solos.
- Tus propias visitas siguen sin contarse en los dispositivos donde activaste `?soyyo`.
