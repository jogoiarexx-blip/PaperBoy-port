"""Arrange actual Cycles renders; no synthetic views."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,zipfile
out=Path(__file__).resolve().parents[2]/'public/review/japanese-v4'
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
def sheet(name,assets):
    im=Image.new('RGB',(1600,80+440*len(assets)),'#eef0e8');d=ImageDraw.Draw(im)
    d.text((20,20),'PAPERROUTE / Blender Cycles asset review / Japanese summer pass',font=font,fill='#254e40')
    for row,asset in enumerate(assets):
        for col,view in enumerate(['front','side','rear','clay']):
            im.paste(Image.open(out/f'{asset}-{view}.png').convert('RGB').resize((400,400)),(col*400,80+row*440))
            d.text((col*400+15,485+row*440),f'{asset} / {view}',font=font,fill='#254e40')
    im.save(out/name)
sheet('houses-turnarounds.jpg',[f'house_{i}' for i in range(7)]);sheet('rider-turnaround.png',['rider'])
with zipfile.ZipFile(out/'japanese-v4-turnarounds.zip','w',zipfile.ZIP_DEFLATED) as z:
    for c in json.loads((out/'manifest.json').read_text())['captures']:z.write(out/c['file'],c['file'])
    for name in ['manifest.json','houses-turnarounds.jpg','rider-turnaround.png']:z.write(out/name,name)
