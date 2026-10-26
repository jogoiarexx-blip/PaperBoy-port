const fs = require('fs');
const buffer = fs.readFileSync('public/assets/tree_pink.glb');
const str = buffer.toString('utf8');
const match = str.match(/"max":\[([\d.-]+),([\d.-]+),([\d.-]+)\],"min":\[([\d.-]+),([\d.-]+),([\d.-]+)\]/);
if (match) {
  console.log("Pink Tree Bounds:", match[0]);
}

const buffer2 = fs.readFileSync('public/assets/tree_green.glb');
const str2 = buffer2.toString('utf8');
const match2 = str2.match(/"max":\[([\d.-]+),([\d.-]+),([\d.-]+)\],"min":\[([\d.-]+),([\d.-]+),([\d.-]+)\]/);
if (match2) {
  console.log("Green Tree Bounds:", match2[0]);
}
