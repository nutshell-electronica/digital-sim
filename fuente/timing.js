/* Diagrama de tiempos / analizador lógico (canvas) */
(function (root) {
'use strict';
const fmtT = (s) => { const a = Math.abs(s); if (a === 0) return '0'; if (a < 1e-6) return (s * 1e9).toFixed(0) + ' ns'; if (a < 1e-3) return (s * 1e6).toFixed(a < 1e-5 ? 1 : 0) + ' µs'; if (a < 1) return (s * 1e3).toFixed(a < 1e-2 ? 2 : 1) + ' ms'; return s.toFixed(2) + ' s'; };
const fmtF = (f) => f >= 1e6 ? (f / 1e6).toFixed(2) + ' MHz' : f >= 1e3 ? (f / 1e3).toFixed(2) + ' kHz' : f.toFixed(2) + ' Hz';
class Timing {
  constructor(canvas, o = {}) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.ch = []; this.span = o.span || 0.05; this.follow = true; this.tEnd = 0;
    this.th = o.th || [1.5, 3.5]; this.rowH = o.rowH || 38; this.curs = [null, null]; this.analog = false; this.labelW = 96;
    canvas.addEventListener('mousedown', (e) => this.click(e)); canvas.addEventListener('mousemove', (e) => this.hover(e));
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); const f = e.deltaY > 0 ? 1.25 : 0.8; this.span = Math.min(60, Math.max(1e-6, this.span * f)); this.draw(); }, { passive: false });
  }
  setChannels(ch) { this.ch = ch; }
  pos(e) { const r = this.c.getBoundingClientRect(), x = (e.clientX - r.left) * (this.c.width / r.width) / (this.dpr || 1); const W = this.c.width / (this.dpr || 1) - this.labelW - 8; return { x, W, t: this.t0 + (x - this.labelW) / W * this.span }; }
  near(p) { let b = -1, bd = 7; this.curs.forEach((c, k) => { if (c === null) return; const d = Math.abs(this.labelW + (c - this.t0) / this.span * p.W - p.x); if (d <= bd) { bd = d; b = k; } }); return b; }
  click(e) {
    const p = this.pos(e); if (p.x < this.labelW) return;
    let k = this.near(p);
    if (k < 0) { k = this.curs.findIndex(c => c === null); if (k < 0) return; this.curs[k] = p.t; }
    this.drag = k; this.follow = false; this.draw();
    const mv = (ev) => { if (this.drag == null) return; const q = this.pos(ev); this.curs[this.drag] = q.t; this.draw(); };
    const up = () => { this.drag = null; window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  }
  hover(e) { if (this.drag != null) return; const p = this.pos(e); this.c.style.cursor = p.x >= this.labelW && this.near(p) >= 0 ? 'ew-resize' : ''; }
  toggleCursor(k) { if (this.curs[k] !== null) this.curs[k] = null; else this.curs[k] = this.t0 + this.span * (k ? 0.6 : 0.4); this.draw(); }
  clearCursors() { this.curs = [null, null]; this.draw(); }
  level(w, i) { for (; i >= 0; i--) { if (w.v[i] >= this.th[1]) return 1; if (w.v[i] <= this.th[0]) return 0; } return 0; }
  draw() {
    const c = this.c, dpr = this.dpr = window.devicePixelRatio || 1;
    const cw = c.clientWidth, chh = Math.max(60, this.ch.length * this.rowH + 34);
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(chh * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(chh * dpr); c.style.height = chh + 'px'; }
    const g = this.ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, chh);
    g.fillStyle = '#F9F8F6'; g.fillRect(0, 0, cw, chh);
    const W = cw - this.labelW - 8, x0 = this.labelW;
    let tmax = 0; this.ch.forEach(h => { const w = h.w; if (w && w.t.length) tmax = Math.max(tmax, w.t[w.t.length - 1]); });
    if (this.follow) this.tEnd = tmax; const t1 = this.tEnd, t0 = this.t0 = t1 - this.span;
    g.font = '11px Arial'; g.textBaseline = 'middle';
    // rejilla de tiempo
    const stepRaw = this.span / 8, p10 = Math.pow(10, Math.floor(Math.log10(stepRaw))); let step = p10; [1, 2, 5, 10].some(m => (step = m * p10) >= stepRaw);
    g.strokeStyle = '#E2DFD8'; g.fillStyle = '#696C69'; g.lineWidth = 1;
    for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) { const x = x0 + (t - t0) / this.span * W; g.beginPath(); g.moveTo(x, 16); g.lineTo(x, chh); g.stroke(); g.fillText(fmtT(t), x + 3, 8); }
    this.ch.forEach((h, k) => {
      const y0 = 20 + k * this.rowH, yh = y0 + 6, yl = y0 + this.rowH - 10, w = h.w;
      g.fillStyle = '#1F2421'; g.font = '12px Arial'; g.fillText(h.name, 8, (yh + yl) / 2);
      g.strokeStyle = '#E2DFD8'; g.beginPath(); g.moveTo(0, y0 + this.rowH - 2); g.lineTo(cw, y0 + this.rowH - 2); g.stroke();
      if (!w || !w.t.length) return;
      // índices de la ventana
      let lo = 0, hi = w.t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (w.t[m] < t0) lo = m + 1; else hi = m; }
      const start = Math.max(0, lo - 1), n = w.t.length;
      const bk = new Int8Array(Math.ceil(W) + 2).fill(-1), mn = new Uint8Array(bk.length).fill(2), mx = new Uint8Array(bk.length), av = new Float32Array(bk.length).fill(NaN);
      let prevL = this.level(w, start);
      for (let i = start; i < n; i++) {
        const t = w.t[i]; if (t > t1) break;
        const px = Math.floor((t - t0) / this.span * W); if (px < 0) { prevL = this.level(w, i); continue; }
        const L = w.v[i] >= this.th[1] ? 1 : w.v[i] <= this.th[0] ? 0 : prevL; prevL = L;
        if (L < mn[px]) mn[px] = L; if (L > mx[px]) mx[px] = L; bk[px] = L; av[px] = w.v[i];
      }
      let cur = this.level(w, start);
      g.lineWidth = 1.8; g.strokeStyle = h.color || '#1F2421';
      if (this.analog) {
        g.beginPath(); let last = null; const vmax = h.vmax || 5.5;
        for (let x = 0; x < bk.length; x++) { if (!isNaN(av[x])) last = av[x]; if (last === null) continue; const yy = yl - Math.max(0, Math.min(1, last / vmax)) * (yl - yh); if (x === 0) g.moveTo(x0 + x, yy); else g.lineTo(x0 + x, yy); }
        g.stroke(); return;
      }
      g.beginPath(); g.moveTo(x0, cur ? yh : yl);
      for (let x = 0; x < bk.length; x++) {
        if (bk[x] < 0) continue;
        const first = mn[x] === mx[x] ? mn[x] : -1;
        if (first === -1) { // pulso rápido o glitch dentro del píxel
          if (cur !== 1) { g.lineTo(x0 + x, yl); g.lineTo(x0 + x, yh); } else { g.lineTo(x0 + x, yh); }
          g.lineTo(x0 + x, yl); g.lineTo(x0 + x, bk[x] ? yh : yl); cur = bk[x]; continue;
        }
        if (first !== cur) { g.lineTo(x0 + x, cur ? yh : yl); g.lineTo(x0 + x, first ? yh : yl); cur = first; }
      }
      g.lineTo(x0 + W, cur ? yh : yl); g.stroke();
    });
    // cursores
    this.curs.forEach((t, i) => { if (t === null) return; const x = x0 + (t - t0) / this.span * W; g.strokeStyle = '#B85D34'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, 14); g.lineTo(x, chh); g.stroke(); g.setLineDash([]); g.fillStyle = '#B85D34'; g.fillText(i ? 'B' : 'A', x + 3, chh - 8); });
    if (this.curs[0] !== null && this.curs[1] !== null) {
      const d = Math.abs(this.curs[1] - this.curs[0]); const txt = `Δt = ${fmtT(d)}  ·  1/Δt = ${d > 0 ? fmtF(1 / d) : '—'}`;
      g.font = 'bold 12px Arial'; g.fillStyle = '#B85D34'; g.fillText(txt, x0 + 8, chh - 8);
    }
    this.meas = null;
    const pb = c.parentElement; if (pb) pb.querySelectorAll('[data-cur]').forEach(b => b.classList.toggle('on', this.curs[+b.dataset.cur] !== null));
  }
  /* medidas automáticas del canal k sobre la ventana: periodo, frecuencia, ciclo de trabajo */
  measure(k) {
    const h = this.ch[k], w = h && h.w; if (!w || w.t.length < 3) return null;
    const t1 = this.tEnd, t0 = t1 - this.span, ed = [], fall = []; let pl = null;
    for (let i = 0; i < w.t.length; i++) { if (w.t[i] < t0) { pl = w.v[i] >= this.th[1] ? 1 : 0; continue; } const l = w.v[i] >= this.th[1] ? 1 : w.v[i] <= this.th[0] ? 0 : pl; if (pl === 0 && l === 1) ed.push(w.t[i]); if (pl === 1 && l === 0) fall.push(w.t[i]); pl = l; }
    if (ed.length < 2) return null;
    const per = (ed[ed.length - 1] - ed[0]) / (ed.length - 1); let th = null;
    const f0 = fall.find(f => f > ed[0]); if (f0 !== undefined) th = (f0 - ed[0]) / per;
    return { period: per, freq: 1 / per, duty: th, tH: th !== null ? th * per : null };
  }
}

