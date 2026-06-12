// Touch controls for mobile: a dynamic floating joystick on the left half of
// the screen feeds the Input move vector; the right-side action buttons use
// hold-to-repeat. Pointer events unify mouse/touch, but we gate the joystick
// to the touch/left zone so it never fights the desktop mouse-aim.

const JOY_RADIUS = 58; // px travel for full tilt

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.joyPointerId = null;
    this.joyOrigin = { x: 0, y: 0 };

    this.base = document.getElementById('joystick');
    this.knob = document.getElementById('joystick-knob');
    this.zone = document.getElementById('touch-move-zone');

    // The whole left zone is the joystick surface; the visible ring repositions
    // to wherever the finger lands (classic mobile floating stick).
    this.zone.addEventListener('pointerdown', (e) => this.onDown(e), { passive: false });
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));

    this.wireHoldButton('btn-attack', () => this.input.triggerAttack(), 230);
    this.wireHoldButton('btn-whirl', () => this.input.triggerKey('KeyK'), 9999);
    this.wireHoldButton('btn-slam', () => this.input.triggerKey('KeyL'), 9999);
    this.wireHoldButton('btn-roll', () => this.input.triggerRoll(), 9999);
    this.wireHoldButton('btn-potion', () => this.input.triggerKey('KeyQ'), 9999);
  }

  onDown(e) {
    if (this.joyPointerId !== null) return;
    e.preventDefault();
    this.joyPointerId = e.pointerId;
    this.joyOrigin = { x: e.clientX, y: e.clientY };
    this.base.style.left = `${e.clientX}px`;
    this.base.style.bottom = 'auto';
    this.base.style.top = `${e.clientY}px`;
    this.base.classList.add('active');
    this.moveKnob(0, 0);
  }

  onMove(e) {
    if (e.pointerId !== this.joyPointerId) return;
    e.preventDefault();
    let dx = e.clientX - this.joyOrigin.x;
    let dy = e.clientY - this.joyOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS;
      dy = (dy / len) * JOY_RADIUS;
    }
    this.moveKnob(dx, dy);
    // map screen XY → world XZ (screen down/+y == world +z, matching camera)
    this.input.setTouchMove(dx / JOY_RADIUS, dy / JOY_RADIUS);
  }

  onUp(e) {
    if (e.pointerId !== this.joyPointerId) return;
    this.joyPointerId = null;
    this.base.classList.remove('active');
    this.moveKnob(0, 0);
    this.input.setTouchMove(0, 0);
  }

  moveKnob(dx, dy) {
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  // Tap fires once; holding re-fires every `repeatMs` (set huge to disable repeat).
  wireHoldButton(id, fire, repeatMs) {
    const el = document.getElementById(id);
    if (!el) return;
    let timer = null;
    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('pressed');
      fire();
      if (repeatMs < 5000) timer = setInterval(fire, repeatMs);
    };
    const stop = () => {
      el.classList.remove('pressed');
      if (timer) { clearInterval(timer); timer = null; }
    };
    el.addEventListener('pointerdown', start, { passive: false });
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', stop);
  }
}
