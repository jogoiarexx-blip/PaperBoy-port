const fs = require('fs');
const str = fs.readFileSync('public/assets/horse.glb').toString('utf8');
const matchRot = str.match(/"rotation":\[([\d.-]+),([\d.-]+),([\d.-]+),([\d.-]+)\]/g);
if (matchRot) {
  console.log("Rotations:", matchRot.slice(0, 5));
}
