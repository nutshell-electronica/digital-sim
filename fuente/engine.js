/* DIGITAL-SIM · motor mixto analógico-digital de paso fijo
   Nodal (conductancias) + modelos digitales por familia (LS, HC, ideal, MCU) */
(function (root) {
'use strict';
const GMIN = 1e-9;
const E = {};

/* ---------- Familias lógicas ---------- */
const FAM = {
  LS:  { kind: 'ttl',  vmin: 4.5, vmax: 5.5 },
  HC:  { kind: 'cmos', vmin: 2.0, vmax: 6.0 },
  ID:  { kind: 'ideal', vmin: 0, vmax: 99 },
  MCU: { kind: 'mcu',  vmin: 0, vmax: 99 }
};
E.FAM = FAM;
function thresholds(fam, vcc, schmitt) {
  if (schmitt) return fam.kind === 'ttl' ? [0.8, 1.6] : [0.32 * vcc, 0.54 * vcc];
  switch (fam.kind) {
    case 'ttl': return [0.8, 2.0];
    case 'cmos': return [0.3 * vcc, 0.7 * vcc];
    case 'mcu': return [0.3 * vcc, 0.6 * vcc];
    default: return [1.5, 3.5];
  }
}
function outModel(fam, vcc, hi) { // -> [V, R]
  switch (fam.kind) {
    case 'ttl': return hi ? [Math.min(3.4, vcc - 0.7), 110] : [0.25, 12];
    case 'cmos': return hi ? [vcc, 60] : [0, 60];
    case 'mcu': return hi ? [vcc, 25] : [0, 25];
    default: return hi ? [5, 1] : [0, 1];
  }
}
E.outModel = outModel; E.thresholds = thresholds;

/* ---------- Enlaces a las hojas de datos de la carpeta (rutas relativas a simulador/) ---------- */
const DS = {
  '00': '74LS00.pdf', '02': '74LS02.pdf', '04': '74LS04.pdf', '08': '74LS08.pdf', '32': '74LS32.pdf', '86': '74LS86.pdf', '74': '74LS74.pdf', '76': '74LS76.pdf',
  '151': '74LS151 - 1-of-8 Line Data Selector-Multiplexer.pdf', '42': '74LS42 - demux-decod.PDF', '47': '74LS47 - BCD to 7S - common anode.PDF', '48': '74LS48 - BCD to 7S - common cathode.pdf',
  '194': '74LS194.pdf', '83': '74LS83 - 4-Bit Binary Adder - FAIRCHILD.pdf', '148': '74LS148 - 8-Line-to-3-Line Priority Encoders - MOTOROLA.pdf', '165': '74LS165.pdf', '190': '74190.pdf', '10': '74LS10.pdf', '14': '74LS14.pdf', '175': '74LS175.pdf', '555': 'LM555 - multivibrador.pdf'
};
/* Hojas de datos: siempre la versión HC en alldatasheet.es, preferentemente de NXP (o STMicroelectronics en el 555) */
const HCMAP = { '83': '283', '47': '4511', '48': '4511' };
E.dsFile = (id) => { id = String(id); if (id.indexOf('555') >= 0) return 'NE555'; const k = id.replace(/^74(LS|HC)?/, ''); if (!DS[k] && !HCMAP[k]) return null; return '74HC' + (HCMAP[k] || k); };
E.dsMaker = (id) => (String(id).indexOf('555') >= 0 ? 'STMicroelectronics' : 'NXP');
E.dsHref = (id) => { const f = E.dsFile(id); return f ? 'https://www.alldatasheet.es/view.jsp?Searchword=' + encodeURIComponent(f + ' ' + E.dsMaker(id)) : null; };
E.dsExact = () => true;

/* ---------- Definiciones de integrados ---------- */
const IC = {};
E.IC = IC;
const GATES = {
  AND: (a) => a.every(x => x) ? 1 : 0, OR: (a) => a.some(x => x) ? 1 : 0,
  NAND: (a) => a.every(x => x) ? 0 : 1, NOR: (a) => a.some(x => x) ? 0 : 1,
  XOR: (a) => a.reduce((s, x) => s ^ x, 0), XNOR: (a) => 1 ^ a.reduce((s, x) => s ^ x, 0),
  NOT: (a) => a[0] ? 0 : 1, BUF: (a) => a[0] ? 1 : 0
};
E.GATES = GATES;
function gateIC(id, name, fn, groups, fam, desc, schmitt) {
  const pn = {}; groups.forEach((g, k) => { g.slice(0, -1).forEach((p, j) => pn[p] = 'IN' + (k + 1) + (g.length > 2 ? String.fromCharCode(65 + j) : '')); pn[g[g.length - 1]] = 'Y' + (k + 1); });
  pn[14] = 'VCC'; pn[7] = 'GND';
  IC[id] = { id, name, desc, n: 14, vcc: 14, gnd: 7, fam, schmitt, pn,
    eval(p, inp) { const o = {}; groups.forEach(g => { o[g[g.length - 1]] = GATES[fn](g.slice(0, -1).map(x => inp[x])); }); return o; },
    ins: groups.flatMap(g => g.slice(0, -1)), outs: groups.map(g => g[g.length - 1]), gates: groups.length, fn, groups };
}
const Q4 = [[1, 2, 3], [4, 5, 6], [10, 9, 8], [13, 12, 11]];
const Q4N = [[2, 3, 1], [5, 6, 4], [8, 9, 10], [11, 12, 13]]; // 7402
const H6 = [[1, 2], [3, 4], [5, 6], [9, 8], [11, 10], [13, 12]];
[['LS', '74LS'], ['HC', '74HC']].forEach(([f, pre]) => {
  gateIC(pre + '00', pre + '00', 'NAND', Q4, f, '4 NAND de 2 entradas');
  gateIC(pre + '02', pre + '02', 'NOR', Q4N, f, '4 NOR de 2 entradas (patillaje distinto)');
  gateIC(pre + '04', pre + '04', 'NOT', H6, f, '6 inversores');
  gateIC(pre + '08', pre + '08', 'AND', Q4, f, '4 AND de 2 entradas');
  gateIC(pre + '32', pre + '32', 'OR', Q4, f, '4 OR de 2 entradas');
  gateIC(pre + '86', pre + '86', 'XOR', Q4, f, '4 XOR de 2 entradas');
  gateIC(pre + '10', pre + '10', 'NAND', [[1, 2, 13, 12], [3, 4, 5, 6], [9, 10, 11, 8]], f, '3 NAND de 3 entradas');
});
gateIC('74LS14', '74LS14', 'NOT', H6, 'LS', '6 inversores Schmitt', true);
gateIC('74HC14', '74HC14', 'NOT', H6, 'HC', '6 inversores Schmitt', true);

function dualFF(id, fam, kind, desc) {
  // 7474: D flanco subida ; 7476: JK flanco bajada
  const d = kind === 'D';
  const pins = d ? [
    { clk: 3, d: 2, pr: 4, cl: 1, q: 5, qn: 6 }, { clk: 11, d: 12, pr: 10, cl: 13, q: 9, qn: 8 }
  ] : [
    { clk: 1, j: 4, k: 16, pr: 2, cl: 3, q: 15, qn: 14 }, { clk: 6, j: 9, k: 12, pr: 7, cl: 8, q: 11, qn: 10 }
  ];
  const pn = {};
  pins.forEach((f, i) => { const s = i + 1; pn[f.clk] = s + 'CLK'; pn[f.pr] = s + 'PR'; pn[f.cl] = s + 'CLR'; pn[f.q] = s + 'Q'; pn[f.qn] = s + 'Q̅';
    if (d) pn[f.d] = s + 'D'; else { pn[f.j] = s + 'J'; pn[f.k] = s + 'K'; } });
  const n = d ? 14 : 16, vcc = d ? 14 : 5, gnd = d ? 7 : 13;
  pn[vcc] = 'VCC'; pn[gnd] = 'GND';
  const ins = []; pins.forEach(f => Object.keys(f).forEach(k => { if (!['q', 'qn'].includes(k)) ins.push(f[k]); }));
  IC[id] = { id, name: id, desc, n, vcc, gnd, fam, pn, ins, outs: pins.flatMap(f => [f.q, f.qn]),
    init(p) { p.st = pins.map(() => ({ q: 0, pc: 1 })); },
    eval(p, inp) {
      const o = {};
      pins.forEach((f, i) => {
        const s = p.st[i], c = inp[f.clk];
        const edge = d ? (c === 1 && s.pc === 0) : (c === 0 && s.pc === 1);
        s.pc = c;
        const pr = inp[f.pr], cl = inp[f.cl];
        if (pr === 0 && cl === 0) { s.q = 1; s.both = 1; }
        else if (pr === 0) { s.q = 1; s.both = 0; }
        else if (cl === 0) { s.q = 0; s.both = 0; }
        else { s.both = 0;
          if (edge) {
            if (d) s.q = inp[f.d];
            else { const j = inp[f.j], k = inp[f.k]; if (j && k) s.q ^= 1; else if (j) s.q = 1; else if (k) s.q = 0; }
          } }
        o[f.q] = s.q; o[f.qn] = s.both ? 1 : (s.q ? 0 : 1);
      });
      return o;
    } };
}
['LS', 'HC'].forEach(f => { const pre = '74' + f; dualFF(pre + '74', f, 'D', '2 biestables D (flanco de subida) con PR y CLR'); });
dualFF('74LS76', 'LS', 'JK', '2 biestables JK (flanco de bajada) con PR y CLR');
dualFF('74HC76', 'HC', 'JK', '2 biestables JK con PR y CLR');

IC['74HC175'] = { id: '74HC175', name: '74HC175', desc: '4 biestables D con CLR común', n: 16, vcc: 16, gnd: 8, fam: 'HC',
  pn: { 1: 'CLR', 2: '1Q', 3: '1Q̅', 4: '1D', 5: '2D', 6: '2Q̅', 7: '2Q', 8: 'GND', 9: 'CLK', 10: '3Q', 11: '3Q̅', 12: '3D', 13: '4D', 14: '4Q̅', 15: '4Q', 16: 'VCC' },
  ins: [1, 4, 5, 12, 13, 9], outs: [2, 3, 6, 7, 10, 11, 14, 15],
  init(p) { p.st = { q: [0, 0, 0, 0], pc: 0 }; },
  eval(p, inp) {
    const s = p.st, D = [4, 5, 12, 13], Q = [2, 7, 10, 15], QN = [3, 6, 11, 14];
    const edge = inp[9] === 1 && s.pc === 0; s.pc = inp[9];
    if (inp[1] === 0) s.q = [0, 0, 0, 0]; else if (edge) s.q = D.map(x => inp[x]);
    const o = {}; for (let i = 0; i < 4; i++) { o[Q[i]] = s.q[i]; o[QN[i]] = s.q[i] ? 0 : 1; } return o;
  } };
IC['74LS175'] = Object.assign({}, IC['74HC175'], { id: '74LS175', name: '74LS175', fam: 'LS' });

IC['74LS151'] = { id: '74LS151', name: '74LS151', desc: 'Multiplexor 8 a 1 (G activa a nivel bajo)', n: 16, vcc: 16, gnd: 8, fam: 'LS',
  pn: { 1: 'D3', 2: 'D2', 3: 'D1', 4: 'D0', 5: 'Y', 6: 'W', 7: 'G̅', 8: 'GND', 9: 'C', 10: 'B', 11: 'A', 12: 'D7', 13: 'D6', 14: 'D5', 15: 'D4', 16: 'VCC' },
  ins: [1, 2, 3, 4, 7, 9, 10, 11, 12, 13, 14, 15], outs: [5, 6],
  eval(p, i) {
    const s = i[9] * 4 + i[10] * 2 + i[11], dp = [4, 3, 2, 1, 15, 14, 13, 12];
    const y = i[7] ? 0 : i[dp[s]]; return { 5: y, 6: y ? 0 : 1 };
  } };
IC['74HC151'] = Object.assign({}, IC['74LS151'], { id: '74HC151', name: '74HC151', fam: 'HC' });

IC['7442'] = { id: '7442', name: '7442', desc: 'Decodificador BCD a decimal (salidas activas a 0)', n: 16, vcc: 16, gnd: 8, fam: 'LS',
  pn: { 1: '0', 2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: 'GND', 9: '7', 10: '8', 11: '9', 12: 'D', 13: 'C', 14: 'B', 15: 'A', 16: 'VCC' },
  ins: [12, 13, 14, 15], outs: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  eval(p, i) {
    const v = i[12] * 8 + i[13] * 4 + i[14] * 2 + i[15], map = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11], o = {};
    map.forEach((pin, k) => o[pin] = (v === k) ? 0 : 1); return o;
  } };
IC['74HC42'] = Object.assign({}, IC['7442'], { id: '74HC42', name: '74HC42', fam: 'HC' });

const SEG47 = ['LLLLLLH', 'HLLHHHH', 'LLHLLHL', 'LLLLHHL', 'HLLHHLL', 'LHLLHLL', 'HHLLLLL', 'LLLHHHH',
  'LLLLLLL', 'LLLHHLL', 'HHHLLHL', 'HHLLHHL', 'HLHHHLL', 'LHHLHLL', 'HHHLLLL', 'HHHHHHH'];
function bcd7(id, active) {
  IC[id] = { id, name: id, desc: active ? 'BCD a 7 segmentos (salidas activas a 1, cátodo común)' : 'BCD a 7 segmentos (salidas activas a 0, ánodo común)',
    n: 16, vcc: 16, gnd: 8, fam: 'LS',
    pn: { 1: 'B', 2: 'C', 3: 'LT̅', 4: 'BI̅/RBO̅', 5: 'RBI̅', 6: 'D', 7: 'A', 8: 'GND', 9: 'e', 10: 'd', 11: 'c', 12: 'b', 13: 'a', 14: 'g', 15: 'f', 16: 'VCC' },
    ins: [1, 2, 3, 4, 5, 6, 7], outs: [9, 10, 11, 12, 13, 14, 15],
    eval(p, i) {
      const v = i[6] * 8 + i[2] * 4 + i[1] * 2 + i[7]; let s = SEG47[v].split('').map(c => c === 'L' ? 1 : 0); // 1 = encendido
      if (!active) { /* 47: tabla del fabricante */ } else { if (v === 6) s = [1, 0, 1, 1, 1, 1, 1].map((x, k) => x); if (v === 9) s = [1, 1, 1, 1, 0, 1, 1]; }
      if (i[4] === 0) s = [0, 0, 0, 0, 0, 0, 0];
      else if (i[3] === 0) s = [1, 1, 1, 1, 1, 1, 1];
      else if (i[5] === 0 && v === 0) s = [0, 0, 0, 0, 0, 0, 0];
      const pins = [13, 12, 11, 10, 9, 15, 14], o = {};
      pins.forEach((pin, k) => o[pin] = active ? s[k] : (s[k] ? 0 : 1)); return o;
    } };
}
bcd7('74LS47', 0); bcd7('74LS48', 1);

IC['74LS194'] = { id: '74LS194', name: '74LS194', desc: 'Registro de desplazamiento universal de 4 bits', n: 16, vcc: 16, gnd: 8, fam: 'LS',
  pn: { 1: 'CLR̅', 2: 'SR', 3: 'A', 4: 'B', 5: 'C', 6: 'D', 7: 'SL', 8: 'GND', 9: 'S0', 10: 'S1', 11: 'CLK', 12: 'QD', 13: 'QC', 14: 'QB', 15: 'QA', 16: 'VCC' },
  ins: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11], outs: [12, 13, 14, 15],
  init(p) { p.st = { q: [0, 0, 0, 0], pc: 0 }; },
  eval(p, i) {
    const s = p.st, edge = i[11] === 1 && s.pc === 0; s.pc = i[11];
    if (i[1] === 0) s.q = [0, 0, 0, 0];
    else if (edge) { const m = i[10] * 2 + i[9], q = s.q;
      if (m === 3) s.q = [i[3], i[4], i[5], i[6]];
      else if (m === 1) s.q = [i[2], q[0], q[1], q[2]];
      else if (m === 2) s.q = [q[1], q[2], q[3], i[7]]; }
    return { 15: s.q[0], 14: s.q[1], 13: s.q[2], 12: s.q[3] };
  } };


