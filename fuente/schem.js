/* Editor de esquemas lógicos + simulación (equivale a Logisim / SimulIDE) */
(function (root) {
'use strict';
const S = {};
const NS = 'http://www.w3.org/2000/svg';
const INK = '#1F2421', MUTE = '#696C69', HI = '#B85D34', LOW = '#1F2421', FLT = '#A8A59C', BG = '#F9F8F6', BORD = '#E2DFD8', SAGE = '#6A7B6C';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
S.parseVal = (s) => { s = String(s).trim().replace(',', '.').replace(/[ΩFfohm]/gi, ''); const m = s.match(/^([\d.]+)\s*([pnuµmkKM]?)/); if (!m) return NaN; const mult = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, '': 1 }[m[2]]; return parseFloat(m[1]) * mult; };
S.fmtVal = (v, u) => { const a = Math.abs(v); const f = (x, p) => (+x.toPrecision(3)).toString().replace('.', ',') + ' ' + p + u; if (a >= 1e6) return f(v / 1e6, 'M'); if (a >= 1e3) return f(v / 1e3, 'k'); if (a >= 1) return f(v, ''); if (a >= 1e-3) return f(v * 1e3, 'm'); if (a >= 1e-6) return f(v * 1e6, 'µ'); if (a >= 1e-9) return f(v * 1e9, 'n'); return f(v * 1e12, 'p'); };

/* ---------- definición de componentes ---------- */
const KIND = {};
S.KIND = KIND;
const pinsLeft = (names, y0, dy) => names.map((n, i) => ({ n, x: 0, y: y0 + i * dy }));
function gateK(id, label, n0) {
  KIND[id] = { name: label, group: 'Puertas', props: { n: n0 || 2 },
    propsDef: id === 'NOT' || id === 'BUF' ? [] : [{ k: 'n', label: 'Entradas', type: 'sel', opts: [2, 3, 4] }],
    geom(p) { if (id === 'NOT' || id === 'BUF') return { w: 50, h: 40, pins: [{ n: 'A', x: 0, y: 20 }, { n: 'Y', x: 50, y: 20, out: 1 }] };
      const n = +p.props.n, h = Math.max(40, n * 20); const y0 = (h - (n - 1) * 20) / 2;
      return { w: 60, h, pins: [...Array.from({ length: n }, (_, i) => ({ n: 'ABCD'[i], x: 0, y: y0 + i * 20 })), { n: 'Y', x: 60, y: h / 2, out: 1 }] }; },
    draw(p, g) {
      const h = g.h, m = h / 2, st = `fill="${BG}" stroke="${INK}" stroke-width="1.8"`; let s = '';
      const bub = (x) => `<circle cx="${x}" cy="${m}" r="4" ${st}/>`;
      if (id === 'AND' || id === 'NAND') s = `<path d="M0,0 H25 A25,${m} 0 0 1 25,${h} H0 Z" ${st}/>` + (id === 'NAND' ? bub(54) : '') + `<line x1="${id === 'NAND' ? 58 : 50}" y1="${m}" x2="60" y2="${m}" stroke="${INK}" stroke-width="1.8"/>`;
      else if (id === 'OR' || id === 'NOR' || id === 'XOR' || id === 'XNOR') {
        s = `<path d="M0,0 C25,0 42,${h * .2} 52,${m} C42,${h * .8} 25,${h} 0,${h} Q12,${m} 0,0 Z" ${st}/>`;
        if (id === 'XOR' || id === 'XNOR') s += `<path d="M-7,0 Q5,${m} -7,${h}" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
        if (id === 'NOR' || id === 'XNOR') s += bub(56); s += `<line x1="${id === 'NOR' || id === 'XNOR' ? 60 : 52}" y1="${m}" x2="60" y2="${m}" stroke="${INK}" stroke-width="1.8"/>`; }
      else { s = `<path d="M0,0 L40,20 L0,40 Z" ${st}/>`; if (id === 'NOT') s += `<circle cx="44" cy="20" r="4" ${st}/><line x1="48" y1="20" x2="50" y2="20" stroke="${INK}" stroke-width="1.8"/>`; else s += `<line x1="40" y1="20" x2="50" y2="20" stroke="${INK}" stroke-width="1.8"/>`; }
      // patillas de entrada (cola)
      return s; } };
}
['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR', 'NOT', 'BUF'].forEach(k => gateK(k, { AND: 'AND', OR: 'OR', NAND: 'NAND', NOR: 'NOR', XOR: 'XOR', XNOR: 'XNOR', NOT: 'NOT', BUF: 'Buffer' }[k]));

KIND.SW = { name: 'Entrada digital fija', group: 'Entradas', props: { label: 'A', on: 0 }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'on', label: 'Valor inicial', type: 'sel', opts: [0, 1] }],
  geom: () => ({ w: 50, h: 30, pins: [{ n: 'Y', x: 50, y: 15, out: 1 }] }),
  draw(p, g, rt) { const on = rt.on ?? p.props.on; return `<rect x="0" y="0" width="40" height="30" rx="4" fill="${on ? HI : BG}" stroke="${INK}" stroke-width="1.8"/><text x="20" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="${on ? BG : INK}">${on ? 1 : 0}</text><line x1="40" y1="15" x2="50" y2="15" stroke="${INK}" stroke-width="1.8"/><text x="20" y="-5" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>`; } };
KIND.PUSH = { name: 'Entrada digital pulsada', group: 'Entradas', props: { label: 'P', inv: 0 }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'inv', label: 'Salida a 0 al pulsar', type: 'sel', opts: [0, 1] }],
  geom: () => ({ w: 50, h: 30, pins: [{ n: 'Y', x: 50, y: 15, out: 1 }] }),
  draw(p, g, rt) { const pr = rt.pressed; return `<circle cx="20" cy="15" r="14" fill="${pr ? HI : BG}" stroke="${INK}" stroke-width="1.8"/><circle cx="20" cy="15" r="7" fill="none" stroke="${pr ? BG : MUTE}" stroke-width="1.5"/><line x1="34" y1="15" x2="50" y2="15" stroke="${INK}" stroke-width="1.8"/><text x="20" y="-5" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>`; } };

/* Interruptor y pulsador reales (dos terminales, símbolo eléctrico): abren o cierran el circuito; no dan niveles lógicos por sí solos. */
const swTerm = (cl) => `<path d="M0,20 H14 M46,20 H60" fill="none" stroke="${INK}" stroke-width="1.8"/><circle cx="14" cy="20" r="2.6" fill="${BG}" stroke="${INK}" stroke-width="1.6"/><circle cx="46" cy="20" r="2.6" fill="${BG}" stroke="${INK}" stroke-width="1.6"/>`;
KIND.SWM = { name: 'Interruptor', group: 'Entradas', desc: 'Interruptor simple de dos terminales (SPST): clic para abrirlo o cerrarlo. Abierto no conduce; cerrado es un cable.', props: { label: 'S1', on: 0 }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'on', label: 'Estado inicial (1 = cerrado)', type: 'sel', opts: [0, 1] }],
  geom: () => ({ w: 60, h: 30, pins: [{ n: 'A', x: 0, y: 20 }, { n: 'B', x: 60, y: 20 }] }),
  draw(p, g, rt) { const cl = rt.closed ?? +p.props.on; return swTerm() + (cl ? `<line x1="15" y1="20" x2="45" y2="20" stroke="${HI}" stroke-width="2.6"/>` : `<line x1="15" y1="19" x2="43" y2="5" stroke="${INK}" stroke-width="2.2"/>`) + `<text x="30" y="-4" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>`; } };
KIND.PSH = { name: 'Pulsador', group: 'Entradas', desc: 'Pulsador de dos terminales: normalmente abierto (conduce solo mientras lo mantienes pulsado) o normalmente cerrado.', props: { label: 'P1', nc: 0 }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'nc', label: 'Tipo (0 = NA, 1 = NC)', type: 'sel', opts: [0, 1] }],
  geom: () => ({ w: 60, h: 30, pins: [{ n: 'A', x: 0, y: 20 }, { n: 'B', x: 60, y: 20 }] }),
  draw(p, g, rt) { const cl = rt.closed ?? (p.props.nc ? 1 : 0), pr = rt.pressed, y = cl ? 19 : 12; return swTerm() + `<line x1="14" y1="${y}" x2="46" y2="${y}" stroke="${cl ? HI : INK}" stroke-width="2.4"/><line x1="30" y1="${y}" x2="30" y2="${pr ? 5 : 2}" stroke="${INK}" stroke-width="1.8"/><line x1="22" y1="${pr ? 5 : 2}" x2="38" y2="${pr ? 5 : 2}" stroke="${INK}" stroke-width="2.4"/>` + (p.props.nc ? `<path d="M26,14 L26,22" stroke="${INK}" stroke-width="1" />` : '') + `<text x="30" y="-10" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>`; } };
KIND.CLK = { name: 'Reloj', group: 'Entradas', props: { label: 'CLK', hz: 1 }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'hz', label: 'Frecuencia (Hz)', type: 'num' }],
  geom: () => ({ w: 60, h: 30, pins: [{ n: 'Y', x: 60, y: 15, out: 1 }] }),
  draw(p, g, rt) { return `<rect x="0" y="0" width="50" height="30" rx="4" fill="${BG}" stroke="${INK}" stroke-width="1.8"/><path d="M6,22 H14 V8 H24 V22 H34 V8 H44" fill="none" stroke="${rt.val ? HI : INK}" stroke-width="1.6"/><line x1="50" y1="15" x2="60" y2="15" stroke="${INK}" stroke-width="1.8"/><text x="25" y="-5" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)} · ${esc(p.props.hz)} Hz</text>`; } };
KIND.HI = { name: '+5 V', group: 'Alimentación', props: {}, geom: () => ({ w: 20, h: 24, pins: [{ n: 'P', x: 10, y: 24 }] }), draw: () => `<line x1="10" y1="24" x2="10" y2="8" stroke="${INK}" stroke-width="1.8"/><line x1="0" y1="8" x2="20" y2="8" stroke="${INK}" stroke-width="2.4"/><text x="10" y="-2" text-anchor="middle" font-size="11" fill="${MUTE}">+5 V</text>` };
KIND.LO = { name: 'GND', group: 'Alimentación', props: {}, geom: () => ({ w: 20, h: 22, pins: [{ n: 'P', x: 10, y: 0 }] }), draw: () => `<line x1="10" y1="0" x2="10" y2="10" stroke="${INK}" stroke-width="1.8"/><line x1="0" y1="10" x2="20" y2="10" stroke="${INK}" stroke-width="2.4"/><line x1="4" y1="15" x2="16" y2="15" stroke="${INK}" stroke-width="2"/><line x1="8" y1="20" x2="12" y2="20" stroke="${INK}" stroke-width="2"/>` };
KIND.LED = { name: 'LED con resistencia y GND', group: 'Salidas', props: { label: 'L', color: 'red', r: '330' }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'color', label: 'Color', type: 'sel', opts: ['red', 'green', 'yellow', 'blue'] }, { k: 'r', label: 'Resistencia serie (Ω)', type: 'text' }],
  geom: () => ({ w: 100, h: 42, pins: [{ n: 'A', x: 0, y: 15 }] }),
  draw(p, g, rt) { const C = { red: '#B8432F', green: '#4F8A57', yellow: '#C9A227', blue: '#4C6A8C' }[p.props.color], on = rt.on, st = `stroke="${INK}" stroke-width="1.8" fill="none"`;
    return `<path d="M0,15 H8 H12 L15,8 L21,22 L27,8 L33,22 L39,8 L42,15 H50 H54" ${st}/><text x="31" y="1" text-anchor="middle" font-size="10" fill="${MUTE}">${esc(S.fmtVal(S.parseVal(p.props.r) || 330, 'Ω'))}</text>`
    + `<circle cx="67" cy="15" r="12" fill="${on ? C : BG}" stroke="${INK}" stroke-width="1.8"/>${on ? `<circle cx="67" cy="15" r="17" fill="none" stroke="${C}" stroke-opacity=".45" stroke-width="3"/>` : ''}<path d="M61,9 L61,21 L73,15 Z" fill="${on ? BG : MUTE}" opacity=".85"/><line x1="73" y1="9" x2="73" y2="21" stroke="${on ? BG : MUTE}" stroke-width="1.6"/>`
    + `<path d="M79,15 H92 V30" ${st}/><line x1="84" y1="30" x2="100" y2="30" stroke="${INK}" stroke-width="1.8"/><line x1="87" y1="34" x2="97" y2="34" stroke="${INK}" stroke-width="1.8"/><line x1="90" y1="38" x2="94" y2="38" stroke="${INK}" stroke-width="1.8"/><text x="67" y="-8" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>`; } };
KIND.D7 = { name: 'Display 7 segmentos', group: 'Salidas', props: { label: 'D7', ca: 0 }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'ca', label: 'Tipo', type: 'sel', opts: [{ v: 0, t: 'Cátodo común' }, { v: 1, t: 'Ánodo común' }] }],
  geom: () => ({ w: 100, h: 200, pins: [...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].map((n, i) => ({ n, x: 0, y: 20 + i * 20 })), { n: 'COM', x: 50, y: 200 }] }),
  draw(p, g, rt) { const on = rt.segs || [], C = '#B8432F', off = '#E2DFD8';
    const P = { a: '30,22 70,22 64,29 36,29', b: '72,24 78,30 78,64 72,70 66,64 66,30', c: '72,74 78,80 78,114 72,120 66,114 66,80', d: '30,122 36,115 64,115 70,122 64,129 36,129', e: '28,74 34,80 34,114 28,120 22,114 22,80', f: '28,24 34,30 34,64 28,70 22,64 22,30', g: '30,72 36,66 64,66 70,72 64,78 36,78' };
    let s = `<rect x="14" y="10" width="72" height="136" rx="6" fill="#2a2d2b" opacity=".94" stroke="${INK}"/>`;
    Object.entries(P).forEach(([k, pts], i) => s += `<polygon points="${pts}" fill="${on[i] ? C : '#4a4d4a'}"/>`);
    s += `<circle cx="82" cy="126" r="3.5" fill="${on[7] ? C : '#4a4d4a'}"/>`;
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].forEach((n, i) => s += `<line x1="0" y1="${20 + i * 20}" x2="14" y2="${20 + i * 20}" stroke="${INK}" stroke-width="1.5"/><text x="19" y="${24 + i * 20}" font-size="9" fill="#bbb">${n}</text>`);
    return s + `<line x1="50" y1="146" x2="50" y2="200" stroke="${INK}" stroke-width="1.5"/><text x="56" y="170" font-size="10" fill="${MUTE}">COM ${p.props.ca ? '(+)' : '(−)'}</text><text x="50" y="4" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>`; } };
KIND.R = { name: 'Resistencia', group: 'Pasivos', props: { v: '1k', label: '' }, propsDef: [{ k: 'v', label: 'Valor (Ω)', type: 'text' }, { k: 'label', label: 'Nombre', type: 'text' }],
  geom: () => ({ w: 70, h: 20, pins: [{ n: 'A', x: 0, y: 10 }, { n: 'B', x: 70, y: 10 }] }),
  draw: (p) => `<path d="M0,10 H12 L16,2 L24,18 L32,2 L40,18 L48,2 L54,10 H70" fill="none" stroke="${INK}" stroke-width="1.8"/><text x="35" y="-4" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)} ${esc(S.fmtVal(S.parseVal(p.props.v), 'Ω'))}</text>` };
KIND.C = { name: 'Condensador', group: 'Pasivos', props: { v: '100n', label: '' }, propsDef: [{ k: 'v', label: 'Valor (F)', type: 'text' }, { k: 'label', label: 'Nombre', type: 'text' }],
  geom: () => ({ w: 70, h: 30, pins: [{ n: 'A', x: 0, y: 15 }, { n: 'B', x: 70, y: 15 }] }),
  draw: (p) => `<path d="M0,15 H30 M40,15 H70" stroke="${INK}" stroke-width="1.8" fill="none"/><line x1="30" y1="3" x2="30" y2="27" stroke="${INK}" stroke-width="2.4"/><line x1="40" y1="3" x2="40" y2="27" stroke="${INK}" stroke-width="2.4"/><text x="35" y="-4" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)} ${esc(S.fmtVal(S.parseVal(p.props.v), 'F'))}</text>` };
['D', 'JK', 'T'].forEach(k => {
  KIND['FF' + k] = { name: 'Biestable ' + k, group: 'Biestables', props: { label: '', edge: k === 'JK' ? 'fall' : 'rise' }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'edge', label: 'Flanco activo', type: 'sel', opts: [{ v: 'rise', t: 'Subida' }, { v: 'fall', t: 'Bajada' }] }],
    geom: () => ({ w: 60, h: 80, pins: [{ n: k === 'JK' ? 'J' : k, x: 0, y: 20 }, { n: 'CK', x: 0, y: k === 'JK' ? 40 : 60 }, ...(k === 'JK' ? [{ n: 'K', x: 0, y: 60 }] : []), { n: 'PR', x: 30, y: 0 }, { n: 'CLR', x: 30, y: 80 }, { n: 'Q', x: 60, y: 20, out: 1 }, { n: 'QN', x: 60, y: 60, out: 1 }] }),
    draw: (p, g, rt) => `<rect x="0" y="0" width="60" height="80" fill="${BG}" stroke="${INK}" stroke-width="1.8"/><text x="30" y="46" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">${k}</text><text x="6" y="${k === 'JK' ? 24 : 24}" font-size="10" fill="${MUTE}">${k === 'JK' ? 'J' : k}</text><text x="6" y="${k === 'JK' ? 44 : 64}" font-size="10" fill="${MUTE}">&gt;</text>${k === 'JK' ? `<text x="6" y="64" font-size="10" fill="${MUTE}">K</text>` : ''}<text x="48" y="24" font-size="10" fill="${rt.q ? HI : MUTE}" text-anchor="end">Q</text><text x="54" y="64" font-size="10" fill="${MUTE}" text-anchor="end">Q̅</text><text x="36" y="12" font-size="8" fill="${MUTE}">PR̅</text><text x="36" y="76" font-size="8" fill="${MUTE}">CLR̅</text><text x="30" y="-6" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>` };
});
KIND.VM = { name: 'Voltímetro', group: 'Instrumentos', props: { label: 'V' }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }],
  geom: () => ({ w: 90, h: 30, pins: [{ n: 'P', x: 0, y: 15 }, { n: 'N', x: 90, y: 15 }] }),
  draw: (p, g, rt) => `<rect x="10" y="0" width="70" height="30" rx="4" fill="${BG}" stroke="${INK}" stroke-width="1.8"/><line x1="0" y1="15" x2="10" y2="15" stroke="${INK}" stroke-width="1.8"/><line x1="80" y1="15" x2="90" y2="15" stroke="${INK}" stroke-width="1.8"/><text x="45" y="21" text-anchor="middle" font-size="16" font-weight="700" fill="${INK}">${rt.txt || '— V'}</text><text x="45" y="-5" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>` };
