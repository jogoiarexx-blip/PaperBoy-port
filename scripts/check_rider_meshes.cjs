const fs = require('fs');
const buffer = fs.readFileSync('public/assets/rider.glb');
const str = buffer.toString('utf8');
const matches = str.match(/"name":"[^"]+"/g);
if (matches) {
  console.log([...new Set(matches)]);
}
