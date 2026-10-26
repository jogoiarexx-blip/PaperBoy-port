// One layout shared by the live scene and offline composition reviews.
import * as THREE from 'three';
import {ground,RULES,seeded} from '../../engine/simulation.mjs';
import {TOWN} from '../../engine/living-world.mjs';

export function createWorldPlacements(sim){
  const placements=new Map();
  const rng=seeded(123);
  function place(name,x,y,z,rotation=0,scale=1){
    if(!placements.has(name))placements.set(name,[]);
    const o=new THREE.Object3D();
    o.position.set(x,y,z);
    o.rotation.y=rotation;
    if (typeof scale === 'number') o.scale.setScalar(scale);
    else o.scale.set(scale.x, scale.y, scale.z);
    o.updateMatrix();
    placements.get(name).push(o.matrix.clone());
  }
  function placeTree(type,x,y,z,rotation=0,scale=1, scaleYMult=1){
      const finalScale = type === 'tree_pink' ? scale * 45 : scale;
      const finalY = type === 'tree_pink' ? y + finalScale * 0.9 : y;
      const s = scaleYMult !== 1 ? {x: finalScale, y: finalScale * scaleYMult, z: finalScale} : finalScale;
      place(type, x, finalY, z, rotation, s);
  }
  place('terrain',0,0,0);place('ocean',0,-35,-690,0,1);place('beach',0,-35,-690);

  // 3. SPECIAL LANDMARKS
  // Place the Sakura tree after the second house on the right (gap is around Z=30).
  // Target height ~15m (similar to the giant red tree). Scale = 8.5 (since base model is ~1.76m).
  // The model's origin is at its center (0.89 units from the bottom). At scale 8.5, the bottom is 7.56 units down.
  // We offset Y by +7.8 to ensure the trunk base sits nicely on the ground.
  place('sakura_tree', 14.0, ground(30), -30, Math.PI / 3, 30);
  
  // Custom house at the very start of the game (Right side)
  // Adjusted x to 13.7 to align with other houses, and z to -12 to bring it closer to the first generated house
  place('house_start', 13.7, ground(12), -12, -Math.PI/2, 1.0);
  
  // Japanese Temple exactly at the center behind the player, facing down the street
  // Lowered Y by 2.5 to fix floating
  place('japanese_temple', 0, ground(-40) - 2.5, -(-40), 0, 0.006);
  
  // Organic Cherry Tree Forest around the castle approach
  // Massively dense forest (300 trees) to fill all gaps
  for (let i = 0; i < 300; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    // Spread between Z = -95 and Z = -15
    const z = -95 + rng() * 80;
    // Spread X from 9 (right at the road curb) up to 50 (very deep)
    const x = side * (9 + rng() * 41);
    
    // Tight clearance around the castle (Z = -40) so trees hug the building closely
    if (Math.abs(z - (-40)) < 12 && Math.abs(x) < 13) continue;

    // Size (slightly vertically stretched for taller trunks)
    const scale = 0.25 + rng() * 0.15;
    // We pass 1.45 as the Y-scale multiplier to lengthen the trunks
    placeTree('japanese_cherry_tree', x, ground(z), -z, rng() * Math.PI * 2, scale, 1.45);
  }

  // Giant pink tree backdrop for the custom house (moved accordingly)
  placeTree('tree_pink', 21.0, ground(12), -12, 0, 0.18);
  
  // Road tiles — TOWN (sloped) and BRIDGE+COAST (flat, rotation.x=0 since ground is now level).
  // Main road goes straight up to Z=851. After that, it curves right into the city.
  for(let row=-3;row<38;row++){
    const distance=row*23;
    const onBridge=distance>=540;
    const o=new THREE.Object3D();
    o.position.set(0,ground(distance),-distance);
    o.rotation.x=onBridge?0:-Math.atan(RULES.slope);
    o.updateMatrix();
    if(!placements.has('road'))placements.set('road',[]);
    placements.get('road').push(o.matrix.clone());
  }

  // 1. COLLECT BOUNDING BOXES FOR COLLISION AVOIDANCE
  const houseCenters = [];
  for (const h of sim.houses) {
    houseCenters.push({x: h.x, z: h.z, r: 6.5}); // Front houses
    houseCenters.push({x: h.side * 28.5, z: h.z, r: 6.5}); // Middle houses
    houseCenters.push({x: h.side * 44.5, z: h.z, r: 6.5}); // Back houses
  }

  function isValidTreePos(x, z, minClearance) {
    if (Math.abs(x) < 9.5) return false; // Keep road and sidewalk clear
    for (const hc of houseCenters) {
      // Create a strict buffer zone. House radius is ~6.5.
      if (Math.hypot(x - hc.x, z - hc.z) < (hc.r + minClearance)) return false;
    }
    return true;
  }



  for(const h of sim.houses){
    // House scale: 0.85 ensures a single floor is approx 3.5m tall
    place('house_'+h.family,h.x,ground(h.z),-h.z,h.side*Math.PI/2,0.85);
    
    // Hang Japanese paper lantern on most houses (attached strictly to the wall)
    if (rng() > 0.2) {
       // h.x is ~ 12.5 * side. The wall is around 2.8m closer to the road.
       place('lantern', h.x - h.side * 2.8, ground(h.z) + 1.8, -h.z - 1.5, 0, 0.12);
    }
    
    // Add traditional stone lantern in some front yards (approx 15% of houses)
    if (rng() > 0.85) {
       place('stone_lantern', h.side * 5.8, ground(h.z), -(h.z - 3), h.side === 1 ? Math.PI : 0, 1.2);
    }
    

    for(const dz of [-9.1,-7,-4.9,4.9,7,9.1])place('fence',h.side*7.9,ground(h.z+dz),-h.z-dz);
    for(const dz of [-7,7])place('flower_patch',h.side*8.35,ground(h.z+dz),-h.z-dz,0,.9);
    // Side gate flower patch
    place('flower_patch',h.side*9.1,ground(h.z),-h.z,rng()*Math.PI,.65+rng()*.3);

    // BACK ROW (row 1) — closer depth
    const backFamily = (h.family + 1 + Math.floor(rng() * 5)) % 7;
    const backX = h.side * 28.5;
    place('house_'+backFamily, backX, ground(h.z), -h.z, h.side*Math.PI/2, 0.85);
    for(const dz of [-9.1,-7,-4.9,4.9,7,9.1])place('fence', h.side*22.7, ground(h.z+dz), -h.z-dz);
    for(const dz of [-7,7])place('flower_patch', h.side*23.1, ground(h.z+dz), -h.z-dz, 0, .9);
    // BACK ROW (row 2) — deeper silhouette depth
    const backFamily2 = (h.family + 3 + Math.floor(rng() * 4)) % 7;
    const backX2 = h.side * 44.5;
    place('house_'+backFamily2, backX2, ground(h.z), -h.z, h.side*Math.PI/2, 0.85);
  }

  // 2. GREEN TREES & FORESTS: ORGANIC CLUSTERING & NATURAL DIVIDERS
  // We place clusters (2-3 trees) in the gaps between houses and extending into the deep background.
  // Start at -15 to avoid mixing with the custom cherry trees near the castle
  for (let z = -15; z < 560; z += 12) {
    for (const side of [-1, 1]) {
      // Create a few clusters per depth layer to maintain the "green wall" effect
      for (let depth = 0; depth < 3; depth++) {
         const clusterSize = 2 + Math.floor(rng() * 2); // 2 or 3 trees per cluster
         const basePathX = side * (16 + depth * 15 + rng() * 10);
         const basePathZ = z + rng() * 10;
         
         for (let i = 0; i < clusterSize; i++) {
            const tx = basePathX + (rng() - 0.5) * 8;
            const tz = basePathZ + (rng() - 0.5) * 8;
            
            // Strict non-clipping (5.0m buffer from house centers)
            // And avoid front yard center (X < 12) to keep delivery path clear
            if (isValidTreePos(tx, tz, 5.0) && Math.abs(tx) >= 12) {
                // Scale increased to ~8 to 12.5 units tall for a more majestic look (0.08 to 0.13)
                const scale = 0.08 + rng() * 0.05;
                // Mostly green trees, with rare yellow/pink accents in the clusters
                const type = rng() > 0.85 ? (rng() > 0.5 ? 'tree_pink' : 'tree_yellow') : 'tree_green';
                placeTree(type, tx, ground(tz), -tz, rng() * Math.PI * 2, scale);
            }
         }
      }

      // Small green windbreak trees along sidewalks (infrequent)
      if (rng() > 0.65) {
         const sx = side * (9 + rng() * 1.5);
         const sz = z + rng() * 8;
         if (isValidTreePos(sx, sz, 3.0)) { // 3.0m buffer for smaller trees
             const smallScale = 0.02 + rng() * 0.015; // 2 to 3 units tall
             placeTree('tree_green', sx, ground(sz), -sz, rng() * Math.PI * 2, smallScale);
         }
      }
    }
  }
  let vehicleIndex=0;
  for(const o of sim.obstacles)place(o.type==='car'?(vehicleIndex++%2?'kei_truck':'car'):'bin',o.x,ground(o.z),-o.z,o.type==='car'?.1:0);
  // More utility poles — every 30m on right side, every 46m left side
  for(let z=12;z<1050;z+=30)place('utility_pole',8.35,ground(z),-z);
  for(let z=35;z<550;z+=46)place('utility_pole',-8.35,ground(z),-z,Math.PI);
  for(const p of TOWN){
    if (p.asset.startsWith('tree_')) {
      placeTree(p.asset,p.x,ground(p.z),-p.z,-Math.PI/2, 0.1);
    } else {
      place(p.asset,p.x,ground(p.z),-p.z,-Math.PI/2);
    }
    place('vending_machine',-8.8,ground(p.z+4.2),-p.z-4.2,-Math.PI/2);
  }
  // Streetlights every 22m for denser road lighting feel (stops before bridge)
  for(let z=16;z<430;z+=22)place('streetlight',-7.7,ground(z),-z,Math.PI);
  
  // Traditional Stone Lanterns leading to and along the Torii bridge
  for(let z=450;z<860;z+=20) {
     for(const side of [-1,1]) place('stone_lantern', side * 5.8, ground(z), -z, side === 1 ? Math.PI : 0, 1.2);
  }

  // Additional right-side streetlights on bridge
  for(let z=4;z<1050;z+=12)for(const side of [-1,1])place('drain_grate',side*5.98,ground(z)+.015,-z);
  // Bridge section (z: 540→860): Left side is river with fence, Right side is ground with a road network for a future city!
  place('torii', 0, ground(540), -540, 0, 5.5);
  for(let z=540;z<860;z+=3.1){
    place('fence', -6.4, ground(z), -z, 0); // Left fence only
  }

  // The glitchy terrain mesh loop was removed.
  // A solid generic plane is now created in scene.mjs to cover the entire right side.

  function drawRoad(startX, startZ, endX, endZ) {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    for (let i = 0; i <= dist; i += 11) {
      const x = startX + Math.sin(angle) * i;
      const z = startZ + Math.cos(angle) * i;
      place('road', x, ground(z), -z, angle, 1);
      
      const leftAngle = angle - Math.PI/2;
      place('curb', x + Math.sin(leftAngle)*8, ground(z)+0.1, -(z + Math.cos(leftAngle)*8), angle, 1.2);

      const rightAngle = angle + Math.PI/2;
      place('curb', x + Math.sin(rightAngle)*8, ground(z)+0.1, -(z + Math.cos(rightAngle)*8), angle, 1.2);
    }
  }

  function placeHousesAlongStreet(startX, startZ, endX, endZ, side) {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const dist = Math.hypot(dx, dz);
    const roadAngle = Math.atan2(dx, dz);
    const perpAngle = roadAngle + (side === 1 ? Math.PI/2 : -Math.PI/2);
    const faceAngle = perpAngle + Math.PI;

    const offsetX = Math.sin(perpAngle) * 14;
    const offsetZ = Math.cos(perpAngle) * 14;

    let houseCount = 0;
    const houseTypes = ['house_1', 'house_2', 'house_3'];
    
    for (let i = 18; i <= dist - 18; i += 20) {
      const x = startX + Math.sin(roadAngle) * i + offsetX;
      const z = startZ + Math.cos(roadAngle) * i + offsetZ;
      const type = houseTypes[houseCount % houseTypes.length];
      place(type, x, ground(z), -z, faceAngle, 1.0);
      place('post_box', x + Math.sin(faceAngle)*6, ground(z), -(z + Math.cos(faceAngle)*6), faceAngle);
      // Add a tree between houses
      if (i + 10 <= dist - 18) {
        placeTree('tree_green', x + Math.sin(roadAngle)*10, ground(z), -(z + Math.cos(roadAngle)*10), 0, 0.08);
      }
      houseCount++;
    }
  }

  // T-Junction Side Street at Z=600 branching right (towards gas station)
  drawRoad(11, 600, 100, 600);


  // Bridge streetlights every 55m.
  for(let z=555;z<860;z+=55){
    place('streetlight',-7.0,ground(z),-z,Math.PI); // left
    place('streetlight', 7.0,ground(z),-z,0);       // right (edge of main road)
  }

  // ── RIVER (نهر) BELOW the bridge — LEFT side only (z: 510 → 950) ──
  const bridgeDeck=ground(540);
  const riverY=bridgeDeck-9;          // water surface level
  const bankY=bridgeDeck-1;           // sandy bank just under bridge base
  for(let z=510;z<960;z+=22){
    place('ocean',-50,riverY,-z,0,1); // wide water body to the LEFT
    place('beach',-11,bankY,-z,-Math.PI/2,.55); // narrow sand bank at bridge foot
  }
  
  // ── Main Avenue Curve starting at Z=851 ──
  // The road curves 90 degrees to the right. Radius = 40m.
  const curveZ = 851;
  const radius = 40;
  // Increase density significantly to smoothen the fan effect
  const curveSteps = 48;
  for (let i = 0; i <= curveSteps; i++) {
    const angle = i * (Math.PI / 2) / curveSteps;
    const x = radius * (1 - Math.cos(angle));
    const z = curveZ + radius * Math.sin(angle);
    place('road', x, ground(z), -z, angle, 1);
    
    // Curbs along the curve
    const inX = (radius - 8) * (1 - Math.cos(angle));
    const inZ = curveZ + (radius - 8) * Math.sin(angle);
    place('curb', inX, ground(inZ)+0.1, -inZ, angle, 1.2);

    const outX = (radius + 8) * (1 - Math.cos(angle));
    const outZ = curveZ + (radius + 8) * Math.sin(angle);
    place('curb', outX, ground(outZ)+0.1, -outZ, angle, 1.2);
  }

  // Straight road after the curve (Main Avenue)
  drawRoad(radius + 11, curveZ + radius, radius + 250, curveZ + radius);

  // ── NEIGHBORHOOD BLOCK INFRASTRUCTURE ──
  // Cross Street 1
  drawRoad(100, 891, 100, 1030);
  // Cross Street 2
  drawRoad(180, 891, 180, 1030);
  // Cross Street 3
  drawRoad(260, 891, 260, 1030);
  // Back Alley / Parallel Avenue
  drawRoad(100, 1030, 260, 1030);

  // (Houses have been removed temporarily to focus on infrastructure)


  for(const p of TOWN){
    place('post_box',-7.95,ground(p.z-5),-p.z+5,-Math.PI/2);
    place('bench',-9,ground(p.z+7),-p.z-7,-Math.PI/2);
    place('bench',-9,ground(p.z-8),-p.z+8,-Math.PI/2);
    place('boundary_wall',-8,ground(p.z+10),-p.z-10);
    // Extra town ambience: right-side bench
    place('bench',9,ground(p.z+6),-p.z-6,Math.PI/2);
  }

  // Road markings — bridge/coast tiles use rotation.x=0 (flat).
  for(const z of [110,294,478]){
    const o=new THREE.Object3D();o.position.set(0,ground(z),-z);o.rotation.x=-Math.atan(RULES.slope);o.updateMatrix();
    if(!placements.has('road_markings'))placements.set('road_markings',[]);placements.get('road_markings').push(o.matrix.clone());
  }
  for(const z of [620,720,800]){ // Stop road markings before curve
    const o=new THREE.Object3D();o.position.set(0,ground(z),-z);o.rotation.x=0;o.updateMatrix();
    placements.get('road_markings').push(o.matrix.clone());
  }
  return placements;
}