KIND.PROBE = { name: 'Sonda lógica', group: 'Instrumentos', props: { label: 'SL' }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }],
  geom: () => ({ w: 76, h: 30, pins: [{ n: 'P', x: 0, y: 15 }] }),
  draw: (p, g, rt) => `<line x1="0" y1="15" x2="12" y2="15" stroke="${INK}" stroke-width="1.8"/><rect x="12" y="0" width="64" height="30" rx="4" fill="${BG}" stroke="${INK}" stroke-width="1.8"/><circle cx="26" cy="15" r="6" fill="${rt.lv === 1 ? '#E0553A' : '#E2DFD8'}" stroke="${INK}"/><circle cx="44" cy="15" r="6" fill="${rt.lv === 0 ? '#4FA45C' : '#E2DFD8'}" stroke="${INK}"/><circle cx="62" cy="15" r="6" fill="${rt.lv === 'Z' ? '#3B7DD8' : '#E2DFD8'}" stroke="${INK}"/><text x="44" y="-5" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)} (1 · 0 · Z)</text>` };
KIND.DMM = { name: 'Multímetro', group: 'Instrumentos', props: { label: 'M1', mode: 'V' }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }, { k: 'mode', label: 'Modo (V = tensión, A = corriente en serie)', type: 'sel', opts: ['V', 'A'] }],
  geom: () => ({ w: 130, h: 64, pins: [{ n: 'P', x: 0, y: 32 }, { n: 'N', x: 130, y: 32 }] }),
  draw: (p, g, rt) => `<line x1="0" y1="32" x2="14" y2="32" stroke="#B8432F" stroke-width="2.4"/><line x1="116" y1="32" x2="130" y2="32" stroke="${INK}" stroke-width="2.4"/><rect x="14" y="0" width="102" height="64" rx="8" fill="#E0B531" stroke="${INK}" stroke-width="1.8"/><rect x="22" y="7" width="86" height="26" rx="3" fill="#c4cbb4" stroke="${INK}"/><text x="65" y="27" text-anchor="middle" font-size="16" font-family="monospace" fill="#222">${rt.txt || '—'}</text><circle cx="34" cy="48" r="10" fill="${p.props.mode === 'V' ? '#B85D34' : '#2d302e'}" stroke="${INK}"/><text x="34" y="54" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">V</text><circle cx="65" cy="48" r="10" fill="${p.props.mode === 'A' ? '#B85D34' : '#2d302e'}" stroke="${INK}"/><text x="65" y="54" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">A</text><text x="98" y="54" text-anchor="middle" font-size="9" fill="#2d302e">DC</text><text x="65" y="-6" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>` };
KIND.DMM.hidden = true; // el multímetro físico solo existe en la protoboard; se conserva por compatibilidad con archivos antiguos
KIND.LA8 = { name: 'Analizador lógico 8 canales', group: 'Instrumentos', props: { label: 'LA' }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }],
  geom: () => ({ w: 120, h: 200, pins: [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ n: 'I' + i, x: 0, y: 38 + (i - 1) * 20 })) }),
  draw: (p) => `<rect x="14" y="0" width="106" height="200" rx="3" fill="${BG}" stroke="${INK}" stroke-width="1.8"/><text x="67" y="-6" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text><text x="67" y="16" font-size="10" font-weight="700" fill="${INK}" text-anchor="middle">ANALIZADOR</text><line x1="14" y1="24" x2="120" y2="24" stroke="${BORD}"/>${[1, 2, 3, 4, 5, 6, 7, 8].map(i => { const y = 38 + (i - 1) * 20; return `<line x1="0" y1="${y}" x2="14" y2="${y}" stroke="${INK}" stroke-width="1.8"/><text x="20" y="${y + 4}" font-size="11" fill="${INK}">CH${i}</text><path d="M64,${y + 4} h9 v-8 h9 v8 h9 v-8 h9 v8" fill="none" stroke="${i % 2 ? SAGE : HI}" stroke-width="1.2"/>`; }).join('')}` };
