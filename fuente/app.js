/* DIGITAL-SIM · carcasa de la aplicación: páginas, navegación inferior, prácticas, informe */
(function () {
'use strict';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const AVATAR = window.__AVATAR__ || '';
const PAGES = [
  { id: 'kmap', n: 1, t: 'Tablas y Karnaugh', tip: 'Alt+1 · Tabla de verdad, Karnaugh y circuito (como Logisim)' },
  { id: 'schem', n: 2, t: 'Esquema lógico', tip: 'Alt+2 · Puertas, biestables e integrados con su patillaje, simulación y cronograma (como SimulIDE)' },
  { id: 'board', n: 3, t: 'Protoboard', tip: 'Alt+3 · Protoboard 830, placas Arduino/ESP32 con su programa, instrumentos (como Tinkercad)' },
  { id: 'fpga', n: 4, t: 'FPGA Alhambra II', tip: 'Alt+4 · Diseño con puertas y placa virtual' },
  { id: 'report', n: 5, t: 'Informe', tip: 'Alt+5 · Informe de la práctica con tus datos' }
];
const SIGLAS = [['TTL', 'Transistor-Transistor Logic', 'Familia lógica 74LS. Entrada baja: la puerta saca ≈ 0,4 mA por la patilla.'], ['CMOS', 'Complementary MOS', 'Familia 74HC. Entradas de impedancia muy alta: no pueden quedar al aire.'], ['DIP', 'Dual In-line Package', 'Encapsulado de dos filas de patillas; se monta a caballo del canal de la protoboard.'], ['VCC / GND', 'Alimentación / masa', '+5 V en la patilla de VCC y 0 V en la de GND (revisa cada hoja de datos).'], ['VOH · VOL', 'Tensiones de salida', 'Mínima en alto y máxima en bajo garantizadas.'], ['VIH · VIL', 'Tensiones de entrada', 'Mínima reconocida como 1 y máxima reconocida como 0.'], ['NMH = VOH − VIH', 'Margen de ruido en alto', ''], ['NML = VIL − VOL', 'Margen de ruido en bajo', ''], ['JK', 'Biestable JK', 'Con J = K = 1 cambia de estado en cada flanco activo.'], ['PR · CLR', 'Preset · Clear', 'Entradas asíncronas, activas a nivel bajo.'], ['555 monoestable', 'T = 1,1·R·C', ''], ['555 astable', 'tH = 0,693·(RA+RB)·C · tL = 0,693·RB·C', ''], ['MB102', 'Fuente para protoboard', 'Entrada 6,5–12 V, salidas 3,3 V o 5 V, máximo 700 mA, carriles superior e inferior independientes.'], ['FPGA', 'Field-Programmable Gate Array', 'Circuito que se configura, no se cablea.'], ['PWM', 'Pulse-Width Modulation', 'analogWrite(): tren de pulsos con ciclo de trabajo variable.'], ['I²C', 'Inter-Integrated Circuit', 'Bus de dos hilos SDA/SCL.']];

const MCU_TEMPLATE = 'void setup() {\n  \n}\n\nvoid loop() {\n  \n}\n';
const App = window.App = { practice: '', caps: {}, page: 'kmap', lastCompare: '', fpgaVerilog: '' };

function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
App.avatarHTML = (px) => AVATAR ? `<img class="av" alt="" width="${px}" height="${px}" src="${AVATAR}">` : '';

App.init = function () {
  const root = $('#app');
  root.innerHTML = `<header class="top"><div class="auth">${App.avatarHTML(28)}<span>José Luis Guerrero Marín</span></div><div class="brand">DIGITAL-SIM</div>
    <nav class="menu"><button data-m="arch">Archivo ▾</button><button data-m="prac" id="mprac">Prácticas…</button><button data-m="ayuda">Ayuda ▾</button></nav><div id="pcur" class="pcur"></div></header>
  <div id="tabs">${PAGES.map(p => `<button data-tab="${p.id}" title="${esc(p.tip)}"><b class="tn">${p.n}</b> ${p.t}</button>`).join('')}</div>
  <div id="pbar" hidden></div><main id="main">${PAGES.map(p => `<section class="pg" id="pg-${p.id}" hidden></section>`).join('')}</main>
  <div id="status"><span id="st1"></span><span id="st2"></span><span id="st4" title="Estado del autoguardado"></span><span class="sp"></span><span id="st3">Arrastra piezas del catálogo al lienzo · doble clic para editar sus valores · Supr borra</span></div>
  <div id="menupop" hidden></div><div id="toast"></div>
  <div class="ov" id="ov-home" hidden></div><div class="ov" id="ov-prac" hidden></div><div class="ov" id="ov-enun" hidden></div><div class="ov" id="ov-guide" hidden></div><div class="ov" id="ov-gloss" hidden></div><div class="ov" id="ov-help" hidden></div>`;
  buildPractices(); buildGuide(); buildOverlays();
  App.kmap = new KarnaughUI($('#pg-kmap'), App);
  const sch = $('#pg-schem'); sch.classList.add('ed'); Schem.registerICs();
  App.schemEd = new Schem.Editor(sch, { onChange: (k, a) => App.onSchem(k, a) }); App.schem = App.schemEd;
  const bd = $('#pg-board'); bd.classList.add('ed'); App.boardEd = new Board.Editor(bd, { onChange: (k, a) => App.onBoard(k, a) }); App.board = App.boardEd;
  buildMcuPage(); App.fpgaUI = new FpgaUI($('#pg-fpga'), App); $('#pg-fpga').classList.add('fp');
  buildReport();
  $('#tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) App.go(b.dataset.tab); };
  document.querySelector('header .menu').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; if (b.dataset.m === 'prac') { openOv('ov-prac'); } else menu(b, b.dataset.m); };
  document.addEventListener('mousedown', (e) => { if (!e.target.closest('#menupop') && !e.target.closest('.menu')) $('#menupop').hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.target.matches('input,textarea,select,[contenteditable]')) return;
    const k = e.key; if (k === 'Escape') { closeOv(); $('#menupop').hidden = true; } else if (k === 'F1' || k === '?') { e.preventDefault(); openOv('ov-guide'); }
    else if (e.altKey && /^Digit[1-5]$/.test(e.code)) { e.preventDefault(); App.go(PAGES[+e.code.slice(5) - 1].id); } });
  restore();
  App.go('kmap'); requestAnimationFrame(tick);
  Home.init($('#ov-home'), { avatar: App.avatarHTML(34), onFree: () => App.openPractice('LIBRE'), onPrac: () => openOv('ov-prac'), onBack: () => closeOv() });
  document.querySelector('header .brand').onclick = () => openOv('ov-home'); document.querySelector('header .brand').title = 'Pantalla de inicio';
  openOv('ov-home');
};
function fs() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
function closeOv() { document.querySelectorAll('.ov').forEach(o => o.hidden = true); }
function openOv(id) { closeOv(); if (id === 'ov-home') Home.setContinue(App.hasWork()); if (id === 'ov-prac') buildPractices(); if (id === 'ov-enun') buildEnun(App.enunId); $('#' + id).hidden = false; }
function menu(btn, which) {
  const m = $('#menupop'), r = btn.getBoundingClientRect();
  const items = which === 'arch' ? [['Nuevo (vacía todo)', 'new'], ['Abrir proyecto…', 'open'], ['Guardar proyecto (.json)', 'save'], ['Autoguardado en un archivo…', 'autofile']] : [['Guía de uso (F1)', 'guide'], ['Siglas y fórmulas', 'gloss'], ['Atajos y consejos', 'help'], ['Pantalla completa', 'fs']];
  m.innerHTML = items.map(x => `<button data-x="${x[1]}">${x[0]}</button>`).join(''); m.style.left = r.left + 'px'; m.style.top = r.bottom + 'px'; m.hidden = false;
  m.onclick = (e) => { const b = e.target.closest('[data-x]'); if (!b) return; m.hidden = true; const x = b.dataset.x;
    if (x === 'guide') openOv('ov-guide'); else if (x === 'gloss') openOv('ov-gloss'); else if (x === 'help') openOv('ov-help'); else if (x === 'fs') fs();
    else if (x === 'save') saveFile(); else if (x === 'autofile') autoFile(); else if (x === 'open') $('#rpo').click(); else if (x === 'new') App.newProject(); };
}
App.toast = (t) => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(App._tt); App._tt = setTimeout(() => e.classList.remove('on'), 3800); };
App.newProject = function () { if (App.hasWork() && !confirm('Se vaciarán el esquema, la protoboard, la FPGA y la tabla. ¿Continuar?')) return; App.practice = ''; App.blank(); App.toast('Proyecto nuevo.'); App.go('schem'); App.touch(); };

