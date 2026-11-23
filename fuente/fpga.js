/* Alhambra II (iCE40HX4K) · diseño con bloques lógicos (estilo Icestudio) y placa virtual */
(function (root) {
'use strict';
const INK = '#1F2421', MUTE = '#696C69', HI = '#B85D34', BG = '#F9F8F6';
const LEDPIN = [45, 44, 43, 42, 41, 39, 38, 37], BTNPIN = { SW1: 34, SW2: 33 }, DPIN = [2, 1, 4, 3, 8, 7, 10, 9]; // fuente: pinout.json de Icestudio (Alhambra II)
const esc2 = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
class FpgaUI {
  constructor(el, app) {
    this.el = el; this.app = app; this.activeLow = false;
    el.innerHTML = `<div class="fp-ed"></div><div class="fp-board"><div class="pal-h">Placa Alhambra II (virtual)</div>
      <svg id="fpsv" viewBox="0 0 508 454" width="100%"></svg>
      <label class="chk"><input type="checkbox" id="fpal"> invertir pulsadores (activos a nivel bajo)</label><p class="mut">Alhambra II real: SW1 (pin 34) y SW2 (pin 33) llevan pull-down externo, lógica positiva: <b>1 al pulsar, 0 en reposo</b>. LED0–LED7: pines 45, 44, 43, 42, 41, 39, 38, 37 (activos a 1). Reloj de 12 MHz en el pin 49. Fuente: documentación FPGAwars / Icestudio (pinout.json) y Cuadernos técnicos CT.10.</p>
      <p class="mut">Asigna a cada interruptor, pulsador y LED del diseño un pin de la placa (panel «Propiedades»). Con la FPGA, el circuito se configura, no se cablea: el diseño se traduce a Verilog y se sintetiza.</p>
      <div class="row"><button class="b sm" data-f="ver">Generar Verilog y .pcf</button><button class="b sm prim" data-f="rep">Enviar al informe</button></div><pre id="fpv" class="code sm"></pre></div>`;
    this.ed = new Schem.Editor(el.querySelector('.fp-ed'), { fpga: true, onFrame: () => this.frame(), onChange: (k) => k === 'capture' || this.app.touch('fpga') });
    this.drawBoard();
    el.querySelector('#fpal').onchange = (e) => { this.activeLow = e.target.checked; this.sync(true); };
    el.querySelector('.fp-board').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; if (b.dataset.f === 'ver') this.verilog(); if (b.dataset.f === 'rep') { this.verilog(); this.app.caps.fpga = this.ed.svgToDataURL(); this.app.go('report'); } });
    const sv = el.querySelector('#fpsv');
    sv.addEventListener('mousedown', e => { const t = e.target.closest('[data-btn]'); if (t) { this.setPush(t.dataset.btn, true); } const d = e.target.closest('[data-dip]'); if (d) this.toggleDip(+d.dataset.dip); });
    window.addEventListener('mouseup', () => { ['SW1', 'SW2'].forEach(b => { if (this.held && this.held[b]) this.setPush(b, false); }); });
  }
  parts(kind, pin) { return this.ed.doc.parts.filter(p => p.kind === kind && p.props.pin === pin); }
  setPush(b, down) { this.held = this.held || {}; this.held[b] = down; this.parts('PUSH', b).forEach(p => this.ed.setSrc(p, (down ? 1 : 0) ^ (this.activeLow ? 1 : 0))); this.ed.dirty = true; }
  toggleDip(i) { this.parts('SW', 'D' + i).forEach(p => { p.props.on = p.props.on ? 0 : 1; this.ed.setSrc(p, p.props.on); }); this.ed.dirty = true; }
  sync(force) { let ch = false; this.ed.doc.parts.filter(p => p.kind === 'PUSH' && p.props.pin).forEach(p => { const inv = this.activeLow ? 1 : 0; if (p.props.inv !== inv) { p.props.inv = inv; ch = true; } }); if (ch || force) this.ed.recompile(); }
  /* Alhambra II (iCE40HX4K-TQ144): vista superior sobre la serigrafía «Top Designators» de la placa. Formato Arduino UNO, PCB negra. */
  drawBoard() {
    const PCB = '#15171a', SIL = '#d9d7d0', GRY = '#8e908d', HDR = '#26292b', GOLD = '#d6b040';
    let s = '';
    const T = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.s || 6}" fill="${o.c || SIL}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} ${o.r ? `transform="rotate(${o.r} ${x} ${y})"` : ''} ${o.i ? 'font-style="italic"' : ''} pointer-events="none">${t}</text>`;
    const box = (x, y, w, h, l, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 1}" fill="${o.f || '#2a2d2f'}" stroke="${SIL}" stroke-width=".6" opacity=".95"/>` + (l ? T(x + w / 2, y + h / 2 + 2, l, { s: o.s || 5.5 }) : '');
    const ic = (x, y, w, h, l, o = {}) => { let t = ''; const n = o.n || 12; for (let k = 0; k < n; k++) { const px = x + 5 + k * (w - 10) / (n - 1), py = y + 5 + k * (h - 10) / (n - 1); t += `<rect x="${px - 1}" y="${y - 3}" width="2" height="3" fill="${GOLD}"/><rect x="${px - 1}" y="${y + h}" width="2" height="3" fill="${GOLD}"/><rect x="${x - 3}" y="${py - 1}" width="3" height="2" fill="${GOLD}"/><rect x="${x + w}" y="${py - 1}" width="3" height="2" fill="${GOLD}"/>`; }
      return t + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#0b0c0d" stroke="#3a3d40" stroke-width=".8"/><circle cx="${x + 6}" cy="${y + 6}" r="1.8" fill="#2d3033"/>` + T(x + w / 2, y + h / 2 + (o.sub ? -1 : 2), l, { s: o.s || 7, c: '#aeb1b3', b: 1 }) + (o.sub ? T(x + w / 2, y + h / 2 + 8, o.sub, { s: 5.5, c: '#80848a' }) : ''); };
    // placa: contorno tipo Arduino UNO, PCB negra con orificios
    s += `<polygon points="16,3 484,3 500,19 500,97 505,103 505,358 491,384 16,384 3,371 3,16" fill="${PCB}" stroke="#000" stroke-width="1.5"/>`;
    [[118, 19], [109, 375], [486, 129], [486, 327]].forEach(([x, y]) => s += `<circle cx="${x}" cy="${y}" r="11" fill="#F9F8F6" stroke="${SIL}" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#0004"/>`);
    // pulsadores SW1, SW2 (usuario) y SW3 (reset)
    const tact = (x, y, w, h, id, bt) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#c3c3be" stroke="#6d6d68"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="2" fill="#9a9a95"/><circle ${bt ? `data-btn="${bt}" id="f${bt}"` : `id="${id}"`} cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) / 3.2}" fill="#4a4d4a" stroke="#111" stroke-width="1" ${bt ? 'style="cursor:pointer"' : ''}><title>${bt ? bt + ': pulsador de usuario (pin ' + BTNPIN[bt] + '), 1 al pulsar' : 'RESET'}</title></circle>`;
    s += tact(16, 9, 41, 26, '', 'SW1') + tact(61, 9, 42, 26, '', 'SW2') + T(36, 46, 'SW1', { s: 9, c: GRY, b: 1 }) + T(82, 47, 'SW2', { s: 9, c: GRY, b: 1 });
    s += tact(466, 258, 37, 46, 'fsw3') + T(458, 281, 'RESET', { s: 8, c: GRY, b: 1, r: -90 });
    // LED0..LED7 (columna de la izquierda), CFG, TX, RX, PWR
    for (let i = 0; i < 8; i++) { const y = 136 - i * 10.4; s += `<rect x="19" y="${y - 4}" width="25" height="8" rx="1" fill="#202325" stroke="${SIL}" stroke-width=".5"/><rect id="fled${i}" x="23" y="${y - 2.8}" width="12" height="5.6" rx="2" fill="#5a1c18"><title>LED${i} (pin ${LEDPIN[i]})</title></rect>` + T(50, y + 2.5, i, { s: 7.5, c: GRY, b: 1 }) + T(40, y + 1.8, 'LD' + i, { s: 4, c: '#9a9c99' }); }
    [[67, 'CFG', '#2f8f4e'], [86, 'TX', '#7a5a1c'], [96, 'RX', '#7a5a1c']].forEach(([y, l, c]) => s += `<rect x="86" y="${y - 4}" width="24" height="8" rx="1" fill="#202325" stroke="${SIL}" stroke-width=".5"/><rect x="90" y="${y - 2.8}" width="12" height="5.6" rx="2" fill="${l === 'CFG' ? '#46c26a' : c}"/>` + T(76, y + 2.5, l, { s: 8, c: GRY, b: 1, a: 'end' }));
    s += `<rect x="20" y="224" width="22" height="8" rx="1" fill="#202325" stroke="${SIL}" stroke-width=".5"/><rect x="24" y="225.2" width="12" height="5.6" rx="2" fill="#46c26a"/>` + T(30, 244, 'PWR', { s: 8, c: GRY, b: 1 });
    // conector USB (PC) en el borde izquierdo
    s += `<rect x="3" y="145" width="42" height="58" rx="2" fill="#c8c8c2" stroke="#6d6d68"/><rect x="12" y="156" width="28" height="36" fill="#8f8f8a" stroke="#5a5a56"/><rect x="18" y="167" width="14" height="14" fill="#1a1a1a"/>` + T(24, 213, 'J14', { s: 6 }) + `<polygon points="46,194 58,186 58,202" fill="#8a8c89"/>` + T(76, 197, 'PC', { s: 12, c: GRY, b: 1 });
    // circuitos integrados
    s += box(105, 109, 41, 22, 'U4', { f: '#0b0c0d' }) + box(55, 119, 31, 23, 'U5', { f: '#0b0c0d' }) + ic(94, 148, 78, 80, 'FT2232H', { n: 10, s: 7, sub: 'U3 · USB↔JTAG' });
    s += box(136, 234, 56, 51, 'U2', { f: '#0b0c0d', s: 7 }) + box(59, 270, 34, 25, 'U8', { f: '#0b0c0d' }) + box(25, 247, 30, 28, 'L2', { f: '#35383a' }) + box(95, 281, 30, 39, 'L1', { f: '#35383a' }) + box(143, 288, 32, 18, 'R14') + box(179, 285, 11, 20, 'D4') + box(74, 326, 48, 28, 'D3') + box(200, 295, 25, 27, 'U9', { f: '#0b0c0d' }) + box(234, 307, 29, 33, 'U6', { f: '#0b0c0d' }) + box(270, 305, 25, 29, 'U7', { f: '#0b0c0d' }) + box(303, 306, 19, 28, 'R30') + box(200, 345, 22, 15, 'Q1');
    s += `<rect x="11" y="314" width="41" height="61" rx="2" fill="#2d3033" stroke="${SIL}" stroke-width=".7"/>` + T(31, 348, 'J15', { s: 6 }) + T(63, 350, 'PWR ONLY', { s: 8, c: GRY, b: 1, r: -90 }) + T(14, 238, '1.8A', { s: 6, c: GRY, b: 1, r: -90, a: 'middle' }) + T(14, 292, '3A', { s: 6, c: GRY, b: 1, r: -90 });
    s += `<rect x="129" y="341" width="57" height="44" rx="2" fill="#c3c3be" stroke="#6d6d68"/><rect x="141" y="352" width="34" height="14" fill="#2a2a2a"/>` + T(158, 378, 'SW4', { s: 6, c: '#222' }) + T(140, 333, 'ON', { s: 7, c: GRY, b: 1 }) + T(177, 333, 'OFF', { s: 7, c: GRY, b: 1 }) + `<rect x="148" y="329" width="18" height="7" rx="1" fill="#202325" stroke="${SIL}" stroke-width=".5"/><rect x="152" y="330" width="10" height="5" rx="2" fill="#46c26a"/>` + T(158, 321, 'I/O PWR', { s: 8, c: GRY, b: 1 });
    // FPGA iCE40HX4K-TQ144
    s += ic(228, 116, 126, 142, 'iCE40HX4K', { n: 24, s: 10, sub: 'TQ144 · U1' }) + `<polygon points="364,110 369,115 364,120 359,115" fill="${GRY}"/>`;
    // resistencias, condensadores y varios
    s += box(149, 43, 25, 22, 'R10') + box(180, 49, 16, 12, 'R9') + box(179, 69, 17, 13, 'R8') + [[389, 109], [418, 109], [389, 129], [418, 129]].map(([x, y], k) => box(x, y, 29, 20, ['R7', 'R5', 'R6', 'R4'][k])).join('') + [[389, 232], [389, 252], [418, 252]].map(([x, y], k) => box(x, y, 29, 20, ['R11', 'R12', 'R13'][k])).join('') + box(378, 242, 10, 20, 'D1', { s: 4.5 });
    s += `<path d="M447,196 L452,182 L482,182 L488,190 L488,252 L447,252Z" fill="#2b2e30" stroke="${SIL}" stroke-width=".7"/>` + T(467, 222, 'C50', { s: 7 });
    s += T(440, 176, 'Alhambra II', { s: 21, c: GRY, b: 1, i: 1 }) + T(420, 192, 'V1.0A', { s: 10, c: GRY, b: 1 }) + T(449, 270, '', {});
    // cabeceras de pines (formato Arduino UNO + tira de 3 hilos S/V/G)
    const hdr = (x, y, w, h, pins, labels, lab, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${HDR}" stroke="${SIL}" stroke-width=".6"/>` + pins.map((px, k) => `<rect x="${px - 3}" y="${y + h / 2 - 3}" width="6" height="6" fill="${GOLD}" stroke="#7a6320" stroke-width=".5"><title>${esc2(labels[k])}</title></rect>`).join('') + (lab ? T(x + 8, y + h / 2 + 2, lab, { s: 5.5 }) : '');
    const X13 = [217, 235.4, 253.8, 272.2, 290.6, 309], X7 = [338, 356.5, 375, 394, 412.5, 430.5, 449, 467], XA = [349, 367.4, 385.8, 404.2, 422.6, 441];
    s += hdr(172, 6, 145, 24, [180.4, 198.8, ...X13], ['AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'], 'J1') + hdr(329, 6, 147, 24, X7, ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'].map((d, k) => k >= 0 ? d + ' (FPGA pin ' + [91, 90, 88, 87, 85, 80, 79, 78][k] + ')' : d), 'J5');
    ['AR', 'G'].forEach((l, k) => s += T([180.4, 198.8][k], 38, l, { s: 8, c: GRY, b: 1 }));
    [13, 12, 11, 10, 9, 8].forEach((n, k) => s += T(X13[k], 38, n, { s: 8, c: GRY, b: 1 }) + T(X13[k], 106, n, { s: 8, c: GRY, b: 1 }));
    [7, 6, 5, 4, 3, 2, 1, 0].forEach((n, k) => s += T(X7[k], 38, n, { s: 8, c: GRY, b: 1 }) + T(X7[k], 106, n, { s: 8, c: GRY, b: 1 }));
    [[43, 'J9', 'J11', 'G'], [62, 'J8', 'J10', 'V'], [81, 'J3', 'J4', 'S']].forEach(([y, a, b, l]) => { s += hdr(209, y, 108, 16, X13, X13.map((x, k) => 'D' + (13 - k) + ' · ' + l), a) + hdr(329, y, 147, 16, X7, X7.map((x, k) => 'D' + (7 - k) + ' · ' + l), b) + T(323, y + 11, l, { s: 10, c: GRY, b: 1 }); });
    [[287, 'J7', 'S'], [306, 'J12', 'V'], [325, 'J13', 'G']].forEach(([y, a, l]) => { s += hdr(344, y, 104, 17, XA, XA.map((x, k) => ['A0', 'A1', 'A2', 'A3', 'D4', 'D5'][k] + ' · ' + l), a) + T(333, y + 12, l, { s: 10, c: GRY, b: 1 }); });
    ['A0', 'A1', 'A2', 'A3', 'D4', 'D5'].forEach((n, k) => s += T(XA[k], 282, n, { s: 8, c: GRY, b: 1 }));
    const XJ6 = [374.5, 393.5, 412, 431, 449.5, 468];
    s += hdr(364, 358, 112, 16, XJ6, ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'], 'J6'); ['A0', 'A1', 'A2', 'A3', 'D4', 'D5'].forEach((n, k) => s += T(XJ6[k], 351, n, { s: 8, c: GRY, b: 1 }));
    const XJ2 = [247, 265.5, 284, 302.5, 321, 339.5];
    s += hdr(236, 358, 116, 16, XJ2, ['RESET', '3V3', '5V', 'GND', 'GND', 'VIN'], 'J2'); ['R', '3V3', '5V', 'GND', 'GND', 'VIN'].forEach((n, k) => s += T(XJ2[k], 351, n, { s: 7, c: GRY, b: 1 }));
    // interruptores externos (módulo DIP de 8, fuera de la placa) conectados a D0..D7
    s += `<rect x="318" y="396" width="170" height="52" rx="3" fill="#C23B2E" stroke="#6b1d16"/>` + T(330, 408, 'ON ▲', { s: 7, c: '#fff', b: 1, a: 'start' }) + T(402, 408, 'DIP externo en D0–D7', { s: 6.5, c: '#f4d9d5' });
    for (let i = 0; i < 8; i++) { const px = X7[7 - i]; s += `<rect x="${px - 6}" y="412" width="12" height="22" rx="2" fill="#5a1b15"/><rect data-dip="${i}" id="fdip${i}" x="${px - 5}" y="414" width="10" height="11" rx="1.5" fill="#C9BDA0" stroke="#222" style="cursor:pointer"><title>D${i}: interruptor externo (clic para cambiar)</title></rect>` + T(px, 444, 'D' + i, { s: 7, c: '#fbeae7', b: 1 }); }
    this.el.querySelector('#fpsv').setAttribute('viewBox', '0 0 508 454');
    this.el.querySelector('#fpsv').innerHTML = s;
  }
  frame() {
    this.sync();
    const ed = this.ed, sim = ed.sim, v = (id) => this.el.querySelector(id);
    for (let i = 0; i < 8; i++) { const p = ed.doc.parts.find(q => q.kind === 'LED' && q.props.pin === 'LED' + i), el = v('#fled' + i); if (!el) continue; const sp = p && ed.refs[p.id] !== undefined ? sim.parts[ed.refs[p.id]] : null; el.setAttribute('fill', sp && sp.st.on ? '#ff4a38' : '#5a1c18'); }
    for (let i = 0; i < 8; i++) { const p = ed.doc.parts.find(q => q.kind === 'SW' && q.props.pin === 'D' + i), el = v('#fdip' + i); if (el) { const on = p ? p.props.on : 0; el.setAttribute('fill', p ? (on ? '#F4F1E8' : '#C9BDA0') : '#C9BDA0'); el.setAttribute('y', on ? 414 : 424); } }
    ['SW1', 'SW2'].forEach(b => { const el = v('#f' + b); if (el) el.setAttribute('fill', this.held && this.held[b] ? '#8a8d8a' : '#4a4d4a'); });
  }
  verilog() {
    const doc = this.ed.doc, par = {}, f = (x) => { while (par[x] && par[x] !== x) x = par[x]; return par[x] === undefined ? (par[x] = x) : x; }, u = (a, b) => { a = f(a); b = f(b); if (a !== b) par[b] = a; };
    doc.wires.forEach(w => u(w.a.p + '.' + w.a.n, w.b.p + '.' + w.b.n));
    const name = {}, ins = [], outs = []; let ni = 0;
    const setName = (pid, nm) => { name[f(pid)] = nm; };
    doc.parts.forEach(p => { if (p.kind === 'SW' || p.kind === 'PUSH' || p.kind === 'CLK') { const nm = (p.props.pin || p.props.label || p.id).toLowerCase().replace(/\W/g, '_'); ins.push(nm); setName(p.id + '.Y', nm); }
      if (p.kind === 'LED') { const nm = (p.props.pin || p.props.label || p.id).toLowerCase().replace(/\W/g, '_'); outs.push({ nm, pid: p.id + '.A' }); } });
    const nn = (pid) => { const r = f(pid); if (!name[r]) name[r] = 'n' + (ni++); return name[r]; };
    let body = '';
    doc.parts.forEach(p => {
      if (DSim.GATES[p.kind]) { const n = p.kind === 'NOT' || p.kind === 'BUF' ? 1 : +p.props.n, a = []; for (let i = 0; i < n; i++) a.push(nn(p.id + '.' + 'ABCD'[i])); const y = nn(p.id + '.Y');
        const e = { AND: a.join(' & '), OR: a.join(' | '), NAND: '~(' + a.join(' & ') + ')', NOR: '~(' + a.join(' | ') + ')', XOR: a.join(' ^ '), XNOR: '~(' + a.join(' ^ ') + ')', NOT: '~' + a[0], BUF: a[0] }[p.kind]; body += `  wire ${y}; assign ${y} = ${e};\n`; }
    });
    outs.forEach(o => { body += `  assign ${o.nm} = ${nn(o.pid)};\n`; });
    const v = `// Generado por DIGITAL-SIM · diseño para Alhambra II (iCE40HX4K)\nmodule top(${[...ins.map(i => 'input ' + i), ...outs.map(o => 'output ' + o.nm)].join(', ')});\n${body}endmodule\n`;
    const pcf = [...outs.map(o => { const m = o.nm.match(/^led(\d)$/); return m ? `set_io ${o.nm} ${LEDPIN[+m[1]]}` : `# set_io ${o.nm} <pin>`; }), ...ins.map(i => { const dm = i.match(/^d(\d)$/); return BTNPIN[i.toUpperCase()] ? `set_io ${i} ${BTNPIN[i.toUpperCase()]}` : dm && +dm[1] < 8 ? `set_io ${i} ${DPIN[+dm[1]]}` : /^clk/.test(i) ? `set_io ${i} 49` : `# set_io ${i} <pin del conector>`; })].join('\n');
    this.app.fpgaVerilog = v; this.el.querySelector('#fpv').textContent = v + '\n// alhambra.pcf (comprueba los pines con el esquema de la placa)\n' + pcf; return v;
  }
  load(doc) { this.ed.load(doc.toJSON()); const find = (k, nm) => this.ed.doc.parts.filter(p => p.kind === k); find('SW').forEach((p, i) => { p.props.pin = ['D0', 'D1', 'D2', 'D3', 'D4'][i] || ''; }); find('LED').forEach((p, i) => { p.props.pin = 'LED' + i; }); this.ed.recompile(); }
}
root.FpgaUI = FpgaUI;
})(window);
