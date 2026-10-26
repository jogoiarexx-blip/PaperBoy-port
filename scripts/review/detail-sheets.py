"""Assemble actual review renders and complete downloadable asset/source bundles."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,zipfile,io
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/review/detail-v6'
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
views=['front','side','rear','clay']
def sheet(name,ids,columns=4,entries=None):
    entries=entries or [(asset,view) for asset in ids for view in views];cell=320;row=351
    image=Image.new('RGB',(columns*cell,78+row*((len(entries)+columns-1)//columns)),'#eef0e8');draw=ImageDraw.Draw(image)
    draw.text((18,15),'PAPERROUTE / DETAIL POLISH',font=font,fill='#254e40')
    draw.text((18,43),'Blender Cycles / actual GLB assets / not WebGL',font=font,fill='#536e62')
    for i,(asset,view) in enumerate(entries):
        x=i%columns*cell;y=78+i//columns*row
        image.paste(Image.open(OUT/f'{asset}-{view}.png').convert('RGB').resize((cell,cell)),(x,y))
        draw.text((x+8,y+cell+5),f'{asset} / {view}',font=font,fill='#254e40')
    image.save(OUT/name,quality=92)
sheet('houses-turnarounds.jpg',[f'house_{i}' for i in range(7)])
sheet('vehicles-turnarounds.jpg',['car','kei_truck'])
sheet('greenery-turnarounds.jpg',['tree_oak','tree_elm','potted_plants','flower_patch'])
sheet('street-turnarounds.jpg',['post_box','drain_grate','bench','boundary_wall','streetlight','vending_machine'])
sheet('shops-turnarounds.jpg',['cafe','dagashi','small_shop'])
sheet('polish-overview.jpg',[],columns=3,entries=[('house_0','front'),('car','clay'),('kei_truck','clay'),('tree_oak','front'),('potted_plants','front'),('post_box','front')])
with zipfile.ZipFile(OUT/'detail-v6-turnarounds.zip','w',zipfile.ZIP_DEFLATED) as out:
    review=json.loads((OUT/'manifest.json').read_text())
    # High-quality JPEG copies keep the downloadable review compact. The original
    # lossless PNGs remain beside the manifest in the project and on the Site.
    for capture in review['captures']:
        original=capture['file'];name=Path(original).with_suffix('.jpg').name;buffer=io.BytesIO()
        Image.open(OUT/original).convert('RGB').save(buffer,format='JPEG',quality=95,subsampling=0)
        out.writestr(name,buffer.getvalue());capture['file']=name;capture['originalPng']=original
    out.writestr('manifest.json',json.dumps(review,indent=2))
    for path in [OUT/'polish-overview.jpg',*OUT.glob('*-turnarounds.jpg')]:out.write(path,path.name)
manifest=json.loads((ROOT/'public/assets/manifest.json').read_text())
with zipfile.ZipFile(OUT/'detail-v6-assets.zip','w',zipfile.ZIP_DEFLATED) as out:
    out.write(ROOT/'public/assets/manifest.json','assets/manifest.json')
    # Include the full manifest's assets so this download is independently usable.
    textures=set()
    for a in manifest['assets']:
        out.write(ROOT/'public/assets'/a['file'],'assets/'+a['file']);textures.update(a.get('textures',[]))
    for t in textures:out.write(ROOT/'public/assets'/t,'assets/'+t)
with zipfile.ZipFile(OUT/'code-and-scripts-v6.zip','w',zipfile.ZIP_DEFLATED) as out:
    paths={ROOT/p for p in ['INTEGRATION-V6.md','INTEGRATION-V7.md','README.md','REVIEW.md','package.json','pnpm-lock.yaml','scripts/validate_assets.py','app/globals.css']}
    for pattern in ['engine/*.mjs','components/game/*.mjs','art/*.py','art/fonts/*','tests/*.mjs','scripts/review/*','app/*.tsx']:paths.update(ROOT.glob(pattern))
    for p in sorted(paths):
        if p.is_file():out.write(p,p.relative_to(ROOT).as_posix())
print('Saved five review sheets and source, GLB/texture and turnaround ZIPs.')
