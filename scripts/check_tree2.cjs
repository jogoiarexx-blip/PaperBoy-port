const fs = require('fs');
const str = fs.readFileSync('public/assets/tree_green.glb').toString('utf8');
const matches = str.match(/"name":"[^"]+"/g);
if (matches) {
  console.log([...new Set(matches)]);
}
