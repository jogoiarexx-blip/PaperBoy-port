"""Authored compact Japanese vehicles; fictional Yamaguchi display plates."""
import math
import bpy

def bind(g,j,anchor):
    globals().update(g=g,j=j,box=g.box,tube=g.tube,mesh=g.mesh,anchor=anchor)

def text_mesh(text,p,size,mat,back=False):
    curve=bpy.data.curves.new('plate-digits','FONT');curve.body=text;curve.align_x='CENTER';curve.size=size;curve.resolution_u=2
    obj=bpy.data.objects.new('plate-digits',curve);bpy.context.collection.objects.link(obj)
    # Font XY -> authored XY, facing -Z. Rotate the rear plate outward.
    obj.location=g.conv(p);obj.rotation_euler=(math.pi/2,0,0 if back else math.pi)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    obj.data.materials.append(g.material(mat));col=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for c in col.data:c.color=(1,1,1,1)
    from detail_textures import paint_uv
    paint_uv(obj)

def plate(z,kei,back=False):
    sign=1 if back else -1;y=.61;face=z+(.013 if back else -.013)
    box('Japanese-number-plate',(0,y,z),(.34,.17,.016),'yellow' if kei else 'paper')
    # 山口, three upright strokes plus the base of 山; the 口 square.
    strokes=[[(0,.02),(0,.09)],[(.027,.03),(.027,.105)],[(.054,.02),(.054,.09)],[(0,.02),(.054,.02)],
             [(.073,.025),(.073,.09),(.124,.09),(.124,.025),(.073,.025)]]
    for path in strokes:
        for a,b in zip(path,path[1:]):tube('plate-locality',(sign*(a[0]-.14),y+a[1]*.43+.008,face),(sign*(b[0]-.14),y+b[1]*.43+.008,face),.0018,'navy',n=4)
    text_mesh('480' if kei else '580',(sign*.063,y+.02,face),.043,'navy',back)
    text_mesh('12-34' if kei else '56-78',(sign*.025,y-.057,face),.068,'navy',back)
    # Hand-authored さ strokes at the lower left of the fictional display plate.
    for path in [[(-.15,-.018),(-.111,-.024)],[(-.134,-.008),(-.124,-.04)],[(-.145,-.043),(-.15,-.055),(-.136,-.063),(-.116,-.060)]]:
        for a,b in zip(path,path[1:]):tube('plate-hiragana',(sign*a[0],y+a[1],face),(sign*b[0],y+b[1],face),.0017,'navy',n=4)
    for x in [-.137,.137]:j.ellipsoid('plate-bolt',(x,y+.058,face),(.007,.007,.004),'metal',rings=4,segments=6)

def wheel(x,z):
    parent=g.empty('vehicle-wheel',(x,.34,z));n=32;m=8;v=[]
    for i in range(n):
        a=i*2*math.pi/n
        for k in range(m):
            b=k*2*math.pi/m;radius=.265+.067*math.cos(b)
            v.append((.102*math.sin(b),radius*math.cos(a),radius*math.sin(a)))
    tire=mesh('rounded-tire',v,[(i*m+k,i*m+(k+1)%m,((i+1)%n)*m+(k+1)%m,((i+1)%n)*m+k) for i in range(n) for k in range(m)],'black',parent)
    for f in tire.data.polygons:f.use_smooth=True
    for i in range(20):
        a=i*2*math.pi/20
        for side in [-1,1]:
            tube('chevron-tread',(side*.025,.333*math.cos(a),.333*math.sin(a)),(side*.088,.323*math.cos(a+.065),.323*math.sin(a+.065)),.012,'tread',parent,n=4)
    sign=1 if x>0 else -1;edge=sign*.107
    tube('wheel-rim',(edge,0,0),(edge+sign*.015,0,0),.202,'metal',parent,n=24)
    tube('hub-cap',(edge+sign*.017,0,0),(edge+sign*.035,0,0),.096,'steel',parent,n=16)
    for i in range(5):
        a=i*2*math.pi/5
        tube('rim-vent',(edge+sign*.018,.143*math.cos(a),.143*math.sin(a)),(edge+sign*.022,.143*math.cos(a),.143*math.sin(a)),.035,'navy',parent,n=8)
        j.ellipsoid('wheel-lug',(edge+sign*.039,.056*math.cos(a),.056*math.sin(a)),(.011,.013,.013),'brass',parent,rings=4,segments=6)

