# Permisos: técnico vs. supervisor

| Acción | Técnico | Supervisor / admin |
|--------|:------:|:------:|
| Entrar al panel del supervisor (`admin.html`) | ✗ (el servidor lo rechaza) | ✓ |
| Importar clientes o partes en masa (Excel / CSV / Word) | ✗ (solo existe en el panel) | ✓ |
| Registrar un cliente **nuevo** llenando el reporte | ✓ queda registrado al guardar y **se avisa al supervisor** | ✓ |
| Modificar datos de un cliente ya registrado | ✗ — el cambio viaja en el reporte y el supervisor lo **aprueba** desde el reporte | ✓ |
| Borrar clientes | ✗ | ✓ (desde el panel) |
| Ver precios / costos de partes | ✗ | ✓ |

## Lo que hace la app (`index.html`)

- El rol se toma de `user.role` en la respuesta de `login`. Si no viene, se trata como **técnico** (opción segura).
  El servidor usa `supervisor` y `tech`.
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

## Lo que hace el servidor (`api/api.php`)

Revisado con el `api.php` real:
- **Precios:** el servidor ya los quita de todo lo que recibe un técnico (inventario, reportes, solicitudes,
  pedidos, historial de equipos) y conserva los precios de la oficina cuando un técnico guarda.
- **Clientes:** un cliente nuevo escrito en un reporte (o en "+ Nuevo trabajo") se registra solo y queda marcado
  como *nuevo de técnico*: el panel muestra un contador rojo en **Customers**, un aviso emergente y un
  recuadro con **Mark reviewed** / **Mark all as reviewed**. Si ya existe, el servidor **solo rellena
  campos vacíos**, nunca sobrescribe. Los cambios que propone el técnico van en el reporte
  (`customerChanges`) y el supervisor los aplica con **Approve and update the customer**.
- **Borrar clientes, inventario, facturas, empleados:** solo supervisores (`need_sup`).
- **Panel:** `login` con `supervisorOnly` rechaza cuentas de técnico.
