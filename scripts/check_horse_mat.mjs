import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import fs from 'fs';
// We can't easily run GLTFLoader in Node without a polyfill for fetch/DOM.
