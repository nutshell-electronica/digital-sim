/* Lógica programable didáctica: PROM, PLA, PAL (H y L) y GAL · 4 entradas, 4 salidas */
(function (root) {
'use strict';
const INK = '#1F2421', MUTE = '#696C69', HI = '#B85D34', SAL = '#6A7B6C', BD = '#E2DFD8', BG = '#F9F8F6', SOFT = '#E9EDE8';
const NOUT = 4, PERO = 4;
const KEYS = ['PROM', 'PLA', 'PALH', 'PALL', 'GAL'];
const DEVS = {
  PROM: { short: 'PROM', name: 'PROM 16×4', nPT: 16, lits: 8, otp: true, andP: false, orP: true, nota: 'Plano AND fijo (decodificador de las 16 combinaciones) + plano OR programable. Es una memoria: cada salida es una tabla de verdad completa.' },
  PLA: { short: 'PLA', name: 'PLA 4×12×4', nPT: 12, lits: 8, otp: true, andP: true, orP: true, nota: 'Plano AND y plano OR programables: 12 términos producto que se reparten entre las 4 salidas.' },
  PALH: { short: 'PAL-H', name: 'PAL 4×4×4 (activo a 1)', nPT: 16, lits: 8, otp: true, andP: true, orP: false, nota: 'Plano AND programable, plano OR fijo: 4 términos por salida, sin compartir. Salida activa a nivel alto (como un PAL16H8).' },
  PALL: { short: 'PAL-L', name: 'PAL 4×4×4 (activo a 0)', nPT: 16, lits: 8, otp: true, andP: true, orP: false, low: true, nota: 'Igual que el PAL-H pero con inversor fijo en cada salida (como un PAL16L8): lo que programas sale negado.' },
  GAL: { short: 'GAL', name: 'GAL 4×4×4 con OLMC', nPT: 16, lits: 16, otp: false, andP: true, orP: false, nota: 'Como el PAL, pero cada salida lleva una macrocelda programable (OLMC): polaridad, salida combinacional o registrada (biestable D) y realimentación. Borrable y reprogramable.' }
};
const mkS = (k) => ({ and: Array.from({ length: DEVS[k].nPT }, () => new Array(DEVS[k].lits).fill(0)), or: Array.from({ length: NOUT }, () => new Array(DEVS[k].nPT).fill(0)), reg: [0, 0, 0, 0], pol: [0, 0, 0, 0], locked: false, chips: 1, cycles: 0 });
const cloneS = (S) => JSON.parse(JSON.stringify(S));

/* ---------- evaluación ---------- */
const litVec = (x, fb, lits) => { const v = []; for (let i = 0; i < 4; i++) { v.push(x[i]); v.push(1 - x[i]); } if (lits > 8) for (let k = 0; k < 4; k++) { v.push(fb[k]); v.push(1 - fb[k]); } return v; };
function termsOf(k, S, x, fb) {
  if (k === 'PROM') { const m = x[0] * 8 + x[1] * 4 + x[2] * 2 + x[3]; return S.and.map((_, r) => +(r === m)); }
  const lv = litVec(x, fb, DEVS[k].lits);
  return S.and.map(row => { let any = 0, v = 1; for (let c = 0; c < row.length; c++) if (row[c]) { any = 1; v &= lv[c]; } return any ? v : 0; });
}
const sumsOf = (k, S, pt) => (k === 'PLA' || k === 'PROM') ? S.or.map(row => +row.some((c, r) => c && pt[r])) : [0, 1, 2, 3].map(o => +pt.slice(o * PERO, o * PERO + PERO).some(Boolean));
const pinsOf = (k, S, sum, q) => sum.map((s, o) => k === 'PALL' ? 1 - s : k === 'GAL' ? (S.reg[o] ? q[o] : s ^ S.pol[o]) : s);
function evaluate(k, S, x, q) {
  q = q || [0, 0, 0, 0]; let fb = k === 'GAL' ? q.map((v, o) => S.reg[o] ? v : 0) : [0, 0, 0, 0], pt, sum, pins, osc = false;
  for (let it = 0; it < 12; it++) { pt = termsOf(k, S, x, fb); sum = sumsOf(k, S, pt); pins = pinsOf(k, S, sum, q); if (k !== 'GAL' || pins.every((v, i) => v === fb[i])) break; fb = pins.slice(); if (it === 11) osc = true; }
  return { pt, sum, pins, fb, osc };
}
function clock(k, S, x, q) { if (k !== 'GAL') return q; const ev = evaluate(k, S, x, q), nq = q.slice(); for (let o = 0; o < NOUT; o++) if (S.reg[o]) nq[o] = ev.sum[o] ^ S.pol[o]; return nq; }

/* ---------- Quine–McCluskey (hasta 5–8 variables) ---------- */
function primesOf(ones) {
  let cur = new Map(ones.map(o => [o + '|0', { v: o, m: 0 }])), res = [];
  while (cur.size) {
    const arr = [...cur.values()], used = new Set(), nxt = new Map();
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { const a = arr[i], b = arr[j]; if (a.m !== b.m) continue; const d = a.v ^ b.v; if (d && !(d & (d - 1))) { const m = a.m | d, v = a.v & ~d; nxt.set(v + '|' + m, { v, m }); used.add(i); used.add(j); } }
    arr.forEach((p, i) => { if (!used.has(i)) res.push(p); }); cur = nxt;
  }
  return res;
}
const covers = (p, o) => ((o & ~p.m) === p.v);
function coverSet(ones, primes, pref, keyOf) {
  const left = new Set(ones), chosen = [];
  ones.forEach(o => { const ps = primes.filter(p => covers(p, o)); if (ps.length === 1 && !chosen.includes(ps[0])) chosen.push(ps[0]); });
  chosen.forEach(p => ones.forEach(o => covers(p, o) && left.delete(o)));
  while (left.size) { let best = null, bs = -1; for (const p of primes) { if (chosen.includes(p)) continue; let c = 0; left.forEach(o => covers(p, o) && c++); const s = c * 10 + (pref && pref.has(keyOf(p)) ? 6 : 0) - 0.01 * p.m; if (c && s > bs) { bs = s; best = p; } } chosen.push(best); left.forEach(o => covers(best, o) && left.delete(o)); }
  return chosen;
}
const impCols = (imp, vs) => { const cols = []; vs.forEach((g, i) => { if ((imp.m >> i) & 1) return; cols.push(2 * g + (((imp.v >> i) & 1) ? 0 : 1)); }); return cols.sort((a, b) => a - b); };

/* ---------- especificaciones y ajustador (fitter) ---------- */
const mkSpec = (vs, F, n, reg) => ({ vs, reg: !!reg, outs: Array.from({ length: n }, (_, k) => ({ k, reg: !!reg, f: (g) => F(g)[k] })) });
function tables(spec) { const n = spec.vs.length, N = 1 << n; return spec.outs.map(o => { const t = []; for (let m = 0; m < N; m++) { const g = new Array(8).fill(0); spec.vs.forEach((v, i) => g[v] = (m >> i) & 1); t.push(o.f(g) ? 1 : 0); } return t; }); }
function fit(key, spec, names) {
  const D = DEVS[key], S = mkS(key), r = { key, fits: true, why: '', counts: [], total: 0, S }, n = spec.vs.length, N = 1 << n, tt = tables(spec);
  const nm = (k) => (names && names.out[k]) || 'O' + k;
  const fail = (why) => { r.fits = false; r.why = why; r.S = null; return r; };
  if (spec.reg && key !== 'GAL') return fail('Necesita biestables (memoria): el ' + D.short + ' es puramente combinacional.');
  if (key !== 'GAL' && spec.vs.some(v => v > 3)) return fail('Necesita realimentar las salidas a la matriz; el ' + D.short + ' no tiene realimentación.');
  if (key === 'PROM') { if (spec.vs.some(v => v > 3)) return fail('La PROM sólo tiene 4 entradas de dirección.');
    spec.outs.forEach((o, i) => { for (let rr = 0; rr < 16; rr++) { const g = new Array(8).fill(0); [0, 1, 2, 3].forEach(b => g[b] = (rr >> (3 - b)) & 1); S.or[o.k][rr] = o.f(g) ? 1 : 0; } r.counts[o.k] = S.or[o.k].reduce((a, b) => a + b, 0); });
    r.total = 16; r.why = 'Siempre cabe: es una tabla de verdad (16 posiciones).'; return r; }
  const sets = spec.outs.map((o, i) => { const ones = [], zeros = []; tt[i].forEach((v, m) => (v ? ones : zeros).push(m)); return { o, ones, zeros }; });
  const keyOf = (p, vs) => impCols(p, vs).join(',');
  const imp = (list, pref) => { const pr = primesOf(list); return coverSet(list, pr, pref, (p) => keyOf(p, spec.vs)); };
  const constant = sets.some(s => s.ones.length === N);
  if (constant && key !== 'GAL' && key !== 'PALL') return fail('Una salida constante a 1 no se puede obtener con un término producto.');
  if (key === 'PLA') {
    const shared = new Set(), rows = new Map(), per = [];
    sets.forEach(s => { const c = s.ones.length ? imp(s.ones, shared) : []; c.forEach(p => shared.add(keyOf(p, spec.vs))); per.push(c); });
    per.forEach((c, i) => c.forEach(p => { const kk = keyOf(p, spec.vs); if (!rows.has(kk)) rows.set(kk, impCols(p, spec.vs)); r.counts[sets[i].o.k] = (r.counts[sets[i].o.k] || 0) + 1; }));
    r.total = rows.size; r.sum = per.reduce((a, c) => a + c.length, 0);
    if (rows.size > D.nPT) return fail(`Necesita ${rows.size} términos distintos; el PLA tiene ${D.nPT}.`);
    const idx = new Map(); [...rows.keys()].forEach((kk, i) => { idx.set(kk, i); rows.get(kk).forEach(c => S.and[i][c] = 1); });
    per.forEach((c, i) => c.forEach(p => S.or[sets[i].o.k][idx.get(keyOf(p, spec.vs))] = 1));
    r.why = `${rows.size} términos distintos (${r.sum} si no se compartieran).`; return r;
  }
  // PAL / GAL: términos fijos por salida
  const bad = [];
  sets.forEach((s, i) => {
    const k = s.o.k, a = s.ones.length ? imp(s.ones) : [], b = s.zeros.length ? imp(s.zeros) : [], cands = key === 'PALH' ? [[0, a]] : key === 'PALL' ? [[1, b]] : [[0, a], [1, b]];
    let pol = 0, list = null; cands.forEach(([p, l]) => { if (!list || l.length < list.length) { pol = p; list = l; } });
    r.counts[k] = list.length; r.counts['alt' + k] = key === 'GAL' ? (pol ? a.length : b.length) : null; r.counts['pol' + k] = pol;
    if (list.length > PERO) { bad.push(`${nm(k)} necesita ${list.length} términos${key === 'GAL' ? ' (' + Math.min(a.length, b.length) + ' con la mejor polaridad)' : ''} y cada salida sólo tiene ${PERO}`); return; }
    list.forEach((p, t) => impCols(p, spec.vs).forEach(c => S.and[k * PERO + t][c] = 1));
    if (key === 'GAL') { S.pol[k] = pol; S.reg[k] = s.o.reg ? 1 : 0; }
    r.total += list.length;
  });
  if (bad.length) return fail(bad.join('; ') + '.');
  r.why = key === 'GAL' ? 'Cabe eligiendo la polaridad de cada salida' + (spec.reg ? ' y registrándolas.' : '.') : 'Cabe.'; return r;
}
function fitAll(spec, names) { return KEYS.map(k => fit(k, spec, names)); }

/* ---------- comprobación del diseño frente a la especificación ---------- */
function check(key, S, spec, names) {
  const bad = [], seq = spec.reg || spec.vs.some(v => v > 3), nm = (k) => (names && names.out[k]) || 'O' + k, ni = (i) => (names && names.in[i]) || 'ABCD'[i];
  const N = 1 << spec.vs.length; let tested = 0;
  for (let m = 0; m < N; m++) {
    const g = new Array(8).fill(0); spec.vs.forEach((v, i) => g[v] = (m >> i) & 1); tested++;
    const x = g.slice(0, 4), q = g.slice(4, 8); let got;
    if (seq) { const ev = evaluate(key, S, x, q), nq = clock(key, S, x, q); got = spec.outs.map(o => o.reg ? (S.reg[o.k] ? nq[o.k] : -1) : ev.pins[o.k]); }
    else got = evaluate(key, S, x, q).pins;
    spec.outs.forEach((o, i) => { const want = o.f(g) ? 1 : 0, have = seq ? got[i] : got[o.k]; if (have !== want) bad.push({ m, k: o.k, want, have, g }); });
  }
  const desc = (b) => { const ins = spec.vs.map(v => v < 4 ? ni(v) + '=' + b.g[v] : 'Q' + (v - 4) + '=' + b.g[v]).join(' '); return `${ins} → ${nm(b.k)}: esperado ${b.want}, ${b.have < 0 ? 'salida no registrada' : 'obtenido ' + b.have}`; };
  return { ok: !bad.length, bad, n: tested, seq, text: bad.slice(0, 3).map(desc) };
}

/* ---------- ecuaciones de texto ---------- */
function parseEq(src, names) {
  const nameIdx = (id) => { id = id.toUpperCase(); for (let i = 0; i < 4; i++) { if (id === names.in[i].toUpperCase() || id === 'I' + i) return { t: 'in', i }; if (id === names.out[i].toUpperCase() || id === 'O' + i) return { t: 'out', i }; } return null; };
  const lines = src.replace(/\/\/[^\n]*/g, '').split(/[\n;]+/).map(s => s.trim()).filter(Boolean), outs = [], vset = new Set(); let err = null;
  for (const ln of lines) {
    const m = ln.match(/^([A-Za-z_]\w*)(\.[Dd])?\s*:?=\s*(.+)$/); if (!m) { err = `No entiendo «${ln}». Usa «NOMBRE = expresión» (por ejemplo F0 = A&B | !C).`; break; }
    const ref = nameIdx(m[1]); if (!ref || ref.t !== 'out') { err = `«${m[1]}» no es una salida del chip (${names.out.join(', ')}).`; break; }
    let pos = 0; const tok = []; const s = m[3];
    const re = /\s*([A-Za-z_]\w*|[01]|[!~\/&*·|+#^$()'])/y; let t; while (pos < s.length) { re.lastIndex = pos; t = re.exec(s); if (!t) { if (!s.slice(pos).trim()) break; err = `Símbolo no válido en «${s.slice(pos).trim()[0]}».`; break; } tok.push(t[1]); pos = re.lastIndex; } if (err) break;
    let p = 0; const peek = () => tok[p], isId = (x) => /^[A-Za-z_]/.test(x);
    const prim = () => { const x = tok[p++]; if (x === undefined) throw new Error('Expresión incompleta.');
      if (x === '(') { const e = or(); if (tok[p++] !== ')') throw new Error('Falta cerrar un paréntesis.'); return post(e); }
      if (x === '!' || x === '~' || x === '/') { const e = prim(); return (g) => 1 - e(g); }
      if (x === '0' || x === '1') return post(() => +x);
      if (isId(x)) { const r2 = nameIdx(x); if (!r2) throw new Error(`«${x}» no es una entrada ni una salida.`); const gi = r2.t === 'in' ? r2.i : 4 + r2.i; vset.add(gi); return post((g) => g[gi]); }
      throw new Error(`No esperaba «${x}».`); };
    const post = (e) => { let f = e; while (tok[p] === "'") { p++; const h = f; f = (g) => 1 - h(g); } return f; };
    const and = () => { let a = prim(); while (tok[p] === '&' || tok[p] === '*' || tok[p] === '·' || (tok[p] && (isId(tok[p]) || tok[p] === '(' || tok[p] === '!' || tok[p] === '~') && false)) { p++; const b = prim(), h = a; a = (g) => h(g) & b(g); } return a; };
    const xor = () => { let a = and(); while (tok[p] === '^' || tok[p] === '$') { p++; const b = and(), h = a; a = (g) => h(g) ^ b(g); } return a; };
    const or = () => { let a = xor(); while (tok[p] === '|' || tok[p] === '+' || tok[p] === '#') { p++; const b = xor(), h = a; a = (g) => h(g) | b(g); } return a; };
    let f; try { f = or(); if (p < tok.length) throw new Error(`No esperaba «${tok[p]}».`); } catch (e) { err = e.message; break; }
    outs.push({ k: ref.i, reg: !!m[2], f });
  }
  if (err) return { err };
  if (!outs.length) return { err: 'Escribe al menos una ecuación.' };
  const seen = new Set(); for (const o of outs) { if (seen.has(o.k)) return { err: `La salida ${names.out[o.k]} está definida dos veces.` }; seen.add(o.k); }
  outs.forEach(o => vset.add(0)); // evita vs vacío
  const vs = [...vset].sort((a, b) => a - b); return { spec: { vs, reg: outs.some(o => o.reg), outs } };
}

/* ---------- texto de ecuaciones a partir del mapa de fusibles ---------- */
function litName(c, names) { const i = c >> 1, comp = c & 1, base = i < 4 ? names.in[i] : names.out[i - 4]; return (comp ? '!' : '') + base; }
function eqText(k, S, names) {
  const D = DEVS[k], out = [];
  const rowTxt = (r) => { if (k === 'PROM') return null; const cs = []; S.and[r].forEach((v, c) => { if (v) cs.push(litName(c, names)); }); return cs.length ? cs.join('&') : null; };
  for (let o = 0; o < NOUT; o++) {
    let rows = []; if (k === 'PROM') { const ms = []; S.or[o].forEach((v, r) => { if (v) ms.push(r); }); out.push(`${names.out[o]} = Σm(${ms.join(', ') || '—'})`); continue; }
    if (k === 'PLA') S.or[o].forEach((v, r) => { if (v) rows.push(r); }); else for (let t = 0; t < PERO; t++) rows.push(o * PERO + t);
    const ts = rows.map(rowTxt).filter(Boolean); let rhs = ts.length ? ts.join(' | ') : '0';
    if (k === 'PALL') out.push(`${names.out[o]} = !(${rhs})`);
    else if (k === 'GAL') { const reg = S.reg[o]; out.push(`${S.pol[o] ? '!' : ''}${names.out[o]}${reg ? '.D' : ''} = ${rhs}${S.pol[o] ? '   // salida activa a 0 (XOR=1)' : ''}`); }
    else out.push(`${names.out[o]} = ${rhs}`);
  }
  return out.join('\n');
}
const fuseCount = (k, S) => { let c = 0; if (DEVS[k].andP) S.and.forEach(r => r.forEach(v => c += v)); if (DEVS[k].orP) S.or.forEach(r => r.forEach(v => c += v)); if (k === 'GAL') c += S.reg.reduce((a, b) => a + b, 0) + S.pol.reduce((a, b) => a + b, 0); return c; };
const fuseTotal = (k) => { const D = DEVS[k]; return (D.andP ? D.nPT * D.lits : 0) + (D.orP ? NOUT * D.nPT : 0) + (k === 'GAL' ? 8 : 0); };
const usedTerms = (k, S) => k === 'PROM' ? S.or.reduce((a, r) => a.map((v, i) => v | r[i]), new Array(16).fill(0)).reduce((a, b) => a + b, 0) : S.and.filter((r, i) => r.some(Boolean)).length;

/* ---------- ejercicios ---------- */
const EX = [
  { id: 'libre', title: 'Diseño libre', in: ['A', 'B', 'C', 'D'], out: ['F0', 'F1', 'F2', 'F3'], text: 'Haz clic en las cruces de la matriz para conectar literales a los términos producto, o escribe ecuaciones abajo y pulsa «Ajustar». Cambia de dispositivo con los botones de arriba para ver qué cabe en cada uno.' },
  { id: 'cmp', title: '1 · Comparador de 2 bits', in: ['A1', 'A0', 'B1', 'B0'], out: ['MAYOR', 'IGUAL', 'MENOR', 'O3'], spec: mkSpec([0, 1, 2, 3], (g) => { const a = g[0] * 2 + g[1], b = g[2] * 2 + g[3]; return [+(a > b), +(a === b), +(a < b)]; }, 3),
    text: 'Compara A = A1A0 con B = B1B0. MAYOR = 1 si A > B, IGUAL = 1 si A = B, MENOR = 1 si A < B. Impleméntalo en cada dispositivo y fíjate en cuántos términos producto gasta cada familia y cuántos fusibles hay que programar.' },
  { id: 'share', title: '2 · Términos comunes (PLA vs PAL)', in: ['A', 'B', 'C', 'D'], out: ['F0', 'F1', 'F2', 'F3'], spec: mkSpec([0, 1, 2, 3], (g) => { const ab = g[0] & g[1], cd = g[2] & g[3], nn = (1 - g[2]) & (1 - g[3]); return [ab | cd, ab | nn, cd | nn, ab | cd | nn]; }, 4),
    text: 'F0 = A·B + C·D · F1 = A·B + /C·/D · F2 = C·D + /C·/D · F3 = A·B + C·D + /C·/D. Hay sólo tres términos distintos repetidos en varias salidas. El PLA los programa una vez y los reparte en su plano OR; el PAL tiene que repetirlos en cada salida.' },
  { id: 'pol', title: '3 · Polaridad de salida (PAL vs GAL)', in: ['S1', 'S2', 'S3', 'S4'], out: ['DISCREP', 'COINC', 'O2', 'O3'], spec: mkSpec([0, 1, 2, 3], (g) => { const all = g[0] === g[1] && g[1] === g[2] && g[2] === g[3]; return [+!all, +all]; }, 2),
    text: 'Cuatro sensores redundantes S1…S4. DISCREP = 1 si NO coinciden todos; COINC = 1 si los cuatro coinciden. Una de las salidas se escribe con pocos términos en positivo y la otra con pocos términos en negativo: mira cuál cabe en un PAL-H, en un PAL-L y en un GAL.' },
  { id: 'cnt', title: '4 · Contador de 3 bits (sólo GAL)', in: ['EN', 'RST', 'I2', 'I3'], out: ['Q0', 'Q1', 'Q2', 'O3'], spec: mkSpec([0, 1, 4, 5, 6], (g) => { const q = g[4] + g[5] * 2 + g[6] * 4, n = g[1] ? 0 : g[0] ? (q + 1) & 7 : q; return [n & 1, (n >> 1) & 1, (n >> 2) & 1]; }, 3, true),
    text: 'Contador síncrono ascendente de 3 bits Q2Q1Q0. Con EN = 1 cuenta en cada flanco de CLK; RST = 1 lo pone a cero (prioritario). Necesita memoria: sólo la macrocelda registrada del GAL la ofrece. Escribe cada D como función de EN, RST y la realimentación Q.' }
];

/* ---------- interfaz ---------- */
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const bits = (a) => a.join('');
class PldUI {
  constructor(el, app) {
    this.el = el; this.app = app; this.key = 'PLA'; this.S = {}; KEYS.forEach(k => this.S[k] = mkS(k)); this.x = [0, 0, 0, 0]; this.q = [0, 0, 0, 0]; this.ex = 'libre'; this.eq = ''; this.log = []; this.msg = ''; this.auto = false; this.nclk = 0;
    el.innerHTML = `<div class="pld"><div class="pld-l"><div class="pld-bar" id="pld-dev"></div><div class="pld-sv"><svg id="pldsv" width="100%"></svg></div><p class="mut sm" id="pld-leg"></p></div>
      <div class="pld-r"><div class="pal-h">Ejercicio</div><select id="pld-ex" class="sel"></select><p id="pld-text" class="sm"></p>
        <div class="pal-h">Pines de prueba</div><div id="pld-pins"></div>
        <div id="pld-eqbox"><div class="pal-h">Ecuaciones</div><textarea id="pld-eq" spellcheck="false" rows="4" placeholder="F0 = A&B | !C&D"></textarea></div>
        <div class="row"><button class="b sm prim" data-p="fit">Ajustar ecuaciones al chip</button><button class="b sm" data-p="sol">Rellenar solución</button><button class="b sm" data-p="chk">Comprobar</button><button class="b sm" data-p="clr">Borrar mapa</button></div>
        <div id="pld-res" class="sm"></div>
        <div class="pal-h">¿En qué dispositivos cabe?</div><div id="pld-cmp"></div>
        <div class="pal-h">Chip</div><div id="pld-chip" class="sm"></div>
        <div class="pal-h">Ecuaciones del mapa</div><pre id="pld-eqs" class="code sm"></pre>
        <div class="pal-h">Tabla de verdad / secuencia</div><div id="pld-tt"></div>
        <div class="row"><button class="b sm prim" data-p="rep">Enviar al informe</button></div></div></div>`;
    this.buildStatic(); this.bind(); this.render();
  }
  get names() { const e = EX.find(z => z.id === this.ex); return { in: e.in, out: e.out }; }
  get spec() { const e = EX.find(z => z.id === this.ex); if (e.spec) return e.spec; const p = this.eq.trim() ? parseEq(this.eq, this.names) : null; return p && p.spec ? p.spec : null; }
  get cur() { return this.S[this.key]; }
  buildStatic() {
    const $ = (s) => this.el.querySelector(s);
    $('#pld-ex').innerHTML = EX.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
    $('#pld-dev').innerHTML = KEYS.map(k => `<button class="b sm" data-k="${k}" title="${esc(DEVS[k].nota)}">${DEVS[k].short}</button>`).join('') + '<span class="pld-name" id="pld-dn"></span>';
  }
  bind() {
    const $ = (s) => this.el.querySelector(s), svg = $('#pldsv');
    $('#pld-dev').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { this.key = b.dataset.k; this.q = [0, 0, 0, 0]; this.log = []; this.msg = ''; this.render(); this.changed(); } });
    $('#pld-ex').onchange = (e) => { this.ex = e.target.value; this.msg = ''; this.render(); this.changed(); };
    $('#pld-eq').oninput = (e) => { this.eq = e.target.value; this.msg = ''; this.renderCmp(); this.changed(); };
    svg.addEventListener('click', (e) => this.onSvg(e.target));
    this.el.querySelector('.pld-r').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'), s = e.target.closest('[data-sw]'), f = e.target.closest('[data-fit]');
      if (s) { this.x[+s.dataset.sw] ^= 1; this.render(); return; }
      if (f) { this.apply(f.dataset.fit); return; }
      if (!b) return; const a = b.dataset.p;
      if (a === 'clk') { this.pulse(); return; } if (a === 'auto') { this.auto = !this.auto; this.render(); return; }
      if (a === 'fit') { this.fitEq(); return; } if (a === 'sol') { this.apply(this.key); return; } if (a === 'chk') { this.doCheck(); return; }
      if (a === 'clr') { if (this.cur.locked) { this.msg = 'El chip está programado: no se puede borrar.'; this.render(); return; } const l = this.cur; this.S[this.key] = Object.assign(mkS(this.key), { chips: l.chips, cycles: l.cycles }); this.q = [0, 0, 0, 0]; this.msg = ''; this.render(); this.changed(); return; }
      if (a === 'burn') { if (!confirm(DEVS[this.key].otp ? 'Programar quema los fusibles de forma IRREVERSIBLE. Después ya no podrás modificar este chip (tendrás que pedir uno nuevo). ¿Programar?' : 'Programar el GAL (puedes borrarlo y reprogramarlo más veces).')) return; this.cur.locked = true; if (!DEVS[this.key].otp) this.cur.cycles++; this.msg = DEVS[this.key].otp ? 'Chip programado: los fusibles quemados ya no se pueden restaurar.' : 'GAL programado (ciclo ' + this.cur.cycles + ').'; this.render(); this.changed(); return; }
      if (a === 'new') { const c = this.cur.chips + 1; this.S[this.key] = Object.assign(mkS(this.key), { chips: c }); this.q = [0, 0, 0, 0]; this.msg = 'Chip nuevo en blanco (nº ' + c + ').'; this.render(); this.changed(); return; }
      if (a === 'erase') { this.S[this.key] = Object.assign(mkS(this.key), { chips: this.cur.chips, cycles: this.cur.cycles }); this.q = [0, 0, 0, 0]; this.msg = 'GAL borrado (ciclos de programación: ' + this.cur.cycles + ' de ≈100 000).'; this.render(); this.changed(); return; }
      if (a === 'rep') { this.app.pldText = this.reportText(); this.app.caps.pld = this.capture(); this.app.go('report'); }
    });
    this._t = setInterval(() => { if (this.auto && this.el.offsetParent) this.pulse(); }, 700);
  }
  changed() { this.app.touch && this.app.touch('fpga'); this.app.pldText = this.hasWork() ? this.reportText() : ''; }
  hasWork() { return KEYS.some(k => fuseCount(k, this.S[k]) > 0); }
  onSvg(t) {
    const g = (c) => t.closest(c), S = this.cur, k = this.key;
    const inp = g('.xin'); if (inp) { this.x[+inp.dataset.i] ^= 1; this.render(); return; }
    const tg = g('.tg'); if (tg) { if (S.locked) return this.blocked(); const o = +tg.dataset.o; if (tg.dataset.t === 'pol') S.pol[o] ^= 1; else { S.reg[o] ^= 1; this.q[o] = 0; } this.render(); this.changed(); return; }
    const xp = g('.xp'); if (xp) { if (S.locked) return this.blocked(); const r = +xp.dataset.r, c = +xp.dataset.c; S.and[r][c] ^= 1; this.render(); this.changed(); return; }
    const xo = g('.xo'); if (xo) { if (S.locked) return this.blocked(); const o = +xo.dataset.o, r = +xo.dataset.r; S.or[o][r] ^= 1; this.render(); this.changed(); }
  }
  blocked() { this.msg = DEVS[this.key].otp ? 'Chip ya programado: los fusibles quemados no se pueden recuperar. Pide un chip nuevo.' : 'El GAL está programado: bórralo para modificarlo.'; this.renderRes(); }
  pulse() { if (this.key !== 'GAL') { this.msg = 'Sólo el GAL tiene biestables: este dispositivo es combinacional y no usa reloj.'; this.renderRes(); return; } const old = this.q.slice(); this.q = clock(this.key, this.cur, this.x, this.q); this.nclk++; this.log.push(`CLK ${this.nclk}: ${this.names.out.slice(0, 3).slice().reverse().join('')}=${old.slice(0, 3).reverse().join('')} → ${this.q.slice(0, 3).reverse().join('')}   (${this.names.in.map((n, i) => n + '=' + this.x[i]).slice(0, 2).join(' ')})`); this.log = this.log.slice(-8); this.render(); }
  fitEq() { if (this.ex !== 'libre') { this.msg = 'Las ecuaciones se escriben en el modo «Diseño libre».'; this.renderRes(); return; } const p = parseEq(this.eq, this.names); if (p.err) { this.msg = '✘ ' + p.err; this.renderRes(); return; } this.apply(this.key, p.spec); }
  apply(key, spec) { spec = spec || this.spec; if (!spec) { this.msg = 'Primero escribe ecuaciones (modo «Diseño libre»).'; this.renderRes(); return; }
    this.key = key; if (this.cur.locked) { this.msg = 'El chip está programado: pide uno nuevo (o bórralo si es GAL) antes de rellenar.'; this.render(); return; }
    const r = fit(key, spec, this.names); if (!r.fits) { this.msg = `✘ No cabe en el ${DEVS[key].short}: ${r.why}`; this.render(); return; }
    this.S[key] = Object.assign(r.S, { chips: this.cur.chips, cycles: this.cur.cycles }); this.q = [0, 0, 0, 0]; this.log = []; this.msg = `✔ Mapa de fusibles rellenado en el ${DEVS[key].short}. ${r.why}`; this.render(); this.changed(); }
  doCheck() { const spec = this.spec; if (!spec) { this.msg = 'No hay función de referencia: elige un ejercicio o escribe ecuaciones.'; this.renderRes(); return; }
    const c = check(this.key, this.cur, spec, this.names); this.msg = c.ok ? `✔ Correcto en las ${c.n} combinaciones${c.seq ? ' (estado actual × entradas)' : ''}. Términos usados: ${usedTerms(this.key, this.cur)} · fusibles conectados: ${fuseCount(this.key, this.cur)}.` : `✘ ${c.bad.length} fallo(s) de ${c.n}:\n` + c.text.join('\n'); this.renderRes(); }
  /* ----- dibujo ----- */
  draw() {
    const k = this.key, D = DEVS[k], S = this.cur, ev = evaluate(k, S, this.x, this.q), nm = this.names, cw = 18, rh = 18, X0 = 50, TOP = 92, nL = D.lits, nR = D.nPT;
    const xc = (c) => X0 + c * cw + cw / 2, yr = (r) => TOP + r * rh + rh / 2, bottom = TOP + nR * rh, plX = X0 + nL * cw;
    let s = '', maxX = plX + 30;
    const T = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.s || 9}" fill="${o.c || INK}" text-anchor="${o.a || 'middle'}" ${o.b ? 'font-weight="700"' : ''} pointer-events="none">${esc(t)}</text>`;
    const sh = (n) => n.length > 6 ? n.slice(0, 5) + '…' : n, col = (v) => v ? HI : '#1F242155', lw = (v) => v ? 1.8 : 1;
    const lits = litVec(this.x, ev.fb, nL);
    // entradas (arriba)
    for (let i = 0; i < 4; i++) {
      const xt = xc(2 * i), xcm = xc(2 * i + 1), xm = (xt + xcm) / 2;
      s += T(xm, 12, nm.in[i], { b: 1, s: 10 }) + `<g class="xin" data-i="${i}" style="cursor:pointer"><rect x="${xm - 9}" y="17" width="18" height="16" rx="3" fill="${this.x[i] ? HI : BG}" stroke="${INK}"/>${T(xm, 29, this.x[i], { c: this.x[i] ? '#fff' : INK, b: 1, s: 11 })}</g>`;
      s += `<path d="M${xm},33 V44" stroke="${col(this.x[i])}" stroke-width="${lw(this.x[i])}" fill="none"/><path d="M${xm - 6},44 H${xm + 6} L${xm},56 Z" fill="${BG}" stroke="${INK}"/>`;
      s += `<path d="M${xm},56 V62 M${xt},62 H${xm}" stroke="${col(this.x[i])}" fill="none" stroke-width="${lw(this.x[i])}"/><path d="M${xm},62 H${xcm}" stroke="${col(this.x[i])}" fill="none" stroke-width="${lw(this.x[i])}"/>`;
      s += `<path d="M${xt},62 V${TOP - 6}" stroke="${col(this.x[i])}" stroke-width="${lw(this.x[i])}" fill="none"/><circle cx="${xcm}" cy="68" r="3" fill="${BG}" stroke="${INK}"/><path d="M${xcm},62 V65 M${xcm},71 V${TOP - 6}" stroke="${col(1 - this.x[i])}" stroke-width="${lw(1 - this.x[i])}" fill="none"/>`;
    }
    // columnas (continuación) y filas
    for (let c = 0; c < nL; c++) if (c < 8 || true) s += `<path d="M${xc(c)},${TOP - 6} V${bottom}" stroke="${col(lits[c])}" stroke-width="${lw(lits[c])}" fill="none"/>`;
    const orX0 = plX + 28, xo = (o) => orX0 + o * (cw + 6) + cw / 2, gx = plX + 22;
    for (let r = 0; r < nR; r++) {
      const act = ev.pt[r], x2 = (k === 'PLA' || k === 'PROM') ? xo(3) + cw / 2 + 4 : gx + 4;
      s += `<path d="M${X0 - 8},${yr(r)} H${x2}" stroke="${col(act)}" stroke-width="${lw(act)}" fill="none"/>` + T(X0 - 14, yr(r) + 3, 'T' + r, { a: 'end', s: 7, c: MUTE });
      if (D.andP || k === 'PROM') for (let c = 0; c < nL; c++) {
        const on = k === 'PROM' ? (((r >> (3 - (c >> 1))) & 1) ? (c & 1) === 0 : (c & 1) === 1) && c < 8 : S.and[r][c];
        if (on) s += k === 'PROM' ? `<circle cx="${xc(c)}" cy="${yr(r)}" r="2.4" fill="${INK}"/>` : `<path d="M${xc(c) - 4},${yr(r) - 4} l8,8 m0,-8 l-8,8" stroke="${INK}" stroke-width="1.8" fill="none"/>`;
        else if (k !== 'PROM') s += `<circle cx="${xc(c)}" cy="${yr(r)}" r="1.4" fill="#1F242133"/>`;
        if (k !== 'PROM') s += `<rect class="xp" data-r="${r}" data-c="${c}" x="${xc(c) - cw / 2}" y="${yr(r) - rh / 2}" width="${cw}" height="${rh}" fill="transparent" style="cursor:${S.locked ? 'not-allowed' : 'pointer'}"/>`;
      }
    }
    if (k === 'PAL' || k === 'PALH' || k === 'PALL' || k === 'GAL') for (let o = 1; o < NOUT; o++) s += `<path d="M${X0 - 8},${TOP + o * PERO * rh} H${plX}" stroke="${SAL}" stroke-dasharray="3 3" fill="none"/>`;
    let yEnd = bottom;
    if (k === 'PLA' || k === 'PROM') {
      for (let o = 0; o < NOUT; o++) {
        s += `<path d="M${xo(o)},${TOP - 6} V${bottom + 14}" stroke="${col(ev.sum[o])}" stroke-width="${lw(ev.sum[o])}" fill="none"/>`;
        for (let r = 0; r < nR; r++) {
          if (S.or[o][r]) s += `<path d="M${xo(o) - 4},${yr(r) - 4} l8,8 m0,-8 l-8,8" stroke="${INK}" stroke-width="1.8" fill="none"/>`; else s += `<circle cx="${xo(o)}" cy="${yr(r)}" r="1.4" fill="#1F242133"/>`;
          s += `<rect class="xo" data-o="${o}" data-r="${r}" x="${xo(o) - cw / 2}" y="${yr(r) - rh / 2}" width="${cw}" height="${rh}" fill="transparent" style="cursor:${S.locked ? 'not-allowed' : 'pointer'}"/>`;
        }
        const yy = bottom + 28, v = ev.pins[o]; s += `<path d="M${xo(o)},${bottom + 14} V${yy - 8}" stroke="${col(v)}" fill="none"/><circle cx="${xo(o)}" cy="${yy}" r="7" fill="${v ? HI : BG}" stroke="${INK}"/>` + T(xo(o), yy + 20, sh(nm.out[o]), { b: 1, s: 9 });
      }
      maxX = xo(3) + 40; yEnd = bottom + 52;
    } else {
      for (let o = 0; o < NOUT; o++) {
        const y0 = TOP + o * PERO * rh + 3, y1 = TOP + (o + 1) * PERO * rh - 3, ym = (y0 + y1) / 2, v = ev.sum[o];
        s += `<path d="M${gx},${y0} Q${gx + 10},${ym} ${gx},${y1} L${gx + 8},${y1} C${gx + 34},${y1} ${gx + 44},${ym + 8} ${gx + 50},${ym} C${gx + 44},${ym - 8} ${gx + 34},${y0} ${gx + 8},${y0} Z" fill="${v ? '#F3DCCF' : 'none'}" stroke="${INK}"/>`;
        if (k === 'PALH' || k === 'PALL') {
          const px = gx + 100, pv = ev.pins[o]; s += `<path d="M${gx + 50},${ym} H${gx + (k === 'PALL' ? 62 : 100)}" stroke="${col(v)}" fill="none"/>`;
          if (k === 'PALL') s += `<circle cx="${gx + 65}" cy="${ym}" r="3" fill="${BG}" stroke="${INK}"/><path d="M${gx + 68},${ym} H${px}" stroke="${col(pv)}" fill="none"/>`;
          s += `<circle cx="${px + 8}" cy="${ym}" r="7" fill="${pv ? HI : BG}" stroke="${INK}"/>` + T(px + 22, ym + 3, nm.out[o], { b: 1, a: 'start' }); maxX = Math.max(maxX, px + 90);
        } else {
          const ox = gx + 56, pv = ev.pins[o], reg = S.reg[o], pol = S.pol[o], px = ox + 100;
          s += `<rect x="${ox - 4}" y="${y0 - 2}" width="124" height="${y1 - y0 + 4}" rx="4" fill="${SOFT}" stroke="${SAL}"/>` + T(ox + 20, y1 - 3, 'OLMC ' + o, { s: 7, c: SAL });
          s += `<path d="M${gx + 50},${ym} H${ox + 12}" stroke="${col(v)}" fill="none"/><circle cx="${ox + 20}" cy="${ym}" r="7" fill="${BG}" stroke="${INK}"/><path d="M${ox + 15},${ym} h10 M${ox + 20},${ym - 5} v10" stroke="${INK}" fill="none"/>`;
          s += `<g class="tg" data-t="pol" data-o="${o}" style="cursor:pointer"><rect x="${ox + 12}" y="${ym - 24}" width="16" height="13" rx="2" fill="${pol ? HI : BG}" stroke="${INK}"/>${T(ox + 20, ym - 14, pol, { c: pol ? '#fff' : INK, b: 1, s: 9 })}</g><path d="M${ox + 20},${ym - 11} V${ym - 7}" stroke="${INK}" fill="none"/>`;
          s += `<path d="M${ox + 27},${ym} H${ox + 40}" stroke="${col(v ^ pol)}" fill="none"/><rect x="${ox + 40}" y="${ym - 11}" width="24" height="22" rx="2" fill="${reg ? '#fff' : 'none'}" stroke="${INK}" ${reg ? '' : 'stroke-dasharray="3 2" opacity=".55"'}/>` + T(ox + 52, ym + 4, 'D  Q', { s: 8, c: reg ? INK : MUTE }) + `<path d="M${ox + 40},${ym + 7} l4,-3 l-4,-3" stroke="${INK}" fill="none" ${reg ? '' : 'opacity=".4"'}/>`;
          s += `<path d="M${ox + 64},${ym} H${px}" stroke="${col(pv)}" fill="none"/>` + (reg ? '' : `<path d="M${ox + 34},${ym} v-16 H${ox + 70} V${ym} " stroke="${col(v ^ pol)}" fill="none" stroke-dasharray="2 2" opacity="0"/>`);
          s += `<g class="tg" data-t="reg" data-o="${o}" style="cursor:pointer"><rect x="${ox + 38}" y="${ym - 25}" width="28" height="12" rx="2" fill="${reg ? HI : BG}" stroke="${INK}"/>${T(ox + 52, ym - 16, reg ? 'REG' : 'COMB', { c: reg ? '#fff' : INK, b: 1, s: 7 })}</g>`;
          s += `<circle cx="${px + 8}" cy="${ym}" r="7" fill="${pv ? HI : BG}" stroke="${INK}"/>` + T(px + 22, ym + 3, nm.out[o], { b: 1, a: 'start' });
          // realimentación por abajo
          const rx = px + 52 + o * 7, yb = bottom + 40 + o * 7, xt = xc(8 + 2 * o), xcm = xc(9 + 2 * o), xm = (xt + xcm) / 2, fv = ev.fb[o];
          s += `<path d="M${px + 15},${ym} H${rx} V${yb} H${xm} V${bottom + 22}" stroke="${col(fv)}" stroke-width="${lw(fv)}" fill="none"/><circle cx="${px + 15}" cy="${ym}" r="1.8" fill="${INK}"/>`;
          maxX = Math.max(maxX, px + 100);
        }
      }
      if (k === 'GAL') for (let o = 0; o < NOUT; o++) { const xt = xc(8 + 2 * o), xcm = xc(9 + 2 * o), xm = (xt + xcm) / 2, fv = ev.fb[o]; s += `<path d="M${xm - 6},${bottom + 22} H${xm + 6} L${xm},${bottom + 10} Z" fill="${BG}" stroke="${INK}"/><path d="M${xt},${bottom + 4} H${xm}" stroke="${col(fv)}" fill="none"/><path d="M${xt},${bottom + 4} V${bottom}" stroke="${col(fv)}" fill="none"/><path d="M${xm},${bottom + 4} H${xcm - 0} V${bottom + 4}" stroke="${col(1 - fv)}" fill="none"/><circle cx="${xcm}" cy="${bottom + 8}" r="3" fill="${BG}" stroke="${INK}"/><path d="M${xcm},${bottom + 4} V${bottom + 5} M${xcm},${bottom + 11} V${bottom}" stroke="${col(1 - fv)}" fill="none"/>` + T(xm, bottom + 33, sh(nm.out[o]), { s: 8, c: MUTE }); yEnd = bottom + 70; }
      else yEnd = bottom + 20;
    }
    const sv = this.el.querySelector('#pldsv'); sv.setAttribute('viewBox', `0 0 ${maxX + 20} ${yEnd + 16}`); sv.setAttribute('style', 'max-height:' + Math.min(720, (yEnd + 16) * 1.6) + 'px'); sv.style.setProperty('--w', (maxX + 20) + 'px'); sv.innerHTML = s; this._dim = { w: maxX + 20, h: yEnd + 16 };
  }
  /* ----- paneles ----- */
  render() {
    const $ = (s) => this.el.querySelector(s), k = this.key, D = DEVS[k], S = this.cur, e = EX.find(z => z.id === this.ex);
    this.el.querySelectorAll('#pld-dev [data-k]').forEach(b => { b.classList.toggle('prim', b.dataset.k === k); });
    $('#pld-dn').textContent = D.name; $('#pld-ex').value = this.ex; $('#pld-text').textContent = e.text; $('#pld-eqbox').hidden = this.ex !== 'libre'; if ($('#pld-eq') !== document.activeElement) $('#pld-eq').value = this.eq;
    $('#pld-leg').innerHTML = `${esc(D.nota)}<br>Cruz = fusible conectado (el literal participa en el término). Término sin cruces = no usado (vale 0). Clic en una cruz para programarla; clic en una entrada para cambiarla.`;
    this.draw(); this.renderPins(); this.renderChip(); this.renderRes(); this.renderCmp(); this.renderEq(); this.renderTT();
    const ev = evaluate(k, S, this.x, this.q); this.el.querySelector('#pld-res').dataset.osc = ev.osc ? 1 : 0;
    this.app.pldText = this.hasWork() ? this.reportText() : '';
  }
  renderPins() { const nm = this.names, ev = evaluate(this.key, this.cur, this.x, this.q);
    this.el.querySelector('#pld-pins').innerHTML = `<div class="pld-pins">${this.x.map((v, i) => `<button class="b sm ${v ? 'prim' : ''}" data-sw="${i}">${esc(nm.in[i])} = ${v}</button>`).join('')}</div><div class="pld-pins">${ev.pins.map((v, o) => `<span class="pld-led"><i class="${v ? 'on' : ''}"></i>${esc(nm.out[o])}</span>`).join('')}</div>` +
      (this.key === 'GAL' ? `<div class="pld-pins"><button class="b sm" data-p="clk">▲ CLK</button><label class="chk"><input type="checkbox" ${this.auto ? 'checked' : ''} data-p="auto"> reloj automático</label></div>` : '') + (ev.osc ? '<p class="warn sm">⚠ La realimentación combinacional no se estabiliza (oscila).</p>' : ''); }
  renderRes() { const r = this.el.querySelector('#pld-res'); r.textContent = this.msg; r.className = 'sm pld-msg ' + (this.msg.startsWith('✔') ? 'ok' : this.msg ? 'ko' : ''); }
  renderChip() { const k = this.key, D = DEVS[k], S = this.cur, used = usedTerms(k, S);
    this.el.querySelector('#pld-chip').innerHTML = `<table class="gt"><tr><td>Términos usados</td><td><b>${used}</b> de ${D.nPT}</td></tr><tr><td>${k === 'GAL' ? 'Celdas' : 'Fusibles'} conectados</td><td><b>${fuseCount(k, S)}</b> de ${fuseTotal(k)} programables</td></tr><tr><td>Tecnología</td><td>${D.otp ? 'fusibles (OTP: se programa una sola vez)' : 'E²CMOS (borrable y reprogramable)'}</td></tr><tr><td>Estado</td><td>${S.locked ? '<b>programado</b>' : 'en blanco / editable'} · chip nº ${S.chips}${D.otp ? '' : ' · ciclos ' + S.cycles}</td></tr></table>` +
      `<div class="row">${S.locked ? (D.otp ? '<button class="b sm" data-p="new">Pedir chip nuevo</button>' : '<button class="b sm" data-p="erase">Borrar GAL</button>') : '<button class="b sm prim" data-p="burn">Programar chip</button>'}</div>`; }
  renderCmp() { const spec = this.spec, box = this.el.querySelector('#pld-cmp');
    if (!spec) { box.innerHTML = '<p class="mut sm">Elige un ejercicio o escribe ecuaciones para ver en qué dispositivos cabe.</p>'; return; }
    const rs = fitAll(spec, this.names);
    box.innerHTML = `<table class="gt pld-cmp"><tr><th>Dispositivo</th><th>¿Cabe?</th><th>Términos</th><th></th></tr>${rs.map(r => `<tr class="${r.key === this.key ? 'cur' : ''}"><td>${DEVS[r.key].short}</td><td>${r.fits ? '<b class="okc">sí</b>' : '<b class="koc">no</b>'}</td><td>${r.fits ? r.total + (r.key === 'PLA' && r.sum !== r.total ? ' <span class="mut">(' + r.sum + ' sin compartir)</span>' : '') : '—'}</td><td><button class="b sm" data-fit="${r.key}" ${r.fits ? '' : 'disabled'}>Rellenar</button></td></tr><tr class="why"><td colspan="4">${esc(r.why)}</td></tr>`).join('')}</table>`; }
  renderEq() { this.el.querySelector('#pld-eqs').textContent = eqText(this.key, this.cur, this.names); }
  renderTT() { const k = this.key, S = this.cur, nm = this.names, box = this.el.querySelector('#pld-tt'), seq = k === 'GAL' && S.reg.some(Boolean);
    if (seq || (k === 'GAL' && S.and.some(r => r.slice(8).some(Boolean)))) { box.innerHTML = `<p class="mut sm">Hay memoria o realimentación: se muestra la secuencia de reloj.</p><pre class="code sm">${esc(this.log.length ? this.log.join('\n') : 'Pulsa ▲ CLK para ver la evolución del estado.')}</pre>`; return; }
    let h = `<table class="gt pld-tt"><tr>${nm.in.map(n => `<th>${esc(n)}</th>`).join('')}${nm.out.map(n => `<th class="o">${esc(n)}</th>`).join('')}</tr>`; const cur = this.x[0] * 8 + this.x[1] * 4 + this.x[2] * 2 + this.x[3];
    for (let m = 0; m < 16; m++) { const x = [m >> 3 & 1, m >> 2 & 1, m >> 1 & 1, m & 1], p = evaluate(k, S, x, [0, 0, 0, 0]).pins; h += `<tr class="${m === cur ? 'cur' : ''}">${x.map(b => `<td>${b}</td>`).join('')}${p.map(b => `<td class="o">${b}</td>`).join('')}</tr>`; }
    box.innerHTML = h + '</table>'; }
  reportText() { const k = this.key, S = this.cur, D = DEVS[k]; return `Dispositivo: ${D.name}\nEjercicio: ${EX.find(z => z.id === this.ex).title}\nTérminos usados: ${usedTerms(k, S)} de ${D.nPT} · conexiones programadas: ${fuseCount(k, S)} de ${fuseTotal(k)}\nEstado: ${S.locked ? 'chip programado' : 'sin programar'}\n\nEcuaciones:\n${eqText(k, S, this.names)}`; }
  capture() { const sv = this.el.querySelector('#pldsv'); if (!sv || !this._dim) return null; const c = sv.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', this._dim.w); c.setAttribute('height', this._dim.h); c.setAttribute('font-family', 'Arial'); c.removeAttribute('style'); return { svg: new XMLSerializer().serializeToString(c), w: this._dim.w, h: this._dim.h }; }
  toJSON() { return { key: this.key, S: this.S, x: this.x, q: this.q, ex: this.ex, eq: this.eq }; }
  load(j) { if (!j) return this.reset(); this.key = KEYS.includes(j.key) ? j.key : 'PLA'; KEYS.forEach(k => { this.S[k] = (j.S && j.S[k]) ? Object.assign(mkS(k), j.S[k]) : mkS(k); }); this.x = j.x || [0, 0, 0, 0]; this.q = j.q || [0, 0, 0, 0]; this.ex = EX.some(e => e.id === j.ex) ? j.ex : 'libre'; this.eq = j.eq || ''; this.log = []; this.msg = ''; this.render(); }
  reset() { this.key = 'PLA'; KEYS.forEach(k => this.S[k] = mkS(k)); this.x = [0, 0, 0, 0]; this.q = [0, 0, 0, 0]; this.ex = 'libre'; this.eq = ''; this.log = []; this.msg = ''; this.auto = false; this.render(); }
}
root.PLD = { DEVS, KEYS, EX, mkS, evaluate, clock, fit, fitAll, check, parseEq, eqText, primesOf, fuseCount, fuseTotal, usedTerms, mkSpec };
root.PldUI = PldUI;
})(typeof window !== 'undefined' ? window : globalThis);