IC['74LS83'] = { id: '74LS83', name: '74LS83', desc: 'Sumador binario de 4 bits (¡VCC en la pata 5 y GND en la 12!)', n: 16, vcc: 5, gnd: 12, fam: 'LS',
  pn: { 1: 'A4', 2: 'Σ3', 3: 'A3', 4: 'B3', 5: 'VCC', 6: 'Σ2', 7: 'B2', 8: 'A2', 9: 'Σ1', 10: 'A1', 11: 'B1', 12: 'GND', 13: 'C0', 14: 'C4', 15: 'Σ4', 16: 'B4' },
  ins: [1, 3, 4, 7, 8, 10, 11, 13, 16], outs: [2, 6, 9, 14, 15],
  eval(p, i) { const a = i[10] + 2 * i[8] + 4 * i[3] + 8 * i[1], b = i[11] + 2 * i[7] + 4 * i[4] + 8 * i[16], t = a + b + i[13];
    return { 9: t & 1, 6: (t >> 1) & 1, 2: (t >> 2) & 1, 15: (t >> 3) & 1, 14: (t >> 4) & 1 }; } };

IC['74LS148'] = { id: '74LS148', name: '74LS148', desc: 'Codificador de prioridad 8 a 3 (todo activo a nivel bajo)', n: 16, vcc: 16, gnd: 8, fam: 'LS',
  pn: { 1: 'I4', 2: 'I5', 3: 'I6', 4: 'I7', 5: 'EI̅', 6: 'A2', 7: 'A1', 8: 'GND', 9: 'A0', 10: 'I0', 11: 'I1', 12: 'I2', 13: 'I3', 14: 'GS̅', 15: 'EO̅', 16: 'VCC' },
  ins: [1, 2, 3, 4, 5, 10, 11, 12, 13], outs: [6, 7, 9, 14, 15],
  eval(p, i) {
    if (i[5] === 1) return { 6: 1, 7: 1, 9: 1, 14: 1, 15: 1 };
    const pin = [10, 11, 12, 13, 1, 2, 3, 4]; let hi = -1; for (let k = 7; k >= 0; k--) if (i[pin[k]] === 0) { hi = k; break; }
    if (hi < 0) return { 6: 1, 7: 1, 9: 1, 14: 1, 15: 0 };
    const c = 7 - hi; return { 6: (c >> 2) & 1, 7: (c >> 1) & 1, 9: c & 1, 14: 0, 15: 1 };
  } };

