/* Cher Services — document codes on the PDFs. Loaded right after pdf.js (pdf.js itself is not changed).
   The document code is: customer initials - work order number - date (AC-0046-20261018). The report and every invoice
   of the same work order share "AC-0046", so the downloaded files sort and search together. */
(() => {
  const SKIP = new Set(['LLC', 'INC', 'CO', 'CORP', 'CORPORATION', 'COMPANY', 'LTD', 'THE', 'OF', 'AND', 'DE', 'LA', 'EL', 'Y', 'SA', 'SRL']);
  // the same rule as the server (api.php → cust_initials)
  function initials(name) {
    const w = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(x => x && !SKIP.has(x));
    if (!w.length) return 'CUST';
    if (w.length === 1) return (w[0].replace(/[^A-Z]/g, '') || w[0]).slice(0, 4);
    return (w.filter(x => /^[A-Z]/.test(x)).map(x => x[0]).join('') || 'CUST').slice(0, 4);
  }
  const day = d => String(d || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  window.cherDocCode = (customer, number, date) => number ? `${initials(customer)}-${number}-${day(date)}` : '';
  // the server sends docCode once the document is saved; before that it is worked out the same way
  const reportCode = r => r.docCode || cherDocCode(r.customerName, r.invoiceNo, (r.time || []).find(t => t && t.date)?.date || r.createdAt);
  const invoiceCode = v => v.docCode || cherDocCode(v.customer?.name, v.workOrder || v.reportNo || v.invoiceNo, v.date);
  const safe = s => String(s).replace(/[^A-Za-z0-9._-]+/g, '_');

  window.pdfName = r => { const c = reportCode(r); return c ? `${safe(c)}_ServiceReport.pdf` : 'CherServices_ServiceReport_draft.pdf'; };
  window.invoicePdfName = v => `${safe(invoiceCode(v) || 'CherServices')}_Invoice-${safe(v.invoiceNo || 'draft')}.pdf`;

  const stamp = (doc, text, y) => {
    const last = doc.getNumberOfPages();
    doc.setPage(1); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(18, 58, 140);
    doc.text(text, 582, y, { align: 'right' });
    doc.setPage(last);
  };
  const buildReport = window.buildPdf, buildInvoice = window.buildInvoicePdf;
  /* photos of the job (before / damage found / after): extra pages at the end, two per page with their caption.
     The app passes them as r._photos = [{ data: 'data:image/jpeg;base64,…', kind, caption }] */
  const PH_KIND = { before: 'Before', damage: 'Damage found', after: 'After', other: 'Photo' };
  const imgSize = src => new Promise(ok => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok(null); i.src = src; });
  async function photoPages(doc, r) {
    const list = (r._photos || []).filter(p => p && /^data:image\/jpe?g;base64,/.test(p.data || ''));
    if (!list.length) return;
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), L = 36, BW = W - 72, BH = (H - 150) / 2;
    for (let i = 0; i < list.length; i++) {
      if (i % 2 === 0) {
        doc.addPage(); doc.setFillColor(18, 58, 140); doc.rect(0, 0, W, 6, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(18, 58, 140);
        doc.text(`PHOTOS — Service report #${r.invoiceNo || ''}`, L, 40);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 107, 133);
        doc.text([r.customerName, [r.make, r.model].filter(Boolean).join(' '), r.serialNo && 'S/N ' + r.serialNo].filter(Boolean).join('  ·  '), L, 56);
      }
      const p = list[i], top = 72 + (i % 2) * (BH + 30), sz = await imgSize(p.data);
      if (sz) {
        const k = Math.min(BW / sz[0], BH / sz[1]), w = sz[0] * k, h = sz[1] * k;
        try { doc.addImage(p.data, 'JPEG', L + (BW - w) / 2, top, w, h); } catch {}
        doc.setDrawColor(221, 227, 238); doc.rect(L + (BW - w) / 2, top, w, h);
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(22, 32, 46);
      const label = `${i + 1}. ${PH_KIND[p.kind] || 'Photo'}${p.caption ? ': ' : ''}`;
      doc.text(label, L, top + BH + 16);
      if (p.caption) { doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(String(p.caption), BW - doc.getTextWidth(label))[0], L + doc.getTextWidth(label), top + BH + 16); }
    }
  }
  if (buildReport) window.buildPdf = async r => {
    const doc = await buildReport(r), c = reportCode(r);
    if (c) stamp(doc, 'Code: ' + c, 78);   // under the invoice number box
    await photoPages(doc, r);
    return doc;
  };
  // billed to a company, to the attention of the person who pays: "Attn: name" under the company, and their email / WhatsApp
  const withAttn = v => {
    if (!v.attn || !v.attn.name) return v;
    const c = Object.assign({}, v.customer || {}), a = [c.address1, c.address2, c.address3].filter(Boolean);
    const l = ['Attn: ' + v.attn.name, a[0] || '', a.slice(1).join(', ')];
    c.address1 = l[0]; c.address2 = l[1]; c.address3 = l[2];
    if (v.attn.email) c.email = v.attn.email; if (v.attn.whatsapp) { c.whatsapp = v.attn.whatsapp; c.phone = c.phone || ''; }
    return Object.assign({}, v, { customer: c });
  };
  /* INVOICE and QUOTE in the company's usual layout (like its Wave invoices, without their mark):
     logo + title and company on top, BILL TO and the details table, a yellow bar over the items, totals with the
     amount due, Notes / Terms (payment instructions) and the footer text. The company lines, the payment
     instructions (bank details) and the footer come from the panel (Settings → Invoice and quote details), so no
     bank data lives in the code. */
  const PROFILE_DEF = { name: 'CherServices LLC', street: '4136 NE 9th Street', city: 'Homestead, Florida 33033', country: 'United States', phone: '7868325586', email: '',
    payInfo: '', footer: 'Please note that 50% deposit is needed on all jobs and the balance on completion. Any checks deposited for payments there will be a Five (5) days hold on goods and CherServices LLC will not take responsibility for delays. Thank you for your business!' };
  const profile = () => { let p = window.CHER_INV; if (!p) try { p = JSON.parse(localStorage.getItem('cher.invProfile') || 'null'); } catch {} return Object.assign({}, PROFILE_DEF, p || {}); };
  const usd = n => '$' + (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const longDate = d => { if (!d) return ''; const x = new Date(String(d).slice(0, 10) + 'T12:00'); return isNaN(x) ? String(d) : x.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); };
  const logoSize = () => new Promise(ok => { if (typeof CHER_LOGO === 'undefined') return ok(null); const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok(null); i.src = CHER_LOGO; });
  async function waveDoc(v, o) {
    const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true }), P = profile();
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), L = 26, R = W - 26;
    const INK = [22, 22, 22], GREY = [110, 110, 110], LINE = [220, 220, 220], BAR = [236, 209, 48];
    const t = (s, x, y, opt = {}) => { doc.setFont('helvetica', opt.bold ? 'bold' : 'normal'); doc.setFontSize(opt.size || 10); doc.setTextColor(...(opt.col || INK)); doc.text(String(s ?? ''), x, y, opt.align ? { align: opt.align } : undefined); };
    // header: logo / title + company
    const ls = await logoSize();
    if (ls) { const w = 150, h = w * ls[1] / ls[0]; try { doc.addImage(CHER_LOGO, 'PNG', L + 8, 36 + Math.max(0, (70 - h) / 2), w, h); } catch {} }
    t(o.title, R, 62, { size: 30, align: 'right' });
    let y = 92; t(P.name, R, y, { bold: true, size: 10.5, align: 'right' });
    [P.street, P.city, P.country].filter(Boolean).forEach(s => { y += 14; t(s, R, y, { align: 'right' }); });
    if (P.phone || P.email) { y += 22; [P.phone, P.email].filter(Boolean).forEach((s, i) => { t(s, R, y + i * 14, { align: 'right' }); }); y += ([P.phone, P.email].filter(Boolean).length - 1) * 14; }
    if (o.stamp) { y += 18; t(o.stamp, R, y, { bold: true, size: 12, align: 'right', col: o.stampCol || [16, 122, 67] }); }
    y = Math.max(y + 18, 172); doc.setDrawColor(...LINE); doc.setLineWidth(0.8); doc.line(0, y, W, y);
    // bill to (left) and the details table (right)
    const top = y + 22, c = v.customer || {};
    t('BILL TO', L, top, { col: GREY, size: 9.5 });
    let by = top + 15; t(c.name, L, by, { bold: true, size: 10.5 });
    const contact = [c.phone && 'Tel. ' + c.phone, c.whatsapp && c.whatsapp !== c.phone && 'WhatsApp ' + c.whatsapp].filter(Boolean).join('   ');
    [c.address1, c.address2, c.address3, contact, c.email].filter(Boolean).slice(0, 6).forEach(s => { doc.setFontSize(10); by += 14; t(doc.splitTextToSize(String(s), 250)[0], L, by); });
    const det = o.details.filter(d => d && d[1] !== '' && d[1] != null), kx = 430, vx = 438;
    det.forEach(([k, val, hi], i) => {
      const yy = top + i * 18;
      if (hi) { doc.setFillColor(242, 242, 242); doc.rect(kx - 128, yy - 12, R - kx + 128, 18, 'F'); }
      t(k + ':', kx, yy, { bold: true, align: 'right' }); t(doc.splitTextToSize(String(val), R - vx)[0], vx, yy, { bold: !!hi });
    });
    y = Math.max(by, top + (det.length - 1) * 18) + 26;
    // items
    const cx = { qty: 345, price: 470, amt: R - 10 }, DW = 270;
    const head = yy => { doc.setFillColor(...BAR); doc.rect(0, yy, W, 30, 'F'); t('Items', L + 8, yy + 19, { bold: true }); t('Quantity', cx.qty, yy + 19, { bold: true, align: 'center' }); t('Price', cx.price, yy + 19, { bold: true, align: 'right' }); t('Amount', cx.amt, yy + 19, { bold: true, align: 'right' }); return yy + 30; };
    y = head(y);
    const lines = (v.lines || []).filter(l => String(l.name || '').trim());
    for (const l of lines) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      const desc = doc.splitTextToSize([l.partNo, l.name].filter(Boolean).join(', '), DW), sub = l.vendor && l.source === 'order' ? ['Vendor: ' + l.vendor] : [];
      const h = Math.max(1, desc.length) * 13 + sub.length * 11 + 16;
      if (y + h > H - 150) { doc.addPage(); y = head(40); }
      desc.forEach((s, k) => t(s, L + 8, y + 18 + k * 13));
      sub.forEach((s, k) => t(s, L + 8, y + 18 + desc.length * 13 + k * 11, { size: 8.5, col: GREY }));
      const q = +l.qty || 0; t((Number.isInteger(q) ? q : q.toFixed(2)) + (l.unit && !/^(ea|each|)$/i.test(l.unit) ? ' ' + l.unit : ''), cx.qty, y + 18, { align: 'center' });
      t(usd(l.price), cx.price, y + 18, { align: 'right' }); t(usd(q * (+l.price || 0)), cx.amt, y + 18, { align: 'right' });
      y += h;
    }
    doc.setDrawColor(...LINE); doc.setLineWidth(1.6); doc.line(0, y, W, y);
    // totals
    const tot = [], sub = +v.subtotal || lines.reduce((s, l) => s + (+l.qty || 0) * (+l.price || 0), 0), tax = +v.tax || 0, total = +v.total || sub + tax;
    if (tax > 0) { tot.push(['Subtotal:', usd(sub)]); tot.push([`Sales tax ${+v.taxRate || 0}%:`, usd(tax)]); }
    tot.push(['Total:', usd(total)]);
    (o.payments || []).forEach(p => tot.push([`Payment on ${longDate(p.date)}${p.method ? ' (' + p.method + ')' : ''}:`, '-' + usd(p.amount)]));
    if (y + 40 + tot.length * 22 > H - 120) { doc.addPage(); y = 40; }
    y += 28; tot.forEach(([k, val]) => { t(k, cx.price - 2, y, { bold: true, align: 'right' }); t(val, cx.amt, y, { align: 'right' }); y += 22; });
    doc.setDrawColor(...LINE); doc.setLineWidth(1.6); doc.line(cx.price - 140, y - 10, cx.amt, y - 10);
    y += 14; t(o.dueLabel + ':', cx.price - 2, y, { bold: true, align: 'right' }); t(usd(o.due), cx.amt, y, { bold: true, align: 'right' });
    // notes / terms
    const notes = [o.notes, P.payInfo].map(s => String(s || '').trim()).filter(Boolean).join('\n\n');
    if (notes) {   // flows on: what does not fit above the footer continues on the next page
      y += 44; doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      const nl = doc.splitTextToSize(notes, W - 2 * L - 120), bottom = H - 72;
      if (y + 40 > bottom) { doc.addPage(); y = 50; }
      t('Notes / Terms', L, y, { bold: true, col: [80, 80, 80] }); y += 17;
      for (const s of nl) { if (y > bottom) { doc.addPage(); y = 50; } t(s, L, y, { col: [80, 80, 80] }); y += 14; }
    }
    // footer on every page
    const n = doc.getNumberOfPages();
    for (let pg = 1; pg <= n; pg++) {
      doc.setPage(pg); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      const fl = P.footer ? doc.splitTextToSize(P.footer, W - 2 * L) : [];
      fl.forEach((s, k) => t(s, W / 2, H - 28 - (fl.length - 1 - k) * 13, { col: GREY, size: 9.5, align: 'center' }));
      if (n > 1) t(`Page ${pg} of ${n}`, R, H - 12, { size: 8, col: GREY, align: 'right' });
    }
    doc.setPage(n);
    doc.setProperties({ title: `${P.name} — ${o.title === 'QUOTE' ? 'Quote' : 'Invoice'} ${v.invoiceNo || ''}`, author: P.name });
    return doc;
  }
  window.buildInvoicePdf = async v0 => {
    const v = withAttn(v0), po = [v.po, v.so && (v.po ? 'SO ' + v.so : v.so)].filter(Boolean).join(' / ');
    const paid = +v.paidAmount || (v.payments || []).reduce((s, p) => s + (+p.amount || 0), 0), total = +v.total || 0, due = v.status === 'void' ? 0 : Math.max(0, Math.round((total - paid) * 100) / 100);
    const code = invoiceCode(v);
    const notes = [v.payBy && 'Payment: ' + v.payBy, v.notes].filter(Boolean).join('\n');
    return waveDoc(v, {
      title: 'INVOICE',
      stamp: v.status === 'void' ? 'VOID' : paid > 0 && due === 0 ? 'PAID' : '', stampCol: v.status === 'void' ? [208, 2, 27] : [16, 122, 67],
      details: [['Invoice Number', v.invoiceNo], ['P.O./S.O. Number', po || (v.reference && !/^[A-Z0-9]{1,4}-[0-9-]+-\d{8}$/.test(v.reference) ? v.reference : '')],
        (v.reportNo || v.workOrder) && ['Work order', '#' + (v.workOrder || v.reportNo)], code && ['Code', code],
        ['Invoice Date', longDate(v.date)], ['Payment Due', v.dueDate ? longDate(v.dueDate) : 'Upon receipt'], ['Amount Due (USD)', usd(due), true]],
      payments: v.payments || [], dueLabel: 'Amount Due (USD)', due, notes });
  };

  /* QUOTE for a parts request: the same layout, titled QUOTE (the technician shows / sends it to the customer). */
  const fmt = d => { const x = new Date(String(d).slice(0, 10) + 'T12:00'); return isNaN(x) ? '' : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  window.buildQuotePdf = async q => {
    const today = new Date(), valid = new Date(Date.now() + 15 * 864e5), isoD = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const lines = (q.lines || []).map(l => Object.assign({}, l, { taxable: true }));
    const v = { invoiceNo: q.no, customer: q.customerInfo || { name: q.customer || '' }, lines, taxRate: q.taxRate || 0, subtotal: q.total || 0, tax: q.tax || 0, total: q.grandTotal || 0 };
    return waveDoc(v, { title: 'QUOTE',
      details: [['Quote Number', q.no], q.reportNo && ['Service report', '#' + q.reportNo], ['Quote Date', longDate(isoD(today))], ['Valid Until', longDate(isoD(valid))], ['Total (USD)', usd(v.total), true]],
      dueLabel: 'Total (USD)', due: v.total,
      notes: 'This is a QUOTE, not an invoice. Prices are valid for 15 days. Parts are reserved for you once you accept and the office confirms.' + (q.equipment ? '\nEquipment: ' + q.equipment : '') });
  };
  window.quotePdfName = q => `CherServices_Quote_${safe(q.no || 'draft')}${q.customer ? '_' + safe(q.customer).slice(0, 30) : ''}.pdf`;
})();