def vehicle(kei=False):
    width=1.48 if kei else 1.65;half=width/2;front=-1.68 if kei else -1.8;rear=1.68 if kei else 1.8
    color='cream' if kei else 'coral'
    box('undercarriage',(0,.39,0),(width-.1,.15,rear-front-.13),'navy')
    box('pressed-body',(0,.65,0),(width,.43,rear-front-.1),color)
    if kei:
        # Recess the cab skin slightly inside the lower body: coincident panels
        # made a black overlap strip, while the old cab stopped below its roof.
        box('cab',(0,1.25,-.91),(width-.016,.82,1.37),color);box('cab-roof',(0,1.69,-.91),(width+.04,.10,1.45),color)
        box('windscreen-seal',(0,1.40,-1.611),(width-.11,.44,.045),'navy');box('vehicle-windscreen',(0,1.40,-1.639),(width-.2,.35,.012),'vehicleGlass')
        box('cab-back-window',(0,1.38,-.21),(width-.3,.34,.018),'vehicleGlass')
        box('bed-floor',(0,.84,.78),(width-.12,.06,1.61),'steel')
        for x in [-half+.045,half-.045]:box('drop-side',(x,1.01,.78),(.065,.32,1.66),color)
        box('tailgate',(0,1.01,1.62),(width,.32,.065),color)
        for x in [-.42,.42]:box('tailgate-hinge',(x,.86,1.66),(.16,.045,.055),'metal')
        for i in range(9):box('bed-corrugation',(-.59+i*.147,.879,.78),(.045,.015,1.53),'metal')
        cabin_z=-.91;cabin_d=1.15;win_y=1.4
    else:
        box('upper-body-belt',(0,.935,.28),(width,.16,2.58),color)
        box('hood',(0,.92,-1.11),(width-.035,.22,1.25),color)
        # A bevelled cabin silhouette, with a sloped windshield and tail glass.
        verts=[(-.73,.98,-.68),(.73,.98,-.68),(-.64,1.65,-.34),(.64,1.65,-.34),(-.64,1.65,.89),(.64,1.65,.89),(-.73,.98,1.35),(.73,.98,1.35)]
        mesh('rounded-cabin',verts,[(0,1,3,2),(2,3,5,4),(4,5,7,6),(0,2,4,6),(1,7,5,3),(0,6,7,1)],color)
        mesh('vehicle-windscreen',[(-.64,1.08,-.645),(.64,1.08,-.645),(.58,1.57,-.395),(-.58,1.57,-.395)],[(0,1,2,3)],'vehicleGlass')
        mesh('vehicle-rear-glass',[(-.60,1.08,1.29),(.60,1.08,1.29),(.55,1.55,.975),(-.55,1.55,.975)],[(0,3,2,1)],'vehicleGlass')
        cabin_z=.27;cabin_d=1.24;win_y=1.37
    for side in [-1,1]:
        x=side*(half-.035)
        if kei:
            box('vehicle-side-glass',(side*(half-.004),win_y,cabin_z),(.012,.35,cabin_d),'vehicleGlass')
            box('window-pillar',(side*(half+.005),win_y,cabin_z+.12),(.033,.39,.055),color)
        else:
            mesh('vehicle-side-glass',[(side*.714,1.12,-.48),(side*.714,1.12,1.14),(side*.655,1.55,.87),(side*.655,1.55,-.27)],[(0,1,2,3)],'vehicleGlass')
            tube('window-pillar',(side*.719,1.1,.37),(side*.661,1.58,.37),.026,color,n=6)
        box('door-seam',(side*(half+.004),.9,cabin_z+cabin_d*.45),(.006,.49,.013),'navy')
        box('door-handle',(side*(half+.026),1.09,cabin_z+.31),(.035,.034,.135),'metal')
        tube('mirror-stalk',(side*half,1.24,cabin_z-.43),(side*(half+.13),1.28,cabin_z-.48),.023,'steel',n=8)
        box('mirror-housing',(side*(half+.17),1.3,cabin_z-.5),(.15,.17,.12),color)
        box('mirror-glass',(side*(half+.17),1.3,cabin_z-.432),(.115,.13,.012),'vehicleGlass')
        for z in [-1.02,1.04]:wheel(side*(half-.055),z)
        box('headlamp-trim',(side*(half-.22),.93,front+.01),(.32,.21,.065),'steel')
        box('headlamp-lens',(side*(half-.22),.93,front-.025),(.27,.16,.018),'headlamp')
        box('tail-lens',(side*(half-.2),.72,rear-.01),(.24,.15,.035),'taillamp')
        box('amber-indicator',(side*(half-.2),.86,rear),(.24,.055,.03),'amber')
        anchor('headlight',(side*(half-.22),.91,front-.19),'#ffe7b4',9,7)
        anchor('taillight',(side*(half-.2),.70,rear+.11),'#ff5638',1.6,2.8)
    for z in [front,rear]:box('bumper',(0,.5,z),(width+.03,.12,.1),'steel')
    for y in [.69,.75,.81]:box('front-grille',(0,y,front-.02),(.51,.025,.03),'navy')
    for x in [-.37,.37]:tube('windscreen-wiper',(x,1.24 if kei else 1.1,-1.66 if kei else -.66),(x+.15,1.36 if kei else 1.23,-1.66 if kei else -.59),.009,'navy',n=5)
    plate(front-.075,kei);plate(rear+.075,kei,True)
    # Parked vehicles have no wheel animation: batch their materials together.
    bpy.context.view_layer.update()
    pivots=[o for o in bpy.context.scene.objects if o.type=='EMPTY' and o.name.startswith('vehicle-wheel')]
    for pivot in pivots:
        for obj in list(pivot.children):
            transform=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=transform
        bpy.data.objects.remove(pivot,do_unlink=True)
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH' or obj.name.split('.')[0] not in ['pressed-body','hood','cab','cab-roof','rounded-cabin','mirror-housing','upper-body-belt']:continue
        bevel=obj.modifiers.new('small-painted-edge','BEVEL');bevel.width=.018;bevel.segments=2
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=bevel.name)