IC['74LS165'] = { id: '74LS165', name: '74LS165', desc: 'Registro de desplazamiento 8 bits, carga paralelo asíncrona (PL activa a 0)', n: 16, vcc: 16, gnd: 8, fam: 'LS',
  pn: { 1: 'PL̅', 2: 'CP1', 3: 'P4', 4: 'P5', 5: 'P6', 6: 'P7', 7: 'Q̅7', 8: 'GND', 9: 'Q7', 10: 'DS', 11: 'P0', 12: 'P1', 13: 'P2', 14: 'P3', 15: 'CP2', 16: 'VCC' },
  ins: [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15], outs: [7, 9],
  init(p) { p.st = { q: [0, 0, 0, 0, 0, 0, 0, 0], pc: 1 }; },
  eval(p, i) {
    const s = p.st, P = [11, 12, 13, 14, 3, 4, 5, 6], ck = i[2] | i[15], edge = ck === 1 && s.pc === 0; s.pc = ck;
    if (i[1] === 0) s.q = P.map(x => i[x]); else if (edge) s.q = [i[10]].concat(s.q.slice(0, 7));
    return { 9: s.q[7], 7: s.q[7] ? 0 : 1 };
  } };

/* 555 (modelo analógico-digital): pines 1 GND 2 TRIG 3 OUT 4 RST 5 CTRL 6 THR 7 DIS 8 VCC */
IC['NE555'] = { id: 'NE555', name: 'NE555', desc: 'Temporizador 555 (astable / monoestable)', n: 8, vcc: 8, gnd: 1, fam: 'ID', analog: '555',
  pn: { 1: 'GND', 2: 'TRIG', 3: 'OUT', 4: 'RESET', 5: 'CTRL', 6: 'THR', 7: 'DIS', 8: 'VCC' } };

