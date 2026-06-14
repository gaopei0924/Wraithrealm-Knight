import { SKILL_KEYS } from '../combat/skills.js';

// Keyboard + mouse + gamepad input with edge detection and an attack buffer.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed this frame
    this.mouse = { x: 0, y: 0 };
    this.attackBuffered = 0; // timestamp until which an attack press is buffered
    this.rollBuffered = 0;
    this.touchMove = { x: 0, z: 0 }; // set by the on-screen joystick
    this.padMove = { x: 0, z: 0 };   // set by the gamepad left stick
    this.prevPad = [];               // previous button states for edge detection

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (e.code === 'KeyJ') this.attackBuffered = performance.now() + 250;
      if (e.code === 'Space') {
        this.rollBuffered = performance.now() + 200;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.attackBuffered = performance.now() + 250;
      if (e.button === 2) this.rollBuffered = performance.now() + 200;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  get moveVector() {
    // On-screen joystick takes priority while engaged.
    const tLen = Math.hypot(this.touchMove.x, this.touchMove.z);
    if (tLen > 0.18) {
      const clamped = Math.min(1, tLen);
      return { x: (this.touchMove.x / tLen) * clamped, z: (this.touchMove.z / tLen) * clamped };
    }
    // Gamepad left stick next.
    const pLen = Math.hypot(this.padMove.x, this.padMove.z);
    if (pLen > 0.22) {
      const clamped = Math.min(1, pLen);
      return { x: (this.padMove.x / pLen) * clamped, z: (this.padMove.z / pLen) * clamped };
    }
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    const len = Math.hypot(x, z);
    return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
  }

  setTouchMove(x, z) {
    this.touchMove.x = x;
    this.touchMove.z = z;
  }

  // Poll the first connected gamepad (standard mapping). Call once per frame.
  //   left stick → move · A attack · B/RT roll · X potion · Y/LB/RB → skills 1-3
  pollGamepad() {
    const pads = navigator.getGamepads?.() ?? [];
    const gp = [...pads].find((p) => p && p.connected);
    if (!gp) { this.padMove.x = 0; this.padMove.z = 0; return; }
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    this.padMove.x = dz(gp.axes[0] ?? 0);
    this.padMove.z = dz(gp.axes[1] ?? 0);
    const b = gp.buttons.map((x) => x.pressed);
    const edge = (i) => b[i] && !this.prevPad[i];
    if (edge(0)) this.triggerAttack();              // A
    if (edge(1) || edge(7)) this.triggerRoll();     // B or right trigger
    if (edge(2)) this.triggerKey('KeyQ');           // X → potion
    if (edge(3)) this.triggerKey(SKILL_KEYS[0]);    // Y → skill 1
    if (edge(4)) this.triggerKey(SKILL_KEYS[1]);    // LB → skill 2
    if (edge(5)) this.triggerKey(SKILL_KEYS[2]);    // RB → skill 3
    this.padStartEdge = edge(9);                    // Start → pause (read by main)
    this.prevPad = b;
  }

  consumeAttack() {
    if (performance.now() < this.attackBuffered) {
      this.attackBuffered = 0;
      return true;
    }
    return false;
  }

  consumeRoll() {
    if (performance.now() < this.rollBuffered) {
      this.rollBuffered = 0;
      return true;
    }
    return false;
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }

  // Lets HUD buttons inject the same inputs as keys (skill buttons are clickable).
  triggerAttack() {
    this.attackBuffered = performance.now() + 250;
  }

  triggerRoll() {
    this.rollBuffered = performance.now() + 200;
  }

  triggerKey(code) {
    this.pressed.add(code);
  }
}