KIND.WATCH = { name: 'Señal para cronograma', group: 'Instrumentos', props: { label: 'S1' }, propsDef: [{ k: 'label', label: 'Nombre', type: 'text' }],
  geom: () => ({ w: 50, h: 20, pins: [{ n: 'P', x: 0, y: 10 }] }),
  draw: (p) => `<line x1="0" y1="10" x2="8" y2="10" stroke="${INK}" stroke-width="1.8"/><rect x="8" y="0" width="42" height="20" rx="3" fill="${SAGE}" opacity=".2" stroke="${SAGE}"/><text x="29" y="14" text-anchor="middle" font-size="11" fill="${INK}">${esc(p.props.label)}</text>` };
KIND.NOTE = { name: 'Nota de texto', group: 'Instrumentos', props: { text: 'Nota' }, propsDef: [{ k: 'text', label: 'Texto', type: 'text' }], geom: () => ({ w: 120, h: 20, pins: [] }), draw: (p) => `<text x="0" y="14" font-size="13" fill="${MUTE}" font-style="italic">${esc(p.props.text)}</text>` };

/* circuitos integrados reales: caja DIP con el patillaje de la hoja de datos */
S.registerICs = function () {
  Object.values(DSim.IC).forEach(d => {
    const half = d.n / 2, id = 'IC:' + d.id;
    KIND[id] = { name: d.name, group: 'Integrados', ic: d.id, desc: d.desc, props: { label: 'U' },
      propsDef: [{ k: 'label', label: 'Referencia', type: 'text' }],
      geom: () => { const pins = []; for (let i = 1; i <= d.n; i++) { const left = i <= half; const row = left ? i - 1 : d.n - i; pins.push({ n: String(i), x: left ? 0 : 140, y: 30 + row * 20, out: (d.outs || []).includes(i) ? 1 : 0, name: d.pn[i] || '' }); } return { w: 140, h: half * 20 + 40, pins }; },
      draw: (p, g, rt) => { let s = `<rect x="16" y="0" width="108" height="${g.h}" fill="${BG}" stroke="${INK}" stroke-width="1.8"/><path d="M62,0 a8,8 0 0 0 16,0" fill="none" stroke="${INK}" stroke-width="1.5"/><text x="70" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}">${esc(d.name)}</text>`;
        g.pins.forEach(pn => { const left = pn.x === 0; s += `<line x1="${left ? 0 : 124}" y1="${pn.y}" x2="${left ? 16 : 140}" y2="${pn.y}" stroke="${INK}" stroke-width="1.8"/><text x="${left ? 21 : 119}" y="${pn.y + 4}" text-anchor="${left ? 'start' : 'end'}" font-size="10" fill="${INK}">${esc(pn.name)}</text><text x="${left ? 2 : 138}" y="${pn.y - 3}" text-anchor="${left ? 'start' : 'end'}" font-size="8" fill="${MUTE}">${pn.n}</text>`; });
        return s + `<text x="70" y="${g.h + 13}" text-anchor="middle" font-size="11" fill="${MUTE}">${esc(p.props.label)}</text>`; } };
  });
};

/* ---------- documento ---------- */
class Doc {
  constructor() { this.parts = []; this.wires = []; this.nid = 1; this.zones = []; }
  add(kind, x, y, props) { const k = KIND[kind]; if (!k) throw new Error('kind ' + kind); const p = { id: 'p' + this.nid++, kind, x, y, props: Object.assign({}, JSON.parse(JSON.stringify(k.props)), props || {}) }; this.parts.push(p); return p; }
  wire(a, an, b, bn) { const w = { id: 'w' + this.nid++, a: { p: a.id, n: an }, b: { p: b.id, n: bn } }; this.wires.push(w); return w; }
  part(id) { return this.parts.find(p => p.id === id); }
  remove(id) { this.parts = this.parts.filter(p => p.id !== id); this.wires = this.wires.filter(w => w.a.p !== id && w.b.p !== id); }
  toJSON() { return { parts: this.parts, wires: this.wires, nid: this.nid, zones: this.zones }; }
  static from(j) { const d = new Doc(); d.parts = j.parts; d.wires = j.wires; d.nid = j.nid; d.zones = j.zones || []; return d; }
}
S.Doc = Doc;
KIND.JN = { name: 'Nudo', group: 'Cables', hidden: true, props: {}, geom: () => ({ w: 0, h: 0, pins: [{ n: 'P', x: 0, y: 0 }] }), draw: () => `<circle cx="0" cy="0" r="7" fill="transparent"/>` };
const geomOf = (p) => { const g = KIND[p.kind].geom(p); if (p.rot !== 90) return g; return { w: g.h, h: g.w, base: g, pins: g.pins.map(q => ({ n: q.n, x: g.h - q.y, y: q.x, out: q.out })) }; };
const drawPart = (p, g, rt) => p.rot === 90 ? `<g transform="translate(${g.base.h},0) rotate(90)">${KIND[p.kind].draw(p, g.base, rt)}</g>` : KIND[p.kind].draw(p, g, rt);
/* ruta del cable: lista de puntos (a, codos…, b) */
const routeOf = (doc, w) => { const a = pinPos(doc, w.a.p, w.a.n), b = pinPos(doc, w.b.p, w.b.n); if (!a || !b) return null;
  if (w.pts) return [a, ...w.pts, b];
  if (b.x >= a.x + 10) { const mx = Math.round((a.x + b.x) / 20) * 10; return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]; }
  const my = Math.round((a.y + b.y) / 20) * 10; return [a, { x: a.x + 14, y: a.y }, { x: a.x + 14, y: my }, { x: b.x - 14, y: my }, { x: b.x - 14, y: b.y }, b]; };
/* ruta ortogonal por los puntos dados: tramos rectos y, si dos puntos no están alineados, un codo; el último tramo entra en la patilla en horizontal */
const orthoPath = (P) => { const o = [{ x: P[0].x, y: P[0].y }];
  for (let i = 1; i < P.length; i++) { const u = o[o.length - 1], v = P[i], prev = o.length > 1 ? o[o.length - 2] : null;
    if (u.x !== v.x && u.y !== v.y) { const hor = prev ? prev.y === u.y : Math.abs(v.x - u.x) >= Math.abs(v.y - u.y); o.push(hor ? { x: v.x, y: u.y } : { x: u.x, y: v.y }); }
    o.push({ x: v.x, y: v.y }); }
  return cleanPts(o); };
const ptsD = (P) => P.map((q, i) => (i ? 'L' : 'M') + q.x + ',' + q.y).join(' ');
const cleanPts = (P) => { const o = []; P.forEach(q => { const l = o[o.length - 1]; if (l && l.x === q.x && l.y === q.y) return; o.push({ x: q.x, y: q.y }); });
  for (let i = o.length - 2; i > 0; i--) { const a = o[i - 1], b = o[i], c = o[i + 1]; if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) o.splice(i, 1); } return o; };
const pinPos = (doc, pid, n) => { const p = doc.part(pid); if (!p) return null; const g = geomOf(p), pn = g.pins.find(q => q.n === n); return pn ? { x: p.x + pn.x, y: p.y + pn.y } : null; };

/* ---------- compilación a la red del motor ---------- */
S.compile = function (doc, opt = {}) {
  const nb = new DSim.NetBuilder(), refs = {}, conn = new Set(), pid = (p, n) => p.id + '.' + n;
  doc.wires.forEach(w => { nb.join(w.a.p + '.' + w.a.n, w.b.p + '.' + w.b.n); conn.add(w.a.p + '.' + w.a.n); conn.add(w.b.p + '.' + w.b.n); });
  const cid = (p, n) => conn.has(pid(p, n)) ? pid(p, n) : null;
  const push = (p, part) => { part.ref = p.id; nb.part(part); return nb.parts.length - 1; };
  const watches = [];
  doc.parts.forEach(p => {
    const k = p.kind, pr = p.props;
    if (k === 'SW') refs[p.id] = push(p, { type: 'SRC', mode: 'level', level: +pr.on, pinIds: [pid(p, 'Y')] });
    else if (k === 'PUSH') refs[p.id] = push(p, { type: 'SRC', mode: 'level', level: pr.inv ? 1 : 0, pinIds: [pid(p, 'Y')] });
    else if (k === 'SWM') refs[p.id] = push(p, { type: 'SW', closed: !!+pr.on, pinIds: [pid(p, 'A'), pid(p, 'B')] });
    else if (k === 'PSH') refs[p.id] = push(p, { type: 'SW', closed: !!+pr.nc, pinIds: [pid(p, 'A'), pid(p, 'B')] });
    else if (k === 'CLK') refs[p.id] = push(p, { type: 'SRC', mode: 'clock', hz: Math.max(1e-3, +pr.hz || 1), duty: 0.5, pinIds: [pid(p, 'Y')] });
    else if (k === 'HI') push(p, { type: 'V', v: 5, pinIds: [pid(p, 'P')] });
    else if (k === 'LO') nb.join(pid(p, 'P'), 'GND');
    else if (k === 'R') push(p, { type: 'R', r: Math.max(S.parseVal(pr.v) || 1, 1e-3), pinIds: [pid(p, 'A'), pid(p, 'B')] });
    else if (k === 'C') push(p, { type: 'C', c: S.parseVal(pr.v) || 1e-9, pinIds: [pid(p, 'A'), pid(p, 'B')] });
    else if (k === 'LED') { push(p, { type: 'R', r: S.parseVal(pr.r) || 330, pinIds: [pid(p, 'A'), pid(p, 'led')] }); refs[p.id] = push(p, { type: 'LED', color: pr.color, pinIds: [pid(p, 'led'), 'GND'] }); }
    else if (k === 'D7') { const ids = []; ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].forEach(n => { const mid = pid(p, 's' + n); push(p, { type: 'R', r: 330, pinIds: [pid(p, n), mid] }); ids.push(mid); }); refs[p.id] = push(p, { type: 'DISP7', color: 'red', ca: +pr.ca, pinIds: [...ids, pid(p, 'COM')] }); }
    else if (k.startsWith('FF')) { const kind = k.slice(2); refs[p.id] = push(p, { type: 'FF', kind: kind === 'D' ? 'D' : kind === 'T' ? 'T' : 'JK', edge: pr.edge, pinIds: [cid(p, kind === 'JK' ? 'J' : kind), cid(p, 'CK') || pid(p, 'CK'), kind === 'JK' ? cid(p, 'K') : null, cid(p, 'PR'), cid(p, 'CLR'), pid(p, 'Q'), pid(p, 'QN')] }); }
    else if (k === 'VM') refs[p.id] = push(p, { type: 'VM', pinIds: [pid(p, 'P'), pid(p, 'N')] });
    else if (k === 'PROBE') refs[p.id] = { node: pid(p, 'P') };
    else if (k === 'DMM') refs[p.id] = push(p, { type: pr.mode === 'A' ? 'AMM' : 'VM', pinIds: [pid(p, 'P'), pid(p, 'N')] });
    else if (k === 'WATCH') watches.push({ label: pr.label, id: pid(p, 'P') });
    else if (KIND[k].ic) {
      const d = DSim.IC[KIND[k].ic], ids = []; for (let i = 1; i <= d.n; i++) ids.push(cid(p, String(i)));
      if (opt.autoPower !== false) { if (d.vcc && ids[d.vcc - 1] === null) { ids[d.vcc - 1] = pid(p, 'avcc'); nb.part({ type: 'V', v: 5, pinIds: [pid(p, 'avcc')], auto: 1 }); } if (d.gnd && ids[d.gnd - 1] === null) ids[d.gnd - 1] = 'GND'; }
      refs[p.id] = push(p, { type: 'IC', ic: d.id, label: pr.label || d.name, pinIds: ids });
    }
    else if (k.startsWith('GATE')) { }
    else if (DSim.GATES[k]) { const n = (k === 'NOT' || k === 'BUF') ? 1 : +pr.n, ins = []; for (let i = 0; i < n; i++) ins.push(pid(p, 'ABCD'[i])); refs[p.id] = push(p, { type: 'GATE', fn: k, pinIds: [...ins, pid(p, 'Y')] }); }
  });
  const nl = nb.build();
  return { nl, refs, watches, nb };
};