/* ---------- Solución de sistemas lineales ---------- */
function luFactor(A, n, piv) {
  for (let k = 0; k < n; k++) {
    let m = k, mv = Math.abs(A[k * n + k]);
    for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i * n + k]); if (v > mv) { mv = v; m = i; } }
    piv[k] = m;
    if (m !== k) for (let j = 0; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[m * n + j]; A[m * n + j] = t; }
    const d = A[k * n + k] || 1e-30;
    for (let i = k + 1; i < n; i++) {
      const f = (A[i * n + k] /= d);
      if (f !== 0) for (let j = k + 1; j < n; j++) A[i * n + j] -= f * A[k * n + j];
    }
  }
}
function luSolve(A, n, piv, b) {
  for (let k = 0; k < n; k++) { const m = piv[k]; if (m !== k) { const t = b[k]; b[k] = b[m]; b[m] = t; } }
  for (let i = 1; i < n; i++) { let s = b[i]; for (let j = 0; j < i; j++) s -= A[i * n + j] * b[j]; b[i] = s; }
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i * n + j] * b[j]; b[i] = s / (A[i * n + i] || 1e-30); }
}

/* ---------- Simulador ---------- */
const LEDV = { red: [1.75, 25], green: [1.9, 25], yellow: [1.9, 25], blue: [2.8, 25], white: [2.8, 25] };
E.LEDV = LEDV;

