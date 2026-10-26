/**
 * walk-controller.mjs
 * AAA-quality Third-Person Walk Controller for PAPERROUTE.
 *
 * Architecture:
 *  - WalkState:  pure physics/position logic (no Three.js — deterministic)
 *  - WalkCamera: spring/lerp orbit camera (Three.js, presentation only)
 *  - WalkController: wires keyboard/pointer input → WalkState → WalkCamera
 *
 * Design goals:
 *  - Camera-relative WASD movement (L-stick on console)
 *  - Quaternion.slerp character rotation with configurable speed
 *  - Velocity lerping (acceleration + friction) for console-feel inertia
 *  - Spring-damped follow camera with independent yaw/pitch orbit
 *  - AnimationMixer crossFadeTo blending (idle ↔ walk ↔ run)
 *  - Fully independent from the bike Simulation — toggle on/off cleanly
 */

import * as THREE from 'three';
import { ground, clamp } from '../../engine/simulation.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Tuning constants (console-feel defaults)
// ─────────────────────────────────────────────────────────────────────────────
export const WALK = Object.freeze({
  // Movement
  walkSpeed:     4.2,   // m/s sustained walk
  runSpeed:      8.5,   // m/s sprint (hold Shift)
  accel:         18,    // m/s² — how fast we reach target velocity
  friction:      14,    // m/s² — how fast we stop when no input
  // Character rotation
  turnRate:      9.0,   // slerp factor — higher = snappier rotation
  // Camera
  camDistance:   8.5,   // metres behind character
  camHeight:     2.5,   // metres above character pivot
  camLookAhead:  1.8,   // metres ahead of character the camera targets
  camPitchMin:  -0.1,
  camPitchMax:   Math.PI / 2.5,
  camYawRate:    4.0,   // spring stiffness for positional tracking
  camPanSpeed:   0.005, // mouse sensitivity
  camOrbitSens:  0.004, // mouse drag sensitivity (radians/pixel)
  pitchMin:     -0.35,  // minimum camera pitch (radians)
  pitchMax:      0.65,  // maximum camera pitch (radians)
  // Animation blending
  blendTime:     0.22,  // seconds for idle↔walk crossFade
  blendTimeRun:  0.15,  // seconds for walk↔run crossFade
  runThreshold:  0.6,   // fraction of runSpeed before switching to run anim
});

// ─────────────────────────────────────────────────────────────────────────────
// WalkState — pure physics, no Three.js
// ─────────────────────────────────────────────────────────────────────────────
export class WalkState {
  constructor(startX = 0, startZ = 0) {
    this.x   = startX;
    this.z   = startZ;
    this.vx  = 0;
    this.vz  = 0;
    this.yaw = 0;   // character facing angle (radians, Three.js convention)
    this.speed = 0; // scalar for animation blending
  }

