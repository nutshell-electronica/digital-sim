/* Karnaugh · Quine-McCluskey · tablas de verdad · generación de circuitos */
(function (root) {
'use strict';
const KM = {};
const pop = (x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };

/* ---- Quine-McCluskey ---- */
KM.primes = function (n, ones, dcs) {
  let cur = new Map();
  [...ones, ...dcs].forEach(m => cur.set(m + ':0', { v: m, m: 0 }));
  const primes = [];
  while (cur.size) {
    const list = [...cur.values()], used = new Set(), next = new Map();
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.m !== b.m) continue;
      const d = a.v ^ b.v; if (pop(d) !== 1) continue;
      const q = { v: a.v & ~d, m: a.m | d }; next.set(q.v + ':' + q.m, q); used.add(i); used.add(j);
    }
    list.forEach((q, i) => { if (!used.has(i)) primes.push(q); });
    cur = next;
  }
  return primes;
};
const covers = (q, m) => ((m & ~q.m) === q.v);
const lits = (q, n) => n - pop(q.m);
KM.minimize = function (n, ones, dcs) {
  if (!ones.length) return { cover: [], primes: [], terms: [], zero: true };
  if (ones.length + dcs.length === (1 << n) && ones.length + dcs.length > 0 && ones.length > 0) {
    const all = { v: 0, m: (1 << n) - 1 }; return { cover: [all], primes: [all], terms: [all], one: true };
  }
  const primes = KM.primes(n, ones, dcs);
  let rem = new Set(ones); const chosen = [];
  // esenciales
  ones.forEach(m => { const c = primes.filter(q => covers(q, m)); if (c.length === 1 && !chosen.includes(c[0])) chosen.push(c[0]); });
  chosen.forEach(q => ones.forEach(m => { if (covers(q, m)) rem.delete(m); }));
  if (rem.size) {
    const cand = primes.filter(q => !chosen.includes(q) && [...rem].some(m => covers(q, m)));
    let best = null;
    const remA = [...rem];
    const rec = (i, sel, left) => {
      if (best && (sel.length > best.sel.length || (sel.length === best.sel.length && cost(sel) >= best.cost))) { if (left.length) return; }
      if (!left.length) { const c = cost(sel); if (!best || sel.length < best.sel.length || (sel.length === best.sel.length && c < best.cost)) best = { sel: sel.slice(), cost: c }; return; }
      if (i >= cand.length) return;
      const m = left[0];
      for (const q of cand) { if (!covers(q, m)) continue; rec(i + 1, [...sel, q], left.filter(x => !covers(q, x))); }
    };
    const cost = (s) => s.reduce((a, q) => a + lits(q, n), 0);
    rec(0, [], remA);
    if (best) chosen.push(...best.sel);
  }
  return { cover: chosen, primes, terms: chosen };
};
KM.implicantMinterms = (q, n) => { const r = []; for (let m = 0; m < (1 << n); m++) if (covers(q, m)) r.push(m); return r; };

/* ---- expresiones ---- */
// término -> literales [{i, neg}] con i = índice de variable (0 = MSB)
KM.literals = (q, n) => { const L = []; for (let i = 0; i < n; i++) { const bit = n - 1 - i; if (q.m >> bit & 1) continue; L.push({ i, neg: !(q.v >> bit & 1) }); } return L; };
KM.exprText = (terms, names, n, style) => {
  if (!terms.length) return '0';
  const neg = style === 'prime' ? (s) => s + "'" : (s) => s.split('').map(c => c + '̅').join('');
  const out = terms.map(q => { const L = KM.literals(q, n); if (!L.length) return '1'; return L.map(l => l.neg ? neg(names[l.i]) : names[l.i]).join(style === 'dot' ? '·' : ''); });
  return out.join(' + ');
};
KM.exprHTML = (terms, names, n) => {
  if (!terms.length) return '0';
  return terms.map(q => { const L = KM.literals(q, n); if (!L.length) return '1'; return L.map(l => l.neg ? `<span class="ng">${names[l.i]}</span>` : names[l.i]).join('·'); }).join(' + ');
};
KM.sigma = (arr) => { const o = [], x = []; arr.forEach((v, i) => { if (v === 1) o.push(i); else if (v === 2) x.push(i); }); return { ones: o, dcs: x }; };
KM.sigmaText = (arr) => { const { ones, dcs } = KM.sigma(arr); return `Σ(${ones.join(', ')})` + (dcs.length ? ` + X(${dcs.join(', ')})` : ''); };

