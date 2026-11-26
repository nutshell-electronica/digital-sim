/* Protoboard 830 puntos + instrumentos (equivale al entorno físico / Tinkercad) */
(function (root) {
'use strict';
const B = {};
const NS = 'http://www.w3.org/2000/svg';
const INK = '#1F2421', MUTE = '#696C69', HI = '#B85D34', BG = '#F9F8F6', BORD = '#E2DFD8', SAGE = '#6A7B6C';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLS = 63, P = 18, X0 = 52, COLT = ['IC', 'PUSH', 'DIPSW', 'CLK', 'D7', 'SENS'], SC = () => root.SensCat;
const ROWY = { j: 100, i: 118, h: 136, g: 154, f: 172, e: 214, d: 232, c: 250, b: 268, a: 286 };
const ROWS = ['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
/* filas de un componente de varias patas: lo = fila de abajo (patas 1..n/2 de un integrado), hi = fila de arriba. Por defecto e/f, a caballo del canal central; el alumno puede colocarlo en cualquier otro par de filas */
B.rowsOf = (it) => { const r = it.r === undefined ? 5 : it.r; return { lo: ROWS[r], hi: ROWS[r - 1], r }; };
const rOfRow = (row) => { if (row === 'e' || row === 'f') return 5; return Math.max(1, Math.min(9, ROWS.indexOf(row))); };
const RAILY = { 'T+': 34, 'T-': 52, 'B-': 332, 'B+': 350 };
B.hx = (col) => X0 + (col - 1) * P;
const railX = (k) => X0 + 10 + k * P + Math.floor(k / 5) * 22;
B.parseKey = (k) => { const a = k.split(':'); if (a[0] === 'h') { const m = a[1].match(/^(\d+)([a-j])$/); return { t: 'h', col: +m[1], row: m[2] }; } if (a[0] === 'r') return { t: 'r', rail: a[1], k: +a[2] }; if (a[0] === 'f') return { t: 'f', x: +a[1], y: +a[2] }; if (a[0] === 's') return { t: 's', name: a.slice(1).join(':') }; return { t: 'i', name: a.slice(1).join(':') }; };
B.netOf = (k) => { const p = B.parseKey(k); if (p.t === 'h') return 'M' + p.col + (p.row <= 'e' ? 'b' : 't'); if (p.t === 'r') return 'R:' + p.rail; return k; };
const hole = (col, row) => 'h:' + col + row;
const keyXY = (k, ctx) => { const p = B.parseKey(k); if (p.t === 'f') return { x: p.x, y: p.y }; if (p.t === 'h') return { x: B.hx(p.col), y: ROWY[p.row] }; if (p.t === 'r') return { x: railX(p.k), y: RAILY[p.rail] }; if (ctx && ctx.sockets && ctx.sockets[k]) return ctx.sockets[k]; if (ctx && ctx.ipins && ctx.ipins[k]) return ctx.ipins[k]; return null; };

/* ---------- placas MCU (sockets) ---------- */
B.BOARDS = {
  UNO: { name: 'Arduino UNO', vdd: 5, w: 702, h: 546, xt: 192, xb: 286, gt: 16, gb: 26, pitch: 26, ry: 24,
    pins: [['SCL', 'n'], ['SDA', 'n'], ['AREF', 'n'], ['GND', 'n'], ['D13', 'd'], ['D12', 'd'], ['D11', 'd'], ['D10', 'd'], ['D9', 'd'], ['D8', 'd'], null, ['D7', 'd'], ['D6', 'd'], ['D5', 'd'], ['D4', 'd'], ['D3', 'd'], ['D2', 'd'], ['D1', 'd'], ['D0', 'd'], 'row', ['NC', 'n'], ['IOREF', 'n'], ['RESET', 'n'], ['3V3', 'p3'], ['5V', 'p5'], ['GND', 'g'], ['GND2', 'g'], ['VIN', 'x'], null, ['A0', 'a'], ['A1', 'a'], ['A2', 'a'], ['A3', 'a'], ['A4', 'a'], ['A5', 'a']] },
  ESP32: { name: 'ESP32-S3 DevKitC-1', vdd: 3.3, w: 717, h: 260, xt: 48, xb: 48, gt: 0, gb: 0, pitch: 26, ry: 13,
    pins: [['GND', 'g'], ['5V', 'p5'], ['GPIO14', 'd'], ['GPIO13', 'd'], ['GPIO12', 'd'], ['GPIO11', 'd'], ['GPIO10', 'd'], ['GPIO9', 'd'], ['GPIO46', 'd'], ['GPIO3', 'd'], ['GPIO8', 'd'], ['GPIO18', 'd'], ['GPIO17', 'd'], ['GPIO16', 'd'], ['GPIO15', 'd'], ['GPIO7', 'd'], ['GPIO6', 'd'], ['GPIO5', 'd'], ['GPIO4', 'd'], ['RST', 'n'], ['3V3', 'p3'], ['3V3b', 'p3'], 'row',
      ['GND2', 'g'], ['GND3', 'g'], ['GPIO19', 'd'], ['GPIO20', 'd'], ['GPIO21', 'd'], ['GPIO47', 'd'], ['GPIO48', 'd'], ['GPIO45', 'd'], ['GPIO0', 'd'], ['GPIO35', 'd'], ['GPIO36', 'd'], ['GPIO37', 'd'], ['GPIO38', 'd'], ['GPIO39', 'd'], ['GPIO40', 'd'], ['GPIO41', 'd'], ['GPIO42', 'd'], ['GPIO2', 'd'], ['GPIO1', 'd'], ['GPIO44', 'd'], ['GPIO43', 'd'], ['GND4', 'g']] }
};
/* mapa pin-nombre -> número de pin Arduino / GPIO */
B.pinNumber = (board, name) => { if (board === 'UNO') { if (/^D\d+$/.test(name)) return +name.slice(1); if (/^A\d$/.test(name)) return 14 + +name.slice(1); return null; } const m = name.match(/^GPIO(\d+)$/); return m ? +m[1] : null; };

/* ---------- código de colores de resistencias ---------- */
const CC = ['#222', '#7a4a2a', '#b8432f', '#d98a2b', '#d9c13a', '#4f8a57', '#4c6a8c', '#7a5c8c', '#888', '#eee'];
B.bands = (r) => { if (!(r > 0)) return ['#222', '#222', '#222']; let e = Math.floor(Math.log10(r)) - 1; let s = Math.round(r / Math.pow(10, e)); if (s >= 100) { s = Math.round(s / 10); e++; } if (e < 0) return [CC[Math.floor(s / 10)], CC[s % 10], e === -1 ? '#c9a227' : '#bbb']; return [CC[Math.floor(s / 10) % 10], CC[s % 10], CC[Math.min(9, e)]]; };

/* ---------- modelo ---------- */
B.PARTS = {
  R: { name: 'Resistencia', pts: 2, props: { v: '330' } }, LED: { name: 'LED', pts: 2, props: { color: 'red' } }, C: { name: 'Condensador', pts: 2, props: { v: '100u' } },
  WIRE: { name: 'Cable', pts: 2, props: { color: '#4C6A8C' } }, PUSH: { name: 'Pulsador (4 patas)', pts: 1, props: {} }, DIPSW: { name: 'Minipuerto DIP 8', pts: 1, props: {} }, CLK: { name: 'Generador de reloj', pts: 1, props: {} },
  SENS: { name: 'Sensor / actuador', pts: 1, props: {} }, D7: { name: 'Display 7 seg (5161)', pts: 1, props: { ca: 0 } }, DMM: { name: 'Multímetro', pts: 2, props: { mode: 'V' } }, LP: { name: 'Sonda lógica', pts: 1, props: {} }, LA: { name: 'Analizador lógico (8 canales)', pts: 8, props: {} }
};
const dsLinkHTML = (id) => { const h = DSim.dsHref(id); return h ? `<p><a class="dsl" href="${h}" target="_blank" rel="noopener">Hoja de datos ${DSim.dsFile(id)} · ${DSim.dsMaker(id)}</a> <span class="mut">(alldatasheet.es)</span></p>` : ''; };
B.dsLinkHTML = dsLinkHTML;
B.flame = (x, y, msg, sc = 1) => `<g transform="translate(${x},${y}) scale(${sc})"><title>${esc('Sobrecarga: ' + msg)}</title><g><animateTransform attributeName="transform" type="scale" values="1 1;0.94 1.1;1.05 .94;1 1" dur=".7s" repeatCount="indefinite" additive="sum"/><path d="M0,-30 C3,-20 13,-16 13,-4 C13,4 7,9 0,9 C-7,9 -13,4 -13,-4 C-13,-11 -8,-15 -6,-21 C-4,-17 -2,-16 0,-15 C1,-21 -1,-25 0,-30Z" fill="#E8671F" stroke="#9c3a0e" stroke-width=".8"/><path d="M0,-12 C3,-7 8,-5 8,1 C8,5 4,8 0,8 C-4,8 -8,5 -8,1 C-8,-3 -3,-5 0,-12Z" fill="#F7C531"/></g></g>`;
B.newBoard = () => ({ items: [], nid: 1, mb: { on: true, top: 5, bot: 5 }, mcu: null });

B.pinKeys = (it) => { // llaves de hoyos por patilla (índice = nº de patilla - 1)
  if (it.type === 'IC') { const d = DSim.IC[it.ic], h = d.n / 2, r = [], R = B.rowsOf(it); for (let k = 1; k <= d.n; k++) r.push(k <= h ? hole(it.col + k - 1, R.lo) : hole(it.col + (d.n - k), R.hi)); return r; }
  return null;
};

/* ---------- compilación ---------- */
B.compile = function (board, ctx) {
  const nb = new DSim.NetBuilder(), refs = {}, N = B.netOf, push = (it, part) => { part.ref = it.id; nb.part(part); return nb.parts.length - 1; };
  const used = new Set(); let mcu = null;
  board.items.forEach(it => { if (it.a) used.add(N(it.a)); if (it.b) used.add(N(it.b)); });
  // alimentación MB102
  const mb = board.mb;
  if (mb && mb.on) { nb.join('R:T-', 'GND'); nb.join('R:B-', 'GND'); if (mb.top) nb.part({ type: 'V', v: mb.top, pinIds: ['R:T+'] }); if (mb.bot) nb.part({ type: 'V', v: mb.bot, pinIds: ['R:B+'] }); }
  // MCU
  if (board.mcu && board.mcu.board) {
    const bd = B.BOARDS[board.mcu.board], ids = [], types = []; bd.pins.forEach(p => { if (!p || p === 'row' || p[1] === 'n') return; ids.push('s:' + p[0]); types.push(p[1]); });
    ids.forEach((id, i) => { if (types[i] === 'g') nb.join(id, 'GND'); if (types[i] === 'p5') nb.part({ type: 'V', v: 5, pinIds: [id] }); if (types[i] === 'p3') nb.part({ type: 'V', v: 3.3, pinIds: [id] }); });
    mcu = { part: nb.parts.length, names: ids.map(i => i.slice(2)) };
    nb.part({ type: 'MCU', vdd: bd.vdd, pinIds: ids.slice(), names: ids.map(i => i.slice(2)), ref: 'mcu' });
  }
  board.items.forEach(it => {
    if (it.off && it.col !== undefined) return; /* pieza sacada de la placa: no conecta con nada */
    switch (it.type) {
      case 'WIRE': nb.join(N(it.a), N(it.b)); break;
      case 'R': refs[it.id] = push(it, { type: 'R', r: Math.max(Schem.parseVal(it.v) || 1, 1e-3), pinIds: [N(it.a), N(it.b)] }); break;
      case 'C': refs[it.id] = push(it, { type: 'C', c: Schem.parseVal(it.v) || 1e-9, pinIds: [N(it.a), N(it.b)] }); break;
      case 'LED': refs[it.id] = push(it, { type: 'LED', color: it.color, pinIds: [N(it.a), N(it.b)] }); break;
      case 'IC': { const keys = B.pinKeys(it), d = DSim.IC[it.ic]; refs[it.id] = push(it, { type: 'IC', ic: it.ic, label: it.label || d.name, pinIds: keys.map(k => used.has(N(k)) || true ? N(k) : null) }); break; }
      case 'PUSH': { const R = B.rowsOf(it); const a = hole(it.col, R.lo), b = hole(it.col + 2, R.lo), c = hole(it.col, R.hi), e = hole(it.col + 2, R.hi); nb.join(N(a), N(b)); nb.join(N(c), N(e)); refs[it.id] = push(it, { type: 'SW', closed: false, pinIds: [N(a), N(c)] }); break; }
      case 'DIPSW': { const R = B.rowsOf(it); const r = [], n = it.n || 8; it.st = it.st || new Array(n).fill(0); for (let i = 0; i < n; i++) r.push(push(it, { type: 'SW', closed: !!it.st[i], pinIds: [N(hole(it.col + i, R.lo)), N(hole(it.col + i, R.hi))] })); refs[it.id] = r; break; }
      case 'CLK': { const R = B.rowsOf(it); const c = it.col, hz = Math.min(1e5, Math.max(0.01, Schem.parseVal(it.hz) || 1)), du = Math.min(95, Math.max(5, +it.duty || 50)) / 100; refs[it.id] = push(it, { type: 'SRC', mode: 'clock', pwr: true, hz, duty: du, rout: 60, pinIds: [N(hole(c + 1, R.lo)), N(hole(c, R.lo)), N(hole(c + 2, R.lo))] }); break; }
      case 'D7': { const R = B.rowsOf(it); const c = it.col, ks = [hole(c + 3, R.hi), hole(c + 4, R.hi), hole(c + 3, R.lo), hole(c + 1, R.lo), hole(c, R.lo), hole(c + 1, R.hi), hole(c, R.hi), hole(c + 4, R.lo), hole(c + 2, R.lo)];
        nb.join(N(hole(c + 2, R.lo)), N(hole(c + 2, R.hi))); refs[it.id] = push(it, { type: 'DISP7', color: 'red', ca: +it.ca, pinIds: ks.map(N) }); break; }
      case 'SENS': { const c = SC().CAT[it.kind]; if (!c) break; const R = B.rowsOf(it), ks = c.pins.map(q => N(hole(it.col + q.dx, R.lo)));
        it.stim = Object.assign(SC().defaults(it.kind).stim, it.stim); it.o = Object.assign(SC().defaults(it.kind).o, it.o);
        if (c.rgb) { const ca = it.o.tipo === 'ánodo común', K = ks[1]; refs[it.id] = [['red', ks[0]], ['green', ks[2]], ['blue', ks[3]]].map(([col, k]) => push(it, { type: 'LED', color: col, pinIds: ca ? [K, k] : [k, K] })); }
        else refs[it.id] = push(it, { type: 'SENS', kind: it.kind, stim: it.stim, o: it.o, label: c.name, pinIds: ks }); break; }
      case 'DMM': if (it.red && it.black && it.mode !== 'R') refs[it.id] = push(it, { type: it.mode === 'A' ? 'AMM' : 'VM', pinIds: [N(it.red), N(it.black)] }); break;
      case 'LP': break;
    }
  });
  const nl = nb.build();
  // avisos: patillas de alimentación de integrados
  return { nl, refs, nb, mcuInfo: mcu };
};

/* ---------- editor de protoboard ---------- */
const nudge = (p) => { const ry = Object.values(RAILY).concat(Object.values(ROWY)); let y = p.y, x = p.x;
  const ny = ry.reduce((a, c) => Math.abs(c - y) < Math.abs(a - y) ? c : a, ry[0]); if (Math.abs(ny - y) < 9) y = ny + (y >= ny ? 9 : -9);
  const rail = y < 80 || y > 310; let nx;
  if (rail) { let bk = 0; for (let k = 0; k < 50; k++) if (Math.abs(railX(k) - x) < Math.abs(railX(bk) - x)) bk = k; nx = railX(bk); } else nx = B.hx(Math.max(1, Math.min(COLS, Math.round((x - X0) / P) + 1)));
  if (Math.abs(nx - x) < 9) x = nx + (x >= nx ? 9 : -9); return { x, y }; };
const wirePath = (a, c, pts) => { if (!pts || !pts.length) { const my = Math.min(a.y, c.y) - 24 - Math.abs(a.x - c.x) * 0.05; return `M${a.x},${a.y} C${a.x},${my} ${c.x},${my} ${c.x},${c.y}`; } return 'M' + [a].concat(pts, [c]).map(q => q.x + ',' + q.y).join(' L'); };
B.Editor = class {
  constructor(root, o = {}) {
    this.root = root; this.board = B.newBoard(); this.sel = null; this.tool = null; this.pend = null; this.view = { x: 0, y: 0, k: 1 };
    this.running = false; this.speed = 1; this.dt = 5e-5; this.onChange = o.onChange; this.dirty = true; this.log = []; this.mcuCtl = null; this.hover = null; this.alerted = new Set(); this.fire = {};
    this.build(); this.recompile(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  build() {
    const r = this.root;
    r.innerHTML = `<div class="ed-left"><div class="pal-h">Material del taller</div><div class="pal" id="bpal"></div></div>
    <div class="ed-main"><div class="tb">
      <button class="b prim" data-a="run">▶ Simular</button><button class="b" data-a="reset">Reiniciar</button>
      <label class="inl">Velocidad <select data-a="speed"><option value="0.01">0,01×</option><option value="0.1">0,1×</option><option value="1" selected>1×</option><option value="10">10×</option><option value="100">100×</option></select></label>
      <label class="inl">Paso <select data-a="dt"><option value="1e-5">10 µs</option><option value="5e-5" selected>50 µs</option><option value="1e-4">100 µs</option><option value="1e-3">1 ms</option></select></label>
      <button class="b" data-a="auto" title="Ajusta velocidad, paso y ventana del analizador al reloj del circuito, para que la señal cruce la pantalla en unos 6 s">Autoajuste</button>
      <span class="sp"></span><span class="tstat" id="btstat">t = 0</span><button class="b" data-a="fit">Ajustar vista</button><button class="b" data-a="png">Captura</button><button class="b" data-a="clear">Vaciar</button></div>
    <div class="cv"><svg id="bsv" xmlns="${NS}"></svg><div class="hint" id="bhint">Arrastra piezas del catálogo a la placa. Arrastra de un agujero a otro para tender un cable. Doble clic en una pieza para editar su valor. Rueda: zoom.</div><div class="tip" id="btip"></div></div>
    <div class="tpanel"><canvas id="btc"></canvas><div class="tp-b"><button class="b sm" data-a="tfollow">Seguir</button><button class="b sm" data-a="tcur" data-cur="0">Cursor A</button><button class="b sm" data-a="tcur" data-cur="1">Cursor B</button><button class="b sm" data-a="tanalog">Analógico</button><span id="laMeas" class="mut">Analizador lógico: pon pinzas en los agujeros (8 canales). Rueda: zoom.</span></div></div></div>
    <div class="ed-right"><div class="pal-h" id="bph">Banco</div><div id="bmcu" hidden></div><div id="bprops" class="props"></div><div id="bwarns" class="warns"></div></div>`;
    this.svg = r.querySelector('#bsv'); this.timing = new Timing(r.querySelector('#btc'), { span: 0.02, th: [0.6, 1.2] });
    if (window.ResizeObserver) new ResizeObserver(() => { this.dirty = true; }).observe(this.svg);
    this.buildPalette();
    r.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (a && a.tagName === 'BUTTON') this.action(a.dataset.a, a); });
    r.querySelector('#bpal').addEventListener('dragstart', e => { const b = e.target.closest('.pi'); if (!b) return; e.dataTransfer.setData('text/plain', 'brd:' + b.dataset.t); e.dataTransfer.effectAllowed = 'copy'; this.cancelTool(); this.dragT = b.dataset.t; this.dropDone = false; this.dragIn = false; this.lastDrag = null; if (e.dataTransfer.setDragImage) { if (!B.NOIMG) { B.NOIMG = new Image(); B.NOIMG.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; } e.dataTransfer.setDragImage(B.NOIMG, 0, 0); } });
    r.querySelector('#bpal').addEventListener('dragend', () => { const t = this.dragT; this.dragT = null; this.ghost = null; this.dirty = true; if (t && this.dragIn && !this.dropDone && this.lastDrag) this.dropPart(t, this.lastDrag); this.dragIn = false; this.dropDone = false; });
    this.svg.addEventListener('dragenter', e => { e.preventDefault(); this.dragIn = true; });
    this.svg.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; this.dragIn = true; if (this.dragT) { this.lastDrag = this.toDoc(e); this.ghost = null; this.dropPart(this.dragT, this.lastDrag, true); this.dirty = true; } });
    this.svg.addEventListener('dragleave', (e) => { this.ghost = null; this.dirty = true; if (!e.relatedTarget || !this.svg.contains(e.relatedTarget)) this.dragIn = false; });
    this.svg.addEventListener('drop', e => { e.preventDefault(); const t = e.dataTransfer.getData('text/plain'); this.ghost = null; this.dragT = null; this.dropDone = true; if (t.startsWith('brd:')) this.dropPart(t.slice(4), this.toDoc(e)); });
    this.svg.addEventListener('dblclick', e => this.dbl(e));
    r.querySelector('[data-a=speed]').onchange = e => this.speed = +e.target.value;
    r.querySelector('[data-a=dt]').onchange = e => { this.dt = +e.target.value; this.recompile(); };
    const sv = this.svg;
    sv.addEventListener('mousedown', e => this.md(e)); window.addEventListener('mousemove', e => this.mm(e)); window.addEventListener('mouseup', e => this.mu(e));
    sv.addEventListener('wheel', e => { e.preventDefault(); const p = this.toDoc(e), f = e.deltaY > 0 ? 1.1 : 0.9; this.view.x = p.x - (p.x - this.view.x) * f; this.view.y = p.y - (p.y - this.view.y) * f; this.view.k *= f; this.dirty = true; }, { passive: false });
    window.addEventListener('keydown', e => { if (!this.root.offsetParent || e.target.matches('input,select,textarea')) return; if (e.key === 'Escape') { this.setMsel(null); this.mq = null; this.cancelTool(); this.wf = null; this.dirty = true; UI.closePop(); } if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey && this.sel) { this.rotateSel(); e.preventDefault(); } if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) { if (this.copySel()) e.preventDefault(); } if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) { if (this.pasteClip()) e.preventDefault(); } if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) { if (this.copySel()) { this.removeSel(); e.preventDefault(); } } if ((e.key === 'Delete' || e.key === 'Backspace') && (this.sel || this.msel)) { this.removeSel(); e.preventDefault(); } });
  }
  buildPalette() {
    const el = this.root.querySelector('#bpal'), ics = Object.values(DSim.IC).filter(d => d.fam !== 'ID' || d.analog === '555');
    const btn = (k, t, d) => `<button class="pi" draggable="true" data-t="${k}" title="${esc(d || UI.HELP[k.split(':')[0] + '_b'] || UI.HELP[k.split(':')[0]] || t)}">${UI.boardThumb(k)}<span>${esc(t)}</span></button>`;
    el.innerHTML = `<details open><summary>Componentes</summary>${btn('R', 'Resistencia')}${btn('LED:red', 'LED rojo')}${btn('LED:green', 'LED verde')}${btn('LED:yellow', 'LED amarillo')}${btn('C', 'Condensador')}${btn('PUSH', 'Pulsador')}${btn('CLK', 'Generador de reloj')}${btn('DIPSW:4', 'Microinterruptor 4')}${btn('DIPSW:8', 'Microinterruptor 8')}${btn('DIPSW:10', 'Microinterruptor 10')}${btn('D7:0', 'Display 7 seg cátodo común')}${btn('D7:1', 'Display 7 seg ánodo común')}</details>
    <details open><summary>Cables</summary>${UI.WIRECOLORS.map(c => btn('WIRE:' + c[0], 'Cable ' + c[1])).join('')}</details>
    <details open><summary>Integrados</summary>${ics.map(d => btn('IC:' + d.id, d.name, d.desc)).join('')}</details>
    <details open><summary>Instrumentos</summary>${btn('DMM', 'Multímetro')}${btn('LP', 'Sonda lógica')}${btn('LA', 'Analizador lógico')}</details>
    <details open><summary>Alimentación y placas</summary>${btn('MB102', 'Fuente MB102 (3,3/5 V)')}${btn('MCU:UNO', 'Arduino UNO')}${btn('MCU:ESP32', 'ESP32-S3 DevKitC-1')}${btn('MCU:none', 'Quitar placa MCU')}</details>
    <details><summary>Sensores y actuadores</summary>${['Sensores', 'Actuadores'].map(g => `<div class="pgrp">${g}</div>` + SC().KINDS.filter(k => SC().CAT[k].group === g).map(k => `<button class="pi" draggable="true" data-t="SENS:${k}" title="${esc(SC().CAT[k].desc)}">${SC().thumb(k)}<span>${esc(SC().CAT[k].name)}</span></button>`).join('')).join('')}</details>`;
    el.addEventListener('click', e => { const b = e.target.closest('.pi'); if (!b) return; const t = b.dataset.t;
      if (t.startsWith('MCU:')) { const n = t.slice(4); this.board.mcu = n === 'none' ? null : { board: n, code: this.board.mcu && this.board.mcu.code }; this.sel = this.board.mcu ? 'mcu' : null; this.changed(); this.onChange && this.onChange('mcu'); return; }
      if (t === 'MB102') { this.board.mb.on = !this.board.mb.on; this.changed(); this.hint(this.board.mb.on ? 'Fuente MB102 conectada a los carriles.' : 'Fuente desconectada.'); return; }
      this.tool = t; this.pend = { pts: [] }; el.querySelectorAll('.pi').forEach(x => x.classList.toggle('on', x === b));
      const [ty] = t.split(':'); this.hint({ IC: 'Haz clic en el agujero de la pata 1 (abajo-izquierda); el integrado se monta a caballo del canal central.', R: 'Clic en un extremo y luego en el otro.', LED: 'Primer clic = ánodo (pata larga), segundo = cátodo.', C: 'Primer clic = (+), segundo = (−).', WIRE: 'Clic en el origen y luego en el destino (agujeros, carriles o pines de la placa).', LA: 'Haz clic en 8 agujeros (canal 1 a 8). Esc termina antes.', DMM: 'Primer clic = punta roja, segundo = punta negra.', DMMA: 'Primer clic = punta roja, segundo = negra. Pon el amperímetro EN SERIE.', LP: 'Clic en el agujero a medir.' }[ty] || 'Haz clic en el agujero donde va la pieza.'); });
  }
  fit() { const r = this.svg.getBoundingClientRect(), w = r.width; if (!w) return; this.view.k = Math.max(1, (B.hx(COLS) + 300) / w, (this.board.mcu ? 880 : 600) / r.height); this.view.x = -230; this.view.y = 0; this.fitted = true; this.dirty = true; }
  hint(t) { this.root.querySelector('#bhint').textContent = t; }
  rotateSel() {
    const it = this.board.items.find(i => i.id === this.sel); if (!it) return;
    if (!['R', 'LED', 'C'].includes(it.type)) { this.hint(it.type === 'IC' ? 'Los integrados no se giran: van siempre a caballo del canal central.' : 'Esta pieza no se puede girar (R gira resistencias, LED y condensadores).'); return; }
    const p = B.parseKey(it.a), q = B.parseKey(it.b); if (p.t !== 'h' || q.t !== 'h') return;
    let dc = q.col - p.col, dr = ROWS.indexOf(q.row) - ROWS.indexOf(p.row);
    for (let i = 0; i < 4; i++) { [dc, dr] = [-dr, dc]; const nb = this.shiftKey(it.a, dc, dr); if (nb && nb !== it.a) { it.b = nb; this.changed(); this.hint('Pieza girada 90° (R).'); return; } }
    this.hint('No hay sitio para girarla desde esa posición.');
  }
  cancelTool() { this.wf = null; this.tool = null; this.pend = null; this.root.querySelectorAll('#bpal .pi').forEach(x => x.classList.remove('on')); this.dirty = true; }
  action(a, el) {
    if (a === 'auto') { Timing.autoset(this); return; }
    if (a === 'run') { this.running = !this.running; el.textContent = this.running ? '❚❚ Pausar' : '▶ Simular'; }
    else if (a === 'reset') this.recompile();
    else if (a === 'clear') { if (confirm('¿Vaciar la protoboard?')) { const m = this.board.mcu, mb = this.board.mb; this.board = B.newBoard(); this.board.mcu = m; this.board.mb = mb; this.sel = null; this.changed(); } }
    else if (a === 'tfollow') this.timing.follow = true; else if (a === 'tcur') this.timing.toggleCursor(+el.dataset.cur);
    else if (a === 'tanalog') { this.timing.analog = !this.timing.analog; el.classList.toggle('on', this.timing.analog); }
    else if (a === 'png') this.onChange && this.onChange('capture', this.svgToImg());
    else if (a === 'logm') this.logMeasure();
    else if (a === 'fit') this.fit();
  }
  toDoc(e) { const r = this.svg.getBoundingClientRect(); return { x: this.view.x + (e.clientX - r.left) * this.view.k, y: this.view.y - 40 + (e.clientY - r.top) * this.view.k }; }
  geom() { // sockets y pines de instrumentos
    const ctx = { sockets: {}, ipins: {} };
    if (this.board.mcu) { const bd = B.BOARDS[this.board.mcu.board], mp = this.board.mcu.pos || { x: 0, y: 0 }, by = 420 + mp.y, X0 = 40 + mp.x, pt = bd.pitch || 26, ry = bd.ry || 24; let x = X0 + bd.xt, y = by + ry, row = 0; bd.pins.forEach(p => { if (p === 'row') { row = 1; x = X0 + bd.xb; y = by + bd.h - ry; return; } if (!p) { x += row ? bd.gb : bd.gt; return; } if (p[1] === 'n') { (ctx.dummies = ctx.dummies || []).push({ x, y, name: p[0] }); x += pt; return; } ctx.sockets['s:' + p[0]] = { x, y, name: p[0], kind: p[1] }; x += pt; }); ctx.mcuBox = { x: X0, y: by, w: bd.w, h: bd.h }; }
    return ctx;
  }
  /* ---- interacción ---- */
  /* ---- geometría para arrastrar ---- */
  nearestKey(d) {
    const ctx = this.geom(); let best = null, bd = 12;
    Object.entries(ctx.sockets).forEach(([k, q]) => { const dd = Math.hypot(q.x - d.x, q.y - d.y); if (dd < bd) { bd = dd; best = k; } });
    if (best) return best;
    for (const r of ['T+', 'T-', 'B-', 'B+']) if (Math.abs(d.y - RAILY[r]) < 9) { let bk = -1, bdd = 11; for (let k = 0; k < 50; k++) { const dd = Math.abs(d.x - railX(k)); if (dd < bdd) { bdd = dd; bk = k; } } if (bk >= 0) return `r:${r}:${bk}`; }
    for (const [r, y] of Object.entries(ROWY)) if (Math.abs(d.y - y) < 9) { const c = Math.round((d.x - X0) / P) + 1; if (c >= 1 && c <= COLS && Math.abs(d.x - B.hx(c)) < 10) return hole(c, r); }
    return null;
  }
  /* extremo de una pieza de dos patas: agujero, carril o, fuera de la placa, posición libre (sin conectar) */
  snapPx(d) {
    const k = this.nearestKey(d); if (k && B.parseKey(k).t !== 's') return k;
    if (d.x >= B.hx(1) - 14 && d.x <= B.hx(COLS) + 14 && d.y >= RAILY['T+'] - 14 && d.y <= RAILY['B+'] + 14) {
      for (const r of ['T+', 'T-', 'B-', 'B+']) if (Math.abs(d.y - RAILY[r]) <= 12) { let bk = 0, bdd = 1e9; for (let q = 0; q < 50; q++) { const dd = Math.abs(d.x - railX(q)); if (dd < bdd) { bdd = dd; bk = q; } } return `r:${r}:${bk}`; }
      return this.nearestHole(d); }
    return `f:${Math.round(d.x)}:${Math.round(d.y)}`; }
  nearestHole(d) {
    const c = Math.max(1, Math.min(COLS, Math.round((d.x - X0) / P) + 1)); let br = 'e', bd = 1e9;
    for (const [r, y] of Object.entries(ROWY)) { const dd = Math.abs(d.y - y); if (dd < bd) { bd = dd; br = r; } }
    return hole(c, br);
  }
  setMsel(ms, ends) { if (ms && ms.size === 0) ms = null; this.msel = ms; this.mends = ms ? (ends || {}) : null; }
  itemBox(it, ctx) {
    if (it.type === 'LA') return null; const pts = [];
    ['a', 'b', 'tip', 'red', 'black'].forEach(q => { if (it[q]) { const z = keyXY(it[q], ctx); if (z) pts.push(z); } }); (it.pts || []).forEach(q => pts.push(q));
    if (it.type === 'SENS') { const c = SC().CAT[it.kind], R = B.rowsOf(it), x = B.hx(it.col), y = ROWY[R.lo]; if (c) pts.push({ x: x + c.box.x, y: y + c.box.y }, { x: x + c.box.x + c.box.w, y: y + c.box.y + c.box.h }); }
    else if (it.col !== undefined) { const sp = this.colSpan(it); let R = null; try { R = B.rowsOf(it); } catch (er) { } const y0 = R ? ROWY[R.hi] : ROWY.f, y1 = R ? ROWY[R.lo] : ROWY.e; pts.push({ x: B.hx(it.col) - 6, y: y0 - 8 }, { x: B.hx(it.col + sp - 1) + 6, y: y1 + 8 }); }
    if (!pts.length) return null; if (it.off) pts.forEach(q => { q.x += it.off.x; q.y += it.off.y; }); const xs = pts.map(q => q.x), ys = pts.map(q => q.y); return { x0: Math.min(...xs) - 7, y0: Math.min(...ys) - 7, x1: Math.max(...xs) + 7, y1: Math.max(...ys) + 7 };
  }
  pickBox(q) {
    const x0 = Math.min(q.x0, q.x1), x1 = Math.max(q.x0, q.x1), y0 = Math.min(q.y0, q.y1), y1 = Math.max(q.y0, q.y1), ctx = this.geom(), ms = q.add || new Set(), ends = Object.assign({}, this.mends || {});
    const inside = (k) => { const z = k && keyXY(k, ctx); return !!z && z.x >= x0 && z.x <= x1 && z.y >= y0 && z.y <= y1; };
    this.board.items.forEach(it => { if (it.type === 'LA') return;
      if (it.type === 'WIRE') { const a = inside(it.a), b = inside(it.b); if (a || b) { ms.add(it.id); ends[it.id] = { a, b }; } return; }
      const bx = this.itemBox(it, ctx); if (bx && bx.x1 >= x0 && bx.x0 <= x1 && bx.y1 >= y0 && bx.y0 <= y1) ms.add(it.id); });
    if (ms.size === 1) { this.sel = [...ms][0]; this.setMsel(null); } else this.setMsel(ms, ends);
    this.hint(ms.size > 1 ? ms.size + ' elementos seleccionados: arrastra uno para moverlos o pulsa Supr para borrarlos.' : '');
  }
  shiftItem(o, dc, dr, ends, dx, dy) {
    const n = JSON.parse(JSON.stringify(o)); if (o.type === 'LA') return n;
    if (o.col !== undefined) { const c = o.col + dc; if (c < 1 || c > COLS - this.colSpan(o) + 1) return null; n.col = c; if (COLT.includes(o.type)) { const r = (o.r === undefined ? 5 : o.r) + dr; if (r < 1 || r > 9) return null; n.r = r; } return n; }
    const ks = o.type === 'DMM' ? ['red', 'black'] : o.type === 'LP' ? ['tip'] : ['a', 'b']; let bad = false;
    ks.forEach(k => { if (o.type === 'WIRE' && !ends[k]) return; if (B.parseKey(o[k]).t !== 'h') return; const nk = this.shiftKey(o[k], dc, dr); if (!nk) bad = true; else n[k] = nk; });
    if (bad) return null; if (o.type === 'WIRE' && o.pts) { if (ends.a && ends.b) n.pts = o.pts.map(p => ({ x: p.x + dx, y: p.y + dy })); else delete n.pts; }
    return n;
  }
  copySel() {
    const ids = this.msel && this.msel.size ? new Set(this.msel) : (this.sel && this.sel !== 'mcu' ? new Set([this.sel]) : null); if (!ids) return false;
    const items = this.board.items.filter(i => ids.has(i.id) && i.type !== 'LA').map(i => JSON.parse(JSON.stringify(i))); if (!items.length) return false;
    this.clip = { items, ends: Object.assign({}, this.mends || {}), n: 0 }; this.hint(items.length + (items.length === 1 ? ' elemento copiado.' : ' elementos copiados.') + ' Ctrl+V para pegar.'); return true;
  }
  pasteClip() {
    const c = this.clip; if (!c || !c.items.length) return false; c.n++;
    let c0 = 99, c1 = 0; const ext = (k) => { if (!k) return; const p = B.parseKey(k); if (p.t === 'h') { c0 = Math.min(c0, p.col); c1 = Math.max(c1, p.col); } };
    c.items.forEach(i => { if (i.col !== undefined) { c0 = Math.min(c0, i.col); c1 = Math.max(c1, i.col + this.colSpan(i) - 1); } ['a', 'b', 'tip', 'red', 'black'].forEach(q => ext(i[q])); });
    const w = Math.max(1, c1 - c0 + 1), cand = []; for (let k = c.n; k <= c.n + 6; k++) { cand.push((w + 1) * k, -(w + 1) * k); } for (let d = 1; d < COLS; d++) cand.push(d, -d);
    let res = null, dxx = 0;
    for (const dc of cand) { const out = []; let ok = true; for (const o of c.items) { const n = this.shiftItem(o, dc, 0, c.ends[o.id] || { a: 1, b: 1 }, B.hx(c0 + dc) - B.hx(c0), 0); if (!n) { ok = false; break; } out.push(n); } if (ok) { res = out; dxx = dc; break; } }
    if (!res) { this.hint('No cabe la copia en la placa.'); return true; }
    const b = this.board, ids = new Set(), ends = {}; res.forEach(n => { n.id = 'b' + b.nid++; b.items.push(n); ids.add(n.id); ends[n.id] = { a: 1, b: 1 }; });
    this.sel = null; this.setMsel(ids.size > 1 ? ids : null, ends); if (ids.size === 1) this.sel = [...ids][0];
    this.hint(ids.size + (ids.size === 1 ? ' elemento pegado' : ' elementos pegados') + ' y seleccionados: arrástralos a su sitio (cuidado: si caen sobre agujeros ocupados se unen).'); this.changed(); return true;
  }
  shiftKey(k, dc, dr) { const p = B.parseKey(k); if (p.t !== 'h') return null; const c = p.col + dc, ri = ROWS.indexOf(p.row) + dr; if (c < 1 || c > COLS || ri < 0 || ri >= ROWS.length) return null; return hole(c, ROWS[ri]); }
  colSpan(it) { if (it.type === 'SENS') return SC().colSpan(it.kind); return it.type === 'IC' ? DSim.IC[it.ic].n / 2 : (it.type === 'PUSH' || it.type === 'CLK') ? (it.type === 'CLK' ? 3 : 2) : it.type === 'DIPSW' ? (it.n || 8) : it.type === 'D7' ? 5 : 1; }
  dropPart(t, d, preview) {
    const [ty, arg] = t.split(':'), b = this.board, add = (o) => { if (preview) { o.id = 'ghost'; this.ghost = o; return o; } if (o.type !== 'WIRE') { const same = (x) => b.items.some(q => q !== o && q.type === x.type && (x.col !== undefined ? q.col === x.col && (q.r === undefined ? 5 : q.r) === (x.r === undefined ? 5 : x.r) : q.a === x.a || (x.tip && q.tip === x.tip))); let n = 0; while (same(o) && n++ < 40) { if (o.col !== undefined) o.col = Math.min(COLS - this.colSpan(o) + 1, o.col + this.colSpan(o) + 1); else if (o.a && o.b) { const na = this.shiftKey(o.a, 1, 0), nb = this.shiftKey(o.b, 1, 0); if (!na || !nb) break; o.a = na; o.b = nb; } else break; } }
      o.id = 'b' + b.nid++; b.items.push(o); this.sel = o.id; return o; };
    if (preview && (ty === 'MCU' || ty === 'MB102')) return;
    if (ty === 'MCU') { this.board.mcu = arg === 'none' ? null : { board: arg, code: this.board.mcu && this.board.mcu.code }; this.sel = this.board.mcu ? 'mcu' : null; this.changed(); this.onChange && this.onChange('mcu'); return; }
    if (ty === 'MB102') { this.board.mb.on = true; this.changed(); return; }
    const k = this.nearestKey(d) || this.nearestHole(d), p = B.parseKey(k), hh = this.nearestHole(d), hp = B.parseKey(hh);
    const c0 = hp.col, row = hp.row, cl = (c) => Math.max(1, Math.min(COLS, c));
    const span = (n) => { const c1 = c0 + n <= COLS ? c0 + n : c0 - n; return hole(c1, row); };
    if (ty === 'IC') { const dd = DSim.IC[arg]; add({ type: 'IC', ic: arg, r: rOfRow(row), col: Math.min(c0, COLS - dd.n / 2 + 1), label: 'U' + (b.items.filter(i => i.type === 'IC').length + 1) }); }
    else if (ty === 'SENS') { const d0 = SC().defaults(arg); add({ type: 'SENS', kind: arg, r: 5, col: Math.min(c0, COLS - SC().colSpan(arg) + 1), stim: d0.stim, o: d0.o }); }
    else if (ty === 'PUSH') add({ type: 'PUSH', r: rOfRow(row), col: Math.min(c0, COLS - 2) });
    else if (ty === 'CLK') add({ type: 'CLK', r: rOfRow(row), col: Math.min(c0, COLS - 2), hz: '1', duty: 50 });
    else if (ty === 'DIPSW') { const n = +arg || 8; add({ type: 'DIPSW', n, r: rOfRow(row), col: Math.min(c0, COLS - n + 1), st: new Array(n).fill(0) }); }
    else if (ty === 'D7') add({ type: 'D7', r: rOfRow(row), col: Math.min(c0, COLS - 4), ca: arg === '1' ? 1 : 0 });
    else if (ty === 'R') add({ type: 'R', a: hh, b: span(4), v: '330' });
    else if (ty === 'LED') add({ type: 'LED', a: hh, b: span(2), color: arg });
    else if (ty === 'C') add({ type: 'C', a: hh, b: span(3), v: '100u' });
    else if (ty === 'WIRE') { const a = p.t === 'h' ? k : k; const bk = p.t === 'h' ? span(3) : hole(cl(Math.round((d.x - X0) / P) + 1), k.startsWith('r:T') ? 'j' : 'a'); add({ type: 'WIRE', a, b: bk, color: arg }); }
    else if (ty === 'DMM' || ty === 'DMMA') add({ type: 'DMM', red: hh, black: span(3), mode: ty === 'DMMA' ? 'A' : 'V' });
    else if (ty === 'LP') add({ type: 'LP', tip: k });
    else if (ty === 'LA') { add({ type: 'LA', ch: [], gnd: null }); }
    if (!preview) this.changed();
  }
  autoColor(a, c) { const hi = (k) => /^r:(T|B)\+/.test(k) || /:(5V|3V3|VIN)$/.test(k), lo = (k) => /^r:(T|B)-/.test(k) || /:GND2?$/.test(k); return hi(a) || hi(c) ? '#B85D34' : lo(a) || lo(c) ? '#1F2421' : '#4C6A8C'; }
  dbl(e) {
    const t = document.elementsFromPoint(e.clientX, e.clientY).find(x => this.svg.contains(x) && x.closest('[data-id],[data-mbbox],[data-mcubox]')) || e.target, g = t.closest && t.closest('[data-id]'); const cv = this.root.querySelector('.cv');
    if (t.closest && t.closest('[data-mbbox]')) { const m = this.board.mb, opts = [{ v: '0', t: '0 V' }, { v: '3.3', t: '3,3 V' }, { v: '5', t: '5 V' }];
      UI.pop(cv, e.clientX, e.clientY, 'Fuente MB102', [{ k: 'on', label: 'Conectada (interruptor)', type: 'check', value: m.on }, { k: 'top', label: 'Carril superior', type: 'sel', opts, value: String(m.top) }, { k: 'bot', label: 'Carril inferior', type: 'sel', opts, value: String(m.bot) }],
        (k, v) => { m[k] = k === 'on' ? v : +v; this.changed(); }); return; }
    if (t.closest && t.closest('[data-mcubox]')) { this.sel = 'mcu'; this.showProps(); return; }
    if (!g) return; const it = this.board.items.find(i => i.id === g.dataset.id); if (!it) return; this.sel = it.id; this.dirty = true;
    const F = [], nm = it.type === 'IC' ? DSim.IC[it.ic].name : B.PARTS[it.type].name; let before = '';
    if (it.type === 'R') F.push({ k: 'v', label: 'Resistencia (Ω). Ej.: 330, 4.7k, 1M', type: 'text', value: it.v, list: UI.E12 });
    if (it.type === 'C') F.push({ k: 'v', label: 'Capacidad (F). Ej.: 100n, 47u', type: 'text', value: it.v, list: UI.CAPS });
    if (it.type === 'LED') F.push({ k: 'color', label: 'Color', type: 'sel', opts: ['red', 'green', 'yellow', 'blue'], value: it.color });
    if (it.type === 'WIRE') F.push({ k: 'color', label: 'Color del cable', type: 'colors', opts: UI.WIRECOLORS.map(c => ({ v: c[0], t: c[1] })), value: it.color });
    if (it.type === 'IC') { F.push({ k: 'label', label: 'Referencia', type: 'text', value: it.label }); before = `<p class="mut">${esc(DSim.IC[it.ic].desc)}</p>` + dsLinkHTML(it.ic); }
    if (it.type === 'DMM') F.push({ k: 'mode', label: 'Modo', type: 'sel', opts: [{ v: 'V', t: 'Voltios (DC)' }, { v: 'A', t: 'Amperios (en serie)' }, { v: 'R', t: 'Ohmios (sin alimentar)' }], value: it.mode });
    if (it.type === 'D7') F.push({ k: 'ca', label: 'Tipo', type: 'sel', opts: [{ v: '0', t: 'Cátodo común' }, { v: '1', t: 'Ánodo común (5161)' }], value: String(it.ca) });
    if (it.type === 'LP') before = '<p class="mut">Rojo: nivel alto (≥ 2 V). Verde: nivel bajo (≤ 0,8 V). Azul: alta impedancia (nada fija el nodo) o nivel indefinido.</p>';
    UI.pop(cv, e.clientX, e.clientY, nm, F, (k, v) => { it[k] = (k === 'ca') ? +v : v; this.changed(); }, { before, del: true, onDel: () => { this.sel = it.id; this.removeSel(); } });
  }
  md(e) {
    const p = this.toDoc(e), t = e.target; let hk = t.closest && t.closest('[data-k]');
    if (!hk && t.closest && t.closest('[data-id]')) { const it0 = this.board.items.find(i => i.id === t.closest('[data-id]').dataset.id); if (it0 && it0.type === 'WIRE') { const under = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.dataset && x.dataset.k); if (under) hk = under; } }
    UI.closePop();
    if (e.altKey || e.button === 1) { e.preventDefault(); this.pan = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, alt: true, moved: false }; return; }
    if (this.wf) { if (e.button !== 0) { this.wf = null; this.dirty = true; return; } const wf = this.wf;
      if (hk) { const k2 = hk.dataset.k; if (k2 === wf.from && !wf.pts.length) { this.wf = null; this.hint('Cable cancelado.'); this.dirty = true; return; }
        const b = this.board, w = { id: 'b' + b.nid++, type: 'WIRE', a: wf.from, b: k2, color: wf.color || this.autoColor(wf.from, k2) }; if (wf.pts.length) w.pts = wf.pts.slice(); b.items.push(w); this.sel = w.id; this.wf = null; this.hint(''); this.changed(); return; }
      wf.pts.push(nudge(p)); this.hint('Codo añadido. Sigue picando para más codos y termina en un agujero (Esc cancela).'); this.dirty = true; return; }
    const mcb = t.closest && t.closest('[data-mcubox]'); if (mcb && !hk && !this.tool && e.button === 0) { this.sel = 'mcu'; const mp = this.board.mcu.pos || { x: 0, y: 0 }; this.dr = { id: null, kind: 'mcu', ox: p.x - mp.x, oy: p.y - mp.y, moved: false, sx: e.clientX, sy: e.clientY }; this.hint('Placa seleccionada: arrástrala para moverla · Supr la elimina · doble clic abre su programa.'); this.showProps(); this.dirty = true; return; }
    const mj = t.closest && t.closest('[data-mbj]'); if (mj) { const m = this.board.mb, k = mj.dataset.mbj, seq = [5, 3.3, 0], i = seq.indexOf(m[k]); m[k] = seq[(i + 1) % 3]; this.changed(); return; }
    const lc = t.closest && t.closest('[data-lach]'); if (lc) { this.dr = { id: lc.dataset.item, kind: 'lach', idx: lc.dataset.lach, moved: false, sx: e.clientX, sy: e.clientY }; this.sel = lc.dataset.item; this.dirty = true; return; }
    const bb = t.closest && t.closest('[data-bbody]'); if (bb && !t.closest('[data-dmode],[data-lach]') && !this.tool) { const it = this.board.items.find(i => i.id === bb.dataset.bbody); const o = it.bpos || { x: +bb.dataset.bx, y: +bb.dataset.by }; this.sel = it.id; this.showProps(); this.dr = { id: it.id, kind: 'bbody', ox: p.x - o.x, oy: p.y - o.y, moved: false, sx: e.clientX, sy: e.clientY }; this.dirty = true; return; }
    const dm = t.closest && t.closest('[data-dmode]'); if (dm) { const it = this.board.items.find(i => i.id === dm.dataset.item); it.mode = dm.dataset.dmode; this.sel = it.id; this.changed(); return; }
    const msw = t.closest && t.closest('[data-mbsw]'); if (msw) { this.board.mb.on = !this.board.mb.on; this.changed(); return; }
    if (this.tool && hk) { this.place(hk.dataset.k); return; }
    if (this.tool) return;
    const wpm = t.closest && t.closest('[data-wpmid]'); if (wpm) { const it = this.board.items.find(i => i.id === wpm.dataset.item); it.pts = it.pts || []; const i0 = +wpm.dataset.wpmid; it.pts.splice(i0, 0, nudge(p)); this.dr = { id: it.id, kind: 'wp', idx: i0, moved: true, sx: e.clientX, sy: e.clientY }; this.sel = it.id; this.dirty = true; return; }
    const wph = t.closest && t.closest('[data-wp]'); if (wph) { const it = this.board.items.find(i => i.id === wph.dataset.item); this.dr = { id: it.id, kind: 'wp', idx: +wph.dataset.wp, moved: false, sx: e.clientX, sy: e.clientY }; return; }
    { const g0 = t.closest && t.closest('[data-id]'), w0 = g0 && this.board.items.find(i => i.id === g0.dataset.id); if (w0 && w0.type === 'WIRE' && this.sel === w0.id && !(hk && !(t.closest('[data-k]')))) { const a = keyXY(w0.a, this.ctx), c = keyXY(w0.b, this.ctx); if (a && c) { const pts = w0.pts = w0.pts || [], seq = [a].concat(pts, [c]); let bi = 0, bd = 1e9; for (let i = 0; i < seq.length - 1; i++) { const A = seq[i], Bq = seq[i + 1], dx = Bq.x - A.x, dy = Bq.y - A.y, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((p.x - A.x) * dx + (p.y - A.y) * dy) / L2)), d = Math.hypot(A.x + u * dx - p.x, A.y + u * dy - p.y); if (d < bd) { bd = d; bi = i; } } pts.splice(bi, 0, nudge(p)); this.dr = { id: w0.id, kind: 'wp', idx: bi, moved: true, sx: e.clientX, sy: e.clientY }; this.dirty = true; return; } } }
    const en = t.closest && t.closest('[data-end]'); if (en) { const it = this.board.items.find(i => i.id === en.dataset.item); this.dr = { id: it.id, kind: 'end', end: en.dataset.end, moved: false, sx: e.clientX, sy: e.clientY }; return; }
    const pb = t.closest && t.closest('[data-push]'); if (pb) { const it = this.board.items.find(i => i.id === pb.dataset.push); this.pressed = it; if (this.sim.parts[this.refs[it.id]]) this.sim.parts[this.refs[it.id]].closed = true; this.sel = it.id; this.showProps(); this.dirty = true; return; }
    const ds = t.closest && t.closest('[data-dip]'); if (ds) { const [id, i] = ds.dataset.dip.split(':'); const it = this.board.items.find(x => x.id === id); it.st[+i] ^= 1; if (this.refs[id] && this.sim.parts[this.refs[id][+i]]) this.sim.parts[this.refs[id][+i]].closed = !!it.st[+i]; this.sel = id; this.dirty = true; return; }
    if (e.altKey) { const ids = [...new Set(document.elementsFromPoint(e.clientX, e.clientY).map(x => x.closest && x.closest('[data-id]')).filter(Boolean).map(x => x.dataset.id))]; if (ids.length) { const i = ids.indexOf(this.sel); this.sel = ids[(i + 1) % ids.length]; this.showProps(); this.dirty = true; return; } }
    const pg = !(hk && !(t.closest && t.closest('[data-k]')) ) && t.closest && t.closest('[data-id]'); if (pg) { const it = this.board.items.find(i => i.id === pg.dataset.id);
      if (e.shiftKey && it.type !== 'LA') { const ms = this.msel || new Set(this.sel && this.sel !== 'mcu' ? [this.sel] : []); ms.has(it.id) ? ms.delete(it.id) : ms.add(it.id); this.sel = null; this.setMsel(ms, this.mends); this.showProps(); this.dirty = true; return; }
      if (this.msel && this.msel.has(it.id)) { this.dr = { id: it.id, kind: 'gmove', moved: false, sx: e.clientX, sy: e.clientY, grab: this.nearestHole(p), origs: Object.fromEntries([...this.msel].map(i => [i, JSON.parse(JSON.stringify(this.board.items.find(x => x.id === i)))])) }; this.showProps(); this.dirty = true; return; }
      this.msel = null; this.mends = null; this.sel = it.id; this.showProps(); this.dirty = true;
      this.dr = { id: it.id, kind: 'move', moved: false, sx: e.clientX, sy: e.clientY, gp: { x: p.x, y: p.y }, grab: this.nearestHole(p), orig: JSON.parse(JSON.stringify(it)) }; return; }
    if (hk && e.button === 0 && !e.shiftKey) { this.wc = { from: hk.dataset.k, moved: false, sx: e.clientX, sy: e.clientY }; this.pend = { pts: [hk.dataset.k] }; this.mouse = p; this.sel = null; this.showProps(); this.dirty = true; return; }
    if (!e.shiftKey) { this.sel = null; this.setMsel(null); } this.mq = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, sx: e.clientX, sy: e.clientY, add: e.shiftKey && this.msel ? new Set(this.msel) : null }; this.showProps(); this.dirty = true;
  }
  mm(e) {
    if (this.mq) { const q = this.mq, m0 = this.toDoc(e); q.x1 = m0.x; q.y1 = m0.y; this.dirty = true; }
    if (this.pan) { if (Math.abs(e.clientX - this.pan.x) + Math.abs(e.clientY - this.pan.y) > 4) this.pan.moved = true; this.view.x = this.pan.vx - (e.clientX - this.pan.x) * this.view.k; this.view.y = this.pan.vy - (e.clientY - this.pan.y) * this.view.k; this.dirty = true; }
    const t = e.target, hk = t.closest && t.closest && t.closest('[data-k]'); const k = hk ? hk.dataset.k : null;
    if (k !== this.hover) { this.hover = k; this.dirty = true; }
    const tip = this.root.querySelector('#btip');
    if (k && this.nl && !this.dr) { const n = this.nl.index(B.netOf(k)); const r = this.root.querySelector('.cv').getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
      tip.textContent = (n == null ? 'Sin conexión (nodo flotante)' : `Nodo ${n === 0 ? 'GND' : n}: ${this.sim.v[n].toFixed(2).replace('.', ',')} V`) + ' · ' + this.keyLabel(k); } else tip.style.display = 'none';
    this.mouse = this.toDoc(e);
    if (this.wc && Math.abs(e.clientX - this.wc.sx) + Math.abs(e.clientY - this.wc.sy) > 5) this.wc.moved = true;
    const d = this.dr;
    if (d) {
      if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true;
      if (d.moved && d.kind === 'gmove') { const m = this.mouse, cur = this.nearestHole(m), g = B.parseKey(d.grab), c = B.parseKey(cur), dc = c.col - g.col, dr = ROWS.indexOf(c.row) - ROWS.indexOf(g.row), dx = B.hx(c.col) - B.hx(g.col), dy = ROWY[c.row] - ROWY[g.row], nw = {};
        let ok = true; for (const id in d.origs) { const n = this.shiftItem(d.origs[id], dc, dr, (this.mends || {})[id] || { a: 1, b: 1 }, dx, dy); if (!n) { ok = false; break; } nw[id] = n; }
        if (ok) this.board.items = this.board.items.map(i => nw[i.id] || i); this.dirty = true; }
      else if (d.moved) { const it = this.board.items.find(i => i.id === d.id), m = this.mouse;
        if (d.kind === 'mcu') { this.board.mcu.pos = { x: Math.round(m.x - d.ox), y: Math.round(m.y - d.oy) }; this.dirty = true; }
        else if (d.kind === 'bbody') { it.bpos = { x: Math.round(m.x - d.ox), y: Math.round(m.y - d.oy) }; }
        else if (d.kind === 'lach') { const k2 = this.nearestKey(m); if (d.idx === 'g') it.gnd = k2 || null; else it.ch[+d.idx] = k2 || null; }
        else if (d.kind === 'wp') { it.pts[d.idx] = nudge(m); }
        else if (d.kind === 'end' && ['R', 'LED', 'C'].includes(it.type)) { it[d.end] = this.snapPx(m); }
        else if (d.kind === 'end') { const k2 = this.nearestKey(m); if (k2 && (it.type === 'WIRE' || it.type === 'DMM' || it.type === 'LP' || B.parseKey(k2).t !== 's')) it[d.end] = k2; }
        else { const cur = this.nearestHole(m), g = B.parseKey(d.grab), c = B.parseKey(cur), dc = c.col - g.col, dr = ROWS.indexOf(c.row) - ROWS.indexOf(g.row), o = d.orig;
          if (o.col !== undefined && d.gp && !(m.x >= B.hx(1) - 20 && m.x <= B.hx(COLS) + 20 && m.y >= RAILY['T+'] - 20 && m.y <= RAILY['B+'] + 20)) { it.col = o.col; if (o.r !== undefined) it.r = o.r; it.off = { x: Math.round((o.off ? o.off.x : 0) + m.x - d.gp.x), y: Math.round((o.off ? o.off.y : 0) + m.y - d.gp.y) }; }
          else if (o.col !== undefined) { let dcc = dc, drr = dr; if (o.off) { dcc = Math.round((B.hx(o.col) + o.off.x + (m.x - d.gp.x) - X0) / P) + 1 - o.col; drr = 0; } delete it.off; it.col = Math.max(1, Math.min(COLS - this.colSpan(o) + 1, o.col + dcc));
            if (COLT.includes(o.type)) it.r = Math.max(1, Math.min(9, (o.r === undefined ? 5 : o.r) + drr)); }
          else if (false) { it.col = Math.max(1, Math.min(COLS - this.colSpan(o) + 1, o.col + dc)); if (COLT.includes(o.type)) it.r = Math.max(1, Math.min(9, (o.r === undefined ? 5 : o.r) + dr)); }
          else if (o.type === 'LP') { const k2 = this.nearestKey(m); if (k2) it.tip = k2; }
          else if (o.type === 'LA') { /* el analizador es fijo; se mueven sus clips con los tiradores */ }
          else if (['R', 'LED', 'C'].includes(o.type) && d.gp) { const dxp = m.x - d.gp.x, dyp = m.y - d.gp.y, ks = ['a', 'b'].map(q => { const z = keyXY(o[q], this.ctx || this.geom()); return z ? this.snapPx({ x: z.x + dxp, y: z.y + dyp }) : o[q]; });
            if (ks.every(k => B.parseKey(k).t === 'h') && ['a', 'b'].every(q => B.parseKey(o[q]).t === 'h')) { const nk = ['a', 'b'].map(q => this.shiftKey(o[q], dc, dr)); if (nk.every(Boolean)) { it.a = nk[0]; it.b = nk[1]; } else { it.a = ks[0]; it.b = ks[1]; } } else { it.a = ks[0]; it.b = ks[1]; } }
          else { const ends = o.type === 'DMM' ? ['red', 'black'] : o.type === 'LP' ? ['tip'] : ['a', 'b']; const nk = ends.map(q => this.shiftKey(o[q], dc, dr)); if (nk.every(Boolean)) ends.forEach((q, i) => it[q] = nk[i]); } }
        this.dirty = true; }
    }
    if (this.pend && this.pend.pts.length || this.wf) this.dirty = true;
  }
  mu(e) {
    if (this.pan && this.pan.alt && !this.pan.moved) { const ids = [...new Set(document.elementsFromPoint(e.clientX, e.clientY).map(x => x.closest && x.closest('[data-id]')).filter(Boolean).map(x => x.dataset.id))]; if (ids.length) { const i = ids.indexOf(this.sel); this.sel = ids[(i + 1) % ids.length]; this.setMsel(null); this.showProps(); this.dirty = true; } }
    this.pan = null;
    if (this.mq) { const q = this.mq; this.mq = null;
      if (Math.abs(e.clientX - q.sx) + Math.abs(e.clientY - q.sy) > 5) this.pickBox(q);
      this.showProps(); this.dirty = true; }
    if (this.dr) { const d = this.dr; this.dr = null; if (d.moved) { this.changed(); } }
    if (this.wc) { const w = this.wc; this.wc = null; this.pend = null; if (!w.moved) { this.wf = { from: w.from, pts: [] }; this.hint('Cable: pica en zonas libres para crear codos y termina en un agujero. Esc cancela.'); } else if (!this.nearestKey(this.toDoc(e))) { this.wf = { from: w.from, pts: [nudge(this.toDoc(e))] }; this.hint('Codo añadido. Sigue picando y termina en un agujero. Esc cancela.'); } if (w.moved) { const k2 = this.nearestKey(this.toDoc(e)); if (k2 && k2 !== w.from) { const b = this.board; b.items.push({ id: 'b' + b.nid++, type: 'WIRE', a: w.from, b: k2, color: this.autoColor(w.from, k2) }); this.sel = 'b' + (b.nid - 1); this.changed(); } } this.dirty = true; }
    if (this.pressed) { const it = this.pressed; this.pressed = null; const ix = this.refs[it.id]; if (this.sim.parts[ix]) this.sim.parts[ix].closed = false; this.dirty = true; }
  }
  keyLabel(k) { const p = B.parseKey(k); if (p.t === 'h') return `columna ${p.col}, fila ${p.row.toUpperCase()}`; if (p.t === 'r') return `carril ${p.rail.replace('-', '−')}`; if (p.t === 's') return p.name; if (p.t === 'f') return 'fuera de la placa (sin conectar)'; return k; }
  place(k) {
    const [ty, arg] = this.tool.split(':'), pd = this.pend, p = B.parseKey(k), b = this.board;
    const add = (o) => { o.id = 'b' + b.nid++; b.items.push(o); this.sel = o.id; return o; };
    if (ty === 'IC') { if (p.t !== 'h') return this.hint('El integrado debe ir en la zona central de la protoboard.'); const d = DSim.IC[arg]; if (p.col + d.n / 2 - 1 > COLS) return this.hint('No cabe: se sale de la placa.');
      const n = b.items.filter(i => i.type === 'IC').length + 1; add({ type: 'IC', ic: arg, r: rOfRow(p.row), col: p.col, label: 'U' + n }); this.finish(); return; }
    if (ty === 'SENS') { if (p.t !== 'h') return; const sp = SC().colSpan(arg); if (p.col + sp - 1 > COLS) return this.hint('No cabe en esa posición.'); const d0 = SC().defaults(arg); add({ type: 'SENS', kind: arg, r: 5, col: p.col, stim: d0.stim, o: d0.o }); this.finish(); return; }
    if (ty === 'PUSH' || ty === 'DIPSW' || ty === 'D7' || ty === 'CLK') { if (p.t !== 'h') return; const w = ty === 'CLK' ? 2 : ty === 'PUSH' ? 2 : ty === 'DIPSW' ? (+arg || 8) - 1 : 4; if (p.col + w > COLS) return this.hint('No cabe en esa posición.'); add(ty === 'CLK' ? { type: 'CLK', r: rOfRow(p.row), col: p.col, hz: '1', duty: 50 } : ty === 'DIPSW' ? { type: ty, n: +arg || 8, r: rOfRow(p.row), col: p.col, st: new Array(+arg || 8).fill(0) } : { type: ty, r: rOfRow(p.row), col: p.col, ca: arg === '1' ? 1 : 0 }); this.finish(); return; }
    if (ty === 'LP') { add({ type: 'LP', tip: k }); this.finish(); return; }
    if (ty === 'LA') { if (!this.laItem) { this.laItem = add({ type: 'LA', ch: [] }); } this.laItem.ch.push(k); if (this.laItem.ch.length >= 8) { this.laItem = null; this.finish(); } else { this.hint(`Canal ${this.laItem.ch.length + 1}: haz clic en el agujero (Esc para terminar).`); this.recompile(false); } this.dirty = true; return; }
    if (ty === 'WIRE') { this.wf = { from: k, pts: [], color: arg }; this.hint('Cable: pica en zonas libres para crear codos y termina en un agujero. Esc cancela.'); this.dirty = true; return; }
    pd.pts.push(k);
    if (pd.pts.length < 2) { this.hint('Ahora el segundo extremo.'); this.dirty = true; return; }
    const [a, c] = pd.pts;
    if (ty === 'R') add({ type: 'R', a, b: c, v: '330' }); else if (ty === 'LED') add({ type: 'LED', a, b: c, color: arg }); else if (ty === 'C') add({ type: 'C', a, b: c, v: '100u' });
    else if (ty === 'WIRE') add({ type: 'WIRE', a, b: c, color: arg }); else if (ty === 'DMM' || ty === 'DMMA') add({ type: 'DMM', red: a, black: c, mode: ty === 'DMMA' ? 'A' : 'V' });
    this.finish();
  }
  finish() { this.laItem = null; const keep = this.tool; this.pend = { pts: [] }; if (!['IC', 'PUSH', 'CLK', 'DIPSW', 'D7', 'SENS', 'LP', 'LA', 'DMM', 'DMMA'].includes(keep.split(':')[0])) { /* seguir colocando el mismo tipo */ } else if (!this.multi) { this.cancelTool(); } this.changed(); }
  removeSel() { if (this.msel && this.msel.size) { const ids = this.msel; this.board.items = this.board.items.filter(i => !ids.has(i.id)); this.setMsel(null); this.sel = null; this.changed(); return; }
    if (this.sel === 'mcu') { this.board.mcu = null; this.sel = null; this.changed(); this.onChange && this.onChange('mcu'); return; } this.board.items = this.board.items.filter(i => i.id !== this.sel); this.sel = null; this.changed(); }
  changed() { this.recompile(); this.showProps(); this.onChange && this.onChange('board'); }
  itemsOf(type) { return this.board.items.filter(i => i.type === type); }
  /* ---- simulación ---- */
  recompile(resetPending = true) {
    const keepMcu = this.mcuCtl;
    const c = B.compile(this.board); this.cmp = c; this.nl = c.nl; this.refs = c.refs;
    this.sim = new DSim.Sim(c.nl, { dt: this.dt, recEvery: Math.max(1, Math.round(2e-5 / this.dt)) });
    this.alerted = new Set(); this.fire = {}; this.lastAlerts = 0;
    if (this.board.mcu) { const mp = this.sim.parts.find(p => p.type === 'MCU'); if (mp) { this.mcuPart = mp; this.onChange && this.onChange('mcu-build', mp); } }
    const ch = [];
    this.itemsOf('LA').forEach(la => la.ch.forEach((k, i) => { if (!k) return; const n = c.nl.index(B.netOf(k)); if (n != null) ch.push({ name: 'CH' + (i + 1) + ' · ' + this.keyLabel(k), w: this.sim.addWatch(n), color: i % 2 ? '#B85D34' : '#1F2421' }); }));
    this.timing.setChannels(ch); this.timing.follow = true; this.timing.th = [0.6, 1.2];
    const W = c.nl.warnings.map(w => w.msg); this.warns = W;
    this.root.querySelector('#bwarns').innerHTML = this.warnHTML();
    this.dirty = true;
  }
  warnHTML() { const A = (this.sim ? this.sim.alerts : []).map(a => a.msg), W = [...this.warns, ...A, ...(this.extraAlerts || [])]; return W.length ? '<div class="ph">Avisos del banco</div>' + W.map(w => `<p class="warn">${esc(w)}</p>`).join('') : '<p class="mut">Sin avisos.</p>'; }
  checks() {
    const sim = this.sim; this.extraAlerts = this.extraAlerts || [];
    this.board.items.forEach(it => {
      const ix = this.refs[it.id], sp = typeof ix === 'number' ? sim.parts[ix] : null; if (!sp) return;
      if (!this.fire[it.id]) { const m = sim.overload(sp); if (m) { const nm = it.type === 'IC' ? DSim.IC[it.ic].name + ' ' + (it.label || '') : it.type === 'R' ? 'Resistencia ' + it.v + 'Ω' : it.type === 'LED' ? 'LED' : it.type === 'D7' ? 'Display' : it.type; this.fire[it.id] = nm.trim() + ': ' + m; this.alerted.add(it.id); this.extraAlerts.push('Sobrecarga en ' + nm.trim() + ': ' + m); this.dirty = true; } }
      if (it.type === 'C' && Schem.parseVal(it.v) >= 1e-6 && !this.alerted.has(it.id)) { const v = sim.v[sp.pins[0]] - sim.v[sp.pins[1]]; if (v < -1) { this.alerted.add(it.id); const m = `condensador electrolítico ${it.v}F con la polaridad invertida (${v.toFixed(1).replace('.', ',')} V): puede reventar. La pata + (franja clara = −) va al lado de más tensión.`; this.fire[it.id] = 'Condensador ' + it.v + 'F: ' + m; this.extraAlerts.push('Sobrecarga en ' + m); this.dirty = true; } }
    });
    sim.parts.forEach(p => { if (p.type === 'V' && !this.alerted.has('V' + p.idx)) { const v = sim.v[p.pins[0]]; if (v < p.v * 0.5) { this.alerted.add('V' + p.idx); this.fire.mb = `la alimentación de ${p.v} V cae a ${v.toFixed(2).replace('.', ',')} V: cortocircuito entre +V y GND.`; this.dirty = true; this.extraAlerts.push(`Posible cortocircuito: la alimentación de ${p.v} V cae a ${v.toFixed(2)} V.`); } } });
    if (this.mcuPart && this.mcuPart.ctl && this.mcuPart.ctl.checkPins) { const m = this.mcuPart.ctl.checkPins(sim); m && m.forEach(x => { if (!this.alerted.has(x)) { this.alerted.add(x); this.fire.mcu = x; this.dirty = true; this.extraAlerts.push(x); } }); }
    const n = sim.alerts.length + this.extraAlerts.length; if (n !== this.lastAlerts) { this.lastAlerts = n; this.root.querySelector('#bwarns').innerHTML = this.warnHTML(); this.onChange && this.onChange('alert'); }
  }
  loop(ts) {
    requestAnimationFrame(this.loop);
    const vis = !!this.root.offsetParent;
    const last = this.lastTs || ts; this.lastTs = ts;
    if (this.running) {
      const want = Math.min(0.05, (ts - last) / 1000) * this.speed, t0 = performance.now(); this.acc = (this.acc || 0) + want / this.dt; const n = Math.floor(this.acc); this.acc -= n;
      for (let i = 0; i < n; i++) { this.sim.step(); if ((i & 63) === 0 && performance.now() - t0 > 14) break; }
      this.checks(); this.dirty = true;
    }
    this.snd(vis);
    if (this.dirty && vis) { this.dirty = false; this.render(); this.timing.draw(); this.root.querySelector('#btstat').textContent = 't = ' + Timing.fmtT(this.sim.t); this.updateProps(); this.updateLAmeas(); }
  }
  snd(vis) { const on = vis && this.running && this.sound !== false, L = []; if (on) for (const it of this.board.items) { if (it.type !== 'SENS' || (it.kind !== 'BUZZ' && it.kind !== 'BUZZP') || (it.o && it.o.snd === 'no')) continue; const ix = this.refs[it.id], sp = typeof ix === 'number' ? this.sim.parts[ix] : null; if (sp && sp.st.f > 20) L.push({ id: it.id, f: sp.st.f }); }
    const k = L.map(x => x.id + ':' + x.f).join(); if (k === this._sk) return; this._sk = k; SC().sound(L); }
  updateLAmeas() { const el = this.root.querySelector('#laMeas'); if (!this.timing.ch.length) return; const m = this.timing.ch.map((c, i) => { const r = this.timing.measure(i); return r ? `CH${i + 1}: ${Timing.fmtF(r.freq)}${r.duty != null ? ' · ' + (r.duty * 100).toFixed(0) + ' %' : ''}` : null; }).filter(Boolean); el.textContent = m.length ? m.join('  ·  ') : 'Analizador lógico: sin señal periódica en la ventana.'; }
  /* ---- panel del banco ---- */
  showProps() { this.propsFor = this.sel; this.renderProps(); }
  renderProps() {
    const pe = this.root.querySelector('#bprops'), b = this.board, it = b.items.find(i => i.id === this.sel);
    const mon = this.sel === 'mcu' && !!b.mcu, pm = this.root.querySelector('#bmcu');
    this.root.classList.toggle('mcusel', mon); if (pm) pm.hidden = !mon; pe.hidden = mon; this.root.querySelector('#bph').textContent = mon ? 'Programa de la placa · ' + (b.mcu.board === 'UNO' ? 'Arduino UNO' : 'ESP32-S3 DevKitC-1') : 'Banco';
    if (this._mon !== mon) { this._mon = mon; this.onChange && this.onChange('mcusel', mon); }
    if (mon) return;
    if (this.msel && this.msel.size > 1) { pe.innerHTML = `<h4>${this.msel.size} elementos seleccionados</h4><p class="mut">Arrastra cualquiera de ellos para moverlos en bloque. Mayús + clic añade o quita elementos. Esc deselecciona.</p><button class="b sm" data-del>Eliminar selección</button>`; const d0 = pe.querySelector('[data-del]'); d0.onclick = () => this.removeSel(); return; }
    let h = '';
    h += `<div class="ph">Fuente MB102</div><label class="chk"><input type="checkbox" data-mb="on" ${b.mb.on ? 'checked' : ''}> conectada (interruptor)</label><label>Carril superior<select data-mb="top"><option value="0" ${!b.mb.top ? 'selected' : ''}>0 V</option><option value="3.3" ${b.mb.top === 3.3 ? 'selected' : ''}>3,3 V</option><option value="5" ${b.mb.top === 5 ? 'selected' : ''}>5 V</option></select></label><label>Carril inferior<select data-mb="bot"><option value="0" ${!b.mb.bot ? 'selected' : ''}>0 V</option><option value="3.3" ${b.mb.bot === 3.3 ? 'selected' : ''}>3,3 V</option><option value="5" ${b.mb.bot === 5 ? 'selected' : ''}>5 V</option></select></label>`;
    if (it) {
      h += `<div class="ph">${esc(it.type === 'IC' ? DSim.IC[it.ic].name : it.type === 'SENS' ? (SC().CAT[it.kind] || {}).name : B.PARTS[it.type].name)}</div>`;
      if (it.type === 'SENS') h += this.sensProps(it);
      if (it.type === 'R' || it.type === 'C') h += `<label>Valor (${it.type === 'R' ? 'Ω' : 'F'})<input data-ip="v" value="${esc(it.v)}"></label>`;
      if (it.type === 'CLK') h += `<p class="mut">Módulo de 3 patas: VCC (3,3–5 V), CLK (salida) y GND. Sin alimentación no genera señal.</p><label>Frecuencia (Hz)<input data-ip="hz" value="${esc(it.hz || '1')}"></label><label>Ciclo de trabajo (%)<input data-ip="duty" value="${esc(String(it.duty || 50))}"></label>`;
      if (it.type === 'LED') h += `<label>Color<select data-ip="color">${['red', 'green', 'yellow', 'blue'].map(c => `<option ${it.color === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>`;
      if (it.type === 'IC') h += `<p class="mut">${esc(DSim.IC[it.ic].desc)}</p>${dsLinkHTML(it.ic)}<label>Referencia<input data-ip="label" value="${esc(it.label)}"></label><div id="pintab"></div>`;
      if (it.type === 'DMM') h += `<label>Modo<select data-ip="mode"><option value="V" ${it.mode === 'V' ? 'selected' : ''}>Voltios (DC)</option><option value="A" ${it.mode === 'A' ? 'selected' : ''}>Amperios (en serie)</option><option value="R" ${it.mode === 'R' ? 'selected' : ''}>Ohmios (sin alimentar)</option></select></label><div class="dmm" id="dmmv">—</div><button class="b sm prim" data-a="logm">Anotar medida en el cuaderno</button><label>Condición de la medida<input id="logc" placeholder="p. ej. pulsador sin pulsar"></label>`;
      if (it.type === 'LP') h += `<div class="dmm" id="lpv">—</div><p class="mut">Rojo: nivel alto (≥ 2 V). Verde: nivel bajo (≤ 0,8 V). Azul: alta impedancia (nada fija el nodo) o nivel indefinido.</p>`;
      if (it.type === 'WIRE') h += `<p class="mut">Supr para borrar el cable.</p>`;
      h += '<button class="b sm" data-del>Eliminar</button>';
    }
    pe.innerHTML = h;
    pe.querySelectorAll('[data-mb]').forEach(i => i.onchange = () => { const k = i.dataset.mb; b.mb[k] = k === 'on' ? i.checked : +i.value; this.changed(); });
    pe.querySelectorAll('[data-sk]').forEach(i => { const k = i.dataset.sk, ap = (v) => { it.stim[k] = v; const ix = this.refs[it.id], sp = typeof ix === 'number' ? this.sim.parts[ix] : null; if (sp) sp.stim[k] = v; this.dirty = true; const o = pe.querySelector('[data-sv="' + k + '"]'); if (o) o.textContent = this.fmtStim(it, k); };
      if (i.type === 'range') i.oninput = () => { const c = SC().CAT[it.kind].stim.find(q => q.k === k); ap(c.log ? Math.round(Math.pow(10, +i.value) * 100) / 100 : +i.value); }; else if (i.type === 'checkbox') i.onchange = () => ap(i.checked ? 1 : 0); else i.onclick = () => ap(1); });
    pe.querySelectorAll('[data-so]').forEach(i => i.onchange = () => { it.o[i.dataset.so] = i.value; const ix = this.refs[it.id], sp = typeof ix === 'number' ? this.sim.parts[ix] : null; if (sp) sp.o[i.dataset.so] = i.value; this.changed(); });
    pe.querySelectorAll('[data-ip]').forEach(i => i.onchange = () => { it[i.dataset.ip] = i.value; this.changed(); });
    const d = pe.querySelector('[data-del]'); if (d) d.onclick = () => this.removeSel();
  }
  fmtStim(it, k) { const c = SC().CAT[it.kind].stim.find(q => q.k === k), v = it.stim[k]; return (Math.abs(v) >= 1000 ? Math.round(v) : (+v).toFixed(c.step && c.step < 1 ? (c.step < 0.1 ? 2 : 1) : 0)).toString().replace('.', ',') + (c.unit ? ' ' + c.unit : ''); }
  sensProps(it) { const c = SC().CAT[it.kind]; let h = `<p class="mut">${esc(c.desc)}</p><div class="dmm" id="sread">—</div>`;
    (c.stim || []).forEach(q => { const v = it.stim[q.k];
      if (q.type === 'bool') h += `<label class="chk"><input type="checkbox" data-sk="${q.k}" ${v ? 'checked' : ''}> ${esc(q.label)}</label>`;
      else if (q.type === 'btn') h += `<button class="b sm" data-sk="${q.k}">${esc(q.label)}</button>`;
      else h += `<label>${esc(q.label)}: <b data-sv="${q.k}">${this.fmtStim(it, q.k)}</b><input type="range" data-sk="${q.k}" ${q.log ? `min="${Math.log10(q.min)}" max="${Math.log10(q.max)}" step="0.01" value="${Math.log10(Math.max(v, q.min))}"` : `min="${q.min}" max="${q.max}" step="${q.step || 1}" value="${v}"`}></label>`; });
    (c.props || []).forEach(q => { h += `<label>${esc(q.label)}<select data-so="${q.k}">${q.opts.map(o => `<option value="${esc(o)}" ${it.o[q.k] === o ? 'selected' : ''}>${esc(q.fmt ? q.fmt(o) : o)}</option>`).join('')}</select></label>`; });
    return h; }
  updateProps() {
    const it = this.board.items.find(i => i.id === this.sel); if (!it) return;
    if (it.type === 'IC') { const t = this.root.querySelector('#pintab'), ix = this.refs[it.id], sp = this.sim.parts[ix]; if (t && sp) { const d = sp.def; let h = '<table class="pt"><tr><th>Pata</th><th>Nombre</th><th>V</th><th>Nivel</th></tr>';
      for (let k = 1; k <= d.n; k++) { const n = sp.pins[k - 1], v = n != null ? this.sim.v[n] : null; const lv = v == null ? '—' : v >= (sp.fam.kind === 'ttl' ? 2 : 0.7 * (sp.vcc || 5)) ? '1' : v <= (sp.fam.kind === 'ttl' ? 0.8 : 0.3 * (sp.vcc || 5)) ? '0' : '?'; h += `<tr><td>${k}</td><td>${esc(d.pn[k] || '')}</td><td>${v == null ? '—' : v.toFixed(2)}</td><td>${lv}</td></tr>`; }
      t.innerHTML = h + '</table>' + (sp.burned ? '<p class="warn">Integrado dañado.</p>' : ''); } }
    if (it.type === 'SENS') { const el = this.root.querySelector('#sread'), c = SC().CAT[it.kind], ix = this.refs[it.id]; if (el && c) el.textContent = c.readout ? c.readout(it, typeof ix === 'number' ? this.sim.parts[ix] : null) : ''; }
    if (it.type === 'DMM') { const el = this.root.querySelector('#dmmv'), r = this.dmmRead(it); if (el) el.textContent = r ? r.text : '—'; }
    if (it.type === 'LP') { const el = this.root.querySelector('#lpv'); if (el) { const q = this.lpState(it); el.textContent = q.s === 'H' ? '1 · alto (' + q.v.toFixed(2) + ' V)' : q.s === 'L' ? '0 · bajo (' + q.v.toFixed(2) + ' V)' : 'Z · alta impedancia (' + q.why + ')'; } }
  }
  ohms(it) { // resistencia entre las puntas con el circuito sin alimentar (solo R y cables)
    const par = {}, f = (x) => par[x] === undefined || par[x] === x ? (par[x] = x) : (par[x] = f(par[x])), un = (a, b) => { par[f(a)] = f(b); };
    const items = this.board.items; items.forEach(i => { if (i.type === 'WIRE') un(B.netOf(i.a), B.netOf(i.b)); });
    const A = f(B.netOf(it.red)), Z = f(B.netOf(it.black)); if (A === Z) return 0;
    const R = items.filter(i => i.type === 'R').map(i => [f(B.netOf(i.a)), f(B.netOf(i.b)), Math.max(Schem.parseVal(i.v) || 1, 1e-3)]).filter(r => r[0] !== r[1]);
    const nodes = [...new Set(R.flatMap(r => [r[0], r[1]]).concat([A, Z]))], n = nodes.length, ix = new Map(nodes.map((x, i) => [x, i]));
    const M = Array.from({ length: n }, () => new Array(n + 1).fill(0)); R.forEach(r => { const a = ix.get(r[0]), b = ix.get(r[1]), g = 1 / r[2]; M[a][a] += g; M[b][b] += g; M[a][b] -= g; M[b][a] -= g; });
    const z = ix.get(Z), a0 = ix.get(A); M[a0][n] = 1; for (let j = 0; j <= n; j++) M[z][j] = 0; M[z][z] = 1; M[z][n] = 0;
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) { if (c === a0) return Infinity; continue; } [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / M[c][c]; if (k) for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; } }
    const va = M[a0][n] / M[a0][a0]; return isFinite(va) && va > 0 && va < 1e9 ? va : Infinity;
  }
  dmmRead(it) {
    if (it.mode === 'R') { if (!it.red || !it.black) return null; const r = this.ohms(it); return { val: r, unit: 'Ω', text: !isFinite(r) ? 'OL' : (r >= 1e6 ? (r / 1e6).toFixed(2) + ' MΩ' : r >= 1e3 ? (r / 1e3).toFixed(2) + ' kΩ' : r.toFixed(1) + ' Ω').replace('.', ',') }; }
    const ix = this.refs[it.id], sp = typeof ix === 'number' ? this.sim.parts[ix] : null; if (!sp) return null;
    if (it.mode === 'A') { const i = (this.sim.v[sp.pins[0]] - this.sim.v[sp.pins[1]]) / 0.2; const a = Math.abs(i); return { val: i, unit: 'A', text: (a < 0.1 ? (i * 1e3).toFixed(a < 0.001 ? 3 : 2) + ' mA' : i.toFixed(3) + ' A').replace('.', ',') }; }
    const v = this.sim.v[sp.pins[0]] - this.sim.v[sp.pins[1]]; return { val: v, unit: 'V', text: v.toFixed(3).replace('.', ',') + ' V' };
  }
  logMeasure() {
    const it = this.board.items.find(i => i.id === this.sel); if (!it || it.type !== 'DMM') return; const r = this.dmmRead(it); if (!r) return;
    const cond = this.root.querySelector('#logc') ? this.root.querySelector('#logc').value : '';
    const e = { n: this.log.length + 1, t: this.sim.t, mode: it.mode, val: r.val, unit: r.unit, text: r.text, cond, between: `${this.keyLabel(it.red)} → ${this.keyLabel(it.black)}` }; this.log.push(e); this.onChange && this.onChange('log', e);
  }
  /* ---- dibujo ---- */
  render() {
    const b = this.board, sim = this.sim, ctx = this.geom(), nl = this.nl; this.ctx = ctx;
    const vb = this.svg.getBoundingClientRect(), k = this.view.k, W = vb.width * k, H = vb.height * k;
    let s = '';
    // base
    s += `<rect x="20" y="8" width="${B.hx(COLS) + 40}" height="372" rx="8" fill="#EFEDE6" stroke="${BORD}" stroke-width="1.5"/>`;
    s += `<rect x="20" y="190" width="${B.hx(COLS) + 40}" height="14" fill="#E2DFD8"/><text x="${B.hx(COLS) + 36}" y="200" font-size="9" text-anchor="end" fill="${MUTE}">canal central</text>`;
    // carriles
    ['T+', 'T-', 'B-', 'B+'].forEach(r => { const y = RAILY[r]; s += `<line x1="${railX(0) - 8}" y1="${y - 10}" x2="${railX(49) + 8}" y2="${y - 10}" stroke="${r.endsWith('+') ? HI : INK}" stroke-width="1.4"/><text x="28" y="${y + 4}" font-size="11" font-weight="700" fill="${r.endsWith('+') ? HI : INK}">${r.endsWith('+') ? '+' : '−'}</text>`; });
    for (let c = 1; c <= COLS; c++) { if (c === 1 || c % 5 === 0) s += `<text x="${B.hx(c)}" y="92" font-size="9" text-anchor="middle" fill="${MUTE}">${c}</text><text x="${B.hx(c)}" y="298" font-size="9" text-anchor="middle" fill="${MUTE}" ${c === 1 ? '' : ''}>${c}</text>`; }
    Object.entries(ROWY).forEach(([r, y]) => s += `<text x="34" y="${y + 3}" font-size="9" fill="${MUTE}" text-anchor="middle">${r.toUpperCase()}</text>`);
    // agujeros
    const hn = this.hover ? this.nl.index(B.netOf(this.hover)) : null, occ = new Set();
    const cls = (key) => { const n = nl.index(B.netOf(key)); return n == null ? null : n; };
    const holeSvg = (key, x, y) => { const n = cls(key), hl = hn != null && n === hn, v = n != null ? sim.v[n] : null;
      const fill = hl ? SAGE : (n != null && (this.board.items.some(it => false))) ? '#bbb' : '#8a877f';
      return `<rect data-k="${key}" x="${x - 3.2}" y="${y - 3.2}" width="6.4" height="6.4" rx="1" fill="${hl ? SAGE : '#8a877f'}" ${hl ? 'stroke="#1F2421" stroke-width="0.6"' : ''} style="cursor:${this.tool ? 'crosshair' : 'default'}"/>`; };
    for (let c = 1; c <= COLS; c++) Object.entries(ROWY).forEach(([r, y]) => s += holeSvg(hole(c, r), B.hx(c), y));
    ['T+', 'T-', 'B-', 'B+'].forEach(r => { for (let i = 0; i < 50; i++) s += holeSvg(`r:${r}:${i}`, railX(i), RAILY[r]); });
    // fuente MB102 (siempre visible; los jumpers y el interruptor se pulsan)
    s += this.drawMB();
    // componentes
    const pos = (key) => keyXY(key, ctx);
    b.items.forEach(it => { s += it.off ? `<g transform="translate(${it.off.x},${it.off.y})">${this.drawItem(it, pos)}</g>` : this.drawItem(it, pos); });
    if (this.ghost) { try { s += `<g opacity=".55" pointer-events="none">${this.drawItem(this.ghost, pos)}</g>`; } catch (er) { } }
    const si = b.items.find(i => i.id === this.sel);
    if (si) { const ends = si.type === 'DMM' ? ['red', 'black'] : si.type === 'LP' ? ['tip'] : ['R', 'LED', 'C', 'WIRE'].includes(si.type) ? ['a', 'b'] : [];
      if (si.type === 'LA') (si.ch || []).forEach((k, i) => { const z = k && pos(k); if (z) s += `<circle data-lach="${i}" data-item="${si.id}" cx="${z.x}" cy="${z.y}" r="7.5" fill="rgba(106,123,108,.28)" stroke="${SAGE}" stroke-width="1.6" style="cursor:grab"/>`; });
      ends.forEach(q => { const z = pos(si[q]); if (z) s += `<circle data-end="${q}" data-item="${si.id}" cx="${z.x}" cy="${z.y}" r="7.5" fill="rgba(106,123,108,.28)" stroke="${SAGE}" stroke-width="1.6" style="cursor:grab"/>`; }); }
    if (this.msel) this.msel.forEach(id => { const it = b.items.find(i => i.id === id); if (it && it.type === 'WIRE') { const wa = pos(it.a), wb = pos(it.b); if (wa && wb) s += `<path d="${wirePath(wa, wb, it.pts)}" fill="none" stroke="#3B7DD8" stroke-opacity=".4" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`; return; } const bx = it && this.itemBox(it, ctx); if (bx) s += `<rect x="${bx.x0}" y="${bx.y0}" width="${bx.x1 - bx.x0}" height="${bx.y1 - bx.y0}" rx="6" fill="#3B7DD8" fill-opacity=".16" stroke="#3B7DD8" stroke-width="2" pointer-events="none"/>`; });
    if (this.mq) { const q = this.mq; s += `<rect x="${Math.min(q.x0, q.x1)}" y="${Math.min(q.y0, q.y1)}" width="${Math.abs(q.x1 - q.x0)}" height="${Math.abs(q.y1 - q.y0)}" fill="#3B7DD8" fill-opacity=".16" stroke="#3B7DD8" stroke-width="1.4" stroke-dasharray="5 3" pointer-events="none"/>`; }
    // MCU
    if (b.mcu) s += `<g data-mcubox="1">` + this.drawMcu(ctx) + `</g>` + (this.fire && this.fire.mcu && ctx.mcuBox ? B.flame(ctx.mcuBox.x + ctx.mcuBox.w / 2, ctx.mcuBox.y - 6, this.fire.mcu, 1.6) : '') + (this.sel === 'mcu' && ctx.mcuBox ? `<rect x="${ctx.mcuBox.x - 6}" y="${ctx.mcuBox.y - 6}" width="${ctx.mcuBox.w + 12}" height="${ctx.mcuBox.h + 12}" rx="8" fill="none" stroke="${SAGE}" stroke-dasharray="5 4" stroke-width="1.6" pointer-events="none"/>` : '');
    if (this.wf && this.mouse) { const a = pos(this.wf.from); if (a) { const sq = [a].concat(this.wf.pts, [this.mouse]); s += `<path d="M${sq.map(q => q.x + ',' + q.y).join(' L')}" fill="none" stroke="${this.wf.color || '#4C6A8C'}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 6" pointer-events="none"/>` + this.wf.pts.map(q => `<circle cx="${q.x}" cy="${q.y}" r="4.5" fill="#F9F8F6" stroke="${HI}" stroke-width="2" pointer-events="none"/>`).join('') + `<circle cx="${a.x}" cy="${a.y}" r="5" fill="none" stroke="${HI}" stroke-width="2" pointer-events="none"/>`; } }
    if (this.pend && this.pend.pts.length && this.mouse && !this.wf) { const a = pos(this.pend.pts[0]); if (a) s += `<line x1="${a.x}" y1="${a.y}" x2="${this.mouse.x}" y2="${this.mouse.y}" stroke="${SAGE}" stroke-dasharray="5 4" stroke-width="2" pointer-events="none"/>`; }
    this.svg.setAttribute('viewBox', `${this.view.x} ${this.view.y - 40} ${W} ${H}`);
    this.svg.innerHTML = s;
  }
  drawMB() {
    const m = this.board.mb, on = !!m.on, X0 = -200, XR = 44, Y0 = 8, H = 366, fv = (v) => (!on || !v) ? '0 V' : (v === 3.3 ? '3,3 V' : '5 V');
    let s = `<g data-mbbox="1"><title>${esc(UI.HELP.MB102)}</title>`;
    // PCB azul con orificios y serigrafía
    s += `<rect x="${X0}" y="${Y0}" width="${XR - X0}" height="${H}" rx="6" fill="#1D56B0" stroke="#0c2f66" stroke-width="2"/><rect x="${X0 + 5}" y="${Y0 + 5}" width="${XR - X0 - 10}" height="${H - 10}" rx="4" fill="none" stroke="#3a78d6" stroke-width="1"/>`;
    [[X0 + 14, Y0 + 14], [X0 + 14, Y0 + H - 14], [XR - 30, Y0 + 14], [XR - 30, Y0 + H - 14]].forEach(q => s += `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="#F9F8F6" stroke="#0c2f66" stroke-width="2"/>`);
    s += `<text x="${X0 + 140}" y="${Y0 + H - 14}" font-size="13" font-weight="700" fill="#e8f1ff" text-anchor="middle">MB102 · POWER MODULE</text>`;
    // conector DC (jack) y USB
    s += `<rect x="${X0 - 22}" y="${Y0 + 30}" width="70" height="70" rx="3" fill="#202020" stroke="#000" stroke-width="2"/><circle cx="${X0 + 14}" cy="${Y0 + 65}" r="15" fill="#050505" stroke="#555" stroke-width="2"/><circle cx="${X0 + 14}" cy="${Y0 + 65}" r="4" fill="#888"/><text x="${X0 + 14}" y="${Y0 + 118}" font-size="10" fill="#e8f1ff" text-anchor="middle">DC 6,5–12 V</text>`;
    s += `<rect x="${X0 - 22}" y="${Y0 + H - 130}" width="70" height="86" rx="3" fill="#c9ccd0" stroke="#6b6f74" stroke-width="2"/><rect x="${X0 - 10}" y="${Y0 + H - 118}" width="46" height="62" fill="#9aa0a6"/><rect x="${X0 + 4}" y="${Y0 + H - 106}" width="22" height="38" fill="#f1f1f1" stroke="#777"/><text x="${X0 + 14}" y="${Y0 + H - 28}" font-size="10" fill="#e8f1ff" text-anchor="middle">USB</text>`;
    // interruptor deslizante ON/OFF
    s += `<g data-mbsw="1" style="cursor:pointer"><title>Interruptor ON/OFF</title><rect x="${X0 + 72}" y="${Y0 + 30}" width="30" height="64" rx="3" fill="#dfe3e6" stroke="#555" stroke-width="1.5"/><rect x="${X0 + 76}" y="${on ? Y0 + 36 : Y0 + 62}" width="22" height="26" rx="2" fill="${on ? '#4FA45C' : '#7a7d80'}" stroke="#222"/><text x="${X0 + 112}" y="${Y0 + 46}" font-size="10" fill="#e8f1ff">ON</text><text x="${X0 + 112}" y="${Y0 + 86}" font-size="10" fill="#e8f1ff">OFF</text></g>`;
    s += `<circle cx="${X0 + 87}" cy="${Y0 + 112}" r="6" fill="${on ? '#E0301E' : '#5a1f18'}" stroke="#300"/><text x="${X0 + 100}" y="${Y0 + 116}" font-size="9" fill="#e8f1ff">PWR</text>`;
    // reguladores AMS1117 (SOT-223) y condensadores electrolíticos
    const reg = (y, lb) => `<rect x="${X0 + 72}" y="${y}" width="50" height="34" fill="#171717" stroke="#000"/><rect x="${X0 + 122}" y="${y + 8}" width="14" height="18" fill="#b9bcc0"/><text x="${X0 + 97}" y="${y + 21}" font-size="8" fill="#9aa" text-anchor="middle">AMS1117</text><text x="${X0 + 97}" y="${y + 48}" font-size="9" fill="#e8f1ff" text-anchor="middle">${lb}</text>`;
    s += reg(Y0 + 140, '5.0 V') + reg(Y0 + 200, '3.3 V');
    const cap = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="#2a2a2a" stroke="#000" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="9" fill="#bfc3c7"/><path d="M${x},${y - 9} V${y + 9}" stroke="#555"/>`;
    s += cap(X0 + 66, Y0 + 270) + cap(X0 + 100, Y0 + 270) + cap(X0 + 66, Y0 + 310) + cap(X0 + 100, Y0 + 310);
    // jumpers de selección (uno por carril): clic = 5 V → 3,3 V → libre
    const jmp = (key, y0, label, val) => { const st = val === 5 ? 2 : val === 3.3 ? 1 : 0, py = [y0, y0 + 20, y0 + 40], tx = X0 + 168;
      let r = `<g data-mbj="${key}" style="cursor:pointer"><title>Clic para cambiar el jumper: 5 V → 3,3 V → sin jumper (0 V)</title><rect x="${tx - 16}" y="${y0 - 14}" width="34" height="68" rx="3" fill="#143f85" stroke="#0a244d"/>`;
      py.forEach((y, i) => r += `<rect x="${tx - 5}" y="${y - 5}" width="10" height="10" fill="#1a1a1a"/><circle cx="${tx}" cy="${y}" r="2.4" fill="#d8b02a"/><text x="${tx + 22}" y="${y + 3}" font-size="8" fill="#e8f1ff">${['3,3', 'COM', '5'][i]}</text>`);
      if (st) { const a = st === 2 ? py[1] : py[0], z = st === 2 ? py[2] : py[1]; r += `<rect x="${tx - 9}" y="${a - 9}" width="18" height="${z - a + 18}" rx="3" fill="#161616" stroke="#000"/><rect x="${tx - 9}" y="${a - 9}" width="18" height="4" fill="#d8b02a"/>`; }
      else r += `<text x="${tx}" y="${y0 + 66}" font-size="8" fill="#e8f1ff" text-anchor="middle">libre</text>`;
      return r + `</g><text x="${tx - 6}" y="${y0 - 22}" font-size="9" fill="#e8f1ff" font-weight="700" text-anchor="middle">${label}</text><rect x="${tx - 28}" y="${y0 + 78}" width="56" height="20" rx="3" fill="#0e1a24" stroke="#000"/><text x="${tx}" y="${y0 + 93}" font-size="14" font-family="monospace" font-weight="700" fill="${on && val ? '#E0553A' : '#6a7078'}" text-anchor="middle">${fv(val)}</text>`; };
    if (this.fire && this.fire.mb) s += B.flame(-90, Y0 + 40, this.fire.mb, 1.6);
    s += jmp('top', Y0 + 50, 'RAIL SUP.', m.top) + jmp('bot', Y0 + H - 168, 'RAIL INF.', m.bot);
    // clavijas de salida que se insertan en los carriles
    const pin = (y, col) => `<rect x="${XR - 2}" y="${y - 5}" width="24" height="10" fill="${col}" stroke="#554" stroke-width=".8"/>`;
    s += pin(RAILY['T+'], '#d8b02a') + pin(RAILY['T-'], '#d8b02a') + pin(RAILY['B-'], '#d8b02a') + pin(RAILY['B+'], '#d8b02a');
    s += `<text x="${XR - 8}" y="${RAILY['T+'] + 4}" font-size="9" fill="#ffd7cf" text-anchor="end">+</text><text x="${XR - 8}" y="${RAILY['T-'] + 4}" font-size="9" fill="#fff" text-anchor="end">−</text><text x="${XR - 8}" y="${RAILY['B-'] + 4}" font-size="9" fill="#fff" text-anchor="end">−</text><text x="${XR - 8}" y="${RAILY['B+'] + 4}" font-size="9" fill="#ffd7cf" text-anchor="end">+</text>`;
    return s + '</g>';
  }
  /* circuito integrado con serigrafía: puertas con su conexionado, numeración de patas y rótulo al pasar el ratón */
  drawIC(it, ix, sel) {
    const d = DSim.IC[it.ic], n = d.n, h = n / 2, sp = typeof ix === 'number' ? this.sim.parts[ix] : null, P2 = P;
    const x = B.hx(it.col) - 9, w = (h - 1) * P2 + 18, y0 = 175, H = 36, y1 = y0 + H, cx = x + w / 2;
    const SIL = '#bdbab0', RED = '#C8372D', BRN = '#7A4B24';
    const pinX = k => B.hx(it.col + (k <= h ? k - 1 : n - k));
    const role = k => k === d.vcc ? 'vcc' : k === d.gnd ? 'gnd' : (d.outs || []).includes(k) ? 'out' : (d.ins || []).includes(k) ? 'in' : 'io';
    const gate = d.groups && d.fn; // solo para el texto de ayuda de cada pata
    const txt = k => { const nm = (d.pn && d.pn[k]) || ''; let e = ''; const r = role(k);
      if (gate && nm) { const m = /^IN(\d)([A-C]?)$/.exec(nm), q = /^Y(\d)$/.exec(nm); if (m) e = 'entrada ' + (m[2] ? m[2] + ' ' : '') + 'de la puerta ' + m[1]; else if (q) e = 'salida de la puerta ' + q[1]; }
      if (r === 'vcc') e = 'alimentación positiva (+5 V del carril rojo)'; else if (r === 'gnd') e = 'masa, 0 V (carril negro)'; else if (!e) e = r === 'out' ? 'salida' : r === 'in' ? 'entrada' : 'patilla';
      return 'Pata ' + k + (nm ? ' · ' + nm.replace(/̅/g, '') : '') + ' — ' + e; };
    let s = `<rect x="${x}" y="${y0}" width="${w}" height="${H}" rx="3" fill="${sp && sp.burned ? '#5a2a20' : '#2b2e2d'}" stroke="#111"/><path d="M${x},${y0 + 11} a7,7 0 0 1 0,14" fill="#1a1c1b"/>`;
    // patillas (VCC en rojo, GND en marrón) con su rótulo
    for (let k = 1; k <= n; k++) { const px = pinX(k), top = k > h, r = role(k), col = r === 'vcc' ? RED : r === 'gnd' ? BRN : '#aaa', yy = top ? y0 - 5 : y1;
      s += `<rect x="${px - 2.5}" y="${yy}" width="5" height="5" fill="${col}"/>`;
      s += `<text x="${px}" y="${top ? y0 + 9 : y1 - 2.5}" font-size="${r === 'vcc' || r === 'gnd' ? 9 : 8.5}" font-weight="${r === 'vcc' || r === 'gnd' ? 700 : 400}" text-anchor="middle" fill="${r === 'vcc' ? '#ff8f80' : r === 'gnd' ? '#d9b58a' : SIL}" pointer-events="none">${k}</text>`;
      s += `<rect x="${px - 6}" y="${top ? y0 - 6 : y1 - 10}" width="12" height="16" fill="transparent"><title>${esc(txt(k))}</title></rect>`; }
    s += `<text x="${cx}" y="${y0 + 21}" text-anchor="middle" font-size="11" font-weight="700" fill="#e7e5df" pointer-events="none">${esc(d.name)}</text><text x="${cx}" y="${y0 + 30}" text-anchor="middle" font-size="7.5" fill="#a9a79f" pointer-events="none">${esc(it.label || '')}</text>`;
    return s + (sel ? `<rect x="${x - 4}" y="${y0 - 10}" width="${w + 8}" height="${H + 20}" rx="5" fill="none" stroke="${SAGE}" stroke-dasharray="4 3" stroke-width="1.5"/>` : '');
  }
  drawItem(it, pos) {
    const sim = this.sim, sel = this.sel === it.id, ix = this.refs[it.id];
    const hlp = it.type === 'IC' ? DSim.IC[it.ic].name + ': ' + DSim.IC[it.ic].desc : (UI.HELP[it.type + '_b'] || UI.HELP[it.type + (it.n || '')] || UI.HELP[it.type] || '');
    const fireMsg = this.fire && this.fire[it.id];
    const anch = () => { if (it.type === 'IC') return { x: B.hx(it.col) + (DSim.IC[it.ic].n / 2 - 1) * P / 2, y: 168 }; if (it.type === 'D7') return { x: B.hx(it.col) + 2 * P, y: 150 }; const a = pos(it.a), c = pos(it.b); return a && c ? { x: (a.x + c.x) / 2, y: Math.min(a.y, c.y) - 36 } : null; };
    const dy = it.type !== 'SENS' && COLT.includes(it.type) ? ((R) => (ROWY[R.lo] + ROWY[R.hi]) / 2 - 193)(B.rowsOf(it)) : 0, tr = dy ? ` transform="translate(0,${dy})"` : '';
    const G = (inner, extra = '') => { const an = fireMsg && anch(); return `<g data-id="${it.id}" ${extra}${tr}><title>${esc(hlp)}</title>${inner}${an ? B.flame(an.x, an.y, fireMsg) : ''}</g>`; };
    const selr = (x, y, w, h) => sel ? `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="5" fill="none" stroke="${SAGE}" stroke-dasharray="4 3" stroke-width="1.5"/>` : '';
    if (it.type === 'WIRE') { const a = pos(it.a), c = pos(it.b); if (!a || !c) return ''; const d = wirePath(a, c, it.pts); const wpH = sel && it.pts ? it.pts.map((q, i) => `<circle data-wp="${i}" data-item="${it.id}" cx="${q.x}" cy="${q.y}" r="6" fill="#F9F8F6" stroke="${SAGE}" stroke-width="2" style="cursor:grab"/>`).join('') : '';
      return `<g data-id="${it.id}"><path d="${d}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="${sel ? 7.4 : 6}" stroke-linejoin="round" stroke-linecap="round" transform="translate(0.8,1.4)" pointer-events="none"/><path d="${d}" fill="none" stroke="${it.color}" stroke-width="4.4" stroke-linejoin="round" stroke-linecap="round"/>${sel ? `<path d="${d}" fill="none" stroke="${SAGE}" stroke-width="1.4" stroke-dasharray="3 4" pointer-events="none"/>` : ''}<path d="${d}" fill="none" stroke="transparent" stroke-width="12" style="cursor:pointer"/><circle cx="${a.x}" cy="${a.y}" r="3.4" fill="${it.color}" stroke="#0003"/><circle cx="${c.x}" cy="${c.y}" r="3.4" fill="${it.color}" stroke="#0003"/>${wpH}${sel ? (() => { const sq = [a].concat(it.pts || [], [c]); let r = ''; for (let i = 0; i < sq.length - 1; i++) { const mx = (sq[i].x + sq[i + 1].x) / 2, my0 = (sq[i].y + sq[i + 1].y) / 2, my = (!it.pts || !it.pts.length) ? 0.125 * (a.y + c.y) + 0.75 * (Math.min(a.y, c.y) - 24 - Math.abs(a.x - c.x) * 0.05) : my0; r += `<rect data-wpmid="${i}" data-item="${it.id}" x="${mx - 5}" y="${my - 5}" width="10" height="10" transform="rotate(45 ${mx} ${my})" fill="#F9F8F6" stroke="${HI}" stroke-width="2" style="cursor:copy"><title>Arrastra para crear un codo</title></rect>`; } return r; })() : ''}</g>`; }
    if (it.type === 'R' || it.type === 'LED' || it.type === 'C') {
      const a = pos(it.a), c = pos(it.b); if (!a || !c) return ''; const dx = c.x - a.x, dy = c.y - a.y, L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI, mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
      let body = '';
      if (it.type === 'R') { const bd = B.bands(Schem.parseVal(it.v)); body = `<rect x="-17" y="-6" width="34" height="12" rx="5" fill="#D9C7A0" stroke="#8a7a58"/>` + [-10, -4, 2].map((x, i) => `<rect x="${x}" y="-6" width="3.4" height="12" fill="${bd[i]}"/>`).join('') + `<rect x="8" y="-6" width="3.4" height="12" fill="#c9a227"/>`; }
      else if (it.type === 'LED') { const C = { red: '#B8432F', green: '#4F8A57', yellow: '#C9A227', blue: '#4C6A8C' }[it.color] || '#B8432F', on = ix !== undefined && sim.parts[ix] && sim.parts[ix].st.on, dead = sim.parts[ix] && sim.parts[ix].dead; const sg = (t, x, y) => `<text x="${x}" y="${y}" font-size="13" font-weight="700" text-anchor="middle" fill="${INK}" stroke="${BG}" stroke-width="2.4" paint-order="stroke" transform="rotate(${-ang} ${x} ${y})">${t}</text>`;
        body = (on ? `<circle r="26" fill="${C}" opacity=".18"/><circle r="18" fill="${C}" opacity=".28"/>` : '') + `<path d="M8.4,-7 A11.2,11.2 0 1 0 8.4,7 Z" fill="${C}" opacity="${on ? .9 : .45}" stroke="#4a4a4a" stroke-width="1"/><circle r="8.4" fill="${C}" opacity="${on ? 1 : .5}" stroke="#555" stroke-width=".8"/><rect x="2.2" y="-4.6" width="3.4" height="9.2" fill="#aeb2b6" stroke="#6a6e72" stroke-width=".5"/><rect x="-5.4" y="-1.6" width="2" height="3.2" fill="#bfc3c7" stroke="#6a6e72" stroke-width=".5"/><path d="M-3.4,0 L2.2,-2" stroke="#8a8e92" stroke-width=".6"/><ellipse cx="-3" cy="-4.2" rx="3.2" ry="1.8" fill="#fff" opacity="${on ? .75 : .5}"/>${on ? '<circle r="4" fill="#fff" opacity=".45"/>' : ''}<line x1="9.8" y1="-7.6" x2="9.8" y2="7.6" stroke="#2b2b2b" stroke-width="1.6"/>` + sg('+', -17, -9) + sg('−', 17, -9) ; if (dead) body += `<text y="4" text-anchor="middle" font-size="14" font-weight="700" fill="#000" transform="rotate(${-ang})">✕</text>`; }
      else { const big = Schem.parseVal(it.v) >= 1e-6; body = big ? `<rect x="-15" y="-15" width="30" height="30" rx="5" fill="#33425b" stroke="#222"/><rect x="8" y="-15" width="7" height="30" fill="#b9c2d0"/><text x="-4" y="5" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">+</text>` : `<ellipse rx="9" ry="13" fill="#C97B3A" stroke="#7a4a1f"/>`; }
      return G(`<g transform="translate(${mx},${my}) rotate(${ang})"><line x1="${-L / 2}" y1="0" x2="${L / 2}" y2="0" stroke="#9a9a9a" stroke-width="2.4"/>${body}</g><circle cx="${a.x}" cy="${a.y}" r="2.6" fill="#555"/><circle cx="${c.x}" cy="${c.y}" r="2.6" fill="#555"/><rect x="${Math.min(a.x, c.x) - 8}" y="${Math.min(a.y, c.y) - (it.type === 'C' ? 15 : 9)}" width="${Math.abs(dx) + 16}" height="${Math.abs(dy) + (it.type === 'C' ? 30 : 18)}" fill="transparent"/>${it.type !== 'LED' ? `<text x="${mx}" y="${my - (it.type === 'C' ? 21 : 13)}" font-size="14" font-weight="700" text-anchor="middle" fill="${INK}" stroke="${BG}" stroke-width="3" paint-order="stroke">${esc(it.v)}${it.type === 'R' ? 'Ω' : 'F'}</text>` : ''}` + selr(Math.min(a.x, c.x) - 8, Math.min(a.y, c.y) - 12, Math.abs(dx) + 16, Math.abs(dy) + 24));
    }
    if (it.type === 'SENS') { const c = SC().CAT[it.kind]; if (!c) return ''; const R = B.rowsOf(it), x = B.hx(it.col), y = ROWY[R.lo]; let sv = null;
      if (typeof ix === 'number') sv = sim.parts[ix]; else if (Array.isArray(ix)) sv = { leds: ix.map(k => { const q = sim.parts[k]; return q ? Math.min(1, (q.st.i || 0) / 0.012) : 0; }) };
      const bx = c.box; return G(`<g transform="translate(${x},${y})">${c.draw(it, sv)}</g>` + selr(x + bx.x, y + bx.y, bx.w, bx.h)); }
    if (it.type === 'IC') return G(this.drawIC(it, ix, sel));
    if (it.type === 'PUSH') { const x = B.hx(it.col) - 4, w = 2 * P + 8, y = 172 - 4, hh = 214 - 172 + 8, pr = this.pressed === it; return G(`<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="4" fill="#4a4d4a" stroke="#222"/><circle data-push="${it.id}" cx="${x + w / 2}" cy="${y + hh / 2}" r="12" fill="${pr ? '#7a7d7a' : '#2c2e2c'}" stroke="#111" style="cursor:pointer"/>` + selr(x, y, w, hh)); }
    if (it.type === 'CLK') { const x = B.hx(it.col) - 9, w = 2 * P + 18, y = 164, hh = 68, sp = this.sim.parts[this.refs[it.id]], hi = sp && sp.on && sp.val, pw = sp && sp.on;
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="3" fill="#33425b" stroke="#1b2536"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="28" rx="2" fill="#26334a"/><text x="${x + w / 2}" y="${y + 17}" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">CLK</text><text x="${x + w / 2}" y="${y + 27}" font-size="7.5" fill="#cdd5e3" text-anchor="middle">${esc(String(it.hz || 1))} Hz</text><circle cx="${x + w - 7}" cy="${y + 8}" r="3.2" fill="${hi ? '#ff9a3c' : pw ? '#5a3a1e' : '#3b3f46'}" stroke="#111"/>`;
      ['VCC', 'OUT', 'GND'].forEach((n, i) => { const cx = B.hx(it.col + i); s += `<circle cx="${cx}" cy="${y + 50}" r="2" fill="#c9ccc9"/><text x="${cx}" y="${y + (i === 1 ? 64 : 58)}" font-size="7" font-weight="700" text-anchor="middle" fill="${i === 0 ? '#ffb3a1' : i === 2 ? '#c9d2e0' : '#fff'}">${n}</text>`; });
      return G(s + selr(x, y, w, hh)); }
    if (it.type === 'DIPSW') { const n = it.n || 8, x = B.hx(it.col) - 9, w = (n - 1) * P + 18, y = 166, hh = 58; it.st = it.st || new Array(n).fill(0);
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="3" fill="#C23B2E" stroke="#6b1d16"/><rect x="${x + 4}" y="${y + 12}" width="${w - 8}" height="26" rx="2" fill="#8c2a21"/><text x="${x + 5}" y="${y + 9}" font-size="7" font-weight="700" fill="#fff">ON ▲</text><text x="${x + w - 4}" y="${y + 9}" font-size="6" text-anchor="end" fill="#f4d9d5">DIP-${n}</text>`;
      for (let i = 0; i < n; i++) { const on = it.st[i], cx = B.hx(it.col + i); s += `<rect x="${cx - 4.5}" y="${y + 14}" width="9" height="22" rx="1.5" fill="#5a1b15"/><rect data-dip="${it.id}:${i}" x="${cx - 4}" y="${on ? y + 15 : y + 25}" width="8" height="10" rx="1.5" fill="${on ? '#F4F1E8' : '#d7d2c4'}" stroke="#222" style="cursor:pointer"/><text x="${cx}" y="${y + 50}" font-size="8" font-weight="700" text-anchor="middle" fill="#f4f1e8">${i + 1}</text>`; }
      return G(s + selr(x, y, w, hh)); }
    if (it.type === 'D7') { const x = B.hx(it.col) - 9, w = 4 * P + 18, y = 156, hh = 76, on = (typeof ix === 'number' && sim.parts[ix]) ? sim.parts[ix].st.on : [];
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="4" fill="#2a2d2b" stroke="#111"/>`; const sx = x + 12, sy = y + 8;
      const seg = { a: [10, 0, 34, 5], b: [46, 6, 5, 26], c: [46, 38, 5, 26], d: [10, 64, 34, 5], e: [4, 38, 5, 26], f: [4, 6, 5, 26], g: [10, 32, 34, 5] };
      Object.entries(seg).forEach(([k2, r], i) => s += `<rect x="${sx + r[0] - 2}" y="${sy + r[1] - 2}" width="${r[2]}" height="${r[3]}" rx="1.5" fill="${on[i] ? '#E0553A' : '#454845'}"/>`); s += `<circle cx="${sx + 54}" cy="${sy + 66}" r="2.6" fill="${on[7] ? '#E0553A' : '#454845'}"/>`;
      return G(s + selr(x, y, w, hh)); }
    if (it.type === 'LP') { const t = pos(it.tip); if (!t) return ''; const A = t.y < 190 ? 156 : 24, lp = this.lpState(it), hi = lp.s === 'H', lo = lp.s === 'L', zz = lp.s === 'Z';
      return G(`<g transform="translate(${t.x},${t.y}) rotate(${A})"><path d="M0,0 L-2.4,-16 L2.4,-16 Z" fill="#b9bcc0" stroke="#555" stroke-width=".8"/><path d="M-4,-16 L4,-16 L7,-34 L-7,-34 Z" fill="#E8E4DA" stroke="#555"/><rect x="-7" y="-134" width="14" height="100" rx="4" fill="#E0B531" stroke="#333"/><rect x="-7" y="-62" width="14" height="5" fill="#B85D34"/><rect x="-7" y="-46" width="14" height="3" fill="#333"/>${hi ? '<circle cx="0" cy="-116" r="9" fill="#E0553A" opacity=".35"/>' : ''}${lo ? '<circle cx="0" cy="-102" r="9" fill="#4FA45C" opacity=".35"/>' : ''}${zz ? '<circle cx="0" cy="-88" r="9" fill="#3B7DD8" opacity=".4"/>' : ''}<circle cx="0" cy="-116" r="4" fill="${hi ? '#FF5A3C' : '#6a2a22'}" stroke="#222"/><circle cx="0" cy="-102" r="4" fill="${lo ? '#5BD16D' : '#27402b'}" stroke="#222"/><circle cx="0" cy="-88" r="4" fill="${zz ? '#6BA4F2' : '#1d3556'}" stroke="#222"/><text x="12" y="-114" font-size="8" font-weight="700" fill="${MUTE}" transform="rotate(${-A} 12 -114)">1</text><text x="12" y="-100" font-size="8" font-weight="700" fill="${MUTE}" transform="rotate(${-A} 12 -100)">0</text><text x="12" y="-86" font-size="8" font-weight="700" fill="${MUTE}" transform="rotate(${-A} 12 -86)">Z</text><path d="M0,-134 C10,-160 50,-160 60,-140" fill="none" stroke="#1F2421" stroke-width="2.4"/></g><circle cx="${t.x}" cy="${t.y}" r="2.6" fill="#B85D34"/>` + selr(t.x - 40, t.y < 190 ? t.y : t.y - 135, 80, 135)); }
    if (it.type === 'DMM') { const a = pos(it.red), c = pos(it.black); if (!a || !c) return ''; const bp = it.bpos || { x: Math.max(a.x, c.x) + 20, y: 380 }, bx = bp.x + 60, by = bp.y, r = this.dmmRead(it), md = it.mode || 'V', BW = 190, BH = 160;
      const dial = [['V', 'V', 36], ['A', 'A', 78], ['R', 'Ω', 120]].map(([m, lb, dx]) => `<g data-dmode="${m}" data-item="${it.id}" style="cursor:pointer"><title>${m === 'V' ? 'Voltios DC' : m === 'A' ? 'Amperios DC (en serie)' : 'Ohmios (circuito sin alimentar)'}</title><circle cx="${bx - 60 + dx}" cy="${by + 106}" r="17" fill="${md === m ? '#B85D34' : '#2d302e'}" stroke="#000" stroke-width="1.5"/><text x="${bx - 60 + dx}" y="${by + 113}" font-size="21" font-weight="700" fill="#fff" text-anchor="middle" pointer-events="none">${lb}</text></g>`).join('');
      return G(`<path d="M${a.x},${a.y} Q${a.x + 20},${by - 30} ${bx - 20},${by + BH - 6}" fill="none" stroke="#B8432F" stroke-width="3.4"/><path d="M${c.x},${c.y} Q${c.x + 50},${by - 10} ${bx + 10},${by + BH - 6}" fill="none" stroke="#1F2421" stroke-width="3.4"/><circle cx="${a.x}" cy="${a.y}" r="4" fill="#B8432F"/><circle cx="${c.x}" cy="${c.y}" r="4" fill="#1F2421"/>
        <g data-bbody="${it.id}" data-bx="${bx - 60}" data-by="${by}" style="cursor:move"><rect x="${bx - 60}" y="${by}" width="${BW}" height="${BH}" rx="12"  fill="#E0B531" stroke="#333" stroke-width="1.5"/><rect x="${bx - 46}" y="${by + 12}" width="${BW - 28}" height="52" rx="4" fill="#c4cbb4" stroke="#333"/><text x="${bx + 34}" y="${by + 50}" text-anchor="middle" font-size="28" font-family="monospace" fill="#222">${r ? esc(r.text) : '—'}</text><text x="${bx - 40}" y="${by + 28}" font-size="11" fill="#444">${md === 'V' ? 'DC V' : md === 'A' ? 'DC A' : 'OHM'}</text>${dial}
        <circle cx="${bx - 20}" cy="${by + 146}" r="6" fill="#B8432F" stroke="#000"/><circle cx="${bx + 10}" cy="${by + 146}" r="6" fill="#111"/><text x="${bx + 60}" y="${by + 150}" font-size="10" fill="#444">VΩ · COM</text></g>` + selr(bx - 60, by, BW, BH)); }
    if (it.type === 'LA') { const COL = ['#7A4E2D', '#B8432F', '#D9822B', '#C9A227', '#4F8A57', '#4C6A8C', '#7B5EA7', '#8A8F94'], X = it.bpos ? it.bpos.x : 960, Y = it.bpos ? it.bpos.y : 396; it.ch = it.ch || []; let s = '';
      for (let i = 0; i < 8; i++) { const k = it.ch[i], sx = X + 24 + i * 22, sy = Y + 40; if (k) { const p = pos(k); if (p) s += `<path d="M${sx},${sy} C${sx},${sy + 30} ${p.x},${p.y + 60} ${p.x},${p.y}" fill="none" stroke="${COL[i]}" stroke-width="2.4" pointer-events="none"/><rect x="${p.x - 3}" y="${p.y - 7}" width="6" height="12" rx="1" fill="${COL[i]}" stroke="#222" stroke-width=".6"/><text x="${p.x + 6}" y="${p.y - 8}" font-size="9" fill="${INK}">${i + 1}</text>`; }
        s += `<circle data-lach="${i}" data-item="${it.id}" cx="${sx}" cy="${sy}" r="6.5" fill="${k ? COL[i] : '#0e0f0f'}" stroke="#777" stroke-width="1.4" style="cursor:crosshair"><title>Canal ${i + 1}: arrastra hasta un agujero para conectarlo</title></circle><text x="${sx}" y="${Y + 24}" font-size="8" fill="#ddd" text-anchor="middle">${i + 1}</text>`; }
      const gx = X + 24 + 8 * 22 + 14, gk = it.gnd; if (gk) { const p = pos(gk); if (p) s += `<path d="M${gx},${Y + 40} C${gx},${Y + 70} ${p.x},${p.y + 60} ${p.x},${p.y}" fill="none" stroke="#1F2421" stroke-width="2.4" pointer-events="none"/><rect x="${p.x - 3}" y="${p.y - 7}" width="6" height="12" rx="1" fill="#1F2421" stroke="#000" stroke-width=".6"/><text x="${p.x + 6}" y="${p.y - 8}" font-size="9" fill="${INK}">GND</text>`; }
      s += `<circle data-lach="g" data-item="${it.id}" cx="${gx}" cy="${Y + 40}" r="6.5" fill="${gk ? '#1F2421' : '#0e0f0f'}" stroke="#777" stroke-width="1.4" style="cursor:crosshair"><title>Masa (GND): arrastra hasta un agujero de GND</title></circle><text x="${gx}" y="${Y + 24}" font-size="8" fill="#ddd" text-anchor="middle">GND</text>`;
      return G(`<g data-bbody="${it.id}" data-bx="${X}" data-by="${Y}" style="cursor:move"><rect x="${X}" y="${Y}" width="${24 + 8 * 22 + 42}" height="64" rx="6" fill="#2a2d2c" stroke="#111" stroke-width="1.5"/></g><rect x="${X + 6}" y="${Y + 6}" width="80" height="10" rx="2" fill="#B85D34"/><text x="${X + 10}" y="${Y + 14}" font-size="8" fill="#fff">LOGIC 8CH · 24 MHz</text>` + s + selr(X, Y, 24 + 8 * 22 + 42, 64)); }
    return '';
  }
  /* sonda lógica: H (alto), L (bajo) o Z (alta impedancia: nada fija el nodo, o tensión fuera de los niveles válidos) */
  lpState(it) {
    const n = this.nl.index(B.netOf(it.tip)), v = n == null ? 0 : this.sim.v[n];
    const vh = (this.board.mb && this.board.mb.on ? 0 : 0) || 2.0;
    if (n == null || (n > 0 && this.nl.deg && this.nl.deg[n] === 0)) return { s: 'Z', v, why: 'nada fija el nodo' };
    if (v >= vh) return { s: 'H', v }; if (v <= 0.8) return { s: 'L', v };
    return { s: 'Z', v, why: 'tensión indefinida' };
  }
  drawMcu(ctx) {
    const b = this.board.mcu, bd = B.BOARDS[b.board], bx = ctx.mcuBox, X = bx.x, Y = bx.y, W = bx.w, H = bx.h, uno = b.board === 'UNO'; let s = '';
    const L = this.mcuPart && this.mcuPart.ctl ? this.mcuPart.ctl.ledL : 0;
    s += uno ? MCUArt.uno(X, Y, L) : MCUArt.esp(X, Y, L, L);
    (ctx.dummies || []).forEach(p => { s += `<rect x="${p.x - 7}" y="${p.y - 7}" width="14" height="14" rx="2" fill="#3a3d3b" stroke="#111"/><text x="${p.x}" y="${p.y + (p.y < bx.y + bx.h / 2 ? 22 : -12)}" font-size="9" text-anchor="middle" fill="#cfe7e9" opacity=".7">${p.name}</text>`; });
    Object.entries(ctx.sockets).forEach(([k, p]) => { const hl = this.hover === k; s += `<rect data-k="${k}" x="${p.x - 7}" y="${p.y - 7}" width="14" height="14" rx="2" fill="${hl ? SAGE : '#d7d2c5'}" stroke="#111" style="cursor:crosshair"/><circle cx="${p.x}" cy="${p.y}" r="2.6" fill="#111" pointer-events="none"/><text x="${p.x}" y="${p.y + (p.y < bx.y + bx.h / 2 ? 22 : -12)}" font-size="9" text-anchor="middle" fill="#fff">${String(p.name).replace("GPIO", "IO").replace(/^GND\d$/, "GND").replace("3V3b", "3V3")}</text>`; });
    return s;
  }
  svgToImg() {
    let x0 = -230, y0 = -50, w = B.hx(COLS) + 310, h = (this.board.mcu ? 1040 : 480);
    const clone = this.svg.cloneNode(true); clone.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`); clone.setAttribute('width', w); clone.setAttribute('height', h); clone.setAttribute('xmlns', NS); clone.setAttribute('font-family', 'Arial');
    return { svg: new XMLSerializer().serializeToString(clone), w, h };
  }
  load(j) { this.board = JSON.parse(JSON.stringify(j)); this.sel = null; this.recompile(); this.showProps(); this.onChange && this.onChange('board'); }
};

root.Board = B;
})(window);
