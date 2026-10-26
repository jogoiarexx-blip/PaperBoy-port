"""Style stream v5: explicit meshes, spherical canopy normals, Japanese town/NPCs.
Run with Blender: blender -b --python art/generate_living_world.py
Or official bpy wheel: python art/run_living_world.py
Preserves the approved house/rider GLBs and replaces only the two tree assets.
"""
import sys,math,json
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'art'))
import generate_assets as g
import japanese_assets as j
j.bind(vars(g));box=g.box;mesh=g.mesh;tube=g.tube;ellipsoid=j.ellipsoid
g.PALETTE.update({'indigo':'254c83','cotton':'e9edda','noren':'267d99','apron':'244771','obi':'e9b95b','rust':'b66351','lamp':'ffe6a5','vendRed':'d95142','sand':'dcc99b','soda':'49cbd1'})
for name in ['lamp','soda']:
    m=g.material(name);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=m.diffuse_color;p.inputs['Emission Strength'].default_value=1.2

def puffy_tree(kind=0):
    tube('tapered-trunk',(0,0,0),(.1,3.8,0),.29,'bark',n=8,r2=.13)
    for i in range(4):
        a=i*2.4;tube('branch',(.05,2.4,0),(math.cos(a)*1.1,3.8,math.sin(a)*1.1),.13,'bark',n=6,r2=.055)
    centers=[(-1.15,3.8,0),(1.15,3.9,0),(0,3.8,1.05),(0,3.7,-1.05),(-.65,4.9,.1),(.65,5.1,.15),(0,5.6,0)]
    for i,p in enumerate(centers):
        scale=(1.45,1.25+(kind*.12),1.35);o=ellipsoid('spherical-canopy',p,scale,['leaf','leafLight','leafDark'][i%3],rings=7,segments=12)
        center=Vector(g.conv(p));normals=[tuple((v.co-center).normalized()) for v in o.data.vertices];o.data.normals_split_custom_set_from_vertices(normals)
        o['canopyNormals']='spherical';o['canopyCenter']=list(center)
        colors=o.data.color_attributes['Color']
        for loop in o.data.loops:
            pos=o.data.vertices[loop.vertex_index].co-center;up=(pos.z/scale[1]+1)*.5;shade=.82+.18*up
            colors.data[loop.index].color=(shade*.96,shade,shade*.91,1)

def chair(x,z):
    box('outdoor-seat',(x,.45,z),(.7,.1,.65),'cedarLight')
    for dx in [-.26,.26]:
        for dz in [-.23,.23]:box('chair-leg',(x+dx,.23,z+dz),(.07,.46,.07),'cedar')
    for dx in [-.29,.29]:box('chair-back-post',(x+dx,.71,z+.25),(.065,.55,.065),'cedar')
    box('chair-back',(x,.90,z+.25),(.63,.16,.07),'cedarLight')

def storefront(kind):
    w=6.6 if kind=='cafe' else 5.6;d=4.8;front=-d/2
    box('shop-footing',(0,.18,0),(w+.25,.36,d+.2),'stone');box('plaster-shop',(0,1.65,0),(w,3.1,d),'plaster')
    for x in [-w/2,-.8,.8,w/2]:box('cedar-shop-post',(x,1.6,front-.05),(.13,3,.17),'cedar')
    j.tiled_roof(w+1,d+1,3.25,1.15)
    for x in [-1.9,1.9]:j.window(x,1.8,front-.09,1.55,1.6)
    box('sliding-shop-door',(0,1.38,front-.11),(1.4,2.3,.13),'cedar');box('door-infill',(0,1.55,front-.19),(1.18,1.75,.045),'glass')
    for x in [-.5,-.25,0,.25,.5]:box('door-lattice',(x,1.5,front-.23),(.035,2,.04),'cedarLight')
    # Segmented cloth, rounded waves and separate hems create an open noren.
    tube('noren-rod',(-1.15,2.76,front-.43),(1.15,2.76,front-.43),.034,'cedar',n=8)
    for panel in range(4):
        x=-1.03+panel*.53;v=[]
        for row in range(5):
            for col in range(5):v.append((x+col*.123,2.7-row*.18,front-.45+.035*math.sin(col*math.pi/2)+.018*math.sin(row)))
        mesh('noren-curtain',v,[(r*5+c,r*5+c+1,(r+1)*5+c+1,(r+1)*5+c) for r in range(4) for c in range(4)],'noren' if kind=='cafe' else 'rust')
        # Simple sun crest: deliberate mark instead of garbled pseudo-Japanese text.
        ellipsoid('noren-crest',(x+.24,2.32,front-.49),(.075,.075,.01),'cotton',rings=5,segments=10)
    box('shop-signboard',(0,3,front-.16),(2.8,.36,.15),'cedarLight')
    if kind=='cafe':
        for x in [-1.6,1.6]:
            chair(x,-4.3);box('table-top',(x,.70,-5.05),(.85,.085,.55),'cedarLight');box('table-pedestal',(x,.35,-5.05),(.1,.7,.1),'cedar')
            tube('tea-cup',(x,.75,-5.05),(x,.9,-5.05),.065,'cotton',n=10)
        # Cup emblem above the entry.
        box('coffee-cup-emblem',(0,3,front-.26),(.32,.22,.035),'cotton')
    else:
        for x in [-1.95,1.95]:
            box('shop-display',(x,.62,front-.55),(1.25,.85,.55),'cedar')
            for row in range(2):
                for k in range(6):
                    pos=(x-.5+k*.2,.73+row*.28,front-.87)
                    if kind=='dagashi':box('wrapped-dagashi',pos,(.14,.21,.13),['coral','yellow','mint'][k%3])
                    else:ellipsoid('produce',pos,(.085,.095,.08),'coral' if row else 'leafLight',rings=5,segments=8)

