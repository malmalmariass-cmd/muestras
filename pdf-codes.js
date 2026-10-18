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
  if (buildInvoice) window.buildInvoicePdf = async v => {
    const doc = await buildInvoice(v), c = invoiceCode(v);
    if (c) stamp(doc, `Work order #${v.workOrder || v.reportNo || v.invoiceNo}  ·  Code: ${c}`, 100);   // above the Bill to box
    return doc;
  };
})();
