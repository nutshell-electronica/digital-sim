/* Sensores y actuadores para la protoboard: modelo eléctrico (SENS en el motor), dibujo realista y estímulos físicos */
(function (root) {
'use strict';
const E = root.DSim, UI = root.UI || {};
const P = 18; /* separación de agujeros (2,54 mm) -> 7,087 px/mm */
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const V = (s, p, i) => { const n = p.pins[i]; return n == null ? 0 : (s.vp[n] || 0); };
const drv = (p, i, v, r) => { if (p.pins[i] == null) return; p.pg[i] = 1 / r; p.pi[i] = v / r; p.pk[i] = 1; };
const lnk = (p, i, j, g, is) => { if (p.pins[i] != null && p.pins[j] != null) p.links.push([i, j, g, is || 0]); };
const parseV = (s) => { s = String(s).trim().toLowerCase().replace(',', '.'); const m = s.match(/^([\d.]+)\s*([kmg]?)/); if (!m) return NaN; return parseFloat(m[1]) * ({ '': 1, k: 1e3, m: 1e6, g: 1e9 }[m[2]]); };
const SENS = {}; /* modelos: SENS[kind](sim, p) */
const CAT = {};  /* catálogo: nombre, patas, estímulos, dibujo */
E.SENS = SENS;

/* ---------- utilidades de dibujo ---------- */
const GOLD = '#d4b04a', PINC = '#c9ccc9';
const pinsSvg = (cat, labels = true, lc = '#fff', ly = -9) => cat.pins.map(q => `<rect x="${q.dx * P - 2.2}" y="-6" width="4.4" height="12" fill="${PINC}" stroke="#7b7e7b" stroke-width=".5"/>` + (labels ? `<text x="${q.dx * P}" y="${ly}" font-size="5.6" font-weight="700" text-anchor="middle" fill="${lc}">${esc(q.n)}</text>` : '')).join('');
const led = (x, y, on, c = '#e0432f', r = 3.4) => `<rect x="${x - r}" y="${y - r * .75}" width="${r * 2}" height="${r * 1.5}" rx="1" fill="${on ? c : '#5b5f5f'}" stroke="#222" stroke-width=".6"/>${on ? `<circle cx="${x}" cy="${y}" r="${r * 2.1}" fill="${c}" opacity=".25"/>` : ''}`;
const trimmer = (x, y, a) => `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" rx="2" fill="#2f66b3" stroke="#18407a"/><circle cx="${x}" cy="${y}" r="10.5" fill="#d9dde0" stroke="#7a8086"/><g transform="rotate(${a} ${x} ${y})"><rect x="${x - 8.5}" y="${y - 1.7}" width="17" height="3.4" fill="#4b5157"/></g>`;
const chip = (x, y, w = 28, h = 18, t = 'LM393') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="#262a2b" stroke="#111"/><text x="${x + w / 2}" y="${y + h / 2 + 2.5}" font-size="6.5" text-anchor="middle" fill="#9aa0a3">${t}</text>${[0, 1, 2, 3].map(i => `<rect x="${x + 3 + i * (w - 8) / 3}" y="${y - 2.5}" width="3" height="3" fill="#bbb"/><rect x="${x + 3 + i * (w - 8) / 3}" y="${y + h - .5}" width="3" height="3" fill="#bbb"/>`).join('')}`;
const smd = (x, y, w = 11, h = 6, c = '#1a1a1a') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="#555" stroke-width=".4"/><rect x="${x}" y="${y}" width="2.4" height="${h}" fill="#c8c8c8"/><rect x="${x + w - 2.4}" y="${y}" width="2.4" height="${h}" fill="#c8c8c8"/>`;
const hole = (x, y) => `<circle cx="${x}" cy="${y}" r="5" fill="#f3f1e8" stroke="#a79f87" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="3.2" fill="#2b2f33"/>`;
const to92 = (name, pins) => `<path d="M-2,-6 L-2,-30 Q18,-58 38,-30 L38,-6 Z" fill="#26292b" stroke="#0e0f10" stroke-width="1"/><path d="M-2,-30 Q18,-58 38,-30" fill="none" stroke="#4a4f52" stroke-width="1.5"/><text x="18" y="-17" font-size="7.5" font-weight="700" text-anchor="middle" fill="#dfe3e5">${name}</text><text x="18" y="-9.5" font-size="5.5" text-anchor="middle" fill="#9aa0a3">${pins}</text>`;
const statsOf = (sv) => (sv && sv.st) || {};

/* ---------- catálogo ---------- */
/* stim: estímulos físicos que el alumno controla; props: opciones del componente; box: recuadro de selección */
const reg = (kind, c) => { c.kind = kind; CAT[kind] = c; if (c.model) SENS[kind] = c.model; return c; };

/* Potenciómetro rotativo 10 kΩ */
reg('POT', { name: 'Potenciómetro', group: 'Sensores', desc: 'Potenciómetro rotativo lineal. Con A a +V y B a GND, la patilla central (cursor) da una tensión entre 0 y +V proporcional al giro (en sentido horario el cursor se acerca a A).',
  pins: [{ n: 'A', dx: 0 }, { n: 'W', dx: 2 }, { n: 'B', dx: 4 }], box: { x: -20, y: -104, w: 112, h: 108 },
  stim: [{ k: 'pos', label: 'Giro del eje', unit: '%', min: 0, max: 100, step: 1, def: 50 }], props: [{ k: 'r', label: 'Valor', opts: ['1k', '10k', '100k'], def: '10k' }],
  model(s, p) { const R = Math.max(parseV(p.o.r) || 1e4, 100), x = clamp((p.stim.pos || 0) / 100, 0, 1); lnk(p, 0, 1, 1 / Math.max(R * (1 - x), 0.5)); lnk(p, 1, 2, 1 / Math.max(R * x, 0.5)); },
  readout: (it, sv) => `Giro ${it.stim.pos}% · ${it.o.r}Ω`,
  draw(it, sv) { const a = -135 + 270 * (it.stim.pos / 100);
    return `<rect x="-20" y="-66" width="112" height="60" rx="3" fill="#2b5d9e" stroke="#163a6b"/><text x="36" y="-12" font-size="8" font-weight="700" text-anchor="middle" fill="#cfe0f5">${esc(it.o.r)} Ω · B</text>
      <circle cx="36" cy="-58" r="44" fill="#1d1f21" stroke="#000"/><circle cx="36" cy="-58" r="36" fill="#2a2d30"/>${Array.from({ length: 21 }, (_, i) => { const t = (-135 + 13.5 * i) * Math.PI / 180; return `<line x1="${36 + 38 * Math.sin(t)}" y1="${-58 - 38 * Math.cos(t)}" x2="${36 + 43 * Math.sin(t)}" y2="${-58 - 43 * Math.cos(t)}" stroke="#d8d8d0" stroke-width="${i % 5 === 0 ? 1.8 : .8}"/>`; }).join('')}
      <g transform="rotate(${a} 36 -58)"><circle cx="36" cy="-58" r="28" fill="#3a3e42" stroke="#111"/><rect x="33.5" y="-84" width="5" height="22" rx="2" fill="#f2efe4"/><circle cx="36" cy="-58" r="9" fill="#9da3a8" stroke="#5a5f63"/></g>${pinsSvg(this, true, '#cfe0f5', 5)}`; } });

/* Joystick analógico KY-023 */
reg('JOY', { name: 'Joystick KY-023', group: 'Sensores', desc: 'Dos potenciómetros de 10 kΩ (ejes X e Y) y un pulsador (SW, activo a GND; usa INPUT_PULLUP). Centro ≈ 2,5 V.',
  pins: [{ n: 'GND', dx: 0 }, { n: '+5V', dx: 1 }, { n: 'VRx', dx: 2 }, { n: 'VRy', dx: 3 }, { n: 'SW', dx: 4 }], box: { x: -80, y: -250, w: 232, h: 254 },
  stim: [{ k: 'x', label: 'Eje X', unit: '', min: -100, max: 100, step: 1, def: 0 }, { k: 'y', label: 'Eje Y', unit: '', min: -100, max: 100, step: 1, def: 0 }, { k: 'sw', label: 'Pulsar la palanca', type: 'bool', def: 0 }],
  model(s, p) { const R = 1e4, ux = clamp((p.stim.x + 100) / 200, 0, 1), uy = clamp((-p.stim.y + 100) / 200, 0, 1);
    lnk(p, 1, 2, 1 / Math.max(R * (1 - ux), .5)); lnk(p, 2, 0, 1 / Math.max(R * ux, .5)); lnk(p, 1, 3, 1 / Math.max(R * (1 - uy), .5)); lnk(p, 3, 0, 1 / Math.max(R * uy, .5)); if (p.stim.sw) lnk(p, 4, 0, 1 / 0.3); },
  readout: (it, sv) => `X ${it.stim.x} · Y ${it.stim.y}${it.stim.sw ? ' · pulsado' : ''}`,
  draw(it, sv) { const dx = it.stim.x * .16, dy = -it.stim.y * .16;
    return `<rect x="-80" y="-244" width="184" height="236" rx="4" fill="#1b2a3a" stroke="#0b141d"/><rect x="-70" y="-236" width="164" height="220" rx="3" fill="#20344a"/>${hole(-68, -228)}${hole(92, -228)}${hole(-68, -22)}${hole(92, -22)}
      <rect x="-30" y="-196" width="124" height="124" rx="3" fill="#0f1114" stroke="#000"/><circle cx="32" cy="-134" r="48" fill="#25282c"/><circle cx="32" cy="-134" r="40" fill="#15171a"/>
      <g transform="translate(${dx} ${dy})"><circle cx="32" cy="-134" r="30" fill="#2c3035" stroke="#000"/><circle cx="32" cy="-134" r="24" fill="#3b4046"/><circle cx="32" cy="-134" r="14" fill="#2f3338" stroke="#16181a"/>${Array.from({ length: 16 }, (_, i) => `<line x1="${32 + 25 * Math.cos(i * Math.PI / 8)}" y1="${-134 + 25 * Math.sin(i * Math.PI / 8)}" x2="${32 + 29 * Math.cos(i * Math.PI / 8)}" y2="${-134 + 29 * Math.sin(i * Math.PI / 8)}" stroke="#15171a" stroke-width="1.6"/>`).join('')}</g>
      <text x="32" y="-52" font-size="10" font-weight="700" text-anchor="middle" fill="#dbe7f2">KY-023</text>${pinsSvg(this, true, '#dbe7f2', -14)}`; } });

/* Fotorresistencia LDR GL5528 */
reg('LDR', { name: 'Fotorresistencia (LDR)', group: 'Sensores', desc: 'LDR GL5528: ≈15 kΩ a 10 lux, ≈1 kΩ a 1000 lux, > 500 kΩ casi a oscuras (γ ≈ 0,6). Se usa en divisor de tensión con una resistencia fija.',
  pins: [{ n: '1', dx: 0 }, { n: '2', dx: 1 }], box: { x: -14, y: -62, w: 46, h: 66 },
  stim: [{ k: 'lux', label: 'Iluminación', unit: 'lux', min: 0.1, max: 100000, def: 300, log: true }],
  model(s, p) { const L = Math.max(p.stim.lux || 0.1, 0.01), R = clamp(15e3 * Math.pow(10 / L, 0.6), 100, 5e6); p.st.R = R; lnk(p, 0, 1, 1 / R); },
  readout: (it, sv) => { const R = statsOf(sv).R; return `${it.stim.lux} lux${R ? ' · R = ' + (R >= 1e3 ? (R / 1e3).toFixed(1) + ' kΩ' : R.toFixed(0) + ' Ω') : ''}`; },
  draw(it, sv) { const lx = it.stim.lux, glow = clamp(Math.log10(Math.max(lx, .1)) / 5 + .2, 0, 1);
    const zz = 'M-0,-47 L16,-47 L2,-42 L18,-42 L4,-37 L18,-37 L4,-32 L16,-32 L2,-28 L16,-28';
    return `<line x1="0" y1="-8" x2="0" y2="0" stroke="#aeb2b6" stroke-width="2.6"/><line x1="${P}" y1="-8" x2="${P}" y2="0" stroke="#aeb2b6" stroke-width="2.6"/><path d="M0,-8 C0,-20 -2,-24 -2,-30 M${P},-8 C${P},-20 ${P + 2},-24 ${P + 2},-30" fill="none" stroke="#aeb2b6" stroke-width="2.6"/>
      <circle cx="9" cy="-38" r="23" fill="#c7a25a" stroke="#6b5326" stroke-width="1.2"/><circle cx="9" cy="-38" r="19" fill="#d8b66d"/><circle cx="9" cy="-38" r="18" fill="#cfa85b" stroke="#8b6c30" stroke-width=".6"/>
      <g transform="translate(-0 0)" stroke="#6a4a1c" stroke-width="2.4" fill="none" stroke-linejoin="round">${[-12, -6, 0, 6, 12].map((o, i) => `<path d="M${-5} ${-38 + o} L${23} ${-38 + o}" opacity="0"/>`).join('')}<path d="M-3,-52 L21,-52 L-5,-46 L23,-46 L-5,-40 L23,-40 L-5,-34 L23,-34 L-3,-28 L21,-28" stroke="#7a5420"/></g>
      <circle cx="9" cy="-38" r="23" fill="none" stroke="#b08a43" stroke-width="1"/><ellipse cx="2" cy="-48" rx="8" ry="4" fill="#fff" opacity=".28"/>${glow > .6 ? `<g stroke="#f2c14e" stroke-width="1.6" opacity="${glow}"><line x1="36" y1="-62" x2="46" y2="-72"/><line x1="40" y1="-48" x2="52" y2="-52"/><line x1="-26" y1="-62" x2="-36" y2="-72"/></g>` : ''}`; } });

/* Termistor NTC 10 kΩ B=3950 */
reg('NTC', { name: 'Termistor NTC 10 kΩ', group: 'Sensores', desc: 'NTC 10 kΩ a 25 °C, B = 3950 K: R = 10 kΩ · exp[B·(1/T − 1/298,15)]. Baja la resistencia al subir la temperatura. Úsalo en un divisor con 10 kΩ.',
  pins: [{ n: '1', dx: 0 }, { n: '2', dx: 1 }], box: { x: -14, y: -66, w: 46, h: 70 },
  stim: [{ k: 'temp', label: 'Temperatura', unit: '°C', min: -20, max: 150, step: 0.5, def: 25 }],
  model(s, p) { const T = (p.stim.temp || 25) + 273.15, R = clamp(1e4 * Math.exp(3950 * (1 / T - 1 / 298.15)), 20, 3e6); p.st.R = R; lnk(p, 0, 1, 1 / R); },
  readout: (it, sv) => { const R = statsOf(sv).R; return `${it.stim.temp} °C${R ? ' · R = ' + (R >= 1e3 ? (R / 1e3).toFixed(2) + ' kΩ' : R.toFixed(0) + ' Ω') : ''}`; },
  draw(it, sv) { return `<path d="M0,-4 C0,-20 2,-22 6,-30 M${P},-4 C${P},-20 ${P - 2},-22 ${P - 6},-30" fill="none" stroke="#aeb2b6" stroke-width="2.6"/><path d="M-4,-30 C-6,-52 3,-64 9,-64 C15,-64 24,-52 22,-30 Z" fill="#2c5f8c" stroke="#10304b" stroke-width="1.2"/><path d="M-1,-33 C-3,-50 4,-60 9,-60" fill="none" stroke="#8fc0ea" stroke-width="2" opacity=".6"/><text x="9" y="-43" font-size="6.5" font-weight="700" text-anchor="middle" fill="#dff0ff">NTC</text><text x="9" y="-36" font-size="5.5" text-anchor="middle" fill="#bcd9f2">10k</text>`; } });

/* TMP36 y LM35 */
const lin = (name, vs, f) => ({ pins: [{ n: '+Vs', dx: 0 }, { n: 'Vout', dx: 1 }, { n: 'GND', dx: 2 }], box: { x: -10, y: -58, w: 56, h: 62 },
  model(s, p) { const vcc = V(s, p, 0) - V(s, p, 2), vg = V(s, p, 2); p.st.ok = vcc > vs.min && vcc < vs.max; if (!p.st.ok) return; lnk(p, 0, 2, 1 / (vcc / vs.i)); const T = clamp(p.stim.temp, vs.t0, vs.t1); p.st.v = clamp(f(T), 0, vcc - 0.05); drv(p, 1, vg + p.st.v, 40); },
  readout: (it, sv) => { const st = statsOf(sv); return `${it.stim.temp} °C${st.ok ? ' · Vout = ' + (st.v * 1000).toFixed(0) + ' mV' : ' · sin alimentación válida'}`; },
  maxV: vs.max, draw() { return to92(name, '+Vs  Vout  GND') + pinsSvg(this, false); } });
reg('TMP36', Object.assign({ name: 'Sensor TMP36', group: 'Sensores', desc: 'TMP36: Vout = 0,5 V + 10 mV/°C, de −40 a 125 °C; alimentación de 2,7 a 5,5 V. T(°C) = (Vout − 0,5)·100.', stim: [{ k: 'temp', label: 'Temperatura', unit: '°C', min: -40, max: 125, step: 0.5, def: 25 }] }, lin('TMP36', { min: 2.7, max: 5.6, i: 50e-6, t0: -40, t1: 125 }, T => 0.5 + 0.01 * T)));
reg('LM35', Object.assign({ name: 'Sensor LM35', group: 'Sensores', desc: 'LM35DZ: Vout = 10 mV/°C, de 0 a 100 °C; alimentación de 4 a 30 V. T(°C) = Vout·100.', stim: [{ k: 'temp', label: 'Temperatura', unit: '°C', min: 0, max: 100, step: 0.5, def: 25 }] }, lin('LM35', { min: 4, max: 30, i: 60e-6, t0: 0, t1: 100 }, T => 0.01 * T)));

/* DHT11 / DHT22 (módulo de 3 patas con resistencia pull-up) */
const dht = (kind, name, blue) => reg(kind, { name, group: 'Sensores', desc: kind === 'DHT11' ? 'DHT11: temperatura 0–50 °C (±2 °C, resolución 1 °C) y humedad 20–90 % (±5 %). Una lectura por segundo. Alimentación 3,3–5,5 V. Módulo con pull-up de 10 kΩ en DATA. Librería DHT.h.' : 'DHT22 (AM2302): temperatura −40–80 °C (±0,5 °C, resolución 0,1 °C) y humedad 0–100 % (±2 %). Una lectura cada 2 s. Alimentación 3,3–5,5 V. Módulo con pull-up de 10 kΩ en DATA. Librería DHT.h.',
  pins: [{ n: 'VCC', dx: 0 }, { n: 'DATA', dx: 1 }, { n: 'GND', dx: 2 }], box: { x: -30, y: blue ? -158 : -226, w: 96, h: blue ? 162 : 230 }, minT: blue ? 1 : 2,
  stim: [{ k: 'temp', label: 'Temperatura', unit: '°C', min: blue ? 0 : -40, max: blue ? 50 : 80, step: blue ? 1 : 0.1, def: 24 }, { k: 'hum', label: 'Humedad relativa', unit: '%', min: blue ? 20 : 0, max: blue ? 90 : 100, step: 1, def: 50 }],
  model(s, p) { const vcc = V(s, p, 0) - V(s, p, 2), vg = V(s, p, 2); p.st.ok = vcc > 3.0 && vcc < 5.6; if (!p.st.ok) { p.st.on0 = null; return; } if (p.st.on0 == null) p.st.on0 = s.t; lnk(p, 0, 2, 1 / (vcc / 4e-4)); drv(p, 1, V(s, p, 0), 1e4); },
  readout: (it, sv) => `${it.stim.temp} °C · ${it.stim.hum} % HR${statsOf(sv).ok === false ? ' · sin alimentación' : ''}`, maxV: 5.6,
  draw(it, sv) { const bw = blue ? 90 : 106, bh = blue ? 110 : 176, y0 = -40 - bh;
    const body = blue ? '#3b8fd0' : '#f0efe9', ed = blue ? '#1d5688' : '#b8b6ac';
    return `<rect x="-30" y="-42" width="96" height="40" rx="2" fill="#1c6b3a" stroke="#0e3c20"/>${smd(-4, -32, 14, 7)}${led(50, -24, statsOf(sv).ok, '#e0432f')}<text x="14" y="-12" font-size="6" fill="#bfe6cc" text-anchor="middle">${blue ? 'DHT11' : 'DHT22'}</text>
      <rect x="${18 - bw / 2}" y="${y0}" width="${bw}" height="${bh}" rx="3" fill="${body}" stroke="${ed}" stroke-width="1.4"/>${Array.from({ length: blue ? 6 : 10 }, (_, i) => `<rect x="${18 - bw / 2 + 12}" y="${y0 + 10 + i * (blue ? 11 : 11)}" width="${bw - 24}" height="5" rx="2.5" fill="${blue ? '#1d5688' : '#8f8d82'}" opacity=".55"/>`).join('')}
      <text x="18" y="${y0 + bh - 12}" font-size="${blue ? 13 : 12}" font-weight="700" text-anchor="middle" fill="${blue ? '#e8f3fc' : '#3d3d38'}">${blue ? 'DHT11' : 'DHT22'}</text>${pinsSvg(this, true, '#d7efe0', -8)}`; } });
dht('DHT11', 'Sensor DHT11 (módulo)', true); dht('DHT22', 'Sensor DHT22 (módulo)', false);

/* DS18B20 */
reg('DS18B20', { name: 'Sensor DS18B20', group: 'Sensores', desc: 'DS18B20 (1-Wire): −55 a 125 °C, ±0,5 °C, hasta 12 bits (0,0625 °C). Necesita una resistencia pull-up de 4,7 kΩ entre DQ y VDD. Sin ella, la librería devuelve −127 °C. Tras el reset da 85 °C hasta la primera conversión. Librerías OneWire y DallasTemperature.',
  pins: [{ n: 'GND', dx: 0 }, { n: 'DQ', dx: 1 }, { n: 'VDD', dx: 2 }], box: { x: -10, y: -58, w: 56, h: 62 },
  stim: [{ k: 'temp', label: 'Temperatura', unit: '°C', min: -55, max: 125, step: 0.0625, def: 25 }],
  model(s, p) { const vdd = V(s, p, 2) - V(s, p, 0), vg = V(s, p, 0); p.st.ok = vdd > 2.9 && vdd < 5.6; p.st.q = V(s, p, 1) - vg; p.st.vdd = vdd; },
  readout: (it, sv) => { const st = statsOf(sv); return `${it.stim.temp} °C${st.ok === false ? ' · sin alimentación' : ''}`; }, maxV: 5.6, draw() { return to92('DS18B20', 'GND  DQ  VDD') + pinsSvg(this, false); } });

/* HC-SR04 ultrasonidos */
reg('HCSR04', { name: 'Ultrasonidos HC-SR04', group: 'Sensores', desc: 'HC-SR04: alimentación 5 V (15 mA), alcance 2–400 cm. Un pulso de ≥10 µs en TRIG lanza 8 pulsos de 40 kHz y ECHO se pone a 1 durante 58 µs por cada cm de distancia (ida y vuelta). ECHO sale a 5 V: con ESP32 hace falta un divisor.',
  pins: [{ n: 'VCC', dx: 0 }, { n: 'TRIG', dx: 1 }, { n: 'ECHO', dx: 2 }, { n: 'GND', dx: 3 }], box: { x: -140, y: -154, w: 334, h: 158 },
  stim: [{ k: 'dist', label: 'Distancia al obstáculo', unit: 'cm', min: 0, max: 450, step: 1, def: 50 }],
  model(s, p) { const vcc = V(s, p, 0) - V(s, p, 3), vg = V(s, p, 3), t = s.t, st = p.st; st.ok = vcc > 4.4 && vcc < 5.6; if (!st.ok) { st.hi = 0; st.echoFall = 0; return; }
    lnk(p, 0, 3, 1 / (vcc / 0.015)); const trig = (V(s, p, 1) - vg) > 2.0;
    if (trig && !st.trig) st.tr = t; if (!trig && st.trig && t - st.tr >= 9e-6 && t > (st.echoFall || 0) + 0.002) { const d = p.stim.dist; st.echoRise = t + 3e-4; st.echoFall = st.echoRise + (d < 2 || d > 400 ? 0.0385 : d * 2 / 34300); st.sent = (st.sent || 0) + 1; }
    st.trig = trig; const hi = t >= (st.echoRise || 0) && t < (st.echoFall || 0); st.hi = hi ? 1 : 0; drv(p, 2, hi ? vg + 5 : vg, 60); },
  readout: (it, sv) => `Obstáculo a ${it.stim.dist} cm → eco de ${(it.stim.dist * 58.3).toFixed(0)} µs`, maxV: 5.6,
  draw(it, sv) { const st = statsOf(sv), tx = (cx) => `<circle cx="${cx}" cy="-78" r="57" fill="#9aa0a4" stroke="#5c6165" stroke-width="2"/><circle cx="${cx}" cy="-78" r="50" fill="#c9ced1"/><circle cx="${cx}" cy="-78" r="43" fill="#16191b" stroke="#4a4f52"/><circle cx="${cx}" cy="-78" r="43" fill="url(#mesh)" opacity=".7"/><circle cx="${cx}" cy="-78" r="9" fill="#2a2e31" stroke="#555"/>`;
    return `<defs><pattern id="mesh" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0,0 L5,5 M5,0 L0,5" stroke="#6a7075" stroke-width=".6"/></pattern></defs>
      <rect x="-133" y="-149" width="320" height="143" rx="3" fill="#1b5aa5" stroke="#0e3566"/>${hole(-124, -140)}${hole(178, -140)}${hole(-124, -15)}${hole(178, -15)}${tx(-55)}${tx(109)}
      <rect x="-9" y="-132" width="40" height="18" rx="9" fill="#c6ccd0" stroke="#7b8387"/><text x="11" y="-120" font-size="7" text-anchor="middle" fill="#333">40.0</text>${chip(9, -106, 34, 20, 'LM324')}${chip(9, -80, 34, 20, 'MAX232')}${smd(8, -52, 10, 6)}${smd(30, -52, 10, 6)}${led(130, -22, st.ok, '#4fb26a')}
      <text x="63" y="-25" font-size="8" font-weight="700" text-anchor="middle" fill="#e7f1fb">HC-SR04</text><text x="-4" y="-16" font-size="6.5" fill="#cfe2f5">Vcc  Trig  Echo  Gnd</text>${pinsSvg(this, false)}${st.hi ? `<g fill="none" stroke="#f2c14e" stroke-width="2"><path d="M109,-150 q16,-14 32,0"/><path d="M109,-158 q24,-22 48,0"/></g>` : ''}`; } });

/* PIR HC-SR501 */
reg('PIR', { name: 'Sensor PIR HC-SR501', group: 'Sensores', desc: 'HC-SR501: detecta movimiento de personas (infrarrojo pasivo). Alimentación 4,5–20 V, OUT a 3,3 V. Calentamiento de ≈1 min tras alimentarlo. Con el potenciómetro de tiempo, OUT permanece alto de 0,3 s a 5 min tras el último movimiento y luego se bloquea 2,5 s.',
  pins: [{ n: 'VCC', dx: 0 }, { n: 'OUT', dx: 1 }, { n: 'GND', dx: 2 }], box: { x: -100, y: -184, w: 244, h: 188 },
  stim: [{ k: 'mov', label: 'Persona en movimiento', type: 'bool', def: 0 }, { k: 'pulso', label: 'Movimiento breve (1 s)', type: 'btn' }, { k: 'hold', label: 'Tiempo de mantenimiento', unit: 's', min: 0.3, max: 120, step: 0.1, def: 3 }],
  props: [{ k: 'warm', label: 'Calentamiento', opts: ['0', '10', '60'], def: '10', fmt: v => v === '0' ? 'ninguno (rápido)' : v + ' s' + (v === '60' ? ' (real)' : '') }],
  model(s, p) { const vcc = V(s, p, 0) - V(s, p, 2), vg = V(s, p, 2), t = s.t, st = p.st; st.ok = vcc > 4.4 && vcc < 21; if (!st.ok) { st.t0 = null; st.out = 0; return; } if (st.t0 == null) st.t0 = t;
    lnk(p, 0, 2, 1 / (vcc / 65e-6)); if (p.stim.pulso) { st.until = t + 1; p.stim.pulso = 0; }
    const mov = !!p.stim.mov || t < (st.until || 0), warm = t - st.t0 >= (+p.o.warm || 0);
    if (warm && mov && t >= (st.block || 0)) { st.out = 1; st.last = t; } else if (st.out && t - (st.last || 0) >= (p.stim.hold || 3)) { st.out = 0; st.block = t + 2.5; }
    st.mov = mov; st.warm = warm; drv(p, 1, st.out ? vg + 3.3 : vg, 100); },
  readout: (it, sv) => { const st = statsOf(sv); return st.ok === false ? 'sin alimentación' : !st.warm ? 'calentando…' : st.out ? 'OUT = 1 (movimiento)' : 'OUT = 0'; }, maxV: 21,
  draw(it, sv) { const st = statsOf(sv), a = st.out;
    return `<rect x="-95" y="-178" width="234" height="172" rx="4" fill="#2c7a3e" stroke="#154a22"/>${hole(-86, -168)}${hole(130, -168)}${hole(-86, -16)}${hole(130, -16)}
      <circle cx="22" cy="-98" r="66" fill="#d9d8d0" stroke="#9a998f" stroke-width="2"/><circle cx="22" cy="-98" r="60" fill="#f5f4ee" stroke="#c9c8bf"/>${Array.from({ length: 8 }, (_, i) => `<path d="M22,-98 L${22 + 60 * Math.cos(i * Math.PI / 4)},${-98 + 60 * Math.sin(i * Math.PI / 4)}" stroke="#c7c6bb" stroke-width="1.2"/>`).join('')}<circle cx="22" cy="-98" r="24" fill="none" stroke="#c7c6bb"/><circle cx="22" cy="-98" r="${a ? 12 : 6}" fill="${a ? '#f2c14e' : '#e6e5dc'}" opacity="${a ? .8 : .6}"/>
      ${trimmer(-70, -48, 20 + (it.stim.hold / 120) * 260).replace(/#2f66b3/g, '#e2a526').replace(/#18407a/g, '#8a6212')}${trimmer(114, -48, 140).replace(/#2f66b3/g, '#e2a526').replace(/#18407a/g, '#8a6212')}
      ${chip(-14, -34, 30, 16, 'BISS0001')}${smd(26, -30, 10, 6)}${smd(42, -30, 10, 6)}${led(86, -26, st.ok, '#4fb26a')}<text x="-34" y="-8" font-size="6" fill="#d7efde" text-anchor="middle">Tx</text><text x="94" y="-8" font-size="6" fill="#d7efde" text-anchor="middle">Sx</text>
      <rect x="-14" y="-4" width="70" height="2" fill="#d7efde" opacity="0"/>${pinsSvg(this, true, '#eaf8ee', -10)}`; } });

/* Módulos con comparador LM393 (AO analógica y DO digital con umbral ajustable) */
const lm393 = (kind, name, desc, o) => reg(kind, { name, group: 'Sensores', desc, pins: [{ n: 'VCC', dx: 0 }, { n: 'GND', dx: 1 }, { n: 'DO', dx: 2 }, { n: 'AO', dx: 3 }], box: { x: -80, y: o.top, w: 244, h: -o.top + 4 },
  stim: o.stim.concat([{ k: 'thr', label: 'Umbral (potenciómetro azul)', unit: '%', min: 0, max: 100, step: 1, def: 50 }]), props: o.props,
  model(s, p) { const vcc = V(s, p, 0) - V(s, p, 1), vg = V(s, p, 1), st = p.st; st.ok = vcc > 3.0 && vcc < 5.6; if (!st.ok) return; lnk(p, 0, 1, 1 / (vcc / o.i(p)));
    const r = o.src(p, st, s.t), Rs = r.Rs, Rl = r.Rl; const ao = vcc * (r.top ? Rl / (Rs + Rl) : Rs / (Rs + Rl)); st.ao = ao; drv(p, 3, vg + ao, Rs * Rl / (Rs + Rl)); const thr = vcc * (p.stim.thr / 100);
    const on = st.do ? ao > thr - 0.02 * vcc : ao > thr + 0.02 * vcc; st.do = o.invert ? (ao > thr ? 0 : 1) : on ? 1 : 0; drv(p, 2, st.do ? vg + vcc : vg, st.do ? 1e4 : 250); },
  readout: (it, sv) => { const st = statsOf(sv); return st.ok === false ? 'sin alimentación' : o.read(it, st); }, maxV: 5.6,
  draw(it, sv) { const st = statsOf(sv); return `<rect x="-76" y="-124" width="236" height="118" rx="3" fill="#1d5fb0" stroke="#0f3a72"/>${hole(-66, -114)}${hole(150, -114)}${hole(-66, -16)}${hole(150, -16)}${trimmer(96, -78, 20 + it.stim.thr * 2.6)}${chip(40, -116, 36, 20)}${smd(16, -52, 12, 6)}${smd(34, -52, 12, 6)}${smd(52, -52, 12, 6)}${led(26, -26, st.ok, '#e0432f')}${led(46, -26, st.do && st.ok, '#e0432f')}<text x="26" y="-14" font-size="5.5" fill="#d9e8f8" text-anchor="middle">PWR</text><text x="46" y="-14" font-size="5.5" fill="#d9e8f8" text-anchor="middle">DO</text><text x="118" y="-26" font-size="6" fill="#d9e8f8" text-anchor="middle">LM393</text>${o.art(it, sv, st)}${pinsSvg(this, true, '#eaf2fb', -9)}`; } });

lm393('SOIL', 'Humedad de suelo (FC-28)', 'Módulo FC-28 con sonda resistiva y comparador LM393. AO sube cuando el suelo está seco (≈Vcc) y baja al mojarlo. DO se activa con el umbral del potenciómetro. Consumo ≈5 mA. Alimentación 3,3–5 V.',
  { top: -330, i: () => 5e-3, props: [], stim: [{ k: 'hum', label: 'Humedad del suelo', unit: '%', min: 0, max: 100, step: 1, def: 35 }],
    src: (p) => ({ Rs: clamp(1e3 * Math.pow(100 / Math.max(p.stim.hum, 0.5), 2.5), 800, 5e6), Rl: 1e4, top: false }), read: (it, st) => `Suelo al ${it.stim.hum} % · AO = ${st.ao.toFixed(2)} V · DO = ${st.do}`,
    art: (it, sv, st) => { const w = it.stim.hum / 100; return `<path d="M-6,-124 C-30,-160 -40,-190 -40,-200 M58,-124 C70,-160 60,-190 52,-200" fill="none" stroke="#2a2a2a" stroke-width="3"/><path d="M-46,-206 h112 v-8 h-112 z" fill="#1a1a1a"/><rect x="-44" y="-322" width="108" height="116" rx="4" fill="#2b2b27" stroke="#0e0e0c"/><rect x="-36" y="-312" width="33" height="98" fill="${w > .02 ? '#4a3a22' : '#b9902e'}" stroke="#7a5f1a"/><rect x="23" y="-312" width="33" height="98" fill="${w > .02 ? '#4a3a22' : '#b9902e'}" stroke="#7a5f1a"/><rect x="-36" y="${-214 - 98 * w}" width="33" height="${98 * w}" fill="#2a1f12" opacity=".75"/><rect x="23" y="${-214 - 98 * w}" width="33" height="${98 * w}" fill="#2a1f12" opacity=".75"/><text x="10" y="-292" font-size="8" font-weight="700" fill="#e6d49a" text-anchor="middle">SOIL</text>`; } });
lm393('MQ2', 'Gas y humo MQ-2', 'MQ-2: sensor de gas combustible y humo (LPG, propano, humo). Calentador de ≈150 mA (33 Ω) y ≈20 s de precalentamiento; en aire limpio Rs ≈ 10·R0. Rs/R0 ≈ 3,5·(ppm/100)^−0,45. AO = Vcc·RL/(Rs+RL), con RL = 5 kΩ.',
  { top: -160, i: () => 0.15, props: [], stim: [{ k: 'ppm', label: 'Concentración de gas', unit: 'ppm', min: 10, max: 10000, def: 10, log: true }],
    src: (p, st, t) => { st.t0 = st.t0 == null ? t : st.t0; const warm = clamp((t - st.t0) / 20, 0, 1), ratio = Math.min(9.8, 3.5 * Math.pow(Math.max(p.stim.ppm, 1) / 100, -0.45)); st.warm = warm; return { Rs: 1e4 * ratio * (0.35 + 0.65 * warm), Rl: 5e3, top: true }; }, read: (it, st) => `${it.stim.ppm} ppm · AO = ${st.ao.toFixed(2)} V · DO = ${st.do}${st.warm < 1 ? ' · calentando' : ''}`,
    art: (it, sv, st) => `<circle cx="-18" cy="-70" r="40" fill="#b9bdc0" stroke="#6a6e71" stroke-width="2"/><circle cx="-18" cy="-70" r="35" fill="#8f9498"/><circle cx="-18" cy="-70" r="33" fill="url(#mq)" /><defs><pattern id="mq" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#a9aeb2"/><path d="M0,0 L4,4 M4,0 L0,4" stroke="#5f6468" stroke-width=".7"/></pattern></defs><circle cx="-18" cy="-70" r="40" fill="none" stroke="#d7dadc" stroke-width="1"/><text x="-18" y="-66" font-size="9" font-weight="700" text-anchor="middle" fill="#fff" stroke="#333" stroke-width=".3">MQ-2</text>${(st.warm || 0) > 0 && (st.warm || 0) < 1 ? '<circle cx="-18" cy="-70" r="46" fill="none" stroke="#f08a3c" stroke-width="2" opacity=".6"/>' : ''}` });
lm393('FLAME', 'Llama (IR, KY-026)', 'Sensor de llama por infrarrojos (760–1100 nm) con fototransistor. AO baja al acercar una llama; DO pasa a 0 al superar el umbral. Consumo ≈15 mA.',
  { top: -150, i: () => 0.015, invert: true, props: [], stim: [{ k: 'f', label: 'Intensidad de llama', unit: '%', min: 0, max: 100, step: 1, def: 0 }],
    src: (p) => ({ Rs: 1e4 * (1 + 0.1 * (1 - p.stim.f / 100)) , Rl: 1e4 * (0.04 + 0.96 * (1 - p.stim.f / 100)), top: false }), read: (it, st) => `Llama al ${it.stim.f} % · AO = ${st.ao.toFixed(2)} V · DO = ${st.do}`,
    art: (it, sv, st) => `<path d="M-52,-120 L-52,-150 A14,14 0 0 1 -24,-150 L-24,-120 Z" fill="#0f0f10" stroke="#000"/><ellipse cx="-38" cy="-150" rx="14" ry="10" fill="#1a1a1c" stroke="#333"/><ellipse cx="-41" cy="-153" rx="5" ry="3" fill="#fff" opacity=".25"/><text x="-38" y="-100" font-size="6.5" fill="#d9e8f8" text-anchor="middle">IR</text>${it.stim.f > 3 ? `<path d="M-62,-186 q-4,-14 6,-24 q2,12 12,16 q4,-8 0,-18 q16,10 12,28 q-6,10 -18,10 q-12,0 -12,-12z" fill="#f08a3c" opacity="${.4 + it.stim.f / 170}"/>` : ''}` });

/* ---------- actuadores ---------- */
reg('SERVO', { name: 'Servomotor SG90', group: 'Actuadores', desc: 'SG90: 4,8–6 V, pulso de 0,5 a 2,4 ms cada 20 ms (≈544–2400 µs ⇒ 0–180°), 0,1 s/60°. Consumo: ≈10 mA parado, ≈200 mA en movimiento, 650 mA bloqueado. Cable: marrón GND, rojo VCC, naranja señal. Librería Servo.h.',
  group: 'Actuadores', pins: [{ n: 'GND', dx: 0 }, { n: 'VCC', dx: 1 }, { n: 'SIG', dx: 2 }], box: { x: -90, y: -258, w: 270, h: 262 }, stim: [],
  model(s, p) { const vcc = V(s, p, 1) - V(s, p, 0), vg = V(s, p, 0), t = s.t, st = p.st, dt = s.dt; st.ok = vcc > 3.8; if (st.ang == null) { st.ang = 90; st.target = 90; } if (!st.ok) return;
    const sig = (V(s, p, 2) - vg) > 1.6; if (sig && !st.sig) st.tr = t; if (!sig && st.sig) { const w = t - st.tr; if (w > 0.0004 && w < 0.0026) { st.target = clamp((w - 0.000544) / (0.0024 - 0.000544) * 180, 0, 180); st.pw = w; st.lastP = t; } } st.sig = sig;
    const d = st.target - st.ang, mv = Math.abs(d) > 0.4; if (mv) st.ang += Math.sign(d) * Math.min(Math.abs(d), 500 * dt * clamp(vcc / 4.8, 0.6, 1.3)); st.moving = mv;
    lnk(p, 1, 0, 1 / (vcc / (mv ? 0.2 : 0.01))); },
  readout: (it, sv) => { const st = statsOf(sv); return st.ok === false ? 'sin alimentación (VCC ≥ 4 V)' : st.pw ? `${st.ang.toFixed(0)}° · pulso ${(st.pw * 1e6).toFixed(0)} µs` : `${(st.ang == null ? 90 : st.ang).toFixed(0)}° · sin señal`; }, maxV: 7.2,
  draw(it, sv) { const st = statsOf(sv), ang = st.ang == null ? 90 : st.ang, X = 45;
    return `<path d="M0,0 C0,-60 -20,-70 -20,-130 M${P},0 C${P},-60 ${P - 4},-70 ${P - 4},-130 M${2 * P},0 C${2 * P},-60 ${2 * P + 14},-70 ${2 * P + 14},-130" fill="none" stroke="#7b4a24" stroke-width="3.2"/><path d="M${P},0 C${P},-60 ${P - 4},-70 ${P - 4},-130" fill="none" stroke="#c0322a" stroke-width="3.2"/><path d="M${2 * P},0 C${2 * P},-60 ${2 * P + 14},-70 ${2 * P + 14},-130" fill="none" stroke="#e8892b" stroke-width="3.2"/>
      <rect x="-30" y="-134" width="64" height="12" rx="2" fill="#222" stroke="#000"/><rect x="${X - 90}" y="-215" width="180" height="86" rx="4" fill="#2e6fc0" stroke="#173f78"/><rect x="${X - 112}" y="-170" width="224" height="12" rx="2" fill="#2e6fc0" stroke="#173f78"/><circle cx="${X - 103}" cy="-164" r="4" fill="#0f2a50"/><circle cx="${X + 103}" cy="-164" r="4" fill="#0f2a50"/>
      <rect x="${X - 64}" y="-232" width="62" height="20" rx="3" fill="#2e6fc0" stroke="#173f78"/><circle cx="${X + 30}" cy="-222" r="26" fill="#2a63b0" stroke="#173f78"/><circle cx="${X + 30}" cy="-222" r="12" fill="#cfd3d6" stroke="#7b8084"/><text x="${X - 50}" y="-150" font-size="10" font-weight="700" fill="#dbe9fb">SG90</text><text x="${X - 50}" y="-138" font-size="6" fill="#bcd3f0">9g Micro Servo</text>
      <g transform="rotate(${180 - ang} ${X + 30} -222)"><path d="M${X + 30},-228 L${X - 98},-224 Q${X - 108},-222 ${X - 98},-220 L${X + 30},-216 Z" fill="#f4f2ea" stroke="#9a9a90"/><circle cx="${X - 90}" cy="-222" r="2" fill="#555"/><circle cx="${X - 70}" cy="-222" r="2" fill="#555"/><circle cx="${X + 30}" cy="-222" r="7" fill="#e4e1d6" stroke="#8c8c82"/></g>${pinsSvg(this, true, '#fff', 14).replace(/y="-9"/g, 'y="16"')}`; } });

reg('BUZZ', { name: 'Zumbador activo 5 V', group: 'Actuadores', desc: 'Zumbador activo: lleva oscilador interno y suena (≈2,3 kHz) al darle 3–5 V con la polaridad correcta (+ en la patilla larga). ≈30 mA. Con una salida de Arduino (máx. 40 mA) vale directamente.',
  pins: [{ n: '+', dx: 0 }, { n: '−', dx: 3 }], box: { x: -26, y: -96, w: 106, h: 100 }, stim: [], props: [{ k: 'snd', label: 'Sonido', opts: ['sí', 'no'], def: 'sí' }],
  model(s, p) { const vd = V(s, p, 0) - V(s, p, 1), st = p.st; const on = vd > 2.4 && vd < 6; st.f = on ? 2300 : 0; lnk(p, 0, 1, on ? 1 / 150 : 1 / 1e6); },
  readout: (it, sv) => statsOf(sv).f ? 'Sonando (2300 Hz)' : 'Silencio', maxV: 6.5,
  draw(it, sv) { const on = statsOf(sv).f > 0; return `<path d="M0,0 L0,-30 M${3 * P},0 L${3 * P},-30" stroke="#aeb2b6" stroke-width="2.6"/><ellipse cx="27" cy="-34" rx="42" ry="8" fill="#0b0b0c"/><rect x="-15" y="-86" width="84" height="52" fill="#151617" stroke="#000"/><ellipse cx="27" cy="-86" rx="42" ry="10" fill="#1d1f21" stroke="#000"/><ellipse cx="27" cy="-86" rx="12" ry="3.2" fill="#050505"/><text x="-5" y="-66" font-size="13" font-weight="700" fill="#d8d8d0">+</text><rect x="14" y="-62" width="26" height="14" rx="2" fill="#e6e1d0" opacity=".9"/><text x="27" y="-52" font-size="6" font-weight="700" text-anchor="middle" fill="#444">5V</text>${on ? '<g fill="none" stroke="#f2c14e" stroke-width="2" opacity=".85"><path d="M74,-80 q10,10 0,20"/><path d="M82,-88 q16,18 0,36"/><path d="M-20,-80 q-10,10 0,20"/><path d="M-28,-88 q-16,18 0,36"/></g>' : ''}`; } });
reg('BUZZP', { name: 'Zumbador pasivo', group: 'Actuadores', desc: 'Zumbador pasivo (magnético, ≈100 Ω): no tiene oscilador; suena con la frecuencia de la señal que recibe (tone() o PWM). Con corriente continua solo da un clic.',
  pins: [{ n: '+', dx: 0 }, { n: '−', dx: 3 }], box: { x: -26, y: -96, w: 106, h: 100 }, stim: [], props: [{ k: 'snd', label: 'Sonido', opts: ['sí', 'no'], def: 'sí' }],
  model(s, p) { const vd = V(s, p, 0) - V(s, p, 1), st = p.st, t = s.t; lnk(p, 0, 1, 1 / 100); st.mx = Math.max(st.mx || 0, Math.abs(vd)); const hi = vd > st.mx * 0.5 && st.mx > 1; if (hi && !st.hi) st.n = (st.n || 0) + 1; st.hi = hi; if (st.w0 == null) st.w0 = t; if (t - st.w0 >= 0.05) { st.f = st.mx > 1 ? Math.round(st.n / (t - st.w0) / 10) * 10 : 0; st.n = 0; st.mx = 0; st.w0 = t; } },
  readout: (it, sv) => statsOf(sv).f > 20 ? `Sonando a ${statsOf(sv).f} Hz` : 'Silencio', maxV: 6.5,
  draw(it, sv) { const on = statsOf(sv).f > 20; return `<path d="M0,0 L0,-30 M${3 * P},0 L${3 * P},-30" stroke="#aeb2b6" stroke-width="2.6"/><ellipse cx="27" cy="-34" rx="42" ry="8" fill="#0b0b0c"/><rect x="-15" y="-84" width="84" height="50" fill="#151617" stroke="#000"/><ellipse cx="27" cy="-84" rx="42" ry="10" fill="#1d1f21" stroke="#000"/><ellipse cx="27" cy="-84" rx="9" ry="2.6" fill="#050505"/><text x="-5" y="-64" font-size="13" font-weight="700" fill="#d8d8d0">+</text>${on ? '<g fill="none" stroke="#f2c14e" stroke-width="2" opacity=".85"><path d="M74,-80 q10,10 0,20"/><path d="M82,-88 q16,18 0,36"/><path d="M-20,-80 q-10,10 0,20"/><path d="M-28,-88 q-16,18 0,36"/></g>' : ''}`; } });

reg('RELAY', { name: 'Módulo relé 1 canal 5 V', group: 'Actuadores', desc: 'Relé SRD-05VDC con optoacoplador, activo con nivel BAJO en IN (jumper). Bobina ≈70 mA a 5 V (alimentar de la fuente, no de un pin). Contactos COM–NO (abre en reposo) y COM–NC (cierra en reposo), 10 A/250 V. Tarda ≈10 ms en conmutar.',
  pins: [{ n: 'VCC', dx: 0 }, { n: 'GND', dx: 1 }, { n: 'IN', dx: 2 }, { n: 'NC', dx: 4 }, { n: 'COM', dx: 5 }, { n: 'NO', dx: 6 }], box: { x: -50, y: -196, w: 370, h: 200 }, stim: [], props: [{ k: 'act', label: 'Se activa con', opts: ['bajo', 'alto'], def: 'bajo' }],
  model(s, p) { const vcc = V(s, p, 0) - V(s, p, 1), vg = V(s, p, 1), t = s.t, st = p.st, vin = V(s, p, 2); st.ok = vcc > 3.8 && vcc < 6.5; if (!st.ok) { st.coil = 0; st.pos = 0; return; }
    const low = p.o.act !== 'alto'; if (low) lnk(p, 0, 2, 1 / 1000); else lnk(p, 2, 1, 1 / 3300); const cmd = low ? (V(s, p, 0) - vin) > 2.2 : (vin - vg) > 2.0;
    if (cmd !== !!st.coil) { st.coil = cmd ? 1 : 0; st.tc = t; } if (st.pos !== st.coil && t - st.tc > 0.01) st.pos = st.coil; if (st.pos == null) st.pos = 0;
    lnk(p, 0, 1, 1 / (vcc / (st.coil ? 0.07 : 0.004))); lnk(p, 3, 4, st.pos ? 1e-9 : 1 / 0.05); lnk(p, 4, 5, st.pos ? 1 / 0.05 : 1e-9); },
  readout: (it, sv) => { const st = statsOf(sv); return st.ok === false ? 'sin alimentación' : st.pos ? 'Relé activado: COM–NO cerrado' : 'Reposo: COM–NC cerrado'; }, maxV: 6.5,
  draw(it, sv) { const st = statsOf(sv), on = st.pos, chk = st.ok;
    return `<rect x="-46" y="-190" width="362" height="184" rx="4" fill="#1b5aa5" stroke="#0e3566"/>${hole(-36, -180)}${hole(306, -180)}${hole(-36, -16)}${hole(306, -16)}
      <rect x="120" y="-176" width="136" height="112" rx="3" fill="#1f56d8" stroke="#0e2e82"/><rect x="128" y="-168" width="120" height="96" rx="2" fill="#2a63e6" opacity=".6"/><text x="188" y="-130" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">SRD-05VDC-SL-C</text><text x="188" y="-114" font-size="7" text-anchor="middle" fill="#dbe6ff">10A 250VAC 10A 30VDC</text><text x="188" y="-100" font-size="7" text-anchor="middle" fill="#dbe6ff">${on ? '● ACTIVADO' : '○ REPOSO'}</text>
      <rect x="62" y="-72" width="70" height="52" rx="2" fill="#2d7fe0" stroke="#124c93"/>${[0, 1, 2].map(i => `<circle cx="${72 + i * 22}" cy="-52" r="8" fill="#cfd3d6" stroke="#7b8084"/><line x1="${66 + i * 22}" y1="-52" x2="${78 + i * 22}" y2="-52" stroke="#555" stroke-width="2"/>`).join('')}<text x="72" y="-30" font-size="6.5" font-weight="700" fill="#fff" text-anchor="middle">NC</text><text x="94" y="-30" font-size="6.5" font-weight="700" fill="#fff" text-anchor="middle">COM</text><text x="116" y="-30" font-size="6.5" font-weight="700" fill="#fff" text-anchor="middle">NO</text>
      ${chip(-18, -170, 34, 20, 'PC817')}${smd(-18, -130, 10, 6)}${smd(-2, -130, 10, 6)}${smd(14, -130, 10, 6)}${led(-10, -110, chk, '#4fb26a')}${led(30, -110, on, '#e0432f')}<text x="-10" y="-98" font-size="5.5" fill="#d9e8f8" text-anchor="middle">PWR</text><text x="30" y="-98" font-size="5.5" fill="#d9e8f8" text-anchor="middle">RELÉ</text>
      <text x="270" y="-30" font-size="9" font-weight="700" fill="#e4eefb">1 CH RELAY 5V</text>${pinsSvg(this, true, '#eaf2fb', -10)}`; } });

reg('MOTOR', { name: 'Motor DC (130)', group: 'Actuadores', desc: 'Miniotor DC tipo 130 (3–6 V): R ≈ 2,5 Ω, Ke = Kt = 5 mV·s/rad. Arranca con ≈2 A y gira en vacío ≈11 000 rpm a 6 V (≈100 mA). Sin diodo de rueda libre no se simula el pico inductivo. No lo conectes directo a un pin: usa un transistor o un driver.',
  pins: [{ n: 'M+', dx: 0 }, { n: 'M−', dx: 1 }], box: { x: -30, y: -176, w: 220, h: 180 }, stim: [],
  model(s, p) { const st = p.st, R = 2.5, Ke = 0.005, g = 1 / R; if (st.w == null) { st.w = 0; st.ang = 0; } const v = V(s, p, 0) - V(s, p, 1), i = (v - Ke * st.w) * g;
    lnk(p, 0, 1, g, g * Ke * st.w); st.i = i; const J = 2e-7, b = 4.4e-7, tau = Ke * i - b * st.w - (Math.abs(st.w) > 1 ? Math.sign(st.w) * 1e-4 : 0); st.w += tau / J * s.dt * (Math.abs(st.w) < 1 && Math.abs(Ke * i) < 1.2e-4 ? 0 : 1); if (!isFinite(st.w)) st.w = 0; },
  readout: (it, sv) => { const st = statsOf(sv); return `${((st.w || 0) * 60 / (2 * Math.PI)).toFixed(0)} rpm · ${((st.i || 0) * 1000).toFixed(0)} mA`; }, maxV: 9,
  draw(it, sv) { const st = statsOf(sv), a = st.ang || 0; return `<path d="M0,0 C0,-50 -10,-60 -10,-110 M${P},0 C${P},-50 ${P + 6},-60 ${P + 6},-110" fill="none" stroke="#c0322a" stroke-width="3"/><path d="M${P},0 C${P},-50 ${P + 6},-60 ${P + 6},-110" fill="none" stroke="#1f2421" stroke-width="3"/><path d="M0,0 C0,-50 -10,-60 -10,-110" fill="none" stroke="#c0322a" stroke-width="3"/>
      <rect x="-24" y="-176" width="128" height="68" rx="30" fill="#b9bec2" stroke="#6a6f73" stroke-width="1.5"/><rect x="-24" y="-176" width="128" height="68" rx="30" fill="url(#mt)"/><defs><linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>
      <rect x="-24" y="-156" width="26" height="28" fill="#7a7f83"/><rect x="104" y="-148" width="12" height="12" fill="#e0b84a" stroke="#8a6d17"/><rect x="116" y="-144" width="40" height="4" fill="#c9ccc9" stroke="#777"/><text x="40" y="-137" font-size="10" font-weight="700" text-anchor="middle" fill="#3a3e41">RF-130</text>
      <g transform="translate(176 -142)"><circle r="21" fill="#e9e6d9" opacity=".25" stroke="#bbb"/><g transform="rotate(${a})"><ellipse cx="0" cy="-12" rx="4" ry="12" fill="#c0322a"/><ellipse cx="0" cy="12" rx="4" ry="12" fill="#c0322a"/><circle r="4" fill="#555"/></g></g>${pinsSvg(this, true, '#fff', 14).replace(/y="-9"/g, 'y="16"')}`; } });

/* LED RGB de 5 mm (se simula con tres LED reales) */
reg('RGB', { name: 'LED RGB 5 mm', group: 'Actuadores', desc: 'LED RGB de cátodo común: patillas R, GND (la más larga), G, B. Cada color necesita su resistencia (220 Ω a 5 V). Con analogWrite() se mezclan los colores. Rojo ≈2 V, verde ≈3 V, azul ≈3 V.',
  pins: [{ n: 'R', dx: 0 }, { n: 'K', dx: 1 }, { n: 'G', dx: 2 }, { n: 'B', dx: 3 }], box: { x: -20, y: -90, w: 94, h: 94 }, stim: [], rgb: true, props: [{ k: 'tipo', label: 'Tipo', opts: ['cátodo común', 'ánodo común'], def: 'cátodo común' }],
  readout: (it, sv) => 'LED RGB', maxV: 9,
  draw(it, sv) { const ls = (sv && sv.leds) || [0, 0, 0], r = ls[0], g = ls[1], b = ls[2], c = `rgb(${Math.round(60 + 195 * r)},${Math.round(60 + 195 * g)},${Math.round(60 + 195 * b)})`, on = r + g + b > .05;
    return `<path d="M0,0 L0,-34 M${P},0 L${P},-40 M${2 * P},0 L${2 * P},-34 M${3 * P},0 L${3 * P},-34" stroke="#aeb2b6" stroke-width="2.6"/>${on ? `<circle cx="27" cy="-62" r="${34 + 12 * (r + g + b) / 3}" fill="${c}" opacity=".22"/>` : ''}<path d="M3,-34 A24,24 0 1 1 51,-34 Z" transform="translate(0 -4)" fill="${c}" opacity="${on ? .95 : .5}" stroke="#555" stroke-width="1"/><rect x="1" y="-40" width="52" height="6" rx="2" fill="#d6d3c8" opacity=".85" stroke="#888" stroke-width=".6"/><ellipse cx="18" cy="-76" rx="7" ry="4" fill="#fff" opacity=".5"/>${pinsSvg(this, true, '#fff', 14).replace(/y="-9"/g, 'y="16"')}`; } });
CAT.RGB.pins.forEach(() => 0);


/* ---------- dispositivos de bus: I²C (BMP280, MPU6050, SSD1306) y SPI (MCP3008) ---------- */
const ROWYS = { j: 100, i: 118, h: 136, g: 154, f: 172, e: 214, d: 232, c: 250, b: 268, a: 286 }, ROWSS = ['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
const hiDy = (it) => { const r = it.r === undefined ? 5 : it.r; return ROWYS[ROWSS[r - 1]] - ROWYS[ROWSS[r]]; };
const pwr = (p, s, v, g, lo, hi, i) => { const vc = V(s, p, v) - V(s, p, g); p.st.vcc = vc; p.st.ok = vc > lo && vc < hi && p.pins[g] === 0; if (p.st.ok) lnk(p, v, g, 1 / (vc / i)); return p.st.ok; };
const bus = (p, s, sda, scl) => { if (p.st.ok) { drv(p, sda, V(s, p, 0), 4700); drv(p, scl, V(s, p, 0), 4700); } };

reg('BMP280', { name: 'Presión BMP280 (I²C)', group: 'Sensores', i2c: { vcc: 0, gnd: 1, scl: 2, sda: 3 },
  desc: 'BMP280: presión 300–1100 hPa (±1 hPa) y temperatura −40…85 °C (±1 °C). Módulo GY-BMP280 con pull-ups: VCC, GND, SCL, SDA, CSB (déjalo sin conectar para I²C) y SDO (a GND = 0x76, a VCC = 0x77). Librería Adafruit_BMP280. En Arduino UNO: SDA = A4, SCL = A5; en ESP32-S3: SDA = GPIO8, SCL = GPIO9.',
  pins: [{ n: 'VCC', dx: 0 }, { n: 'GND', dx: 1 }, { n: 'SCL', dx: 2 }, { n: 'SDA', dx: 3 }, { n: 'CSB', dx: 4 }, { n: 'SDO', dx: 5 }], box: { x: -14, y: -66, w: 126, h: 70 },
  stim: [{ k: 'temp', label: 'Temperatura', unit: '°C', min: -40, max: 85, step: 0.1, def: 22 }, { k: 'pres', label: 'Presión', unit: 'hPa', min: 300, max: 1100, step: 0.5, def: 1013 }],
  model(s, p) { if (!pwr(p, s, 0, 1, 1.7, 5.6, 2e-5)) return; lnk(p, 5, 1, 1 / 1e5); drv(p, 4, V(s, p, 0), 1e4); bus(p, s, 3, 2); p.st.addr = (V(s, p, 5) - V(s, p, 1)) > 0.5 * p.st.vcc ? 0x77 : 0x76; },
  readout: (it, sv) => { const st = statsOf(sv); const alt = 44330 * (1 - Math.pow(it.stim.pres / 1013.25, 1 / 5.255)); return (st.ok === false ? 'sin alimentación válida (1,8–5,5 V y GND a masa)\n' : st.addr ? 'dirección I²C 0x' + st.addr.toString(16) + '\n' : '') + `${it.stim.temp} °C · ${it.stim.pres} hPa · altitud ≈ ${alt.toFixed(0)} m`; }, maxV: 5.6,
  draw(it, sv) { const st = statsOf(sv); return `<rect x="-14" y="-62" width="126" height="56" rx="3" fill="#6a3fa0" stroke="#3d2260"/>${hole(-4, -52)}${hole(102, -52)}<rect x="22" y="-52" width="22" height="22" rx="2" fill="#c9ccce" stroke="#6c7073"/><circle cx="29" cy="-45" r="2.4" fill="#2b2f33"/><rect x="22" y="-52" width="22" height="22" rx="2" fill="none" stroke="#fff" stroke-opacity=".5"/>${smd(56, -48, 10, 6)}${smd(56, -38, 10, 6)}${chip(66, -52, 26, 14, '3V3')}${led(86, -24, st.ok, '#e0432f', 3)}<text x="10" y="-22" font-size="9" font-weight="700" fill="#efe6fb">BMP280</text>${pinsSvg(this, true, '#efe6fb', -9)}`; } });

reg('MPU6050', { name: 'Acelerómetro + giroscopio MPU-6050', group: 'Sensores', i2c: { vcc: 0, gnd: 1, scl: 2, sda: 3 },
  desc: 'MPU-6050 (módulo GY-521): acelerómetro ±2/4/8/16 g y giroscopio ±250…2000 °/s de 16 bits, y termómetro. Dirección 0x68 (AD0 sin conectar o a GND) o 0x69 (AD0 a VCC). Tras el arranque está en reposo: hay que escribir 0 en el registro 0x6B (PWR_MGMT_1). Alimentación 3,3–5 V. Librería Adafruit_MPU6050 o acceso directo con Wire. SDA = A4 y SCL = A5 en el UNO; GPIO8/GPIO9 en el ESP32-S3.',
  pins: [{ n: 'VCC', dx: 0 }, { n: 'GND', dx: 1 }, { n: 'SCL', dx: 2 }, { n: 'SDA', dx: 3 }, { n: 'XDA', dx: 4 }, { n: 'XCL', dx: 5 }, { n: 'AD0', dx: 6 }, { n: 'INT', dx: 7 }], box: { x: -14, y: -116, w: 170, h: 120 },
  stim: [{ k: 'roll', label: 'Inclinación alrededor de X (alabeo)', unit: '°', min: -90, max: 90, step: 1, def: 0 }, { k: 'pitch', label: 'Inclinación alrededor de Y (cabeceo)', unit: '°', min: -90, max: 90, step: 1, def: 0 }, { k: 'gx', label: 'Velocidad de giro X', unit: '°/s', min: -250, max: 250, step: 1, def: 0 }, { k: 'gy', label: 'Velocidad de giro Y', unit: '°/s', min: -250, max: 250, step: 1, def: 0 }, { k: 'gz', label: 'Velocidad de giro Z', unit: '°/s', min: -250, max: 250, step: 1, def: 0 }, { k: 'temp', label: 'Temperatura del chip', unit: '°C', min: -40, max: 85, step: 0.5, def: 25 }],
  model(s, p) { if (!pwr(p, s, 0, 1, 2.8, 5.6, 0.0039)) return; lnk(p, 6, 1, 1 / 4700); bus(p, s, 3, 2); p.st.addr = (V(s, p, 6) - V(s, p, 1)) > 0.5 * p.st.vcc ? 0x69 : 0x68; },
  readout: (it, sv) => { const st = statsOf(sv), q = it.stim, r = Math.PI / 180, ax = Math.sin(q.pitch * r), ay = -Math.sin(q.roll * r) * Math.cos(q.pitch * r), az = Math.cos(q.roll * r) * Math.cos(q.pitch * r); return (st.ok === false ? 'sin alimentación válida (3–5,5 V y GND a masa)\n' : st.addr ? 'dirección I²C 0x' + st.addr.toString(16) + (st.sleep === false ? ' · activo' : ' · en reposo (escribe 0 en 0x6B)') + '\n' : '') + `a = (${ax.toFixed(2)}, ${ay.toFixed(2)}, ${az.toFixed(2)}) g\nω = (${q.gx}, ${q.gy}, ${q.gz}) °/s · ${q.temp} °C`; }, maxV: 5.6,
  draw(it, sv) { const st = statsOf(sv), a = it.stim; return `<rect x="-14" y="-110" width="170" height="104" rx="3" fill="#2b5fb8" stroke="#163a78"/>${hole(-4, -100)}${hole(146, -100)}
      <rect x="36" y="-92" width="34" height="34" rx="2" fill="#15171a" stroke="#000"/><circle cx="43" cy="-85" r="2" fill="#777"/><text x="53" y="-72" font-size="6.5" font-weight="700" text-anchor="middle" fill="#8a8f93">MPU</text><text x="53" y="-64" font-size="6.5" text-anchor="middle" fill="#8a8f93">6050</text>
      ${smd(84, -90, 12, 7)}${smd(84, -78, 12, 7)}${smd(104, -90, 12, 7)}${chip(100, -66, 30, 16, '662K')}${led(20, -30, st.ok, '#e0432f', 3)}<g transform="translate(112 -100)"><line x1="0" y1="0" x2="20" y2="0" stroke="#fff" stroke-width="1.4"/><line x1="0" y1="0" x2="0" y2="-0.1" stroke="#fff"/></g>
      <text x="30" y="-22" font-size="11" font-weight="700" fill="#e7f0fc">GY-521</text><g stroke="#fff" stroke-width="1.2" transform="translate(112 -50) rotate(${-(a.roll || 0)})" opacity=".7"><path d="M-10,0 H10 M0,-8 V8"/></g>${pinsSvg(this, true, '#e7f0fc', -9)}`; } });

reg('OLED', { name: 'Pantalla OLED 128×64 (I²C)', group: 'Actuadores', i2c: { vcc: 1, gnd: 0, scl: 2, sda: 3 }, oled: true,
  desc: 'OLED de 0,96" con controlador SSD1306, 128×64 píxeles monocromo, I²C a 0x3C (0x3D si se cambia el puente). Alimentación 3,3–5 V (≈15 mA). Pines: GND, VCC, SCL, SDA. Librerías Adafruit_GFX y Adafruit_SSD1306: display.begin(SSD1306_SWITCHCAPVCC, 0x3C). SDA = A4 y SCL = A5 en el UNO; GPIO8/GPIO9 en el ESP32-S3.',
  pins: [{ n: 'GND', dx: 0 }, { n: 'VCC', dx: 1 }, { n: 'SCL', dx: 2 }, { n: 'SDA', dx: 3 }], box: { x: -70, y: -210, w: 200, h: 214 }, stim: [], props: [{ k: 'addr', label: 'Dirección I²C', opts: ['0x3C', '0x3D'], def: '0x3C' }],
  model(s, p) { if (!pwr(p, s, 1, 0, 2.8, 5.6, 0.015)) return; bus(p, s, 3, 2); p.st.addr = parseInt(p.o.addr, 16) || 0x3C; },
  readout: (it, sv) => { const st = statsOf(sv); return st.ok === false ? 'sin alimentación válida (3–5,5 V y GND a masa)' : `dirección I²C ${it.o.addr}` + (st.fbv ? ' · mostrando imagen' : ' · pantalla en blanco'); }, maxV: 5.6,
  draw(it, sv) { const st = statsOf(sv), url = oledUrl(st);
    return `<rect x="-62" y="-204" width="184" height="200" rx="4" fill="#1f3f86" stroke="#10285a"/>${hole(-52, -194)}${hole(112, -194)}${hole(-52, -16)}${hole(112, -16)}
      <rect x="-52" y="-188" width="164" height="112" rx="2" fill="#0b0b0c" stroke="#303234"/><rect x="-40" y="-178" width="140" height="70" fill="#000" stroke="#1a1a1c"/>${url ? `<image href="${url}" x="-40" y="-178" width="140" height="70" preserveAspectRatio="none" style="image-rendering:pixelated"/>` : ''}
      <rect x="-52" y="-188" width="164" height="112" rx="2" fill="none" stroke="#9aa0a6" stroke-opacity=".35"/><text x="30" y="-90" font-size="7" fill="#7f8a9b" text-anchor="middle">128 × 64 · SSD1306</text>${smd(-40, -66, 11, 6)}${smd(-24, -66, 11, 6)}${smd(34, -66, 11, 6)}${chip(52, -66, 24, 12, '')}<text x="30" y="-34" font-size="11" font-weight="700" fill="#dfe9fb" text-anchor="middle">OLED 0.96"</text>${pinsSvg(this, true, '#dfe9fb', -9)}`; } });

reg('MCP3008', { name: 'ADC MCP3008 (SPI, 8 canales)', group: 'Sensores', spi: { vdd: 15, vref: 14, agnd: 13, clk: 12, dout: 11, din: 10, cs: 9, dgnd: 8 }, dip: true,
  desc: 'MCP3008: convertidor A/D de 10 bits y 8 canales con interfaz SPI. Se monta a caballo del canal central. VDD (pata 16) y VREF (15) a 5 V o 3,3 V; AGND (14) y DGND (9) a masa. Lectura = 1024·V(canal)/VREF. SPI del UNO: CLK = 13, DOUT = 12, DIN = 11; CS = el pin que elijas. Librería Adafruit_MCP3008 (readADC) o SPI.transfer.',
  pins: ['CH0', 'CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'DGND', 'CS', 'DIN', 'DOUT', 'CLK', 'AGND', 'VREF', 'VDD'].map((n, i) => i < 8 ? { n, dx: i } : { n, dx: 15 - i, hi: true }), box: { x: -14, y: -60, w: 152, h: 70 }, stim: [],
  model(s, p) { p.sim = s; const vd = V(s, p, 15) - V(s, p, 13), st = p.st; st.vcc = vd; st.ok = vd > 2.6 && vd < 5.6 && p.pins[13] === 0 && p.pins[8] === 0; if (st.ok) lnk(p, 15, 13, 1 / (vd / 0.0005)); st.vref = V(s, p, 14) - V(s, p, 13); },
  readout: (it, sv) => { const st = statsOf(sv); if (!sv || st.ok === false) return 'sin alimentación válida (VDD 16, DGND 9 y AGND 14 a masa)'; const ch = []; for (let i = 0; i < 8; i++) { const n = sv.pins[i]; const v = n == null || !sv.sim ? 0 : sv.sim.v[n]; ch.push(`CH${i} ${(v || 0).toFixed(2)} V → ${Math.max(0, Math.min(1023, Math.round((v || 0) / Math.max(st.vref, 0.1) * 1024)))}`); } return `VREF ${st.vref.toFixed(2)} V\n` + ch.join('\n'); }, maxV: 5.6,
  draw(it, sv) { const dh = hiDy(it), st = statsOf(sv), top = dh + 5, h = -dh - 10;
    return `<rect x="-9" y="${top}" width="${7 * P + 18}" height="${h}" rx="2" fill="#26292b" stroke="#111"/><path d="M-9,${top + h / 2 - 5} a5,5 0 0 1 0,10" fill="#0b0c0d"/><circle cx="2" cy="${top + 6}" r="1.8" fill="#6d716d"/><text x="${3.5 * P}" y="${top + h / 2 - 1}" font-size="9" font-weight="700" fill="#e8e8e4" text-anchor="middle">MCP3008</text><text x="${3.5 * P}" y="${top + h / 2 + 8}" font-size="6.5" fill="#9a9d99" text-anchor="middle">I/P 1234  SPI ADC 10 bit</text>
      ${this.pins.map(q => `<rect x="${q.dx * P - 2.2}" y="${q.hi ? dh - 5 : -5}" width="4.4" height="10" fill="${PINC}" stroke="#7b7e7b" stroke-width=".5"/><text x="${q.dx * P}" y="${q.hi ? top + 8 : top + h - 2}" font-size="4.8" text-anchor="middle" fill="#8f938f" ${q.hi ? '' : ''}>${esc(q.n)}</text>`).join('')}`; } });
CAT.MCP3008.group = 'Sensores';
function oledUrl(st) { if (!st.fb) return ''; if (st.urlv === st.fbv && st.url) return st.url; try { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'), im = x.createImageData(128, 64); for (let i = 0; i < 8192; i++) { const o = i * 4, v = st.fb[i]; im.data[o] = v ? 205 : 0; im.data[o + 1] = v ? 232 : 0; im.data[o + 2] = v ? 255 : 0; im.data[o + 3] = 255; } x.putImageData(im, 0, 0); st.url = c.toDataURL(); st.urlv = st.fbv; return st.url; } catch (e) { return ''; } }

/* ---------- protección: alimentación y máximos absolutos (hoja de características) ----------
   [pata +, pata −, máximo absoluto V, ¿se quema con la polaridad invertida?] */
const SUP = { TMP36: [0, 2, 7, 1], LM35: [0, 2, 35, 1], DHT11: [0, 2, 6, 1], DHT22: [0, 2, 6, 1], DS18B20: [2, 0, 6, 1], HCSR04: [0, 3, 6.5, 1], PIR: [0, 2, 24, 1],
  SOIL: [0, 1, 7, 1], MQ2: [0, 1, 7, 1], FLAME: [0, 1, 7, 1], SERVO: [1, 0, 8, 1], BUZZ: [0, 1, 9, 0], RELAY: [0, 1, 9, 1], MOTOR: [0, 1, 12, 0],
  BMP280: [0, 1, 6, 1], MPU6050: [0, 1, 6, 1], OLED: [1, 0, 6, 1], MCP3008: [15, 8, 7, 1] };
Object.keys(SUP).forEach(k => { if (CAT[k]) CAT[k].maxV = SUP[k][2]; });
E.SENSSUP = SUP;

/* ---------- API pública ---------- */
const KINDS = Object.keys(CAT);
const defaults = (kind) => { const c = CAT[kind], stim = {}, o = {}; (c.stim || []).forEach(s => { stim[s.k] = s.def === undefined ? 0 : s.def; }); (c.props || []).forEach(p => { o[p.k] = p.def; }); return { stim, o }; };
const colSpan = (kind) => Math.max(...CAT[kind].pins.map(q => q.dx)) + 1;
const thumb = (kind) => { const c = CAT[kind], b = c.box, it = Object.assign({ id: 't', kind }, defaults(kind)), w = 44, h = 36, k = Math.min(w / b.w, h / b.h) * .92, sv = c.kind === 'RGB' ? { leds: [1, .4, .8] } : null;
  return `<svg class="th" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><g transform="translate(${(w - b.w * k) / 2 - b.x * k} ${(h - b.h * k) / 2 - b.y * k}) scale(${k})">${c.draw(it, sv)}</g></svg>`; };
/* sonido: un osciladores por zumbador sonando */
const audio = { ctx: null, osc: {}, gain: null };
const sound = (list) => { try {
  if (!audio.ctx) { const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return; audio.ctx = new AC(); audio.gain = audio.ctx.createGain(); audio.gain.gain.value = 0.05; audio.gain.connect(audio.ctx.destination); }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  const want = {}; list.forEach(x => { if (x.f > 20 && x.f < 12000) want[x.id] = x.f; });
  Object.keys(audio.osc).forEach(id => { if (!want[id]) { try { audio.osc[id].stop(); } catch (e) { } delete audio.osc[id]; } });
  Object.keys(want).forEach(id => { let o = audio.osc[id]; if (!o) { o = audio.ctx.createOscillator(); o.type = 'square'; o.connect(audio.gain); o.start(); audio.osc[id] = o; } o.frequency.value = want[id]; });
} catch (e) { } };
root.SensCat = { CAT, KINDS, defaults, colSpan, thumb, sound, esc };
})(typeof window !== 'undefined' ? window : globalThis);
