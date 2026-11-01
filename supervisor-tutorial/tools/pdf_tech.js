const { chromium } = require('playwright');
(async () => {
  const [,, html, out] = process.argv;
  const b = await chromium.launch();
  const footer = `<div style="width:100%;font-family:Inter,sans-serif;font-size:8px;color:#5d6678;display:flex;justify-content:space-between;border-top:2px solid #F9C917;padding-top:4px;margin:0 0.7in">
      <span><b style="color:#103775">Cher Services LLC</b> · Technician App User Manual</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
  for (const mode of ['cover', 'body']) {
    const p = await b.newPage();
    await p.goto('file://' + html, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: mode === 'cover'
      ? 'body > *:not(.cover){display:none !important}'
      : '.cover{display:none !important} .back{page-break-before:always} @page :first { margin: 0.7in 0.7in 0.75in 0.7in; }' });
    await p.pdf({ path: out + '.' + mode + '.pdf', format: 'Letter', printBackground: true,
      displayHeaderFooter: mode === 'body', headerTemplate: '<div></div>', footerTemplate: footer,
      margin: mode === 'cover' ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: '0.7in', bottom: '0.75in', left: '0.7in', right: '0.7in' },
      preferCSSPageSize: mode === 'cover' });
    await p.close();
  }
  await b.close();
})();