  /**
   * @param {object} input  { forward, right, sprint }  (−1 to 1)
   * @param {number} camYaw Current camera yaw (radians) for camera-relative movement
   * @param {number} dt     Delta time (seconds)
   */
  step(input, camYaw, dt) {
    const { forward, right, sprint } = input;
    const hasInput = Math.abs(forward) > 0.01 || Math.abs(right) > 0.01;
    const maxSpeed = sprint ? WALK.runSpeed : WALK.walkSpeed;

    // --- Camera-relative direction ---
    // Camera looks along -Z in Three.js; yaw=0 means looking toward -Z world.
    const sinYaw = Math.sin(camYaw);
    const cosYaw = Math.cos(camYaw);

    // World-space movement intent (Game Z goes UP down the road)
    const desiredX =  sinYaw * forward + cosYaw * right;
    const desiredZ =  cosYaw * forward - sinYaw * right;

    // Normalise diagonal so we don't over-speed on diagonals
    const len = Math.hypot(desiredX, desiredZ) || 1;
    const targetVx = hasInput ? (desiredX / len) * maxSpeed : 0;
    const targetVz = hasInput ? (desiredZ / len) * maxSpeed : 0;

    // --- Velocity lerp (acceleration / friction) ---
    const rate = hasInput ? WALK.accel : WALK.friction;
    const alpha = clamp(rate * dt, 0, 1);
    this.vx += (targetVx - this.vx) * alpha;
    this.vz += (targetVz - this.vz) * alpha;

    // --- Integrate position ---
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // --- Scalar speed for animation blending ---
    this.speed = Math.hypot(this.vx, this.vz);

    // --- Smooth character rotation (only when moving) ---
    if (this.speed > 0.15) {
      // Target yaw: atan2(-vx, vz) to face down the road (-Z in Three.js) when moving forward (+vz in Game space)
      const targetYaw = Math.atan2(-this.vx, this.vz);
      // Shortest-arc slerp via angle delta
      let delta = targetYaw - this.yaw;
      // Wrap to (−π, π)
      while (delta >  Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      this.yaw += delta * clamp(WALK.turnRate * dt, 0, 1);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WalkCamera — spring/lerp orbit camera
// ─────────────────────────────────────────────────────────────────────────────
export class WalkCamera {
  constructor() {
    this.anchor = new THREE.Vector3(); // smoothed character position
    this.yaw    = Math.PI;  // camera horizontal angle (behind character initially)
    this.pitch  = 0.18;     // camera vertical angle
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
  }

  /**
   * Call once to wire mouse/touch orbit drag.
   * Returns an AbortController so you can clean up on exit.
   */
  bindDrag(canvas) {
    const ac = new AbortController();
    const { signal } = ac;
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 2 && e.button !== 0) return; // left or right click
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    }, { signal });
    window.addEventListener('pointermove', e => {
      if (!this._dragging) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this.yaw   -= dx * WALK.camOrbitSens;
      this.pitch  = clamp(this.pitch + dy * WALK.camOrbitSens, WALK.pitchMin, WALK.pitchMax);
    }, { signal });
    window.addEventListener('pointerup', () => { this._dragging = false; }, { signal });
    return ac;
  }

  /**
   * Update the camera to follow the character.
   * @param {WalkState} state
   * @param {THREE.PerspectiveCamera} camera
   * @param {number} dt
   */
  update(state, camera, dt) {
    // --- Spring anchor to character world-position ---
    const charY  = ground(state.z);
    const target = new THREE.Vector3(state.x, charY, -state.z);
    const kAnchor = WALK.camYawRate;
    const alpha   = clamp(kAnchor * dt, 0, 1);
    this.anchor.lerp(target, alpha);

    // No auto-follow yaw! The player manually controls the orbit camera with the mouse.
    // This prevents the nasty feedback loop where moving turns the character, which turns the camera,
    // which changes the movement direction.

    // --- Build camera position ---
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    const offset = new THREE.Vector3(
      sinY * cosP * WALK.camDistance,
      sinP * WALK.camDistance + WALK.camHeight,
      cosY * cosP * WALK.camDistance,
    );

    camera.position.copy(this.anchor).add(offset);

    // Look slightly ahead of character in movement direction
    const lookTarget = this.anchor.clone();
    if (state.speed > 0.1) {
      lookTarget.x -= Math.sin(state.yaw) * WALK.camLookAhead;
      lookTarget.z -= (-Math.cos(state.yaw)) * WALK.camLookAhead; // Three.js -Z forward
      lookTarget.z  = -(lookTarget.z * -1); // re-apply Three-Z sign
      // Simpler: just use the anchor + tiny forward offset
    }
    lookTarget.y += 1.0; // aim at head height
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld();
  }

  /** Expose current camera yaw so WalkState can compute camera-relative movement */
  get camYaw() { return this.yaw; }
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimationBlender — handles crossFadeTo between idle/walk/run
// ─────────────────────────────────────────────────────────────────────────────
export class AnimationBlender {
  /**
   * @param {THREE.AnimationMixer} mixer
   * @param {{ idle: THREE.AnimationClip, walk: THREE.AnimationClip, run?: THREE.AnimationClip }} clips
   */
  constructor(mixer, clips) {
    this.mixer = mixer;
    this.actions = {
      idle: mixer.clipAction(clips.idle),
      walk: clips.walk ? mixer.clipAction(clips.walk) : null,
      run:  clips.run  ? mixer.clipAction(clips.run)  : null,
    };
    // Start all at weight 0, then play idle
    Object.values(this.actions).filter(Boolean).forEach(a => { a.play(); a.weight = 0; });
    if (this.actions.idle) { this.actions.idle.weight = 1; }
    this._current = 'idle';
  }

  update(speed, dt) {
    const runThresh  = WALK.runThreshold * WALK.runSpeed;
    const walkThresh = 0.15;

    let desired;
    if      (speed > runThresh  && this.actions.run)  desired = 'run';
    else if (speed > walkThresh && this.actions.walk) desired = 'walk';
    else                                               desired = 'idle';

    if (desired !== this._current) {
      const from = this.actions[this._current];
      const to   = this.actions[desired];
      if (from && to) {
        const blendT = desired === 'run' ? WALK.blendTimeRun : WALK.blendTime;
        from.crossFadeTo(to, blendT, true);
      }
      this._current = desired;
    }
    this.mixer.update(dt);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WalkController — wires everything together
// ─────────────────────────────────────────────────────────────────────────────
export class WalkController {
  constructor(canvas) {
    this.canvas   = canvas;
    this.state    = new WalkState();
    this.walkCam  = new WalkCamera();
    this.keys     = new Set();
    this._aborts  = [];
    this._dragAbort = null;
    this.mixer    = null; // set externally if model has animations
    this.blender  = null; // AnimationBlender instance (optional)
    this.active   = false;
  }

  /** Call to enter walk mode. Positions the walker at the rider's current position. */
  activate(riderX, riderZ, canvas) {
    this.active = true;
    this.state  = new WalkState(riderX, riderZ);
    this.state.yaw = Math.PI; // start character facing down the road
    this.walkCam.anchor.set(riderX, ground(riderZ), -riderZ);
    this.walkCam.yaw = 0; // start looking behind the character
    // Bind keyboard
    window.addEventListener('keydown', e => this.keys.add(e.code), { signal: this._abortCtrl().signal });
    window.addEventListener('keyup',   e => this.keys.delete(e.code), { signal: this._abortCtrl().signal });
    // Bind camera drag on canvas
    this._dragAbort = this.walkCam.bindDrag(canvas);
  }

  /** Exit walk mode and clean up listeners. */
  deactivate() {
    this.active = false;
    this._aborts.forEach(ac => ac.abort());
    this._aborts = [];
    this._dragAbort?.abort();
    this._dragAbort = null;
    this.keys.clear();
  }

  _abortCtrl() {
    const ac = new AbortController();
    this._aborts.push(ac);
    return ac;
  }

  /** Poll keyboard state into a normalised input object */
  _readInput() {
    const fwd  = (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    ? 1 : 0;
    const bwd  = (this.keys.has('KeyS') || this.keys.has('ArrowDown'))   ? 1 : 0;
    const lft  = (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))   ? 1 : 0;
    const rgt  = (this.keys.has('KeyD') || this.keys.has('ArrowRight'))  ? 1 : 0;
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    return {
      forward: fwd - bwd,
      right:   rgt - lft,
      sprint,
    };
  }

  /**
   * Call every frame.
   * @param {THREE.PerspectiveCamera} camera   The scene's main camera
   * @param {number} dt                         Delta time in seconds
   * @param {THREE.Object3D|null} model         Character 3D model to position/rotate
   */
  update(camera, dt, model = null) {
    if (!this.active) return;

    const input = this._readInput();

    // Physics step
    this.state.step(input, this.walkCam.camYaw, dt);

    // Camera
    this.walkCam.update(this.state, camera, dt);

    // Apply to 3D model
    if (model) {
      model.position.set(this.state.x, ground(this.state.z), -this.state.z);
      // Smooth quaternion rotation
      const targetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, this.state.yaw, 0)
      );
      model.quaternion.slerp(targetQuat, clamp(WALK.turnRate * dt, 0, 1));
    }

    // Animation blending
    if (this.blender) {
      this.blender.update(this.state.speed, dt);
    } else if (this.mixer) {
      this.mixer.update(dt);
    }
  }

  /** Current position for external use (e.g. returning to bike) */
  get position() { return { x: this.state.x, z: this.state.z }; }
}
