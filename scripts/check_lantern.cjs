const fs = require('fs');
const buffer = fs.readFileSync('public/assets/lantern.glb');
const str = buffer.toString('utf8');
const matches = str.match(/"name":"[^"]+"/g);
if (matches) {
  console.log([...new Set(matches)]);
}
const matchBounds = str.match(/"max":\[([\d.-]+),([\d.-]+),([\d.-]+)\],"min":\[([\d.-]+),([\d.-]+),([\d.-]+)\]/);
if (matchBounds) {
  console.log("Lantern Bounds:", matchBounds[0]);
}
