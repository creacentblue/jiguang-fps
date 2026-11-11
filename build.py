# Rebuild index.html from src/
import os
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),'src')+os.sep
tpl=open(base+'tpl.html',encoding='utf8').read()
css=open(base+'style.css',encoding='utf8').read()
js=''.join(open(base+f,encoding='utf8').read()+'\n' for f in ['a_core.js','b_world.js','c_audio.js','d_logic.js','e_render.js','e2_models.js','e3_hud.js','g_touch.js','f_ui.js'])
out=tpl.replace('/*CSS*/',css).replace('/*JS*/',js.replace('</script>','<\\/script>'))
open(os.path.join(os.path.dirname(base[:-1]),'index.html'),'w',encoding='utf8').write(out)
print(len(out.encode('utf8')))