/* Autoajuste (como el autoset de un osciloscopio, pero para el simulador): toma el reloj más rápido del circuito, muestra 20 periodos
   en la ventana del analizador y fija velocidad y paso para que la señal cruce la pantalla en unos 6,5 s de tiempo real. */
Timing.autoset = function (ed) {
  const clk = ed.sim.parts.filter(p => p.type === 'SRC' && p.mode === 'clock' && p.hz > 0);
  const say = (msg) => ed.onChange && ed.onChange('toast', { msg });
  if (!clk.length) { say('Autoajuste: no hay ninguna señal de reloj en el circuito. Añade un generador de reloj.'); return false; }
  const T = 1 / Math.max(...clk.map(p => p.hz)), span = 20 * T, speed = span / 6.5;
  let dt = Math.min(1e-2, Math.max(2e-6, T / 100)); if (speed / dt > 60000) dt = speed / 60000;       // que el navegador aguante el ritmo
  const r = ed.root, sel = (a) => r.querySelector(`[data-a=${a}]`);
  const put = (s, v, lab) => { s.querySelectorAll('[data-auto]').forEach(o => o.remove()); let o = [...s.options].find(x => Math.abs(+x.value / v - 1) < 1e-6); if (!o) { o = document.createElement('option'); o.value = String(v); o.textContent = lab; o.dataset.auto = '1'; s.appendChild(o); } s.value = o.value; };
  const fT = (x) => x >= 1 ? (+x.toFixed(1)).toString().replace('.', ',') + ' s' : x >= 1e-3 ? (+(x * 1e3).toFixed(2)).toString().replace('.', ',') + ' ms' : (+(x * 1e6).toFixed(1)).toString().replace('.', ',') + ' µs';
  const dtChanged = Math.abs(ed.dt / dt - 1) > 1e-6;
  ed.dt = dt; put(sel('dt'), dt, fT(dt)); if (dtChanged) ed.recompile();
  ed.speed = speed; put(sel('speed'), speed, '≈ ' + (+speed.toPrecision(2)).toString().replace('.', ',') + '×');
  ed.timing.span = span; ed.timing.follow = true;
  if (!ed.running) { ed.running = true; const b = sel('run'); if (b) b.textContent = '❚❚ Pausar'; }
  ed.dirty = true; ed.timing.draw();
  say(`Autoajuste: reloj de ${fmtF(1 / T)}; ventana de ${fT(span)} (20 periodos) que cruza la pantalla en unos 6,5 s.` + (T / dt < 10 ? ' Aviso: el reloj es más rápido que el paso mínimo; la señal saldrá deformada.' : ''));
  return true;
};
Timing.fmtT = fmtT; Timing.fmtF = fmtF;
root.Timing = Timing;
if (typeof module !== 'undefined') module.exports = Timing;
})(typeof window !== 'undefined' ? window : globalThis);
