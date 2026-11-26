/* Arduino UNO / ESP32: transpilador de un subconjunto de C++ de Arduino a JavaScript (generadores) */
(function (root) {
'use strict';
const M = {};
const TYPES = '(?:long\\s+long|long|int|short|char|byte|float|double|bool|boolean|String|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|size_t|word)';
const INTT = /^(?:unsigned\s+)?(?:long\s+long|long|int|short|byte|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|size_t|word)$/;
const QUAL = '(?:(?:const|static|volatile|unsigned|signed)\\s+)*';

/* avanza hasta el final de la expresión (; o , a nivel 0) */
function exprEnd(s, i) { let d = 0; for (; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}') { if (d === 0) return i; d--; } else if ((c === ';' || c === ',') && d === 0) return i; } return s.length; }
function matchParen(s, i) { let d = 0; for (; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') { d--; if (d === 0) return i; } } return -1; }

M.transpile = function (src) {
  const lits = []; let code = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ' ').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, m => { lits.push(m); return `__S${lits.length - 1}__`; });
  const warn = [];
  code = code.replace(/^\s*#include[^\n]*/gm, '').replace(/^\s*#define\s+(\w+)\s+([^\n]+)/gm, 'const $1 = $2;');
  const funcs = [];
  // funciones de usuario
  code = code.replace(new RegExp(`(^|[;}\\n])\\s*(?:void|${QUAL}${TYPES})\\s*\\*?\\s*(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g'), (m, pre, name, params) => {
    funcs.push(name); const ps = params.trim() && params.trim() !== 'void' ? params.split(',').map(p => p.trim().replace(/\[\s*\]/, '').split(/[\s*&]+/).pop()).join(', ') : '';
    return `${pre}\nfunction* ${name}(${ps}){`; });
  const lcds = [];
  code = code.replace(/\bLiquidCrystal(?:_I2C)?\s+(\w+)\s*\([^;]*\)\s*;/g, (m, n) => { lcds.push(n); return `const ${n} = __lcd();`; });
  code = code.replace(/\bServo\s+(\w+)\s*;/g, (m, n) => `const ${n} = __servo();`);
  code = code.replace(/\bDHT(?:_Unified)?\s+(\w+)\s*\(([^;]*)\)\s*;/g, (m, n, a) => `const ${n} = __dht(${a});`);
  code = code.replace(/\bOneWire\s+(\w+)\s*\(([^;]*)\)\s*;/g, (m, n, a) => `const ${n} = __ow(${a});`);
  code = code.replace(/\bDallasTemperature\s+(\w+)\s*\(\s*&?\s*(\w+)\s*\)\s*;/g, (m, n, o) => `const ${n} = __dallas(${o});`);
  code = code.replace(/\bAdafruit_SSD1306\s+(\w+)\s*\([^;]*\)\s*;/g, (m, n) => `const ${n} = __oled();`);
  code = code.replace(/\bAdafruit_BMP280\s+(\w+)\s*(?:\([^;]*\))?\s*;/g, (m, n) => `const ${n} = __bmp();`);
  code = code.replace(/\bAdafruit_MPU6050\s+(\w+)\s*;/g, (m, n) => `const ${n} = __mpu();`);
  code = code.replace(/\bsensors_event_t\s+([^;]+);/g, (m, l) => 'let ' + l.split(',').map(x => x.trim() + ' = __ev()').join(', ') + ';');
  code = code.replace(/\b(\w+)\.getEvent\s*\(([^)]*)\)/g, (m, o, a) => `${o}.getEvent(${a.replace(/&/g, '')})`);
  code = code.replace(/\bAdafruit_MCP3008\s+(\w+)\s*;/g, (m, n) => `const ${n} = __mcp();`);
  code = code.replace(/\bMCP3008\s+(\w+)\s*\(([^;]*)\)\s*;/g, (m, n, a) => `const ${n} = __mcp(${a});`);
  code = code.replace(/\bAdafruit_\w+::\w+/g, '0');
  // arrays
  code = code.replace(new RegExp(`${QUAL}(${TYPES})\\s+(\\w+)\\s*\\[\\s*(\\w*)\\s*\\]\\s*=\\s*\\{([^}]*)\\}\\s*;`, 'g'), (m, t, n, sz, init) => `let ${n} = [${init}];`);
  code = code.replace(new RegExp(`${QUAL}(${TYPES})\\s+(\\w+)\\s*\\[\\s*(\\w+)\\s*\\]\\s*;`, 'g'), (m, t, n, sz) => t === 'char' ? `let ${n} = "";` : `let ${n} = new Array(${sz}).fill(0);`);
  // declaraciones con valor
  const intVars = new Set();
  const declRe = new RegExp(`(^|[;{}(\\n])\\s*(${QUAL})(${TYPES})\\s+\\*?(\\w+)\\s*(=(?!=)|;|,)`, 'g');
  let out = '', last = 0, mm;
  while ((mm = declRe.exec(code))) {
    const [full, pre, qual, type, name, op] = mm; const isInt = INTT.test((qual + type).replace(/\b(const|static|volatile)\s+/g, '').trim());
    out += code.slice(last, mm.index) + pre + ' let ' + name; last = mm.index + full.length;
    if (isInt) intVars.add(name);
    if (op === '=') { const e = exprEnd(code, last); out += ' = ' + (isInt ? '__i(' + code.slice(last, e) + ')' : code.slice(last, e)); last = e; declRe.lastIndex = e; }
    else if (op === ';') { out += ` = ${type === 'String' ? '""' : type === 'bool' || type === 'boolean' ? 'false' : '0'};`; declRe.lastIndex = last; }
    else { out += ' = 0,'; declRe.lastIndex = last; }
  }
  code = out + code.slice(last);
  // asignaciones a enteros: trunca
  if (intVars.size) { const asg = new RegExp(`(^|[;{}\\n]\\s*|\\(\\s*)(${[...intVars].join('|')})\\s*=(?!=)`, 'g'); let o2 = '', l2 = 0, m2; while ((m2 = asg.exec(code))) { const start = m2.index + m2[0].length, e = exprEnd(code, start); if (/\blet\s*$/.test(code.slice(0, m2.index + m2[1].length))) continue; o2 += code.slice(l2, start) + ' __i(' + code.slice(start, e) + ')'; l2 = e; asg.lastIndex = e; } code = o2 + code.slice(l2); }
  code = code.replace(/\b(\d+\.\d*|\.\d+)[fF]\b/g, '$1').replace(/\b(\d+)[uU]?[lL]{1,2}\b/g, '$1').replace(/\b(\d+)[uU]\b/g, '$1');
  code = code.replace(/\bsprintf\s*\(\s*(\w+)\s*,/g, '$1 = __sprintf(').replace(/\bsnprintf\s*\(\s*(\w+)\s*,[^,]+,/g, '$1 = __sprintf(');
  code = code.replace(/\bsizeof\s*\(\s*(\w+)\s*\)\s*\/\s*sizeof\s*\(\s*\w+\s*\[\s*0\s*\]\s*\)/g, '$1.length').replace(/\bstrlen\s*\(/g, '__strlen(').replace(/\.length\s*\(\s*\)/g, '.length');
  code = code.replace(/\((?:unsigned\s+)?(?:int|long|short|byte|uint8_t|uint16_t|uint32_t|char)\)\s*\(/g, '__i(').replace(/\((?:unsigned\s+)?(?:int|long|short|byte|uint8_t|uint16_t|uint32_t|char)\)\s*(\w+)/g, '__i($1)').replace(/\((?:float|double)\)\s*/g, '');
  code = code.replace(/\b(?:delay|delayMicroseconds|pulseIn)\s*\(/g, m => 'yield* ' + m).replace(/\b(\w+)\.requestTemperatures\s*\(/g, 'yield* $1.requestTemperatures(');
  funcs.forEach(f => { code = code.replace(new RegExp(`(?<!function\\*\\s)(?<![\\w.])${f}\\s*\\(`, 'g'), m => 'yield* ' + m); });
  // bucles: cede en cada iteración
  const tickIt = (kw) => { let i = 0, o3 = ''; const re = new RegExp(`\\b${kw}\\s*\\(`, 'g'); let m3, l3 = 0; while ((m3 = re.exec(code))) { const p0 = m3.index + m3[0].length - 1, p1 = matchParen(code, p0); if (p1 < 0) break; let j = p1 + 1; while (/\s/.test(code[j])) j++;
      if (kw === 'while' && /\}\s*$/.test(code.slice(Math.max(0, m3.index - 4), m3.index))) { re.lastIndex = p1; continue; }
      if (code[j] === '{') { o3 += code.slice(l3, j + 1) + ' yield* __t();'; l3 = j + 1; re.lastIndex = j + 1; }
      else if (code[j] === ';') { o3 += code.slice(l3, j) + ' yield* __t();'; l3 = j; re.lastIndex = j; }
      else { re.lastIndex = p1; } } code = o3 + code.slice(l3); };
  tickIt('while'); tickIt('for'); code = code.replace(/\bdo\s*\{/g, 'do { yield* __t();');
  code = code.replace(/__S(\d+)__/g, (m, k) => { const s = lits[+k]; return s[0] === "'" && s.length <= 4 ? JSON.stringify(s.slice(1, -1).replace(/\\n/, '\n').replace(/\\'/, "'")).replace(/^"(.)"$/, (q, c) => c.length ? `"${c}"` : q) : s; });
  return { code, funcs, lcds, warn };
};

/* ---------- utilidades de formato ---------- */
const fmtNum = (x) => Number.isInteger(x) ? String(x) : (+x).toFixed(2);
function sprintf(fmt, ...a) { let i = 0; return String(fmt).replace(/%([-0 +]*)(\d*)(?:\.(\d+))?(?:l|ll|h)?([diuxXcsf%])/g, (m, fl, w, pr, t) => { if (t === '%') return '%'; let v = a[i++]; let s;
  if (t === 'd' || t === 'i' || t === 'u') s = String(Math.trunc(Number(v))); else if (t === 'x') s = Math.trunc(v).toString(16); else if (t === 'X') s = Math.trunc(v).toString(16).toUpperCase(); else if (t === 'c') s = typeof v === 'number' ? String.fromCharCode(v) : String(v); else if (t === 'f') s = Number(v).toFixed(pr === undefined ? 6 : +pr); else s = String(v);
  w = +w || 0; if (s.length < w) s = fl.includes('-') ? s.padEnd(w) : s.padStart(w, fl.includes('0') && t !== 's' ? '0' : ' '); return s; }); }

/* ---------- controlador de la placa ---------- */
class McuCtl {
  constructor(boardName, part, src, o = {}) {
    this.board = boardName; this.part = part; this.vdd = part.vdd; this.names = part.names; this.src = src; this.serial = ''; this.t0 = 0;
    this.pm = {}; this.out = {}; this.pwm = {}; this.tn = {}; this.sv = {}; this.gl = {}; this.i2c = boardName === 'UNO' ? { sda: 18, scl: 19 } : { sda: 8, scl: 9 }; this.spi = boardName === 'UNO' ? { sck: 13, miso: 12, mosi: 11, cs: 10 } : { sck: 12, miso: 13, mosi: 11, cs: 10 }; this.wtx = []; this.wrx = []; this.lcd = null; this.err = null; this.ledL = 0; this.wake = 0; this.running = true; this.inl = {}; this.warned = new Set();
    this.idxOf = {}; this.names.forEach((n, i) => { const k = Board.pinNumber(boardName, n); if (k !== null) this.idxOf[k] = i; });
    this.onSerial = o.onSerial;
    try { this.compile(); } catch (e) { this.err = 'Error al compilar: ' + e.message; this.running = false; }
  }
  compile() {
    const tr = M.transpile(this.src); this.tr = tr; const me = this, UNO = this.board === 'UNO';
    const R = {
      HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2, LED_BUILTIN: UNO ? 13 : 48, A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, DEC: 10, HEX: 16, BIN: 2, OCT: 8, PI: Math.PI,
      pinMode: (p, m) => { me.pm[p] = m; delete me.pwm[p]; }, digitalWrite: (p, v) => { me.out[p] = v ? 1 : 0; if (v) me.gl[p] = 1; delete me.pwm[p]; },
      digitalRead: (p) => me.inl[p] ? 1 : 0, analogRead: (p) => { const k = this.idxOf[p]; if (k === undefined || !me.sim) return 0; const v = me.sim.vp[me.part.pins[k]]; return Math.max(0, Math.min(UNO ? 1023 : 4095, Math.round(v / me.vdd * (UNO ? 1023 : 4095)))); },
      analogWrite: (p, v) => { me.pwm[p] = Math.max(0, Math.min(255, v)) / 255; me.pm[p] = 1; },
      delay: function* (ms) { yield ms / 1000; }, delayMicroseconds: function* (us) { yield us / 1e6; }, __t: function* () { yield 8e-6; },
      millis: () => Math.floor(me.t * 1000), micros: () => Math.floor(me.t * 1e6),
      random: (a, b) => b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a)), randomSeed: () => { },
      map: (x, a, b, c, d) => Math.trunc((x - a) * (d - c) / (b - a) + c), constrain: (x, a, b) => Math.min(b, Math.max(a, x)), min: Math.min, max: Math.max, abs: Math.abs, sq: (x) => x * x, sqrt: Math.sqrt, pow: Math.pow, sin: Math.sin, cos: Math.cos, floor: Math.floor, ceil: Math.ceil, round: Math.round, log: Math.log, log10: Math.log10, exp: Math.exp, tan: Math.tan, atan: Math.atan, atan2: Math.atan2, asin: Math.asin, acos: Math.acos, fabs: Math.abs, NULL: 0,
      bitRead: (x, n) => (x >> n) & 1, bitWrite: (x, n, b) => b ? x | (1 << n) : x & ~(1 << n), lowByte: (x) => x & 255, highByte: (x) => (x >> 8) & 255, tone: (p, f, d) => { me.tn[p] = { f, until: d ? me.t + d / 1000 : Infinity }; me.pm[p] = 1; delete me.pwm[p]; }, noTone: (p) => { delete me.tn[p]; me.out[p] = 0; },
      isnan: (x) => Number.isNaN(x), NAN: NaN, DHT11: 11, DHT22: 22, DHT21: 21, INFINITY: Infinity,
      F: (x) => x, SSD1306_SWITCHCAPVCC: 2, SSD1306_EXTERNALVCC: 1, SSD1306_WHITE: 1, SSD1306_BLACK: 0, SSD1306_INVERSE: 2, WHITE: 1, BLACK: 0, INVERSE: 2, MSBFIRST: 1, LSBFIRST: 0, SPI_MODE0: 0, SPI_MODE1: 1, SPI_MODE2: 2, SPI_MODE3: 3,
      MPU6050_RANGE_2_G: 0, MPU6050_RANGE_4_G: 1, MPU6050_RANGE_8_G: 2, MPU6050_RANGE_16_G: 3, MPU6050_RANGE_250_DEG: 0, MPU6050_RANGE_500_DEG: 1, MPU6050_RANGE_1000_DEG: 2, MPU6050_RANGE_2000_DEG: 3, MPU6050_BAND_260_HZ: 0, MPU6050_BAND_184_HZ: 1, MPU6050_BAND_94_HZ: 2, MPU6050_BAND_44_HZ: 3, MPU6050_BAND_21_HZ: 4, MPU6050_BAND_10_HZ: 5, MPU6050_BAND_5_HZ: 6,
      SPISettings: () => 0, __ev: () => ({ acceleration: { x: 0, y: 0, z: 0 }, gyro: { x: 0, y: 0, z: 0 }, temperature: 0 }),
      Wire: { begin: (a, b) => { if (a !== undefined && b !== undefined) { me.i2c.sda = a; me.i2c.scl = b; } }, setClock: () => { }, setPins: (a, b) => { me.i2c.sda = a; me.i2c.scl = b; }, beginTransmission: (a) => { me.wa = a; me.wtx = []; },
        write: (x) => { if (Array.isArray(x)) me.wtx.push(...x.map(v => v & 255)); else if (typeof x === 'string') for (const ch of x) me.wtx.push(ch.charCodeAt(0) & 255); else me.wtx.push(x & 255); return 1; },
        endTransmission: () => { const d = me.devAt(me.wa); if (!d) return 2; me.devWrite(d, me.wtx); return 0; }, requestFrom: (a, n) => { const d = me.devAt(a); me.wrx = []; if (!d) return 0; me.wrx = me.devRead(d, n); return me.wrx.length; },
        available: () => me.wrx.length, read: () => me.wrx.length ? me.wrx.shift() : -1, peek: () => me.wrx.length ? me.wrx[0] : -1, flush: () => { } },
      SPI: { begin: (a, b, c) => { if (a !== undefined && b !== undefined) me.spi = { sck: a, miso: b, mosi: c }; }, end: () => { }, beginTransaction: () => { }, endTransaction: () => { }, setClockDivider: () => { }, setBitOrder: () => { }, setDataMode: () => { }, setFrequency: () => { },
        transfer: (b) => { if (Array.isArray(b)) { for (let i = 0; i < b.length; i++) b[i] = me.spiXfer(b[i]); return 0; } return me.spiXfer(b); }, transfer16: (w) => (me.spiXfer((w >> 8) & 255) << 8) | me.spiXfer(w & 255) },
      __bmp: () => { let addr = 0x77, ok = false; const dev = () => me.devAt(addr); return { begin: (a) => { if (typeof a === 'number') addr = a; ok = !!dev(); return ok; }, setSampling: () => { },
          readTemperature: () => { const d = dev(); return ok && d ? Math.round(Math.max(-40, Math.min(85, d.stim.temp)) * 100) / 100 : NaN; }, readPressure: () => { const d = dev(); return ok && d ? Math.round(Math.max(300, Math.min(1100, d.stim.pres)) * 100 * 4) / 4 : NaN; },
          readAltitude: (sl) => { const d = dev(); if (!ok || !d) return NaN; const p = Math.max(300, Math.min(1100, d.stim.pres)); return 44330 * (1 - Math.pow(p / (sl === undefined ? 1013.25 : sl), 1 / 5.255)); }, takeForcedMeasurement: () => true }; },
      __mpu: () => { const dev = () => me.devAt(0x68) || me.devAt(0x69); return { begin: (a) => { const d = a ? me.devAt(a) : dev(); if (!d) return false; me.mpuInit(d); d.st.regs[0x6B] = 0; d.st.sleep = false; return true; },
          setAccelerometerRange: (r) => { const d = dev(); if (d) { me.mpuInit(d); d.st.regs[0x1C] = (r & 3) << 3; } }, setGyroRange: (r) => { const d = dev(); if (d) { me.mpuInit(d); d.st.regs[0x1B] = (r & 3) << 3; } }, setFilterBandwidth: () => { }, setSampleRateDivisor: () => { },
          getEvent: (a, g, t) => { const d = dev(); if (!d) return false; const r = me.mpuRead(d), G = 9.80665, k = Math.PI / 180; a.acceleration = { x: r.a[0] * G, y: r.a[1] * G, z: r.a[2] * G }; g.gyro = { x: r.g[0] * k, y: r.g[1] * k, z: r.g[2] * k }; t.temperature = r.t; return true; } }; },
      __oled: () => { const W = 128, H = 64, fb = new Uint8Array(W * H); let cx = 0, cy = 0, ts = 1, col = 1, bg = 0, wrap = true, addr = 0x3C; const dev = () => me.devAt(addr);
        const px = (x, y, c) => { x = Math.trunc(x); y = Math.trunc(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const q = c === undefined ? col : c; fb[y * W + x] = q === 2 ? 1 - fb[y * W + x] : q ? 1 : 0; };
        const line = (x0, y0, x1, y1, c) => { x0 = Math.trunc(x0); y0 = Math.trunc(y0); x1 = Math.trunc(x1); y1 = Math.trunc(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0; for (;;) { px(x0, y0, c); if ((x0 === x1 && y0 === y1) || n++ > 400) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
        const fillR = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); };
        const circ = (x0, y0, r, c, fill) => { x0 = Math.trunc(x0); y0 = Math.trunc(y0); r = Math.trunc(r); let x = r, y = 0, e = 1 - r; while (x >= y) { if (fill) { line(x0 - x, y0 + y, x0 + x, y0 + y, c); line(x0 - x, y0 - y, x0 + x, y0 - y, c); line(x0 - y, y0 + x, x0 + y, y0 + x, c); line(x0 - y, y0 - x, x0 + y, y0 - x, c); } else { [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]].forEach(([a, b]) => px(x0 + a, y0 + b, c)); } y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; } } };
        const putc = (ch) => { if (ch === '\n') { cx = 0; cy += 8 * ts; return; } if (ch === '\r') return; if (wrap && cx + 6 * ts > W) { cx = 0; cy += 8 * ts; } const gl = me.glyph(ch, ts); if (gl) for (let j = 0; j < 8 * ts; j++) for (let i = 0; i < 6 * ts; i++) { if (gl[j * 6 * ts + i]) px(cx + i, cy + j, col); else if (bg !== col) px(cx + i, cy + j, bg); } cx += 6 * ts; };
        const pr = (x, b) => { for (const ch of me.fmt(x, b)) putc(ch); };
        return { begin: (v, a) => { if (typeof a === 'number') addr = a; return !!dev(); }, clearDisplay: () => { fb.fill(0); cx = 0; cy = 0; }, display: () => { const d = dev(); if (!d) return; d.st.fb = fb.slice(); d.st.fbv = (d.st.fbv || 0) + 1; },
          setTextSize: (s) => { ts = Math.max(1, Math.trunc(s)); }, setTextColor: (c, b) => { col = c; bg = b === undefined ? c : b; }, setCursor: (x, y) => { cx = Math.trunc(x); cy = Math.trunc(y); }, setTextWrap: (w) => { wrap = !!w; }, cp437: () => { },
          print: (x, b) => pr(x, b), println: (x, b) => { if (x !== undefined) pr(x, b); putc('\n'); }, write: (c) => putc(typeof c === 'number' ? String.fromCharCode(c) : c), width: () => W, height: () => H, getCursorX: () => cx, getCursorY: () => cy,
          drawPixel: (x, y, c) => px(x, y, c), drawLine: (a, b, c, d, e) => line(a, b, c, d, e), drawFastHLine: (x, y, w, c) => line(x, y, x + w - 1, y, c), drawFastVLine: (x, y, h, c) => line(x, y, x, y + h - 1, c),
          drawRect: (x, y, w, h, c) => { line(x, y, x + w - 1, y, c); line(x, y + h - 1, x + w - 1, y + h - 1, c); line(x, y, x, y + h - 1, c); line(x + w - 1, y, x + w - 1, y + h - 1, c); }, fillRect: (x, y, w, h, c) => fillR(x, y, w, h, c), drawRoundRect: (x, y, w, h, r, c) => { line(x, y, x + w - 1, y, c); line(x, y + h - 1, x + w - 1, y + h - 1, c); line(x, y, x, y + h - 1, c); line(x + w - 1, y, x + w - 1, y + h - 1, c); }, fillRoundRect: (x, y, w, h, r, c) => fillR(x, y, w, h, c),
          drawCircle: (x, y, r, c) => circ(x, y, r, c, false), fillCircle: (x, y, r, c) => circ(x, y, r, c, true), drawTriangle: (a, b, c, d, e, f, g) => { line(a, b, c, d, g); line(c, d, e, f, g); line(e, f, a, b, g); }, fillScreen: (c) => fb.fill(c ? 1 : 0),
          drawBitmap: (x, y, bm, w, h, c) => { const bw = (w + 7) >> 3; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((bm[j * bw + (i >> 3)] >> (7 - (i & 7))) & 1) px(x + i, y + j, c); }, invertDisplay: () => { }, dim: () => { }, ssd1306_command: () => { }, startscrollright: () => { }, stopscroll: () => { } }; },
      __mcp: (a, b, c, d) => { let cs = me.spi.cs, sck = me.spi.sck, miso = me.spi.miso, mosi = me.spi.mosi; if (d !== undefined) { sck = a; miso = b; mosi = c; cs = d; } else if (a !== undefined) cs = a; const dev = () => me.mcpAt(sck, miso, mosi, cs);
        return { begin: (p, q, r, t) => { if (t !== undefined) { sck = p; mosi = q; miso = r; cs = t; } else if (p !== undefined) cs = p; return !!dev(); }, readADC: (ch) => me.mcpVal(dev(), ch), read: (ch) => me.mcpVal(dev(), ch), analogRead: (ch) => me.mcpVal(dev(), ch), maxValue: () => 1023 }; },
      pulseIn: function* (p, lvl, to) { const lim = (to === undefined ? 1e6 : to) / 1e6, t0 = me.t, L = lvl ? 1 : 0, st = () => me.sim ? me.sim.dt : 5e-5;
        while ((me.inl[p] ? 1 : 0) === L) { if (me.t - t0 > lim) return 0; yield st(); }
        while ((me.inl[p] ? 1 : 0) !== L) { if (me.t - t0 > lim) return 0; yield st(); }
        const ts = me.t; while ((me.inl[p] ? 1 : 0) === L) { if (me.t - t0 > lim) return 0; yield st(); }
        const f = me.findSens(p); if (f && f.p.kind === 'HCSR04' && f.i === 2 && f.p.st.echoFall > f.p.st.echoRise) return Math.round((f.p.st.echoFall - f.p.st.echoRise) * 1e6);
        return Math.round((me.t - ts) * 1e6); },
      __servo: () => { let pin = null, us = 1500, lo = 544, hi = 2400; const a = () => { if (pin !== null) me.sv[pin].us = us; }; return {
        attach: (p, a1, a2) => { pin = p; if (a1 !== undefined) { lo = a1; hi = a2 === undefined ? 2400 : a2; } me.sv[p] = { us, acc: 0, k: 0 }; me.pm[p] = 1; delete me.pwm[p]; return 1; }, detach: () => { if (pin !== null) { delete me.sv[pin]; me.pm[pin] = 0; pin = null; } },
        write: (g) => { g = Math.max(0, Math.min(180, g)); if (g > 180) g = 180; us = lo + (hi - lo) * g / 180; a(); }, writeMicroseconds: (u) => { us = u; a(); },
        read: () => Math.round(Math.max(0, Math.min(180, (us - lo) / (hi - lo) * 180))), attached: () => pin !== null }; },
      __dht: (pin, type) => { const c = { t: NaN, h: NaN, at: -1e9 }; const rd = () => { const f = me.findSens(pin); if (!f || !f.p.st.ok || f.i !== 1 || (type === 11 && f.p.kind !== 'DHT11') || (type !== 11 && f.p.kind !== 'DHT22')) return false;
          if (me.t - c.at < 2) return !Number.isNaN(c.t); const on = f.p.st.on0; if (on == null || me.sim.t - on < (type === 11 ? 1 : 2)) return false;
          const q = f.p.stim; if (type === 11) { c.t = Math.round(Math.max(0, Math.min(50, q.temp))); c.h = Math.round(Math.max(20, Math.min(90, q.hum))); } else { c.t = Math.round(Math.max(-40, Math.min(80, q.temp)) * 10) / 10; c.h = Math.round(Math.max(0, Math.min(100, q.hum)) * 10) / 10; } c.at = me.t; return true; };
        return { begin: () => { }, readTemperature: (fh) => rd() ? (fh ? c.t * 1.8 + 32 : c.t) : NaN, readHumidity: () => rd() ? c.h : NaN, computeHeatIndex: (t, h) => t + 0.05 * h, convertCtoF: (x) => x * 1.8 + 32, convertFtoC: (x) => (x - 32) / 1.8 }; },
      __ow: (pin) => ({ pin }),
      __dallas: (ow) => { let res = 12, val = 85, conv = false; const sens = () => { const f = me.findSens(ow.pin); if (!f || !f.p.st.ok || f.p.kind !== 'DS18B20' || f.i !== 1) return null; const n = me.part.pins[me.idxOf[ow.pin]]; if (me.sim.vp[n] < 0.7 * f.p.st.vdd) return null; return f.p; };
        return { begin: () => { }, setResolution: (r) => { res = Math.max(9, Math.min(12, r)); }, getDeviceCount: () => sens() ? 1 : 0, isConnected: () => !!sens(),
          requestTemperatures: function* () { const p = sens(); yield p ? 0.75 / Math.pow(2, 12 - res) : 0.001; const q = sens(); if (q) { const stp = 0.0625 * Math.pow(2, 12 - res); val = Math.round(Math.max(-55, Math.min(125, q.stim.temp)) / stp) * stp; conv = true; } else { conv = false; } },
          getTempCByIndex: () => sens() ? val : -127, getTempFByIndex: () => sens() ? val * 1.8 + 32 : -196.6, getTempC: () => sens() ? val : -127 }; }, attachInterrupt: () => { }, digitalPinToInterrupt: (x) => x,
      __i: (x) => typeof x === 'number' ? Math.trunc(x) : x, __strlen: (s) => String(s).length, __sprintf: sprintf,
      Serial: { begin: () => { }, print: (x, b) => me.sprint(x, b), println: (x, b) => { me.sprint(x === undefined ? '' : x, b); me.sprint('\n'); }, write: (x) => me.sprint(typeof x === 'number' ? String.fromCharCode(x) : x), available: () => 0, read: () => -1, flush: () => { } },
      __lcd: () => me.mkLcd()
    };
    const keys = Object.keys(R), body = `const {${keys.join(',')}} = R;\n${tr.code}\nreturn { setup: (typeof setup === 'function') ? setup : function*(){}, loop: (typeof loop === 'function') ? loop : function*(){} };`;
    const prog = new Function('R', body)(R);
    this.gen = (function* () { yield* prog.setup(); for (;;) { yield* prog.loop(); yield 1e-5; } })();
  }
  nodeOf(p) { const k = this.idxOf[p]; return k === undefined ? null : this.part.pins[k]; }
  fmt(x, b) { return typeof x === 'number' ? (Number.isNaN(x) ? 'nan' : !isFinite(x) ? 'inf' : Number.isInteger(x) && (b === 2 || b === 8 || b === 16) ? Math.trunc(x).toString(b).toUpperCase() : b !== undefined && b !== 10 ? x.toFixed(Math.min(b, 8)) : fmtNum(x)) : String(x); }
  devAt(addr) { if (!this.sim) return null; const ns = this.nodeOf(this.i2c.sda), nc = this.nodeOf(this.i2c.scl); if (ns == null || nc == null) return null; const CAT = root.SensCat && root.SensCat.CAT;
    for (const q of this.sim.parts) { if (q.type !== 'SENS') continue; const c = CAT[q.kind]; if (!c || !c.i2c) continue; if (q.pins[c.i2c.sda] === ns && q.pins[c.i2c.scl] === nc && q.st.ok && q.st.addr === addr) return q; } return null; }
  mpuInit(d) { if (!d.st.regs) { d.st.regs = {}; d.st.regs[0x75] = 0x68; d.st.regs[0x6B] = 0x40; d.st.sleep = true; } }
  mpuRead(d) { this.mpuInit(d); const R = d.st.regs, q = d.stim, k = Math.PI / 180, ar = [2, 4, 8, 16][(R[0x1C] >> 3) & 3] || 2, gr = [250, 500, 1000, 2000][(R[0x1B] >> 3) & 3] || 250, c = (x, m) => Math.max(-m, Math.min(m, x));
    const a = [Math.sin(q.pitch * k), -Math.sin(q.roll * k) * Math.cos(q.pitch * k), Math.cos(q.roll * k) * Math.cos(q.pitch * k)].map(x => c(x, ar)), g = [q.gx, q.gy, q.gz].map(x => c(x, gr));
    if (d.st.sleep) return { a: [0, 0, 0], g: [0, 0, 0], t: 0 }; return { a, g, t: q.temp, ar, gr }; }
  devWrite(d, bytes) { if (!bytes.length) return; d.st.ptr = bytes[0]; if (d.kind === 'MPU6050') { this.mpuInit(d); for (let i = 1; i < bytes.length; i++) { d.st.regs[d.st.ptr] = bytes[i]; if (d.st.ptr === 0x6B) d.st.sleep = !!(bytes[i] & 0x40); d.st.ptr++; } } }
  devRead(d, n) { const out = [], i16 = (v) => { v = Math.max(-32768, Math.min(32767, Math.round(v))); return v & 0xFFFF; }; let p = d.st.ptr || 0;
    for (let i = 0; i < n; i++, p++) { let v = 0; if (d.kind === 'MPU6050') { this.mpuInit(d); if (p >= 0x3B && p <= 0x48) { const r = this.mpuRead(d), al = d.st.sleep ? 1 : [16384, 8192, 4096, 2048][(d.st.regs[0x1C] >> 3) & 3], gl = d.st.sleep ? 1 : [131, 65.5, 32.8, 16.4][(d.st.regs[0x1B] >> 3) & 3];
          const w = [i16(r.a[0] * al), i16(r.a[1] * al), i16(r.a[2] * al), i16(d.st.sleep ? 0 : (r.t - 36.53) * 340), i16(r.g[0] * gl), i16(r.g[1] * gl), i16(r.g[2] * gl)], j = p - 0x3B; v = (j & 1) ? w[j >> 1] & 255 : w[j >> 1] >> 8; } else v = d.st.regs[p] || 0; }
      else if (d.kind === 'BMP280') v = p === 0xD0 ? 0x58 : 0; out.push(v); } d.st.ptr = p; return out; }
  mcpAt(sck, miso, mosi, cs) { if (!this.sim) return null; const nk = this.nodeOf(sck), nm = this.nodeOf(miso), no = this.nodeOf(mosi), nc = this.nodeOf(cs); if (nk == null || nc == null) return null;
    for (const q of this.sim.parts) if (q.type === 'SENS' && q.kind === 'MCP3008' && q.st.ok && q.pins[12] === nk && q.pins[9] === nc && q.pins[11] === nm && q.pins[10] === no) return q; return null; }
  mcpVal(d, ch) { if (!d || ch < 0 || ch > 7) return 0; const v = this.sim.vp, n = d.pins[ch], vr = v[d.pins[14]] - v[d.pins[13]]; if (vr < 0.3) return 0; return Math.max(0, Math.min(1023, Math.floor(((n == null ? 0 : v[n]) - v[d.pins[13]]) / vr * 1024))); }
  spiXfer(b) { const nk = this.nodeOf(this.spi.sck), nm = this.nodeOf(this.spi.miso), no = this.nodeOf(this.spi.mosi); if (!this.sim || nk == null) return 0;
    for (const q of this.sim.parts) { if (q.type !== 'SENS' || q.kind !== 'MCP3008' || !q.st.ok || q.pins[12] !== nk || q.pins[11] !== nm || q.pins[10] !== no) continue;
      const cn = q.pins[9]; let sel = false; for (const k in this.idxOf) if (this.part.pins[this.idxOf[k]] === cn && this.pm[k] === 1 && !this.out[k] && this.pwm[k] === undefined) sel = true;
      if (!sel) { q.st.n = 0; continue; } const st = q.st; st.n = st.n || 0; let r = 0;
      if (st.n === 0) { st.n = 1; r = 0; } else if (st.n === 1) { st.ch = (b >> 4) & 7; st.val = this.mcpVal(q, st.ch); st.n = 2; r = (st.val >> 8) & 3; } else { st.n = 0; r = st.val & 255; } return r; } return 0; }
  glyph(ch, ts) { try { const key = ch + ts; this._gl = this._gl || {}; if (this._gl[key]) return this._gl[key]; if (typeof document === 'undefined') return null; const w = 6 * ts, h = 8 * ts, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#fff'; x.font = `${10 * ts}px "DejaVu Sans Mono","Courier New",monospace`; x.textBaseline = 'alphabetic'; x.fillText(ch, 0, 7 * ts); const dt = x.getImageData(0, 0, w, h).data, o = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) o[i] = dt[i * 4 + 3] > 110 ? 1 : 0; return (this._gl[key] = o); } catch (e) { return null; } }
  findSens(p) { const k = this.idxOf[p]; if (k === undefined || !this.sim) return null; const n = this.part.pins[k]; if (n == null) return null; for (const q of this.sim.parts) if (q.type === 'SENS') { const i = q.pins.indexOf(n); if (i >= 0) return { p: q, i }; } return null; }
  mkLcd() { const me = this; if (!this.lcd) this.lcd = { cols: 16, rows: 2, buf: [' '.repeat(16), ' '.repeat(16)], cx: 0, cy: 0, on: true };
    const L = this.lcd, put = (s) => { for (const ch of String(s)) { if (L.cy >= L.rows) break; const r = L.buf[L.cy]; if (L.cx < L.cols) L.buf[L.cy] = r.slice(0, L.cx) + ch + r.slice(L.cx + 1); L.cx++; } };
    return { begin: (c, r) => { L.cols = c || 16; L.rows = r || 2; L.buf = Array.from({ length: L.rows }, () => ' '.repeat(L.cols)); }, setCursor: (c, r) => { L.cx = Math.trunc(c); L.cy = Math.trunc(r); }, print: (x, b) => put(b ? Number(x).toString(b).toUpperCase() : fmtNum2(x)), println: (x) => { put(fmtNum2(x)); L.cy++; L.cx = 0; }, write: (x) => put(typeof x === 'number' ? String.fromCharCode(x) : x), clear: () => { L.buf = L.buf.map(() => ' '.repeat(L.cols)); L.cx = 0; L.cy = 0; }, home: () => { L.cx = 0; L.cy = 0; }, backlight: () => { L.on = true; }, noBacklight: () => { L.on = false; }, init: () => { }, createChar: () => { }, display: () => { }, noDisplay: () => { }, cursor: () => { }, noCursor: () => { }, blink: () => { }, noBlink: () => { } }; }
  sprint(x, b) { const s = this.fmt(x, b); this.serial += s; if (this.serial.length > 20000) this.serial = this.serial.slice(-15000); this.onSerial && this.onSerial(); }
  /* llamado por el motor en cada paso */
  sample(levels, t, sim) {
    this.t = t - this.t0; this.sim = sim;
    if (!this.booted) { this.booted = true; if (sim.parts.some(q => q.type === 'SENS')) this.wake = Math.max(this.wake, 0.1); }
    for (const k in this.idxOf) this.inl[k] = levels[this.idxOf[k]];
    if (this.running && this.gen) {
      let budget = 4000;
      while (this.wake <= this.t && budget-- > 0) { let r; try { r = this.gen.next(); } catch (e) { this.err = 'Error en ejecución: ' + e.message; this.running = false; break; } if (r.done) { this.running = false; break; } this.wake = Math.max(this.wake, this.t - 2e-3) + (typeof r.value === 'number' ? r.value : 0); }
    }
    const dr = new Array(this.names.length);
    for (const k in this.idxOf) { const i = this.idxOf[k], m = this.pm[k];
      if (m === 1) { let v = this.out[k] || 0; if (this.pwm[k] !== undefined) v = ((this.t * 490) % 1) < this.pwm[k] ? 1 : 0;
        const tn = this.tn[k]; if (tn) { if (this.t >= tn.until) delete this.tn[k]; else v = ((this.t * tn.f) % 1) < 0.5 ? 1 : 0; }
        const sv = this.sv[k]; if (sv) { const dt = sim.dt, per = Math.max(2, Math.round(0.02 / dt)); if (sv.k === 0) { sv.acc += sv.us * 1e-6 / dt; sv.n = Math.floor(sv.acc); sv.acc -= sv.n; } v = sv.k < sv.n ? 1 : 0; sv.k = (sv.k + 1) % per; }
        else if (!v && this.gl[k]) { const f = this.findSens(k); if (f && f.p.kind === 'HCSR04' && f.i === 1) v = 1; }
        dr[i] = v ? 1 : 2; } else if (m === 2) dr[i] = 3; }
    this.gl = {};
    this.ledL = (this.out[this.board === 'UNO' ? 13 : 48] || 0) && this.pm[this.board === 'UNO' ? 13 : 48] === 1;
    return dr;
  }
  checkPins(sim) {
    const lim = this.board === 'UNO' ? 5.6 : 3.7, r = [];
    for (const k in this.idxOf) { const i = this.idxOf[k], v = sim.v[this.part.pins[i]]; if (v > lim && !this.warned.has(k)) { this.warned.add(k); r.push(`${this.board === 'UNO' ? 'Arduino' : 'ESP32'}: el pin ${this.names[i]} recibe ${v.toFixed(1)} V (máximo ${this.board === 'UNO' ? '5' : '3,3'} V). Riesgo de dañar la placa.`); } }
    return r;
  }
}
function fmtNum2(x) { return typeof x === 'number' ? fmtNum(x) : String(x); }
M.McuCtl = McuCtl;

M.EXAMPLES = {
  reloj: `// P9.1 · Reloj digital a 10x de velocidad (arranca en 09:58:25)
unsigned long previo = 0;
int h = 9, m = 58, s = 25;

void setup() {
  Serial.begin(9600);
}

void loop() {
  unsigned long ahora = millis();
  if (ahora - previo >= 100) {      // 1 "segundo" = 100 ms a 10x
    previo += 100;                  // sin acumular error
    s++;
    if (s >= 60) { s = 0; m++; }
    if (m >= 60) { m = 0; h++; }
    if (h >= 24) { h = 0; }
    char buf[9];
    sprintf(buf, "%02d:%02d:%02d", h, m, s);
    Serial.println(buf);
  }
}`,
  marcador: `// P9.2 · Marcador de fútbol con pulsadores INPUT_PULLUP
const int BTN_LOCAL = 2, BTN_VISIT = 3, BTN_RESET = 4;
int local = 0, visit = 0;
int estLocal = HIGH, estVisit = HIGH, estReset = HIGH;
unsigned long tLocal = 0, tVisit = 0, tReset = 0;
LiquidCrystal lcd(12, 11, 5, 4, A0, A1);

void pintar() {
  char txt[17];
  sprintf(txt, "%d - %d", local, visit);
  lcd.setCursor(0, 0);
  lcd.print("                ");          // borra la línea
  int col = (16 - strlen(txt)) / 2;       // centrado
  lcd.setCursor(col, 0);
  lcd.print(txt);
}

void setup() {
  pinMode(BTN_LOCAL, INPUT_PULLUP);
  pinMode(BTN_VISIT, INPUT_PULLUP);
  pinMode(BTN_RESET, INPUT_PULLUP);
  lcd.begin(16, 2);
  pintar();
}

void loop() {
  int l = digitalRead(BTN_LOCAL), v = digitalRead(BTN_VISIT), r = digitalRead(BTN_RESET);
  unsigned long ahora = millis();
  if (l != estLocal && ahora - tLocal > 30) { tLocal = ahora; estLocal = l; if (l == LOW) { local++; pintar(); } }
  if (v != estVisit && ahora - tVisit > 30) { tVisit = ahora; estVisit = v; if (v == LOW) { visit++; pintar(); } }
  if (r != estReset && ahora - tReset > 30) { tReset = ahora; estReset = r; if (r == LOW) { local = 0; visit = 0; pintar(); } }
}`,
  blink: `// Parpadeo del LED de la placa y de un LED en el pin 8
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(8, OUTPUT);
}
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  digitalWrite(8, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(8, LOW);
  delay(500);
}`
};

/* ---------- ejemplos precargados (UNO y ESP32) ---------- */
const EXP = {
  UNO: { L: 8, L2: 9, L3: 10, B: 2, B2: 3, B3: 4, PWM: 9, AN: 'A0', AN2: 'A1', LCD: '12, 11, 5, 4, A0, A1' },
  ESP32: { L: 4, L2: 5, L3: 6, B: 15, B2: 16, B3: 17, PWM: 4, AN: 1, AN2: 2, LCD: '7, 8, 9, 10, 11, 12' }
};
M.EXAMPLE_LIST = [
  { id: 'blink', title: '1 · Parpadeo (Blink)', code: (p) => `// Parpadeo del LED de la placa y de un LED externo en el pin ${p.L}
// Circuito: pin ${p.L} → resistencia 330 Ω → LED → GND
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(${p.L}, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  digitalWrite(${p.L}, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(${p.L}, LOW);
  delay(500);
}` },
  { id: 'pulsador', title: '2 · Pulsador con INPUT_PULLUP', code: (p) => `// El LED se enciende mientras se mantiene pulsado el botón.
// Circuito: pin ${p.B} → pulsador → GND (la resistencia interna sube a 1 al soltar)
//           pin ${p.L} → 330 Ω → LED → GND
const int BOTON = ${p.B};
const int LED = ${p.L};

void setup() {
  pinMode(BOTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  int estado = digitalRead(BOTON);   // LOW = pulsado
  if (estado == LOW) {
    digitalWrite(LED, HIGH);
  } else {
    digitalWrite(LED, LOW);
  }
}` },
  { id: 'semaforo', title: '3 · Semáforo', code: (p) => `// Semáforo de tres LEDs: rojo, ámbar y verde
// Cada pin → 330 Ω → LED → GND
const int ROJO = ${p.L};
const int AMBAR = ${p.L2};
const int VERDE = ${p.L3};

void setup() {
  pinMode(ROJO, OUTPUT);
  pinMode(AMBAR, OUTPUT);
  pinMode(VERDE, OUTPUT);
}

void loop() {
  digitalWrite(ROJO, HIGH);
  delay(3000);
  digitalWrite(ROJO, LOW);
  digitalWrite(VERDE, HIGH);
  delay(3000);
  digitalWrite(VERDE, LOW);
  digitalWrite(AMBAR, HIGH);
  delay(1000);
  digitalWrite(AMBAR, LOW);
}` },
  { id: 'fade', title: '4 · Brillo variable (PWM)', code: (p) => `// El LED sube y baja de brillo con analogWrite (PWM)
// Circuito: pin ${p.PWM} → 330 Ω → LED → GND
const int LED = ${p.PWM};
int brillo = 0;
int paso = 5;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  analogWrite(LED, brillo);
  brillo = brillo + paso;
  if (brillo <= 0 || brillo >= 255) {
    paso = -paso;                    // invierte el sentido en los extremos
  }
  delay(30);
}` },
  { id: 'voltimetro', title: '5 · Voltímetro con analogRead', code: (p) => `// Lee una tensión en ${p.AN} (por ejemplo, el cursor de un divisor de tensión
// entre ${p.AN === 'A0' ? '5 V' : '3,3 V'} y GND) y la muestra por el monitor serie.
const int ENTRADA = ${p.AN};
const float VREF = ${p.AN === 'A0' ? '5.0' : '3.3'};
const int MAXADC = ${p.AN === 'A0' ? '1023' : '4095'};

void setup() {
  Serial.begin(9600);
}

void loop() {
  int lectura = analogRead(ENTRADA);
  float tension = lectura * VREF / MAXADC;
  Serial.print("ADC = ");
  Serial.print(lectura);
  Serial.print("  ->  ");
  Serial.print(tension);
  Serial.println(" V");
  delay(500);
}` },
  { id: 'serie', title: '6 · Hola mundo por serie', code: () => `// Escribe un contador por el monitor serie cada segundo
int cuenta = 0;

void setup() {
  Serial.begin(9600);
  Serial.println("Hola, mundo");
}

void loop() {
  Serial.print("Cuenta: ");
  Serial.println(cuenta);
  cuenta++;
  delay(1000);
}` },
  { id: 'lcd', title: '7 · Contador en pantalla LCD', code: (p) => `// Contador de segundos en una pantalla LCD 16x2 (virtual)
#include <LiquidCrystal.h>
LiquidCrystal lcd(${p.LCD});
int segundos = 0;

void setup() {
  lcd.begin(16, 2);
  lcd.setCursor(0, 0);
  lcd.print("Tiempo (s):");
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print(segundos);
  lcd.print("   ");
  segundos++;
  delay(1000);
}` },
  { id: 'antirrebote', title: '8 · Contador de pulsaciones con antirrebote', code: (p) => `// Cuenta cada pulsación (flanco de bajada) con antirrebote de 30 ms.
// Circuito: pin ${p.B} → pulsador → GND
const int BOTON = ${p.B};
int cuenta = 0;
int estadoAnterior = HIGH;
unsigned long ultimoCambio = 0;

void setup() {
  pinMode(BOTON, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  int estado = digitalRead(BOTON);
  unsigned long ahora = millis();
  if (estado != estadoAnterior && ahora - ultimoCambio > 30) {
    ultimoCambio = ahora;
    estadoAnterior = estado;
    if (estado == LOW) {
      cuenta++;
      Serial.print("Pulsaciones: ");
      Serial.println(cuenta);
    }
  }
}` },
  { id: 'reloj', title: '9 · P9.1 Reloj digital (millis)', code: () => M.EXAMPLES.reloj },
  { id: 'marcador', title: '10 · P9.2 Marcador de fútbol', code: (p) => M.EXAMPLES.marcador.replace('BTN_LOCAL = 2, BTN_VISIT = 3, BTN_RESET = 4', `BTN_LOCAL = ${p.B}, BTN_VISIT = ${p.B2}, BTN_RESET = ${p.B3}`).replace('LiquidCrystal lcd(12, 11, 5, 4, A0, A1)', `LiquidCrystal lcd(${p.LCD})`) },
  { id: 'tmp36', title: '11 · Termómetro TMP36 (analogRead)', code: (p) => `// TMP36: Vout = 0,5 V + 10 mV/°C. Conecta +Vs a ${p.AN === 'A0' ? '5 V' : '3,3 V'}, GND a GND y Vout a ${p.AN}.
const int SENSOR = ${p.AN};
const float VREF = ${p.AN === 'A0' ? '5.0' : '3.3'};
const int MAXADC = ${p.AN === 'A0' ? '1023' : '4095'};

void setup() {
  Serial.begin(9600);
}

void loop() {
  float v = analogRead(SENSOR) * VREF / MAXADC;
  float temperatura = (v - 0.5) * 100.0;
  Serial.print("Vout = ");
  Serial.print(v, 3);
  Serial.print(" V   T = ");
  Serial.print(temperatura, 1);
  Serial.println(" C");
  delay(1000);
}` },
  { id: 'ldr', title: '12 · Luz con LDR y divisor (alumbrado automático)', code: (p) => `// Divisor: ${p.AN === 'A0' ? '5 V' : '3,3 V'} → LDR → ${p.AN} → resistencia de 10 kΩ → GND
// Con poca luz la LDR sube de resistencia y la tensión en ${p.AN} baja.
// LED con su resistencia en el pin ${p.L}.
const int LDR = ${p.AN};
const int LED = ${p.L};
const int UMBRAL = ${p.AN === 'A0' ? 300 : 1200};

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int luz = analogRead(LDR);
  Serial.println(luz);
  if (luz < UMBRAL) digitalWrite(LED, HIGH);
  else digitalWrite(LED, LOW);
  delay(200);
}` },
  { id: 'ntc', title: '13 · Termistor NTC 10 kΩ (ecuación Beta)', code: (p) => `// Divisor: ${p.AN === 'A0' ? '5 V' : '3,3 V'} → 10 kΩ → ${p.AN} → NTC → GND
const int ENTRADA = ${p.AN};
const int MAXADC = ${p.AN === 'A0' ? '1023' : '4095'};
const float R0 = 10000.0;     // resistencia a 25 °C
const float BETA = 3950.0;
const float RFIJA = 10000.0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int lectura = analogRead(ENTRADA);
  float rntc = RFIJA * lectura / (MAXADC - lectura);
  float tk = 1.0 / (1.0 / 298.15 + log(rntc / R0) / BETA);
  Serial.print("R = ");
  Serial.print(rntc, 0);
  Serial.print(" ohm   T = ");
  Serial.print(tk - 273.15, 1);
  Serial.println(" C");
  delay(1000);
}` },
  { id: 'hcsr04', title: '14 · Distancia con HC-SR04 (pulseIn)', code: (p) => `// HC-SR04: VCC a 5 V, GND, TRIG en el pin ${p.B} y ECHO en el pin ${p.B2}.
${p.AN === 'A0' ? '' : '// OJO: ECHO sale a 5 V; en el ESP32 (3,3 V) necesita un divisor de tensión.\n'}const int TRIG = ${p.B};
const int ECHO = ${p.B2};

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duracion = pulseIn(ECHO, HIGH, 30000);   // µs; 0 si no hay eco
  float cm = duracion / 58.0;
  Serial.print("Distancia: ");
  Serial.print(cm, 1);
  Serial.println(" cm");
  delay(300);
}` },
  { id: 'dht', title: '15 · DHT11/DHT22 temperatura y humedad', code: (p) => `// Módulo DHT de 3 patas: VCC, DATA en el pin ${p.B} y GND.
#include <DHT.h>
#define DHTPIN ${p.B}
#define DHTTYPE DHT11        // cámbialo a DHT22 si usas ese sensor
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  delay(2000);                       // el DHT no admite más de una lectura cada 1-2 s
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println("Error al leer el DHT");
    return;
  }
  Serial.print("Humedad: ");
  Serial.print(h, 0);
  Serial.print(" %   Temperatura: ");
  Serial.print(t, 1);
  Serial.println(" C");
}` },
  { id: 'ds18b20', title: '16 · DS18B20 (1-Wire)', code: (p) => `// DS18B20: GND, DQ en el pin ${p.B} con resistencia de 4,7 kΩ a VDD, y VDD.
#include <OneWire.h>
#include <DallasTemperature.h>
OneWire oneWire(${p.B});
DallasTemperature sensores(&oneWire);

void setup() {
  Serial.begin(9600);
  sensores.begin();
}

void loop() {
  sensores.requestTemperatures();            // la conversión de 12 bits tarda 750 ms
  float t = sensores.getTempCByIndex(0);
  if (t == -127.0) Serial.println("Sensor no encontrado (¿falta la resistencia de 4,7 kΩ?)");
  else {
    Serial.print("T = ");
    Serial.print(t, 2);
    Serial.println(" C");
  }
  delay(1000);
}` },
  { id: 'pir', title: '17 · Alarma con sensor PIR y zumbador', code: (p) => `// PIR: VCC a 5 V, OUT en el pin ${p.B}, GND. Zumbador activo en el pin ${p.B2} (con su resistencia si es necesario).
const int PIR = ${p.B};
const int ZUMBADOR = ${p.B2};
bool anterior = false;

void setup() {
  pinMode(PIR, INPUT);
  pinMode(ZUMBADOR, OUTPUT);
  Serial.begin(9600);
  Serial.println("Calentando el PIR...");
}

void loop() {
  bool mov = digitalRead(PIR);
  if (mov && !anterior) Serial.println("¡Movimiento detectado!");
  if (!mov && anterior) Serial.println("Sin movimiento");
  anterior = mov;
  digitalWrite(ZUMBADOR, mov);
}` },
  { id: 'servo', title: '18 · Servo controlado con potenciómetro', code: (p) => `// Potenciómetro: extremos a ${p.AN === 'A0' ? '5 V' : '3,3 V'} y GND, cursor en ${p.AN}. Servo: señal en el pin ${p.PWM}, rojo a 5 V, marrón a GND.
#include <Servo.h>
Servo servo;
const int POT = ${p.AN};

void setup() {
  servo.attach(${p.PWM});
  Serial.begin(9600);
}

void loop() {
  int lectura = analogRead(POT);
  int angulo = map(lectura, 0, ${p.AN === 'A0' ? 1023 : 4095}, 0, 180);
  servo.write(angulo);
  Serial.print("Angulo: ");
  Serial.println(angulo);
  delay(50);
}` },
  { id: 'servo_barrido', title: '19 · Servo: barrido de 0° a 180°', code: (p) => `#include <Servo.h>
Servo servo;

void setup() {
  servo.attach(${p.PWM});
}

void loop() {
  for (int a = 0; a <= 180; a += 2) {
    servo.write(a);
    delay(20);
  }
  for (int a = 180; a >= 0; a -= 2) {
    servo.write(a);
    delay(20);
  }
}` },
  { id: 'melodia', title: '20 · Melodía con zumbador pasivo (tone)', code: (p) => `// Zumbador pasivo entre el pin ${p.B2} y GND (con resistencia de 100 Ω en serie).
const int ZUMBADOR = ${p.B2};
int notas[] = {262, 294, 330, 349, 392, 440, 494, 523};   // do, re, mi, fa, sol, la, si, do

void setup() {
}

void loop() {
  for (int i = 0; i < 8; i++) {
    tone(ZUMBADOR, notas[i], 250);
    delay(300);
  }
  noTone(ZUMBADOR);
  delay(1500);
}` },
  { id: 'joystick', title: '21 · Joystick analógico', code: (p) => `// KY-023: GND, +5V, VRx → ${p.AN}, VRy → ${p.AN2}, SW → pin ${p.B} (INPUT_PULLUP).
const int EJE_X = ${p.AN};
const int EJE_Y = ${p.AN2};
const int BOTON = ${p.B};

void setup() {
  pinMode(BOTON, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  int x = analogRead(EJE_X);
  int y = analogRead(EJE_Y);
  Serial.print("X=");
  Serial.print(x);
  Serial.print("  Y=");
  Serial.print(y);
  Serial.print("  pulsador=");
  Serial.println(digitalRead(BOTON) == LOW ? "SI" : "NO");
  delay(200);
}` },
  { id: 'riego', title: '22 · Riego automático (humedad de suelo + relé)', code: (p) => `// Sensor FC-28: VCC, GND y AO en ${p.AN}. Módulo relé: VCC a 5 V, GND y IN en el pin ${p.B} (se activa con nivel BAJO).
const int SUELO = ${p.AN};
const int RELE = ${p.B};
const int SECO = ${p.AN === 'A0' ? 600 : 2400};     // por encima = suelo seco
const int HUMEDO = ${p.AN === 'A0' ? 400 : 1600};   // por debajo = suelo húmedo (histéresis)
bool regando = false;

void setup() {
  pinMode(RELE, OUTPUT);
  digitalWrite(RELE, HIGH);          // relé en reposo
  Serial.begin(9600);
}

void loop() {
  int humedad = analogRead(SUELO);
  if (!regando && humedad > SECO) regando = true;
  if (regando && humedad < HUMEDO) regando = false;
  digitalWrite(RELE, regando ? LOW : HIGH);
  Serial.print("Sensor: ");
  Serial.print(humedad);
  Serial.println(regando ? "  -> REGANDO" : "  -> parado");
  delay(500);
}` },
  { id: 'rgb', title: '23 · LED RGB con analogWrite', code: (p) => `// LED RGB de cátodo común: R, G y B a los pines ${p.L}, ${p.L2} y ${p.L3} (cada uno con 220 Ω); el cátodo a GND.
const int ROJO = ${p.L}, VERDE = ${p.L2}, AZUL = ${p.L3};

void setup() {
}

void loop() {
  for (int i = 0; i < 256; i += 5) {
    analogWrite(ROJO, i);
    analogWrite(VERDE, 255 - i);
    analogWrite(AZUL, 128);
    delay(30);
  }
}` },
  { id: 'i2cscan', title: '16 · Escáner I²C', code: (p) => `// Muestra las direcciones I²C que responden (SDA/SCL del bus por defecto).
#include <Wire.h>
void setup() { Wire.begin(); Serial.begin(9600); }
void loop() {
  int n = 0;
  for (byte a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) { Serial.print("Dispositivo en 0x"); if (a < 16) Serial.print("0"); Serial.println(a, HEX); n++; }
  }
  Serial.print(n); Serial.println(" encontrados");
  delay(5000);
}
` },
  { id: 'bmp280', title: '17 · BMP280 temperatura y presión (I²C)', code: (p) => `// BMP280: VCC 3,3 V, GND, SDA y SCL al bus I²C. SDO a GND = 0x76.
#include <Wire.h>
#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp;
void setup() {
  Serial.begin(9600);
  if (!bmp.begin(0x76)) { Serial.println("BMP280 no encontrado"); while (1); }
}
void loop() {
  Serial.print("T = "); Serial.print(bmp.readTemperature());
  Serial.print(" C  P = "); Serial.print(bmp.readPressure() / 100.0F);
  Serial.print(" hPa  Alt = "); Serial.println(bmp.readAltitude(1013.25));
  delay(1000);
}
` },
  { id: 'mpu6050', title: '18 · MPU6050 acelerómetro y giroscopio (I²C)', code: (p) => `// MPU6050 (dirección 0x68 con AD0 a GND).
#include <Wire.h>
#include <Adafruit_MPU6050.h>
Adafruit_MPU6050 mpu;
void setup() {
  Serial.begin(9600);
  if (!mpu.begin()) { Serial.println("MPU6050 no encontrado"); while (1); }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
}
void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  Serial.print("ax="); Serial.print(a.acceleration.x, 2);
  Serial.print(" ay="); Serial.print(a.acceleration.y, 2);
  Serial.print(" az="); Serial.print(a.acceleration.z, 2);
  Serial.print(" gz="); Serial.print(g.gyro.z, 2);
  Serial.print(" T="); Serial.println(temp.temperature, 1);
  delay(500);
}
` },
  { id: 'oled', title: '19 · Pantalla OLED SSD1306 128×64 (I²C)', code: (p) => `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(128, 64, &Wire, -1);
void setup() {
  Serial.begin(9600);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { Serial.println("SSD1306 no encontrada"); while (1); }
  display.clearDisplay();
  display.setTextSize(2); display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0); display.println("Hola");
  display.setTextSize(1); display.print("T = "); display.print(23.5, 1);
  display.drawRect(0, 40, 60, 20, SSD1306_WHITE);
  display.fillCircle(100, 50, 10, SSD1306_WHITE);
  display.display();
}
void loop() {}
` },
  { id: 'mcp3008', title: '20 · MCP3008 ADC de 8 canales (SPI)', code: (p) => `// MCP3008: CLK, DOUT (MISO), DIN (MOSI) y CS a los pines SPI; VDD y VREF a 5 V.
#include <SPI.h>
#include <Adafruit_MCP3008.h>
Adafruit_MCP3008 adc;
void setup() { Serial.begin(9600); adc.begin(${p.B}); }
void loop() {
  for (int c = 0; c < 8; c++) { Serial.print(adc.readADC(c)); Serial.print(" "); }
  Serial.println();
  delay(500);
}
` }
];
M.exampleCode = (id, board) => { const e = M.EXAMPLE_LIST.find(x => x.id === id); return e ? e.code(EXP[board] || EXP.UNO) : ''; };

root.Mcu = M;
if (typeof module !== 'undefined') module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