class Sim {
  /* nl: { n: nº de nodos (0 = GND), parts: [{type,pins,...}], names? } */
  constructor(nl, o = {}) {
    this.dt = o.dt || 1e-4; this.t = 0; this.nl = nl;
    this.N = nl.n; this.M = this.N - 1;
    this.v = new Float64Array(this.N); this.vp = new Float64Array(this.N);
    this.A = new Float64Array(Math.max(1, this.M * this.M)); this.Ac = new Float64Array(Math.max(1, this.M * this.M));
    this.b = new Float64Array(this.M); this.piv = new Int32Array(this.M); this.haveLU = false;
    this.alerts = []; this.watches = []; this.recEvery = o.recEvery || 1; this.stepN = 0;
    this.parts = nl.parts.map((p, i) => this.initPart(p, i));
    this.mcus = this.parts.filter(p => p.type === 'MCU');
  }
  initPart(src, idx) {
    const p = Object.assign({ idx, st: {}, lv: {}, inOn: {}, drv: null }, src);
    if (p.type === 'IC') {
      p.def = IC[p.ic]; if (!p.def) throw new Error('IC desconocido ' + p.ic);
      p.fam = FAM[p.def.fam || 'LS']; p.sch = !!p.def.schmitt;
      if (p.def.init) p.def.init(p);
      if (p.def.analog === '555') p.st = { ff: 0, dis: 1 };
    } else if (p.type === 'GATE') { p.fam = FAM.ID; p.gst = { }; }
    else if (p.type === 'FF') { p.fam = FAM.ID; p.st = { q: 0, pc: 0, init: false }; }
    else if (p.type === 'LED') { p.led = LEDV[p.color || 'red'] || LEDV.red; p.st = { on: false, i: 0 }; }
    else if (p.type === 'DISP7') { p.led = LEDV[p.color || 'red']; p.st = { on: [0, 0, 0, 0, 0, 0, 0, 0], i: [0, 0, 0, 0, 0, 0, 0, 0] }; }
    else if (p.type === 'C') p.st = { vc: p.v0 || 0 };
    else if (p.type === 'MCU') { p.fam = FAM.MCU; }
    return p;
  }
  addWatch(node, label) { const w = { node, label, t: [], v: [] }; this.watches.push(w); return w; }

