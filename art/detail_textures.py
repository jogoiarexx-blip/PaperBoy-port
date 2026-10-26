"""Repeatable painted pigment/normal maps, authored in Blender with NumPy.

PaintUV is independent of the packed AO atlas. Maps are small and tileable;
normal relief is deliberately shallow so broad illustrated lighting survives.
"""
import math
import bpy
import numpy as np

def install(g):
    folder=g.OUT/'paint';folder.mkdir(exist_ok=True)
    size=512;v,u=np.mgrid[0:size,0:size].astype(np.float32)/size
    for name,kind in [('cedar','wood'),('cedarLight','wood'),('bark','bark'),
                      ('kawara','tile'),('tileLight','tile'),('leaf','leaf'),
                      ('leafLight','leaf'),('leafDark','leaf'),('stone','stone')]:
        wave=np.sin(2*math.pi*(u*3+np.sin(v*2*math.pi)*.12))
        if kind=='wood':
            height=.5+.22*np.sin(2*math.pi*(u*23+.3*np.sin(v*2*math.pi)+.13*wave))
            height+=.12*np.sin(2*math.pi*(u*51+.3*np.sin(v*4*math.pi)))
            knot=np.sin(2*math.pi*u)**2+np.sin(2*math.pi*v)**2*3
            height-=.17*np.exp(-knot*9)
        elif kind=='bark':
            height=.52+.22*np.sin(2*math.pi*(u*19+.35*np.sin(v*4*math.pi)))
            height+=.14*np.sin(2*math.pi*(u*41+v*3))
        elif kind=='leaf':
            height=.5+.2*np.sin(u*12*math.pi+np.sin(v*8*math.pi))*np.cos(v*12*math.pi)
            height+=.13*np.sin(u*26*math.pi)*np.sin(v*20*math.pi)
        elif kind=='tile':height=.5+.12*np.sin(u*16*math.pi)+.1*np.cos(v*22*math.pi+wave)
        else:height=.5+.13*np.sin(u*18*math.pi)*np.cos(v*14*math.pi)+.08*wave
        pigment=np.clip(.83+.23*height,0,1.08)
        m=g.material(name);m['paintedTexture']=kind;p=m.node_tree.nodes.get('Principled BSDF')
        rgb=np.array(m.diffuse_color[:3]);color=np.ones((size,size,4),np.float32)
        linear=np.clip(rgb[None,None,:]*pigment[:,:,None],0,1)
        color[:,:,:3]=np.where(linear<=.0031308,linear*12.92,1.055*linear**(1/2.4)-.055)
        # Write encoded pixels without a second color conversion, then load the
        # file as sRGB. This keeps the exported paint equal to the chosen palette.
        tex=bpy.data.images.new(name+'-paint',size,size,alpha=True);tex.colorspace_settings.name='Non-Color'
        tex.pixels.foreach_set(color.ravel());file=str(folder/(name+'-paint.png'));tex.filepath_raw=file;tex.file_format='PNG';tex.save()
        bpy.data.images.remove(tex);tex=bpy.data.images.load(file,check_existing=False);tex.colorspace_settings.name='sRGB';tex.pack()
        uv=m.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map='PaintUV'
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex;node.extension='REPEAT'
        m.node_tree.links.new(uv.outputs['UV'],node.inputs['Vector']);m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
        dx=(np.roll(height,-1,1)-np.roll(height,1,1))*3;dy=(np.roll(height,-1,0)-np.roll(height,1,0))*3
        normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
        pixels=np.ones((size,size,4),np.float32);pixels[:,:,:3]=normal*.5+.5
        img=bpy.data.images.new(name+'-normal',size,size,alpha=True);img.colorspace_settings.name='Non-Color';img.pixels.foreach_set(pixels.ravel())
        img.filepath_raw=str(folder/(name+'-normal.png'));img.file_format='PNG';img.save();img.pack()
        n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=img;n.extension='REPEAT';m.node_tree.links.new(uv.outputs['UV'],n.inputs['Vector'])
        relief=m.node_tree.nodes.new('ShaderNodeNormalMap');relief.inputs['Strength'].default_value=.22 if kind=='leaf' else .38
        m.node_tree.links.new(n.outputs['Color'],relief.inputs['Color']);m.node_tree.links.new(relief.outputs['Normal'],p.inputs['Normal'])

def paint_uv(obj):
    """Face-aligned metric coordinates keep grain along timber, including decks."""
    data=obj.data;uv=data.uv_layers.new(name='PaintUV')
    for face in data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]))
        for index in face.loop_indices:
            p=data.vertices[data.loops[index].vertex_index].co
            # Blender Z is authored Y. Vertical faces run grain vertically;
            # horizontal porch planks run along authored Z (Blender Y).
            a,b=(p.x,p.y) if axis==2 else ((p.x,p.z) if axis==1 else (p.y,p.z))
            uv.data[index].uv=(a,b*.55)
