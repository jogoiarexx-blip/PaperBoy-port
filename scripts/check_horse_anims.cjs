const fs = require('fs');
const buffer = fs.readFileSync('public/assets/horse.glb');
const str = buffer.toString('utf8');
const matches = str.match(/"name":"[^"]+"/g);
if (matches) {
  // Try to find animation names
  // In GLTF, animations are in the "animations" array. We'll just print all names and see which look like animations.
  console.log([...new Set(matches)]);
}