App.go = function (id) {
  if (id === 'mcu') id = 'board';
  const prev = App.page;
  if (prev === 'schem' && id !== 'schem') App.caps.schem = App.schemEd.svgToDataURL();
  if (prev === 'board' && id !== 'board') { App.caps.board = App.boardEd.svgToImg(); App.caps.la = laImage(); }
  if (prev === 'fpga' && id !== 'fpga') App.caps.fpga = App.fpgaUI.ed.svgToDataURL();
  App.page = id; PAGES.forEach(p => { const e = $('#pg-' + p.id); e.hidden = p.id !== id; });
  document.querySelectorAll('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  if (id === 'schem') App.schemEd.dirty = true; if (id === 'board') { App.boardEd.dirty = true; if (!App.boardEd.fitted) App.boardEd.fit(); } if (id === 'fpga') App.fpgaUI.ed.dirty = true;
  if (id === 'kmap') App.kmap.render(); if (id === 'report') refreshReport(); if (id === 'board') refreshMcu(true); updatePbar();
  closeOv();
};
function laImage() { const c = App.boardEd.timing.c; try { return { svg: `<img src="${c.toDataURL('image/png')}" style="width:100%;border:1px solid #E2DFD8">` }; } catch (e) { return null; } }
App.touch = () => { App.fileDirty = true; autoStatus(); clearTimeout(App._sv); App._sv = setTimeout(() => { save(); if (App.fh) writeFH(); }, 600); };

/* ---------- inicio ---------- */
const icChip = (id) => { const h = DSim.dsHref(id); const nm = DSim.IC[id] ? DSim.IC[id].name : id; return h ? `<a class="chipl" href="${h}" target="_blank" rel="noopener" title="Hoja de datos en alldatasheet.es (versión HC)">${esc(nm)}</a>` : `<span class="chipl off" title="No hay hoja de datos en la carpeta">${esc(nm)}</span>`; };
function buildPractices() {
  const h = $('#ov-prac');
  const free = Practicas.free, frow = `<div class="prow free ${App.practice === 'LIBRE' ? 'cur' : ''}"><div class="pn">Libre</div><div class="pb"><div class="pt">${esc(free.title)}</div><div class="pd">${esc(free.brief)}</div><div class="pm">Sin enunciado ni informe guiado · empieza en <b>${Practicas.TOOLNAME[free.tool]}</b></div></div><button class="b ${App.practice === 'LIBRE' ? 'prim' : ''}" data-open="LIBRE">Abrir</button></div>`;
  const rows = frow + Practicas.list.map(p => `<div class="prow ${p.id === App.practice ? 'cur' : ''}"><div class="pn">${p.id}</div><div class="pb"><div class="pt">${esc(p.title)}</div><div class="pd">${esc(p.brief)}</div><div class="pm">Tema ${p.tema} · ${esc(p.ra)} · empieza en <b>${Practicas.TOOLNAME[p.tool]}</b></div>${p.ics.length ? `<div class="pm">Material: ${p.ics.map(icChip).join(' ')}</div>` : ''}</div><div class="pbtn"><button class="b ${p.id === App.practice ? 'prim' : ''}" data-open="${p.id}">Abrir</button><button class="b" data-enun="${p.id}">Enunciado</button></div></div>`).join('');
  h.innerHTML = `<div class="ovc"><button class="ovx" data-close title="Cerrar (Esc)">×</button><div class="kick">EQUIPOS MICROPROGRAMABLES</div><h3>Prácticas</h3>
    <p class="lead">Elige una práctica para ver su enunciado y el material. El espacio de trabajo siempre empieza vacío: tú montas el circuito, tú simulas y tú mides.</p>
    <div class="plgrid"><section class="plist">${rows}</section><aside>
    <div class="inv"><div class="ih">Cómo se trabaja</div><p>1. Arrastra piezas del catálogo (izquierda) al lienzo, o dibuja cables arrastrando de una patilla/agujero a otro.</p><p>2. Doble clic en una pieza para cambiar su valor.</p><p>3. Pulsa «Simular». Si algo falla, falla como en el taller: entrada al aire, VCC sin conectar, LED sin resistencia…</p><p>4. En «Informe» tienes tus tablas, mapas y capturas; tú añades lo medido y las fotos.</p><p>Primera vez: <a href="#" data-guide>Guía de uso</a>.</p></div>
    <div class="inv"><div class="ih">Integrados modelados</div><p>74LS/74HC 00, 02, 04, 08, 10, 14, 32, 86 · 74LS/74HC 74 y 76 · 74LS83 · 74LS/74HC 151 · 7442 · 74LS47/48 · 74LS148 · 74LS165 · 74HC175 · 74LS194 · NE555.</p></div></aside></div></div>`;
  h.onclick = (e) => { const b = e.target.closest('[data-open]'); if (b) App.openPractice(b.dataset.open); const en = e.target.closest('[data-enun]'); if (en) { App.enunId = en.dataset.enun; openOv('ov-enun'); } const g = e.target.closest('[data-goto]'); const gd = e.target.closest('[data-guide]'); if (gd) { e.preventDefault(); openOv('ov-guide'); } };
}
/* enunciado completo de una práctica (tomado de su cuaderno) */
function buildEnun(id) {
  const p = Practicas.get(id), h = $('#ov-enun'), E = (Practicas.enun || {})[id]; if (!p || !E) { h.innerHTML = ''; return; }
  const box = (b) => { const k = /SEGURIDAD|ANTES DE DAR TENSI|ANTES DE EMPEZAR/.test(b.t) ? 'warn' : /TERMINADA/.test(b.t) ? 'chk' : /ENUNCIADO/.test(b.t) ? 'enu' : '';
    const body = k === 'chk' ? '<ul>' + b.p.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : b.p.map(x => `<p class="${/^[–-] /.test(x) ? 'bl' : ''}">${esc(x)}</p>`).join('');
    return `<div class="ebox ${k}"><div class="eh">${esc(b.t)}</div>${body}</div>`; };
  const cur = App.practice === id, mat = p.ics.map(icChip).join(' ');
  h.innerHTML = `<div class="ovc enun"><button class="ovx" data-close title="Cerrar (Esc)">×</button><div class="kick">PRÁCTICA ${p.id} · TEMA ${p.tema} · ${esc(p.ra)}</div><h3>${esc(p.title)}</h3>
    ${E.boxes.map(box).join('')}${mat ? `<p class="pm">Hojas de datos: ${mat}</p>` : ''}
    ${E.heads.length ? `<div class="ebox"><div class="eh">APARTADOS DEL CUADERNO</div><ol class="eap">${E.heads.map(x => `<li>${esc(x.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol><p class="mut">En el simulador se hace lo que corresponde a cada apartado; las respuestas escritas van en el cuaderno y en «Informe».</p></div>` : ''}
    <div class="eact">${cur ? '<button class="b prim" data-estart>Empezar a trabajar</button>' : `<button class="b prim" data-eopen="${p.id}">Abrir esta práctica</button>`}<button class="b" data-close>Cerrar</button></div></div>`;
  h.onclick = (e) => { if (e.target.closest('[data-estart]')) { closeOv(); App.go(p.tool); } const o = e.target.closest('[data-eopen]'); if (o) App.openPractice(o.dataset.eopen, true); };
}
/* barra con el enunciado de la práctica actual */
function updatePbar() {
  const b = $('#pbar'), p = Practicas.get(App.practice);
  const show = p && App.page !== 'report';
  b.hidden = !show; if (!show) return;
  const mat = p.ics.map(icChip).join(' ');
  b.innerHTML = `<div class="pb1"><b>${p.free ? 'Modo libre' : 'Práctica ' + p.id}</b> · ${p.free ? '' : esc(p.title)} <span class="mut">— ${esc(p.brief)}</span> ${p.free ? '' : '<button class="b sm" id="pbe">Enunciado</button>'} <button class="b sm" id="pbt">${p.free ? 'Cómo se trabaja ▾' : 'Método de trabajo ▾'}</button></div>${mat ? `<div class="pb2">Hojas de datos: ${mat}</div>` : ''}<ol class="pb3" id="pbs" hidden>${p.pasos.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
  $('#pbt').onclick = () => { const o = $('#pbs'); o.hidden = !o.hidden; };
  const be = $('#pbe'); if (be) be.onclick = () => { App.enunId = App.practice; openOv('ov-enun'); };
}

App.openPractice = function (id, noEnun) {
  const p = Practicas.get(id); if (!p) return;
  const dirty = App.hasWork && App.hasWork();
  if (dirty && !confirm('Al abrir otra práctica se vacían los editores (esquema, protoboard, FPGA, tabla). ¿Continuar? Guarda antes el proyecto (Archivo ▸ Guardar) si quieres conservarlo.')) return;
  App.practice = id; App.blank();
  App.toast(p.free ? 'Modo libre: espacio de trabajo vacío, sin enunciado.' : `Práctica ${id}: espacio de trabajo vacío. Monta tu circuito desde cero.`); App.go(p.tool); App.touch();
  if (p.free || noEnun) closeOv(); else { App.enunId = id; openOv('ov-enun'); }
};
App.blank = function () {
  App.caps = {}; App.lastCompare = ''; App.mcuCtl = null; App.fpgaVerilog = '';
  const st = Report.state; st.fields = {}; st.photos = {};
  App.kmap.st = { n: 3, names: ['A', 'B', 'C'], outs: [{ name: 'F', t: new Array(8).fill(0) }], title: '', dcAs: 'auto' }; App.kmap.recalc(); App.kmap.render();
  App.schemEd.load(new Schem.Doc().toJSON()); App.fpgaUI.ed.load(new Schem.Doc().toJSON());
  const nb = Board.newBoard(); App.boardEd.load(nb); App.boardEd.log = []; if ($('#mcc')) { $('#mcc').value = MCU_TEMPLATE; $('#mcsr').dataset.n = ''; }
};
App.hasWork = function () { try { return App.schemEd.doc.parts.length > 0 || App.boardEd.board.items.length > 0 || App.fpgaUI.ed.doc.parts.length > 0; } catch (e) { return false; } };

/* ---------- guía de uso ---------- */
function buildGuide() {
  const g = $('#ov-guide');
  const icrows = Object.keys(DSim.IC).map(k => { const d = DSim.IC[k], h = DSim.dsHref(k); const f = DSim.dsFile(k); if (!f) return `<tr><td><b>${esc(d.name)}</b></td><td>${esc(d.desc)}</td><td class="mut">sin versión HC; búscala en alldatasheet.es</td></tr>`;
    return `<tr><td><b>${esc(d.name)}</b></td><td>${esc(d.desc)}</td><td><a href="${h}" target="_blank" rel="noopener">${esc(f)} · ${DSim.dsMaker(k)} (alldatasheet.es)</a></td></tr>`; }).join('');
  g.innerHTML = `<button class="ovx" data-close title="Cerrar (Esc)">×</button><div class="guide"><nav class="gtoc"><div class="ih">Contenido</div>${[['g1', '1 · Qué es y cómo se trabaja'], ['g2', '2 · Tablas y Karnaugh'], ['g3', '3 · Esquema lógico'], ['g4', '4 · Protoboard'], ['g5', '5 · Instrumentos'], ['g6', '6 · Programar Arduino / ESP32'], ['g7', '7 · FPGA Alhambra II'], ['g8', '8 · Informe de práctica'], ['g9', '9 · Errores que puedes cometer'], ['g10', '10 · Límites del simulador'], ['g11', '11 · Atajos de teclado'], ['g12', '12 · Hojas de datos']].map(x => `<a href="#" data-sc="${x[0]}">${x[1]}</a>`).join('')}</nav>
  <article>
  <h1>Guía de uso</h1><p class="lead">El simulador no monta nada por ti: parte de un espacio vacío y trabaja con las mismas piezas y medidas que en el taller. Deja cometer errores y los muestra como los vería el instrumento.</p>

  <h2 id="g1">1 · Qué es y cómo se trabaja</h2>
  <p>Son cinco módulos que comparten el mismo motor de simulación. Lo que montas en el esquema y lo que montas en la protoboard se calcula igual (tensiones y corrientes reales de cada nudo, no solo ceros y unos).</p>
  <ul><li><b>Tablas y Karnaugh</b>: sustituye a Logisim. Para analizar y simplificar funciones.</li><li><b>Esquema lógico</b>: sustituye a SimulIDE. Puertas, biestables e integrados con su patillaje, y cronograma.</li><li><b>Protoboard</b>: sustituye a Tinkercad. Protoboard de 830 puntos, fuente MB102, multímetro, sonda lógica y analizador lógico de 8 canales. Al seleccionar una placa Arduino o ESP32 aparece su programa a la derecha.</li><li><b>FPGA Alhambra II</b>: diseño con puertas, asignación de pines y placa virtual.</li></ul>
  <p><b>Flujo recomendado:</b> abre la práctica en «Prácticas» → lee el enunciado y la hoja de datos del integrado (enlace en la barra superior) → razona el circuito → monta → mide → ajusta → «Informe». La barra de la práctica, bajo el título, tiene el botón «Método de trabajo» con una guía de pasos (no con la solución).</p>

  <h2 id="g2">2 · Tablas y Karnaugh</h2>
  <ol><li>Elige el número de variables (2 a 4) y escribe sus nombres; la primera es la más significativa (MSB). Añade o quita salidas.</li><li>Haz clic en una celda de la tabla de verdad (o del mapa) para ciclar <b>0 → 1 → X → 0</b>. La X es una combinación indiferente: el simulador la toma como 1 o como 0 según convenga y te dice cuáles ha usado.</li><li>Debajo de cada mapa tienes la expresión simplificada (Quine-McCluskey, mínimo exacto), los grupos con su color y las variables que no intervienen.</li><li>Apartado «Circuito con puertas de 2 entradas»: cuenta cuántas puertas e integrados necesitas con puertas estándar o solo con NAND. «Ver Verilog» muestra la función en código.</li><li>«Generar esquema» crea el circuito en el módulo Esquema (úsalo para comprobar tu propio diseño, no para saltártelo); «Comparar con el esquema» confronta la tabla de verdad de lo que has dibujado con la de este módulo y muestra las filas que difieren. «Enviar al informe» guarda mapas y expresiones.</li></ol>

  <h2 id="g3">3 · Esquema lógico</h2>
  <ul><li><b>Cables con codos</b>: pica en una patilla, luego en zonas libres para ir poniendo codos (el trazado sale siempre en horizontal y vertical) y termina picando en otra patilla <b>o en cualquier punto de otro cable</b>, y se crea un nudo ahí. El programa elige el trazado con el mínimo de codos. Esc cancela. También vale arrastrar directamente de patilla a patilla.</li><li><b>Copiar y pegar</b>: selecciona uno o varios componentes (clic o recuadro), Ctrl+C y Ctrl+V. La copia aparece al lado, con los cables que unían los componentes copiados, nuevos identificadores y ya seleccionada para arrastrarla a su sitio. Ctrl+X corta. Funciona también en la protoboard: la copia se pega en columnas libres a un lado.</li><li><b>Interruptor y pulsador</b>: en «Entradas» hay un <b>Interruptor</b> y un <b>Pulsador</b> reales, de dos terminales y con su símbolo eléctrico: abren o cierran el circuito, y tú pones la tensión (+5 V, resistencias, GND). Clic en el interruptor lo abre o cierra; el pulsador conduce mientras lo mantienes pulsado (NA) o al revés (NC). Las «Entrada digital fija» y «Entrada digital pulsada» dan directamente un 0 o un 1, para simplificar.</li><li><b>Colocar</b>: arrastra un componente del catálogo (izquierda) y suéltalo en el lienzo; también vale hacer clic en él y luego en el lienzo. Supr o Retroceso borran la selección. Los integrados salen con su caja y el nombre de cada pata.</li><li><b>Editar valores</b>: doble clic sobre el componente (resistencia, color del LED, nombre, frecuencia del reloj, número de entradas…). El enlace a la hoja de datos de un integrado sale en ese mismo cuadro.</li><li><b>Cablear</b>: arrastra desde una patilla hasta otra (o haz clic en una y luego en la otra). El cable se dibuja ortogonal. Selecciona un cable y pulsa Supr para borrarlo.</li><li><b>Mover</b>: arrastra el componente. Arrastra el fondo para desplazar la vista y usa la rueda para el zoom.</li><li><b>Antes del montaje físico</b>: este esquema se simula por sí solo (pestaña «Esquema lógico», botón Simular). Compruébalo aquí y después móntalo en la protoboard.</li><li><b>Entradas</b>: interruptor (clic para cambiar 0/1), pulsador (activo mientras lo mantienes), reloj (frecuencia en Hz, se edita en Propiedades), +5 V y GND.</li><li><b>Alimentación de los integrados</b>: la casilla «alimentar integrados» suministra VCC y GND automáticamente. <b>Desmárcala si quieres cablearlos tú</b>: sin alimentar, el integrado no funciona y el simulador te lo avisa.</li><li><b>Cronograma</b>: añade «Señal para cronograma» a los nudos que quieras ver. Con los cursores mides periodo, frecuencia y ciclo de trabajo. Los glitches se dibujan.</li><li>«Tabla de verdad del circuito» extrae la tabla de las entradas y salidas rotuladas del esquema.</li></ul>

  <h2 id="g4">4 · Protoboard (830 puntos)</h2>
  <ul><li><b>Mover resistencias, LED y condensadores</b>: arrástralos a cualquier agujero, también a los de los carriles de alimentación. Si los sacas de la placa quedan sueltos y sin conectar (útil para reordenarlos); al devolverlos a un agujero se vuelven a conectar. Los integrados, pulsadores, relojes, microinterruptores y displays también se pueden sacar de la placa: quedan sueltos y sin conectar hasta que los vuelvas a soltar sobre ella. Al sacar un pulsador, agárralo por el borde de su cuerpo: el botón central lo pulsa.</li><li><b>Colocación libre</b>: integrados, microinterruptores, pulsadores, displays y el generador de reloj se pueden poner en cualquier fila de la placa, también sin respetar el canal central. Si se montan mal (patas en cortocircuito, por ejemplo), la simulación lo refleja y salta el aviso.</li><li><b>Autoajuste</b>: junto a Velocidad y Paso. Detecta el reloj más rápido, ajusta velocidad, paso y ventana del analizador y arranca la simulación para que la señal cruce la pantalla en unos 6 s.</li><li><b>Generador de reloj</b>: módulo de 3 patas (VCC, CLK y GND) para las prácticas secuenciales. Alimenta VCC (3,3–5 V) y GND como cualquier integrado, y cablea CLK a la entrada de reloj. Haz clic en él para fijar la frecuencia (de 0,01 Hz a 100 kHz, admite 1k, 10k…) y el ciclo de trabajo. Sin alimentación no da señal.</li><li><b>Disposición</b>: 63 columnas con las filas a–e arriba/f–j abajo unidas dentro de cada columna (el canal central las separa) y 4 carriles de alimentación (T+, T−, B+, B−) de 50 agujeros.</li><li><b>Piezas</b>: arrástralas del catálogo a la placa: resistencia (con código de colores), LED (el extremo con el círculo es el ánodo), condensador, pulsador de 4 patas, minipuerto DIP 8, displays de 7 segmentos (5161 de ánodo común y de cátodo común) e integrados DIP. Al soltar, la pieza se encaja en los agujeros más cercanos: colócala donde quieras, también mal.</li><li><b>Cables</b>: arrastra de un agujero a otro. El color se cambia con doble clic sobre el cable.</li><li><b>Mover y editar</b>: arrastra una pieza para moverla; con la pieza seleccionada aparecen círculos en sus extremos para recolocar solo un lado. Doble clic = cambiar valor (resistencia, color, condensador, referencia del integrado…).</li><li><b>Integrados</b>: se montan a caballo del canal central. Si los sueltas mal alineados, verás qué pasa.</li><li><b>Alimentación</b>: la fuente MB102 va a los carriles. Elige 3,3 V o 5 V en cada carril superior e inferior y su interruptor. Hay que cablear los carriles a las filas, y los integrados necesitan sus patas VCC y GND cableadas.</li><li><b>Vista</b>: rueda = zoom; arrastra el fondo para desplazar. Pasa el ratón por un agujero para ver su tensión y a qué nudo pertenece. En el panel derecho, la tabla de patas de un integrado muestra el nivel de cada una.</li><li><b>Pausar / Reiniciar / Velocidad / Paso</b>: la simulación es de paso fijo. Para ver ceros y unos de un reloj rápido (555), baja el paso; para ver cosas lentas, sube la velocidad.</li></ul>

  <h2 id="g5">5 · Instrumentos y fuente</h2>
  <ul><li><b>Fuente MB102</b> (arriba de la placa, siempre visible): interruptor ON/OFF, y un jumper por cada carril. Pulsa el jumper para cambiarlo: 5 V → 3,3 V → sin jumper (0 V). El visor rojo muestra la tensión que llega al carril. Un integrado 74HC alimentado a 3,3 V responde distinto a uno a 5 V: pruébalo.</li><li><b>Multímetro</b>: botones V, A y Ω en la carcasa (o doble clic). En <b>V</b> mide tensión DC; en <b>A</b> se pone <b>en serie</b> (en paralelo es un cortocircuito y el simulador avisa); en <b>Ω</b> mide la resistencia entre las puntas con el circuito <b>sin alimentar</b> (solo cuentan resistencias y cables; «OL» = circuito abierto). «Anotar medida» la guarda para el informe.</li><li><b>Sonda lógica</b> (lápiz): arrastra su punta a cualquier agujero, carril o patilla. Rojo = nivel alto (≥ 3,3 V), verde = nivel bajo (≤ 1,6 V); sin luz = flotante o intermedio.</li><li><b>Analizador lógico</b>: se coloca como una caja con 8 canales y masa. Arrastra desde el zócalo del canal hasta el agujero que quieras medir; solo se dibujan los hilos que conectes. Para soltar un canal, arrastra su pinza lejos de cualquier agujero.</li><li><b>Cables con codos</b>: pica en un agujero, luego pica en zonas libres de la placa para ir marcando los codos (se colocan entre agujeros, nunca encima) y termina picando en el agujero final. Esc cancela. En un cable ya hecho, selecciónalo y arrastra los rombos naranja para añadir o mover codos.</li><li><b>Serigrafía de los integrados</b>: cada chip muestra la numeración de todas sus patas, con VCC en rojo y GND en marrón. Pasa el ratón sobre una pata para ver su nombre y su función (entrada, salida, alimentación) y sobre el chip para ver qué hace.</li><li><b>Sobrecargas (llama)</b>: si un componente supera sus límites aparece una llama sobre él y el aviso explica la causa. Límites: resistencia 1/4 W (250 mW) · LED y segmentos de display 30 mA · salidas de integrados 25 mA · alimentación de integrados fuera de rango · electrolítico con polaridad invertida. Al quemarse, la resistencia queda abierta y el LED o el integrado dejan de funcionar hasta que pulses «Reiniciar».</li><li><b>Mover y borrar placas</b>: arrastra el Arduino o el ESP32 por su cuerpo para colocarlos donde quieras (los cables siguen a sus pines); con la placa seleccionada, Supr la elimina.</li><li><b>Enunciado y modo libre</b>: al abrir una práctica se muestra su enunciado (botón «Enunciado» en la barra de la práctica para volver a verlo). «Modo libre» en el menú Prácticas abre un espacio general, sin enunciado, para montar lo que quieras.</li><li><b>Girar</b>: con una resistencia, LED o condensador seleccionado, pulsa <b>R</b> para girarlo 90° alrededor de su primera patilla.</li><li><b>Multímetro y analizador</b>: arrastra su cuerpo a cualquier sitio de la pantalla; las puntas y pinzas se llevan a los agujeros arrastrando sus extremos.</li><li><b>Piezas apiladas</b>: si varias piezas se solapan, <b>Alt + clic</b> selecciona la siguiente de las que hay bajo el cursor; así puedes elegir y mover cada una.</li><li><b>Guardado</b>: el trabajo se autoguarda en este navegador tras cada cambio y se recupera al abrir. Para no depender del navegador, activa <b>Archivo → Autoguardado en un archivo…</b> (Chrome/Edge): se reescribe el .json tras cada cambio. La barra inferior indica si hay cambios sin guardar en archivo. Doble clic en el cable para elegir color entre 12.</li></ul>
  <p>Más detalles de cada pieza: pasa el ratón por encima y aparece su ayuda.</p>

  <h2 id="g6">6 · Programar Arduino / ESP32</h2>
  <ul><li>En la pestaña Protoboard coloca una placa (Arduino UNO o ESP32-S3 DevKitC-1) y <b>haz clic en ella</b>: el panel derecho se convierte en el editor del programa, con el monitor serie y la pantalla LCD. «Compilar y simular» lo ejecuta contra lo que hayas cableado en la protoboard.</li><li>El editor colorea el código como el IDE de Arduino, numera las líneas, sangra solo, y sugiere funciones, constantes, métodos de <code>Serial</code> y <code>lcd</code> y plantillas (<code>for</code>, <code>if</code>, <code>switch</code>…) mientras escribes. Ctrl+Espacio fuerza la lista, Tab o Enter aceptan, Ctrl+/ comenta líneas. El selector «Ejemplos» carga programas de partida (Blink, pulsador, semáforo, PWM, voltímetro, LCD, reloj, marcador…) adaptados a la placa elegida.</li><li>Soportado: variables, funciones, <code>if / for / while</code>, <code>millis()</code>, <code>delay()</code>, <code>pinMode / digitalWrite / digitalRead</code>, <code>analogRead / analogWrite</code>, <code>Serial</code>, <code>sprintf</code> y <code>LiquidCrystal</code> (pantalla virtual, no usa pines).</li><li>La división de enteros trunca como en C. No hay desbordamiento de 16 bits en el UNO ni I²C real.</li><li>El ESP32 funciona a 3,3 V: lo que conectes a más de 3,7 V en un pin es una avería, y se avisa.</li><li><code>INPUT_PULLUP</code> activa la resistencia interna: con el pulsador sin pulsar el pin lee 1.</li></ul>

  <h2 id="g7">7 · FPGA Alhambra II</h2>
  <ul><li>Dibuja la función con puertas. A cada interruptor, pulsador o LED asígnale un <b>pin de la placa</b> en Propiedades (SW1, SW2, LED0–LED7, D0–D7).</li><li>La placa virtual muestra los LED y deja pulsar los interruptores. Se generan el Verilog y el fichero de pines <code>.pcf</code> equivalentes a lo que harías en Icestudio.</li><li>Pines verificados con el <code>pinout.json</code> oficial de Icestudio para la Alhambra II: SW1 = 34, SW2 = 33, LED0–LED7 = 45, 44, 43, 42, 41, 39, 38, 37, D0–D7 = 2, 1, 4, 3, 8, 7, 10, 9, reloj 12 MHz = 49. Los pulsadores son de lógica positiva (1 al pulsar).</li></ul>

  <h2 id="g8">8 · Informe de práctica</h2>
  <ul><li>El informe recoge lo que has hecho en cada módulo: tablas, mapas, capturas del esquema, de la protoboard y del analizador, medidas anotadas, código del Arduino, Verilog.</li><li>Las capturas se toman al <b>salir</b> de cada módulo, o con el botón «Captura». «Actualizar datos» vuelve a leerlo todo.</li><li>Las celdas con fondo marcado son para <b>lo medido en el taller</b> y las observaciones; las zonas «Foto» son para subir tus fotos del montaje real.</li><li>«Imprimir / guardar PDF» abre la impresión con portada sin numerar y «Página X de Y» (requiere Chrome o Edge reciente). «Descargar HTML» guarda el informe suelto.</li><li>«Guardar proyecto» crea un .json con todo tu trabajo: es lo que entregas o recuperas otro día. El navegador también guarda una copia automática.</li></ul>

  <h2 id="g9">9 · Errores que puedes cometer (y el simulador reproducirá)</h2>
  <p>Está pensado para que te equivoques y entiendas por qué. Esto es lo que verás:</p>
  <table class="gt"><tr><th>Error</th><th>Qué pasa</th></tr>
  <tr><td>Integrado sin VCC o sin GND</td><td>No funciona; aviso en el panel.</td></tr>
  <tr><td>Entrada de un 74LS al aire</td><td>Flota a ≈ 1,4 V y se interpreta como 1 (TTL). En un 74HC la entrada queda sin definir: el simulador te avisa de que está al aire y no hay que fiarse de la lectura.</td></tr>
  <tr><td>Pull-down de valor alto en TTL</td><td>Por encima de ≈ 2 kΩ la entrada no baja de 0,8 V y no lee 0.</td></tr>
  <tr><td>Tensión de alimentación errónea</td><td>Por encima de ≈ 8 V en un 74LS (8,5 V en un 74HC) el integrado se daña; en polaridad inversa, también.</td></tr>
  <tr><td>LED sin resistencia</td><td>Por encima de 45 mA se quema el LED.</td></tr>
  <tr><td>Condensador electrolítico invertido</td><td>Aviso de avería por polaridad.</td></tr>
  <tr><td>Cortocircuito en la fuente</td><td>Aviso de cortocircuito de alimentación.</td></tr>
  <tr><td>Amperímetro en paralelo</td><td>Equivale a casi un cortocircuito (0,2 Ω): corriente enorme.</td></tr>
  <tr><td>Integrado mal alineado, patas en la misma fila</td><td>Cortocircuita las patas: el simulador lo calcula tal cual.</td></tr>
  <tr><td>Dos salidas conectadas entre sí</td><td>Contienda: tensión intermedia y corriente alta.</td></tr>
  <tr><td>ESP32 con 5 V en un pin</td><td>Avería del pin (> 3,7 V).</td></tr>
  <tr><td>Patillaje equivocado</td><td>Nada te lo impide: es el error más común. Contrasta con la hoja de datos.</td></tr></table>
  <p class="mut">Los avisos no impiden seguir simulando: son el equivalente a que «huela a quemado». Los puedes ignorar y ver las consecuencias.</p>

  <h2 id="g10">10 · Límites del simulador</h2>
  <ul><li>Simulación de paso fijo (10 µs–1 ms). No modela retardos de propagación reales (≈ 10 ns): sí un retardo de un paso, que basta para ver glitches.</li><li>Los modelos de integrados son funcionales: respetan patillaje, tabla y niveles, no todos los límites de la hoja (tiempos de setup/hold, corrientes de fuga…).</li><li>El LCD no pasa por los pines (no puedes equivocarte en su cableado).</li><li>No hay I²C ni OLED real, ni interrupciones del Arduino.</li><li>El informe sin numeración de página en el índice.</li><li>Un resultado del simulador no sustituye a la medida en el taller: es para prepararla y compararla con ella.</li></ul>

  <h2 id="g11">11 · Atajos de teclado</h2>
  <p><b>1–8</b> módulo · <b>PgUp / PgDn</b> anterior / siguiente · <b>Inicio</b> primera página · <b>O</b> índice · <b>G</b> siglas · <b>?</b> ayuda · <b>F</b> pantalla completa · <b>Esc</b> cierra paneles o cancela la herramienta · <b>Supr</b> borra la selección.</p>

  <h2 id="g12">12 · Hojas de datos</h2>
  <p>Los enlaces abren la búsqueda en alldatasheet.es de la versión <b>HC</b> del integrado (fabricante NXP; STMicroelectronics para el NE555). Necesitas conexión a internet.</p>
  <table class="gt"><tr><th>Integrado</th><th>Función</th><th>Hoja de datos</th></tr>${icrows}</table>
  <p class="mut">Los patillajes se revisaron contra las hojas de datos 74LS; la serie 74HC comparte patillaje.</p>
  </article></div>`;
  g.onclick = (e) => { const a = e.target.closest('[data-sc]'); if (a) { e.preventDefault(); const t = g.querySelector('#' + a.dataset.sc); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
}

/* ---------- eventos de los editores ---------- */
App.onSchem = function (k, a) {
  if (k === 'toast') { App.toast(a.msg); return; }
  if (k === 'capture') App.caps.schem = a;
  if (k === 'tt') { const t = a; const m = `Tabla del circuito (${t.inputs.join(', ')} → ${t.outputs.join(', ')}). `; App.lastCompare = m + (t.rows.map(r => r.out.join('')).join(' ')); App.toast('Tabla de verdad extraída del esquema (se compara desde «Tablas y Karnaugh»).'); }
  if (k === 'alert') App.toast(a.msg);
  App.touch();
};
App.onBoard = function (k, a) {
  if (k === 'toast') { App.toast(a.msg); return; }
  if (k === 'capture') { App.caps.board = a; App.toast('Captura guardada para el informe.'); }
  if (k === 'mcu-build') attachMcu(a);
  if (k === 'mcu' || k === 'mcusel') refreshMcu(true);
  if (k === 'log') App.toast(`Medida ${a.n} anotada: ${a.text}`);
  if (k === 'alert') { const al = App.boardEd.sim.alerts.concat((App.boardEd.extraAlerts || []).map(m => ({ msg: m }))); if (al.length) App.toast(al[al.length - 1].msg); }
  App.touch();
};

/* ---------- Arduino / ESP32: panel de programa en la protoboard ---------- */
function buildMcuPage() {
  const m = $('#bmcu'); m.className = 'mcp';
  m.innerHTML = `<div class="row"><label>Placa<select id="mcb"><option value="UNO">Arduino UNO</option><option value="ESP32">ESP32-S3 DevKitC-1</option></select></label><label>Ejemplos<select id="mcx"><option value="">— cargar ejemplo —</option>${Mcu.EXAMPLE_LIST.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}</select></label></div>
    <div id="mced"></div>
    <div class="row"><button class="b prim" id="mcr" title="Compila el programa y lo ejecuta en la placa de la protoboard">▶ Compilar y simular</button><button class="b" id="mcs">❚❚ Detener</button><span id="mcst" class="mut"></span></div>
    <div class="ch">Monitor serie</div><pre id="mcsr" class="serial"></pre><div class="row"><button class="b sm" id="mcsc">Borrar</button></div>
    <div class="ch">Pantalla LCD 16×2 <span class="mut">(virtual, no usa pines)</span></div><div id="mclcd" class="lcd"></div><div class="mut" id="mcpins"></div>
    <p class="mut sm">C++ de Arduino (subconjunto): variables, funciones, if/for/while, millis, delay, pinMode/digitalWrite/digitalRead, analogRead/Write, Serial, sprintf, LiquidCrystal. La división de enteros trunca como en C.</p>`;
  App.mced = new CodeEd.Editor($('#mced'), { onInput: () => { const b = App.board.board.mcu; if (b) { b.code = $('#mcc').value; App.touch(); } } }); App.mced.ta.id = 'mcc';
  const save = () => { const b = App.board.board.mcu; if (b) b.code = $('#mcc').value; };
  $('#mcb').onchange = (e) => { const b = App.board.board.mcu; if (!b) return; save(); b.board = e.target.value; App.boardEd.changed(); refreshMcu(true); };
  $('#mcx').onchange = (e) => { const id = e.target.value, b = App.board.board.mcu; if (!id || !b) return; if ($('#mcc').value.trim() && $('#mcc').value.trim() !== MCU_TEMPLATE.trim() && !Mcu.EXAMPLE_LIST.some(x => Object.keys(EXP_BOTH).some(bd => Mcu.exampleCode(x.id, bd) === $('#mcc').value)) && !confirm('Se sustituirá el programa actual por el ejemplo. ¿Continuar?')) { e.target.value = ''; return; }
    $('#mcc').value = Mcu.exampleCode(id, b.board); save(); e.target.value = ''; App.touch(); App.toast('Ejemplo cargado. Cablea los pines indicados en los comentarios y pulsa «Compilar y simular».'); };
  $('#mcr').onclick = () => { const b = App.board.board.mcu; if (!b) return; save(); App.boardEd.changed(); if (!App.boardEd.running) { App.boardEd.running = true; const t = $('#pg-board [data-a=run]'); t.textContent = '❚❚ Pausar'; } App.touch(); };
  $('#mcs').onclick = () => { App.boardEd.running = false; const b = $('#pg-board [data-a=run]'); b.textContent = '▶ Simular'; };
  $('#mcsc').onclick = () => { if (App.mcuCtl) App.mcuCtl.serial = ''; };
}
const EXP_BOTH = { UNO: 1, ESP32: 1 };
function attachMcu(part) {
  const b = App.board.board.mcu; if (!b) return;
  const ctl = new Mcu.McuCtl(b.board, part, b.code || MCU_TEMPLATE, { onSerial: () => { } }); part.ctl = ctl; App.mcuCtl = ctl;
  if (ctl.err) App.toast(ctl.err);
}
function refreshMcu(full) {
  const b = App.board.board.mcu; if (!b) return; if (full) { $('#mcb').value = b.board; if (document.activeElement !== $('#mcc')) $('#mcc').value = b.code != null && b.code !== '' ? b.code : MCU_TEMPLATE; if (b.code == null || b.code === '') b.code = MCU_TEMPLATE; }
}
function mcuFrame() {
  if (App.page !== 'board' || App.board.sel !== 'mcu') return; const c = App.mcuCtl, b = App.board.board.mcu; if (!b) return;
  $('#mcst').textContent = c ? (c.err ? c.err : (App.boardEd.running ? `En marcha · t = ${Timing.fmtT(App.boardEd.sim.t)}` : 'Detenido (pulsa «Compilar y simular»).')) : '';
  const sr = $('#mcsr'); if (c && sr.dataset.n !== String(c.serial.length)) { sr.textContent = c.serial; sr.dataset.n = c.serial.length; sr.scrollTop = sr.scrollHeight; } else if (!c) sr.textContent = '';
  const lcd = $('#mclcd'); if (c && c.lcd) lcd.innerHTML = c.lcd.buf.map(r => `<div>${esc(r).replace(/ /g, '&nbsp;')}</div>`).join(''); else lcd.innerHTML = '<div class="mut">LCD sin inicializar</div>';
}

/* ---------- informe ---------- */
function buildReport() {
  const r = $('#pg-report'); r.classList.add('rp');
  r.innerHTML = `<div class="rp-tb"><button class="b prim" id="rpp">Imprimir / guardar PDF</button><button class="b" id="rph">Descargar HTML</button><button class="b" id="rpr">Actualizar datos</button><button class="b" id="rps">Guardar proyecto (.json)</button><label class="b filebtn">Abrir proyecto<input type="file" id="rpo" accept=".json"></label><span class="mut" id="rpn">Rellena lo medido en el taller en las celdas con fondo marcado. Las capturas se toman al salir de cada módulo.</span></div><div class="rp-v" id="rpv"></div>`;
  $('#rpr').onclick = refreshReport; $('#rpp').onclick = printReport; $('#rph').onclick = downloadReport; $('#rps').onclick = saveFile;
  $('#rpo').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { loadProject(JSON.parse(rd.result)); App.toast('Proyecto cargado.'); } catch (err) { App.toast('Archivo no válido.'); } }; rd.readAsText(f); };
  const v = $('#rpv');
  v.addEventListener('input', (e) => { const t = e.target.closest('[data-f]'); if (t) Report.state.fields[t.dataset.f] = t.innerText; if (e.target.closest('[data-student]')) Report.state.student = e.target.innerText; if (e.target.closest('[data-date]')) Report.state.date = e.target.innerText; App.touch(); });
  v.addEventListener('change', (e) => { const u = e.target.dataset.up; if (!u) return; const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { Report.state.photos[u] = rd.result; refreshReport(); App.touch(); }; rd.readAsDataURL(f); });
}
function refreshReport() {
  if (!App.practice) { $('#rpv').innerHTML = '<div class="rep"><div class="page content"><h2>Aún no hay práctica</h2><p>Abre una práctica en «Prácticas» y trabaja en ella: el informe se rellena con lo que hagas.</p></div></div>'; return; }
  // capturas actuales si estamos en la página (no hay salida previa)
  if (!App.caps.schem) App.caps.schem = App.schemEd.svgToDataURL();
  if (!App.caps.board) { App.caps.board = App.boardEd.svgToImg(); }
  if (!App.caps.la) App.caps.la = laImage(); if (!App.caps.fpga) App.caps.fpga = App.fpgaUI.ed.svgToDataURL();
  $('#rpv').innerHTML = Report.render(App);
}
function reportCSS() { const t = $('style#css').textContent, i = t.indexOf('/*REPORT*/'); return t.slice(i); }
function printReport() { if (!App.practice) return; refreshReport(); const old = $('#printroot'); if (old) old.remove(); const d = document.createElement('div'); d.id = 'printroot'; d.innerHTML = $('#rpv').innerHTML; document.body.appendChild(d); document.body.classList.add('printing'); setTimeout(() => { window.print(); setTimeout(() => { document.body.classList.remove('printing'); d.remove(); }, 400); }, 120); }
function downloadReport() { if (!App.practice) return; refreshReport(); const p = Practicas.get(App.practice); const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${p.free ? 'Modo libre' : 'Práctica ' + p.id}</title><style>${reportCSS()}\nbody{background:#F9F8F6;margin:0;padding:24px}</style></head><body>${$('#rpv').innerHTML}</body></html>`; dl(`Informe_P${p.id}.html`, html, 'text/html'); }
function dl(name, data, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
function project() { return { v: 1, practice: App.practice, report: Report.state, kmap: App.kmap.st, schem: App.schemEd.doc.toJSON(), board: App.boardEd.board, fpga: App.fpgaUI.ed.doc.toJSON(), log: App.boardEd.log }; }
function saveFile() { dl(`DIGITAL-SIM_${App.practice === 'LIBRE' ? 'libre' : 'P' + App.practice}.json`, JSON.stringify(project()), 'application/json'); App.fileDirty = false; App.lastFile = Date.now(); autoStatus(); }
function loadProject(j) { App.practice = j.practice; Object.assign(Report.state, j.report); App.kmap.st = j.kmap; App.kmap.recalc(); App.kmap.render(); App.schemEd.load(j.schem); App.fpgaUI.ed.load(j.fpga); App.boardEd.load(j.board); App.boardEd.log = j.log || []; refreshReport(); }
function hhmm(t) { return new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
function autoStatus() {
  const el = $('#st4'); if (!el) return; const a = App.lastAuto ? 'Autoguardado ' + hhmm(App.lastAuto) : '', f = App.fh ? ' · archivo: ' + App.fh.name : (App.fileDirty ? ' · sin guardar en archivo' : App.lastFile ? ' · archivo guardado ' + hhmm(App.lastFile) : '');
  el.textContent = a + f; el.className = App.fileDirty && !App.fh ? 'warnt' : '';
}
async function autoFile() {
  if (!window.showSaveFilePicker) { App.toast('Tu navegador no permite escribir en un archivo de forma continua. Usa Chrome/Edge o «Guardar proyecto».'); return; }
  try { App.fh = await window.showSaveFilePicker({ suggestedName: `DIGITAL-SIM_P${App.practice || 'X'}.json`, types: [{ description: 'Proyecto DIGITAL-SIM', accept: { 'application/json': ['.json'] } }] }); await writeFH(); App.toast('Autoguardado activado en «' + App.fh.name + '». Se escribe solo tras cada cambio.'); }
  catch (e) { App.fh = null; }
  autoStatus();
}
async function writeFH() { if (!App.fh) return; try { const w = await App.fh.createWritable(); await w.write(JSON.stringify(project())); await w.close(); App.fileDirty = false; App.lastFile = Date.now(); } catch (e) { App.fh = null; App.toast('No se pudo escribir en el archivo de autoguardado: se desactiva.'); } autoStatus(); }
window.addEventListener('beforeunload', (e) => { try { save(); } catch (er) { } if (App.fileDirty && !App.fh) { e.preventDefault(); e.returnValue = ''; } });
setInterval(() => { if (App.fileDirty && !App.fh && Date.now() - (App.lastFile || App.t0) > 10 * 60 * 1000 && Date.now() - (App.lastWarn || 0) > 10 * 60 * 1000) { App.lastWarn = Date.now(); App.toast('Llevas más de 10 min sin guardar en un archivo. Usa Archivo → Guardar proyecto (.json) o activa el autoguardado en archivo.'); } }, 30000);
App.t0 = Date.now();
function save() { App.lastAuto = Date.now(); autoStatus(); try { localStorage.setItem('digitalsim.v2', JSON.stringify(project())); } catch (e) { try { const j = project(); j.report = Object.assign({}, j.report, { photos: {} }); localStorage.setItem('digitalsim.v2', JSON.stringify(j)); } catch (e2) { } } }
function restore() { try { const s = localStorage.getItem('digitalsim.v2'); if (s) { const j = JSON.parse(s); loadProject(j); App.lastAuto = Date.now(); setTimeout(() => App.toast && App.toast('Se ha recuperado tu último trabajo guardado automáticamente en este navegador.'), 800); autoStatus(); } } catch (e) { } }

/* ---------- paneles ---------- */
function buildOverlays() {
  $('#ov-gloss').innerHTML = `<div class="ovc"><button class="ovx" data-close title="Cerrar (Esc)">×</button><h3>Siglas y fórmulas</h3><div class="gls">${SIGLAS.map(s => `<div><b>${esc(s[0])}</b><i>${esc(s[1])}</i><span>${esc(s[2])}</span></div>`).join('')}</div></div>`;
  $('#ov-help').innerHTML = `<div class="ovc"><button class="ovx" data-close title="Cerrar (Esc)">×</button><h3>Atajos y consejos</h3><div class="hl">
    <p><b>Montar:</b> arrastra una pieza del catálogo al lienzo. Arrastra una pieza para moverla y, con la pieza seleccionada, sus extremos (círculos verdes) para recolocarlos. Doble clic = editar valores (resistencia, color, referencia, modo…).</p>
    <p><b>Cables:</b> arrastra desde una patilla (esquema) o un agujero (protoboard) hasta otra. También vale pulsar una y luego la otra.</p>
    <p><b>Vista:</b> rueda = zoom; Alt + arrastrar (o botón central) desplaza la vista. En el esquema, arrastrar sobre el fondo dibuja un recuadro azul que selecciona varios componentes: arrástralos para moverlos en bloque o pulsa Supr para borrarlos; Mayús + clic añade o quita componentes. En la protoboard, pasa el ratón por un agujero para ver su tensión.</p>
    <p><b>Teclas:</b> Supr o Retroceso borra · Esc cancela · F1 guía de uso · Alt+1…5 cambia de pestaña.</p>
    <p><b>Instrumentos:</b> el multímetro mide tensión o, en serie, corriente. La sonda lógica tiene tres indicadores: rojo (nivel alto, ≥ 2 V), verde (nivel bajo, ≤ 0,8 V) y azul (alta impedancia: nada fija el nodo, o tensión indefinida). El analizador usa sus umbrales (VIL 0,6 V, VIH 1,2 V).</p>
    <p><b>Realismo:</b> las entradas al aire, VCC sin conectar, un LED sin resistencia o un electrolítico invertido dan avisos y averías como en el taller. Puedes seguir simulando para ver las consecuencias.</p>
    <p><b>Límites:</b> simulación de paso fijo (10 µs–1 ms), sin retardos de propagación reales; el LCD no pasa por los pines.</p></div></div>`;
  document.querySelectorAll('.ov').forEach(o => o.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === o) closeOv(); }));
}
function statusFrame() {
  const ed = App.page === 'schem' ? App.schemEd : App.page === 'board' ? App.boardEd : App.page === 'fpga' ? App.fpgaUI.ed : null;
  const p = Practicas.get(App.practice); $('#pcur').textContent = p ? (p.free ? 'Modo libre' : `Práctica ${p.id} · ${p.title}`) : 'Sin práctica abierta';
  if (!ed || !ed.sim) { $('#st1').textContent = 'Listo'; $('#st2').textContent = ''; return; }
  const n = App.page === 'board' ? (ed.warns || []).length + (ed.sim.alerts || []).length + (ed.extraAlerts || []).length : (ed.warns || []).length + (ed.sim.alerts || []).length;
  $('#st1').textContent = (ed.running ? '● Simulando' : '○ Pausado') + ' · t = ' + Timing.fmtT(ed.sim.t);
  $('#st2').textContent = n ? `⚠ ${n} aviso${n > 1 ? 's' : ''}` : 'Sin avisos';
  $('#st2').className = n ? 'warnt' : '';
}
function tick() { requestAnimationFrame(tick); mcuFrame(); statusFrame(); }
window.addEventListener('DOMContentLoaded', App.init);
})();
