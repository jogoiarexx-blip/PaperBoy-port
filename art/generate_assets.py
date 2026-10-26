"""Style stream. Run: blender --background --python art/generate_assets.py -- --out public/assets

All topology is authored here with mesh.from_pydata; no primitive operators or
stock model assets. The same script also runs with the official bpy Python wheel.
Coordinates in this file are glTF Y-up; the adapter converts them to Blender Z-up.
"""
import argparse, hashlib, json, math, os, random, sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'art'))
args=argparse.ArgumentParser(); args.add_argument('--out',default=str(ROOT/'public/assets'))
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT=Path(args.parse_args(argv).out); OUT.mkdir(parents=True,exist_ok=True)
R=random.Random(721)
PALETTE={'cream':'fff4d3','trim':'fffbeb','navy':'254c5e','glass':'518ba0','glassLight':'b7e3e1','roof':'536779','redRoof':'a65e47','wood':'b68b5c','bark':'6d6543','leaf':'52933b','leafLight':'83b94f','leafDark':'39783b','mint':'95c6ac','yellow':'f4d378','blue':'a0ccd8','pink':'e9afa0','lilac':'b3b5d0','peach':'eac299','gray':'b5bdc2','black':'253e48','metal':'b4c2bb','coral':'e96743','skin':'d8a275','hair':'59473e','bag':'e9bc49','paper':'fffbe5','ink':'497482','asphalt':'727f85','concrete':'d2d4c7','grass':'95bb54','water':'34aaca','cloud':'fffdf1'}
PALETTE.update({'leaf':'318b32','leafLight':'78ba38','leafDark':'256d37','grass':'8db848','asphalt':'687782'})
MATS={}
def material(name):
    if name in MATS:return MATS[name]
    c=PALETTE.get(name,name);srgb=tuple(int(c[i:i+2],16)/255 for i in (0,2,4));rgb=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in srgb)
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.95
    MATS[name]=m;return m
def conv(p):return (p[0],-p[2],p[1])
def mesh(name,verts,faces,mat,parent=None):
    me=bpy.data.meshes.new(name);me.from_pydata([conv(v) for v in verts],[],faces);me.materials.append(material(mat));me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    if parent:ob.parent=parent
    # Foliage has smooth surface normals and painted per-vertex pigment. Other
    # meshes retain the crisp authored planes and subtle face variation.
    col=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    foliage=mat in ('leaf','leafLight','leafDark')
    low=min(v[1] for v in verts);high=max(v[1] for v in verts)
    for poly in me.polygons:
        val=R.uniform(.91,1.0)
        poly.use_smooth=foliage
        for i in poly.loop_indices:
            if foliage:
                x,y,z=verts[me.loops[i].vertex_index];up=(y-low)/max(.001,high-low)
                daub=.5+.5*math.sin(x*5.7+math.sin(z*4.9))*math.cos(y*4.3+z*3.1)
                shade=.76+.17*up+.07*daub
                col.data[i].color=(min(1,shade*(1+.08*daub)),shade,shade*(.91-.06*up),1)
            else:col.data[i].color=(val,val,val,1)
    return ob
def box(name,p,s,mat,parent=None):
    x,y,z=p;a,b,c=[v/2 for v in s]
    v=[(x+i*a,y+j*b,z+k*c) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    return mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)],mat,parent)
def blob(name,p,s,mat,seed=0,parent=None,rings=6,segments=9):
    rnd=random.Random(seed);v=[]
    for i in range(rings+1):
        phi=math.pi*i/rings
        for j in range(segments):
            theta=2*math.pi*j/segments;f=1 if i in (0,rings) else rnd.uniform(.89,1.08)
            v.append((p[0]+math.sin(phi)*math.cos(theta)*s[0]*f,p[1]+math.cos(phi)*s[1]*f,p[2]+math.sin(phi)*math.sin(theta)*s[2]*f))
    faces=[]
    for i in range(rings):
        for j in range(segments):a=i*segments+j;b=i*segments+(j+1)%segments;faces.append((a,b,b+segments,a+segments))
    return mesh(name,v,faces,mat,parent)
def tube(name,a,b,r,mat,parent=None,n=8,r2=None):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0)) if abs(axis.y)<.9 else Vector((1,0,0))).normalized();v=axis.cross(u);verts=[]
    for pt,rad in [(a,r),(b,r if r2 is None else r2)]:
        for i in range(n):verts.append(tuple(pt+rad*(math.cos(i*2*math.pi/n)*u+math.sin(i*2*math.pi/n)*v)))
    return mesh(name,verts,[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,parent)
def roof(name,x,y,z,w,d,h,mat='roof',hip=False):
    if hip:
        v=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2),(x-w*.22,y+h,z),(x+w*.22,y+h,z)]
        return mesh(name,v,[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4),(3,2,1,0)],mat)
    v=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x,y+h,z-d/2),(x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x,y+h,z+d/2)]
    return mesh(name,v,[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1),(0,1,4,3)],mat)
