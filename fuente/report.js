/* Generador de informes de prácticas: datos de las simulaciones + huecos para lo medido en el taller */
(function (root) {
'use strict';
const R = {};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (x, d = 2) => (+x).toFixed(d).replace('.', ',');
R.GLOSS = [
  ['TTL', 'Transistor-Transistor Logic: familia lógica de entradas que «tiran» corriente hacia fuera (74LS).'], ['CMOS', 'Complementary MOS: familia lógica de entradas de impedancia muy alta (74HC).'],
  ['VOH', 'Tensión de salida en nivel alto. Mínima garantizada en la hoja de datos.'], ['VOL', 'Tensión de salida en nivel bajo. Máxima garantizada.'], ['VIH', 'Tensión mínima que la entrada reconoce como 1.'], ['VIL', 'Tensión máxima que la entrada reconoce como 0.'],
  ['NMH', 'Margen de ruido en alto: NMH = VOH − VIH.'], ['NML', 'Margen de ruido en bajo: NML = VIL − VOL.'], ['Pull-up', 'Resistencia que lleva un nudo a +VCC cuando nada más lo fija.'], ['Pull-down', 'Resistencia que lleva un nudo a masa cuando nada más lo fija.'],
  ['Karnaugh', 'Mapa de celdas ordenadas en código Gray para simplificar funciones lógicas agrupando unos.'], ['Minitérmino', 'Producto de todas las variables, directas o negadas, que vale 1 en una sola fila.'], ['X', 'Condición indiferente: la salida puede tomarse como 0 o como 1.'],
  ['JK', 'Biestable con entradas J y K; con J = K = 1 cambia en cada flanco.'], ['PR', 'Preset: pone el biestable a 1 de forma asíncrona (activo a nivel bajo).'], ['CLR', 'Clear: pone el biestable a 0 de forma asíncrona (activo a nivel bajo).'],
  ['555', 'Temporizador integrado. Monoestable: T = 1,1·R·C. Astable: tH = 0,693·(RA+RB)·C; tL = 0,693·RB·C.'], ['PWM', 'Modulación por ancho de pulso: la señal cambia su ciclo de trabajo.'], ['I²C', 'Bus serie de dos hilos (SDA y SCL) con dirección por dispositivo.']
];
R.state = { student: '', date: new Date().toISOString().slice(0, 10), fields: {}, photos: {}, extra: {} };

/* tablas de funcionamiento calculadas a partir de las definiciones */
function icTables(p) {
  if (p.id === '4.1') {
    const pat = [0, 1, 0, 0, 1, 1, 0, 1]; let h = '<table class="rt"><tr><th>G̅</th><th>C B A</th><th>Y esperada</th><th>W esperada</th><th>Y simulada</th><th class="fill">Y medida</th></tr>';
    for (let s = 0; s < 8; s++) h += `<tr><td>0</td><td>${s.toString(2).padStart(3, '0')}</td><td>${pat[s]}</td><td>${pat[s] ? 0 : 1}</td><td>${pat[s]}</td><td class="fill" contenteditable data-f="p41_${s}"></td></tr>`;
    return h + '</table><p class="mut">Patrón D7…D0 = 1 0 1 1 0 0 1 0. Con G̅ = 1 la salida Y queda a 0 y W a 1.</p>';
  }
  if (p.id === '4.2') { let h = '<table class="rt"><tr><th>D C B A</th><th>Decimal</th><th>Salida a 0 esperada</th><th class="fill">Salida a 0 medida</th></tr>'; for (let v = 0; v < 10; v++) h += `<tr><td>${v.toString(2).padStart(4, '0')}</td><td>${v}</td><td>${v}</td><td class="fill" contenteditable data-f="p42_${v}"></td></tr>`; return h + '</table>'; }
  return '';
}

/* medidas del analizador / pulsos */
function pulseWidths(w, th) { const r = []; let up = null, pl = 0; for (let i = 0; i < w.t.length; i++) { const l = w.v[i] >= th[1] ? 1 : w.v[i] <= th[0] ? 0 : pl; if (l && !pl) up = w.t[i]; if (!l && pl && up !== null) { r.push(w.t[i] - up); up = null; } pl = l; } return r; }

R.build = function (app) {
  const p = Practicas.get(app.practice || '3.1'), S = R.state, km = app.kmap.data(), board = app.board.board;
  const f = (k, ph) => `<span class="fillbox" contenteditable data-f="${k}" data-ph="${esc(ph || '')}">${esc(S.fields[k] || '')}</span>`;
  const block = (k, ph) => `<div class="fillblk" contenteditable data-f="${k}" data-ph="${esc(ph || 'Escribe aquí…')}">${esc(S.fields[k] || '')}</div>`;
  const photo = (k, label) => `<div class="photo" data-ph="${k}">${S.photos[k] ? `<img src="${S.photos[k]}">` : `<label>${esc(label)}<br><small>Pulsa para cargar una foto o captura</small><input type="file" accept="image/*" data-up="${k}"></label>`}</div>`;
  const shot = (cap, d) => d ? `<figure><div class="sv">${d.svg}</div><figcaption>${esc(cap)}</figcaption></figure>` : `<p class="mut">(Aún no hay captura: pulsa «Captura» en el módulo correspondiente.)</p>`;
  const sections = [];
  const sec = (title, body) => sections.push({ title, body });

  sec('Qué se ha hecho', `<p>${esc(p.brief)}</p>${block('que', 'Resume con tus palabras qué has montado y qué querías comprobar.')}`);
  if (['comb', 'fpga'].includes(p.kind) || p.kmap) {
    const names = km.st.names, n = km.st.n;
    let tt = `<table class="rt"><tr>${names.map(v => `<th>${esc(v)}</th>`).join('')}${km.st.outs.map(o => `<th class="o">${esc(o.name)}</th>`).join('')}<th>Fila</th></tr>`;
    for (let m = 0; m < (1 << n); m++) tt += `<tr>${m.toString(2).padStart(n, '0').split('').map(b => `<td>${b}</td>`).join('')}${km.st.outs.map(o => `<td class="o">${o.t[m] === 2 ? 'X' : o.t[m]}</td>`).join('')}<td>${m}</td></tr>`;
    sec('Tabla de verdad', tt + '</table>' + `<table class="rt"><tr><th>Función</th><th>Expresión</th></tr>${km.res.map(r => `<tr><td>${esc(r.name)} = ${esc(KM.sigmaText(r.arr))}</td><td></td></tr>`).join('')}</table>`);
    sec('Mapas de Karnaugh y simplificación', `<div class="maps">${km.res.map(r => `<figure>${KM.mapSVG(n, r.arr, names, r, {})}<figcaption>Mapa de ${esc(r.name)}</figcaption></figure>`).join('')}</div>` +
      `<table class="rt"><tr><th>Resultado</th><th>Expresión simplificada agrupando los 1</th><th>X como 1</th></tr>${km.res.map(r => `<tr><td>${esc(r.name)} =</td><td class="ex">${r.html}</td><td>${r.dcUse.filter(d => d.as1).map(d => d.m).join(', ') || '—'}</td></tr>`).join('')}</table>`);
    const g1 = KM.countGates(KM.buildGraph(km.res.map(r => ({ name: r.name, terms: r.cover, zero: r.zero, one: r.one })), names, n, 'std')), g2 = KM.countGates(KM.buildGraph(km.res.map(r => ({ name: r.name, terms: r.cover, zero: r.zero, one: r.one })), names, n, 'nand'));
    const fmt = (c) => Object.entries(c.counts).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(', ') || '—';
    sec('Circuito con puertas de 2 entradas', `<table class="rt"><tr><th>Versión</th><th>Puertas</th><th>Total</th><th>Integrados</th></tr><tr><td>AND, OR y NOT</td><td>${fmt(g1)}</td><td>${g1.total}</td><td>${g1.ics.map(i => `${i.n} × 74${i.ic.slice(2)}`).join(', ')}</td></tr><tr><td>Solo NAND</td><td>${fmt(g2)}</td><td>${g2.total}</td><td>${g2.ics.map(i => `${i.n} × 74${i.ic.slice(2)}`).join(', ')}</td></tr></table>` + shot('Esquema lógico simulado', app.caps.schem));
    sec('Comprobación de la tabla', block('chk', 'Compara la tabla de verdad que genera el simulador a partir de tu circuito con la que has hecho a mano. Indica las filas que no coinciden, si las hay.') + (app.lastCompare ? `<p class="auto">Resultado automático: ${app.lastCompare}</p>` : ''));
  }
  if (p.kind === 'ic') { sec('Tabla de funcionamiento', icTables(p)); sec('Esquema simulado', shot('Esquema con el integrado', app.caps.schem)); }
  if (p.kind === 'pull') {
    let t = '<table class="rt"><tr><th>Resistencia</th><th>Corriente I = VCC / R</th><th>Potencia P = VCC² / R</th></tr>';
    [4700, 10000, 47000].forEach(r => t += `<tr><td>${Schem.fmtVal(r, 'Ω')}</td><td>${num(5 / r * 1000, 3)} mA</td><td>${num(25 / r * 1000, 3)} mW</td></tr>`);
    sec('Elección y cálculos', t + '</table>' + `<p>Resistencia elegida: ${f('r_sel', 'valor')} · Razón: ${f('r_why', 'consumo y ruido')}</p>`);
    sec('Esquemas y simulación', shot('Montaje simulado en la protoboard', app.caps.board));
  }
  if (p.kind === 'gates') {
    sec('Datos de la hoja de características (DM74LS00)', `<table class="rt"><tr><th>Parámetro</th><th>Valor</th><th>Condición</th></tr><tr><td>VOH mínima</td><td>2,7 V</td><td>IOH = −0,4 mA</td></tr><tr><td>VOL máxima</td><td>0,5 V</td><td>IOL = 8 mA</td></tr><tr><td>VIH mínima</td><td>2,0 V</td><td>—</td></tr><tr><td>VIL máxima</td><td>0,8 V</td><td>—</td></tr></table><table class="rt"><tr><th>Margen</th><th>Operación</th><th>Resultado</th></tr><tr><td>NMH</td><td>VOH − VIH = 2,7 − 2,0</td><td>0,7 V</td></tr><tr><td>NML</td><td>VIL − VOL = 0,8 − 0,5</td><td>0,3 V</td></tr></table><p class="mut">Valores de la hoja de datos de la carpeta; compruébalos con tu hoja.</p>`);
    sec('Esquema simulado', shot('Banco de pruebas de la puerta', app.caps.board));
    let t = '<table class="rt"><tr><th>Puerta</th><th>A=0 B=0</th><th>A=0 B=1</th><th>A=1 B=0</th><th>A=1 B=1</th><th>¿Cumple la tabla?</th></tr>'; for (let g = 1; g <= 4; g++) t += `<tr><td>${g}</td>${[0, 1, 2, 3].map(k => `<td class="fill" contenteditable data-f="g${g}_${k}"></td>`).join('')}<td class="fill" contenteditable data-f="g${g}_ok"></td></tr>`;
    sec('Comprobación en la protoboard (tensiones medidas en la salida, en V)', t + '</table><p>Peor VOH medida: ' + f('voh', 'V') + ' · Peor VOL medida: ' + f('vol', 'V') + ' · Decisión: ' + f('dec', 'apto / no apto') + '</p>');
  }
  if (p.kind === '555a' || p.kind === '555m') {
    const rs = board.items.filter(i => i.type === 'R' && i.v !== '180'), cs = board.items.filter(i => i.type === 'C').sort((a, b) => Schem.parseVal(b.v) - Schem.parseVal(a.v));
    const RA = rs[0] ? Schem.parseVal(rs[0].v) : 1e4, RB = rs[1] ? Schem.parseVal(rs[1].v) : 4700, C = cs[0] ? Schem.parseVal(cs[0].v) : 1e-4; let t;
    const w = app.board.timing.ch[0] && app.board.timing.ch[0].w;
    if (p.kind === '555a') { const tH = 0.693 * (RA + RB) * C, tL = 0.693 * RB * C, T = tH + tL; const m = app.board.timing.measure(0);
      t = `<table class="rt"><tr><th>Magnitud</th><th>Fórmula</th><th>Cálculo</th><th>Simulador</th><th class="fill">Medido</th></tr><tr><td>tH</td><td>0,693·(RA+RB)·C</td><td>${num(tH, 3)} s</td><td>${m && m.tH ? num(m.tH, 3) + ' s' : '—'}</td><td class="fill" contenteditable data-f="a_th"></td></tr><tr><td>tL</td><td>0,693·RB·C</td><td>${num(tL, 3)} s</td><td>${m && m.tH ? num(m.period - m.tH, 3) + ' s' : '—'}</td><td class="fill" contenteditable data-f="a_tl"></td></tr><tr><td>Periodo</td><td>tH + tL</td><td>${num(T, 3)} s</td><td>${m ? num(m.period, 3) + ' s' : '—'}</td><td class="fill" contenteditable data-f="a_t"></td></tr><tr><td>Frecuencia</td><td>1 / T</td><td>${num(1 / T, 3)} Hz</td><td>${m ? num(m.freq, 3) + ' Hz' : '—'}</td><td class="fill" contenteditable data-f="a_f"></td></tr><tr><td>Ciclo de trabajo</td><td>tH / T</td><td>${num(tH / T * 100, 1)} %</td><td>${m && m.duty != null ? num(m.duty * 100, 1) + ' %' : '—'}</td><td class="fill" contenteditable data-f="a_d"></td></tr><tr><td>Parpadeos por minuto</td><td>60 / T</td><td>${num(60 / T, 1)}</td><td>—</td><td class="fill" contenteditable data-f="a_ppm"></td></tr></table><p class="mut">RA = ${Schem.fmtVal(RA, 'Ω')}, RB = ${Schem.fmtVal(RB, 'Ω')}, C = ${Schem.fmtVal(C, 'F')} (leídos del montaje).</p>`; }
    else { const T = 1.1 * RA * C; const pw = w ? pulseWidths(w, [0.6, 1.2]).filter(x => x > 0.01) : []; t = `<table class="rt"><tr><th>Magnitud</th><th>Fórmula</th><th>Cálculo</th><th>Simulador</th><th class="fill">Medido (cronómetro)</th></tr><tr><td>T con C = ${Schem.fmtVal(C, 'F')}</td><td>1,1·R·C</td><td>${num(T, 3)} s</td><td>${pw.length ? num(pw[pw.length - 1], 3) + ' s' : '—'}</td><td class="fill" contenteditable data-f="m_t1"></td></tr><tr><td>T con C = 47 µF</td><td>1,1·R·C</td><td>${num(1.1 * RA * 47e-6, 3)} s</td><td>—</td><td class="fill" contenteditable data-f="m_t2"></td></tr><tr><td>Corriente del LED</td><td>(VOH − VF) / RL</td><td>${num((3.3 - 1.75) / 180 * 1000, 1)} mA</td><td>—</td><td class="fill" contenteditable data-f="m_il"></td></tr></table><p class="mut">RA = ${Schem.fmtVal(RA, 'Ω')} y C = ${Schem.fmtVal(C, 'F')} leídos del montaje. Pulsa el pulsador con el simulador en marcha y mide el ancho del pulso en el analizador.</p>`; }
    sec('Cálculos y comparación', t); sec('Montaje en la protoboard', shot('Montaje simulado', app.caps.board)); sec('Cronograma', shot('Analizador lógico', app.caps.la));
  }
  if (p.kind === 'seq') { sec('Esquema simulado', shot('Circuito secuencial', app.caps.schem)); sec('Cronograma', shot('Diagrama de tiempos', app.caps.la)); sec('Secuencia observada', block('seq', 'Anota la secuencia de estados que observas en los LED.')); }
  if (p.kind === 'fpga') { sec('Diseño en la FPGA', shot('Diseño del sumador (bloques lógicos)', app.caps.fpga) + (app.fpgaVerilog ? `<pre class="code">${esc(app.fpgaVerilog)}</pre>` : '')); }
  if (app.pldText) sec('Lógica programable (PLD)', (app.caps.pld ? shot('Matriz de fusibles', app.caps.pld) : '') + `<pre class="code">${esc(app.pldText)}</pre>` + block('pld', 'Explica qué diferencia has observado entre PROM, PLA, PAL y GAL (términos usados, compartición, polaridad, registros).'));
  if (p.kind === 'mcu') {
    const ctl = app.mcuCtl; sec('Código', `<pre class="code">${esc(board.mcu ? board.mcu.code : '')}</pre>`);
    sec('Resultado de la simulación', `<p>Monitor serie (últimas líneas):</p><pre class="code">${esc(ctl ? ctl.serial.split('\n').slice(-12).join('\n') : '(sin ejecución)')}</pre>` + (ctl && ctl.lcd ? `<p>Pantalla LCD:</p><pre class="lcd">${ctl.lcd.buf.map(esc).join('\n')}</pre>` : ''));
    sec('Montaje', shot('Placa y montaje simulados', app.caps.board));
  }
  // medidas anotadas con el multímetro
  if (app.board.log.length) sec('Medidas anotadas en el simulador', `<table class="rt"><tr><th>Nº</th><th>Medida</th><th>Entre</th><th>Condición</th><th>Simulador</th><th class="fill">Real (multímetro)</th></tr>${app.board.log.map(m => `<tr><td>${m.n}</td><td>${m.mode === 'A' ? 'Corriente' : 'Tensión'}</td><td>${esc(m.between)}</td><td>${esc(m.cond)}</td><td>${esc(m.text)}</td><td class="fill" contenteditable data-f="lg${m.n}"></td></tr>`).join('')}</table>`);
  sec('Montaje lógico, simulado y real', `<div class="mtres">
    <div class="mt"><h4>1 · Montaje lógico (esquema)</h4>${app.caps.schem ? shot('Esquema lógico simulado', app.caps.schem) : photo('lg1', 'Esquema lógico (captura del módulo Esquema lógico o dibujo propio)')}${block('mlog', 'Comentarios sobre el esquema lógico: puertas usadas, entradas y salida.')}</div>
    <div class="mt"><h4>2 · Montaje simulado en la protoboard</h4>${app.caps.board ? shot('Protoboard simulada', app.caps.board) : photo('sm1', 'Captura de la protoboard simulada')}${block('msim', 'Comentarios sobre el montaje simulado: conexiones críticas y resultado de la simulación.')}</div>
    <div class="mt"><h4>3 · Montaje real</h4>${photo('foto1', 'Foto del montaje real en la protoboard (nítida y de frente)')}${photo('foto2', 'Segunda foto del montaje real (opcional)')}${block('mreal', 'Comentarios sobre el montaje real: diferencias con el simulado.')}</div></div>`);
  sec('Aspectos a resaltar', block('asp', 'Dificultades, diferencias entre simulación y montaje, y qué cambiarías.'));
  return { p, sections };
};

R.render = function (app) {
  const { p, sections } = R.build(app), S = R.state;
  const gl = R.GLOSS.filter(g => true).slice(0, 14);
  let h = `<div class="rep">`;
  h += `<section class="page cover"><div class="rbrand">${app.avatarHTML(48)}<span>Equipos Microprogramables</span></div><div class="cvmid"><div class="sig"></div><div class="kick">${p.free ? 'INFORME DE TRABAJO LIBRE' : 'INFORME DE PRÁCTICA · TEMA ' + p.tema}</div><h1>${p.free ? 'Modo libre' : 'Práctica ' + p.id}<br>${p.free ? 'Montaje propio' : esc(p.title)}</h1><p class="sub">${esc(p.brief)}</p>
    <table class="hd"><tr><td>Alumno/a</td><td><span class="fillbox" contenteditable data-student>${esc(S.student)}</span></td><td>Fecha</td><td><span class="fillbox" contenteditable data-date>${esc(S.date)}</span></td></tr><tr><td>Módulo</td><td>Equipos Microprogramables</td><td>Trabajo</td><td>Individual</td></tr><tr><td>Unidad</td><td>${p.free ? '—' : 'Tema ' + p.tema}</td><td>Criterios</td><td>${esc(p.ra)}</td></tr></table></div><div class="cvfoot">Generado con DIGITAL-SIM</div></section>`;
  h += `<section class="page"><h2>Índice</h2><ol class="toc">${sections.map((s, i) => `<li><span>${i + 1}</span>${esc(s.title)}</li>`).join('')}<li><span>${sections.length + 1}</span>Glosario</li></ol></section>`;
  h += `<section class="page content">` + sections.map((s, i) => `<div class="rs"><h3><span class="n">${i + 1}.</span> ${esc(s.title)}</h3>${s.body}</div>`).join('') + '</section>';
  h += `<section class="page"><h2>Glosario</h2><dl class="gl">${gl.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section></div>`;
  return h;
};
root.Report = R;
})(window);