def vending():
    box('vending-cabinet',(0,.99,0),(1.12,1.98,.7),'vendRed');box('lit-display',(0,1.30,-.36),(.89,.97,.045),'lamp')
    for row in range(3):
        for col in range(5):
            x=-.35+col*.175;y=1.02+row*.27
            tube('drink-can',(x,y,-.407),(x,y+.17,-.407),.05,['soda','coral','yellow'][col%3],n=8)
            box('selection-button',(x,y-.03,-.44),(.08,.025,.02),'lamp')
    box('delivery-flap',(0,.35,-.365),(.78,.22,.045),'navy');box('coin-slot',(.37,.71,-.375),(.045,.17,.025),'metal')
    box('vending-header',(0,1.88,-.363),(.82,.10,.03),'lamp')

def streetlight():
    tube('streetlight-post',(0,0,0),(0,5.8,0),.085,'metal',n=8,r2=.055)
    tube('curved-arm',(0,5.8,0),(-.8,5.9,0),.055,'metal',n=8)
    ellipsoid('lamp-shade',(-.8,5.86,0),(.33,.12,.22),'navy',rings=5,segments=10)
    ellipsoid('warm-lamp',(-.8,5.78,0),(.26,.065,.16),'lamp',rings=5,segments=10)

def beach():
    v=[]
    for i in range(37):
        x=-180+i*10;edge=100+math.sin(x*.014)*8+math.sin(x*.039)*2.5
        v.extend([(x,.12,edge+8),(x,.02,edge-2)])
    mesh('coastal-sand',v,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(36)],'sand')

def empty(name,p,parent=None):
    o=g.empty(name,p)
    if parent:o.parent=parent
    return o

def robe(name,top,bottom,topw,bottomw,depth,mat,parent):
    v=[(x*w/2,y,z*depth/2) for y,w in [(top,topw),(bottom,bottomw)] for x,z in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    return mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,parent)

