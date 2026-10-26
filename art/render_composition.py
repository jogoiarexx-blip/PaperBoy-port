"""Camera studies from the live layout and final GLBs. Cycles, explicitly not WebGL.

Run node scripts/review/export-composition.mjs first. Geometry and camera match
the runtime; Cycles PBR lighting approximates the painted WebGL materials.
"""
from pathlib import Path
import bpy,json,math,sys,os,contextlib
from mathutils import Vector,Matrix,Euler
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/review/horizon-v7';OUT.mkdir(parents=True,exist_ok=True)
layout=json.loads((OUT/'layout.json').read_text())
manifest=json.loads((ROOT/'public/assets/manifest.json').read_text())
files={a['id']:a['file'] for a in manifest['assets']}
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)));CI=C.inverted()
def color(h):
    values=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values)+(1,)
def point(v):return Vector((v[0],-v[2],v[1]))
@contextlib.contextmanager
def quiet():
    logs=ROOT/'art/logs';logs.mkdir(exist_ok=True)
    sys.stdout.flush();sys.stderr.flush();a=os.dup(1);b=os.dup(2)
    with (logs/'composition-render.log').open('a') as log:
        os.dup2(log.fileno(),1);os.dup2(log.fileno(),2)
        try:yield
        finally:sys.stdout.flush();sys.stderr.flush();os.dup2(a,1);os.dup2(b,2);os.close(a);os.close(b)

with quiet():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU'
    scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.max_bounces=3
    scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=-.25
    templates=bpy.data.collections.new('templates');scene.collection.children.link(templates);templates.hide_render=True
    sources={}
    for asset in sorted({p['asset'] for p in layout['placements']}|{'rider'}):
        before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets'/files[asset]))
        nodes=list(set(scene.objects)-before);sources[asset]=nodes
        for obj in nodes:
            for col in list(obj.users_collection):col.objects.unlink(obj)
            templates.objects.link(obj)
    # Sky artwork remains actual painted source pixels. Mix a blue zenith, warm
    # horizon and lit cloud palette through world nodes, with separate ambient fill.
    world=bpy.data.worlds.new('summer-world');world.use_nodes=True;scene.world=world
    ns=world.node_tree.nodes;links=world.node_tree.links;ns.clear()
    output=ns.new('ShaderNodeOutputWorld');mix=ns.new('ShaderNodeMixShader');ray=ns.new('ShaderNodeLightPath')
    fill=ns.new('ShaderNodeBackground');fill.inputs[0].default_value=color('#adcbd9');fill.inputs[1].default_value=.65
    background=ns.new('ShaderNodeBackground');background.inputs[1].default_value=1.1
    env=ns.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'art/textures/summer-sky-v5-source.png'));env.interpolation='Linear'
    coord=ns.new('ShaderNodeTexCoord');mapping=ns.new('ShaderNodeMapping');mapping.inputs['Rotation'].default_value[2]=math.pi*.4
    links.new(coord.outputs['Generated'],mapping.inputs['Vector']);links.new(mapping.outputs['Vector'],env.inputs['Vector'])
    hue=ns.new('ShaderNodeHueSaturation');hue.inputs['Saturation'].default_value=.90;hue.inputs['Value'].default_value=1.03
    links.new(env.outputs['Color'],hue.inputs['Color']);links.new(hue.outputs[0],background.inputs[0])
    links.new(ray.outputs['Is Camera Ray'],mix.inputs[0]);links.new(fill.outputs[0],mix.inputs[1]);links.new(background.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs[0])
    sunData=bpy.data.lights.new('summer-sun','SUN');sunData.energy=2.1;sunData.angle=.065;sunData.color=(1,.89,.70)
    sun=bpy.data.objects.new('summer-sun',sunData);scene.collection.objects.link(sun)
    sun.rotation_euler=(-point(layout['style']['sun']['offset'])).to_track_quat('-Z','Y').to_euler()
    cameraData=bpy.data.cameras.new('chase-camera');camera=bpy.data.objects.new('chase-camera',cameraData);scene.collection.objects.link(camera);scene.camera=camera
    cameraData.sensor_fit='VERTICAL';cameraData.sensor_height=32;cameraData.clip_start=.1;cameraData.clip_end=10000
    # Illustrated water wash; the animated GLSL foam/glints are not simulated by Cycles.
    for material in bpy.data.materials:
        surface=material.get('surface',material.name.split('@')[0]).split('.')[0]
        if surface=='water' and material.use_nodes:
            bsdf=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if bsdf:
                bsdf.inputs['Base Color'].default_value=color(layout['ocean']['deep']);bsdf.inputs['Roughness'].default_value=.34
        if surface=='asphalt' and material.use_nodes:
            bsdf=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if bsdf:bsdf.inputs['Base Color'].default_value=color('#555e59')

