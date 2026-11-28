/* Pantalla de inicio: dibujo animado de una protoboard con un contador de 4 bits, analizador lógico y display */
(function (root) {
'use strict';
const H = {};
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const P = 0.8;                                   // periodo del reloj (s): la animación va a 1,25 cuentas por segundo
const COL = { clk: '#1F2421', q: ['#B85D34', '#6A7B6C', '#C79A3B', '#5b7a8c'] };   // Q0..Q3
const ON = '#e0452f', OFF = '#2a1c1a';

function seg7(x, y, w, h, id) {
  const t = w * 0.17, hw = h / 2, g = 1.4, r = (n, X, Y, W, Hh) => `<rect id="${id}${n}" x="${X}" y="${Y}" width="${W}" height="${Hh}" rx="${t / 2.2}" fill="${OFF}"/>`;
  return r('a', x + t + g, y, w - 2 * t - 2 * g, t) + r('g', x + t + g, y + hw - t / 2, w - 2 * t - 2 * g, t) + r('d', x + t + g, y + h - t, w - 2 * t - 2 * g, t)
    + r('f', x, y + t + g, t, hw - t - 2 * g) + r('b', x + w - t, y + t + g, t, hw - t - 2 * g) + r('e', x, y + hw + g, t, hw - t - 2 * g) + r('c', x + w - t, y + hw + g, t, hw - t - 2 * g);
}
const wire = (d, c, w = 4) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const pin = (x, y, up) => `<rect x="${x - 3}" y="${up ? y - 7 : y}" width="6" height="7" fill="#c9ccc9" stroke="#8a8d8a" stroke-width=".6"/>`;
const clip = (x, y, c) => `<g><rect x="${x - 6}" y="${y - 5}" width="12" height="10" rx="2.5" fill="${c}" stroke="#1F2421" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="1.8" fill="#F9F8F6"/></g>`;

H.svg = function () {
  let s = '';
  // protoboard
  s += `<defs><pattern id="hmh" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1.9" fill="#b9b3a3"/></pattern><clipPath id="hmcl"><rect x="652" y="78" width="288" height="236"/></clipPath></defs>`;
  s += `<rect x="10" y="10" width="560" height="334" rx="9" fill="#EFEBE0" stroke="#d3cdbd" stroke-width="1.5"/>`;
  s += `<rect x="30" y="64" width="520" height="80" fill="url(#hmh)"/><rect x="30" y="206" width="520" height="84" fill="url(#hmh)"/><rect x="30" y="150" width="520" height="50" fill="#e4dfd1"/>`;
  [[24, '#B85D34'], [38, '#5b7a8c'], [308, '#B85D34'], [322, '#5b7a8c']].forEach(([y, c]) => { s += `<line x1="30" y1="${y - 7}" x2="550" y2="${y - 7}" stroke="${c}" stroke-width="1.3" opacity=".75"/><rect x="30" y="${y - 5}" width="520" height="10" fill="url(#hmh)"/>`; });
  s += `<text x="22" y="30" font-size="9" fill="#B85D34" font-weight="700">+</text><text x="22" y="44" font-size="9" fill="#5b7a8c" font-weight="700">−</text><text x="22" y="314" font-size="9" fill="#B85D34" font-weight="700">+</text><text x="22" y="328" font-size="9" fill="#5b7a8c" font-weight="700">−</text>`;
  // cables de alimentación y de configuración del contador
  const topX = (p) => 190 + (8 - p) * 20, botX = (p) => 190 + (p - 9) * 20;      // posición de cada pata (muesca a la derecha)
  s += wire(`M${topX(8)},150 V38`, '#1F2421') + wire(`M${topX(7)},150 V24`, '#B85D34') + wire(`M${topX(1)},150 V24`, '#B85D34');
  s += wire(`M${botX(16)},198 V308`, '#B85D34') + wire(`M${botX(9)},198 V308`, '#B85D34') + wire(`M${botX(10)},198 V308`, '#B85D34');
  // chip 74HC161
  s += `<rect x="180" y="158" width="160" height="34" rx="2" fill="#26292b" stroke="#111" stroke-width="1"/><path d="M340,168 a7,7 0 0 0 0,14" fill="#0b0c0d"/><circle cx="330" cy="166" r="2.2" fill="#6d716d"/>`;
  s += `<text x="260" y="172" font-size="10.5" fill="#e8e8e4" text-anchor="middle" font-weight="700">74HC161</text><text x="258" y="185" font-size="7" fill="#9a9d99" text-anchor="middle">contador binario de 4 bits</text>`;
  for (let i = 0; i < 8; i++) s += pin(190 + i * 20, 158, true) + pin(190 + i * 20, 192, false);
  // reloj y salidas
  s += wire(`M${topX(2)},150 V104 H388`, '#C79A3B');
  const qy = [282, 266, 250, 234];                  // Q0..Q3
  [14, 13, 12, 11].forEach((p, k) => { s += wire(`M${botX(p)},198 V${qy[k]} H388`, COL.q[k]); });
  // módulo de reloj
  s += `<rect x="388" y="66" width="164" height="76" rx="5" fill="#2b2f2d" stroke="#111"/><text x="470" y="84" font-size="9" fill="#cfd1cd" text-anchor="middle" font-weight="700">GENERADOR DE RELOJ</text>`;
  s += `<circle id="hmck" cx="418" cy="112" r="9" fill="#46301a" stroke="#111"/><text x="470" y="116" font-size="16" fill="#e8e8e4" text-anchor="middle" font-weight="700">${(1 / P).toFixed(2).replace('.', ',')} Hz</text><text x="470" y="132" font-size="7.5" fill="#9a9d99" text-anchor="middle">salida CLK → pata 2</text>`;
  // decodificador + display de dos dígitos
  s += `<rect x="388" y="208" width="164" height="118" rx="5" fill="#2b2f2d" stroke="#111"/><text x="470" y="222" font-size="8.5" fill="#cfd1cd" text-anchor="middle" font-weight="700">DECODIFICADOR + 2 DÍGITOS</text>`;
  s += `<rect x="404" y="230" width="132" height="86" rx="3" fill="#120d0c"/>` + seg7(416, 238, 44, 70, 'hmt') + seg7(480, 238, 44, 70, 'hmu');
  // analizador lógico: cuerpo, pinzas y cable USB
  s += `<rect x="150" y="360" width="222" height="40" rx="5" fill="#2b2f2d" stroke="#111"/><text x="261" y="378" font-size="11" fill="#e8e8e4" text-anchor="middle" font-weight="700">LA8 · analizador lógico</text><text x="261" y="391" font-size="7.5" fill="#9a9d99" text-anchor="middle">CH0 CH1 CH2 CH3 CH4</text>`;
  const lx = [172, 214, 256, 298, 340], lc = [COL.clk, ...COL.q], tgt = [[346, 104], [botX(14) + 9, 268], [botX(13) + 9, 262], [botX(12) + 9, 256], [botX(11) + 9, 250]];
  tgt[1] = [botX(14), 282]; tgt[2] = [botX(13), 266]; tgt[3] = [botX(12), 250]; tgt[4] = [botX(11), 234];
  lx.forEach((x, i) => { const [tx, ty] = tgt[i]; s += `<path d="M${x},360 C${x},${(360 + ty) / 2 + 20} ${tx + (i === 0 ? 24 : 0)},${ty + 60} ${tx},${ty}" fill="none" stroke="${lc[i]}" stroke-width="2" stroke-linecap="round" opacity=".95"/>` + clip(tx, ty, lc[i]); });
  s += `<path d="M372,380 H600 V330" fill="none" stroke="#6d716d" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 0"/>`;
  // pantalla del analizador
  s += `<rect x="600" y="10" width="352" height="320" rx="8" fill="#FBFAF7" stroke="#cfcabd" stroke-width="1.5"/><text x="618" y="36" font-size="12" font-weight="700" fill="#1F2421">ANALIZADOR LÓGICO</text><text x="934" y="36" font-size="10" fill="#696C69" text-anchor="end" id="hmcnt"></text>`;
  s += `<line x1="618" y1="48" x2="940" y2="48" stroke="#E2DFD8"/>`;
  const names = ['CLK', 'Q0', 'Q1', 'Q2', 'Q3'];
  names.forEach((n, i) => { const y = 78 + i * 47; s += `<text x="618" y="${y + 24}" font-size="10" font-weight="700" fill="${i ? COL.q[i - 1] : COL.clk}">${n}</text><line x1="618" y1="${y + 36}" x2="940" y2="${y + 36}" stroke="#EEEBE3"/>`; });
  s += `<g clip-path="url(#hmcl)">` + names.map((n, i) => `<path id="hmw${i}" fill="none" stroke="${i ? COL.q[i - 1] : COL.clk}" stroke-width="2" stroke-linejoin="round"/>`).join('') + `<g id="hmg"></g></g>`;
  s += `<line id="hmcur" x1="940" y1="56" x2="940" y2="318" stroke="#B85D34" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  return s;
};

H.init = function (host, o) {
  host.innerHTML = `<div class="hm"><div class="hm-top">${o.avatar || ''}<span>José Luis Guerrero Marín</span></div><div class="hm-c"><div class="hm-k">Equipos Microprogramables</div><h1>DIGITAL-SIM</h1>
    <p class="hm-s">Tablas de verdad y Karnaugh, esquemas lógicos, protoboard, Arduino / ESP32, lógica programable (PROM, PLA, PAL, GAL) y FPGA Alhambra II en un solo simulador.</p>
    <div class="hm-art"><svg viewBox="0 0 962 412" role="img" aria-label="Contador binario de cuatro bits montado en una protoboard, con un display que muestra la cuenta y un analizador lógico que dibuja las señales">${H.svg()}</svg></div>
    <div class="hm-b"><button class="hm-btn prim" id="hm-free"><b>Empezar</b></button></div>
    <div class="hm-f" id="hm-cont" hidden><button class="hm-link" id="hm-back">Continuar con el trabajo anterior</button></div></div></div>`;
  const q = (id) => host.querySelector('#' + id), svg = host.querySelector('svg');
  const segEl = {}; ['t', 'u'].forEach(d => 'abcdefg'.split('').forEach(c => segEl[d + c] = q('hm' + d + c)));
  const win = 16, X0 = 652, W = 288, Y0 = 78;
  let last = -1, lastCnt = -1;
  const frame = (ts) => {
    requestAnimationFrame(frame);
    if (host.hidden) return;
    const t = ts / 1000, n = Math.floor(t / P) % 16;
    if (n !== lastCnt) {
      lastCnt = n; const tens = n >= 10 ? 1 : 0, un = n % 10;
      'abcdefg'.split('').forEach(c => { segEl['t' + c].setAttribute('fill', (SEG[tens].includes(c) && tens) ? ON : OFF); segEl['u' + c].setAttribute('fill', SEG[un].includes(c) ? ON : OFF); });
      q('hmcnt').textContent = `cuenta = ${n}  (${n.toString(2).padStart(4, '0')})`;
    }
    q('hmck').setAttribute('fill', (t / P) % 1 < 0.5 ? '#ff9a3c' : '#46301a');
    // trazas: ventana deslizante de «win» periodos que termina en el instante actual
    const half = P / 2, t0 = t - win * P, i0 = Math.floor(t0 / half), i1 = Math.ceil(t / half), px = (s) => X0 + (s - t0) / (win * P) * W;
    for (let ch = 0; ch < 5; ch++) {
      const yb = Y0 + ch * 47 + 30, yt = Y0 + ch * 47 + 6; let d = '';
      for (let i = i0; i <= i1; i++) {
        const s0 = Math.max(i * half, t0 - half), s1 = (i + 1) * half, c = Math.floor(i / 2);
        const v = ch === 0 ? (i % 2 === 0 ? 1 : 0) : (((c % 16) + 16) % 16 >> (ch - 1)) & 1, y = v ? yt : yb;
        d += (d ? `V${y}` : `M${px(s0).toFixed(1)},${y}`) + `H${px(s1).toFixed(1)}`;
      }
      q('hmw' + ch).setAttribute('d', d);
    }
  };
  requestAnimationFrame(frame);
  q('hm-free').onclick = o.onFree; q('hm-back').onclick = o.onBack;
  H.setContinue = (v) => { q('hm-cont').hidden = !v; };
};

root.Home = H;
if (typeof module !== 'undefined') module.exports = H;
})(typeof window !== 'undefined' ? window : globalThis);
