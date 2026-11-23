/* Utilidades de interfaz compartidas: ventana de propiedades (doble clic) */
(function (root) {
'use strict';
const UI = {};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
UI.E12 = ['1', '10', '22', '47', '100', '220', '330', '470', '680', '1k', '2.2k', '4.7k', '10k', '47k', '100k', '470k', '1M'];
UI.CAPS = ['10n', '100n', '1u', '10u', '47u', '100u', '470u', '1000u'];

/* fields: [{k,label,type:'text'|'sel'|'num'|'list'|'check', opts:[{v,t}|v], value, list:[...], unit}] */
UI.pop = function (host, clientX, clientY, title, fields, onSet, o = {}) {
  UI.closePop();
  const r = host.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'popw'; el.id = 'popw';
  const id = 'dl' + Math.random().toString(36).slice(2, 6);
  el.innerHTML = `<div class="pw-h"><b>${esc(title)}</b><button class="pw-x" title="Cerrar (Esc)">×</button></div><div class="pw-b">${(o.before || '')}${fields.map(f => {
    const v = f.value;
    if (f.type === 'sel') return `<label>${esc(f.label)}<select data-f="${f.k}">${f.opts.map(op => { const ov = op.v ?? op, ot = op.t ?? op; return `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ot)}</option>`; }).join('')}</select></label>`;
    if (f.type === 'check') return `<label class="chk"><input type="checkbox" data-f="${f.k}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    if (f.type === 'colors') return `<div class="pw-col">${esc(f.label)}<div>${f.opts.map(c => `<button class="sw ${c.v === v ? 'on' : ''}" data-f="${f.k}" data-v="${c.v}" style="background:${c.v}" title="${esc(c.t)}"></button>`).join('')}</div></div>`;
    return `<label>${esc(f.label)}<input data-f="${f.k}" type="text" value="${esc(v)}" ${f.list ? `list="${id}${f.k}"` : ''} autocomplete="off">${f.list ? `<datalist id="${id}${f.k}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}</label>`;
  }).join('')}${o.after || ''}</div>${o.del ? '<div class="pw-f"><button class="b sm" data-del>Eliminar</button></div>' : ''}`;
  host.appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(4, Math.min(r.width - w - 4, clientX - r.left + 10)) + 'px';
  el.style.top = Math.max(4, Math.min(r.height - h - 4, clientY - r.top + 10)) + 'px';
  const set = (k, v) => onSet(k, v);
  el.addEventListener('change', e => { const f = e.target.closest('[data-f]'); if (!f || f.tagName === 'BUTTON') return; set(f.dataset.f, f.type === 'checkbox' ? f.checked : f.value); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.target.blur(); } if (e.key === 'Escape') UI.closePop(); e.stopPropagation(); });
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('pw-x')) UI.closePop();
    else if (b.dataset.del !== undefined) { UI.closePop(); o.onDel && o.onDel(); }
    else if (b.classList.contains('sw')) { el.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); set(b.dataset.f, b.dataset.v); } });
  el.addEventListener('mousedown', e => e.stopPropagation());
  setTimeout(() => { const i = el.querySelector('input[type=text]'); if (i) { i.focus(); i.select(); } }, 0);
  UI._outside = (e) => { if (!el.contains(e.target)) UI.closePop(); };
  setTimeout(() => document.addEventListener('mousedown', UI._outside, true), 0);
  return el;
};
UI.closePop = function () { const p = document.getElementById('popw'); if (p) p.remove(); if (UI._outside) { document.removeEventListener('mousedown', UI._outside, true); UI._outside = null; } };
root.UI = UI;
})(window);
