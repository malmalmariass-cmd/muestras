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
  // how the customer pays goes first in the notes ("Payment: Check")
  const withPay = v => v.payBy ? Object.assign({}, v, { notes: 'Payment: ' + v.payBy + (v.notes ? '\n' + v.notes : '') }) : v;
  if (buildInvoice) window.buildInvoicePdf = async v => {
    const doc = await buildInvoice(withPay(withAttn(v))), c = invoiceCode(v);
    if (c) stamp(doc, `Work order #${v.workOrder || v.reportNo || v.invoiceNo}  ·  Code: ${c}`, 100);   // above the Bill to box
    return doc;
  };

  /* QUOTE for a parts request: the same layout as the invoice, titled QUOTE (the technician shows / sends it to the customer). */
  const fmt = d => { const x = new Date(String(d).slice(0, 10) + 'T12:00'); return isNaN(x) ? '' : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  if (buildInvoice) window.buildQuotePdf = async q => {
    const today = new Date(), valid = new Date(Date.now() + 15 * 864e5), isoD = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const lines = (q.lines || []).map(l => Object.assign({}, l, { taxable: true }));
    const v = { invoiceNo: q.no, customer: q.customerInfo || { name: q.customer || '' }, date: isoD(today), dueDate: isoD(valid), lines, taxRate: q.taxRate || 0,
      subtotal: q.total || 0, tax: q.tax || 0, total: q.grandTotal || 0, status: 'unpaid', paidAmount: 0, reportNo: q.reportNo || '',
      notes: 'This is a QUOTE, not an invoice. Prices are valid for 15 days. Parts are reserved for you once you accept and the office confirms.' + (q.equipment ? '\nEquipment: ' + q.equipment : '') };
    const doc = await buildInvoice(v);
    doc.setPage(1);
    doc.setFillColor(255, 255, 255); doc.rect(468, 24, 118, 27, 'F'); doc.rect(500, 54, 86, 16, 'F');   // cover "INVOICE" and "No. …" (not the company lines)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(208, 2, 27); doc.text('QUOTE', 582, 46, { align: 'right' });
    doc.setFontSize(13); doc.setTextColor(22, 32, 46); doc.text(q.no || '', 582, 66, { align: 'right' });
    // details box: quote date, valid until, request, report
    const L = 30, y = 112, W = 552;
    doc.setDrawColor(221, 227, 238); doc.setLineWidth(0.8); doc.setFillColor(247, 249, 253); doc.roundedRect(L + 312, y, W - 312, 104, 6, 6, 'FD');
    [['Quote date', fmt(v.date)], ['Valid until', fmt(v.dueDate)], ['Parts request', q.no], q.reportNo && ['Service report', '#' + q.reportNo]].filter(Boolean).forEach(([k, val], i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(110, 120, 138); doc.text(k, L + 324, y + 22 + i * 17);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(22, 32, 46); doc.text(String(val), 570, y + 22 + i * 17, { align: 'right' });
    });
    doc.setProperties({ title: `Cher Services — Quote ${q.no}`, author: 'Cher Services LLC' });
    doc.setPage(doc.getNumberOfPages());
    return doc;
  };
  window.quotePdfName = q => `CherServices_Quote_${safe(q.no || 'draft')}${q.customer ? '_' + safe(q.customer).slice(0, 30) : ''}.pdf`;
})();