/* ---------- editor ---------- */
S.Editor = class {
  constructor(root, o = {}) {
    this.root = root; this.doc = new Doc(); this.sel = null; this.tool = null; this.pend = null; this.view = { x: -20, y: -20, k: 1 };
    this.running = false; this.speed = 1; this.dt = 5e-5; this.autoPower = true; this.rt = {}; this.onChange = o.onChange; this.dirty = true; this.fpga = !!o.fpga; this.onFrame = o.onFrame;
    this.build(); this.recompile(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  build() {
    const r = this.root; r.innerHTML = `
    <div class="ed-left"><div class="pal-h">Componentes</div><div class="pal" id="pal"></div></div>
    <div class="ed-main"><div class="tb">
      <button class="b prim" data-a="run">▶ Simular</button><button class="b" data-a="step">Paso</button><button class="b" data-a="reset">Reiniciar</button>
      <label class="inl">Vel. <select data-a="speed"><option value="0.01">0,01×</option><option value="0.1">0,1×</option><option value="1" selected>1×</option><option value="10">10×</option><option value="100">100×</option></select></label>
      <label class="inl">Paso <select data-a="dt"><option value="1e-5">10 µs</option><option value="5e-5" selected>50 µs</option><option value="1e-4">100 µs</option><option value="1e-3">1 ms</option></select></label>
      <button class="b" data-a="auto" title="Ajusta velocidad, paso y ventana del analizador al reloj del circuito, para que la señal cruce la pantalla en unos 6 s">Autoajuste</button>
      <label class="inl" ${this.fpga ? "hidden" : ""}><input type="checkbox" data-a="ap" checked> alimentar integrados</label>
      <span class="sp"></span><span class="tstat" id="tstat">t = 0</span>
      <button class="b" data-a="tt">Tabla de verdad</button><button class="b" data-a="fit">Ajustar vista</button><button class="b" data-a="clear">Vaciar</button><button class="b" data-a="png">Captura</button>
    </div>
    <div class="cv"><svg id="sv" xmlns="${NS}"></svg><div class="hint" id="hint">Arrastra componentes del catálogo al lienzo. Arrastra de una patilla a otra para cablear. Doble clic en un componente para editar sus valores. Rueda: zoom.</div></div>
    <div class="tpanel"><canvas id="tc"></canvas><div class="tp-b"><button class="b sm" data-a="tfollow">Seguir</button><button class="b sm" data-a="tcur" data-cur="0">Cursor A</button><button class="b sm" data-a="tcur" data-cur="1">Cursor B</button><button class="b sm" data-a="tanalog">Analógico</button><span class="mut">Rueda: zoom · clic: cursor A · Mayús+clic: cursor B</span></div></div></div>
    <div class="ed-right"><div class="pal-h">Propiedades</div><div id="props" class="props"></div><div id="warns" class="warns"></div></div>`;
    this.svg = r.querySelector('#sv'); this.palEl = r.querySelector('#pal'); this.propsEl = r.querySelector('#props');
    if (window.ResizeObserver) new ResizeObserver(() => { this.dirty = true; }).observe(this.svg);
    this.timing = new Timing(r.querySelector('#tc'), { span: 0.02 });
    const groups = {}; Object.entries(KIND).filter(([id, k]) => !k.hidden && (!this.fpga || !(/^IC:/.test(id) || ['R', 'C', 'VM', 'D7'].includes(id)))).forEach(([id, k]) => (groups[k.group] = groups[k.group] || []).push(id));
    const order = ['Alimentación', 'Entradas', 'Salidas', 'Pasivos', 'Puertas', 'Biestables', 'Integrados', 'Instrumentos'];
    this.palEl.innerHTML = order.filter(g => groups[g]).map(g => `<details ${['Entradas', 'Salidas', 'Puertas', 'Instrumentos'].includes(g) ? 'open' : ''}><summary>${g}</summary>${groups[g].map(id => `<button class="pi" draggable="true" data-k="${id}" title="${esc(KIND[id].desc || UI.HELP[id] || KIND[id].name)}">${UI.schThumb(KIND[id], id)}<span>${esc(KIND[id].name)}</span></button>`).join('')}</details>`).join('');
    this.palEl.addEventListener('click', e => { const b = e.target.closest('.pi'); if (!b) return; this.tool = b.dataset.k; this.pend = null; this.palEl.querySelectorAll('.pi').forEach(x => x.classList.toggle('on', x === b)); this.hint('Haz clic en el lienzo para colocar «' + KIND[this.tool].name + '». Esc cancela.'); });
    this.palEl.addEventListener('dragstart', e => { const b = e.target.closest('.pi'); if (!b) return; e.dataTransfer.setData('text/plain', 'sch:' + b.dataset.k); e.dataTransfer.effectAllowed = 'copy'; this.tool = null; this.dragKind = b.dataset.k; this.dropDone = false; this.dragIn = false; this.lastDrag = null; const th = b.querySelector('svg'); if (th && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(th, 20, 20); });
    this.palEl.addEventListener('dragend', () => { const k = this.dragKind; this.dragKind = null; this.ghost = null; this.dirty = true; if (k && this.dragIn && !this.dropDone && this.lastDrag) this.placeAt(k, this.lastDrag); this.dragIn = false; this.dropDone = false; });
    this.svg.addEventListener('dragenter', e => { e.preventDefault(); this.dragIn = true; });
    this.svg.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; this.dragIn = true; if (this.dragKind) { const p = this.toDoc(e); this.lastDrag = p; const k0 = KIND[this.dragKind],  k = KIND[this.dragKind]; let g = { w: 40, h: 30 }; try { g = k.geom({ kind: this.dragKind, props: JSON.parse(JSON.stringify(k.props || {})) }) || g; } catch (er) { } this.ghost = { kind: this.dragKind, x: this.snap(p.x - (g.w || 40) / 2), y: this.snap(p.y - (g.h || 30) / 2), g }; this.dirty = true; } });
    this.svg.addEventListener('dragleave', (e) => { this.ghost = null; this.dirty = true; if (!e.relatedTarget || !this.svg.contains(e.relatedTarget)) this.dragIn = false; });
    this.svg.addEventListener('drop', e => { e.preventDefault(); const t = e.dataTransfer.getData('text/plain'); this.ghost = null; this.dragKind = null; this.dropDone = true; if (t.startsWith('sch:')) this.placeAt(t.slice(4), this.toDoc(e)); });
    r.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (a && a.tagName !== 'SELECT' && a.tagName !== 'INPUT') this.action(a.dataset.a, a); });
    r.querySelector('[data-a=speed]').onchange = e => this.speed = +e.target.value;
    r.querySelector('[data-a=dt]').onchange = e => { this.dt = +e.target.value; this.recompile(); };
    r.querySelector('[data-a=ap]').onchange = e => { this.autoPower = e.target.checked; this.recompile(); };
    const sv = this.svg;
    sv.addEventListener('mousedown', e => this.md(e)); window.addEventListener('mousemove', e => this.mm(e)); window.addEventListener('mouseup', e => this.mu(e));
    sv.addEventListener('wheel', e => { e.preventDefault(); const p = this.toDoc(e), f = e.deltaY > 0 ? 1.1 : 0.9; this.view.x = p.x - (p.x - this.view.x) * f; this.view.y = p.y - (p.y - this.view.y) * f; this.view.k *= f; this.dirty = true; }, { passive: false });
    sv.addEventListener('dblclick', e => { const hit = document.elementsFromPoint(e.clientX, e.clientY).find(x => sv.contains(x) && x.closest('.part')) || e.target; const pg = hit.closest && hit.closest('.part'); if (!pg) return; const part = this.doc.part(pg.dataset.id); if (part) { this.sel = part.id; this.openPop(part, e); } });
    window.addEventListener('keydown', e => { if (!this.root.offsetParent) return; if (e.target.matches('input,select,textarea')) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) { if (this.copySel()) e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) { if (this.pasteClip()) e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) { if (this.copySel()) { this.deleteSel(); e.preventDefault(); } }
      if (e.key === 'Escape') { this.setMsel(null); this.mq = null; this.tool = null; this.pend = null; this.palEl.querySelectorAll('.pi').forEach(x => x.classList.remove('on')); this.dirty = true; }
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.altKey && this.sel && !this.sel.startsWith('W:')) { this.rotateSel(); e.preventDefault(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (this.sel || this.msel)) { this.deleteSel(); e.preventDefault(); } });
  }
  finishWire(part, n) { const pd = this.pend, w = this.doc.wire(this.doc.part(pd.p), pd.n, part, n);
    const P = orthoPath([pinPos(this.doc, pd.p, pd.n), ...(pd.pts || []), pinPos(this.doc, part.id, n)]).slice(1, -1); if (P.length) w.pts = P; else if ((pd.pts || []).length) w.pts = []; this.pend = null; this.changed(); return w; }
  copySel() {
    const ids = this.msel ? new Set(this.msel) : (this.sel && !this.sel.startsWith('W:') && this.doc.part(this.sel) ? new Set([this.sel]) : null); if (!ids || !ids.size) return false;
    const cl = (o) => JSON.parse(JSON.stringify(o));
    this.clip = { parts: this.doc.parts.filter(p => ids.has(p.id)).map(cl), wires: this.doc.wires.filter(w => ids.has(w.a.p) && ids.has(w.b.p)).map(cl), n: 0 };
    this.hint(this.clip.parts.length + (this.clip.parts.length === 1 ? ' componente copiado.' : ' componentes copiados.') + ' Ctrl+V para pegar.'); return true;
  }
  pasteClip() {
    const c = this.clip; if (!c || !c.parts.length) return false; c.n++; const off = 40 * c.n, map = {}, ns = new Set();
    c.parts.forEach(o => { const q = this.doc.add(o.kind, o.x + off, o.y + off, o.props); if (o.rot) q.rot = o.rot; Object.keys(o).forEach(k => { if (!['id', 'kind', 'x', 'y', 'props', 'rot'].includes(k)) q[k] = JSON.parse(JSON.stringify(o[k])); }); if (['LED', 'SW', 'SWM', 'PSH'].includes(o.kind)) this.autoName(q); map[o.id] = q; ns.add(q.id); });
    c.wires.forEach(o => { const w = this.doc.wire(map[o.a.p], o.a.n, map[o.b.p], o.b.n); Object.keys(o).forEach(k => { if (!['id', 'a', 'b', 'pts'].includes(k)) w[k] = JSON.parse(JSON.stringify(o[k])); }); if (o.pts) w.pts = o.pts.map(q => ({ x: q.x + off, y: q.y + off })); });
    this.sel = null; this.setMsel(ns.size > 1 ? ns : null); if (ns.size === 1) this.sel = [...ns][0];
    this.hint(ns.size + (ns.size === 1 ? ' componente pegado' : ' componentes pegados') + ' y seleccionados: arrástralos a su sitio.'); this.changed(); return true;
  }
  hint(t) { this.root.querySelector('#hint').textContent = t; }
  action(a, el) {
    if (a === 'auto') { Timing.autoset(this); return; }
    if (a === 'run') { this.running = !this.running; el.textContent = this.running ? '❚❚ Pausar' : '▶ Simular'; }
    else if (a === 'step') { this.sim.run(this.dt * 20); this.dirty = true; }
    else if (a === 'reset') this.recompile();
    else if (a === 'clear') { if (confirm('¿Vaciar el esquema?')) { this.doc = new Doc(); this.sel = null; this.recompile(); } }
    else if (a === 'tfollow') { this.timing.follow = true; }
    else if (a === 'tcur') this.timing.toggleCursor(+el.dataset.cur);
    else if (a === 'tanalog') { this.timing.analog = !this.timing.analog; el.classList.toggle('on', this.timing.analog); }
    else if (a === 'tt') { const t = this.truthTable(); if (t) { this.lastTT = t; this.onChange && this.onChange('tt', t); } }
    else if (a === 'fit') this.fit();
    else if (a === 'png') this.capture();
  }
  /* ---- coordenadas ---- */
  toDoc(e) { const r = this.svg.getBoundingClientRect(); return { x: this.view.x + (e.clientX - r.left) * this.view.k, y: this.view.y + (e.clientY - r.top) * this.view.k }; }
  snap(v) { return Math.round(v / 10) * 10; }
  md(e) {
    const p = this.toDoc(e), t = e.target;
    if (e.altKey || e.button === 1) { e.preventDefault(); this.pan = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y }; return; }
    const pin = t.closest && t.closest('.pin');
    if (this.tool && !pin) { this.placeAt(this.tool, p); if (!e.shiftKey) { this.tool = null; this.palEl.querySelectorAll('.pi').forEach(x => x.classList.remove('on')); } return; }
    if (pin) {
      const ref = { p: pin.dataset.p, n: pin.dataset.n };
      this.pinDown = { x: e.clientX, y: e.clientY, moved: false };
      if (!this.pend) { this.pend = { p: ref.p, n: ref.n, pts: [] }; this.hint('Pica en zonas libres para poner codos y termina en otra patilla. También puedes arrastrar directamente a otra patilla. Esc cancela.'); } else {
        if (this.pend.p !== ref.p || this.pend.n !== ref.n) { this.finishWire(this.doc.part(ref.p), ref.n); }

        this.pend = null; this.hint('Cable creado.'); }
      this.dirty = true; return; }
    const sg = t.closest && t.closest('.seg');
    if (sg) { const w = this.doc.wires.find(x => x.id === sg.dataset.w); if (w) { if (!w.pts) w.pts = routeOf(this.doc, w).slice(1, -1); let k = +sg.dataset.k; if (k === 0) { w.pts.unshift({ x: pinPos(this.doc, w.a.p, w.a.n).x, y: pinPos(this.doc, w.a.p, w.a.n).y }); k = 1; } if (k === w.pts.length) { const b = pinPos(this.doc, w.b.p, w.b.n); w.pts.push({ x: b.x, y: b.y }); }
        const P = [pinPos(this.doc, w.a.p, w.a.n), ...w.pts, pinPos(this.doc, w.b.p, w.b.n)], p0 = P[k], p1 = P[k + 1]; this.segDrag = { w, i0: k - 1, i1: k, axis: Math.abs(p0.y - p1.y) < 1 ? 'h' : Math.abs(p0.x - p1.x) < 1 ? 'v' : 'f', s0: { x: p0.x, y: p0.y }, s1: { x: p1.x, y: p1.y }, from: p }; return; } }
    const wl = t.closest && t.closest('.wire');
    if (wl && this.pend) { const jn = this.junctionOn(wl.dataset.w, p); if (jn && jn.id !== this.pend.p) { this.finishWire(jn, 'P'); this.hint('Nudo creado.'); } return; }
    if (wl) { this.sel = 'W:' + wl.dataset.w; this.pend = null; this.wireDown = { id: wl.dataset.w, x: e.clientX, y: e.clientY, p }; this.showProps(); this.dirty = true; return; }
    const pg = t.closest && t.closest('.part');
    if (pg) {
      const part = this.doc.part(pg.dataset.id); this.pend = null;
      if (e.shiftKey) { const ms = this.msel || new Set(this.sel && !this.sel.startsWith('W:') ? [this.sel] : []); ms.has(part.id) ? ms.delete(part.id) : ms.add(part.id); this.sel = null; this.setMsel(ms); this.showProps(); this.dirty = true; return; }
      if (this.msel && this.msel.has(part.id)) {
        const ids = [...this.msel], ws = this.doc.wires.filter(w => this.msel.has(w.a.p) && this.msel.has(w.b.p) && w.pts);
        this.drag = { part, group: ids.map(i => { const q = this.doc.part(i); return { q, x: q.x, y: q.y }; }), wp: ws.map(w => ({ w, pts: w.pts.map(o => ({ x: o.x, y: o.y })) })), p0: p, sx: e.clientX, sy: e.clientY, moved: false };
        this.showProps(); this.dirty = true; return; }
      this.sel = part.id; this.msel = null; this.wsel = null;
      const k = KIND[part.kind];
      if (part.kind === 'PUSH') { this.rt[part.id] = this.rt[part.id] || {}; this.rt[part.id].pressed = true; this.setSrc(part, part.props.inv ? 0 : 1); }
      if (part.kind === 'PSH') { this.rt[part.id] = this.rt[part.id] || {}; this.rt[part.id].pressed = true; this.setSw(part, part.props.nc ? 0 : 1); }
      this.drag = { part, dx: p.x - part.x, dy: p.y - part.y, sx: e.clientX, sy: e.clientY, moved: false };
      this.showProps(); this.dirty = true; return; }
    if (this.pend) { this.pend.pts = this.pend.pts || []; this.pend.pts.push({ x: this.snap(p.x), y: this.snap(p.y) }); this.hint('Codo añadido. Sigue picando en zonas libres o termina en una patilla. Esc cancela.'); this.dirty = true; return; }
    if (!e.shiftKey) { this.sel = null; this.setMsel(null); } this.pend = null; this.mq = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, sx: e.clientX, sy: e.clientY, add: e.shiftKey && this.msel ? new Set(this.msel) : null }; this.showProps(); this.dirty = true;
  }
  setMsel(ms) { if (ms && ms.size === 0) ms = null; this.msel = ms; this.wsel = ms ? new Set(this.doc.wires.filter(w => ms.has(w.a.p) && ms.has(w.b.p)).map(w => w.id)) : null; }
  mm(e) {
    if (this.segDrag) { const d = this.segDrag, p = this.toDoc(e), w = d.w, dx = this.snap(p.x - d.from.x), dy = this.snap(p.y - d.from.y);
      const a = w.pts[d.i0], b = w.pts[d.i1]; if (a && b) { if (d.axis === 'h') { a.y = d.s0.y + dy; b.y = d.s1.y + dy; } else if (d.axis === 'v') { a.x = d.s0.x + dx; b.x = d.s1.x + dx; } else { a.x = d.s0.x + dx; a.y = d.s0.y + dy; b.x = d.s1.x + dx; b.y = d.s1.y + dy; } } this.dirty = true; this.mouse = p; return; }
    if (this.wireDown && Math.abs(e.clientX - this.wireDown.x) + Math.abs(e.clientY - this.wireDown.y) > 7) { const wd = this.wireDown; this.wireDown = null; const jn = this.junctionOn(wd.id, wd.p); if (jn) { this.pend = { p: jn.id, n: 'P' }; this.pinDown = { x: e.clientX, y: e.clientY, moved: true }; this.sel = null; this.hint('Suelta sobre una patilla, un nudo u otro cable.'); } }
    if (this.mq) { const p = this.toDoc(e); this.mq.x1 = p.x; this.mq.y1 = p.y; this.dirty = true; }
    if (this.drag && this.drag.group) { const d = this.drag, p = this.toDoc(e); if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true; if (d.moved) { const dx = this.snap(p.x - d.p0.x), dy = this.snap(p.y - d.p0.y); d.group.forEach(m => { m.q.x = m.x + dx; m.q.y = m.y + dy; }); d.wp.forEach(m => { m.w.pts = m.pts.map(o => ({ x: o.x + dx, y: o.y + dy })); }); this.doc.wires.forEach(w => { if (w.pts && !d.wp.some(m => m.w === w) && (this.msel.has(w.a.p) || this.msel.has(w.b.p))) delete w.pts; }); this.dirty = true; } }
    else if (this.drag) { const d = this.drag, p = this.toDoc(e); if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true; if (d.moved) { d.part.x = this.snap(p.x - d.dx); d.part.y = this.snap(p.y - d.dy); this.doc.wires.forEach(w => { if (w.a.p === d.part.id || w.b.p === d.part.id) delete w.pts; }); this.dirty = true; } }
    else if (this.pan) { this.view.x = this.pan.vx - (e.clientX - this.pan.x) * this.view.k; this.view.y = this.pan.vy - (e.clientY - this.pan.y) * this.view.k; this.dirty = true; }
    this.mouse = this.toDoc(e);
    if (this.pinDown && Math.abs(e.clientX - this.pinDown.x) + Math.abs(e.clientY - this.pinDown.y) > 6) this.pinDown.moved = true;
    if (this.pend) this.dirty = true;
  }
  junctionOn(wid, p) { // parte un cable en dos con un nudo en el punto más cercano de su recorrido
    const doc = this.doc, w = doc.wires.find(x => x.id === wid); if (!w) return null; const P = routeOf(doc, w); if (!P) return null;
    let best = null, bd = 1e9; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1; let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2; t = Math.max(0, Math.min(1, t)); let x = a.x + t * dx, y = a.y + t * dy; if (Math.abs(dx) < 1) { y = this.snap(y); x = a.x; } else if (Math.abs(dy) < 1) { x = this.snap(x); y = a.y; } const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = { k, x, y }; } }
    if (!best) return null; const jn = doc.add('JN', best.x, best.y);
    const w1 = { id: 'w' + doc.nid++, a: w.a, b: { p: jn.id, n: 'P' }, color: w.color }, w2 = { id: 'w' + doc.nid++, a: { p: jn.id, n: 'P' }, b: w.b, color: w.color };
    const mid = (w.pts || []).length ? w.pts : (P.slice(1, -1)); const before = P.slice(1, best.k + 1).map(q => ({ x: q.x, y: q.y })), after = P.slice(best.k + 1, -1).map(q => ({ x: q.x, y: q.y }));
    if (before.length) w1.pts = before; if (after.length) w2.pts = after;
    doc.wires = doc.wires.filter(x => x !== w); doc.wires.push(w1, w2); this.changed(); return jn; }
  rotateSel() { const p = this.sel && this.doc.part(this.sel); if (!p || p.kind === 'JN') return; p.rot = p.rot === 90 ? 0 : 90; this.doc.wires.forEach(w => { if (w.a.p === p.id || w.b.p === p.id) delete w.pts; }); this.changed(); }
  pinAt(e) { let best = null, bd = 11; this.svg.querySelectorAll('.pin').forEach(el => { const r = el.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2)); if (d < bd) { bd = d; best = el; } }); return best; }
  mu(e) {
    this.wireDown = null;
    if (this.mq) { const q = this.mq; this.mq = null;
      if (Math.abs(e.clientX - q.sx) + Math.abs(e.clientY - q.sy) > 5) {
        const x0 = Math.min(q.x0, q.x1), x1 = Math.max(q.x0, q.x1), y0 = Math.min(q.y0, q.y1), y1 = Math.max(q.y0, q.y1), ms = q.add || new Set();
        this.doc.parts.forEach(p => { const g = geomOf(p); if (p.x + g.w >= x0 && p.x <= x1 && p.y + g.h >= y0 && p.y <= y1) ms.add(p.id); });
        if (ms.size === 1) { this.sel = [...ms][0]; this.setMsel(null); } else this.setMsel(ms);
        this.hint(ms.size > 1 ? ms.size + ' componentes seleccionados: arrástralos para moverlos o pulsa Supr para borrarlos.' : ''); }
      this.showProps(); this.dirty = true; }
    if (this.segDrag) { const w = this.segDrag.w; this.segDrag = null; const P = cleanPts([pinPos(this.doc, w.a.p, w.a.n), ...w.pts, pinPos(this.doc, w.b.p, w.b.n)]); w.pts = P.slice(1, -1); if (!w.pts.length) delete w.pts; this.changed(); return; }
    if (this.pinDown) { const pd = this.pinDown; this.pinDown = null; const tp = this.pinAt(e);
      if (pd.moved && this.pend && tp && (this.pend.p !== tp.dataset.p || this.pend.n !== tp.dataset.n)) { this.finishWire(this.doc.part(tp.dataset.p), tp.dataset.n); this.hint('Cable creado.'); }
      else if (pd.moved && this.pend && !tp) { const hw = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('wire')); if (hw) { const jn = this.junctionOn(hw.dataset.w, this.toDoc(e)); if (jn && !(jn.id === this.pend.p)) { this.finishWire(jn, 'P'); this.hint('Nudo creado.'); } } this.pend = null; this.dirty = true; }
      else if (pd.moved) { this.pend = null; this.dirty = true; } }
    if (this.drag && this.drag.group) { if (this.drag.moved) this.changed(); this.drag = null; this.dirty = true; }
    if (this.drag) {
      const part = this.drag.part;
      if (part.kind === 'PUSH') { this.rt[part.id].pressed = false; this.setSrc(part, part.props.inv ? 1 : 0); }
      else if (part.kind === 'PSH') { this.rt[part.id].pressed = false; this.setSw(part, part.props.nc ? 1 : 0); }
      else if (part.kind === 'SWM' && !this.drag.moved) { part.props.on = part.props.on ? 0 : 1; this.setSw(part, part.props.on); this.showProps(); }
      else if (part.kind === 'SW' && !this.drag.moved) { part.props.on = part.props.on ? 0 : 1; this.setSrc(part, part.props.on); this.showProps(); }
      this.drag = null; this.dirty = true;
    }
    this.pan = null;
  }
  placeAt(kind, p) {
    const k = KIND[kind]; let g = { w: 40, h: 30 }; try { if (k.geom) g = k.geom({ kind, props: JSON.parse(JSON.stringify(k.props || {})) }) || g; } catch (er) { }
    const part = this.doc.add(kind, this.snap(p.x - (g.w || 40) / 2), this.snap(p.y - (g.h || 30) / 2));
    if (k.ic) part.props.label = 'U' + this.doc.parts.filter(q => q.kind.startsWith('IC:')).length;
    if (kind === 'LED' || kind === 'SW' || kind === 'SWM' || kind === 'PSH') this.autoName(part);
    this.sel = part.id; this.changed(); return part;
  }
  openPop(part, e) {
    const k = KIND[part.kind], pd = (k.propsDef || []).slice();
    if (this.fpga && ['SW', 'PUSH', 'LED'].includes(part.kind)) { const pr = this.propsEl.querySelector('[data-pk=pin]'); }
    const fields = pd.map(d => ({ k: d.k, label: d.label, type: d.type === 'sel' ? 'sel' : 'text', opts: d.opts, value: part.props[d.k], list: d.k === 'v' && part.kind === 'R' ? UI.E12 : d.k === 'v' && part.kind === 'C' ? UI.CAPS : undefined }));
    if (!fields.length) { this.showProps(); return; }
    UI.pop(this.root.querySelector('.cv'), e.clientX, e.clientY, k.name, fields, (key, val) => { if (!isNaN(+val) && val !== '' && pd.find(d => d.k === key && d.type === 'sel')) val = +val; part.props[key] = val; this.changed(); },
      { before: k.ic ? Board.dsLinkHTML(k.ic) : '', del: true, onDel: () => { this.sel = part.id; this.deleteSel(); } });
  }
  autoName(part) { const same = this.doc.parts.filter(q => q.kind === part.kind).length; part.props.label = part.kind === 'SW' ? String.fromCharCode(64 + same) : part.kind === 'SWM' ? 'S' + same : part.kind === 'PSH' ? 'P' + same : 'L' + same; }
  setSw(part, cl) { const ix = this.refs[part.id]; if (ix !== undefined && this.sim.parts[ix]) this.sim.parts[ix].closed = !!cl; }
  setSrc(part, lv) { const ix = this.refs[part.id]; if (ix !== undefined && this.sim.parts[ix]) this.sim.parts[ix].level = lv; }
  deleteSel() { if (this.msel && this.msel.size) { const ids = this.msel; this.doc.parts = this.doc.parts.filter(p => !ids.has(p.id)); this.doc.wires = this.doc.wires.filter(w => !ids.has(w.a.p) && !ids.has(w.b.p)); this.setMsel(null); this.sel = null; this.changed(); return; }
    if (!this.sel) return; if (this.sel.startsWith('W:')) this.doc.wires = this.doc.wires.filter(w => w.id !== this.sel.slice(2)); else this.doc.remove(this.sel); this.sel = null; this.changed(); }
  changed() { this.recompile(); this.showProps(); this.onChange && this.onChange('doc'); }
  showProps() {
    const pe = this.propsEl, p = this.sel && !this.sel.startsWith('W:') ? this.doc.part(this.sel) : null;
    if (this.msel && this.msel.size > 1) { pe.innerHTML = `<div class="ph">${this.msel.size} componentes seleccionados</div><p class="mut">Arrastra cualquiera de ellos para moverlos en bloque. Mayús + clic añade o quita componentes. Esc deselecciona.</p><button class="b sm" data-del>Eliminar selección</button>`; pe.querySelector('[data-del]').onclick = () => this.deleteSel(); return; }
    if (!p) { pe.innerHTML = this.sel ? '<p class="mut">Cable seleccionado. Supr para borrar.</p>' : '<p class="mut">Selecciona un componente para editar sus propiedades.</p>'; return; }
    const k = KIND[p.kind];
    const pd = (k.propsDef || []).slice(); if (this.fpga && ['SW', 'PUSH', 'LED'].includes(p.kind)) pd.push({ k: 'pin', label: 'Pin de la Alhambra II', type: 'sel', opts: p.kind === 'LED' ? ['', ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => 'LED' + i)] : p.kind === 'PUSH' ? ['', 'SW1', 'SW2'] : ['', ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => 'D' + i)] });
    pe.innerHTML = `<div class="ph">${esc(k.name)}</div>${k.desc ? `<p class="mut">${esc(k.desc)}</p>` : ''}${k.ic ? Board.dsLinkHTML(k.ic) : ''}` + pd.map(d => {
      const v = p.props[d.k];
      if (d.type === 'sel') return `<label>${d.label}<select data-pk="${d.k}">${d.opts.map(o => { const ov = o.v ?? o, ot = o.t ?? o; return `<option value="${ov}" ${String(ov) === String(v) ? 'selected' : ''}>${ot}</option>`; }).join('')}</select></label>`;
      return `<label>${d.label}<input data-pk="${d.k}" type="text" value="${esc(v)}"></label>`; }).join('') + '<button class="b sm" data-del>Eliminar componente</button>';
    pe.querySelectorAll('[data-pk]').forEach(i => i.onchange = () => { let v = i.value; if (i.tagName === 'SELECT' && !isNaN(+v) && v !== '') v = +v; p.props[i.dataset.pk] = v; this.changed(); });
    pe.querySelector('[data-del]').onclick = () => this.deleteSel();
  }
  showWarns() { const W = this.cmp.nl.warnings.map(w => w.msg).concat(this.fireMsgs || []); this.root.querySelector('#warns').innerHTML = W.length ? '<div class="ph">Avisos</div>' + W.map(m => `<p class="warn">${esc(m)}</p>`).join('') : ''; }
  /* componentes que superan sus límites (corriente, potencia): se marcan con una llama */
  checkFire() { if (!this.sim) return; let ch = false;
    this.sim.parts.forEach(sp => { const id = sp.ref; if (!id || this.fire[id]) return; const p = this.doc.part(id); if (!p) return; const m = this.sim.overload(sp);
      if (m) { const nm = KIND[p.kind].name + (p.props && p.props.label ? ' ' + p.props.label : ''); this.fire[id] = nm + ': ' + m; this.fireMsgs.push('Sobrecarga en ' + nm + ': ' + m); ch = true; } });
    if (ch) { this.showWarns(); this.dirty = true; } }
  /* ---- simulación ---- */
  recompile() {
    const c = S.compile(this.doc, { autoPower: this.autoPower }); this.cmp = c; this.refs = c.refs; this.nl = c.nl;
    this.sim = new DSim.Sim(c.nl, { dt: this.dt, recEvery: Math.max(1, Math.round(2e-5 / this.dt)) });
    // canales del cronograma
    const ch = []; this.chParts = [];
    const add = (name, id, color) => { const n = c.nl.index(id); if (n === null || n === undefined) return; ch.push({ name, w: this.sim.addWatch(n, name), color }); };
    this.doc.parts.filter(p => ['SW', 'PUSH', 'CLK'].includes(p.kind)).sort((a, b) => a.y - b.y).forEach(p => add(p.props.label, p.id + '.Y', '#6A7B6C'));
    this.doc.parts.filter(p => p.kind === 'LA8').forEach(p => { for (let i = 1; i <= 8; i++) add(p.props.label + ' CH' + i, p.id + '.I' + i, i % 2 ? '#1F2421' : '#B85D34'); });
    this.doc.parts.filter(p => p.kind === 'WATCH').forEach(p => add(p.props.label, p.id + '.P', '#1F2421'));
    this.doc.parts.filter(p => p.kind === 'LED').sort((a, b) => a.y - b.y).forEach(p => add(p.props.label, p.id + '.A', '#B85D34'));
    this.doc.parts.filter(p => KIND[p.kind].ic).forEach(p => { const d = DSim.IC[KIND[p.kind].ic]; (d.outs || []).slice(0, 4).forEach(o => { if (p.props.showOuts) add(`${p.props.label}.${d.pn[o]}`, p.id + '.' + o, '#4C6A8C'); }); });
    this.timing.setChannels(ch); this.timing.th = [1.5, 3.5]; this.timing.follow = true;
    this.fire = {}; this.fireMsgs = []; this.showWarns();
    this.dirty = true;
  }
  loop(ts) {
    requestAnimationFrame(this.loop);
    if (!this.root.offsetParent) return;
    const last = this.lastTs || ts; this.lastTs = ts;
    if (this.running) {
      const want = Math.min(0.05, (ts - last) / 1000) * this.speed, t0 = performance.now(); let done = 0;
      this.acc = (this.acc || 0) + want / this.dt; const n = Math.floor(this.acc); this.acc -= n;
      for (let i = 0; i < n; i++) { this.sim.step(); if ((i & 63) === 0 && performance.now() - t0 > 14) break; }
      this.checkFire();
      this.dirty = true;
    }
    if (this.dirty) { this.dirty = false; this.render(); this.onFrame && this.onFrame(); if (this.running || this.timing.follow) this.timing.draw(); this.root.querySelector('#tstat').textContent = 't = ' + Timing.fmtT(this.sim.t); if (this.sim.alerts.length && !this.alertShown) { this.alertShown = this.sim.alerts.length; this.onChange && this.onChange('alert', this.sim.alerts[this.sim.alerts.length - 1]); } }
  }
  nodeColor(id) { const n = this.nl.index(id); if (n === null || n === undefined) return FLT; const v = this.sim.v[n]; return v >= 2.4 ? HI : v <= 0.9 ? LOW : FLT; }
  render() {
    const doc = this.doc, sim = this.sim, vb = this.svg.getBoundingClientRect(), k = this.view.k;
    const W = vb.width * k, H = vb.height * k;
    let s = `<defs><pattern id="gr" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#D9D5CB"/></pattern></defs>`;
    s += `<rect x="${this.view.x}" y="${this.view.y}" width="${W}" height="${H}" fill="url(#gr)"/>`;
    // cables
    const deg = {};
    (doc.zones || []).forEach(z => { s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" fill="${z.color}" fill-opacity=".16" stroke="${z.color}" stroke-opacity=".6" stroke-dasharray="6 4" pointer-events="none"/><text x="${z.x + 6}" y="${z.y + 13}" font-size="11" font-weight="700" fill="${z.color}" pointer-events="none">${esc(z.label)}</text>`; });
    doc.wires.forEach(w => { const P = routeOf(doc, w); if (!P) return; const a = P[0], b = P[P.length - 1]; deg[w.a.p + w.a.n] = (deg[w.a.p + w.a.n] || 0) + 1; deg[w.b.p + w.b.n] = (deg[w.b.p + w.b.n] || 0) + 1;
      const d = ptsD(P), sel = this.sel === 'W:' + w.id, col = sel ? SAGE : (w.color || this.nodeColor(w.a.p + '.' + w.a.n));
      if (this.wsel && this.wsel.has(w.id)) s += `<path d="${d}" fill="none" stroke="#3B7DD8" stroke-opacity=".35" stroke-width="8" stroke-linejoin="round" pointer-events="none"/>`;
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sel ? 4 : 2.4}" stroke-linejoin="round"/><path class="wire" data-w="${w.id}" d="${d}" fill="none" stroke="transparent" stroke-width="10" style="cursor:pointer"/>`;
      if (sel) for (let k = 0; k < P.length - 1; k++) { const p0 = P[k], p1 = P[k + 1]; if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 14) continue; const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2; s += `<rect class="seg" data-w="${w.id}" data-k="${k}" x="${mx - 4.5}" y="${my - 4.5}" width="9" height="9" rx="2" fill="${BG}" stroke="${SAGE}" stroke-width="1.6" style="cursor:${Math.abs(p0.y - p1.y) < 1 ? 'ns-resize' : Math.abs(p0.x - p1.x) < 1 ? 'ew-resize' : 'move'}"/>`; } });
    // componentes
    doc.parts.forEach(p => {
      const g = geomOf(p), ref = this.refs[p.id], rt = this.partRt(p, ref);
      s += `<g class="part" data-id="${p.id}" transform="translate(${p.x},${p.y})" style="cursor:move"><title>${esc(KIND[p.kind].name + ' — ' + (KIND[p.kind].desc || UI.HELP[p.kind] || ''))}</title>`;
      if (this.msel && this.msel.has(p.id)) s += `<rect x="-8" y="-14" width="${g.w + 16}" height="${g.h + 30}" rx="6" fill="#3B7DD8" fill-opacity=".16" stroke="#3B7DD8" stroke-width="2"/>`;
      if (this.sel === p.id) s += `<rect x="-8" y="-14" width="${g.w + 16}" height="${g.h + 30}" rx="6" fill="none" stroke="${SAGE}" stroke-dasharray="4 3" stroke-width="1.4"/>`;
      s += `<rect x="-2" y="-2" width="${g.w + 4}" height="${g.h + 4}" fill="transparent"/>` + drawPart(p, g, rt) + (this.fire && this.fire[p.id] ? Board.flame(g.w / 2, -6, this.fire[p.id], 1.3) : '') + '</g>';
      if (p.kind === 'JN') { s += `<circle cx="${p.x}" cy="${p.y}" r="3.8" fill="${this.nodeColor(p.id + '.P')}" stroke="${INK}" stroke-width="1" pointer-events="none"/>`; }
      g.pins.forEach(pn => { const x = p.x + pn.x, y = p.y + pn.y, cn = deg[p.id + pn.n] || 0; const col = this.nodeColor(p.id + '.' + pn.n); s += `<circle class="pin" data-p="${p.id}" data-n="${pn.n}" cx="${x}" cy="${y}" r="${cn > 1 ? 4 : 3.2}" fill="${cn ? col : BG}" stroke="${this.pend && this.pend.p === p.id && this.pend.n === pn.n ? SAGE : INK}" stroke-width="${this.pend && this.pend.p === p.id && this.pend.n === pn.n ? 3 : 1.2}" style="cursor:crosshair"/>`; });
    });
    if (this.ghost) { const gh = this.ghost, k = KIND[gh.kind], p = { id: 'ghost', kind: gh.kind, x: gh.x, y: gh.y, props: JSON.parse(JSON.stringify(k.props || {})) }; try { s += `<g opacity=".55" pointer-events="none" transform="translate(${gh.x},${gh.y})">${k.draw(p, gh.g, {})}</g>` + gh.g.pins.map(pn => `<circle cx="${gh.x + pn.x}" cy="${gh.y + pn.y}" r="3.2" fill="${SAGE}" opacity=".7" pointer-events="none"/>`).join(''); } catch (er) { } }
    if (this.mq) { const q = this.mq; s += `<rect x="${Math.min(q.x0, q.x1)}" y="${Math.min(q.y0, q.y1)}" width="${Math.abs(q.x1 - q.x0)}" height="${Math.abs(q.y1 - q.y0)}" fill="#3B7DD8" fill-opacity=".16" stroke="#3B7DD8" stroke-width="1.4" stroke-dasharray="5 3" pointer-events="none"/>`; }
    if (this.pend && this.mouse) { const a = pinPos(doc, this.pend.p, this.pend.n); if (a) { const el = this.pend.pts || [], mp = { x: this.snap(this.mouse.x), y: this.snap(this.mouse.y) }, P = orthoPath([a, ...el, mp], false); s += `<path d="${ptsD(P)}" stroke="${SAGE}" stroke-dasharray="5 4" stroke-width="2" fill="none" stroke-linejoin="round" pointer-events="none"/>` + el.map(q => `<circle cx="${q.x}" cy="${q.y}" r="3.5" fill="${SAGE}" pointer-events="none"/>`).join(''); } }
    this.svg.setAttribute('viewBox', `${this.view.x} ${this.view.y} ${W} ${H}`);
    this.svg.innerHTML = s;
  }
  partRt(p, ix) {
    const sim = this.sim, rt = this.rt[p.id] = this.rt[p.id] || {};
    const sp = ix !== undefined && typeof ix === 'number' ? sim.parts[ix] : null;
    switch (p.kind) {
      case 'SW': rt.on = sp ? sp.level : p.props.on; break;
      case 'SWM': case 'PSH': rt.closed = sp ? (sp.closed ? 1 : 0) : (p.kind === 'SWM' ? +p.props.on : (p.props.nc ? 1 : 0)); break;
      case 'CLK': rt.val = sp ? sp.val : 0; break;
      case 'LED': rt.on = sp && sp.st.on; rt.i = sp ? sp.st.i : 0; break;
      case 'D7': rt.segs = sp ? sp.st.on : []; break;
      case 'FFD': case 'FFJK': case 'FFT': rt.q = sp ? sp.st.q : 0; break;
      case 'DMM': { if (sp) { const a = p.props.mode === 'A', v = sim.v[sp.pins[0]] - sim.v[sp.pins[1]], i = v / 0.2; rt.txt = a ? (Math.abs(i) < 0.1 ? (i * 1e3).toFixed(2) + ' mA' : i.toFixed(3) + ' A').replace('.', ',') : v.toFixed(2).replace('.', ',') + ' V'; } break; }
      case 'VM': { if (sp) { const v = sim.v[sp.pins[0]] - sim.v[sp.pins[1]]; rt.txt = v.toFixed(2).replace('.', ',') + ' V'; } break; }
      case 'PROBE': { const n = this.nl.index(p.id + '.P'); if (n != null) { const v = sim.v[n]; rt.lv = (n > 0 && this.nl.deg && this.nl.deg[n] === 0) ? 'Z' : v >= 2 ? 1 : v <= 0.8 ? 0 : 'Z'; } else rt.lv = 'Z'; break; }
    }
    return rt;
  }
  /* ---- tabla de verdad a partir del circuito (análisis combinacional de Logisim) ---- */
  truthTable() {
    const ins = this.doc.parts.filter(p => p.kind === 'SW').sort((a, b) => a.y - b.y || a.x - b.x), outs = this.doc.parts.filter(p => p.kind === 'LED').sort((a, b) => a.y - b.y || a.x - b.x);
    if (!ins.length || !outs.length || ins.length > 8) { alert('Hacen falta entre 1 y 8 interruptores de entrada y al menos un LED de salida.'); return null; }
    const c = S.compile(this.doc, { autoPower: this.autoPower }), sim = new DSim.Sim(c.nl, { dt: 1e-5 }), n = ins.length, rows = [];
    for (let m = 0; m < (1 << n); m++) {
      ins.forEach((p, i) => { sim.parts[c.refs[p.id]].level = (m >> (n - 1 - i)) & 1; });
      sim.run(5e-4);
      rows.push({ m, out: outs.map(p => sim.parts[c.refs[p.id]].st.on ? 1 : 0) });
    }
    return { inputs: ins.map(p => p.props.label), outputs: outs.map(p => p.props.label), rows };
  }
  capture() {
    const svg = this.svg.cloneNode(true); this.onChange && this.onChange('capture', this.svgToDataURL());
  }
  svgToDataURL(tight) {
    // recorte al contenido
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; this.doc.parts.forEach(p => { const g = geomOf(p); x0 = Math.min(x0, p.x - 30); y0 = Math.min(y0, p.y - 30); x1 = Math.max(x1, p.x + g.w + 30); y1 = Math.max(y1, p.y + g.h + 40); }); (this.doc.zones || []).forEach(z => { x0 = Math.min(x0, z.x - 6); y0 = Math.min(y0, z.y - 6); x1 = Math.max(x1, z.x + z.w + 6); y1 = Math.max(y1, z.y + z.h + 6); });
    if (x0 > x1) return null;
    const clone = this.svg.cloneNode(true); clone.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`); clone.setAttribute('width', x1 - x0); clone.setAttribute('height', y1 - y0); clone.querySelectorAll('rect[fill^="url"]').forEach(r => r.remove());
    clone.setAttribute('font-family', 'Arial'); clone.setAttribute('xmlns', NS);
    return { svg: new XMLSerializer().serializeToString(clone), w: x1 - x0, h: y1 - y0 };
  }
  load(docJson) { this.doc = Doc.from(JSON.parse(JSON.stringify(docJson))); this.sel = null; this.view = { x: -20, y: -30, k: 1 }; this.recompile(); this.showProps(); this.fit(); }
  fit() { const r = this.svg.getBoundingClientRect(); if (!r.width || !this.doc.parts.length) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    this.doc.parts.forEach(p => { const g = geomOf(p); x0 = Math.min(x0, p.x - 20); y0 = Math.min(y0, p.y - 30); x1 = Math.max(x1, p.x + g.w + 20); y1 = Math.max(y1, p.y + g.h + 30); }); (this.doc.zones || []).forEach(z => { x0 = Math.min(x0, z.x); y0 = Math.min(y0, z.y); x1 = Math.max(x1, z.x + z.w); y1 = Math.max(y1, z.y + z.h); });
    const k = Math.max((x1 - x0) / r.width, (y1 - y0) / r.height, 0.6); this.view = { x: x0 - (r.width * k - (x1 - x0)) / 2, y: y0 - (r.height * k - (y1 - y0)) / 2, k }; this.dirty = true; }
};

/* ---------- generar un esquema a partir de un grafo de puertas (Karnaugh) ---------- */
S.fromGraph = function (g, opts = {}) {
  const doc = new Doc(), n = g.inputs.length, depth = new Array(g.nodes.length).fill(0);
  g.nodes.forEach(nd => { if (nd.t !== 'in') depth[nd.id] = 1 + Math.max(depth[nd.a], nd.b != null ? depth[nd.b] : 0); });
  const maxD = Math.max(...depth), colX = (d) => 120 + d * 110, rowsPerCol = {}, place = {};
  const pin = {}; // nodo -> {part, pin}
  g.inputs.forEach((id, i) => { const p = doc.add('SW', 40, 40 + i * 50, { label: g.nodes[id].name }); place[id] = p; pin[id] = [p, 'Y']; });
  const colCount = {};
  g.nodes.forEach(nd => { if (nd.t === 'in') return; const d = depth[nd.id]; colCount[d] = colCount[d] || 0; const y = 30 + colCount[d]++ * 60;
    const kind = nd.t; const p = doc.add(kind, colX(d) + 20, y, kind === 'NOT' ? {} : { n: 2 }); place[nd.id] = p; pin[nd.id] = [p, 'Y'];
    const a = pin[nd.a]; doc.wire(a[0], a[1], p, 'A'); if (nd.b != null && kind !== 'NOT') { const b = pin[nd.b]; doc.wire(b[0], b[1], p, 'B'); }
    if (kind === 'NAND' && nd.a === nd.b) { doc.wires.pop(); doc.wires.pop(); doc.wire(a[0], a[1], p, 'A'); doc.wire(a[0], a[1], p, 'B'); } });
  g.outs.forEach((o, i) => { const led = doc.add('LED', colX(maxD + 1) + 60, 30 + i * 60, { label: o.name });
    if (o.node != null) { const s = pin[o.node]; doc.wire(s[0], s[1], led, 'A'); } else { const c = doc.add(o.const ? 'HI' : 'LO', colX(maxD + 1), 30 + i * 60 + (o.const ? -30 : 20)); doc.wire(c, 'P', led, 'A'); } });
  return doc;
};

/* Esquema por etapas a partir de los grupos de Karnaugh: entradas en columnas (MSB → LSB), complementos con inversor hacia abajo,
   etapa AND (SOP) u OR (POS), etapa final y LED con resistencia y GND. Cada grupo queda sombreado con su color de Karnaugh. */
S.fromKarnaugh = function (funcs, names, n, o = {}) {
  const doc = new Doc(), mode = o.mode || 'std', pos = o.form === 'pos', NAN = mode === 'nand' && !pos;
  const COL = KM.COLORS, X0 = 70, CW = 70, XG = X0 + n * CW + 10, ST = 'stroke:#1F2421';
  const used = new Set();
  funcs.forEach(f => { const T = (f.terms || f.cover || []); T.forEach(q => { const L = KM.literals(q, n), op = NAN && L.length === 1 && T.length > 1; L.forEach(l => used.add(((l.neg !== pos) !== op ? 'c' : 't') + l.i)); }); });
  const xt = (i) => X0 + i * CW, xc = (i) => X0 + i * CW + 32;
  const yJ = 80, yT = 105;
  const lines = {};
  for (let i = 0; i < n; i++) {
    const sw = doc.add('SW', xt(i) - 50, 20, { label: names[i] }), jn = doc.add('JN', xt(i), yJ), w0 = doc.wire(sw, 'Y', jn, 'P'); w0.pts = [];
    lines['t' + i] = { x: xt(i), head: [jn, 'P'], taps: [] };
    if (used.has('c' + i)) {
      let inv, yo;
      if (NAN) { inv = doc.add('NAND', xc(i) - 20, yT, { n: 2 }); inv.rot = 90; yo = yT + 60; const wB = doc.wire(jn, 'P', inv, 'B'); wB.pts = [{ x: xt(i) + 22, y: yJ }, { x: xt(i) + 22, y: yT }]; const wA = doc.wire(jn, 'P', inv, 'A'); wA.pts = [{ x: xc(i) + 10, y: yJ }, { x: xc(i) + 10, y: yT }]; }
      else { inv = doc.add('NOT', xc(i) - 20, yT); inv.rot = 90; yo = yT + 50; const w1 = doc.wire(jn, 'P', inv, 'A'); w1.pts = [{ x: xc(i), y: yJ }]; }
      lines['c' + i] = { x: xc(i), head: [inv, 'Y'], taps: [] };
    }
  }
  const tap = (key, y) => { const L = lines[key], jn = doc.add('JN', L.x, y); L.taps.push({ y, jn }); return jn; };
  let Y = 190;
  funcs.forEach((f, fi) => {
    const terms = (f.terms || f.cover || []), blockTop = Y; let ledSig = null;
    if (f.zero || f.one || !terms.length) { ledSig = { c: f.one ? 1 : 0 }; Y += 60; }
    else {
      const sigs = [];
      terms.forEach((q, gi) => {
        const col = COL[gi % COL.length], lit = KM.literals(q, n).map(l => ({ i: l.i, neg: l.neg !== pos })), k = lit.length, h = Math.max(40, k * 20), rowH = h + 30;
        const kind = pos ? 'OR' : (NAN ? 'NAND' : 'AND'); let sig;
        const mins = KM.implicantMinterms(q, n), txt = pos ? '(' + lit.map(l => names[l.i] + (l.neg ? "'" : '')).join(' + ') + ')' : lit.map(l => names[l.i] + (l.neg ? "'" : '')).join('·');
        doc.zones.push({ x: X0 - 36, y: Y - 8, w: XG + 60 + 24 - (X0 - 36), h: h + 16, color: col, label: `G${gi + 1} ${pos ? 'Π' : 'Σ'}(${mins.join(',')}) = ${txt}` });
        if (k >= 2) {
          const g = doc.add(kind, XG, Y, { n: k }), y0 = (h - (k - 1) * 20) / 2;
          lit.forEach((l, j) => { const key = (l.neg ? 'c' : 't') + l.i, jn = tap(key, Y + y0 + j * 20), w = doc.wire(jn, 'P', g, 'ABCD'[j]); w.pts = []; w.color = col; });
          sig = { part: g, pin: 'Y', y: Y + h / 2, col };
        } else {
          const l = lit[0], key = ((NAN && terms.length > 1) ? (l.neg ? 't' : 'c') : (l.neg ? 'c' : 't')) + l.i;
          const jn = tap(key, Y + h / 2); sig = { part: jn, pin: 'P', y: Y + h / 2, col, line: true };
        }
        sigs.push(sig); Y += rowH;
      });
      // etapas finales
      let level = 0, cur = sigs, xs = XG + 60 + 24 + terms.length * 8 + 16;
      const finalKind = pos ? 'AND' : (NAN ? 'NAND' : 'OR');
      if (cur.length === 1 && NAN && !cur[0].line) { // NAND-NAND con un solo grupo: hace falta un inversor (NAND con las entradas unidas)
        const sg = cur[0], g = doc.add('NAND', xs, sg.y - 20, { n: 2 }), w1 = doc.wire(sg.part, sg.pin, g, 'A'), w2 = doc.wire(sg.part, sg.pin, g, 'B'); w1.pts = []; w2.pts = [{ x: xs - 10, y: sg.y }, { x: xs - 10, y: sg.y + 20 }]; cur = [{ part: g, pin: 'Y', y: sg.y }]; }
      else if (cur.length === 1 && NAN && cur[0].line) { /* literal único: ya está en polaridad correcta */ }
      while (cur.length > 1) {
        const next = []; let ci = 0;
        for (let a = 0; a < cur.length; a += 4) {
          const ch = cur.slice(a, a + 4); if (ch.length === 1) { next.push(ch[0]); continue; }
          const m = ch.length, h = Math.max(40, m * 20), yc = ch.reduce((t, c) => t + c.y, 0) / m, gy = Math.round((yc - h / 2) / 10) * 10, g = doc.add(finalKind, xs, gy, { n: m }), y0 = (h - (m - 1) * 20) / 2;
          ch.forEach((c, j) => { const w = doc.wire(c.part, c.pin, g, 'ABCD'[j]), py = gy + y0 + j * 20, xm = xs - 16 - (j % 2) * 8 - ci * 0; w.pts = [{ x: xs - 18 + (c.col ? 0 : 0) - (ci + j) % 3 * 6, y: c.y }, { x: xs - 18 - (ci + j) % 3 * 6, y: py }]; if (level === 0 && c.col) w.color = c.col; });
          next.push({ part: g, pin: 'Y', y: gy + h / 2 }); ci++;
        }
        cur = next; xs += 100; level++;
      }
      ledSig = Object.assign({ x: xs }, cur[0]);
    }
    // salida: LED con R y GND
    const xl = ledSig.c !== undefined ? XG + 160 : (ledSig.x || XG + 100) + 50 + 30;
    const yl = ledSig.c !== undefined ? blockTop + 10 : Math.round((ledSig.y - 15) / 10) * 10;
    const led = doc.add('LED', xl, yl, { label: f.name, color: ['red', 'green', 'yellow', 'blue'][fi % 4] });
    if (ledSig.c !== undefined) { const c = doc.add(ledSig.c ? 'HI' : 'LO', xl - 70, yl + (ledSig.c ? -10 : 20)); doc.wire(c, 'P', led, 'A'); }
    else { const w = doc.wire(ledSig.part, ledSig.pin, led, 'A'); if (Math.abs(ledSig.y - (yl + 15)) < 1) w.pts = []; }
    Y += 30;
  });
  // cadenas verticales de las líneas de entrada
  Object.values(lines).forEach(L => { L.taps.sort((a, b) => a.y - b.y); let prev = L.head; L.taps.forEach(t => { const w = doc.wire(prev[0], prev[1], t.jn, 'P'); w.pts = []; prev = [t.jn, 'P']; }); });
  return doc;
};

root.Schem = S;
})(window);
