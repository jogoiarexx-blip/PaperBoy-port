import * as fs from 'fs';
// We just need to read the GLB to see material names, but node doesn't have GLTFLoader by default.
// Let's use grep strings on the .glb file instead.