/* qué X se tomaron como 1 */
KM.groupDetail = (q, n, names) => {
  const mins = KM.implicantMinterms(q, n);
  const lit = (m) => names.slice(0, n).map((nm, i) => { const bit = m >> (n - 1 - i) & 1, cut = (q.m >> (n - 1 - i)) & 1; const t = bit ? nm : `<span class="ng">${nm}</span>`; return cut ? `<s class="cut">${t}</s>` : t; }).join('·');
  const bits = (m) => names.slice(0, n).map((nm, i) => { const bit = m >> (n - 1 - i) & 1, cut = (q.m >> (n - 1 - i)) & 1; return cut ? `<s class="cut bt">${bit}</s>` : `<span class="bt">${bit}</span>`; }).join('');
  const head = names.slice(0, n).map((nm, i) => { const cut = (q.m >> (n - 1 - i)) & 1; return cut ? `<s class="cut bt">${nm}</s>` : `<span class="bt">${nm}</span>`; }).join('');
  return { mins, head, rows: mins.map(m => ({ m, bits: bits(m), html: lit(m) })) };
};
KM.dcUsage = (cover, dcs, n) => dcs.map(m => ({ m, as1: cover.some(q => covers(q, m)) }));

/* ---- disposición del mapa ---- */
const GRAY = [0, 1, 3, 2];
KM.layout = (n) => {
  if (n === 1) return { rows: [0], cols: [0, 1], rv: 0, cv: 1 };
  if (n === 2) return { rows: [0, 1], cols: [0, 1], rv: 1, cv: 1 };
  if (n === 3) return { rows: [0, 1], cols: GRAY, rv: 1, cv: 2 };
  return { rows: GRAY, cols: GRAY, rv: 2, cv: 2 };
};
KM.cellMinterm = (n, r, c) => { const L = KM.layout(n); return (L.rows[r] << L.cv) | L.cols[c]; };
const BIN = (x, w) => w ? x.toString(2).padStart(w, '0') : '';
const COLORS = ['#D7263D', '#1B6CA8', '#2E9E5B', '#F28C28', '#7B3FA0', '#0FA3B1', '#D63AA6', '#8B5A2B', '#7C8B00', '#4A4A4A'];
KM.COLORS = COLORS;

