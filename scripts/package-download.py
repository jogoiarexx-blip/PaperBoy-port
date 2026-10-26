"""Archive the complete committed project, excluding redundant archive copies.

Usage: python scripts/package-download.py /absolute/path/PAPERROUTE-complete.zip
Dependencies, runtime caches and secrets are not tracked and are not included.
"""
import hashlib,json,subprocess,sys,zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
destination=Path(sys.argv[1]).resolve()
if destination.is_relative_to(ROOT):
    raise SystemExit('Write the download outside the project to avoid recursive archives.')
if subprocess.check_output(['git','status','--porcelain'],cwd=ROOT).strip():
    raise SystemExit('Commit the complete project before creating its download.')
commit=subprocess.check_output(['git','rev-parse','--verify','HEAD'],cwd=ROOT,text=True).strip()
names=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
hashes={}
with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name in sorted(filter(None,names)):
        p=ROOT/name
        if p.suffix in ['.zip','.gz','.log'] or not p.is_file():continue
        if p.name.startswith('.env') or p.suffix in ['.pem','.key']:
            raise SystemExit('Refusing to archive a credential-shaped file: '+name)
        payload=p.read_bytes();hashes[name]=hashlib.sha256(payload).hexdigest()
        archive.writestr('PAPERROUTE/'+name,payload)
    archive.writestr('PAPERROUTE/DOWNLOAD-MANIFEST.json',json.dumps({
        'project':'PAPERROUTE','sourceCommit':commit,'files':hashes,
        'notes':'Full project source, all assets and review originals. Dependencies, build output and redundant nested ZIPs are reproducible and excluded.'
    },indent=2))
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert 'PAPERROUTE/public/assets/manifest.json' in archive.namelist()
    assert 'PAPERROUTE/art/render_composition.py' in archive.namelist()
print(json.dumps({'path':str(destination),'files':len(hashes)+1,'bytes':destination.stat().st_size,'sourceCommit':commit}))
