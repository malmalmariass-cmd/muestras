/* Cher Services — screen helpers shared by the technician app (index.html) and the supervisor panel (admin.html).
   1. Small screens (phones, small tablets, Chromebooks): the tab bars become one row you can swipe.
   2. "There is more here": arrows and a fade on anything that hides content to the side, a "▼ more" pill on windows
      with more below, and a red dot on the arrow when a notification is out of view.
   3. Tutorial mode: a card that explains each section when it opens, and tips on every important button
      (hover with the mouse, or hold the finger on it). Chosen on the sign-in screen; 💡 in the header turns it on/off. */
(() => {
  const isTech = !!document.getElementById('viewJobs');
  const LSget = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const lang = () => { try { return JSON.parse(localStorage.getItem('cher.lang')) === 'es' ? 'es' : 'en'; } catch { return 'en'; } };
  const tipsOn = () => LSget('cher.tips', '1') !== '0';
  const L = o => (o && (o[lang()] || o.en)) || '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------------ windows on top
     A window opened from inside another one (the PIN check from Developer tools, a contact from an invoice…) always
     comes to the front, whatever its place in the page; otherwise it opened behind and the button seemed dead. */
  const isWin = el => el.nodeType === 1 && (el.classList.contains('modal') || el.classList.contains('sheet'));
  new MutationObserver(ms => ms.forEach(m => {
    const el = m.target; if (!isWin(el) || el.hidden) return;
    let top = 0; document.querySelectorAll('.modal:not([hidden]),.sheet:not([hidden])').forEach(o => { if (o !== el) top = Math.max(top, +getComputedStyle(o).zIndex || 0); });
    el.style.zIndex = ''; const own = +getComputedStyle(el).zIndex || 0;
    if (top >= own) el.style.zIndex = top + 1;
  })).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  /* ------------------------------------------------------------------ styles */
  const css = `
@media (max-width:820px){
  header nav,nav.tabs,.subtabs{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;max-width:100%}
  header nav::-webkit-scrollbar,nav.tabs::-webkit-scrollbar,.subtabs::-webkit-scrollbar{display:none}
  header nav{width:100%;margin-left:0!important;order:5}nav.tabs{width:100%}
  header nav button,nav.tabs button,.subtabs button{flex:0 0 auto;white-space:nowrap}
}
.form .acts,.acts{flex-wrap:wrap}
.sh-r{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 34px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 34px),transparent)}
.sh-l{-webkit-mask-image:linear-gradient(to left,#000 calc(100% - 34px),transparent);mask-image:linear-gradient(to left,#000 calc(100% - 34px),transparent)}
.sh-l.sh-r{-webkit-mask-image:linear-gradient(to right,transparent,#000 34px,#000 calc(100% - 34px),transparent);mask-image:linear-gradient(to right,transparent,#000 34px,#000 calc(100% - 34px),transparent)}
.uh-arr{position:fixed;z-index:9000;width:30px;height:30px;border-radius:50%;border:0;background:#123a8c;color:#fff;font-size:15px;font-weight:800;line-height:30px;text-align:center;
  box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;padding:0;opacity:.92;display:none}
.uh-arr.dot::after{content:'';position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:#d0021b;box-shadow:0 0 0 2px #fff}
.uh-more{position:fixed;z-index:9000;transform:translateX(-50%);border:0;border-radius:999px;background:#123a8c;color:#fff;font-size:13px;font-weight:700;
  padding:6px 14px;box-shadow:0 3px 12px rgba(0,0,0,.25);cursor:pointer;display:none}
.uh-tip{position:fixed;z-index:9600;max-width:min(320px,calc(100vw - 20px));background:#0a1f5c;color:#fff;font-size:13.5px;line-height:1.4;padding:9px 12px;border-radius:10px;
  box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none;display:none}
.uh-tip b{display:block;margin-bottom:2px;color:#ffd75e}
.uh-card{position:fixed;z-index:9500;right:16px;bottom:16px;width:min(380px,calc(100vw - 24px));background:#fff;color:#16202e;border-radius:14px;border-left:6px solid #123a8c;
  box-shadow:0 10px 36px rgba(10,31,92,.28);padding:14px 16px 12px;font-size:14px;line-height:1.45;display:none}
.uh-card h4{margin:0 0 6px;font-size:16px;color:#123a8c}.uh-card ul{margin:0 0 8px;padding-left:18px}.uh-card li{margin:3px 0}
.uh-card .uh-acts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.uh-card button{border:0;border-radius:999px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:13px}
.uh-card .ok{background:#123a8c;color:#fff}.uh-card .off{background:#eef2f8;color:#123a8c}
.uh-card .hint{color:#6b7385;font-size:12.5px;margin:0 0 8px}
@media (max-width:600px){.uh-card{right:10px;left:10px;width:auto;font-size:13px;max-height:46vh;overflow:auto;padding:12px 14px 10px}.uh-card .hint{display:none}#uhTipsBtn .uh-l{display:none}}
@media (max-width:640px){.form .row,.form .row3{grid-template-columns:1fr!important}.rowhead{flex-wrap:wrap;gap:8px}.ivbill label.chk{display:block!important}.ivbill label.chk input{vertical-align:-3px;margin-right:6px}}
#uhTipsBtn{border:0;background:#eef2f8;color:#123a8c;border-radius:999px;padding:7px 11px;font-weight:700;cursor:pointer;font-size:13px;white-space:nowrap}
#uhTipsBtn.on{background:#ffd75e;color:#0a1f5c}
.uh-tipsopt{display:flex;gap:8px;align-items:center;justify-content:center;margin:10px 0 4px;font-size:14px;color:#123a8c;font-weight:600;cursor:pointer}
.uh-tipsopt input{width:18px;height:18px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ------------------------------------------------------------------ texts */
  const T = {
    on: { en: '💡 Tips on', es: '💡 Ayuda activada' }, off: { en: '💡 Tips', es: '💡 Ayuda' },
    toggleTitle: { en: 'Tutorial mode: explains each section and button', es: 'Modo tutorial: explica cada sección y botón' },
    login: { en: '💡 Tutorial mode — explain each section as I use the app', es: '💡 Modo tutorial — explicar cada sección mientras uso la app' },
    gotIt: { en: 'Got it', es: 'Entendido' }, turnOff: { en: 'Turn off tips', es: 'Apagar la ayuda' },
    more: { en: '▼ more below', es: '▼ hay más abajo' },
    howTips: { en: 'Point at a button with the mouse — or hold your finger on it — to see what it does.', es: 'Pasa el mouse sobre un botón — o mantén el dedo encima — para ver para qué sirve.' },
    offToast: { en: 'Tips turned off. Turn them on again with 💡 at the top.', es: 'Ayuda apagada. Actívala otra vez con 💡 arriba.' }
  };
  const tx = k => L(T[k]);

  // Section guides: [selector that is visible → key]. The first match is the section on screen.
  const SECTIONS = isTech ? [
    ['#login:not([hidden])', ''], ['#paySheet:not([hidden])', 'pay'], ['#fuSheet:not([hidden])', 'fu'], ['#jobView:not([hidden])', 'jobView'],
    ['#partSheet:not([hidden])', 'parts'], ['#viewJobs:not([hidden])', 'jobs'], ['#viewForm:not([hidden])', () => document.querySelector('#tabMaint.on') ? 'maint' : 'form'],
    ['#viewReqs:not([hidden])', 'reqs'], ['#viewHist:not([hidden])', 'hist']
  ] : [
    ['#ivModal:not([hidden])', 'p_ivModal'], ['#rqModal:not([hidden])', 'p_rqModal'], ['#jobModal:not([hidden])', 'p_jobModal'], ['#supSigModal:not([hidden])', 'p_supSig'],
    ['section[data-view]:not([hidden])', el => 'p_' + el.dataset.view]
  ];
  const G = {
    // ---- technician app
    login: { en: ['Sign in', ['Choose Technician or Supervisor.', 'Type your Employee ID and PIN (or use the number pad).', 'Choose the language and whether you want the tips (tutorial mode).']],
             es: ['Iniciar sesión', ['Elige Técnico o Supervisor.', 'Escribe tu ID de empleado y tu PIN (o usa el teclado numérico).', 'Elige el idioma y si quieres la ayuda (modo tutorial).']] },
    jobs: { en: ['Jobs — your appointments', ['The office assigns them. Yellow = tomorrow, green = today.', 'Tap a job to read the instructions, then choose “Service report” or “Equipment service”.', 'From the job you can postpone, reschedule, ask to cancel or send a WhatsApp reminder.']],
            es: ['Trabajos — tus citas', ['Los asigna la oficina. Amarillo = mañana, verde = hoy.', 'Toca un trabajo para leer las instrucciones y luego elige “Reporte de servicio” o “Servicio a equipo”.', 'Desde el trabajo puedes aplazar, reprogramar, pedir cancelar o enviar un recordatorio por WhatsApp.']] },
    jobView: { en: ['Job details', ['Read the office instructions, address (Map) and equipment.', 'Start the report from here.', 'Postpone = same day, other time. Reschedule = other day (up to a month). Cancel needs the supervisor.']],
               es: ['Detalle del trabajo', ['Lee las instrucciones de la oficina, la dirección (Mapa) y el equipo.', 'Empieza el reporte desde aquí.', 'Aplazar = mismo día, otra hora. Reprogramar = otro día (hasta un mes). Cancelar lo aprueba el supervisor.']] },
    form: { en: ['Service report (repairs)', ['Fill customer, equipment, faults and corrections, and the hours worked.', 'The number is assigned automatically and kept for this report.', 'Save often: it stays on the tablet and goes to the office when there is internet.', 'Signatures at the end; “Send / PDF” sends it to the customer.', '“📅 Schedule follow-up check” if the customer must be visited again.']],
            es: ['Reporte de servicio (reparaciones)', ['Llena cliente, equipo, fallas y correcciones, y las horas trabajadas.', 'El número se asigna solo y queda para este reporte.', 'Guarda seguido: queda en la tablet y llega a la oficina cuando hay internet.', 'Las firmas van al final; “Enviar / PDF” se lo manda al cliente.', '“📅 Programar chequeo de seguimiento” si hay que volver donde el cliente.']] },
    maint: { en: ['Equipment service report', ['Check every service done from the list and add notes.', 'Same as the repair report: save, sign, and send the PDF.']],
             es: ['Reporte de servicio a equipo', ['Marca cada servicio hecho de la lista y agrega notas.', 'Igual que el reporte de reparación: guarda, firma y envía el PDF.']] },
    reqs: { en: ['Parts requests', ['“+ New request”: ask the office for parts (from the shop or to order).', 'When the office sends the quote you see the prices: preview, PDF, WhatsApp, email or print it for the customer.', 'If the customer accepts: “Customer accepted — send payment” with the reference number and a photo of the receipt.', 'When the office verifies the payment, the invoice appears here.', '📇 Vendors: who to call to buy a part.']],
            es: ['Solicitud de partes', ['“+ Nueva solicitud”: pide piezas a la oficina (del taller o para pedir).', 'Cuando la oficina manda la cotización ves los precios: ver, PDF, WhatsApp, correo o imprimir para el cliente.', 'Si el cliente acepta: “El cliente aceptó — enviar pago” con el número de referencia y foto del recibo.', 'Cuando la oficina verifica el pago, la factura aparece aquí.', '📇 Proveedores: a quién llamar para comprar una pieza.']] },
    parts: { en: ['Choose the parts', ['“In stock” = parts from our shop; “Order from vendor” = to buy outside.', 'Search, set the quantity and press Add. A part not in the list: “+ New part from an outside vendor”.', 'Send it to the supervisor at the end.']],
             es: ['Elige las piezas', ['“En stock” = piezas del taller; “Pedir a proveedor” = comprar afuera.', 'Busca, pon la cantidad y toca Agregar. Una pieza que no está: “+ Nueva pieza de proveedor”.', 'Al final envíalo al supervisor.']] },
    pay: { en: ['Customer payment', ['Full payment = part ordered from a vendor. Partial (deposit) = part from our shop.', 'Write the reference number exactly as on the receipt and take a photo of it.', 'The supervisor checks it and the invoice is made automatically.']],
           es: ['Pago del cliente', ['Pago completo = pieza pedida a proveedor. Parcial (depósito) = pieza del taller.', 'Escribe el número de referencia tal como sale en el recibo y tómale foto.', 'El supervisor lo revisa y la factura se hace sola.']] },
    fu: { en: ['Follow-up visit', ['Choose the date and time to come back and what to check.', 'It appears in Jobs with the same report number: yellow the day before, green on the day.']],
          es: ['Visita de seguimiento', ['Elige la fecha y hora para volver y qué revisar.', 'Aparece en Trabajos con el mismo número de reporte: amarillo el día antes, verde el día.']] },
    hist: { en: ['History', ['Reports saved on this tablet. “Pending sync” means it has not reached the office yet.', 'Open, make the PDF or copy one into a new report.', '“Download my reports from the office” brings back your reports on a new tablet.']],
            es: ['Historial', ['Reportes guardados en esta tablet. “Pendiente” quiere decir que aún no llegó a la oficina.', 'Abre, haz el PDF o copia uno a un reporte nuevo.', '“Descargar mis reportes de la oficina” los recupera en una tablet nueva.']] },
    // ---- supervisor panel
    p_reports: { en: ['Service reports', ['Every report sent by the technicians. Click one to open it.', 'Signatures: T technician, C customer, S supervisor. Sign with “✍ Sign as supervisor”; with the three it shows ✔ Approved.', 'Red dots = something waits for you (change requests, reports that look empty or duplicated).']],
               es: ['Reportes de servicio', ['Todos los reportes de los técnicos. Haz clic en uno para abrirlo.', 'Firmas: T técnico, C cliente, S supervisor. Firma con “✍ Sign as supervisor”; con las tres sale ✔ Approved.', 'Puntos rojos = algo te espera (pedidos de cambio, reportes que parecen vacíos o repetidos).']] },
    p_jobs: { en: ['Jobs & appointments', ['“+ New job” to schedule a visit and assign a technician (only the office creates jobs).', 'Yellow rows = tomorrow, green = today. “Cancel requested” = a technician asks to cancel: open it to approve or decline.', 'In the job: reschedule, WhatsApp reminder (if the customer agreed) and history.']],
            es: ['Trabajos y citas', ['“+ New job” para programar una visita y asignar técnico (solo la oficina crea trabajos).', 'Filas amarillas = mañana, verdes = hoy. “Cancel requested” = un técnico pide cancelar: ábrelo para aprobar o rechazar.', 'En el trabajo: reprogramar, recordatorio por WhatsApp (si el cliente aceptó) e historial.']] },
    p_invoices: { en: ['Invoices', ['“+ New invoice”: choose the customer (▼ shows all) and the work order.', 'If a person pays for a company, choose “A person pays for a company…”: the invoice goes in the company\'s name, Attn the person.', 'Open an invoice to send it, record payments or make the PDF.']],
                es: ['Facturas', ['“+ New invoice”: elige el cliente (▼ muestra todos) y la orden de trabajo.', 'Si una persona paga por una empresa, elige “A person pays for a company…”: la factura sale a nombre de la empresa, Attn la persona.', 'Abre una factura para enviarla, anotar pagos o hacer el PDF.']] },
    p_requests: { en: ['Parts requests', ['Set prices and “Send quote”: the technician shows it to the customer (stock is not touched).', '“Customer said yes”: in-house parts are reserved 2 h (you can extend).', '💡 “Payments to verify”: see the receipt photo and press “Payment verified” — the invoice is made automatically.', 'Search by report number (46, 1-005) or PR-0012.']],
                es: ['Solicitudes de partes', ['Pon precios y “Send quote”: el técnico se la muestra al cliente (el inventario no se toca).', '“Customer said yes”: las piezas del taller quedan reservadas 2 h (puedes extender).', '“Payments to verify”: mira la foto del recibo y toca “Payment verified” — la factura se hace sola.', 'Busca por número de reporte (46, 1-005) o PR-0012.']] },
    p_orders: { en: ['Orders to vendors', ['Parts that have to be bought outside. Mark each one as ordered and received.']], es: ['Pedidos a proveedores', ['Piezas que hay que comprar afuera. Márcalas como pedidas y recibidas.']] },
    p_vendors: { en: ['Vendors', ['Who we buy parts from: phone, WhatsApp, email, web.', 'Technicians see these contacts in the app (the account number only here).']], es: ['Proveedores', ['A quién le compramos piezas: teléfono, WhatsApp, correo, web.', 'Los técnicos ven estos contactos en la app (el número de cuenta solo aquí).']] },
    p_customers: { en: ['Customers', ['All customers. 🆕 = added by a technician: review and mark it.', 'Open one to edit its data and extra contacts (people who get the reports and invoices).']], es: ['Clientes', ['Todos los clientes. 🆕 = agregado por un técnico: revísalo y márcalo.', 'Abre uno para editar sus datos y contactos extra (personas que reciben reportes y facturas).']] },
    p_inventory: { en: ['Inventory', ['In-house parts and the vendor catalog. Stock goes down with reports and invoices.', 'Reserved parts (approved requests) are not available until the invoice is made.']], es: ['Inventario', ['Piezas del taller y catálogo de proveedores. El stock baja con reportes y facturas.', 'Las piezas reservadas (solicitudes aprobadas) no están disponibles hasta que se hace la factura.']] },
    p_equipment: { en: ['Equipment history', ['Every machine by serial number; open one to see all the work done on it.']], es: ['Historial de equipos', ['Cada máquina por número de serie; abre una para ver todo el trabajo hecho.']] },
    p_stats: { en: ['Statistics', ['Reports, hours and parts by period and technician.']], es: ['Estadísticas', ['Reportes, horas y piezas por período y técnico.']] },
    p_emps: { en: ['Employees', ['Add technicians and supervisors with their ID and PIN.', '“Delete” asks for your PIN; with history, the name stays on old documents.']], es: ['Empleados', ['Agrega técnicos y supervisores con su ID y PIN.', '“Delete” pide tu PIN; si tiene historial, el nombre queda en los documentos viejos.']] },
    p_settings: { en: ['Settings', ['Numbering, taxes, email (and why emails go to spam), daily and weekly summaries, backups.']], es: ['Configuración', ['Numeración, impuestos, correo (y por qué caen en spam), resúmenes diario y semanal, respaldos.']] },
    p_ivModal: { en: ['New invoice', ['Customer: type or press ▼ for the whole list.', 'Work order: the service report this invoice is for (required).', 'Add labor, in-house parts or vendor parts, then Save.']], es: ['Nueva factura', ['Cliente: escribe o toca ▼ para ver toda la lista.', 'Orden de trabajo: el reporte de servicio de esta factura (obligatorio).', 'Agrega mano de obra, piezas del taller o de proveedor y guarda.']] },
    p_rqModal: { en: ['Parts request', ['Set quantities and prices. “Send quote” → technician; “Customer said yes” → reserve.', 'A 💡 payment box appears when the technician sends the customer\'s payment.']], es: ['Solicitud de partes', ['Pon cantidades y precios. “Send quote” → técnico; “Customer said yes” → reservar.', 'Cuando el técnico manda el pago del cliente aparece el recuadro de pago.']] },
    p_jobModal: { en: ['Job', ['Received = when the customer called. Appointment = the visit.', 'Check “WhatsApp reminders” only if the customer agreed.']], es: ['Trabajo', ['Received = cuando llamó el cliente. Appointment = la visita.', 'Marca “WhatsApp reminders” solo si el cliente aceptó.']] },
    p_supSig: { en: ['Supervisor signature', ['Sign in the box and press Accept. With the customer\'s signature, the job is complete.']], es: ['Firma del supervisor', ['Firma en el recuadro y toca Accept. Con la firma del cliente, el trabajo queda completo.']] }
  };
  // Button tips: [selector, {en, es}]
  const TIPS = (isTech ? [
    ['#tabJobs', { en: 'Your appointments from the office.', es: 'Tus citas de la oficina.' }],
    ['#tabForm', { en: 'Repair / service report.', es: 'Reporte de reparación / servicio.' }],
    ['#tabMaint', { en: 'Equipment service (maintenance checklist).', es: 'Servicio a equipo (lista de mantenimiento).' }],
    ['#tabReqs', { en: 'Ask for parts, quotes for the customer and payments.', es: 'Pedir piezas, cotizaciones para el cliente y pagos.' }],
    ['#tabHist', { en: 'Reports saved on this tablet.', es: 'Reportes guardados en esta tablet.' }],
    ['.cnt', { en: 'Red number = things waiting for you here.', es: 'Número rojo = cosas que te esperan aquí.' }],
    ['.tot', { en: 'Total in this section.', es: 'Total en esta sección.' }],
    ['#syncDot', { en: 'Green = synced with the office. Yellow = waiting to send. Grey = no internet.', es: 'Verde = sincronizado. Amarillo = esperando enviar. Gris = sin internet.' }],
    ['#langSw', { en: 'Change the language.', es: 'Cambiar el idioma.' }],
    ['#btnLogout', { en: 'Sign out of this tablet.', es: 'Cerrar sesión en esta tablet.' }],
    ['#btnNew', { en: 'Start a new blank report (the current one is kept).', es: 'Empezar un reporte nuevo en blanco (el actual se guarda).' }],
    ['#btnSave', { en: 'Save on the tablet; it goes to the office when there is internet.', es: 'Guardar en la tablet; llega a la oficina cuando hay internet.' }],
    ['#btnSend', { en: 'Make the PDF and send it to the customer.', es: 'Hacer el PDF y enviarlo al cliente.' }],
    ['#addPart', { en: 'Ask the office for parts for this report.', es: 'Pedir piezas a la oficina para este reporte.' }],
    ['#fuBtn', { en: 'The customer must be visited again: schedule it with the same report number.', es: 'Hay que volver donde el cliente: prográmalo con el mismo número de reporte.' }],
    ['#histChip', { en: 'Earlier services on this same machine (by serial number).', es: 'Servicios anteriores a esta misma máquina (por número de serie).' }],
    ['.sig', { en: 'Tap to sign.', es: 'Toca para firmar.' }],
    ['#stBtns', { en: 'Current status of the job.', es: 'Estado actual del trabajo.' }],
    ['#reqNew', { en: 'New parts request.', es: 'Nueva solicitud de partes.' }],
    ['#reqVendors', { en: 'Vendor contacts to buy a part.', es: 'Contactos de proveedores para comprar una pieza.' }],
    ['#jobsRefresh, #reqRefresh', { en: 'Bring the latest from the office.', es: 'Traer lo último de la oficina.' }],
    ['[data-view="1"]', { en: 'See the job: instructions, address and actions.', es: 'Ver el trabajo: instrucciones, dirección y acciones.' }],
    ['[data-a="pay"]', { en: 'The customer accepted: register the payment (reference + photo).', es: 'El cliente aceptó: registra el pago (referencia + foto).' }],
    ['[data-q$=":prev"]', { en: 'See the document before sending it.', es: 'Ver el documento antes de enviarlo.' }],
    ['[data-q$=":wa"]', { en: 'Send a link by WhatsApp (you press Send in WhatsApp).', es: 'Enviar un enlace por WhatsApp (tú tocas Enviar en WhatsApp).' }],
    ['[data-q$=":email"]', { en: 'Email it to the customer.', es: 'Enviarlo al cliente por correo.' }],
    ['#jvActs [data-ja="remind"]', { en: 'Opens WhatsApp with the reminder written.', es: 'Abre WhatsApp con el recordatorio escrito.' }],
    ['#lgRole', { en: 'Technician = the app; Supervisor = the office panel.', es: 'Técnico = la app; Supervisor = el panel de la oficina.' }],
    ['.cmb-b', { en: 'Show the whole list.', es: 'Ver toda la lista.' }]
  ] : [
    ['nav [data-v="reports"]', { en: 'Service reports and jobs / appointments.', es: 'Reportes de servicio y trabajos / citas.' }],
    ['nav [data-v="invoices"]', { en: 'Invoices, payments and invoice statistics.', es: 'Facturas, pagos y estadísticas de facturas.' }],
    ['nav [data-v="requests"]', { en: 'Parts requests, payments to verify, orders and vendors.', es: 'Solicitudes de partes, pagos por verificar, pedidos y proveedores.' }],
    ['nav [data-v="customers"]', { en: 'Customer directory and their contacts.', es: 'Directorio de clientes y sus contactos.' }],
    ['nav [data-v="inventory"]', { en: 'Shop stock and vendor catalog.', es: 'Stock del taller y catálogo de proveedores.' }],
    ['nav [data-v="equipment"]', { en: 'History of each machine by serial number.', es: 'Historial de cada máquina por número de serie.' }],
    ['nav [data-v="stats"]', { en: 'Numbers by period and technician.', es: 'Números por período y técnico.' }],
    ['nav [data-v="emps"]', { en: 'Technicians and supervisors.', es: 'Técnicos y supervisores.' }],
    ['nav [data-v="settings"]', { en: 'Numbering, taxes, email, summaries, backups.', es: 'Numeración, impuestos, correo, resúmenes, respaldos.' }],
    ['.nb', { en: 'Red dot = things waiting for you here.', es: 'Punto rojo = cosas que te esperan aquí.' }],
    ['.tc', { en: 'Total in this section.', es: 'Total en esta sección.' }],
    ['#addJob', { en: 'Schedule a visit and assign a technician.', es: 'Programar una visita y asignar técnico.' }],
    ['#addInvoice', { en: 'Bill a customer.', es: 'Facturar a un cliente.' }],
    ['#addEmp', { en: 'New technician or supervisor.', es: 'Nuevo técnico o supervisor.' }],
    ['#addVend', { en: 'Add a vendor we buy parts from.', es: 'Agregar un proveedor.' }],
    ['#supSign', { en: 'Your signature completes the job.', es: 'Tu firma completa el trabajo.' }],
    ['#dPdf', { en: 'Download the report PDF.', es: 'Descargar el PDF del reporte.' }],
    ['#resendOffice', { en: 'Email the office copy right now.', es: 'Enviar ya la copia de la oficina por correo.' }],
    ['#mailCheck', { en: 'Checks your domain settings so emails don\'t go to spam.', es: 'Revisa tu dominio para que los correos no caigan en spam.' }],
    ['#rqStatus', { en: 'Filter; “Payments to verify” shows what the technicians sent.', es: 'Filtrar; “Payments to verify” muestra lo que mandaron los técnicos.' }],
    ['#rqQ', { en: 'Search by report number (46, 1-005), PR-0012, customer…', es: 'Busca por número de reporte (46, 1-005), PR-0012, cliente…' }],
    ['#rqApprove', { en: 'The customer said yes: reserve the parts for 2 hours.', es: 'El cliente dijo que sí: reserva las piezas 2 horas.' }],
    ['#rqQuote', { en: 'Send the prices to the technician to show the customer.', es: 'Enviar los precios al técnico para mostrarle al cliente.' }],
    ['#rqVerify', { en: 'The payment is real: the invoice is made automatically.', es: 'El pago es real: la factura se hace sola.' }],
    ['#logout', { en: 'Sign out.', es: 'Cerrar sesión.' }],
    ['.cmb-b', { en: 'Show the whole list.', es: 'Ver toda la lista.' }],
    ['[data-go="jobs"]', { en: 'Appointments and visits.', es: 'Citas y visitas.' }],
    ['[data-go="vendors"]', { en: 'Vendor directory.', es: 'Directorio de proveedores.' }]
  ]);

  /* ------------------------------------------------------------------ "there is more" indicators */
  const H_SEL = 'header nav, nav.tabs, .subtabs, .tablewrap, .ptabs, .kpis, .seg2';
  const V_SEL = '.modal:not([hidden]) .mc, .sheet:not([hidden]) .pn, .drawer';
  const BADGE = '.nb:not([hidden]), .cnt:not([hidden])';
  const arrows = new Map(), pills = new Map();
  const visible = el => {
    const r = el.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden')) return false;
    const x = Math.min(Math.max(r.left + 40, 1), innerWidth - 2), y = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
    const top = document.elementFromPoint(x, y); return !top || el.contains(top) || top.closest('.uh-arr, .uh-more, .uh-card, .uh-tip, .cmb-m') !== null;
  };
  const mk = (cls, txt, onclick) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = txt; b.onclick = onclick; document.body.appendChild(b); return b; };
  function horiz(el) {
    let a = arrows.get(el);
    const can = el.scrollWidth > el.clientWidth + 4 && visible(el) && ['auto', 'scroll'].includes(getComputedStyle(el).overflowX);
    const left = can && el.scrollLeft > 4, right = can && el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    el.classList.toggle('sh-l', left); el.classList.toggle('sh-r', right);
    if (!left && !right) { if (a) { a.l.style.display = a.r.style.display = 'none'; } return; }
    if (!a) {
      a = { l: mk('uh-arr', '‹', () => el.scrollBy({ left: -el.clientWidth * 0.7, behavior: 'smooth' })), r: mk('uh-arr', '›', () => el.scrollBy({ left: el.clientWidth * 0.7, behavior: 'smooth' })) };
      a.l.setAttribute('aria-label', 'Scroll left'); a.r.setAttribute('aria-label', 'Scroll right'); arrows.set(el, a);
      el.addEventListener('scroll', schedule, { passive: true });
    }
    const r = el.getBoundingClientRect(), top = Math.max(r.top, 0), bot = Math.min(r.bottom, innerHeight), y = Math.round((top + bot) / 2 - 15);
    const er = el.getBoundingClientRect(), hidden = side => [...el.querySelectorAll(BADGE)].some(b => { const br = b.getBoundingClientRect(); return br.width && (side === 'r' ? br.left > er.right - 20 : br.right < er.left + 20); });
    a.l.style.display = left ? 'block' : 'none'; a.r.style.display = right ? 'block' : 'none';
    a.l.style.left = Math.round(r.left + 2) + 'px'; a.r.style.left = Math.round(r.right - 32) + 'px'; a.l.style.top = a.r.style.top = y + 'px';
    a.l.classList.toggle('dot', left && hidden('l')); a.r.classList.toggle('dot', right && hidden('r'));
  }
  function vert(el) {
    let p = pills.get(el);
    const can = visible(el) && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollTop + el.clientHeight < el.scrollHeight - 24;
    if (!can) { if (p) p.style.display = 'none'; return; }
    if (!p) { p = mk('uh-more', '', () => el.scrollBy({ top: el.clientHeight * 0.7, behavior: 'smooth' })); pills.set(el, p); el.addEventListener('scroll', schedule, { passive: true }); }
    p.textContent = tx('more');
    const r = el.getBoundingClientRect();
    p.style.display = 'block'; p.style.left = Math.round(r.left + r.width / 2) + 'px'; p.style.top = Math.round(Math.min(r.bottom, innerHeight) - 42) + 'px';
  }
  function indicators() {
    document.querySelectorAll(H_SEL).forEach(horiz);
    document.querySelectorAll(V_SEL).forEach(vert);
    for (const [el, a] of arrows) if (!el.isConnected || !visible(el)) { a.l.style.display = a.r.style.display = 'none'; el.classList.remove('sh-l', 'sh-r'); if (!el.isConnected) { a.l.remove(); a.r.remove(); arrows.delete(el); } }
    for (const [el, p] of pills) if (!el.isConnected || !el.matches(V_SEL) || !visible(el)) { p.style.display = 'none'; if (!el.isConnected) { p.remove(); pills.delete(el); } }
  }

  /* ------------------------------------------------------------------ tutorial: section cards */
  let card = null, cardKey = '', lastKey = '';
  const seen = () => { try { return JSON.parse(sessionStorage.getItem('cher.tipsSeen') || '[]'); } catch { return []; } };
  const markSeen = k => { try { sessionStorage.setItem('cher.tipsSeen', JSON.stringify([...new Set([...seen(), k])])); } catch {} };
  function currentSection() {
    for (const [sel, key] of SECTIONS) { const el = document.querySelector(sel); if (el && (el.offsetParent !== null || getComputedStyle(el).position === 'fixed')) return typeof key === 'function' ? key(el) : key; }
    return '';
  }
  function showCard(key, force) {
    const g = G[key] && L(G[key]); if (!g) return;
    if (!card) {
      card = document.createElement('div'); card.className = 'uh-card'; card.setAttribute('role', 'note'); document.body.appendChild(card);
      card.addEventListener('click', e => {
        if (e.target.dataset.uh === 'ok') { markSeen(cardKey); card.style.display = 'none'; }
        if (e.target.dataset.uh === 'off') { setTips(false); toast(tx('offToast')); }
      });
    }
    if (!force && seen().includes(key)) return;
    cardKey = key;
    card.innerHTML = `<h4>💡 ${esc(g[0])}</h4><ul>${g[1].map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="hint">${esc(tx('howTips'))}</p>
      <div class="uh-acts"><button type="button" class="off" data-uh="off">${esc(tx('turnOff'))}</button><button type="button" class="ok" data-uh="ok">${esc(tx('gotIt'))}</button></div>`;
    const bar = document.getElementById('formBar'), barUp = bar && !bar.hidden && bar.offsetParent !== null;
    card.style.bottom = barUp ? (bar.getBoundingClientRect().height + 12) + 'px' : '16px';
    card.style.display = 'block';
  }
  function sections() {
    if (!tipsOn()) { if (card) card.style.display = 'none'; return; }
    const k = currentSection();
    if (k !== lastKey) { lastKey = k; if (card && cardKey !== k) card.style.display = 'none'; if (k) showCard(k, false); }
  }
  function toast(m) { if (typeof window.toast === 'function') window.toast(m); }

  /* ------------------------------------------------------------------ tutorial: button tips */
  let tip = null, tipT = null, holdT = null;
  const findTip = el => { for (const [sel, t] of TIPS) { const m = el && el.closest && el.closest(sel); if (m) return [m, t]; } return null; };
  function showTip(m, t) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'uh-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = L(t); tip.style.display = 'block';
    const r = m.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.bottom + 8;
    if (y + h > innerHeight - 8) y = r.top - h - 8;
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  const hideTip = () => { clearTimeout(tipT); clearTimeout(holdT); if (tip) tip.style.display = 'none'; };
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || !tipsOn()) return;
    const f = findTip(e.target); clearTimeout(tipT);
    if (!f) { if (tip) tip.style.display = 'none'; return; }
    tipT = setTimeout(() => showTip(f[0], f[1]), 450);
  });
  document.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && !(e.relatedTarget && findTip(e.relatedTarget))) hideTip(); });
  document.addEventListener('touchstart', e => {   // hold the finger on a button to see its tip (a normal tap still works)
    if (!tipsOn()) return; const f = findTip(e.target); clearTimeout(holdT); if (!f) return;
    holdT = setTimeout(() => { showTip(f[0], f[1]); setTimeout(hideTip, 3500); }, 550);
  }, { passive: true });
  ['touchend', 'touchmove', 'scroll'].forEach(ev => document.addEventListener(ev, () => clearTimeout(holdT), { passive: true, capture: true }));
  document.addEventListener('click', () => { if (tip) tip.style.display = 'none'; }, true);

  /* ------------------------------------------------------------------ on / off: sign-in option and 💡 button */
  function setTips(on) {
    LSset('cher.tips', on ? '1' : '0');
    if (!on) { if (card) card.style.display = 'none'; hideTip(); }
    else { lastKey = ''; const k = currentSection(); if (k) { showCard(k, true); lastKey = k; } }
    paintToggle();
  }
  function paintToggle() {
    const b = document.getElementById('uhTipsBtn'); if (b) { b.innerHTML = '💡<span class="uh-l"> ' + esc((tipsOn() ? tx('on') : tx('off')).replace('💡 ', '')) + '</span>'; b.classList.toggle('on', tipsOn()); b.title = tx('toggleTitle'); }
    const c = document.getElementById('uhTipsLogin'); if (c) { c.checked = tipsOn(); c.nextElementSibling.textContent = tx('login'); }
  }
  function mount() {
    if (!document.getElementById('uhTipsBtn')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'uhTipsBtn'; b.onclick = () => setTips(!tipsOn());
      const who = document.querySelector('header.top .who'), ttl = document.querySelector('#app header .ttl');
      if (who) who.insertBefore(b, document.getElementById('langSw')); else if (ttl) ttl.after(b);
    }
    const lb = document.getElementById('lgBtn');
    if (lb && !document.getElementById('uhTipsLogin')) {
      const l = document.createElement('label'); l.className = 'uh-tipsopt'; l.innerHTML = '<input type="checkbox" id="uhTipsLogin"><span></span>';
      lb.before(l); l.querySelector('input').onchange = e => setTips(e.target.checked);
    }
    paintToggle();
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-l]')) setTimeout(() => { paintToggle(); if (card && card.style.display === 'block') showCard(cardKey, true); }, 50); });

  /* ------------------------------------------------------------------ loop */
  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; indicators(); }); }
  function tick() { indicators(); sections(); }
  document.addEventListener('click', () => setTimeout(tick, 80));   // tab changes show their guide right away
  const go = () => { mount(); tick(); setInterval(tick, 700); addEventListener('resize', schedule); addEventListener('scroll', schedule, { passive: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
