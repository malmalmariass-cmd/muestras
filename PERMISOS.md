# Permisos: técnico vs. supervisor

| Acción | Técnico | Supervisor / admin |
|--------|:------:|:------:|
| Importar clientes o partes en masa (Excel / CSV / Word) | ✗ (no ve el botón) | ✓ |
| Registrar un cliente **nuevo** llenando el reporte | ✓ queda **pendiente** de aprobación | ✓ queda aprobado |
| Modificar datos de un cliente ya registrado | ✗ — el cambio viaja como **solicitud** para aprobar | ✓ |
| Borrar clientes | ✗ | ✓ (desde el panel) |
| Ver precios / costos de partes | ✗ | ✓ |

## Lo que hace la app (`index.html`)

- El rol se toma de `user.role` en la respuesta de `login`. Si no viene, se trata como **técnico** (opción segura).
  Roles con permisos: `supervisor`, `admin`, `owner`, `manager`.
- **Clientes**
  - Al escribir un cliente que no está registrado aparece el aviso *"Cliente nuevo: queda registrado con este
    reporte y pendiente hasta que el supervisor lo apruebe"*. El reporte se envía con `customerStatus: "new"`.
  - Si el cliente ya existe y el técnico pone otro correo / WhatsApp / dirección, aparece el aviso de que el cambio
    va al supervisor. El reporte se envía con `customerStatus: "changed"` y `customerChanges: {email: "…"}`.
    La ficha del cliente en la tablet **no cambia**.
  - Escribir "acme" selecciona el cliente registrado "ACME" (no crea un duplicado).
  - "+ Nuevo trabajo" envía `newCustomer: true` cuando el cliente no está registrado.
  - La lista de clientes del servidor manda: al sincronizar se descartan los cambios locales a clientes
    registrados; los nuevos pendientes de esa tablet se conservan hasta que el servidor los tenga.
- **Precios**: para el técnico, la app elimina cualquier campo de precio/costo (`price`, `cost`, `amount`,
  `total`, `margin`, `markup`, `landed`) del inventario, solicitudes de partes, trabajos y reportes antes de
  mostrarlos o guardarlos en la tablet.

## Lo que **debe** hacer el servidor (`api/api.php`)

La app solo oculta; **un técnico con conocimientos podría llamar al API directamente**. La seguridad real está aquí:

```php
function is_sup($u) { return in_array($u['role'] ?? '', ['supervisor', 'admin', 'owner', 'manager'], true); }

// 1) login: devolver el rol
out(['ok' => true, 'token' => $token, 'user' => ['code' => $u['code'], 'name' => $u['name'], 'role' => $u['role']]]);

// 2) sin precios para técnicos en TODAS las respuestas que lleven partes
function strip_prices($x) {
    if (!is_array($x)) return $x;
    $o = [];
    foreach ($x as $k => $v) {
        if (is_string($k) && preg_match('/price|cost|amount|total|margin|markup|landed/i', $k)) continue;
        $o[$k] = strip_prices($v);
    }
    return $o;
}
// en inventory_list, preq_list, jobs_list, my_reports, equipment_history, service_items:
if (!is_sup($user)) $resp = strip_prices($resp);

// 3) importación masiva: solo supervisor
if (in_array($action, ['customers_import', 'inventory_import'], true) && !is_sup($user)) out(['ok' => false, 'error' => 'Forbidden'], 403);

// 4) save_report / job_save de un técnico: NO tocar la tabla de clientes directamente
if (!is_sup($user)) {
    if (($r['customerStatus'] ?? '') === 'new' || !empty($in['newCustomer'])) {
        // INSERT IGNORE INTO customers (..., status) VALUES (..., 'pending')   -- pendiente de aprobación
    } elseif (($r['customerStatus'] ?? '') === 'changed') {
        // INSERT INTO customer_change_requests (customer_name, changes_json, requested_by, report_id, created_at)
    }
    // ignorar cualquier campo de precio que mande el técnico y conservar los guardados
}
```

En el panel del supervisor hacen falta dos listas: **Clientes pendientes** (aprobar / editar / rechazar) y
**Cambios solicitados** (aprobar / rechazar). Solo el supervisor puede borrar o modificar clientes.
Los clientes `pending` sí deben devolverse en `customers` al técnico que los creó, para que pueda seguir usándolos.
