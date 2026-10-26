const fs = require('fs');
const buffer = fs.readFileSync('public/assets/horse.glb');
const str = buffer.toString('utf8');
const mats = str.match(/"materials":\[(.*?)\]/);
if (mats) console.log(mats[0].slice(0, 500));
