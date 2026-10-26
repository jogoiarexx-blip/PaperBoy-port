"""Phase 4.5: detailed authored meshes, baked paint/AO and punctual light anchors.
Run after base + living-world generators. --only accepts comma-separated IDs.
"""
import sys,math,json,os,contextlib,hashlib
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'art'))
argv=sys.argv[:];sys.argv=[argv[0]]
import generate_assets as g
import japanese_assets as j
import generate_living_world as living
sys.argv=argv
from detail_textures import install,paint_uv
import detail_vehicles as vehicles

# Attach explicit metric texture coordinates before static material batching.
base_mesh=g.mesh
def textured_mesh(*args,**kwargs):
    obj=base_mesh(*args,**kwargs);paint_uv(obj);return obj
g.mesh=textured_mesh;j.bind(vars(g));living.mesh=g.mesh
box=g.box;tube=g.tube;mesh=g.mesh;ellipsoid=j.ellipsoid
base_roof=j.tiled_roof
def tiled_roof(*args,**kwargs):return base_roof(*args,detail=True,**kwargs)
j.tiled_roof=tiled_roof
g.PALETTE.update({'steel':'758a88','tread':'38434b','vehicleGlass':'9fcad3','headlamp':'fff2c5','taillamp':'ff4b30','amber':'ffbc58','lanternPaper':'ffe6b0','soil':'534638','terracotta':'bd785b','petalPink':'ef91b8','petalBlue':'93bfef'})
for name,strength in [('headlamp',2.8),('taillamp',2.2),('amber',1.3),('lanternPaper',2.1)]:
    m=g.material(name);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=m.diffuse_color;p.inputs['Emission Strength'].default_value=strength
glass=g.material('vehicleGlass');glass.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.13
glass.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.22
install(g)

def anchor(kind,p,color='#ffe3ab',intensity=14,distance=7):
    obj=g.empty('light-'+kind,p)
    obj['localLight']={'kind':kind,'color':color,'intensity':intensity,'distance':distance}
    return obj
vehicles.bind(g,j,anchor)

def lantern(x,y,z):
    box('andon-wall-bracket',(x,y+.28,z+.14),(.12,.11,.35),'steel')
    box('andon-paper',(x,y,z),(.27,.43,.25),'lanternPaper')
    for dx in [-.15,.15]:
        for dz in [-.14,.14]:box('andon-corner',(x+dx,y,z+dz),(.028,.49,.028),'cedar')
    for yy in [-.245,0,.245]:
        for dz in [-.145,.145]:box('andon-crossbar',(x,y+yy,z+dz),(.34,.028,.03),'cedar')
    box('andon-base',(x,y-.27,z),(.37,.05,.35),'cedar')
    g.roof('andon-cap',x,y+.26,z,.42,.39,.10,'kawara')
    anchor('porch',(x,y-.06,z-.24))

def gutter(x,y,z,length,axis='x'):
    # Open half-round channel, raised lips and end caps.
    v=[];segments=8
    for end in [-length/2,length/2]:
        for i in range(segments+1):
            a=i*math.pi/segments;offset=.078*math.cos(a);drop=-.065*math.sin(a)
            v.append((x+end if axis=='x' else x+offset,y+drop,z+offset if axis=='x' else z+end))
    mesh('open-rain-gutter',v,[(i,i+1,i+segments+2,i+segments+1) for i in range(segments)],'steel')

def house(f):
    j.house(f);w=[6.3,6.5,8.4,6,6.4,7.3,5.8][f];d=[5.8,5.3,5.5,5.7,5.8,6.2,5.1][f];h=[3.15,3.3,2.9,3.5,5.1,3.4,2.8][f];front=-d/2
    lantern(1.09,2.02,front-.42)
    for y in [.61,2.7]:
        for z in [front-.31,front-.23]:box('sliding-door-track',(0,y,z),(1.97,.035,.036),'steel')
    for x in [-.82,.82]:box('recessed-door-stop',(x,.64,front-.27),(.08,.045,.12),'brass')
    gutter(0,2.84,front-1.62,w+.64)
    for side in [-1,1]:
        x=side*(w/2+.67);gutter(x,h+.45,0,d+1.4,'z')
        path=[(x,h+.44,front+.18),(x,h+.10,front+.18),(side*(w/2+.15),h-.15,front+.18),(side*(w/2+.15),.20,front+.18),(side*(w/2+.15),.11,front-.18)]
        for a,b in zip(path,path[1:]):tube('rain-downspout',a,b,.055,'steel',n=12)
        for y in [.7,1.9]:box('downspout-clamp',(side*(w/2+.15),y,front+.18),(.17,.035,.16),'metal')
    for i in range(int(w/.28)):
        x=-w/2+i*.28;box('awning-rafter',(x,2.89,front-.68),(.055,.09,1.77),'cedar')
    for x in [-w/2+.55,w/2-.55]:
        for z in [front-1.28,front-.15]:tube('engawa-peg',(x,.596,z),(x,.603,z),.018,'cedar',n=8)

