const fs = require('fs');
const buffer = fs.readFileSync('public/assets/tree_yellow.glb');
const str = buffer.toString('utf8');
const match = str.match(/"max":\[([\d.-]+),([\d.-]+),([\d.-]+)\],"min":\[([\d.-]+),([\d.-]+),([\d.-]+)\]/);
if (match) {
  console.log("Yellow Tree Bounds:", match[0]);
}
