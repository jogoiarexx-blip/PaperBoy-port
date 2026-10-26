from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,zipfile
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'public/review';manifest=json.loads((out/'manifest.json').read_text())
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
try:
    title=ImageFont.truetype(font_path,30);label=ImageFont.truetype(font_path,16);small=ImageFont.truetype(font_path,14)
except OSError:title=label=small=ImageFont.load_default()
def sheet(filename,heading,entries,cols=4):
    w,h=360,393;rows=(len(entries)+cols-1)//cols;im=Image.new('RGB',(cols*w,rows*h+114),'#eef0e8');d=ImageDraw.Draw(im)
    d.text((25,21),'PAPERROUTE / '+heading,font=title,fill='#254e40');d.text((25,71),'STYLE PASS 04 · Three.js geometry renders · WebGL shading and device performance pending',font=small,fill='#738375')
    for i,(file,caption) in enumerate(entries):
        x=(i%cols)*w;y=114+(i//cols)*h;im.paste(Image.open(out/file).convert('RGB').resize((w,w),Image.Resampling.LANCZOS),(x,y));d.text((x+16,y+w+8),caption,font=label,fill='#254e40')
    im.save(out/filename)
families=['Coastal minka','Hipped farmhouse','Long engawa','Timber gable','Merchant house','L-wing homestead','Plaster cottage']
sheet('checkpoint-houses.png','SEVEN HOUSE FAMILIES',[(f'house_{i}-riding-front.png',f'{i+1:02} / {n}') for i,n in enumerate(families)]+[('tree_oak-riding-front.png','08 / Puffy oak foliage')])
sheet('checkpoint-rider.png','RIDER TURNAROUNDS',[(f'rider-{motion}-{view}.png',f'{motion.title()} / {view.title()}') for motion in ['riding','steering','throwing','sprinting','falling'] for view in ['front','side','rear','clay']])
sheet('checkpoint-props.png','STREET PROPS',[(f'{asset}-riding-{view}.png',f'{asset.title()} / {view.title()}') for asset in ['mailbox','car','dog','bin','fence','newspaper','tree_elm','cloud'] for view in ['side','clay']])
sheet('checkpoint-preview.png','PAINTED FOLIAGE PASS',[(f'rider-riding-{view}.png',f'Rider / {view.title()}') for view in ['front','side','rear','clay']]+[(f'house_{i}-riding-front.png',families[i]) for i in [0,1,4]]+[('tree_oak-riding-front.png','Puffy oak')])
with zipfile.ZipFile(out/'checkpoint04-geometry.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for c in manifest['captures']:archive.write(out/c['file'],c['file'])
    for name in ['manifest.json','checkpoint-houses.png','checkpoint-rider.png','checkpoint-props.png']:archive.write(out/name,name)
print('Created four contact sheets and complete 104-view checkpoint archive.')