  /* nivel lógico del nodo n, con histéresis respecto al nivel anterior */
  level(key, p, n, lo, hi, ref, dflt) {
    const v = this.vp[n] - ref; const prev = p.lv[key];
    const l = v <= lo ? 0 : v >= hi ? 1 : (prev === undefined ? dflt : prev);
    p.lv[key] = l; return l;
  }
  /* ---- fase 1: evaluar parte digital y fijar Norton de cada patilla ---- */
  digital(p) {
    const n = p.pins.length; if (!p.pg) { p.pg = new Float64Array(n); p.pi = new Float64Array(n); p.pk = new Int32Array(n); }
    const pg = p.pg, pi = p.pi, pk = p.pk; pg.fill(GMIN); pi.fill(0); pk.fill(0);
    const vp = this.vp;
    if (p.type === 'IC') {
      const d = p.def, fam = p.fam, pins = p.pins;
      let vcc = 5, vg = 0, powered = true;
      if (d.vcc) { vg = vp[pins[d.gnd - 1]]; vcc = vp[pins[d.vcc - 1]] - vg;
        powered = vcc >= fam.vmin - 0.3 && !p.burned;
        if (!p.burned && (vcc > fam.vmax + 2.5 || vcc < -0.8)) { p.burned = true; powered = false; this.alerts.push({ t: this.t, part: p.idx, msg: `${p.def.name} (${p.label || ''}): alimentación fuera de límites (${vcc.toFixed(1)} V). Integrado dañado.` }); } }
      p.vcc = vcc; p.powered = powered;
      if (d.analog === '555') return this.d555(p, vcc, vg);
      const th = thresholds(fam, vcc, p.sch), inp = {};
      for (const pin of d.ins) {
        const node = pins[pin - 1];
        inp[pin] = this.level(pin, p, node, th[0], th[1], vg, fam.kind === 'ttl' ? 1 : 0);
        if (fam.kind === 'ttl') { // entrada TTL: 12 kΩ hacia Vcc-0,7 V (solo conduce si la entrada está por debajo)
          const vint = vcc + vg - 0.7, t = p.tin || (p.tin = {}), v0 = vp[node];
          const on = powered && (t[pin] ? v0 < vg + 1.5 : v0 < vg + 1.25); t[pin] = on;
          if (on) { pg[pin - 1] = 1 / 12000; pi[pin - 1] = vint / 12000; pk[pin - 1] = 1; }          // entrada baja: sale ≈ 0,36 mA por la pata
          else if (powered) { pg[pin - 1] = 1 / 200000; pi[pin - 1] = (vg + 1.4) / 200000; pk[pin - 1] = 1; } // alta o al aire: ≈ 20 µA y flota hacia 1,4 V
        }
      }
      p.inp = inp;
      if (!powered) { p.out = {}; return; }
      const o = d.eval(p, inp); p.out = o;
      for (const pin in o) { const m = outModel(fam, vcc, o[pin]); pg[pin - 1] = 1 / m[1]; pi[pin - 1] = (m[0] + vg) / m[1]; pk[pin - 1] = o[pin] ? 2 : 3; }
    } else if (p.type === 'GATE') { // puerta ideal: pins = [in..., out]
      const k = p.pins.length - 1, a = [];
      for (let i = 0; i < k; i++) a.push(this.level(i, p, p.pins[i], 1.5, 3.5, 0, 0));
      const y = GATES[p.fn](a); p.val = y; p.out = y;
      pg[k] = 1; pi[k] = y ? 5 : 0; pk[k] = y ? 2 : 3;
    } else if (p.type === 'FF') { // biestable ideal: pins [D/J, CLK, K/-, PR, CLR, Q, Qn] segun p.kind
      const L = (i) => p.pins[i] == null ? 1 : this.level(i, p, p.pins[i], 1.5, 3.5, 0, i >= 3 ? 1 : 0), s = p.st;
      const j = L(0), c = L(1), k = L(2), pr = L(3), cl = L(4);
      const edge = p.edge === 'fall' ? (c === 0 && s.pc === 1) : (c === 1 && s.pc === 0);
      if (!s.init) { s.init = true; s.pc = c; } else s.pc = c;
      if (pr === 0 && p.pins[3] != null) s.q = 1; else if (cl === 0 && p.pins[4] != null) s.q = 0;
      else if (edge) {
        if (p.kind === 'D') s.q = j; else if (p.kind === 'T') { if (j) s.q ^= 1; } else if (j && k) s.q ^= 1; else if (j) s.q = 1; else if (k) s.q = 0;
      }
      pg[5] = 1; pi[5] = s.q ? 5 : 0; pk[5] = s.q ? 2 : 3; pg[6] = 1; pi[6] = s.q ? 0 : 5; pk[6] = s.q ? 3 : 2;
    } else if (p.type === 'SRC') { // fuente lógica: nivel / reloj
      let y;
      if (p.mode === 'clock') { const per = 1 / p.hz; y = ((this.t % per) / per) < (p.duty || 0.5) ? 1 : 0; } else if (p.mode === 'pulse') y = p.level ? 1 : 0; else y = p.level ? 1 : 0;
      let vh = p.vh || 5;
      if (p.pwr) { const vcc = (this.vp[p.pins[1]] || 0) - (this.vp[p.pins[2]] || 0); p.on = vcc > 2.4 && vcc < 6; vh = vcc; if (!p.on) { p.val = 0; pg[0] = GMIN; pi[0] = 0; pk[0] = 0; return; } }
      p.val = y; pg[0] = 1 / (p.rout || 1); pi[0] = (y ? vh : 0) * pg[0]; pk[0] = y ? 2 : 3;
    } else if (p.type === 'MCU') this.dMcu(p);
  }
  d555(p, vcc, vg) {
    const pins = p.pins, vp = this.vp, pg = p.pg, pi = p.pi, pk = p.pk, s = p.st;
    const vt = (n) => vp[n] - vg;
    if (!p.powered) { s.ff = 0; return; }
    // divisor interno: CTRL con Thevenin 2/3 Vcc a 3,33 kΩ
    pg[4] = 1 / 3333; pi[4] = (vg + vcc * 2 / 3) / 3333;
    const ctrl = vt(pins[4]), hiTh = ctrl, loTh = ctrl / 2;
    const rst = vt(pins[3]) < 0.7, thr = vt(pins[5]), trg = vt(pins[1]);
    if (rst) s.ff = 0; else if (trg < loTh) s.ff = 1; else if (thr > hiTh) s.ff = 0;
    // salida
    const m = s.ff ? [vcc - 1.7, 90] : [0.1, 12];
    pg[2] = 1 / m[1]; pi[2] = (m[0] + vg) / m[1]; pk[2] = s.ff ? 2 : 3;
    // transistor de descarga cuando Q = 0
    if (!s.ff) { pg[6] = 1 / 15; pi[6] = vg / 15; pk[6] = 4; }
    p.out = { 3: s.ff };
  }
  dMcu(p) {
    const n = p.pins.length, vdd = p.vdd || 5, vp = this.vp;
    const th = thresholds(FAM.MCU, vdd), lev = new Array(n);
    for (let i = 0; i < n; i++) lev[i] = this.level(i, p, p.pins[i], th[0], th[1], 0, 0);
    const dr = p.ctl ? p.ctl.sample(lev, this.t, this) : [];
    for (let i = 0; i < n; i++) { const d = dr[i]; if (!d) continue;
      if (d === 1 || d === 2) { const m = outModel(FAM.MCU, vdd, d === 1); p.pg[i] = 1 / m[1]; p.pi[i] = m[0] / m[1]; p.pk[i] = d === 1 ? 2 : 3; }
      else if (d === 3) { p.pg[i] = 1 / 35000; p.pi[i] = vdd / 35000; p.pk[i] = 5; } }
  }
  /* ---- estampado ---- */
  stamp() {
    const M = this.M, A = this.A, b = this.b, N = this.N, dt = this.dt;
    A.fill(0); b.fill(0);
    const G2 = (a, c, g) => { // conductancia entre nodos a y c
      if (a) A[(a - 1) * M + (a - 1)] += g; if (c) A[(c - 1) * M + (c - 1)] += g;
      if (a && c) { A[(a - 1) * M + (c - 1)] -= g; A[(c - 1) * M + (a - 1)] -= g; } };
    const I1 = (a, i) => { if (a) b[a - 1] += i; };
    for (let k = 1; k < N; k++) A[(k - 1) * M + (k - 1)] += GMIN;
    for (const p of this.parts) {
      const pn = p.pins;
      switch (p.type) {
        case 'R': G2(pn[0], pn[1], 1 / Math.max(p.r, 1e-3)); break;
        case 'VM': G2(pn[0], pn[1], 1 / 1e7); break;
        case 'AMM': G2(pn[0], pn[1], 1 / 0.2); break;
        case 'C': { const g = p.c / dt; G2(pn[0], pn[1], g); const ic = g * p.st.vc; I1(pn[0], ic); I1(pn[1], -ic); break; }
        case 'SW': G2(pn[0], pn[1], p.closed ? 1000 : 1e-12); break;
        case 'V': { const g = 1000; G2(pn[0], 0, g); I1(pn[0], p.v * g); break; }
        case 'LED': { const [vf, rs] = p.led; const g = p.st.on ? 1 / rs : GMIN; G2(pn[0], pn[1], g); if (p.st.on) { I1(pn[0], vf * g); I1(pn[1], -vf * g); } break; }
        case 'DISP7': { const [vf, rs] = p.led; const com = pn[7];
          for (let k = 0; k < 8; k++) { const a = p.ca ? com : pn[k], c = p.ca ? pn[k] : com; const on = p.st.on[k]; const g = on ? 1 / rs : GMIN; G2(a, c, g); if (on) { I1(a, vf * g); I1(c, -vf * g); } }
          break; }
        case 'IC': case 'GATE': case 'FF': case 'SRC': case 'MCU': {
          for (let i = 0; i < pn.length; i++) { if (pn[i] == null) continue; const g = p.pg[i]; if (g > GMIN * 2 || p.pk[i]) { G2(pn[i], 0, g); I1(pn[i], p.pi[i]); } }
          break; }
      }
    }
  }
  solve() {
    const M = this.M; if (!M) return;
    let same = this.haveLU;
    if (same) { const A = this.A, Ac = this.Ac; for (let i = 0, n = M * M; i < n; i++) if (A[i] !== Ac[i]) { same = false; break; } }
    if (!same) { this.Ac.set(this.A); this.lu = this.lu || new Float64Array(M * M); this.lu.set(this.A); luFactor(this.lu, M, this.piv); this.haveLU = true; }
    const x = this.b.slice(); luSolve(this.lu, M, this.piv, x);
    this.v[0] = 0; for (let i = 0; i < M; i++) this.v[i + 1] = x[i];
  }
  ledUpdate() {
    let ch = false; const v = this.v;
    for (const p of this.parts) {
      if (p.type === 'LED') { const vd = v[p.pins[0]] - v[p.pins[1]], vf = p.led[0], s = p.st; const on = s.on ? (vd - vf) / p.led[1] > 1e-7 : vd > vf + 0.002; if (on !== s.on) { s.on = on; ch = true; } s.i = on ? Math.max(0, (vd - vf) / p.led[1]) : 0; }
      else if (p.type === 'DISP7') { const vf = p.led[0], s = p.st;
        for (let k = 0; k < 8; k++) { const vd = p.ca ? v[p.pins[7]] - v[p.pins[k]] : v[p.pins[k]] - v[p.pins[7]]; const on = s.on[k] ? (vd - vf) / p.led[1] > 1e-7 : vd > vf + 0.002; if (on !== !!s.on[k]) { s.on[k] = on ? 1 : 0; ch = true; } s.i[k] = on ? Math.max(0, (vd - vf) / p.led[1]) : 0; } }
    }
    return ch;
  }
  step() {
    this.t += this.dt; this.stepN++;
    this.vp.set(this.v);
    for (const p of this.parts) if (p.type === 'IC' || p.type === 'GATE' || p.type === 'FF' || p.type === 'SRC' || p.type === 'MCU') this.digital(p);
    for (let it = 0; it < 5; it++) { this.stamp(); this.solve(); if (!this.ledUpdate()) break; }
    for (const p of this.parts) if (p.type === 'C') p.st.vc = this.v[p.pins[0]] - this.v[p.pins[1]];
    if (this.watches.length && this.stepN % this.recEvery === 0) for (const w of this.watches) {
      w.t.push(this.t); w.v.push(this.v[w.node]); if (w.t.length > 600000) { w.t.splice(0, 100000); w.v.splice(0, 100000); } }
  }
  run(seconds) { const n = Math.max(1, Math.round(seconds / this.dt)); for (let i = 0; i < n; i++) this.step(); }
  /* medidas */
  vNode(n) { return this.v[n]; }
  /* Sobrecarga: si el componente supera sus límites durante varias comprobaciones seguidas, queda inutilizado
     y se devuelve el motivo. R: 1/4 W · LED y segmentos: 30 mA · salidas de integrados: 25 mA · alimentación de integrados. */
  overload(p) {
    const v = this.v; let m = null;
    if (p.type === 'R' && !p.open) { const V = v[p.pins[0]] - v[p.pins[1]], P = V * V / Math.max(p.r, 1e-3); if (P > 0.25) m = `la resistencia disipa ${(P * 1e3).toFixed(0)} mW (${(Math.abs(V / p.r) * 1e3).toFixed(0)} mA con ${V.toFixed(1).replace('.', ',')} V); aguanta 250 mW (1/4 W). Queda abierta.`; }
    else if (p.type === 'LED' && !p.dead) { if (p.st.i > 0.03) m = `circulan ${(p.st.i * 1e3).toFixed(0)} mA; el máximo del LED es 30 mA (normal: 10-20 mA). Falta una resistencia en serie o es demasiado pequeña (a 5 V, ≥ 180 Ω).`; }
    else if (p.type === 'DISP7' && !p.dead) { const com = p.pins[7]; for (let k = 0; k < 8; k++) { if (!p.st.on[k]) continue; const a = p.ca ? com : p.pins[k], c = p.ca ? p.pins[k] : com, i = (v[a] - v[c] - p.led[0]) / p.led[1]; if (i > 0.03) { m = `el segmento ${'abcdefgp'[k]} soporta ${(i * 1e3).toFixed(0)} mA; el máximo es 30 mA (normal: 10-20 mA). Cada segmento necesita su resistencia en serie.`; break; } } }
    else if (p.type === 'IC' && !p.burned && p.powered && p.out && p.def && !p.def.analog) { for (const pin in p.out) { const i = p.pk[pin - 1] ? p.pi[pin - 1] - p.pg[pin - 1] * v[p.pins[pin - 1]] : 0; if (Math.abs(i) > 0.025) { m = `la salida de la pata ${pin} ${i > 0 ? 'entrega' : 'absorbe'} ${(Math.abs(i) * 1e3).toFixed(0)} mA; el máximo es 25 mA. Suele ser un cortocircuito de la salida a +5 V o a GND, o un LED sin resistencia.`; break; } } }
    else if (p.type === 'IC' && p.burned) m = 'alimentación fuera de límites: el integrado está dañado.';
    if (!m) { p.ovN = 0; return null; }
    if ((p.ovN = (p.ovN || 0) + 1) < 3) return null;
    if (p.type === 'R') { p.open = 1; p.r = 1e9; } else if (p.type === 'LED' || p.type === 'DISP7') { p.led = [99, 1e9]; p.dead = 1; } else if (p.type === 'IC') p.burned = true;
    return m;
  }
  current(p) {
    switch (p.type) {
      case 'R': return (this.v[p.pins[0]] - this.v[p.pins[1]]) / p.r;
      case 'AMM': return (this.v[p.pins[0]] - this.v[p.pins[1]]) / 0.2;
      case 'LED': return p.st.i;
      case 'SW': return p.closed ? (this.v[p.pins[0]] - this.v[p.pins[1]]) * 1000 : 0;
    } return 0;
  }
}
E.Sim = Sim;