/* SVG del mapa de Karnaugh con grupos. opts: cell (px), interactive */
KM.mapSVG = function (n, arr, names, res, o = {}) {
  const L = KM.layout(n), cs = o.cell || 54, R = L.rows.length, C = L.cols.length;
  const ox = 74, oy = 52, W = ox + C * cs + 18, H = oy + R * cs + 18;
  const rn = names.slice(0, n - L.cv).join(''), cn = names.slice(n - L.cv).join('');
  let s = `<svg class="kmap" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Arial">`;
  s += `<line x1="${ox - 52}" y1="${oy - 40}" x2="${ox}" y2="${oy}" stroke="#696C69" stroke-width="1"/>`;
  s += `<text x="${ox - 6}" y="${oy - 28}" font-size="12" text-anchor="end" fill="#1F2421">${cn}</text><text x="${ox - 50}" y="${oy - 6}" font-size="12" fill="#1F2421">${rn}</text>`;
  L.cols.forEach((g, c) => s += `<text x="${ox + c * cs + cs / 2}" y="${oy - 8}" font-size="13" text-anchor="middle" fill="#696C69">${BIN(g, L.cv)}</text>`);
  L.rows.forEach((g, r) => s += `<text x="${ox - 10}" y="${oy + r * cs + cs / 2 + 5}" font-size="13" text-anchor="end" fill="#696C69">${BIN(g, n - L.cv)}</text>`);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const m = KM.cellMinterm(n, r, c), v = arr[m];
    s += `<g class="kc" data-m="${m}" style="cursor:${o.interactive ? 'pointer' : 'default'}"><rect x="${ox + c * cs}" y="${oy + r * cs}" width="${cs}" height="${cs}" fill="#F9F8F6" stroke="#E2DFD8"/>`
      + `<text x="${ox + c * cs + cs / 2}" y="${oy + r * cs + cs / 2 + 7}" font-size="22" text-anchor="middle" font-weight="${v === 1 ? 700 : 400}" fill="${v === 1 ? '#1F2421' : '#696C69'}">${v === 2 ? 'X' : v}</text>`
      + `<text x="${ox + c * cs + 4}" y="${oy + r * cs + 12}" font-size="9" fill="#A8A59C">${m}</text></g>`;
  }
  if (res && res.cover) res.cover.forEach((q, gi) => {
    const col = COLORS[gi % COLORS.length], set = new Set(KM.implicantMinterms(q, n)), inset = 4 + (gi % 3) * 2;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!set.has(KM.cellMinterm(n, r, c))) continue;
      const x = ox + c * cs, y = oy + r * cs, t = (rr, cc) => rr >= 0 && rr < R && cc >= 0 && cc < C && set.has(KM.cellMinterm(n, rr, cc));
      const x0 = x + inset, y0 = y + inset, x1 = x + cs - inset, y1 = y + cs - inset;
      const st = `stroke="${col}" stroke-width="2.6" stroke-linecap="round"`;
      s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3" fill="${col}" opacity=".20" pointer-events="none"/>`;
      if (!t(r - 1, c)) s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" ${st}/>`;
      if (!t(r + 1, c)) s += `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" ${st}/>`;
      if (!t(r, c - 1)) s += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" ${st}/>`;
      if (!t(r, c + 1)) s += `<line x1="${x1}" y1="${y0}" x2="${x1}" y2="${y1}" ${st}/>`;
    }
    // etiqueta Gk en la primera celda del grupo
    let done = false;
    for (let r = 0; r < R && !done; r++) for (let c = 0; c < C && !done; c++) if (set.has(KM.cellMinterm(n, r, c))) {
      done = true; const tx = ox + c * cs + cs - 6 - 24 * (gi % 2), ty = oy + r * cs + cs - 7 - 0;
      s += `<rect x="${tx - 21}" y="${ty - 12}" width="23" height="14" rx="3" fill="${col}"/><text x="${tx - 9.5}" y="${ty - 1.5}" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">G${gi + 1}</text>`;
    }
  });
  return s + '</svg>';
};

