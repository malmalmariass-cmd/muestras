/* Cher Services — pick lists. Every <input list="…"> (customers, vendors, makes, categories) becomes a box where you can
   type to filter OR press ▼ to see the whole list. The options still come from the page's <datalist>, so the code that
   fills those lists does not change. */
(() => {
  const css = `.cmb{position:relative;display:block}.cmb>input{padding-right:38px!important;width:100%}
.cmb>.cmb-b{position:absolute;right:2px;top:50%;transform:translateY(-50%);width:34px;height:calc(100% - 4px);max-height:40px;border:0;background:transparent;color:inherit;font-size:14px;cursor:pointer;opacity:.7}
.cmb>.cmb-b:hover{opacity:1}
.cmb-m{position:absolute;left:0;right:0;top:100%;z-index:9999;margin-top:2px;max-height:260px;overflow:auto;background:#fff;color:#111;border:1px solid #c9d2e3;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);display:none;text-align:left}
.cmb-m.on{display:block}.cmb-m div{padding:9px 11px;cursor:pointer;border-bottom:1px solid #f0f2f6;font-size:14px}
.cmb-m div small{display:block;color:#6b7385;font-size:12px}.cmb-m div.a,.cmb-m div:hover{background:#e8f0ff}
.cmb-m .cmb-n{color:#6b7385;cursor:default;background:none!important}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function upgrade(inp) {
    if (inp.dataset.cmb) return;
    const id = inp.getAttribute('list'); inp.dataset.cmb = id; inp.removeAttribute('list'); inp.setAttribute('autocomplete', 'off');
    const wrap = document.createElement('span'); wrap.className = 'cmb';
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cmb-b'; btn.tabIndex = -1; btn.textContent = '▼'; btn.title = 'Show the whole list';
    const menu = document.createElement('div'); menu.className = 'cmb-m';
    wrap.append(btn, menu);
    let act = -1, shown = [];
    const items = () => [...(document.getElementById(id)?.options || [])].map(o => ({ v: o.value, t: o.textContent.trim() })).filter(o => o.v);
    const close = () => { menu.classList.remove('on'); act = -1; };
    const open = all => {
      const q = fold(inp.value), list = items();
      shown = all || !q ? list : list.filter(o => fold(o.v).includes(q) || fold(o.t).includes(q));
      shown = shown.slice(0, 300);
      menu.innerHTML = shown.length ? shown.map((o, i) => `<div data-i="${i}">${esc(o.v)}${o.t && o.t !== o.v ? `<small>${esc(o.t)}</small>` : ''}</div>`).join('')
        : `<div class="cmb-n">${list.length ? 'No match — keep typing to use it as a new name' : 'The list is empty'}</div>`;
      act = -1; menu.classList.add('on');
    };
    const pick = i => {
      const o = shown[i]; if (!o) return;
      inp.value = o.v; close();
      inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const mark = () => [...menu.children].forEach((d, i) => { d.classList.toggle('a', i === act); if (i === act) d.scrollIntoView({ block: 'nearest' }); });
    inp.cmbOpen = () => { open(true); inp.focus(); };   // pages can show the whole list (e.g. after switching to "bill a company")
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => { if (menu.classList.contains('on')) close(); else { open(true); inp.focus(); } });
    inp.addEventListener('input', e => { if (e.isTrusted) open(false); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!menu.classList.contains('on')) open(!inp.value); act = Math.min(act + 1, shown.length - 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(act - 1, 0); mark(); }
      else if (e.key === 'Enter' && menu.classList.contains('on') && act >= 0) { e.preventDefault(); pick(act); }
      else if (e.key === 'Escape' && menu.classList.contains('on')) { e.stopPropagation(); close(); }
    });
    inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) close(); }, 150));
    menu.addEventListener('mousedown', e => { e.preventDefault(); const d = e.target.closest('[data-i]'); if (d) pick(+d.dataset.i); });
  }
  const scan = root => (root.querySelectorAll ? root : document).querySelectorAll('input[list]').forEach(upgrade);
  const go = () => { scan(document); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.('input[list]') ? upgrade(n) : scan(n))))).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
