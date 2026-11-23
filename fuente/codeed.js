/* Editor de código estilo Arduino IDE: colores, números de línea, sangría automática y autocompletado.
   Técnica: <textarea> transparente sobre un <pre> coloreado con el scroll sincronizado. */
(function (root) {
'use strict';
const CE = {};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---- vocabulario ---- */
const CONTROL = 'if else for while do switch case default break continue return goto'.split(' ');
const TYPES = 'void int long short char byte float double bool boolean unsigned signed const static volatile String uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t size_t word LiquidCrystal LiquidCrystal_I2C'.split(' ');
const CONSTS = 'HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN true false PI DEC HEX BIN OCT A0 A1 A2 A3 A4 A5 NULL'.split(' ');
const OBJECTS = ['Serial'];
/* [nombre, firma, descripción] */
const FUNCS = [
  ['pinMode', '(pin, modo)', 'Configura un pin como INPUT, OUTPUT o INPUT_PULLUP'],
  ['digitalWrite', '(pin, valor)', 'Escribe HIGH o LOW en un pin de salida'],
  ['digitalRead', '(pin)', 'Lee un pin digital: HIGH o LOW'],
  ['analogRead', '(pin)', 'Lee el ADC (UNO: 0–1023; ESP32: 0–4095)'],
  ['analogWrite', '(pin, 0-255)', 'Salida PWM (ciclo de trabajo 0–255)'],
  ['delay', '(ms)', 'Espera en milisegundos'],
  ['delayMicroseconds', '(us)', 'Espera en microsegundos'],
  ['millis', '()', 'Milisegundos desde el arranque'],
  ['micros', '()', 'Microsegundos desde el arranque'],
  ['map', '(x, deMin, deMax, aMin, aMax)', 'Cambia de escala un valor'],
  ['constrain', '(x, min, max)', 'Limita x entre min y max'],
  ['random', '(min, max)', 'Número aleatorio en [min, max)'],
  ['randomSeed', '(semilla)', 'Inicializa el generador aleatorio'],
  ['abs', '(x)', 'Valor absoluto'], ['min', '(a, b)', 'Mínimo'], ['max', '(a, b)', 'Máximo'],
  ['sq', '(x)', 'Cuadrado'], ['sqrt', '(x)', 'Raíz cuadrada'], ['pow', '(base, exp)', 'Potencia'],
  ['sin', '(rad)', 'Seno'], ['cos', '(rad)', 'Coseno'],
  ['bitRead', '(x, n)', 'Lee el bit n'], ['bitWrite', '(x, n, bit)', 'Escribe el bit n'],
  ['lowByte', '(x)', 'Byte bajo'], ['highByte', '(x)', 'Byte alto'],
  ['sprintf', '(buf, formato, ...)', 'Formatea texto: %d %02d %s %c %x %f'],
  ['strlen', '(texto)', 'Longitud de una cadena'],
  ['tone', '(pin, frecuencia)', 'Genera un tono (no simulado)'], ['noTone', '(pin)', 'Detiene el tono (no simulado)'],
  ['setup', '()', 'Se ejecuta una vez al arrancar'], ['loop', '()', 'Se repite indefinidamente']
];
const SERIAL = [['begin', '(baudios)', 'Abre el puerto serie'], ['print', '(valor)', 'Escribe sin salto de línea'], ['println', '(valor)', 'Escribe con salto de línea'], ['write', '(byte)', 'Escribe un byte/carácter'], ['available', '()', 'Bytes disponibles (no simulado)'], ['read', '()', 'Lee un byte (no simulado)']];
const LCD = [['begin', '(columnas, filas)', 'Inicializa la pantalla'], ['setCursor', '(columna, fila)', 'Coloca el cursor'], ['print', '(valor)', 'Escribe en la pantalla'], ['write', '(carácter)', 'Escribe un carácter'], ['clear', '()', 'Borra la pantalla'], ['home', '()', 'Cursor a (0,0)'], ['backlight', '()', 'Enciende la retroiluminación'], ['noBacklight', '()', 'Apaga la retroiluminación'], ['display', '()', 'Muestra el contenido'], ['noDisplay', '()', 'Oculta el contenido'], ['cursor', '()', 'Muestra el cursor'], ['noCursor', '()', 'Oculta el cursor'], ['blink', '()', 'Cursor parpadeante'], ['noBlink', '()', 'Sin parpadeo']];
/* plantillas: «|» marca dónde queda el cursor */
const SNIPS = [
  ['for', 'bucle for', 'for (int i = 0; i < |; i++) {\n  \n}'],
  ['while', 'bucle while', 'while (|) {\n  \n}'],
  ['if', 'condición if', 'if (|) {\n  \n}'],
  ['ifelse', 'if … else', 'if (|) {\n  \n} else {\n  \n}'],
  ['switch', 'switch / case', 'switch (|) {\n  case 0:\n    break;\n  default:\n    break;\n}'],
  ['void', 'función void', 'void |() {\n  \n}'],
  ['setup', 'void setup()', 'void setup() {\n  |\n}'],
  ['loop', 'void loop()', 'void loop() {\n  |\n}'],
  ['serial', 'abrir el serie', 'Serial.begin(9600);'],
  ['lcd', 'declarar una LCD', 'LiquidCrystal lcd(12, 11, 5, 4, A0, A1);']
];
CE.WORDS = { CONTROL, TYPES, CONSTS, FUNCS, SERIAL, LCD };

const isW = (c) => /[A-Za-z0-9_]/.test(c);
const fnSet = new Set(FUNCS.map(f => f[0])), ctl = new Set(CONTROL), typ = new Set(TYPES), cns = new Set(CONSTS), obj = new Set(OBJECTS);
const methSet = new Set(SERIAL.concat(LCD).map(f => f[0]));
const RX = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(^[ \t]*#[ \t]*\w+)|(\b0[xXbB][0-9A-Fa-f]+\b|\b\d+\.?\d*(?:[eE][-+]?\d+)?[uUlLfF]*\b)|([A-Za-z_]\w*)/gm;
/* colores de Arduino IDE: control verde, tipos y constantes azul-verdoso, funciones naranja, comentarios gris */
CE.highlight = function (src) {
  let out = '', last = 0, m; RX.lastIndex = 0;
  while ((m = RX.exec(src))) {
    out += esc(src.slice(last, m.index)); last = m.index + m[0].length; const t = esc(m[0]);
    if (m[1]) out += `<i class="c">${t}</i>`;
    else if (m[2]) out += `<i class="s">${t}</i>`;
    else if (m[3]) out += `<i class="p">${t}</i>`;
    else if (m[4]) out += `<i class="n">${t}</i>`;
    else {
      const w = m[0], prev = src[m.index - 1], nxt = src.slice(last).match(/^\s*\(/);
      if (ctl.has(w)) out += `<i class="k">${t}</i>`;
      else if (typ.has(w) || cns.has(w)) out += `<i class="t">${t}</i>`;
      else if (obj.has(w)) out += `<i class="t">${t}</i>`;
      else if (fnSet.has(w) && nxt) out += `<i class="f">${t}</i>`;
      else if (prev === '.' && methSet.has(w)) out += `<i class="f">${t}</i>`;
      else out += t;
    }
  }
  return out + esc(src.slice(last));
};

/* ---- editor ---- */
class Editor {
  constructor(host, o = {}) {
    this.host = host; this.o = o; this.ac = null;
    host.classList.add('ce');
    host.innerHTML = `<div class="ce-g"><div></div></div><div class="ce-w"><pre class="ce-p" aria-hidden="true"><code></code></pre><textarea class="ce-t" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea></div><div class="ce-ac" hidden></div>`;
    this.g = host.querySelector('.ce-g > div'); this.p = host.querySelector('.ce-p code'); this.ta = host.querySelector('.ce-t'); this.pop = host.querySelector('.ce-ac');
    const ta = this.ta, d = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    Object.defineProperty(ta, 'value', { get() { return d.get.call(ta); }, set: (v) => { d.set.call(ta, v); this.render(); } });
    this.mw = null;
    ta.addEventListener('input', () => { this.render(); this.o.onInput && this.o.onInput(); this.suggest(); });
    ta.addEventListener('scroll', () => this.sync());
    ta.addEventListener('keydown', (e) => this.key(e));
    ta.addEventListener('blur', () => setTimeout(() => this.hide(), 120));
    ta.addEventListener('click', () => this.hide());
    this.pop.addEventListener('mousedown', (e) => { e.preventDefault(); const li = e.target.closest('[data-i]'); if (li) this.accept(+li.dataset.i); });
    this.render();
  }
  get value() { return this.ta.value; }
  set value(v) { this.ta.value = v; }
  metrics() { if (!this.mw) { const s = document.createElement('span'); s.className = 'ce-m'; s.textContent = 'M'.repeat(40); this.host.appendChild(s); this.mw = s.getBoundingClientRect().width / 40 || 7.5; s.remove(); } return this.mw; }
  render() {
    const v = this.ta.value; this.p.innerHTML = CE.highlight(v) + '\n';
    const n = v.split('\n').length; if (this.nl !== n) { this.nl = n; let h = ''; for (let i = 1; i <= n; i++) h += i + '\n'; this.g.textContent = h; }
    this.sync();
  }
  sync() { const t = this.ta; this.p.style.transform = `translate(${-t.scrollLeft}px,${-t.scrollTop}px)`; this.g.style.transform = `translateY(${-t.scrollTop}px)`; }
  /* ---- teclado ---- */
  edit(start, end, text, caret) { const ta = this.ta; ta.focus(); ta.setSelectionRange(start, end); if (!document.execCommand || !document.execCommand('insertText', false, text)) { ta.setRangeText(text, start, end, 'end'); ta.dispatchEvent(new Event('input')); } if (caret !== undefined) ta.setSelectionRange(caret, caret); }
  key(e) {
    const ta = this.ta, v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (this.ac) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); this.accept(this.ac.i); return; }
      if (e.key === 'Escape') { e.preventDefault(); this.hide(); return; }
    }
    if (e.key === ' ' && e.ctrlKey) { e.preventDefault(); this.suggest(true); return; }
    if (e.key === 'Tab') {
      e.preventDefault(); const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (s !== en && v.slice(s, en).includes('\n')) { // sangrar / desangrar bloque
        const ee = v.indexOf('\n', en) < 0 ? v.length : en; const blk = v.slice(ls, ee).split('\n');
        const nb = blk.map(l => e.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l).join('\n'); this.edit(ls, ee, nb); ta.setSelectionRange(ls, ls + nb.length); return;
      }
      if (e.shiftKey) { const m = v.slice(ls, s).match(/^ {1,2}/); if (m) this.edit(ls, ls + m[0].length, ''); return; }
      this.edit(s, en, '  '); return;
    }
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault(); const ls = v.lastIndexOf('\n', s - 1) + 1, ind = v.slice(ls, s).match(/^[ \t]*/)[0], before = v.slice(ls, s).trimEnd(), after = v[en];
      if (before.endsWith('{') && after === '}') { const t = '\n' + ind + '  \n' + ind; this.edit(s, en, t, s + 1 + ind.length + 2); }
      else this.edit(s, en, '\n' + ind + (before.endsWith('{') ? '  ' : '')); return;
    }
    if (e.key === '}' && /^[ \t]+$/.test(v.slice(v.lastIndexOf('\n', s - 1) + 1, s)) && s === en) { e.preventDefault(); const ls = v.lastIndexOf('\n', s - 1) + 1, ind = v.slice(ls, s); this.edit(ls, s, ind.slice(0, Math.max(0, ind.length - 2)) + '}'); return; }
    if (e.key === '/' && (e.ctrlKey || e.metaKey)) { // comentar / descomentar líneas
      e.preventDefault(); const ls = v.lastIndexOf('\n', s - 1) + 1, ee = v.indexOf('\n', en) < 0 ? v.length : v.indexOf('\n', en);
      const ls_ = v.slice(ls, ee).split('\n'), all = ls_.every(l => /^\s*\/\//.test(l) || !l.trim());
      const nb = ls_.map(l => all ? l.replace(/^(\s*)\/\/ ?/, '$1') : l.replace(/^(\s*)/, '$1// ')).join('\n'); this.edit(ls, ee, nb); ta.setSelectionRange(ls, ls + nb.length); return;
    }
  }
  /* ---- autocompletado ---- */
  context() {
    const ta = this.ta, v = ta.value, s = ta.selectionStart; if (s !== ta.selectionEnd) return null;
    const ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s);
    if (/\/\/|["']/.test(line.replace(/'[^']*'|"[^"]*"/g, ''))) { if (/\/\//.test(line)) return null; }
    const m = line.match(/([A-Za-z_]\w*)\.([A-Za-z_]\w*)?$/);
    if (m) return { kind: 'm', obj: m[1], prefix: m[2] || '', s: s - (m[2] || '').length, ls };
    const w = line.match(/[A-Za-z_]\w*$/); return { kind: 'w', prefix: w ? w[0] : '', s: s - (w ? w[0].length : 0), ls };
  }
  items(c, force) {
    const v = this.ta.value, pre = c.prefix.toLowerCase(), res = [];
    const add = (n, sig, desc, t, ins) => { if (!pre || n.toLowerCase().startsWith(pre)) res.push({ n, sig, desc, t, ins: ins || n }); };
    if (c.kind === 'm') {
      const lcds = new Set([...v.matchAll(/\bLiquidCrystal(?:_I2C)?\s+(\w+)/g)].map(x => x[1]));
      const list = c.obj === 'Serial' ? SERIAL : lcds.has(c.obj) ? LCD : [];
      list.forEach(f => add(f[0], f[1], f[2], 'f', f[0] + (f[1] === '()' ? '()' : '(|)')));
    } else {
      if (!pre && !force) return [];
      if (pre.length < 1 && !force) return [];
      SNIPS.forEach(sn => add(sn[0], '', sn[1], 's', sn[2]));
      FUNCS.forEach(f => { if (f[0] !== 'setup' && f[0] !== 'loop') add(f[0], f[1], f[2], 'f', f[0] + (f[1] === '()' ? '()' : '(|)')); });
      CONSTS.forEach(k => add(k, '', 'constante', 'c')); OBJECTS.forEach(k => add(k, '', 'puerto serie', 'c')); TYPES.forEach(k => add(k, '', 'tipo', 't'));
      CONTROL.forEach(k => add(k, '', 'palabra clave', 'k'));
      const seen = new Set(res.map(r => r.n)), code = v.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ' ');
      [...code.matchAll(/\b[A-Za-z_]\w{2,}\b/g)].forEach(x => { const n = x[0]; if (!seen.has(n) && !ctl.has(n) && !typ.has(n) && !cns.has(n) && n !== c.prefix) { seen.add(n); add(n, '', 'de tu programa', 'v'); } });
    }
    res.sort((a, b) => (a.n.toLowerCase() === pre ? 1 : 0) - (b.n.toLowerCase() === pre ? 1 : 0)); // la coincidencia exacta al final
    const uniq = []; const k = new Set(); res.forEach(r => { const id = r.n + r.t; if (!k.has(id)) { k.add(id); uniq.push(r); } });
    return uniq.slice(0, 40);
  }
  suggest(force) {
    const c = this.context(); if (!c) return this.hide();
    let it = this.items(c, force); if (!force && c.kind === 'w' && it.length === 1 && it[0].n === c.prefix) it = [];
    if (!it.length) return this.hide();
    this.ac = { items: it, i: 0, c }; this.draw();
  }
  draw() {
    const a = this.ac, ta = this.ta, v = ta.value, cw = this.metrics(), lh = 18, s = ta.selectionStart;
    const ls = v.lastIndexOf('\n', s - 1) + 1, row = v.slice(0, s).split('\n').length - 1, col = a.c.s - ls;
    this.pop.innerHTML = a.items.map((x, i) => `<div data-i="${i}" class="${i === a.i ? 'on' : ''}"><b class="ty ${x.t}">${{ f: 'ƒ', s: '▤', c: 'c', t: 'T', k: 'k', v: 'v' }[x.t]}</b><span class="nm">${esc(x.n)}</span><span class="sg">${esc(x.sig)}</span><span class="ds">${esc(x.desc)}</span></div>`).join('');
    const g = this.host.querySelector('.ce-g').offsetWidth, W = this.host.clientWidth, H = this.host.clientHeight;
    let x = g + 8 + col * cw - ta.scrollLeft, y = 6 + (row + 1) * lh - ta.scrollTop;
    this.pop.hidden = false; const pw = this.pop.offsetWidth, ph = this.pop.offsetHeight;
    if (x + pw > W - 4) x = Math.max(4, W - pw - 4); if (y + ph > H - 4) y = Math.max(4, 6 + row * lh - ta.scrollTop - ph);
    this.pop.style.left = x + 'px'; this.pop.style.top = y + 'px';
    const on = this.pop.querySelector('.on'); on && on.scrollIntoView({ block: 'nearest' });
  }
  move(d) { const a = this.ac; a.i = (a.i + d + a.items.length) % a.items.length; this.draw(); }
  hide() { this.ac = null; this.pop.hidden = true; }
  accept(i) {
    const a = this.ac; if (!a) return; const it = a.items[i], ta = this.ta, v = ta.value, s = ta.selectionStart; this.hide();
    let ins = it.ins; const ls = v.lastIndexOf('\n', a.c.s - 1) + 1, ind = v.slice(ls, a.c.s).match(/^[ \t]*/)[0];
    if (it.t === 's' || ins.includes('\n')) ins = ins.replace(/\n/g, '\n' + ind);
    if (it.t === 'f' && v.slice(s).startsWith('(')) ins = it.n;   // ya hay paréntesis: no duplicar
    const k = ins.indexOf('|'), text = ins.replace('|', '');
    this.edit(a.c.s, s, text, a.c.s + (k < 0 ? text.length : k)); this.o.onInput && this.o.onInput();
  }
}
CE.Editor = Editor;
root.CodeEd = CE;
if (typeof module !== 'undefined') module.exports = CE;
})(typeof window !== 'undefined' ? window : globalThis);
