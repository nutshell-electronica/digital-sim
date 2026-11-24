/* Dibujo realista de las placas (vista superior, a escala 26 px = 2,54 mm). Arduino UNO R3 (A000066) y ESP32-S3-DevKitC-1. */
(function (root) {
'use strict';
const S = 26 / 2.54, T = '#0a8791', TD = '#06646c', TL = '#1aa3ad', WH = '#f4f6f4', MET = '#c9ccd0', MD = '#8c9196';
const f = (n) => +n.toFixed(1);
function ctxOf(X, Y) {
  const P = (x, y) => [f(X + x * S), f(Y + y * S)];
  const rect = (x, y, w, h, fill, st = '', rx = 0) => { const [a, b] = P(x, y); return `<rect x="${a}" y="${b}" width="${f(w * S)}" height="${f(h * S)}" rx="${f(rx * S)}" fill="${fill}" ${st}/>`; };
  const circ = (x, y, r, fill, st = '') => { const [a, b] = P(x, y); return `<circle cx="${a}" cy="${b}" r="${f(r * S)}" fill="${fill}" ${st}/>`; };
  const txt = (x, y, t, size, fill, o = '') => { const [a, b] = P(x, y); return `<text x="${a}" y="${b}" font-size="${size}" fill="${fill}" font-family="Arial" ${o}>${t}</text>`; };
  const line = (x1, y1, x2, y2, c, w) => { const [a, b] = P(x1, y1), [d, e] = P(x2, y2); return `<line x1="${a}" y1="${b}" x2="${d}" y2="${e}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; };
  return { P, rect, circ, txt, line };
}
/* ------------------------------------------------ Arduino UNO R3: 68,6 × 53,3 mm, USB-B arriba-izquierda, jack abajo-izquierda ---- */
function uno(X, Y, L) {
  const { P, rect, circ, txt, line } = ctxOf(X, Y), W = 68.6, H = 53.3; let s = '';
  // placa con esquinas achaflanadas (como el contorno oficial)
  const pts = [[0, 1.5], [1.5, 0], [64.8, 0], [68.6, 3.8], [68.6, 49.2], [66.5, 51.3], [66.5, 53.3 - 0.0], [1.5, 53.3], [0, 51.8]].map(q => P(q[0], q[1]).join(',')).join(' ');
  s += `<polygon points="${pts}" fill="${T}" stroke="${TD}" stroke-width="2.4" stroke-linejoin="round"/><polygon points="${pts}" fill="none" stroke="${TL}" stroke-width="1" transform="translate(${f(S * .9)},${f(S * .9)}) scale(.97)" opacity=".5"/>`;
  // pistas sugeridas
  [[[30, 9.5], [30, 20], [24, 20]], [[48, 12], [48, 24]], [[52, 13], [52, 24]], [[36, 33], [36, 46], [20, 46]], [[58, 33], [58, 47]], [[44, 34], [44, 45]], [[14, 28], [26, 28], [26, 40]]].forEach(pp => s += `<polyline points="${pp.map(q => P(q[0], q[1]).join(',')).join(' ')}" fill="none" stroke="${TL}" stroke-width="2" opacity=".55" stroke-linejoin="round"/>`);
  // taladros de fijación
  [[14, 2.5], [15.3, 50.7], [66.1, 7.6], [66.1, 35.5]].forEach(q => s += circ(q[0], q[1], 1.6, '#f1f3ee', `stroke="${TD}" stroke-width="2"`) + circ(q[0], q[1], 2.6, 'none', `stroke="${MET}" stroke-width="2.5" opacity=".9"`));
  // USB tipo B (sobresale 6,2 mm)
  s += rect(-6.2, 8.9, 16.3, 12.2, MET, `stroke="${MD}" stroke-width="1.6"`, .6) + rect(-5.4, 9.8, 12.8, 10.4, '#aeb3b8', `stroke="#7b8085" stroke-width="1"`) + rect(-5.2, 11.2, 9.5, 7.6, '#15171a') + rect(-5.2, 13.6, 9.0, 2.2, '#d9d9d9') + rect(-1.5, 9.6, 1.4, .8, '#777') + line(10.1, 9.4, 10.1, 20.6, '#888', 1);
  // conector de alimentación (jack)
  s += rect(-6.2, 33.6, 15, 12.6, '#1b1c1e', `stroke="#000" stroke-width="1.6"`, .8) + rect(-6.2, 35.6, 4.4, 8.6, '#0a0a0b') + circ(-2.5, 39.9, 1.6, '#050505', `stroke="#555" stroke-width="1.2"`) + rect(2, 34.2, 6.4, 11.4, '#2a2b2e', `stroke="#000" stroke-width=".6"`) + line(1.4, 34, 1.4, 46, '#3a3c40', 1.4);
  // fusible PTC y diodo M7
  s += rect(10.6, 23.8, 4.4, 3.2, '#d8c27a', `stroke="#8a7a3a" stroke-width=".8"`, .3) + rect(10.2, 29, 4.2, 2.7, '#222', `stroke="#000" stroke-width=".6"`) + rect(10.2, 29, .9, 2.7, '#ccc');
  // regulador NCP1117 (SOT-223) y condensadores electrolíticos
  s += rect(13.4, 37.2, 6.4, 3.4, '#1a1a1a') + rect(14.2, 35.4, 4.8, 1.7, '#b5b8bc') + rect(15.6, 40.6, 1.8, 1.2, '#b5b8bc');
  [[21.6, 41.8], [28.4, 41.8]].forEach(q => s += circ(q[0], q[1], 3.2, '#b9bcc0', `stroke="#6b6f74" stroke-width="1.4"`) + circ(q[0], q[1], 2.2, '#d6d8db') + line(q[0] - 3, q[1], q[0] - 2, q[1], '#222', 3));
  // ATmega16U2 (QFN) + cristal + ICSP1
  s += rect(18.4, 15.2, 6.6, 6.6, '#1b1b1b', `stroke="#000" stroke-width=".6"`) + circ(19.5, 16.3, .45, '#777') + txt(21.7, 19.2, '16U2', 7.5, '#9a9a9a', 'text-anchor="middle"');
  s += rect(18.6, 24, 5.4, 2.4, '#d3d6d9', `stroke="#808488" stroke-width="1"`, 1.1) + rect(19.4, 24.6, 3.8, 1.2, '#9aa0a5');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) s += rect(11.9 + i * 2.54, 16.4 + j * 2.54, 1.7, 1.7, '#1a1a1a') + circ(12.75 + i * 2.54, 17.25 + j * 2.54, .42, '#d4b24a');
  // pulsador de reset
  s += rect(30.5, 3.9, 6.2, 6.2, '#cfd2d5', `stroke="#555" stroke-width="1.2"`, .5) + circ(33.6, 7, 1.9, '#2a2a2a', `stroke="#000" stroke-width="1"`) + txt(33.6, 11.9, 'RESET', 7, WH, 'text-anchor="middle"');
  // LED SMD: L, TX, RX, ON
  const sled = (x, y, c, lab, lit) => rect(x - .8, y - .6, 1.6, 1.2, lit ? c : '#6e6e55', `stroke="#333" stroke-width=".7"`) + (lit ? circ(x, y, 2.2, c, 'opacity=".3"') : '') + txt(x, y + 3.1, lab, 6.5, WH, 'text-anchor="middle"');
  s += sled(41.5, 7.4, '#ffb300', 'L', L) + sled(44.4, 7.4, '#ffb300', 'TX', false) + sled(47.2, 7.4, '#ffb300', 'RX', false) + sled(50.5, 7.4, '#3ddc4a', 'ON', true);
  // ATmega328P DIP-28 con muesca, patas y serigrafía
  const dx = 28.8, dy = 23.6;
  for (let i = 0; i < 14; i++) s += rect(dx + 1.2 + i * 2.54, dy - 1.1, .64, 1.3, '#cfd2d4') + rect(dx + 1.2 + i * 2.54, dy + 6.9, .64, 1.3, '#cfd2d4');
  s += rect(dx, dy, 35.1, 7.6, '#181818', `stroke="#000" stroke-width="1.2"`, .3) + `<path d="M${P(dx, dy + 2.8).join(',')} a${f(1.1 * S)},${f(1.1 * S)} 0 0 1 0,${f(2 * S)}" fill="${T}" stroke="#333" stroke-width=".8"/>` + circ(dx + 2.2, dy + 1.6, .5, '#3a3a3a') + txt(dx + 18, dy + 3.5, 'ATMEGA328P-PU', 9, '#d4d4d4', 'text-anchor="middle" font-weight="700"') + txt(dx + 18, dy + 5.8, '1639 · MALAYSIA', 7, '#8a8a8a', 'text-anchor="middle"');
  // resonador cerámico 16 MHz
  s += rect(25.4, 28, 3.6, 2, '#d7c585', `stroke="#8a7a3a" stroke-width=".7"`, .3) + [0, 1, 2].map(i => rect(25.7 + i * 1.1, 30, .5, .7, '#bbb')).join('');
  // ICSP (ATmega328P): 2x3 vertical
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) s += rect(63.9 + i * 2.54, 12.3 + j * 2.54, 1.7, 1.7, '#1a1a1a') + circ(64.75 + i * 2.54, 13.15 + j * 2.54, .42, '#d4b24a');
  s += txt(66, 21.4, 'ICSP', 6.5, WH, 'text-anchor="middle"');
  // componentes SMD sueltos (resistencias y condensadores)
  [[27, 14], [27, 16], [29, 17.5], [38, 16], [40.5, 16], [43, 16], [46, 17], [49, 16], [52, 17], [56, 17], [60, 17], [31, 38], [34, 38], [37, 38], [40, 38], [43, 38], [47, 38], [52, 38], [56, 38], [60, 38], [24.5, 22.2], [33, 22], [38, 21.5]].forEach((q, i) => s += rect(q[0], q[1], i % 3 ? 1.7 : 1.3, i % 3 ? 1 : 1.7, i % 4 === 0 ? '#caa766' : '#2b2b2b', `stroke="#111" stroke-width=".4"`));
  // cabeceras (negras), serigrafía
  s += rect(18.2, .55, 46.9, 2.54 * 1.4, '#16181a', `stroke="#000" stroke-width="1"`, .3);
  s += rect(27.4, 49.2, 20.3, 2.54 * 1.1, '#16181a', `stroke="#000" stroke-width="1"`, .3) + rect(50.1, 49.2, 15.1, 2.54 * 1.1, '#16181a', `stroke="#000" stroke-width="1"`, .3);
  s += txt(57.5, 9.6, 'DIGITAL (PWM= ~)', 7, WH, 'text-anchor="middle" opacity=".85"') + txt(37.5, 47.4, 'POWER', 8, WH, 'text-anchor="middle" opacity=".85"') + txt(57.6, 47.4, 'ANALOG IN', 8, WH, 'text-anchor="middle" opacity=".85"');
  // logotipo ∞ y rótulos
  const [lx, ly] = P(52, 36.6);
  s += txt(40, 41.6, 'ARDUINO', 17, WH, 'text-anchor="middle" font-weight="700" letter-spacing="1.5"') + txt(61, 44.1, 'UNO', 13, WH, 'text-anchor="middle" font-weight="700"')
    + `<path d="M${f(lx - 17)},${f(ly)} C${f(lx - 17)},${f(ly - 12)} ${f(lx - 3)},${f(ly - 12)} ${f(lx)},${f(ly)} C${f(lx + 3)},${f(ly + 12)} ${f(lx + 17)},${f(ly + 12)} ${f(lx + 17)},${f(ly)} C${f(lx + 17)},${f(ly - 12)} ${f(lx + 3)},${f(ly - 12)} ${f(lx)},${f(ly)} C${f(lx - 3)},${f(ly + 12)} ${f(lx - 17)},${f(ly + 12)} ${f(lx - 17)},${f(ly)} Z" fill="none" stroke="${WH}" stroke-width="3.4" stroke-linejoin="round"/>`
    + `<line x1="${f(lx - 12)}" y1="${f(ly)}" x2="${f(lx - 6)}" y2="${f(ly)}" stroke="${WH}" stroke-width="2.4"/><line x1="${f(lx + 6)}" y1="${f(ly)}" x2="${f(lx + 12)}" y2="${f(ly)}" stroke="${WH}" stroke-width="2.4"/><line x1="${f(lx + 9)}" y1="${f(ly - 3)}" x2="${f(lx + 9)}" y2="${f(ly + 3)}" stroke="${WH}" stroke-width="2.4"/>`;
  return s;
}
/* ------------------------------------------------ ESP32-S3-DevKitC-1: 70 × 25,4 mm, USB a la izquierda, antena a la derecha ---- */
function esp(X, Y, L, rgbOn) {
  const { P, rect, circ, txt, line } = ctxOf(X, Y), W = 70, H = 25.4; let s = '';
  s += `<rect x="${X}" y="${Y}" width="${f(W * S)}" height="${f(H * S)}" rx="${f(1.2 * S)}" fill="#171b1d" stroke="#000" stroke-width="2.4"/><rect x="${f(X + 5)}" y="${f(Y + 5)}" width="${f(W * S - 10)}" height="${f(H * S - 10)}" rx="${f(S)}" fill="none" stroke="#2d3438" stroke-width="1"/>`;
  [[3.2, 3.2], [3.2, H - 3.2]].forEach(q => s += circ(q[0], q[1], 1.1, '#050606', `stroke="#d7b04a" stroke-width="1.6"`));
  // cabeceras 2×22 (pitch 2,54): tiras negras
  s += rect(3.4, 0, 56.6, 2.54, '#0a0b0c', `stroke="#000" stroke-width=".6"`) + rect(3.4, H - 2.54, 56.6, 2.54, '#0a0b0c', `stroke="#000" stroke-width=".6"`);
  // módulo ESP32-S3-WROOM-1 (18 × 25,5 mm) con antena de PCB
  const mx = 44.4, my = 3.7;
  s += rect(mx, my, 25.4, 18, '#101314', `stroke="#000" stroke-width="1"`) + rect(mx, my, 15.8, 18, '#cfd2d5', `stroke="#8d9296" stroke-width="1.4"`) + rect(mx + 1, my + 1, 13.8, 16, 'none', `stroke="#a8adb1" stroke-width="1"`);
  let ap = `M${P(mx + 16.5, my + 2.5).join(',')}`; for (let i = 0; i < 6; i++) { const xx = mx + 17.4 + i * 1.35; ap += ` H${P(xx, 0)[0]} V${P(0, my + (i % 2 ? 2.5 : 15.5))[1]}`; } s += `<path d="${ap}" fill="none" stroke="#d7b04a" stroke-width="2.6" stroke-linejoin="round"/>`;
  s += txt(mx + 7.9, my + 6.6, 'ESP32-S3-WROOM-1', 8.5, '#2b2e30', 'text-anchor="middle" font-weight="700"') + txt(mx + 7.9, my + 9.3, 'N8R8 · 2.4 GHz', 7.5, '#4a4e50', 'text-anchor="middle"') + txt(mx + 7.9, my + 12.2, 'Espressif', 7.5, '#4a4e50', 'text-anchor="middle"') + rect(mx + 4.3, my + 13.4, 6.6, 2.2, 'none', `stroke="#6a6e70" stroke-width=".8"`);
  // dos USB-C (sobresalen 1 mm): arriba USB nativo, abajo UART
  const usbc = (cy, lab) => rect(-1.1, cy - 4.5, 8.4, 9, '#cdd0d3', `stroke="#868b90" stroke-width="1.4"`, 1.6) + rect(-0.2, cy - 3.2, 6.7, 6.4, '#101214', `stroke="#555" stroke-width=".6"`, 1.3) + rect(.6, cy - .5, 5, 1, '#c9a227') + txt(11, cy + 1.2, lab, 7.5, WH, 'text-anchor="middle" font-weight="700"');
  s += usbc(6.4, 'USB') + usbc(19, 'UART');
  // pulsadores BOOT y RST
  const btn = (cy, lab) => rect(14.8, cy - 1.9, 3.8, 3.8, '#cfd2d5', `stroke="#6a6e72" stroke-width="1"`, .4) + circ(16.7, cy, 1.1, '#26292b', `stroke="#000" stroke-width=".8"`) + txt(21.8, cy + 1, lab, 7, WH, 'text-anchor="start"');
  s += btn(6.9, 'BOOT') + btn(18.5, 'RST');
  // CP2102N, regulador AMS1117-3.3, condensadores
  s += rect(24.6, 9.9, 5, 5, '#1a1a1a', `stroke="#000" stroke-width=".6"`) + circ(25.5, 10.8, .4, '#777') + txt(27.1, 13.3, 'CP2102N', 4.4, '#999', 'text-anchor="middle"') + rect(33.6, 4.6, 6.8, 3.4, '#1b1b1b') + rect(34.4, 2.9, 5.2, 1.7, '#b8bbbf') + rect(35.8, 8, 2, 1.3, '#b8bbbf') + txt(37, 11.4, 'AMS1117', 5, '#999', 'text-anchor="middle"');
  [[32, 10], [32, 15.4], [41.2, 12.5], [41.2, 16.3], [38, 19.6], [28.4, 19.5], [28.4, 6]].forEach((q, i) => s += rect(q[0], q[1], i % 2 ? 1.7 : 1.1, i % 2 ? 1 : 1.7, i % 3 ? '#caa766' : '#2e2e2e', `stroke="#000" stroke-width=".4"`));
  // LED de alimentación, LED RGB (GPIO48) y serigrafía
  s += rect(30.2, 19.1, 1.6, 1.2, '#E0301E', `stroke="#400" stroke-width=".6"`) + circ(31, 19.7, 2.1, '#E0301E', 'opacity=".28"') + txt(31, 23.1, 'PWR', 5.5, WH, 'text-anchor="middle"');
  s += rect(35.4, 17.7, 4.6, 4.6, '#e9e9e9', `stroke="#555" stroke-width=".8"`, .3) + circ(37.7, 20, 1.5, rgbOn ? '#ff4d4d' : '#c9c9c9', `stroke="#888" stroke-width=".6"`) + (rgbOn ? circ(37.7, 20, 4, '#ff4d4d', 'opacity=".28"') : '') + txt(37.7, 24.2, 'RGB·48', 5.5, WH, 'text-anchor="middle"');
  s += txt(23, 17.4, 'ESP32-S3-DevKitC-1', 10, WH, 'font-weight="700" opacity=".92"') + txt(23, 19.7, 'v1.0', 6.5, WH, 'opacity=".7"');
  return s;
}
root.MCUArt = { uno, esp, S };
})(window);