/* ---------- Constructor de redes (union-find) ---------- */
class NetBuilder {
  constructor() { this.par = new Map(); this.parts = []; this.add('GND'); }
  add(id) { if (!this.par.has(id)) this.par.set(id, id); return id; }
  find(id) { this.add(id); let r = id; while (this.par.get(r) !== r) r = this.par.get(r); let c = id; while (this.par.get(c) !== r) { const n = this.par.get(c); this.par.set(c, r); c = n; } return r; }
  join(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) { if (rb === 'GND') this.par.set(ra, rb); else this.par.set(rb, ra); } }
  part(p) { this.parts.push(p); return p; }
  /* p.pinIds: ids de nodo por patilla (null = sin conectar) */
  build() {
    const idx = new Map(); idx.set(this.find('GND'), 0);
    const ni = (id) => { if (id == null) return null; const r = this.find(id); if (!idx.has(r)) idx.set(r, idx.size); return idx.get(r); };
    const parts = this.parts.map(p => { const q = Object.assign({}, p); q.pins = p.pinIds.map(ni); return q; });
    const nl = { n: idx.size, parts, index: (id) => { if (id == null) return null; const r = this.find(id); return idx.has(r) ? idx.get(r) : null; } };
    nl.warnings = analyze(nl);
    return nl;
  }
}
E.NetBuilder = NetBuilder;

