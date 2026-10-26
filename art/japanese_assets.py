"""Authored close-up meshes. Coordinates use the generator's Y-up adapter."""
import math
import bpy

HOUSE_NAMES=['Coastal minka','Hipped farmhouse','Long engawa','Timber gable','Merchant house','L-wing homestead','Plaster cottage']
def bind(api):
    for key in ['box','mesh','tube','empty','conv','wheel','material','PALETTE','ROOT']:globals()[key]=api[key]
    PALETTE.update({'plaster':'ece4ca','cedar':'76523b','cedarLight':'a3784f','kawara':'465867','tileLight':'64788a','stone':'a4aaa0','brass':'c5a14c','canvas':'d6b677'})

def ellipsoid(name,p,s,mat,parent=None,rings=10,segments=16,fold=0):
    verts=[]
    for i in range(rings+1):
        a=math.pi*i/rings
        for j in range(segments):
            b=2*math.pi*j/segments;f=1+fold*math.sin(b*6+a*3)*math.sin(a)**2
            verts.append((p[0]+s[0]*math.sin(a)*math.cos(b)*f,p[1]+s[1]*math.cos(a),p[2]+s[2]*math.sin(a)*math.sin(b)*f))
    faces=[(i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j) for i in range(rings) for j in range(segments)]
    obj=mesh(name,verts,faces,mat,parent)
    for face in obj.data.polygons:face.use_smooth=True
    for color in obj.data.color_attributes['Color'].data:color.color=(.98,.98,.98,1)
    return obj

def tiled_roof(w,d,y,rise=1.4,hip=False,x=0,z=0,detail=False):
    if hip:
        v=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2),(x,y+rise,z-d*.25),(x,y+rise,z+d*.25)]
        mesh('hip-roof-base',v,[(0,3,5,4),(1,4,5,2),(0,4,1),(3,2,5)],'kawara')
    else:
        v=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x,y+rise,z-d/2),(x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x,y+rise,z+d/2)]
        mesh('open-eave-roof',v,[(0,3,5,2),(2,5,4,1)],'kawara')
    count=max(12,int(d/(.24 if detail else .29)));cols=6 if detail else 4;rows=10 if detail else 8
    for side in [-1,1]:
        for k in range(count):
            zz=z-d/2+(k+.5)*d/count;v=[]
            for i in range(rows+1):
                t=i/rows;xx=x+side*w*.5*t
                for j in range(cols+1):
                    tz=zz+(j/cols-.5)*d/count
                    height=y+rise*(min(1-t,max(0,(d/2-abs(tz-z))/(d*.25))) if hip else 1-t)+.025
                    v.append((xx,height+(.085 if detail else .055)*math.sin(j*math.pi/cols),tz))
            stride=cols+1
            f=[(i*stride+j,i*stride+j+1,(i+1)*stride+j+1,(i+1)*stride+j) for i in range(rows) for j in range(cols)]
            obj=mesh('curved-kawara-rib',v,f,'tileLight' if k%7==0 else 'kawara')
            for poly in obj.data.polygons:poly.use_smooth=True
        if not hip:
            for i in range(1,8):
                t=i/8;box('tile-row-lap',(x+side*w*.5*t,y+rise*(1-t)+.03,z),(.055 if detail else .035,.045 if detail else .028,d),'tileLight')
    ridge=d*(.25 if hip else .45)
    tube('rounded-ridge',(x,y+rise+.08,z-ridge),(x,y+rise+.08,z+ridge),.12,'kawara',n=10)
    for end in [-1,1]:ellipsoid('ridge-cap',(x,y+rise+.1,z+end*ridge),(.17,.19,.10),'tileLight',rings=5,segments=8)

def window(x,y,z,w=1.15,h=1.4):
    box('window-recess',(x,y,z),(w+.12,h+.12,.1),'cedar')
    box('window-glass',(x,y,z-.07),(w,h,.025),'glass')
    for i in range(6):box('window-lattice',(x-w/2+i*w/5,y,z-.11),(.035,h,.045),'cedarLight')
    for yy in [-h/2,0,h/2]:box('window-crossbar',(x,y+yy,z-.12),(w,.045,.04),'cedar')

