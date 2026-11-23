import sys,os,base64,glob
d='/home/claude/sim/src/'
order=['engine.js','kmap.js','timing.js','ui.js','thumbs.js','schem.js','board.js','mcu.js','codeed.js','ui_kmap.js','practicas.js','fpga.js','report.js','app.js']
js='\n'.join(open(d+f).read() for f in order)
css=open(d+'style.css').read()
av=''
for p in ['/home/claude/sim/avatar.webp']:
    if os.path.exists(p): av='window.__AVATAR__="data:image/webp;base64,'+base64.b64encode(open(p,'rb').read()).decode()+'";\n'
html='<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DIGITAL-SIM · Simulador digital · Equipos Microprogramables</title><style id="css">'+css+'</style></head><body><div id="app"></div><script>'+av+js+'</script></body></html>'
os.makedirs('/home/claude/sim/dist',exist_ok=True)
open('/home/claude/sim/dist/DIGITAL-SIM.html','w').write(html)
print(len(html))
