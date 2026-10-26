"""Validate GLB topology, color attributes, animation pivots and mobile budgets."""
import hashlib,json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; assets=ROOT/'public/assets'; manifest=json.loads((assets/'manifest.json').read_text())
assert manifest['generator'].startswith('Blender ')
assert len([a for a in manifest['assets'] if a['id'].startswith('house_')])==7
total=0
for a in manifest['assets']:
    b=(assets/a['file']).read_bytes();magic,version,length=struct.unpack_from('<III',b)
    assert magic==0x46546c67 and version==2 and length==len(b),a['id']
    assert hashlib.sha256(b).hexdigest()==a['sha256'],a['id']
    n,kind=struct.unpack_from('<II',b,12);assert kind==0x4e4f534a
    gltf=json.loads(b[20:20+n]);assert gltf['asset']['version']=='2.0';assert 'Blender' in gltf['asset']['generator']
    tris=0
    for m in gltf['meshes']:
        for p in m['primitives']:
            assert 'POSITION' in p['attributes'] and 'NORMAL' in p['attributes'] and 'COLOR_0' in p['attributes'],a['id']
            assert p.get('mode',4)==4
            tris+=gltf['accessors'][p['indices']]['count']//3
    assert tris==a['triangles'],(a['id'],tris,a['triangles'])
    closeup=a['id'].startswith('house_') or a['id'] in ['rider','cafe','dagashi','small_shop']
    detailed=a.get('revision')=='detail-polish-v6'
    limit=18000 if closeup else 8200 if a['id'] in ['car','kei_truck'] else 5200 if detailed else 3000
    assert tris<=limit and len(b)<=(2000000 if closeup else 1000000 if detailed else 300000),(a['id'],tris,len(b))
    for texture in a.get('textures',[]):
        image=assets/texture;assert image.is_file(),texture
        assert len(image.read_bytes())<1200000,texture
    if detailed and a['id'].startswith('house_'):
        assert a['ao']['resolution']==1024
        assert any('localLight' in n.get('extras',{}) for n in gltf['nodes'])
    for material in gltf['materials']:
        if material.get('pbrMetallicRoughness',{}).get('baseColorTexture') and material.get('occlusionTexture'):
            assert material['occlusionTexture'].get('texCoord',0)!=material['pbrMetallicRoughness']['baseColorTexture'].get('texCoord',0),a['id']
    if closeup or a['id'] in ['road','fence']:
        assert all('occlusionTexture' in m for m in gltf['materials']),a['id']
        assert all('TEXCOORD_0' in p['attributes'] for m in gltf['meshes'] for p in m['primitives']),a['id']
    if a['id']=='rider':
        nodes={n.get('name') for n in gltf['nodes']}
        assert {'arm_right','arm_left','leg_right','leg_left','wheel_front','wheel_rear','head','torso'}<=nodes,nodes
    if a['id'].startswith('npc_'):
        nodes={n.get('name') for n in gltf['nodes']}
        assert {'npc_hips','npc_head','npc_arm_left','npc_arm_right','npc_leg_left','npc_leg_right','npc_knee_left','npc_knee_right','npc_cup','npc_broom','npc_elbow_left','npc_elbow_right'}<=nodes
    total+=len(b)
textures={t for a in manifest['assets'] for t in a.get('textures',[])}
texture_bytes=sum((assets/t).stat().st_size for t in textures)
assert total<19_000_000
assert total+texture_bytes<32_000_000
assert len(manifest['assets'])==42
print(f"PASS: {len(manifest['assets'])} Blender GLBs, 7 house families, all color attributes and rider pivots; {total:,} GLB bytes + {texture_bytes:,} shared texture bytes; scoped budgets and baked AO.")
