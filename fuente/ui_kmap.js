/* Interfaz de Karnaugh / tabla de verdad (equivale al «Análisis combinacional» de Logisim) */
(function (root) {
'use strict';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
class KarnaughUI {
  constructor(el, app) {
    this.el = el; this.app = app;
    this.st = { n: 3, names: ['A', 'B', 'C'], outs: [{ name: 'F', t: new Array(8).fill(0) }], title: '', dcAs: 'auto', form: 'sop' };
    this.res = []; this.build(); this.recalc(); this.render();
  }
  build() {
    this.el.classList.add('kz');
    this.el.addEventListener('click', e => this.click(e)); this.el.addEventListener('change', e => this.change(e));
  }
  load(spec) { // {n, names, outs:[{name, ones, dcs}], title}
    this.st = { n: spec.n, names: spec.names.slice(), title: spec.title || '', outs: spec.outs.map(o => ({ name: o.name, t: KM.fromSigma(spec.n, o.ones, o.dcs) })) };
    this.recalc(); this.render(); this.app.touch && this.app.touch('kmap');
  }
  setN(n) {
    const old = this.st.n; this.st.n = n; const dflt = ['A', 'B', 'C', 'D'];
    while (this.st.names.length < n) this.st.names.push(dflt[this.st.names.length]); this.st.names = this.st.names.slice(0, Math.max(n, 4)).slice(0, n);
    this.st.outs.forEach(o => { const t = new Array(1 << n).fill(0); for (let i = 0; i < Math.min(o.t.length, t.length); i++) t[i] = o.t[i]; o.t = t; });
  }
  recalc() {
    const n = this.st.n, names = this.st.names, pos = this.st.form === 'pos';
    const sumT = (cover, html) => cover.map(q => { const L = KM.literals(q, n); if (!L.length) return '0'; const t = L.map(l => { const nm = names[l.i]; return !l.neg ? (html ? `<span class="ng">${nm}</span>` : nm + "'") : nm; }).join(' + '); return cover.length > 1 ? '(' + t + ')' : t; }).join(html ? '·' : '·');
    this.res = this.st.outs.map(o => { const { ones, dcs } = KM.sigma(o.t), zeros = o.t.map((v, m) => v === 0 ? m : -1).filter(m => m >= 0); const sop = KM.minimize(n, ones, dcs), r = pos ? KM.minimize(n, zeros, dcs) : sop;
      r.sop = pos ? sop : { cover: sop.cover, zero: sop.zero, one: sop.one }; r.name = o.name; r.ones = ones; r.dcs = dcs; r.arr = o.t; r.pos = pos;
      if (pos) { const z = r.zero, one = r.one; r.zero = one; r.one = z; /* con ceros: «zero» (sin ceros) significa F = 1 */ }
      r.text = r.zero ? '0' : r.one ? '1' : pos ? sumT(r.cover, false) : KM.exprText(r.cover, names, n, 'prime'); r.html = r.zero ? '0' : r.one ? '1' : pos ? sumT(r.cover, true) : KM.exprHTML(r.cover, names, n); r.dcUse = KM.dcUsage(r.cover, dcs, n); return r; });
    this.graphs = null;
  }
  funcs() { return this.res.map(r => ({ name: r.name, terms: r.sop.cover, zero: r.sop.zero, one: r.sop.one })); }
  dispFuncs() { return this.res.map(r => ({ name: r.name, terms: r.cover, zero: r.zero, one: r.one })); }
  graph(mode) { return KM.buildGraph(this.funcs(), this.st.names, this.st.n, mode); }
  render() {
    const st = this.st, n = st.n, rows = 1 << n;
    const bin = (m) => m.toString(2).padStart(n, '0').split('');
    let h = `<div class="kz-top"><div class="card"><div class="ch">Variables y salidas</div>
      <div class="row"><label>Nº de variables<select data-c="n">${[2, 3, 4].map(k => `<option ${k === n ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      ${st.names.map((v, i) => `<label>Var ${i + 1}${i === 0 ? ' (MSB)' : ''}<input class="sm" data-c="vn" data-i="${i}" value="${esc(v)}" maxlength="4"></label>`).join('')}</div>
      <div class="row">${st.outs.map((o, i) => `<label>Salida ${i + 1}<input class="sm" data-c="on" data-i="${i}" value="${esc(o.name)}" maxlength="4"></label>`).join('')}
      <button class="b sm" data-c="addout">+ salida</button>${st.outs.length > 1 ? '<button class="b sm" data-c="delout">− salida</button>' : ''}</div>
      <div class="row"><label>Forma<select data-c="form"><option value="sop" ${st.form !== 'pos' ? 'selected' : ''}>Suma de productos (SOP · agrupa los 1)</option><option value="pos" ${st.form === 'pos' ? 'selected' : ''}>Producto de sumas (POS · agrupa los 0)</option></select></label>
      <button class="b sm" data-c="clear">Poner a 0</button></div>
      <p class="mut">Haz clic en una celda de la tabla de verdad o del mapa: 0 → 1 → X (indiferente) → 0.</p></div></div>`;
    h += `<div class="kz-body"><div class="card tt"><div class="ch">Tabla de verdad</div><table class="tv"><tr>${st.names.map(v => `<th>${esc(v)}</th>`).join('')}${st.outs.map(o => `<th class="oc">${esc(o.name)}</th>`).join('')}<th>Fila</th></tr>`;
    for (let m = 0; m < rows; m++) h += `<tr>${bin(m).map(b => `<td>${b}</td>`).join('')}${st.outs.map((o, k) => `<td class="oc v${o.t[m]}" data-c="cell" data-o="${k}" data-m="${m}">${o.t[m] === 2 ? 'X' : o.t[m]}</td>`).join('')}<td class="mut">${m}</td></tr>`;
    h += '</table></div><div class="kz-maps">';
    this.res.forEach((r, k) => {
      h += `<div class="card"><div class="ch">${esc(r.name)} <span class="mut">${esc(KM.sigmaText(r.arr))}</span></div>
      <div class="mapwrap" data-o="${k}">${KM.mapSVG(n, r.arr, st.names, r, { interactive: true })}</div>
      <div class="expr"><b>${esc(r.name)}</b> = <span class="ex">${r.html}</span></div>`;
      if (r.cover && r.cover.length && !r.zero && !r.one) h += `<div class="gdet">${r.cover.map((q, gi) => { const d = KM.groupDetail(q, n, st.names), col = KM.COLORS[gi % KM.COLORS.length], L = KM.literals(q, n); return `<div class="gd" style="--c:${col}"><div class="gh"><span class="gtag" style="background:${col}">G${gi + 1}</span> ${r.pos ? 'ceros' : 'unos'} Σ(${d.mins.join(', ')}) · ${d.mins.length} casilla${d.mins.length > 1 ? 's' : ''}</div><div class="gr"><div class="gcols"><span class="mm"></span>${d.head}<span class="arr"></span><i>en variables</i></div>${d.rows.map(x => `<div><span class="mm">m${x.m}</span>${x.bits}<span class="arr">→</span>${x.html}</div>`).join('')}</div><div class="gres">Las columnas que cambian (0 y 1 a la vez) se tachan y las que quedan fijas dan el término: <b>${r.pos ? '(' + L.map(l => !l.neg ? `<span class="ng">${st.names[l.i]}</span>` : st.names[l.i]).join(' + ') + ')' : (L.length ? KM.exprHTML([q], st.names, n) : '1')}</b>${L.length < n ? ' · tachadas: ' + st.names.slice(0, n).filter((nm, i) => (q.m >> (n - 1 - i)) & 1).join(', ') : ''}</div></div>`; }).join('')}</div>`;
      if (r.dcUse.length) h += `<p class="xuse">X tomadas como <b>1</b>: ${r.dcUse.filter(d => d.as1).map(d => d.m).join(', ') || 'ninguna'} · como <b>0</b>: ${r.dcUse.filter(d => !d.as1).map(d => d.m).join(', ') || 'ninguna'}</p>`;
      const miss = st.names.filter((nm, i) => !r.cover.some(q => KM.literals(q, n).some(l => l.i === i)));
      if (miss.length && !r.zero && !r.one) h += `<p class="xuse">Variables que no aparecen en la expresión: <b>${miss.join(', ')}</b></p>`;
      h += '</div>';
    });
    h += '</div></div>';
    // circuitos
    const gs = this.res.length ? ['std', 'nand'].map(m => ({ m, g: this.graph(m) })) : [];
    h += `<div class="card"><div class="ch">Circuito con puertas de 2 entradas</div><div class="gates">` + gs.map(({ m, g }) => { const c = KM.countGates(g); return `<div class="gc"><b>${m === 'std' ? 'AND / OR / NOT' : 'Solo NAND'}</b><br>${Object.entries(c.counts).filter(([, v]) => v).map(([k, v]) => `${v} × ${k}`).join(' · ') || 'sin puertas'} → <b>${c.total}</b> puertas<br><span class="mut">Integrados: ${c.ics.map(i => `${i.n} × 74${i.ic.slice(2)} (${i.gates} de ${i.n * i.per} puertas)`).join(', ') || '—'}</span><br><button class="b sm" data-c="gen" data-m="${m}">Generar esquema</button></div>`; }).join('') + `</div>
      <div class="row"><button class="b sm" data-c="verilog">Ver Verilog</button><button class="b sm" data-c="cmp">Comparar con el esquema (tabla de verdad del circuito)</button><button class="b sm prim" data-c="toreport">Enviar al informe</button></div><div id="kzmsg" class="kzmsg"></div></div></div>`;
    this.el.innerHTML = h;
  }
  msg(t, ok) { const e = this.el.querySelector('#kzmsg'); if (e) { e.innerHTML = t; e.className = 'kzmsg ' + (ok === false ? 'bad' : ok ? 'good' : ''); } }
  cycle(o, m) { const t = this.st.outs[o].t; t[m] = (t[m] + 1) % 3; }
  click(e) {
    const c = e.target.closest('[data-c]'), kc = e.target.closest('.kc');
    if (kc) { const o = +kc.closest('.mapwrap').dataset.o; this.cycle(o, +kc.dataset.m); this.recalc(); this.render(); this.app.touch('kmap'); return; }
    if (!c) return; const a = c.dataset.c;
    if (a === 'cell') { this.cycle(+c.dataset.o, +c.dataset.m); this.recalc(); this.render(); this.app.touch('kmap'); }
    else if (a === 'addout') { this.st.outs.push({ name: 'S' + (this.st.outs.length + 1), t: new Array(1 << this.st.n).fill(0) }); this.recalc(); this.render(); }
    else if (a === 'delout') { this.st.outs.pop(); this.recalc(); this.render(); }
    else if (a === 'clear') { this.st.outs.forEach(o => o.t.fill(0)); this.recalc(); this.render(); this.app.touch('kmap'); }
    else if (a === 'gen') { const doc = Schem.fromKarnaugh(this.dispFuncs(), this.st.names, this.st.n, { mode: c.dataset.m, form: this.st.form }); this.app.schem.load(doc.toJSON()); this.app.go('schem'); this.app.touch('schem'); }
    else if (a === 'verilog') { this.msg('<pre>' + esc(KM.verilog(this.graph('std'), this.st.names, this.st.n, 'practica')) + '</pre>'); }
    else if (a === 'cmp') this.compare();
    else if (a === 'toreport') { this.app.touch('kmap'); this.app.go('report'); }
  }
  change(e) {
    const c = e.target.dataset.c; if (!c) return; const st = this.st;
    if (c === 'n') { this.setN(+e.target.value); this.recalc(); this.render(); this.app.touch('kmap'); }
    else if (c === 'form') { st.form = e.target.value; this.recalc(); this.render(); this.app.touch('kmap'); }
    else if (c === 'vn') { st.names[+e.target.dataset.i] = e.target.value.trim() || 'X'; this.recalc(); this.render(); this.app.touch('kmap'); }
    else if (c === 'on') { st.outs[+e.target.dataset.i].name = e.target.value.trim() || 'S'; this.recalc(); this.render(); this.app.touch('kmap'); }
    else if (c === 'ex' && e.target.value) { this.load(KarnaughUI.EX[e.target.value]); }
  }
  /* compara tabla con la tabla de verdad que genera el circuito del editor de esquemas */
  compare() {
    const t = this.app.schem.truthTable(); if (!t) return;
    const n = this.st.n; if (t.inputs.length !== n) { this.msg(`El esquema tiene ${t.inputs.length} entradas (interruptores) y la tabla ${n} variables.`, false); return; }
    let bad = [], total = 0;
    this.st.outs.forEach((o, k) => { if (k >= t.outputs.length) return; t.rows.forEach(r => { const exp = o.t[r.m]; if (exp === 2) return; total++; if (r.out[k] !== exp) bad.push(`${o.name} fila ${r.m}: esquema ${r.out[k]}, tabla ${exp}`); }); });
    this.msg(bad.length ? `<b>No coincide</b> en ${bad.length} de ${total} casos (las X no se comparan):<br>${bad.slice(0, 12).join('<br>')}` : `<b>Coincide</b> en los ${total} casos definidos (las X no se comparan). Salidas del esquema: ${t.outputs.join(', ')}.`, !bad.length);
  }
  data() { return { st: JSON.parse(JSON.stringify(this.st)), res: this.res }; }
}
KarnaughUI.EX = {
  semaforo: { title: 'P3.1 · Semáforo (D, I, P → E, PV, PP)', n: 3, names: ['D', 'I', 'P'], outs: [{ name: 'E', ones: [3, 5], dcs: [0, 2, 4] }, { name: 'PV', ones: [6, 7], dcs: [0, 2, 4] }, { name: 'PP', ones: [1], dcs: [0, 2, 4] }] },
  aguacates: { title: 'P3.2 · Clasificadora de aguacates (S1..S4 → D, C)', n: 4, names: ['S1', 'S2', 'S3', 'S4'], outs: [{ name: 'D', ones: [0, 15, 2, 12, 14, 13, 9, 11], dcs: [] }, { name: 'C', ones: [3, 7], dcs: [] }] },
  mux2: { title: 'P3.3 · Multiplexor 2 a 1 (S0, E1, E0 → X)', n: 3, names: ['S0', 'E1', 'E0'], outs: [{ name: 'X', ones: [1, 3, 6, 7], dcs: [] }] },
  mux8f: { title: 'P4.1 · F(C,B,A) = Σ(1,2,4,7)', n: 3, names: ['C', 'B', 'A'], outs: [{ name: 'F', ones: [1, 2, 4, 7], dcs: [] }] },
  sum1: { title: 'P8.1 · Sumador completo 1 bit (A, B, Cin → S, Cout)', n: 3, names: ['A', 'B', 'Ci'], outs: [{ name: 'S', ones: [1, 2, 4, 7], dcs: [] }, { name: 'Co', ones: [3, 5, 6, 7], dcs: [] }] }
};
root.KarnaughUI = KarnaughUI;
})(window);
