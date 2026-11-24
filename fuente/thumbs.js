/* Miniaturas de componentes y ayudas contextuales */
(function (root) {
'use strict';
const UI = root.UI;
const INK = '#1F2421';
UI.WIRECOLORS = [['#B8432F', 'rojo'], ['#1F2421', 'negro'], ['#4C6A8C', 'azul'], ['#4F8A57', 'verde'], ['#C9A227', 'amarillo'], ['#D9822B', 'naranja'], ['#7A4E2D', 'marrón'], ['#7B5EA7', 'violeta'], ['#8A8F94', 'gris'], ['#E8E4DA', 'blanco'], ['#D96C9A', 'rosa'], ['#2AA7A0', 'turquesa']];
UI.HELP = {
  AND: 'Puerta AND: la salida vale 1 solo si todas las entradas valen 1 (Y = A·B). Equivale al 74HC08.', OR: 'Puerta OR: la salida vale 1 si alguna entrada vale 1 (Y = A+B). Equivale al 74HC32.',
  NAND: 'NAND: AND con salida negada (Y = (A·B)\'). Puerta universal; 74HC00.', NOR: 'NOR: OR con salida negada. Puerta universal; 74HC02.', XOR: 'XOR: 1 si las entradas son distintas (Y = A⊕B); 74HC86.', XNOR: 'XNOR: 1 si las entradas son iguales.',
  NOT: 'Inversor: Y = A\'. 74HC04 (6 por encapsulado).', BUF: 'Buffer: copia la entrada; sirve para dar más corriente.',
  SWM: 'Interruptor simple (dos terminales): clic para abrirlo o cerrarlo.', PSH: 'Pulsador de dos terminales: conduce solo mientras lo mantienes pulsado (NA) o al revés (NC).', SW: 'Entrada digital fija: clic para cambiar entre 0 y 1. Doble clic para cambiar su nombre.', PUSH: 'Pulsador: activo mientras lo mantienes pulsado.', CLK_b: 'Generador de reloj (módulo de 3 patas VCC, CLK, GND). Alimentalo y fija la frecuencia con un clic sobre él.', CLK: 'Reloj: onda cuadrada con la frecuencia (Hz) que indiques con doble clic.',
  HI: 'Alimentación +5 V.', LO: 'Masa (GND, 0 V). Referencia de todas las tensiones.', LED: 'LED con su resistencia de protección y conexión a GND. Se enciende con 1 lógico.',
  D7: 'Display de 7 segmentos (a–g y punto). Cátodo o ánodo común, a elegir con doble clic.', R: 'Resistencia: doble clic para elegir el valor (serie E12).', C: 'Condensador: doble clic para elegir su valor.',
  FFD: 'Biestable D: copia D a Q en el flanco activo del reloj. PR y CL son asíncronas (activas a 0).', FFJK: 'Biestable JK: J=K=1 conmuta; J=K=0 mantiene; J=1,K=0 pone a 1; J=0,K=1 pone a 0.', FFT: 'Biestable T: conmuta Q en cada flanco con T=1.',
  DMM: 'Multímetro: botones V y A (cambia el modo en Propiedades). En A se coloca en serie con la carga.', LA8: 'Analizador lógico de 8 canales: cada entrada conectada aparece como canal en el cronograma.', VM: 'Voltímetro: mide la tensión entre sus dos extremos.', PROBE: 'Sonda lógica: indica nivel alto, bajo o flotante del punto donde la conectes.', WATCH: 'Marca una señal para verla en el cronograma.', NOTE: 'Nota de texto libre.',
  R_b: 'Resistencia de 1/4 W. Los colores de las bandas indican el valor. Doble clic para cambiarlo.', LED_b: 'LED: el terminal largo es el ánodo (+). Necesita una resistencia en serie (≈330 Ω a 5 V).', C_b: 'Condensador: si es electrolítico, la pata marcada con franja es el negativo; al revés se estropea.',
  PUSH_b: 'Pulsador de 4 patas: las patas del mismo lado están unidas por dentro; al pulsar se unen los dos lados.', DIPSW10: 'Microinterruptor DIP de 10 posiciones. ON hacia arriba (cierra el contacto), numerado 1–10.', DIPSW4: 'Microinterruptor DIP de 4 posiciones. ON hacia arriba, numerado 1–4.', DIPSW: 'Microinterruptor DIP de 8 posiciones. ON hacia arriba, numerado 1–8.',
  D7_b: 'Display de 7 segmentos 5161 (ánodo común) o 5163 (cátodo común). Cada segmento necesita su resistencia.', WIRE: 'Cable: arrastra de un agujero a otro. Pulsa en un punto del cable para crear un codo y arrástralo. Doble clic para cambiar el color.',
  IC: 'Circuito integrado DIP. Se monta a caballo del canal central, con la muesca a la izquierda (pata 1 abajo a la izquierda).', DMM: 'Multímetro: tensión (V), corriente (A, en serie) o resistencia (Ω, sin tensión en el circuito). Se cambia con doble clic.',
  LP: 'Sonda lógica en forma de lápiz: la punta se pincha en cualquier agujero. Las pinzas van a alimentación.', LA: 'Analizador lógico de 8 canales: solo se conectan los canales que vayas a usar, más masa.', MB102: 'Fuente MB102 para protoboard: jumpers de 3,3 V/5 V por cada carril y interruptor. Entrada por jack o USB.',
  UNO: 'Arduino UNO (ATmega328P, 5 V). Sus pines se conectan a la placa con cables.', ESP32: 'ESP32-S3 DevKitC-1 (3,3 V). No tolera 5 V en sus pines.'
};
const svgw = (inner) => `<svg class="th" viewBox="0 0 60 36" aria-hidden="true">${inner}</svg>`;
const bandsFor = ['#8a5a2b', '#1F2421', '#B8432F'];
UI.boardThumb = function (t) {
  const [ty, arg] = t.split(':');
  const line = (x1, y1, x2, y2, c = '#9a9a9a', w = 1.6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;
  switch (ty) {
    case 'R': return svgw(line(4, 18, 56, 18) + `<rect x="16" y="11" width="28" height="14" rx="6" fill="#D9C7A0" stroke="#8a7a58"/>` + [21, 27, 33].map((x, i) => `<rect x="${x}" y="11" width="3.4" height="14" fill="${bandsFor[i]}"/>`).join('') + `<rect x="39" y="11" width="2.6" height="14" fill="#C9A227"/>`);
    case 'LED': { const C = { red: '#B8432F', green: '#4F8A57', yellow: '#C9A227', blue: '#4C6A8C' }[arg] || '#B8432F'; return svgw(line(24, 22, 24, 34) + line(36, 22, 36, 30) + `<path d="M17,22 V14 a13,13 0 0 1 26,0 V22 Z" fill="${C}" opacity=".85" stroke="#222"/><rect x="14" y="21" width="32" height="3" rx="1" fill="${C}" stroke="#222"/>`); }
    case 'C': return svgw(line(24, 26, 24, 35) + line(36, 26, 36, 35) + `<rect x="15" y="3" width="30" height="24" rx="4" fill="#33425b" stroke="#222"/><rect x="38" y="3" width="7" height="24" fill="#b9c2d0"/><text x="25" y="18" text-anchor="middle" font-size="8" fill="#fff">100µ</text>`);
    case 'CLK': return svgw(`<rect x="8" y="5" width="44" height="26" rx="3" fill="#33425b" stroke="#1b2536"/><path d="M14,24 V14 H22 V24 H30 V14 H38 V24 H46" fill="none" stroke="#ffb35c" stroke-width="1.8"/>` + [16, 30, 44].map(x => line(x, 31, x, 36, '#aaa', 2)).join(''));
    case 'PUSH': return svgw(`<rect x="12" y="5" width="36" height="26" rx="3" fill="#4a4d4a" stroke="#222"/><circle cx="30" cy="18" r="8" fill="#B8432F" stroke="#222"/>` + [[10, 9], [10, 27], [50, 9], [50, 27]].map(p => line(p[0], p[1], p[0] + (p[0] < 30 ? 3 : -3), p[1], '#aaa', 2)).join(''));
    case 'DIPSW': { const n = arg === '10' ? 10 : arg === '4' ? 4 : 8, w = 5 * n + 6, x0 = 30 - w / 2; return svgw(`<rect x="${x0}" y="6" width="${w}" height="24" rx="2" fill="#C94A3A" stroke="#222"/>` + Array.from({ length: n }, (_, i) => `<rect x="${x0 + 4 + i * 5}" y="${i % 3 ? 16 : 10}" width="3.4" height="9" fill="#eee"/>`).join('') + `<text x="${x0 + 3}" y="33" font-size="5" fill="${INK}">ON</text>`); }
    case 'D7': return svgw(`<rect x="14" y="3" width="32" height="30" rx="3" fill="#2a2d2b"/>` + [[20, 8, 20, 3], [38, 10, 3, 9], [38, 20, 3, 9], [20, 28, 20, 3], [17, 20, 3, 9], [17, 10, 3, 9], [20, 18, 20, 3]].map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="#E0553A"/>`).join(''));
    case 'WIRE': { const c = arg || '#B8432F'; return svgw(`<path d="M6,28 C6,6 54,6 54,28" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/><circle cx="6" cy="28" r="2.6" fill="#555"/><circle cx="54" cy="28" r="2.6" fill="#555"/>`); }
    case 'IC': return svgw(`<rect x="8" y="9" width="44" height="18" rx="2" fill="#2b2e2d" stroke="#111"/><path d="M8,15 a3,3 0 0 1 0,6" fill="#111"/>` + Array.from({ length: 7 }, (_, i) => `<rect x="${11 + i * 6}" y="5" width="3" height="4" fill="#aaa"/><rect x="${11 + i * 6}" y="27" width="3" height="4" fill="#aaa"/>`).join('') + `<text x="30" y="21" text-anchor="middle" font-size="6" fill="#e7e5df">${(arg || '74xx').replace(/^74/, '')}</text>`);
    case 'DMM': case 'DMMA': return svgw(`<rect x="16" y="2" width="28" height="32" rx="4" fill="#C9A227" stroke="#222"/><rect x="19" y="5" width="22" height="9" fill="#cfe3c9" stroke="#222"/><text x="40" y="12" text-anchor="end" font-size="6" fill="${INK}">${ty === 'DMMA' ? '0.00A' : '5.00V'}</text><circle cx="30" cy="23" r="5" fill="#333"/><circle cx="23" cy="31" r="1.5" fill="#B8432F"/><circle cx="37" cy="31" r="1.5" fill="#111"/>`);
    case 'LP': return svgw(`<path d="M6,31 L16,26 L16,20 L52,10 L52,18 L16,28" fill="none"/><polygon points="4,32 14,22 18,26" fill="#aaa" stroke="#222"/><rect x="12" y="14" width="42" height="9" rx="4" transform="rotate(-25 33 18)" fill="#E0B02A" stroke="#222"/><circle cx="45" cy="14" r="2" fill="#B8432F"/>`);
    case 'LA': return svgw(`<rect x="8" y="4" width="30" height="20" rx="3" fill="#3b4a5a" stroke="#222"/>` + Array.from({ length: 8 }, (_, i) => `<path d="M${38} ${7 + i * 2} q10,${(i - 4) * 2} 18,${i * 1.2 + 4}" fill="none" stroke="${i % 2 ? '#B85D34' : '#555'}" stroke-width="1.2"/>`).join('') + `<text x="23" y="17" text-anchor="middle" font-size="7" fill="#eee">LA8</text>`);
    case 'MB102': return svgw(`<rect x="6" y="6" width="48" height="24" rx="2" fill="#2d6a4f" stroke="#111"/><rect x="2" y="10" width="10" height="12" fill="#222"/><rect x="38" y="10" width="12" height="7" fill="#999"/><rect x="38" y="20" width="12" height="7" fill="#999"/><text x="25" y="22" font-size="6" fill="#fff" text-anchor="middle">MB102</text>`);
    case 'MCU': return arg === 'UNO' ? svgw(`<rect x="4" y="6" width="52" height="24" rx="3" fill="#00878F" stroke="#111"/><rect x="2" y="9" width="10" height="9" fill="#999"/><rect x="2" y="22" width="9" height="7" fill="#222"/><rect x="26" y="15" width="16" height="6" fill="#222"/><text x="40" y="12" font-size="5" fill="#fff" text-anchor="middle">UNO</text>`) : arg === 'ESP32' ? svgw(`<rect x="12" y="2" width="36" height="32" rx="3" fill="#222" stroke="#000"/><rect x="18" y="4" width="24" height="12" fill="#bbb"/><text x="30" y="28" font-size="6" fill="#ddd" text-anchor="middle">ESP32</text>`) : svgw(`<line x1="14" y1="8" x2="46" y2="28" stroke="#B8432F" stroke-width="3"/><line x1="46" y1="8" x2="14" y2="28" stroke="#B8432F" stroke-width="3"/>`);
  }
  return svgw('');
};
UI.schThumb = function (k, id) {
  try {
    const p = { id: 'th', kind: id, x: 0, y: 0, props: JSON.parse(JSON.stringify(k.props || {})) }, g = k.geom(p);
    const w = (g.w || 40) + 24, h = (g.h || 30) + 28; const sc = Math.max(1, Math.max(w / 64, h / 40));
    return `<svg class="th" viewBox="-12 -16 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${k.draw(p, g, {})}</svg>`;
  } catch (e) { return '<svg class="th"></svg>'; }
};
})(window);
