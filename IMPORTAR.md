# Importar clientes y partes (Excel / CSV / Word)

La app tiene ahora un botón **⇪ Importar** arriba, junto a "Salir".

- **Clientes**: Excel (.xlsx/.xls), CSV o tabla de Word (.docx). Reconoce columnas como
  *Company Name / Empresa, Contact / Contacto, Address / Dirección, Email / Correo, Phone / Teléfono*,
  aunque el encabezado no esté en la primera fila. Une duplicados, pasa los teléfonos a formato
  WhatsApp (+1…), valida correos y avisa de clientes sin datos de contacto.
- **Partes / inventario**: Excel, CSV o tabla de Word (sirve una cotización del proveedor tal cual).
  Reconoce *Part Number, Description, Qty, Unit, Unit price, Vendor*. Ignora las filas de totales y
  reparte la fila de **flete (Freight / Flete)** entre las partes como **costo real** (landed cost).
- Muestra una vista previa (nuevo / actualiza) **antes** de importar. Nada se envía sin pulsar "Importar".
- `.doc` antiguo no se puede leer: guardarlo como `.docx` o usar Excel.
- Botón **Descargar plantilla** con las columnas correctas.

El lector de Excel (`vendor/xlsx.full.min.js`, SheetJS 0.18.5) solo se descarga al abrir Importar,
así no hace más lenta la app. **Hay que subir la carpeta `vendor/` al servidor** junto al `index.html`;
si falta, se usa la copia del CDN (verificada con SRI).

## Lo que falta en el servidor

La app envía dos acciones nuevas a `api/api.php`. Mientras el servidor no las tenga:
- **Clientes**: se guardan solo en esa tablet (sirven para autocompletar) y se avisa.
- **Partes**: no se cambia nada y se avisa.

Plantilla para `api/api.php` (adaptar nombres de tablas/columnas a la base real; usa PDO con
sentencias preparadas y **solo permite administradores**):

```php
case 'customers_import':
    require_role($user, 'admin');                       // técnicos no pueden importar
    $list = array_slice($in['customers'] ?? [], 0, 2000); // límite por envío
    $st = $pdo->prepare('INSERT INTO customers (name, contact, address1, email, whatsapp)
        VALUES (:name, :contact, :address1, :email, :whatsapp)
        ON DUPLICATE KEY UPDATE                          -- requiere UNIQUE(name)
          contact  = COALESCE(NULLIF(VALUES(contact), ""),  contact),
          address1 = COALESCE(NULLIF(VALUES(address1), ""), address1),
          email    = COALESCE(NULLIF(VALUES(email), ""),    email),
          whatsapp = COALESCE(NULLIF(VALUES(whatsapp), ""), whatsapp)');
    $pdo->beginTransaction(); $n = 0;
    foreach ($list as $c) {
        $name = trim(mb_substr($c['name'] ?? '', 0, 200)); if ($name === '') continue;
        $email = filter_var($c['email'] ?? '', FILTER_VALIDATE_EMAIL) ?: '';
        $st->execute([':name' => $name, ':contact' => mb_substr($c['contact'] ?? '', 0, 120),
            ':address1' => mb_substr($c['address1'] ?? '', 0, 250), ':email' => $email,
            ':whatsapp' => preg_replace('/[^\d+]/', '', $c['whatsapp'] ?? '')]);
        $n++;
    }
    $pdo->commit();
    audit($user, 'customers_import', $n);              // registro de quién importó qué
    out(['ok' => true, 'imported' => $n]);

case 'inventory_import':
    require_role($user, 'admin');
    $items = array_slice($in['items'] ?? [], 0, 2000);
    $st = $pdo->prepare('INSERT INTO inventory (part_no, name, qty, unit, unit_price, landed_cost, vendor, kind)
        VALUES (:p, :n, :q, :u, :pr, :lc, :v, "stock")
        ON DUPLICATE KEY UPDATE                          -- requiere UNIQUE(part_no)
          qty = qty + VALUES(qty), unit_price = VALUES(unit_price),
          landed_cost = VALUES(landed_cost), vendor = VALUES(vendor)');
    $pdo->beginTransaction(); $n = 0;
    foreach ($items as $i) {
        $p = strtoupper(trim(mb_substr($i['partNo'] ?? '', 0, 60))); if ($p === '') continue;
        $st->execute([':p' => $p, ':n' => mb_substr($i['name'] ?? $p, 0, 200), ':q' => max(0, (float)($i['qty'] ?? 0)),
            ':u' => mb_substr($i['unit'] ?? 'ea', 0, 10), ':pr' => max(0, (float)($i['unitPrice'] ?? 0)),
            ':lc' => max(0, (float)($i['landedCost'] ?? 0)), ':v' => mb_substr($i['vendor'] ?? '', 0, 120)]);
        $n++;
    }
    $pdo->commit();
    audit($user, 'inventory_import', $n);
    out(['ok' => true, 'imported' => $n]);
```

Notas:
- La importación de partes **suma** la cantidad al stock existente (mercancía recibida). Si la
  cotización es solo un pedido que aún no llega, usar `kind = "order"` y no sumar `qty`.
- `customers` debe devolver también los clientes importados para que todas las tablets los vean.
