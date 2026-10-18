# Página de inicio única e importación masiva

## Una sola entrada: `index.html`

La pantalla de inicio tiene dos opciones: **Técnico** o **Supervisor**. Mismo ID de empleado y PIN de siempre.

- **Técnico** → abre la app de reportes (tablet).
- **Supervisor** → valida en el servidor que la cuenta sea de supervisor (`supervisorOnly`) y abre el panel
  (`admin.html`) ya con la sesión iniciada. Si la cuenta es de técnico, muestra el error y no entra.
- La app recuerda la última opción. Cada pestaña tiene su propia sesión: puedes tener el panel en una y la app del
  técnico en otra. Al cerrar la pestaña, la sesión se cierra.
- **Salir** del panel vuelve a la página de inicio con "Supervisor" marcado.
- Si el servidor exige cambiar el PIN (cuenta maestra o PIN corto), el panel lo pide al entrar. El PIN nunca se guarda.
- `admin.html` ya no tiene su propio login. Su pantalla solo aparece para la **configuración inicial**
  (primera cuenta de supervisor, cuando la base está vacía).

Siguen siendo dos archivos a propósito: así la tablet del técnico no descarga el código del panel (es más
rápida y no expone las funciones de supervisor). Para el usuario es una sola página de inicio.

## Importación masiva (solo en el panel del supervisor)

Botón **⇪ Import Excel / Word** en **Customers** y en **Inventory**. Lee Excel (.xlsx/.xls), CSV, tablas de
Word (.docx) y **fotos o capturas de pantalla** de una tabla (el texto se reconoce solo y se puede corregir
antes de importar). `.doc` antiguo: guardarlo como .docx. Muestra una vista previa antes de importar.

Usa las acciones que el servidor **ya tiene** (`customer_save`, `inventory_save`, `inventory_adjust`), así que
funciona sin tocar `api/api.php`.

**Clientes**
- Une duplicados, teléfonos a formato WhatsApp (+1…), valida correos, separa los "Cash customer" por contacto.
- Cliente **nuevo** → se crea. El contacto va en Notas ("Contact: Albert").
- Cliente **ya registrado** → **no se sobrescribe nada**; solo se rellenan sus campos vacíos.

**Partes**
- Ignora filas de totales. La fila de **flete (Freight/Flete)** se reparte entre las partes → **costo real**.
- Elegir: **Received** (suma al stock) o **Vendor catalog** (catálogo para pedir, no suma stock).
- **Markup %**: precio de venta = costo real × (1 + markup). Sin markup avisa que se venderían al costo.
- Parte **nueva** → se crea con su cantidad y precio de venta.
- Parte **ya existente** → con "Received" se suma la cantidad como *Restock* (queda en el historial de
  movimientos con el nombre del archivo); su precio no se cambia.

## Archivos a subir al servidor

`index.html`, `admin.html` y la carpeta `vendor/` completa: el lector de Excel y `vendor/ocr/` (lector de
imágenes, ~11 MB, solo se descarga la primera vez que se importa una foto).
