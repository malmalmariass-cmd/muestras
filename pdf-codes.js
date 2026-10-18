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
  if (buildReport) window.buildPdf = async r => {
    const doc = await buildReport(r), c = reportCode(r);
    if (c) stamp(doc, 'Code: ' + c, 78);   // under the invoice number box
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
  if (buildInvoice) window.buildInvoicePdf = async v => {
    const doc = await buildInvoice(withAttn(v)), c = invoiceCode(v);
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