def house(f):
    w=[6.3,6.5,8.4,6,6.4,7.3,5.8][f];d=[5.8,5.3,5.5,5.7,5.8,6.2,5.1][f];h=[3.15,3.3,2.9,3.5,5.1,3.4,2.8][f];front=-d/2
    box('stone-foundation',(0,.28,0),(w+.3,.56,d+.2),'stone');box('plaster-infill',(0,h/2+.45,0),(w,h,d),'plaster')
    for x in [-w/2,0,w/2]:box('exposed-timber',(x,h/2+.45,front-.04),(.15,h+.1,.16),'cedar')
    for y in [.62,2.85,h+.38]:box('horizontal-timber',(0,y,front-.05),(w,.15,.16),'cedar')
    for x in [-w/2,w/2]:
        for z in [-d/2,0,d/2]:box('side-post',(x,h/2+.45,z),(.16,h,.16),'cedar')
    for i in range(int(w/.22)):box('cedar-wainscot',(-w/2+.11+i*.22,.93,front-.11),(.205,.72,.09),'cedarLight' if i%4==0 else 'cedar')
    box('engawa-beam',(0,.42,front-.66),(w+.45,.18,1.5),'cedar')
    for i in range(int((w+.4)/.21)):box('engawa-plank',(-w/2+.02+i*.21,.56,front-.72),(.197,.075,1.52),'cedarLight')
    for x in [-w/2+.12,w/2-.12]:box('engawa-support',(x,1.77,front-1.14),(.12,2.6,.12),'cedar')
    for step in range(2):box('entry-step',(0,.13+step*.13,front-1.8+step*.3),(1.65,.24,.65),'stone')
    for x in [-.46,.46]:
        box('sliding-door',(x,1.64,front-.18),(.87,2.02,.12),'cedar');box('shoji-panel',(x,1.93,front-.25),(.74,1.05,.025),'paper')
        for k in range(5):box('shoji-lattice',(x-.35+k*.175,1.93,front-.28),(.025,1.06,.035),'cedarLight')
        for yy in [1.43,1.69,1.96,2.22,2.45]:box('shoji-crossbar',(x,yy,front-.29),(.78,.028,.035),'cedar')
        box('door-pull',(x+(.27 if x<0 else -.27),1.39,front-.26),(.025,.19,.025),'black')
    for x in [-w*.3,w*.3]:window(x,1.95,front-.08)
    rise=1.1 if f==2 else 1.4;tiled_roof(w+1.35,d+1.35,h+.45,rise,hip=f in [1,5])
    if f not in [1,5]:
        for z in [-d/2,d/2]:
            mesh('plaster-gable',[(-w/2,h+.45,z),(w/2,h+.45,z),(0,h+.45+rise,z)],[(0,1,2)],'plaster')
            for side in [-1,1]:tube('gable-timber',(side*w/2,h+.45,z-.02),(0,h+.45+rise,z-.02),.055,'cedar',n=5)
    mesh('engawa-awning',[(-w/2-.3,3.12,front+.1),(w/2+.3,3.12,front+.1),(w/2+.3,2.86,front-1.6),(-w/2-.3,2.86,front-1.6)],[(0,1,2,3)],'kawara')
    if f==4:
        for x in [-w*.3,0,w*.3]:window(x,4.25,front-.08,1.12,1.08)
        box('upper-balcony',(0,3.45,front-.45),(w*.86,.1,.8),'cedar')
        for x in [-2,-1,0,1,2]:tube('balcony-baluster',(x,3.45,front-.8),(x,3.95,front-.8),.035,'cedar',n=5)
        box('balcony-rail',(0,3.95,front-.8),(w*.86,.08,.08),'cedar')
    if f==5:
        box('side-wing',(w*.42,1.55,1.1),(3.6,2.9,4.5),'plaster');tiled_roof(4.1,5,3,.8,x=w*.42,z=1.1)
    for x in [-w/2+.35,w/2-.35]:
        tube('flower-pot',(x,.57,front-1),(x,.95,front-1),.23,'cedar',n=10,r2=.3)
        ellipsoid('porch-shrub',(x,1.16,front-1),(.35,.42,.35),'leaf',rings=6,segments=9)

def wall():
    box('low-stone-wall',(0,.48,0),(.3,.96,2.1),'stone');box('wall-cap',(0,1,0),(.39,.12,2.13),'concrete')
    for y in [.32,.64]:box('mortar-course',(-.153,y,0),(.012,.015,2.1),'gray')
    for z in [-.7,0,.7]:box('mortar-joint',(-.153,.48,z),(.012,.94,.012),'gray')

