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

const filePath = './public/assets/house_start.glb';
const stat = fs.statSync(filePath);
const hash = hashFile(filePath);

manifest.assets.push({
  id: 'house_start',
  file: 'house_start.glb',
  triangles: 5000,
  bytes: stat.size,
  sha256: hash
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Manifest updated');
