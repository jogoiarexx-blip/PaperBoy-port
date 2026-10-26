import fs from 'fs';
import crypto from 'crypto';

function hashFile(path) {
  const fileBuffer = fs.readFileSync(path);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

const manifestPath = './public/assets/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const assetsToAdd = [
  { id: 'tree_pink', file: 'tree_pink.glb' },
  { id: 'tree_green', file: 'tree_green.glb' },
  { id: 'tree_yellow', file: 'tree_yellow.glb' }
];

for (const asset of assetsToAdd) {
  const filePath = './public/assets/' + asset.file;
  if (!fs.existsSync(filePath)) {
    console.log('Skipping', filePath);
    continue;
  }
  const stat = fs.statSync(filePath);
  const hash = hashFile(filePath);
  const existing = manifest.assets.find(a => a.id === asset.id);
  if (existing) {
    existing.bytes = stat.size;
    existing.sha256 = hash;
  } else {
    manifest.assets.push({
      id: asset.id,
      file: asset.file,
      triangles: 5000,
      bytes: stat.size,
      sha256: hash
    });
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Manifest updated');
