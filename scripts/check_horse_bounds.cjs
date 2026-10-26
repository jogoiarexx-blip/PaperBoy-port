const fs = require('fs');
const buffer = fs.readFileSync('public/assets/horse.glb');
const str = buffer.toString('utf8');
const match = str.match(/"max":\[([\d.-]+),([\d.-]+),([\d.-]+)\],"min":\[([\d.-]+),([\d.-]+),([\d.-]+)\]/);
if (match) {
  console.log("Horse Bounds:", match[0]);
}