def tree(kind=0):
    tube('tapered-trunk',(0,0,0),(.12,3.65,0),.29,'bark',n=7,r2=.14)
    for i in range(5):
        ang=i*2.4;end=(math.cos(ang)*1.3,3.3+(i%2)*.6,math.sin(ang)*1.15);tube('branch',(.08,2.4,0),end,.14,'bark',n=6,r2=.07)
    for i in range(10):
        a=i*2.4;rad=0 if i==9 else 1.1+(i%2)*.35;p=(math.cos(a)*rad,3.8+(i%3)*.65,math.sin(a)*rad)
        blob('puffy-crown',p,(1.6,1.35,1.5),['leaf','leafLight','leafDark'][i%3],seed=i+kind*23,rings=8,segments=12)
def mailbox():
    box('timber-post',(0,.58,0),(.14,1.16,.15),'wood');box('cross-brace',(0,1.06,.1),(.15,.13,.75),'wood')
    box('mailbox-body',(0,1.28,0),(.55,.42,.83),'mint');blob('mailbox-domed-roof',(0,1.48,0),(.29,.23,.43),'mint',seed=5,rings=5,segments=10)
    box('slot',(0,1.45,-.444),(.34,.055,.02),'navy');box('mail-door',(0,1.27,-.439),(.45,.32,.04),'mint');box('flag-stem',(.32,1.47,.12),(.06,.43,.07),'coral');box('flag',(.39,1.67,.12),(.2,.13,.065),'coral')
def bin_asset():
    box('bin-body',(0,.61,0),(.67,1.15,.65),'navy');box('bin-lid',(0,1.22,0),(.78,.13,.75),'leafDark');box('lid-handle',(0,1.32,.1),(.3,.09,.09),'navy')
    for x in [-.3,.3]:tube('bin-wheel',(x-.07,.18,.25),(x+.07,.18,.25),.17,'black',n=8)
    for x in [-.2,0,.2]:box('bin-ridge',(x,.65,-.335),(.04,.8,.04),'leafDark')
def car():
    box('car-body',(0,.67,0),(1.75,.59,3.65),'coral');box('car-hood',(0,.95,-1.09),(1.65,.24,1.25),'coral');box('car-roof',(0,1.42,.05),(1.48,.7,1.76),'coral')
    box('windshield',(0,1.5,-.858),(1.26,.42,.055),'glass');box('rear-glass',(0,1.48,.941),(1.26,.37,.045),'glass')
    for x in [-.775,.775]:
        box('side-glass',(x,1.51,.02),(.035,.4,1.55),'glass');box('window-divider',(x,1.52,.1),(.05,.43,.07),'cream')
        for z in [-1.05,1.05]:tube('tire',(x-.13,.4,z),(x+.13,.4,z),.4,'black',n=12);tube('hub',(x-.145,.4,z),(x+.145,.4,z),.19,'metal',n=10)
    for z in [-1.85,1.85]:box('chrome-bumper',(0,.55,z),(1.74,.17,.12),'metal')
    for x in [-.59,.59]:box('headlight',(x,.82,-1.84),(.37,.2,.07),'cream');box('tail-light',(x,.82,1.84),(.36,.18,.06),'redRoof')
def dog():
    torso = empty('dog_torso',(0,.62,0))
    blob('dog-body',(0,0,0),(.32,.36,.65),'wood',parent=torso,seed=8)
    blob('dog-chest',(0,.03,-.4),(.31,.36,.24),'cream',parent=torso,seed=4)
    head = empty('dog_head',(0,.36,-.55),parent=torso)
    blob('dog-head-mesh',(0,0,0),(.31,.32,.34),'wood',parent=head,seed=4)
    blob('dog-muzzle',(0,-.1,-.26),(.22,.16,.19),'cream',parent=head,seed=5)
    blob('dog-nose',(0,-.02,-.43),(.075,.06,.05),'navy',parent=head)
    for x in [-.27,.27]:
        blob('floppy-ear',(x,.09,.08),(.13,.29,.18),'hair',parent=head,seed=3)
        blob('dog-eye',(x*.7,.07,-.264),(.035,.045,.04),'navy',parent=head)
    box('red-collar',(0,.14,.06),(.49,.1,.4),'coral',parent=torso)
    
    tail = empty('dog_tail',(0,.1,.55),parent=torso)
    tube('tail-mesh',(0,0,0),(.1,.46,.36),.075,'wood',parent=tail,n=6,r2=.025)
    
    for side,x in [('left',-.21),('right',.21)]:
        for front,z in [('front',-.38),('back',.4)]:
            leg = empty(f'dog_leg_{side}_{front}',(x,-.14,z),parent=torso)
            tube('dog-leg-mesh',(0,0,0),(0,-.36,0),.095,'wood',parent=leg,n=7)
            blob('dog-paw',(0,-.38,-.04),(.12,.09,.16),'cream',parent=leg,seed=4)
