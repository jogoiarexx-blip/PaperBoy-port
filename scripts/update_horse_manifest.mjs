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

const filePath = './public/assets/horse.glb';
const stat = fs.statSync(filePath);
const hash = hashFile(filePath);

manifest.assets.push({
  id: 'horse',
  file: 'horse.glb',
  triangles: 50000,
  bytes: stat.size,
  sha256: hash
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Manifest updated with horse');