def tree(kind=0,lod=False):
    if lod:living.puffy_tree(kind);return
    points=[(0,0,0),(.12,1.1,.06),(-.05,2.1,.10),(.17,3.1,0),(.09,4.1,.08)]
    # Shared rings make a continuous bent trunk, without gaps between cylinders.
    segments=16;verts=[]
    for i,p in enumerate(points):
        for k in range(segments):
            a=k*math.pi*2/segments;r=(.32-i*.05)*(1+.035*math.sin(a*3+i*.4))
            verts.append((p[0]+r*math.cos(a),p[1],p[2]+r*math.sin(a)))
    faces=[tuple(reversed(range(segments))),tuple(range(4*segments,5*segments))]
    faces += [(i*segments+k,i*segments+(k+1)%segments,(i+1)*segments+(k+1)%segments,(i+1)*segments+k) for i in range(4) for k in range(segments)]
    trunk=mesh('continuous-bark-trunk',verts,faces,'bark')
    for face in trunk.data.polygons:face.use_smooth=True
    for i in range(6):
        a=i*2.4;end=(math.cos(a)*1.18,3.7+(i%2)*.55,math.sin(a)*1.1)
        tube('natural-branch',(.03,2.45,.05),end,.13,'bark',n=10,r2=.038)
        tube('root-flare',(.02,.3,0),(.68*math.cos(a),.02,.68*math.sin(a)),.15,'bark',n=8,r2=.055)
    centers=[(-1.15,3.8,0),(1.15,3.9,0),(0,3.8,1.05),(0,3.7,-1.05),(-.65,4.9,.1),(.65,5.1,.15),(0,5.6,0)]
    for i,p in enumerate(centers):
        o=ellipsoid('smooth-painted-canopy',p,(1.45,1.25+kind*.12,1.35),['leaf','leafLight','leafDark'][i%3],rings=12,segments=24,fold=.018)
        center=Vector(g.conv(p));o.data.normals_split_custom_set_from_vertices([tuple((v.co-center).normalized()) for v in o.data.vertices])
        for loop in o.data.loops:
            up=(o.data.vertices[loop.vertex_index].co.z-center.z)/1.4
            shade=.87+.11*up;o.data.color_attributes['Color'].data[loop.index].color=(shade,shade,shade,1)

def leaf(a,b,width=.13):
    a=Vector(a);b=Vector(b);mid=(a+b)*.5+Vector((0,.03,0));side=(b-a).cross(Vector((0,1,0))).normalized()*width
    mesh('folded-leaf',[a,mid+side,b,mid-side,mid+Vector((0,.055,0))],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'leafLight')

def plants(pot=True):
    for i in range(3 if pot else 5):
        x=(i-1)*.48 if pot else (i-2)*.26;z=.12*math.sin(i*2.4);base=.30 if pot else .015
        if pot:
            tube('terracotta-pot',(x,.03,z),(x,.32,z),.15,'terracotta',n=16,r2=.21)
            tube('pot-rim',(x,.29,z),(x,.34,z),.227,'terracotta',n=16)
            tube('pot-soil',(x,.338,z),(x,.341,z),.194,'soil',n=16)
        for k in range(5):
            a=k*2.4+i;tip=(x+math.cos(a)*.20,base+.22+(k%3)*.11,z+math.sin(a)*.20)
            tube('green-stem',(x,base,z),tip,.01,'leafDark',n=5)
            leaf((x,base+.08,z),tip,.065)
            if k<3:
                for petal in range(5):
                    angle=petal*math.pi*2/5;ellipsoid('summer-petal',(tip[0]+.053*math.cos(angle),tip[1]+.012,tip[2]+.053*math.sin(angle)),(.051,.018,.039),'petalPink' if i%2 else 'petalBlue',rings=4,segments=6)
                ellipsoid('flower-heart',(tip[0],tip[1]+.028,tip[2]),(.025,.014,.025),'yellow',rings=4,segments=6)

def grate():
    box('gutter-recess',(0,-.025,0),(.48,.05,.86),'navy')
    for x in [-.25,.25]:box('grate-frame',(x,.008,0),(.035,.035,.91),'steel')
    for z in [-.44,.44]:box('grate-frame',(0,.008,z),(.53,.035,.035),'steel')
    for i in range(13):box('drain-bar',(0,.008,-.4+i*.067),(.47,.028,.028),'metal')
    for x in [-.22,.22]:
        for z in [-.4,.4]:tube('grate-bolt',(x,.026,z),(x,.032,z),.012,'brass',n=6)