/* avisos estáticos: entradas al aire, nodos sin alimentación */
function analyze(nl) {
  const w = [], deg = new Array(nl.n).fill(0), inputsOn = new Map();
  nl.parts.forEach((p, pi) => {
    const add = (n, cond) => { if (n != null && n > 0 && cond) deg[n]++; };
    switch (p.type) {
      case 'R': case 'C': case 'SW': case 'LED': case 'AMM': p.pins.forEach(n => add(n, true)); break;
      case 'V': add(p.pins[0], true); break;
      case 'SRC': add(p.pins[0], true); break;
      case 'GATE': add(p.pins[p.pins.length - 1], true); break;
      case 'FF': add(p.pins[5], 1); add(p.pins[6], 1); break;
      case 'MCU': p.pins.forEach(n => add(n, true)); break;
      case 'IC': {
        const d = IC[p.ic]; d.outs && d.outs.forEach(o => add(p.pins[o - 1], true));
        if (d.analog === '555') { [4, 7, 3].forEach(i => add(p.pins[i - 1], true)); }
        (d.ins || []).forEach(i => { const n = p.pins[i - 1]; if (n != null && n > 0) { if (!inputsOn.has(n)) inputsOn.set(n, []); inputsOn.get(n).push({ part: pi, pin: i, p }); } });
        if (d.analog === '555') [2, 4, 6].forEach(i => { const n = p.pins[i - 1]; if (n != null && n > 0) { if (!inputsOn.has(n)) inputsOn.set(n, []); inputsOn.get(n).push({ part: pi, pin: i, p }); } });
        break; }
    }
  });
  nl.deg = deg;
  nl.parts.forEach((p, pi) => { if (p.type === 'IC' && p.label !== undefined) {
    const d = IC[p.ic];
    if (d.vcc && (p.pins[d.vcc - 1] == null || p.pins[d.gnd - 1] == null)) w.push({ part: pi, msg: `${p.label || d.name}: VCC (pata ${d.vcc}) o GND (pata ${d.gnd}) sin conectar.` });
    (d.ins || []).forEach(i => { if (p.pins[i - 1] == null) w.push({ part: pi, msg: `${p.label || d.name}: entrada de la pata ${i} (${d.pn[i] || ''}) al aire.` }); });
  } });
  inputsOn.forEach((lst, n) => { if (deg[n] === 0) { const s = lst[0]; if (s.p.label !== undefined) w.push({ part: s.part, msg: `Entrada al aire en ${s.p.label || IC[s.p.ic].name}, pata ${s.pin} (${IC[s.p.ic].pn[s.pin] || ''}): nada la fija a 0 ni a 1.` }); } });
  return w;
}

E.luFactor = luFactor; E.luSolve = luSolve;
root.DSim = E;
if (typeof module !== 'undefined') module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