def utility_pole():
    tube('concrete-pole',(0,0,0),(0,9.3,0),.19,'stone',n=10,r2=.12)
    for y in [7.35,8.85]:
        box('crossarm',(0,y-.15,0),(2.4,.12,.14),'metal')
        for x in [-1.05,-.7,-.35,0,.35,.7,1.05]:
            tube('insulator',(x,y-.15,0),(x,y+.12,0),.065,'cream',n=6)
    tube('transformer',(.35,6.8,0),(.35,7.7,0),.3,'gray',n=12)
    for i in range(7):
        x=-1.05+i*.35;y=8.85 if i<4 else 7.35
        for j in range(16):
            t=j/16;u=(j+1)/16
            tube('hanging-wire',(x,y-2.53*t-1.15*4*t*(1-t),-46*t),(x,y-2.53*u-1.15*4*u*(1-u),-46*u),.013,'black',n=4)

def rider():
    wheel(-.7,'wheel_front');wheel(.7,'wheel_rear')
    for a,b in [((0,.46,.7),(0,1.03,.28)),((0,1.03,.28),(0,.47,0)),((0,.47,0),(0,.46,.7)),((0,1.03,.28),(0,1.02,-.51)),((0,1.02,-.51),(0,.47,0)),((0,1.02,-.51),(0,.46,-.7))]:tube('bicycle-frame',a,b,.039,'mint',n=12)
    for x in [-.07,.07]:tube('fork',(x,1.02,-.51),(x,.46,-.7),.025,'metal',n=8)
    tube('seat-tube',(0,1.02,.28),(0,1.2,.28),.033,'metal',n=10);ellipsoid('saddle',(0,1.22,.28),(.16,.065,.22),'navy',rings=6,segments=12)
    tube('stem',(0,1.01,-.52),(0,1.34,-.62),.028,'metal',n=10);tube('handlebar',(-.4,1.35,-.62),(.4,1.35,-.62),.027,'metal',n=10)
    for side in [-1,1]:
        tube('grip',(side*.28,1.35,-.62),(side*.41,1.35,-.62),.039,'navy',n=10)
        tube('brake-lever',(side*.26,1.32,-.63),(side*.39,1.30,-.71),.013,'metal',n=6)
        tube('basket-mount',(side*.23,1.35,-.62),(side*.23,1.38,-.82),.018,'metal',n=8)
        tube('basket-stay',(side*.08,.46,-.7),(side*.26,1.13,-1.02),.015,'metal',n=8)
    ellipsoid('brass-bell',(.23,1.4,-.62),(.067,.055,.067),'brass',rings=8,segments=12)
    tube('bell-lever',(.26,1.4,-.60),(.31,1.4,-.57),.012,'navy',n=6)
    box('basket-base',(0,1.15,-1.02),(.64,.055,.42),'canvas')
    for y in [1.2,1.29,1.38,1.48]:
        for z in [-1.24,-.8]:tube('basket-weave',(-.34,y,z),(.34,y,z),.013,'cedarLight',n=5)
        for x in [-.34,.34]:tube('basket-weave',(x,y,-1.24),(x,y,-.8),.013,'cedarLight',n=5)
    for i in range(9):
        for z in [-1.24,-.8]:tube('basket-upright',(-.32+i*.08,1.16,z),(-.32+i*.08,1.5,z),.012,'canvas',n=5)
    for i in range(6):
        for x in [-.34,.34]:tube('basket-side',(x,1.16,-1.22+i*.08),(x,1.5,-1.22+i*.08),.012,'canvas',n=5)
    for i in range(4):box('newspapers',(-.23+i*.14,1.43,-1.04),(.115,.29,.27),'paper')
    tube('crank-axle',(-.15,.48,0),(.15,.48,0),.055,'metal',n=12)
    for side in [-1,1]:
        tube('crank',(side*.12,.48,0),(side*.12,.48+side*.14,-side*.14),.025,'metal',n=8)
        box('pedal',(side*.2,.48+side*.14,-side*.14),(.2,.06,.13),'navy')
    for y in [.40,.53]:tube('chain',(.095,y,.05),(.095,.46,.7),.009,'navy',n=5)
    torso=empty('torso',(0,1.22,.24));ellipsoid('folded-shirt',(0,.36,-.16),(.30,.46,.23),'coral',torso,12,20,.055);box('shorts',(0,.04,0),(.48,.24,.3),'navy',torso)
    for i in range(5):tube('shirt-fold',(-.22+i*.11,.11,.025),(-.2+i*.11,.32,.055),.012,'peach',torso,n=5)
    box('backpack',(0,.40,.20),(.43,.60,.22),'canvas',torso);box('backpack-pocket',(0,.26,.335),(.33,.24,.075),'bag',torso)
    for side in [-1,1]:
        for a,b in [((side*.18,.66,.21),(side*.23,.73,-.12)),((side*.23,.73,-.12),(side*.23,.2,-.35)),((side*.23,.2,-.35),(side*.18,.16,.2))]:tube('backpack-strap',a,b,.027,'canvas',torso,n=6)
        box('strap-buckle',(side*.23,.3,-.32),(.07,.09,.04),'metal',torso)
    head=empty('head',(0,2.1,-.18));ellipsoid('face',(0,0,0),(.205,.25,.21),'skin',head,12,20);ellipsoid('hair',(0,.12,.025),(.215,.2,.21),'hair',head)
    ellipsoid('cap',(0,.2,-.015),(.235,.16,.24),'bag',head,10,20);ellipsoid('curved-brim',(0,.17,-.23),(.235,.028,.22),'bag',head,5,16)
    ellipsoid('nose',(0,-.005,-.215),(.043,.065,.06),'skin',head,6,10)
    for side in [-1,1]:
        ellipsoid('ear',(side*.205,-.01,.015),(.045,.073,.035),'skin',head,7,10)
        ellipsoid('eye',(side*.085,.025,-.197),(.025,.035,.016),'navy',head,6,10)
        tube('eyebrow',(side*.06,.075,-.204),(side*.11,.079,-.194),.01,'hair',head,n=5)
    tube('mouth',(-.05,-.105,-.188),(.05,-.105,-.188),.009,'hair',head,n=5)
    for j in range(3):
        a=j*math.pi/3
        for i in range(6):
            t=i*math.pi/12;u=(i+1)*math.pi/12
            tube('cap-panel-seam',(.237*math.sin(t)*math.cos(a),.2+.162*math.cos(t),-.015+.242*math.sin(t)*math.sin(a)),(.237*math.sin(u)*math.cos(a),.2+.162*math.cos(u),-.015+.242*math.sin(u)*math.sin(a)),.003,'canvas',head,n=4)
    for side,name in [(-1,'left'),(1,'right')]:
        arm=empty('arm_'+name,(side*.24,1.84,-.1));tube('sleeve',(0,0,0),(side*.05,-.15,-.13),.115,'coral',arm,n=12)
        tube('cuff',(side*.045,-.13,-.115),(side*.055,-.17,-.145),.119,'peach',arm,n=12)
        tube('upper-arm',(side*.05,-.14,-.12),(side*.08,-.34,-.28),.067,'skin',arm,n=12);tube('forearm',(side*.08,-.34,-.28),(side*.08,-.48,-.5),.055,'skin',arm,n=12);ellipsoid('hand',(side*.08,-.48,-.5),(.07,.075,.08),'skin',arm,6,10)
        leg=empty('leg_'+name,(side*.17,1.26,.22));tube('short-leg',(0,0,0),(0,-.23,-.16),.12,'navy',leg,n=12);tube('thigh',(0,-.21,-.16),(0,-.42,-.23),.085,'skin',leg,n=12);tube('shin',(0,-.42,-.23),(0,-.69,.03),.064,'skin',leg,n=12)
        tube('sock',(0,-.61,0),(0,-.72,.03),.071,'trim',leg,n=12);ellipsoid('sneaker',(0,-.76,-.035),(.095,.078,.17),'cream',leg,6,12)
        for k in range(3):tube('shoelace',(-.045,-.694,-.12+k*.035),(.045,-.694,-.12+k*.035),.005,'navy',leg,n=4)

def road_markings():
    # Native bundled CJK font, converted to mesh and colored like the other assets.
    font=bpy.data.fonts.load(str(ROOT/'art/fonts/route-japanese.otf'))
    for glyph,z in zip('止まれ',[-3.2,0,3.2]):
        curve=bpy.data.curves.new('road-'+glyph,'FONT');curve.body=glyph;curve.font=font;curve.align_x='CENTER';curve.size=1.7
        obj=bpy.data.objects.new('road-'+glyph,curve);bpy.context.collection.objects.link(obj);obj.location=conv((-2.8,.025,z));obj.scale.y=1.65
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
        obj.data.materials.append(material('trim'));col=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for c in col.data:c.color=(1,1,1,1)
    box('stop-line',(-2.8,.025,-6.2),(5.2,.015,.25),'trim')
