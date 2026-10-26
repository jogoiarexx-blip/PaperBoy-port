import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('every expanded world asset has current four-sided Cycles review evidence',()=>{
 const assets=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).assets.filter(a=>a.revision==='living-summer-v5');
 const base=new URL('../public/review/living-v5/',import.meta.url),review=JSON.parse(fs.readFileSync(new URL('manifest.json',base)));
 assert.equal(assets.length,6);assert.equal(review.captures.length,52);
 for(const a of assets)for(const view of ['front','side','rear','clay']){const c=review.captures.find(c=>c.asset===a.id&&c.view===view);assert.ok(c);assert.equal(c.assetSha256,a.sha256);const b=fs.readFileSync(new URL(c.file,base));assert.equal(b.readUInt32BE(16),640);assert.equal(b.readUInt32BE(20),640);}
});