def empty(name,p=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=conv(p)
    if parent: o.parent=parent
    return o
def wheel(z,name):
    par=empty(name,(0,.46,z));v=[];n=40;m=8
    for i in range(n):
        a=i*2*math.pi/n
        for j in range(m):b=j*2*math.pi/m;v.append((math.sin(b)*.048,math.cos(a)*(.4+math.cos(b)*.048),math.sin(a)*(.4+math.cos(b)*.048)))
    mesh('rubber-tire',v,[(i*m+j,i*m+(j+1)%m,((i+1)%n)*m+(j+1)%m,((i+1)%n)*m+j) for i in range(n) for j in range(m)],'navy',par)
    for i in range(24):a=i*math.pi/12;tube('spoke',(0,0,0),(0,math.cos(a)*.38,math.sin(a)*.38),.006,'metal',par,n=4)
def newspaper():
    box('folded-paper',(0,0,0),(.37,.045,.24),'paper')
    for i in range(4):box('newsprint',(0,.026,-.073+i*.035),(.26 if i else .3,.005,.012),'ink')
def road():
    box('asphalt',(0,-.14,0),(12,.28,23),'asphalt')
    for x in [-6.15,6.15]:box('curb',(x,.06,0),(.3,.21,23),'concrete')
    for x in [-7.02,7.02]:box('sidewalk',(x,-.005,0),(1.5,.13,23),'cream')
    for x in [-15,15]:box('lawn',(x,-.1,0),(14,.12,23),'grass')
    box('yellow-centerline',(0,.012,0),(.12,.012,23),'yellow')
    for x in [-5.65,5.65]:box('road-edge',(x,.012,0),(.075,.012,23),'cream')
    for z in [-9,-6,-3,0,3,6,9]:
        for x in [-7.02,7.02]:box('sidewalk-seam',(x,.066,z),(1.49,.002,.025),'gray')
    for i in range(12):
        x=R.uniform(-5.3,5.3);z=R.uniform(-10,10)
        for j in range(3):
            nx=x+R.uniform(-.35,.35);nz=z+R.uniform(.2,.6);tube('asphalt-crack',(x,.01,z),(nx,.01,nz),.012,'navy',n=4);x,z=nx,nz
    for i in range(30):
        x=R.choice([-1,1])*R.uniform(5.3,5.85);z=R.uniform(-11,11)
        blob('road-pebble',(x,.035,z),(.035,.025,.06),'gray',seed=i,rings=3,segments=5)
def cloud():
    for i in range(12):a=i*2.4;blob('painted-cloud',(math.cos(a)*2.5,1+(i%4)*.9,math.sin(a)*1.2),(2.2,1.8,1.8),'cloud',seed=40+i,rings=7,segments=11)
def terrain():
    mesh('sloped-neighborhood',[(-180,-3,60),(180,-3,60),(180,-35,-590),(-180,-35,-590)],[(0,1,2,3)],'grass')
def ocean():
    mesh('bay',[(-4000,0,200),(4000,0,200),(4000,0,-6000),(-4000,0,-6000)],[(0,1,2,3)],'water')
def export(name,builder,ao_size=512,ao_force=False):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);R.seed(721);builder()
    # Collapse only static siblings sharing a material. Retain animation pivots.
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':groups.setdefault((o.parent.name if o.parent else '',o.data.materials[0].name),[]).append(o)
    for (_,mat),objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=objects[0].name+'_'+mat
    ao=None
    if ao_force or name.startswith('house_') or name in ['rider','road','fence','cafe','dagashi','small_shop']:
        from bake_ao import bake
        ao=bake(name,OUT,ao_size)
    bpy.ops.object.select_all(action='SELECT')
    file=OUT/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_normals=True,export_texcoords=True,export_animations=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=True)
    tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    entry={'id':name,'file':name+'.glb','triangles':tri,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
    if ao:entry['ao']=ao
    return entry
if __name__=='__main__':
    import japanese_assets as japanese
    japanese.bind(globals())
    manifest=[]
    for i in range(7):
        entry=export('house_'+str(i),lambda i=i:japanese.house(i));entry['family']=japanese.HOUSE_NAMES[i];manifest.append(entry)
    for name,fn in [('tree_oak',tree),('tree_elm',lambda:tree(1)),('mailbox',mailbox),('fence',japanese.wall),('bin',bin_asset),('car',car),('dog',dog),('rider',japanese.rider),('newspaper',newspaper),('road',road),('cloud',cloud),('terrain',terrain),('ocean',ocean),('utility_pole',japanese.utility_pole),('road_markings',japanese.road_markings)]:manifest.append(export(name,fn))
    (OUT/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'styleRevision':'japanese-closeup-v4','seed':721,'assets':manifest},indent=2)+'\n')
    print(json.dumps({'assets':len(manifest),'triangles':sum(a['triangles'] for a in manifest),'bytes':sum(a['bytes'] for a in manifest)}))