def post_box():
    tube('postbox-foot',(0,0,0),(0,.12,0),.28,'stone',n=16)
    tube('red-postbox',(0,.12,0),(0,1.45,0),.25,'vendRed',n=20)
    ellipsoid('postbox-cap',(0,1.45,0),(.28,.09,.28),'vendRed',rings=6,segments=20)
    box('letter-slot',(0,1.22,-.252),(.31,.065,.02),'navy');box('slot-rain-hood',(0,1.27,-.26),(.36,.035,.13),'vendRed')
    # Postal mark 〒, using its three actual strokes.
    for y in [.91,1.01]:box('postal-mark',(0,y,-.258),(.19,.027,.012),'paper')
    box('postal-mark',(0,.835,-.258),(.028,.15,.012),'paper')
    box('collection-label',(0,.59,-.255),(.20,.23,.018),'paper')
    for i in range(4):box('collection-table',(0,.53+i*.035,-.267),(.15,.009,.004),'ink')
    box('rear-service-door',(0,.53,.252),(.28,.61,.02),'vendRed')

def bench():
    for z in [-.21,-.07,.07,.21]:box('bench-seat',(0,.47,z),(1.75,.07,.12),'cedarLight')
    for x in [-.64,.64]:
        for z in [-.18,.18]:box('bench-leg',(x,.23,z),(.12,.46,.12),'cedar')
        box('bench-back-post',(x,.7,.22),(.1,.56,.09),'cedar')
    for y in [.72,.89]:box('bench-back',(0,y,.24),(1.75,.14,.065),'cedarLight')

def wall():
    j.wall()
    for z in [-.85,0,.85]:
        for y in [.18,.50,.82]:box('concrete-block-bevel',(-.159,y,z),(.015,.26,.76),'concrete')

def commercial(kind):
    living.storefront(kind);lantern(.91,2.04,-2.8);gutter(0,3.18,-2.96,7.6 if kind=='cafe' else 6.6)
    for y in [.31,2.61]:box('shop-door-track',(0,y,-2.67),(1.55,.04,.045),'steel')

def streetlight():
    living.streetlight();anchor('street',(-.8,5.65,0),'#ffdfa1',32,10)

def vending():
    living.vending();anchor('vending',(0,1.22,-.52),'#ffe5b0',5,4)

BUILDERS={**{'house_'+str(i):(lambda i=i:house(i)) for i in range(7)},
 'tree_oak':tree,'tree_elm':lambda:tree(1),'tree_oak_lod':lambda:tree(0,True),'tree_elm_lod':lambda:tree(1,True),
 'car':vehicles.vehicle,'kei_truck':lambda:vehicles.vehicle(True),
 'potted_plants':plants,'flower_patch':lambda:plants(False),'drain_grate':grate,'post_box':post_box,'bench':bench,'boundary_wall':wall,
 **{kind:(lambda kind=kind:commercial(kind)) for kind in ['cafe','dagashi','small_shop']},'streetlight':streetlight,'vending_machine':vending}

if __name__=='__main__':
    manifest=json.loads((g.OUT/'manifest.json').read_text());entries={a['id']:a for a in manifest['assets']}
    selected=argv[argv.index('--only')+1].split(',') if '--only' in argv else list(BUILDERS)
    for name in selected:
        architectural=name.startswith('house_') or name in ['cafe','dagashi','small_shop']
        sys.stdout.flush();sys.stderr.flush();stdout=os.dup(1);stderr=os.dup(2)
        logs=Path(__file__).resolve().parent/'logs';logs.mkdir(exist_ok=True)
        with (logs/'detail-generation.log').open('a') as log:
            os.dup2(log.fileno(),1);os.dup2(log.fileno(),2)
            try:entry=g.export(name,BUILDERS[name],ao_size=1024 if architectural else 512,ao_force=name in ['car','kei_truck','tree_oak','tree_elm','boundary_wall'])
            finally:sys.stdout.flush();sys.stderr.flush();os.dup2(stdout,1);os.dup2(stderr,2);os.close(stdout);os.close(stderr)
        entry['revision']='detail-polish-v6'
        from pack_glb_textures import externalize
        path=g.OUT/(name+'.glb');entry['textures']=externalize(path)
        entry['bytes']=path.stat().st_size;entry['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
        if name.startswith('house_'):entry['family']=j.HOUSE_NAMES[int(name[-1])]
        entries[name]=entry;manifest['assets']=list(entries.values());manifest['styleRevision']='detail-polish-v6'
        (g.OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
        print('DETAIL EXPORTED '+name+' '+str(entry['triangles'])+' triangles '+str(entry['bytes'])+' bytes',flush=True)
