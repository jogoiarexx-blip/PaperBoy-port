"""Contact sheets from actual GLB renders and the deterministic NPC pose harness."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,zipfile
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'public/review/living-v5';geo=ROOT/'public/review'
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
def sheet(name,entries,cols=4,subtitle='Blender Cycles / asset review, not WebGL'):
    cell=320;h=354;im=Image.new('RGB',(cell*cols,80+h*((len(entries)+cols-1)//cols)),'#eef0e8');d=ImageDraw.Draw(im)
    d.text((20,15),'PAPERROUTE / LIVING SUMMER',font=font,fill='#254e40');d.text((20,44),subtitle,font=font,fill='#536e62')
    for i,(file,label) in enumerate(entries):
        x=i%cols*cell;y=80+i//cols*h;im.paste(Image.open(file).convert('RGB').resize((cell,cell)),(x,y));d.text((x+10,y+cell+6),label,font=font,fill='#254e40')
    im.save(out/name)
outfits=['yukata','jinbei','maekake','school','summer'];views=['front','side','rear','clay']
sheet('wardrobe-turnarounds.jpg',[(out/f'npc_{o}-{v}.png',f'{o} / {v}') for o in outfits for v in views])
sheet('town-turnarounds.jpg',[(out/f'{a}-{v}.png',f'{a} / {v}') for a in ['cafe','dagashi','small_shop','vending_machine','streetlight','tree_oak','tree_elm'] for v in views])
sheet('resident-behaviors.jpg',[(geo/f'npc_{o}-{state}-clay.png',f'{o} / {state}') for o in outfits for state in ['walking','drinking','sweeping','looking']],subtitle='Three.js CPU geometry / deterministic NPC poses, not WebGL')
with zipfile.ZipFile(out/'living-v5-turnarounds.zip','w',zipfile.ZIP_DEFLATED) as z:
    for c in json.loads((out/'manifest.json').read_text())['captures']:z.write(out/c['file'],c['file'])
    for f in ['manifest.json','wardrobe-turnarounds.jpg','town-turnarounds.jpg','resident-behaviors.jpg']:z.write(out/f,f)
