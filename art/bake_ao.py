"""Cycles AO baked into a shared non-overlapping atlas and glTF Occlusion."""
import bpy
def bake(name,out,size=512):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12
    scene.render.threads_mode='FIXED';scene.render.threads=2
    meshes=[o for o in scene.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    painted=any('PaintUV' in o.data.uv_layers for o in meshes)
    for o in meshes:
        o.select_set(True)
        if painted:
            atlas=o.data.uv_layers.new(name='AOAtlas');o.data.uv_layers.active=atlas
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.uv.pack_islands(margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new(name+'-baked-ao',width=size,height=size);image.colorspace_settings.name='Non-Color'
    group=bpy.data.node_groups.get('glTF Material Output')
    if not group:
        group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');group.nodes.new('NodeGroupInput')
    copied={}
    for o in meshes:
        for slot in o.material_slots:
            source=slot.material
            if source.name not in copied:
                m=source.copy();m.name=source.name+'@'+name;m['surface']=source.name;m['aoBaked']=True
                node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;m.node_tree.nodes.active=node
                if painted:
                    uv=m.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map='AOAtlas';m.node_tree.links.new(uv.outputs['UV'],node.inputs['Vector'])
                output=m.node_tree.nodes.new('ShaderNodeGroup');output.node_tree=group;m.node_tree.links.new(node.outputs['Color'],output.inputs['Occlusion']);copied[source.name]=m
            slot.material=copied[source.name]
    bpy.ops.object.bake(type='AO',use_clear=True,margin=4)
    folder=out/'ao';folder.mkdir(exist_ok=True);image.filepath_raw=str(folder/(name+'.png'));image.file_format='PNG';image.save();image.pack()
    return {'baked':True,'resolution':size,'file':'ao/'+name+'.png','channel':'occlusion'}