active=[]
def instance(asset,mat):
    root=bpy.data.objects.new(asset+'-instance',None);scene.collection.objects.link(root);active.append(root)
    root.matrix_world=C@Matrix([mat[i::4] for i in range(4)])@CI
    copies={}
    for src in sources[asset]:
        obj=src.copy();scene.collection.objects.link(obj);active.append(obj);copies[src]=obj
    for src,obj in copies.items():
        obj.parent=copies.get(src.parent,root);obj.matrix_parent_inverse=src.matrix_parent_inverse.copy();obj.matrix_basis=src.matrix_basis.copy()
    return root,copies

captures=[]
for frame in layout['frames']:
    with quiet():
        for obj in active:bpy.data.objects.remove(obj,do_unlink=True)
        active.clear();rider=frame['rider'];z=rider['z']
        for placement in layout['placements']:
            asset=placement['asset']
            for mat in placement['matrices']:
                distance=-mat[14]
                if asset not in ['terrain','ocean','beach']:
                    chunk=math.floor(distance/69)*69
                    if chunk>=z+145 or chunk+69<=z-30:continue
                root,copies=instance(asset,mat)
                if asset.startswith('npc_'):
                    for src,obj in copies.items():
                        if src.name.startswith(('npc_cup','npc_broom')):
                            obj.hide_render=True
                            for child in obj.children_recursive:child.hide_render=True
        mat=Matrix.Translation(Vector((rider['x'],frame['groundY'],-z)))
        root,copies=instance('rider',[mat[row][col] for col in range(4) for row in range(4)])
        p=frame['pose'];root.matrix_world=root.matrix_world@C@Euler((p['bodyPitch'],0,p['lean']+p['fall']),'XYZ').to_matrix().to_4x4()@CI
        for src,obj in copies.items():
            for name,value in [('leg_left',p['leftLeg']),('leg_right',p['rightLeg']),('arm_left',p['leftArm']),('arm_right',p['rightArm']),('wheel_front',p['wheel']),('wheel_rear',p['wheel'])]:
                if src.name.split('.')[0]==name:obj.rotation_euler.x=value
        camera.location=point(frame['camera']['position']);camera.rotation_euler=(point(frame['camera']['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
        cameraData.lens=16/math.tan(math.radians(frame['camera']['fov']/2))
        scene.render.resolution_x=frame['width'];scene.render.resolution_y=frame['height'];scene.render.resolution_percentage=100
        name=frame['name']+'-composition.png';scene.render.filepath=str(OUT/name);scene.render.image_settings.file_format='PNG'
        bpy.ops.render.render(write_still=True)
    captures.append({'file':name,'camera':frame['camera'],'width':frame['width'],'height':frame['height']})
    print('Rendered '+name+' (Blender Cycles, not WebGL)',flush=True)
(OUT/'manifest.json').write_text(json.dumps({'renderer':'Blender 4.2 Cycles CPU — not WebGL','limitation':'Shared live camera and placement matrices; PBR lighting approximates toon materials. Does not validate GLSL compilation, animated water or device FPS.','cameraRevision':layout['cameraRevision'],'styleRevision':layout['styleRevision'],'sourceHashes':layout['sourceHashes'],'captures':captures},indent=2))
sys.stdout.flush();sys.stderr.flush();os._exit(0)
