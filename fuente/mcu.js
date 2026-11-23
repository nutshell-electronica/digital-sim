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
  code = code.replace(/\bSSD1306\w*\s+(\w+)\s*\([^;]*\)\s*;/g, (m, n) => { warn.push('Pantalla OLED no simulada: usa LiquidCrystal.'); return `const ${n} = __lcd();`; });
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
  code = code.replace(/\bsprintf\s*\(\s*(\w+)\s*,/g, '$1 = __sprintf(').replace(/\bsnprintf\s*\(\s*(\w+)\s*,[^,]+,/g, '$1 = __sprintf(');
  code = code.replace(/\bsizeof\s*\(\s*(\w+)\s*\)\s*\/\s*sizeof\s*\(\s*\w+\s*\[\s*0\s*\]\s*\)/g, '$1.length').replace(/\bstrlen\s*\(/g, '__strlen(').replace(/\.length\s*\(\s*\)/g, '.length');
  code = code.replace(/\((?:unsigned\s+)?(?:int|long|short|byte|uint8_t|uint16_t|uint32_t|char)\)\s*\(/g, '__i(').replace(/\((?:unsigned\s+)?(?:int|long|short|byte|uint8_t|uint16_t|uint32_t|char)\)\s*(\w+)/g, '__i($1)').replace(/\((?:float|double)\)\s*/g, '');
  code = code.replace(/\b(?:delay|delayMicroseconds)\s*\(/g, m => 'yield* ' + m);
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
    this.pm = {}; this.out = {}; this.pwm = {}; this.lcd = null; this.err = null; this.ledL = 0; this.wake = 0; this.running = true; this.inl = {}; this.warned = new Set();
    this.idxOf = {}; this.names.forEach((n, i) => { const k = Board.pinNumber(boardName, n); if (k !== null) this.idxOf[k] = i; });
    this.onSerial = o.onSerial;
    try { this.compile(); } catch (e) { this.err = 'Error al compilar: ' + e.message; this.running = false; }
  }
  compile() {
    const tr = M.transpile(this.src); this.tr = tr; const me = this, UNO = this.board === 'UNO';
    const R = {
      HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2, LED_BUILTIN: UNO ? 13 : 2, A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, DEC: 10, HEX: 16, BIN: 2, OCT: 8, PI: Math.PI,
      pinMode: (p, m) => { me.pm[p] = m; delete me.pwm[p]; }, digitalWrite: (p, v) => { me.out[p] = v ? 1 : 0; delete me.pwm[p]; },
      digitalRead: (p) => me.inl[p] ? 1 : 0, analogRead: (p) => { const k = this.idxOf[p]; if (k === undefined || !me.sim) return 0; const v = me.sim.vp[me.part.pins[k]]; return Math.max(0, Math.min(UNO ? 1023 : 4095, Math.round(v / me.vdd * (UNO ? 1023 : 4095)))); },
      analogWrite: (p, v) => { me.pwm[p] = Math.max(0, Math.min(255, v)) / 255; me.pm[p] = 1; },
      delay: function* (ms) { yield ms / 1000; }, delayMicroseconds: function* (us) { yield us / 1e6; }, __t: function* () { yield 8e-6; },
      millis: () => Math.floor(me.t * 1000), micros: () => Math.floor(me.t * 1e6),
      random: (a, b) => b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a)), randomSeed: () => { },
      map: (x, a, b, c, d) => Math.trunc((x - a) * (d - c) / (b - a) + c), constrain: (x, a, b) => Math.min(b, Math.max(a, x)), min: Math.min, max: Math.max, abs: Math.abs, sq: (x) => x * x, sqrt: Math.sqrt, pow: Math.pow, sin: Math.sin, cos: Math.cos, floor: Math.floor, ceil: Math.ceil, round: Math.round, NULL: 0,
      bitRead: (x, n) => (x >> n) & 1, bitWrite: (x, n, b) => b ? x | (1 << n) : x & ~(1 << n), lowByte: (x) => x & 255, highByte: (x) => (x >> 8) & 255, tone: () => { }, noTone: () => { }, attachInterrupt: () => { }, digitalPinToInterrupt: (x) => x,
      __i: (x) => typeof x === 'number' ? Math.trunc(x) : x, __strlen: (s) => String(s).length, __sprintf: sprintf,
      Serial: { begin: () => { }, print: (x, b) => me.sprint(x, b), println: (x, b) => { me.sprint(x === undefined ? '' : x, b); me.sprint('\n'); }, write: (x) => me.sprint(typeof x === 'number' ? String.fromCharCode(x) : x), available: () => 0, read: () => -1, flush: () => { } },
      __lcd: () => me.mkLcd()
    };
    const keys = Object.keys(R), body = `const {${keys.join(',')}} = R;\n${tr.code}\nreturn { setup: (typeof setup === 'function') ? setup : function*(){}, loop: (typeof loop === 'function') ? loop : function*(){} };`;
    const prog = new Function('R', body)(R);
    this.gen = (function* () { yield* prog.setup(); for (;;) { yield* prog.loop(); yield 1e-5; } })();
  }
  mkLcd() { const me = this; if (!this.lcd) this.lcd = { cols: 16, rows: 2, buf: [' '.repeat(16), ' '.repeat(16)], cx: 0, cy: 0, on: true };
    const L = this.lcd, put = (s) => { for (const ch of String(s)) { if (L.cy >= L.rows) break; const r = L.buf[L.cy]; if (L.cx < L.cols) L.buf[L.cy] = r.slice(0, L.cx) + ch + r.slice(L.cx + 1); L.cx++; } };
    return { begin: (c, r) => { L.cols = c || 16; L.rows = r || 2; L.buf = Array.from({ length: L.rows }, () => ' '.repeat(L.cols)); }, setCursor: (c, r) => { L.cx = Math.trunc(c); L.cy = Math.trunc(r); }, print: (x, b) => put(b ? Number(x).toString(b).toUpperCase() : fmtNum2(x)), println: (x) => { put(fmtNum2(x)); L.cy++; L.cx = 0; }, write: (x) => put(typeof x === 'number' ? String.fromCharCode(x) : x), clear: () => { L.buf = L.buf.map(() => ' '.repeat(L.cols)); L.cx = 0; L.cy = 0; }, home: () => { L.cx = 0; L.cy = 0; }, backlight: () => { L.on = true; }, noBacklight: () => { L.on = false; }, init: () => { }, createChar: () => { }, display: () => { }, noDisplay: () => { }, cursor: () => { }, noCursor: () => { }, blink: () => { }, noBlink: () => { } }; }
  sprint(x, b) { const s = typeof x === 'number' ? (b && b !== 10 ? Math.trunc(x).toString(b).toUpperCase() : fmtNum(x)) : String(x); this.serial += s; if (this.serial.length > 20000) this.serial = this.serial.slice(-15000); this.onSerial && this.onSerial(); }
  /* llamado por el motor en cada paso */
  sample(levels, t, sim) {
    this.t = t - this.t0; this.sim = sim;
    for (const k in this.idxOf) this.inl[k] = levels[this.idxOf[k]];
    if (this.running && this.gen) {
      let budget = 4000;
      while (this.wake <= this.t && budget-- > 0) { let r; try { r = this.gen.next(); } catch (e) { this.err = 'Error en ejecución: ' + e.message; this.running = false; break; } if (r.done) { this.running = false; break; } this.wake = Math.max(this.wake, this.t - 2e-3) + (typeof r.value === 'number' ? r.value : 0); }
    }
    const dr = new Array(this.names.length);
    for (const k in this.idxOf) { const i = this.idxOf[k], m = this.pm[k];
      if (m === 1) { let v = this.out[k] || 0; if (this.pwm[k] !== undefined) v = ((this.t * 490) % 1) < this.pwm[k] ? 1 : 0; dr[i] = v ? 1 : 2; } else if (m === 2) dr[i] = 3; }
    this.ledL = (this.out[this.board === 'UNO' ? 13 : 2] || 0) && this.pm[this.board === 'UNO' ? 13 : 2] === 1;
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
  UNO: { L: 8, L2: 9, L3: 10, B: 2, B2: 3, B3: 4, PWM: 9, AN: 'A0', LCD: '12, 11, 5, 4, A0, A1' },
  ESP32: { L: 4, L2: 5, L3: 18, B: 14, B2: 27, B3: 26, PWM: 4, AN: 34, LCD: '21, 22, 5, 18, 19, 23' }
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
  { id: 'marcador', title: '10 · P9.2 Marcador de fútbol', code: (p) => M.EXAMPLES.marcador.replace('BTN_LOCAL = 2, BTN_VISIT = 3, BTN_RESET = 4', `BTN_LOCAL = ${p.B}, BTN_VISIT = ${p.B2}, BTN_RESET = ${p.B3}`).replace('LiquidCrystal lcd(12, 11, 5, 4, A0, A1)', `LiquidCrystal lcd(${p.LCD})`) }
];
M.exampleCode = (id, board) => { const e = M.EXAMPLE_LIST.find(x => x.id === id); return e ? e.code(EXP[board] || EXP.UNO) : ''; };

root.Mcu = M;
if (typeof module !== 'undefined') module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
