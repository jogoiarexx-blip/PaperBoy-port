const fs = require('fs');
const buffer = fs.readFileSync('public/assets/tree_pink.glb');
console.log("Size:", buffer.length);
// Very crude way to see strings inside the GLB:
const str = buffer.toString('utf8');
const matches = str.match(/"name":"[^"]+"/g);
if (matches) {
  console.log([...new Set(matches)]);
}