/* ---- grafo de puertas (AND/OR/NOT de 2 entradas o solo NAND) ---- */
// nodos: {id, t:'in'|'NOT'|'AND'|'OR'|'NAND'|'XOR', a, b, name}
KM.buildGraph = function (funcs, names, n, mode) {
  const nodes = [], memo = new Map();
  const mk = (t, a, b, name) => { const key = t + ':' + a + ':' + (b ?? ''); if (t !== 'in' && memo.has(key)) return memo.get(key); const id = nodes.length; nodes.push({ id, t, a, b, name }); if (t !== 'in') memo.set(key, id); return id; };
  const inputs = names.slice(0, n).map(nm => mk('in', null, null, nm));
  const nand = (a, b) => mk('NAND', Math.min(a, b), Math.max(a, b));
  const inv = (x) => { const nd = nodes[x]; if (mode === 'nand') { if (nd.t === 'NAND' && nd.a === nd.b) return nd.a; return mk('NAND', x, x); } if (nd.t === 'NOT') return nd.a; return mk('NOT', x); };
  const and2 = (a, b) => mode === 'nand' ? inv(nand(a, b)) : mk('AND', Math.min(a, b), Math.max(a, b));
  const or2 = (a, b) => mode === 'nand' ? nand(inv(a), inv(b)) : mk('OR', Math.min(a, b), Math.max(a, b));
  const tree = (xs, f) => { while (xs.length > 1) { const nx = []; for (let i = 0; i < xs.length; i += 2) nx.push(i + 1 < xs.length ? f(xs[i], xs[i + 1]) : xs[i]); xs = nx; } return xs[0]; };
  const outs = funcs.map(f => {
    if (f.zero) return { name: f.name, node: null, const: 0 };
    if (f.one) return { name: f.name, node: null, const: 1 };
    const terms = f.terms.map(q => { const L = KM.literals(q, n).map(l => l.neg ? inv(inputs[l.i]) : inputs[l.i]); return tree(L, and2); });
    return { name: f.name, node: tree(terms, or2) };
  });
  return { nodes, inputs, outs, mode };
};
KM.countGates = (g) => {
  const c = { NOT: 0, AND: 0, OR: 0, NAND: 0, XOR: 0 };
  const reach = new Set(); const mark = (id) => { if (id == null || reach.has(id)) return; reach.add(id); const nd = g.nodes[id]; mark(nd.a); mark(nd.b); };
  g.outs.forEach(o => mark(o.node));
  reach.forEach(id => { const t = g.nodes[id].t; if (c[t] !== undefined) c[t]++; });
  const ics = []; const need = (n, per, name) => { if (n) ics.push({ ic: name, n: Math.ceil(n / per), gates: n, per }); };
  need(c.NOT, 6, '7404'); need(c.AND, 4, '7408'); need(c.OR, 4, '7432'); need(c.NAND, 4, '7400'); need(c.XOR, 4, '7486');
  return { counts: c, total: c.NOT + c.AND + c.OR + c.NAND + c.XOR, ics, nIC: ics.reduce((a, x) => a + x.n, 0) };
};
/* evaluación de un grafo para una combinación (bits MSB primero) */
KM.evalGraph = (g, m, n) => {
  const val = new Array(g.nodes.length);
  g.nodes.forEach(nd => {
    switch (nd.t) {
      case 'in': val[nd.id] = (m >> (n - 1 - g.inputs.indexOf(nd.id))) & 1; break;
      case 'NOT': val[nd.id] = val[nd.a] ? 0 : 1; break;
      case 'AND': val[nd.id] = val[nd.a] & val[nd.b]; break;
      case 'OR': val[nd.id] = val[nd.a] | val[nd.b]; break;
      case 'NAND': val[nd.id] = (val[nd.a] & val[nd.b]) ? 0 : 1; break;
      case 'XOR': val[nd.id] = val[nd.a] ^ val[nd.b]; break;
    }
  });
  return g.outs.map(o => o.node == null ? o.const : val[o.node]);
};
KM.verilog = (g, names, n, modName) => {
  const w = (id) => g.nodes[id].t === 'in' ? g.nodes[id].name : 'w' + id;
  let s = `module ${modName || 'circuito'}(${[...g.inputs.map(i => 'input ' + g.nodes[i].name), ...g.outs.map(o => 'output ' + o.name)].join(', ')});\n`;
  g.nodes.forEach(nd => { if (nd.t === 'in') return; const e = { NOT: `~${w(nd.a)}`, AND: `${w(nd.a)} & ${w(nd.b)}`, OR: `${w(nd.a)} | ${w(nd.b)}`, NAND: `~(${w(nd.a)} & ${w(nd.b)})`, XOR: `${w(nd.a)} ^ ${w(nd.b)}` }[nd.t]; s += `  wire w${nd.id} = ${e};\n`; });
  g.outs.forEach(o => s += `  assign ${o.name} = ${o.node == null ? "1'b" + o.const : w(o.node)};\n`);
  return s + 'endmodule\n';
};

/* ---- ejemplos de enunciados de las prácticas ---- */
KM.fromSigma = (n, ones, dcs) => { const a = new Array(1 << n).fill(0); ones.forEach(m => a[m] = 1); (dcs || []).forEach(m => a[m] = 2); return a; };

root.KM = KM;
if (typeof module !== 'undefined') module.exports = KM;
})(typeof window !== 'undefined' ? window : globalThis);
