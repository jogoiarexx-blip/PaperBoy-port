const fs = require('fs');
const buffer = fs.readFileSync('public/assets/horse.glb');
const str = buffer.toString('utf8');
const match = str.match(/"path":"scale"/g);
console.log("Scale tracks:", match ? match.length : 0);
const pos = str.match(/"path":"translation"/g);
console.log("Translation tracks:", pos ? pos.length : 0);
