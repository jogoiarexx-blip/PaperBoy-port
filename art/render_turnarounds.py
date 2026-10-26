"""Import final GLBs and render real Cycles turnarounds. Not a WebGL capture."""
import bpy, json,math,os,sys,hashlib,contextlib
WORLD='--world' in sys.argv
DETAIL='--detail' in sys.argv
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/('public/review/detail-v6' if DETAIL else 'public/review/living-v5' if WORLD else 'public/review/japanese-v4');OUT.mkdir(parents=True,exist_ok=True)
@contextlib.contextmanager
def quiet():
    sys.stdout.flush();sys.stderr.flush();a=os.dup(1);b=os.dup(2)
    logs=ROOT/'art/logs';logs.mkdir(exist_ok=True)
    with (logs/(OUT.name+'-render.log')).open('a') as log:
        os.dup2(log.fileno(),1);os.dup2(log.fileno(),2)
        try:yield
        finally:sys.stdout.flush();sys.stderr.flush();os.dup2(a,1);os.dup2(b,2);os.close(a);os.close(b)
manifest=json.loads((ROOT/'public/assets/manifest.json').read_text());captures=[]
selected=[a for a in manifest['assets'] if (a.get('revision')=='detail-polish-v6' if DETAIL else (a.get('revision')=='living-summer-v5') if WORLD else (a['id'].startswith('house_') or a['id']=='rider'))]
if '--only' in sys.argv:
    ids=sys.argv[sys.argv.index('--only')+1].split(',');selected=[a for a in selected if a['id'] in ids]
    captures=[c for c in json.loads((OUT/'manifest.json').read_text())['captures'] if c['asset'] not in ids] if (OUT/'manifest.json').exists() else []
if '--only-npcs' in sys.argv:
    selected=[a for a in selected if a['id'].startswith('npc_')]
    captures=[c for c in json.loads((OUT/'manifest.json').read_text())['captures'] if not c['asset'].startswith('npc_')]
for asset in selected:
    with quiet():
        bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets'/asset['file']))
        if WORLD and asset['id'].startswith('npc_'):
            for prop in ['npc_cup','npc_broom']:
                node=bpy.data.objects.get(prop)
                if node:
                    for child in node.children_recursive:child.hide_render=True
        models=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render]
        points=[o.matrix_world@Vector(v) for o in models for v in o.bound_box]
        low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(low+high)/2
        scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20 if DETAIL else 24 if WORLD else 48;scene.cycles.use_denoising=True;scene.cycles.max_bounces=3;scene.render.threads_mode='FIXED';scene.render.threads=4
        scene.render.resolution_x=scene.render.resolution_y=640 if WORLD else 800;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
        scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=-.25
        world=bpy.data.worlds.new('review-world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.85,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
        floor=bpy.data.meshes.new('review-floor');floor.from_pydata([(-100,-100,low.z-.02),(100,-100,low.z-.02),(100,100,low.z-.02),(-100,100,low.z-.02)],[],[(0,1,2,3)])
        obj=bpy.data.objects.new('review-floor',floor);scene.collection.objects.link(obj);mat=bpy.data.materials.new('review-floor');mat.diffuse_color=(.72,.75,.66,1);obj.data.materials.append(mat)
        light=bpy.data.lights.new('warm-sun','SUN');light.energy=2.1;light.color=(1,.89,.70);light.angle=.08;sun=bpy.data.objects.new('sun',light);scene.collection.objects.link(sun);sun.rotation_euler=(math.radians(25),math.radians(-30),math.radians(-25))
        if DETAIL:
            for node in list(scene.objects):
                if 'localLight' not in node:continue
                spec=node['localLight'];data=bpy.data.lights.new('fixture-fill','POINT');data.energy=spec['intensity']*3;data.color=(1,.78,.48) if spec['kind']!='taillight' else (1,.13,.05);data.shadow_soft_size=.16
                fixture=bpy.data.objects.new('fixture-fill',data);scene.collection.objects.link(fixture);fixture.location=node.matrix_world.translation
        data=bpy.data.cameras.new('review-camera');camera=bpy.data.objects.new('review-camera',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO';data.clip_end=1000
        clay=bpy.data.materials.new('clay');clay.diffuse_color=(.57,.62,.59,1)
    for view,direction in [('front',(0,1,.16)),('side',(1,0,.12)),('rear',(0,-1,.16)),('clay',(1,1,.65))]:
        with quiet():
            camera.location=center+Vector(direction).normalized()*max(10,(high-low).length*2);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
            inv=camera.matrix_world.inverted();projected=[inv@p for p in points];data.ortho_scale=max(max(p[i] for p in projected)-min(p[i] for p in projected) for i in [0,1])*1.17
            if view=='clay':
                for o in models:
                    for slot in o.material_slots:slot.material=clay
                if DETAIL:
                    for o in scene.objects:
                        if o.type=='LIGHT' and o.data.type=='POINT':o.hide_render=True
            filename=asset['id']+'-'+view+'.png';scene.render.filepath=str(OUT/filename);bpy.ops.render.render(write_still=True)
        captures.append({'asset':asset['id'],'view':view,'file':filename,'assetSha256':asset['sha256']});print('Rendered '+filename,flush=True)
(OUT/'manifest.json').write_text(json.dumps({'renderer':'Blender 4.2 Cycles CPU — not WebGL','styleRevision':'detail-polish-v6' if DETAIL else 'living-summer-v5' if WORLD else 'japanese-closeup-v4','captures':captures},indent=2))
sys.stdout.flush();sys.stderr.flush();os._exit(0)
