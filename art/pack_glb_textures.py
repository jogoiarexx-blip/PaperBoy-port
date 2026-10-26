"""Share identical image payloads between GLBs; preserve geometry and texture UVs.

The GLB remains a valid glTF binary with relative image URIs. Images are content
addressed so browser caches and the runtime can reuse paint maps across houses.
"""
import hashlib,json,struct

def externalize(path):
    data=path.read_bytes();size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size])
    offset=20+size;binary=data[offset+8:];views=doc.get('bufferViews',[])
    image_views=set();files=[];folder=path.parent/'shared';folder.mkdir(exist_ok=True)
    for image in doc.get('images',[]):
        index=image.get('bufferView')
        if index is None:continue
        view=views[index];start=view.get('byteOffset',0);payload=binary[start:start+view['byteLength']]
        suffix='.png' if image.get('mimeType')=='image/png' else '.jpg'
        relative='shared/'+hashlib.sha256(payload).hexdigest()[:24]+suffix
        (path.parent/relative).write_bytes(payload);image['uri']=relative;del image['bufferView'];image_views.add(index);files.append(relative)
    packed=bytearray();new_views=[];mapping={}
    for index,view in enumerate(views):
        if index in image_views:continue
        while len(packed)%4:packed.append(0)
        start=view.get('byteOffset',0);copy=dict(view);copy['byteOffset']=len(packed)
        mapping[index]=len(new_views);new_views.append(copy);packed.extend(binary[start:start+view['byteLength']])
    for accessor in doc.get('accessors',[]):
        if 'bufferView' in accessor:accessor['bufferView']=mapping[accessor['bufferView']]
        for item in accessor.get('sparse',{}).values():
            if isinstance(item,dict) and 'bufferView' in item:item['bufferView']=mapping[item['bufferView']]
    doc['bufferViews']=new_views;doc['buffers'][0]['byteLength']=len(packed)
    body=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();body+=b' '*((-len(body))%4);packed+=b'\0'*((-len(packed))%4)
    output=struct.pack('<III',0x46546c67,2,28+len(body)+len(packed))+struct.pack('<II',len(body),0x4e4f534a)+body+struct.pack('<II',len(packed),0x004e4942)+packed
    path.write_bytes(output)
    return sorted(set(files))
