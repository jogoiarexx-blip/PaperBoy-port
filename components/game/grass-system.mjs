import * as THREE from 'three';
import {ground, seeded} from '../../engine/simulation.mjs';

const grassVertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vWorldPosition;
#include <common>
#include <logdepthbuf_pars_vertex>
#include <fog_pars_vertex>

void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Wind effect based on world position and time
    // We use instanceMatrix to get the true world position of the blade
    vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
    
    // Only sway the top vertices (uv.y > 0.0)
    if (uv.y > 0.0) {
        float sway = sin(worldPos.x * 0.5 + worldPos.z * 0.5 + time * 2.0) * 0.15;
        float sway2 = cos(worldPos.x * 1.2 + worldPos.z * 0.8 + time * 3.0) * 0.08;
        pos.x += (sway + sway2) * uv.y;
        pos.z += (sway * 0.5) * uv.y;
    }
    
    vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vWorldPosition = (modelMatrix * instanceMatrix * vec4(pos, 1.0)).xyz;
    
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
}
`;

const grassFragmentShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
#include <common>
#include <logdepthbuf_pars_fragment>
#include <fog_pars_fragment>

void main() {
    #include <logdepthbuf_fragment>
    
    // Zelda/Ghibli Two-tone grass color
    vec3 grassLight = vec3(0.506, 0.804, 0.329); // #81CD54
    vec3 grassShadow = vec3(0.294, 0.537, 0.173); // #4B892C
    
    // Mix based on UV height (bottom is darker, top is lighter)
    vec3 color = mix(grassShadow, grassLight, vUv.y);
    
    // Add subtle depth blend based on world Z to match ground
    float depthBlend = smoothstep(0.0, 80.0, -vWorldPosition.z);
    color = mix(color, color * 0.8, depthBlend);
    
    // Distance muting: very far grass gently shifts to a cool-grey-green
    float fogDist = smoothstep(40.0, 140.0, length(vWorldPosition));
    color = mix(color, color * vec3(0.92, 0.97, 0.90) + vec3(0.04, 0.06, 0.04), fogDist * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
}
`;

export function generateYardGrass(sim, scene, timeUniform) {
    const rng = seeded('grass');
    const bladeWidth = 0.2;
    const bladeHeight = 0.35;
    
    // Create simple quad for grass blade
    const geometry = new THREE.PlaneGeometry(bladeWidth, bladeHeight);
    geometry.translate(0, bladeHeight / 2, 0); // Move origin to bottom
    
    const material = new THREE.ShaderMaterial({
        vertexShader: grassVertexShader,
        fragmentShader: grassFragmentShader,
        uniforms: {
            time: timeUniform,
            ...THREE.UniformsLib.fog
        },
        side: THREE.DoubleSide,
        fog: true
    });
    
    // Calculate total instances needed
    const bladesPerYard = 300; // 300 blades per yard for dense coverage
    const yardsPerHouse = 2; // Front and back
    const totalHouses = sim.houses.length;
    const totalBlades = totalHouses * yardsPerHouse * bladesPerYard;
    
    const mesh = new THREE.InstancedMesh(geometry, material, totalBlades);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false; 
    
    const dummy = new THREE.Object3D();
    let instanceId = 0;
    
    for (const h of sim.houses) {
        // Front Yard bounds
        for (let i = 0; i < bladesPerYard; i++) {
            const x = h.side * (8.5 + rng() * 4.0);
            const z = h.z - 8 + rng() * 16.0;
            const y = ground(z);
            
            dummy.position.set(x, y, -z);
            dummy.rotation.y = rng() * Math.PI;
            
            const scaleX = 0.8 + rng() * 0.6;
            const scaleY = 0.7 + rng() * 0.8;
            dummy.scale.set(scaleX, scaleY, scaleX);
            
            dummy.updateMatrix();
            mesh.setMatrixAt(instanceId++, dummy.matrix);
        }
        
        // Back Yard bounds
        for (let i = 0; i < bladesPerYard; i++) {
            const x = h.side * (23.0 + rng() * 4.0);
            const z = h.z - 8 + rng() * 16.0;
            const y = ground(z);
            
            dummy.position.set(x, y, -z);
            dummy.rotation.y = rng() * Math.PI;
            
            const scaleX = 0.8 + rng() * 0.6;
            const scaleY = 0.7 + rng() * 0.8;
            dummy.scale.set(scaleX, scaleY, scaleX);
            
            dummy.updateMatrix();
            mesh.setMatrixAt(instanceId++, dummy.matrix);
        }
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    
    return material;
}
