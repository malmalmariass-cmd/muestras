<?php
/**
 * Detecta visitantes que vuelven (días o meses después) para el aviso de WhatsApp.
 *
 * Uso dentro de notify.php, en la parte que recibe la ENTRADA del visitante
 * (el POST JSON con tz, lang, ref, screen):
 *
 *   require_once __DIR__ . '/bot/visitas.php';
 *   $linea = mal_linea_visita($data);   // $data = json_decode(file_get_contents('php://input'), true)
 *   $mensaje .= "\n" . $linea;          // añádelo al texto que ya envías por WhatsApp
 *
 * Ejemplos de lo que devuelve:
 *   🆕 Primera visita
 *   🔁 REPETIDO · 3.ª visita · la última fue hace 12 días (4 oct 2026) · primera: 10 jul 2026
 *   🔁 REPETIDO · 2.ª visita · la última fue ayer (15 oct 2026)
 *
 * Cómo reconoce a la persona:
 *   1) Por el ID anónimo que la página guarda en su navegador (campo "vis" del POST).
 *   2) Si no hay ID (navegador que borra datos), por una huella cifrada de IP + navegador.
 *      Nunca se guarda la IP en claro, solo un hash con sal.
 */

const MAL_VIS_TZ   = 'America/Santo_Domingo';
const MAL_VIS_FILE = __DIR__ . '/visitas-data/visitas.json';
// Cambia esta sal por una frase secreta tuya (no la compartas).
const MAL_VIS_SALT = 'cambia-esta-frase-secreta';

function mal_linea_visita(array $d): string
{
    $now = time();
    $vis = (isset($d['vis']) && is_array($d['vis'])) ? $d['vis'] : [];
    $uid = isset($vis['uid']) ? preg_replace('/[^a-f0-9]/i', '', (string)$vis['uid']) : '';
    $ua  = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
    $ip  = function_exists('ip_cliente') ? ip_cliente() : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');
    $fp  = 'fp:' . substr(hash('sha256', MAL_VIS_SALT . '|' . $ip . '|' . $ua), 0, 24);
    $key = $uid !== '' ? 'id:' . substr($uid, 0, 32) : $fp;

    $db = mal_vis_cargar_y_guardar(function (array $db) use ($key, $fp, $now) {
        // Si llega con ID y antes vino sin ID (solo huella), es la misma persona: se unen.
        if (!isset($db[$key]) && $key !== $fp && isset($db[$fp])) {
            $db[$key] = $db[$fp];
            unset($db[$fp]);
        }
        $r = isset($db[$key]) ? $db[$key] : ['first' => $now, 'last' => null, 'n' => 0];
        $r['prev'] = $r['last'];
        $r['n']   += 1;
        $r['last'] = $now;
        $db[$key] = $r;
        return $db;
    });
    $r = $db[$key];

    // El navegador puede recordar visitas anteriores a que existiera este registro.
    $n     = max((int)$r['n'], isset($vis['n']) ? (int)$vis['n'] : 0);
    $first = (int)$r['first'];
    if (!empty($vis['first']) && (int)($vis['first'] / 1000) < $first) $first = (int)($vis['first'] / 1000);
    $prev = $r['prev'];
    if (!$prev && !empty($vis['prev'])) $prev = (int)($vis['prev'] / 1000);

    if ($n <= 1 || !$prev) return '🆕 Primera visita';

    $txt = '🔁 REPETIDO · ' . $n . '.ª visita · la última fue ' . mal_vis_hace($prev, $now) . ' (' . mal_vis_fecha($prev) . ')';
    if ($n > 2 && $first < $prev) $txt .= ' · primera: ' . mal_vis_fecha($first);
    return $txt;
}

function mal_vis_hace(int $t, int $now): string
{
    $tz = new DateTimeZone(MAL_VIS_TZ);
    $a  = (new DateTime('@' . $t))->setTimezone($tz)->setTime(0, 0);
    $b  = (new DateTime('@' . $now))->setTimezone($tz)->setTime(0, 0);
    $dias = (int)$a->diff($b)->days;
    if ($dias === 0) return 'hoy mismo';
    if ($dias === 1) return 'ayer';
    if ($dias < 60)  return 'hace ' . $dias . ' días';
    $meses = (int)floor($dias / 30.44);
    if ($meses < 24) return 'hace ' . $meses . ' meses';
    return 'hace ' . (int)floor($dias / 365.25) . ' años';
}

function mal_vis_fecha(int $t): string
{
    $m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    $d = (new DateTime('@' . $t))->setTimezone(new DateTimeZone(MAL_VIS_TZ));
    return $d->format('j') . ' ' . $m[(int)$d->format('n') - 1] . ' ' . $d->format('Y');
}

function mal_vis_cargar_y_guardar(callable $cambio): array
{
    $dir = dirname(MAL_VIS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
        @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
    }
    $fh = @fopen(MAL_VIS_FILE, 'c+');
    if (!$fh) return $cambio([]);
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $db  = $raw ? json_decode($raw, true) : [];
    if (!is_array($db)) $db = [];
    $db = $cambio($db);
    // Mantener el archivo pequeño: olvidar visitantes de hace más de 2 años.
    $limite = time() - 2 * 365 * 86400;
    foreach ($db as $k => $r) if (isset($r['last']) && $r['last'] < $limite) unset($db[$k]);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($db));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $db;
}