def npc(outfit):
    hips=empty('npc_hips',(0,.83,0));color={'yukata':'noren','jinbei':'indigo','maekake':'cotton','school':'cotton','summer':'rust'}[outfit]
    torso=empty('npc_torso',(0,0,0),hips)
    if outfit=='yukata':
        robe('cotton-yukata',.51,-.66,.39,.5,.29,color,torso);box('obi',(0,.08,0),(.47,.15,.34),'obi',torso);box('obi-back-knot',(0,.08,.205),(.23,.17,.12),'obi',torso)
        for x,y in [(-.12,-.42),(.1,-.22),(-.08,.32),(.15,-.55)]:
            for i in range(5):
                a=i*math.pi*2/5;ellipsoid('yukata-flower',(x+.025*math.cos(a),y+.025*math.sin(a),-.155),(.018,.018,.007),'cotton',torso,rings=4,segments=6)
    else:
        robe('summer-top',.51,-.05,.4,.43,.28,color,torso)
        if outfit=='maekake':
            box('maekake-waist-tie',(0,.02,0),(.46,.06,.31),'obi',torso);box('indigo-maekake',(0,-.27,-.17),(.4,.55,.025),'apron',torso)
            for x in [-.18,-.06,.06,.18]:tube('apron-fringe',(x,-.55,-.17),(x,-.59,-.17),.009,'cotton',torso,n=4)
            box('apron-pocket',(.08,-.17,-.19),(.15,.16,.02),'indigo',torso)
            ellipsoid('shop-crest',(-.08,-.28,-.19),(.055,.055,.008),'cotton',torso,rings=5,segments=8)
        if outfit=='school':
            # White short-sleeve sailor uniform, navy collar and pleated skirt.
            mesh('sailor-collar',[(-.2,.48,-.16),(0,.26,-.17),(.2,.48,-.16),(.14,.53,-.16),(-.14,.53,-.16)],[(0,1,2,3,4)],'indigo',torso)
            tube('red-neckerchief',(0,.36,-.19),(0,.13,-.19),.024,'coral',torso,n=5)
            robe('pleated-school-skirt',0,-.34,.41,.56,.33,'indigo',torso)
            for x in [-.2,-.1,0,.1,.2]:tube('skirt-pleat',(x*.8,-.015,-.17),(x,-.33,-.175),.009,'navy',torso,n=4)
    if outfit in ['yukata','jinbei','summer']:
        # Underlap first; left panel overlaps it on the garment front.
        tube('under-collar',(.16,.5,-.155),(0,.35,-.155),.025,'cotton',torso,n=5)
        tube('left-over-right-collar',(-.16,.5,-.18),(.15,.20,-.18),.03,'cotton' if outfit=='yukata' else color,torso,n=5)
        if outfit=='jinbei':
            for x in [-.15,-.05,.05,.15]:box('jinbei-stripe',(x,.25,-.15),(.008,.38,.01),'blue',torso)
            tube('side-tie',(.20,.16,-.10),(.28,.13,-.10),.011,'cotton',torso,n=4)
    head=empty('npc_head',(0,.70,0),hips);ellipsoid('face',(0,0,0),(.155,.20,.15),'skin',head,rings=9,segments=12)
    ellipsoid('hair',(0,.095,.025),(.16,.14,.15),'hair',head,rings=7,segments=12)
    if outfit=='yukata':ellipsoid('summer-hair-bun',(0,.11,.16),(.095,.10,.08),'hair',head,rings=6,segments=10)
    if outfit=='school':
        for side in [-1,1]:ellipsoid('short-bob',(side*.13,0,.015),(.045,.16,.105),'hair',head,rings=6,segments=10)
    if outfit=='summer':
        ellipsoid('woven-summer-hat',(0,.18,0),(.185,.07,.185),'canvas',head,rings=6,segments=12);ellipsoid('wide-hat-brim',(0,.14,0),(.25,.015,.25),'canvas',head,rings=4,segments=16)
    for side in [-1,1]:
        ellipsoid('ear',(side*.155,-.01,0),(.025,.045,.027),'skin',head,rings=4,segments=8);ellipsoid('eye',(side*.062,.005,-.14),(.013,.022,.011),'navy',head,rings=4,segments=8)
    ellipsoid('nose',(0,-.028,-.151),(.025,.031,.025),'skin',head,rings=4,segments=8)
    for side,name in [(-1,'left'),(1,'right')]:
        arm=empty('npc_arm_'+name,(side*.23,.44,0),hips)
        if outfit=='yukata':box('wide-yukata-sleeve',(side*.055,-.17,0),(.23,.35,.31),color,arm)
        else:tube('short-sleeve',(0,0,0),(side*.025,-.17,0),.093,color,arm,n=8)
        tube('upper-arm',(side*.025,-.16,0),(side*.025,-.25,0),.045,'skin',arm,n=8)
        elbow=empty('npc_elbow_'+name,(side*.025,-.25,0),arm)
        tube('forearm',(0,0,0),(0,-.18,-.025),.043,'skin',elbow,n=8);ellipsoid('hand',(0,-.20,-.03),(.052,.06,.05),'skin',elbow,rings=5,segments=8)
        leg=empty('npc_leg_'+name,(side*.11,-.02,0),hips);tube('thigh',(0,0,0),(0,-.33,0),.072,'indigo' if outfit!='school' else 'skin',leg,n=8)
        knee=empty('npc_knee_'+name,(0,-.33,0),leg);tube('shin',(0,0,0),(0,-.40,0),.05,'skin' if outfit in ['jinbei','school','yukata'] else 'indigo',knee,n=8)
        box('sandal',(0,-.45,-.055),(.14,.055,.23),'cedar' if outfit!='school' else 'navy',knee)
        if outfit=='school':tube('white-sock',(0,-.19,0),(0,-.40,0),.052,'cotton',knee,n=8)
        else:tube('sandal-thong',(-.045,-.412,-.09),(.045,-.412,-.09),.009,'cotton',knee,n=5)
    cup=empty('npc_cup',(0,-.20,-.10),bpy.data.objects['npc_elbow_right']);tube('tea-cup',(0,0,0),(0,.12,0),.05,'cotton',cup,n=8)
    broom=empty('npc_broom',(.30,.13,-.19),hips);tube('bamboo-broom',(0,0,0),(.12,-.66,-.15),.015,'cedarLight',broom,n=6)
    for i in range(8):tube('broom-straw',(.12,-.62,-.15),(.01+i*.03,-.82,-.18),.014,'canvas',broom,n=4)

BUILDERS={'tree_oak':lambda:puffy_tree(0),'tree_elm':lambda:puffy_tree(1),'cafe':lambda:storefront('cafe'),'dagashi':lambda:storefront('dagashi'),'small_shop':lambda:storefront('small_shop'),'vending_machine':vending,'streetlight':streetlight,'beach':beach}
BUILDERS.update({'npc_'+outfit:lambda outfit=outfit:npc(outfit) for outfit in ['yukata','jinbei','maekake','school','summer']})
if __name__=='__main__':
    manifest=json.loads((g.OUT/'manifest.json').read_text());entries={a['id']:a for a in manifest['assets']}
    for name,builder in BUILDERS.items():
        if '--only-npcs' in sys.argv and not name.startswith('npc_'):continue
        entries[name]=g.export(name,builder);entries[name]['revision']='living-summer-v5'
        if name.startswith('npc_'):entries[name]['wardrobe']=name[4:]
    manifest['assets']=list(entries.values());manifest['styleRevision']='living-summer-v5';(g.OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Exported',len(BUILDERS),'new/updated assets;',len(entries),'total')
