// ===========================================================
// input.js — keyboard, mouse-look (pointer lock), edge detection
// ===========================================================

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();        // codes currently held
    this.pressedThisFrame = new Set();
    this.releasedThisFrame = new Set();
    this.mouseDX = 0;             // accumulated, consumed each frame
    this.mouseDY = 0;
    this.locked = false;
    this.sensitivity = 0.0022;
    this.sensScale = 1;
    this.invertY = false;
    this.enabled = false;         // gameplay input only active while true
    this._onLockChange = null;

    addEventListener("keydown", (e) => {
      // Avoid the page scrolling on space / arrows
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (!this.down.has(e.code)) this.pressedThisFrame.add(e.code);
      this.down.add(e.code);
    });
    addEventListener("keyup", (e) => {
      this.down.delete(e.code);
      this.releasedThisFrame.add(e.code);
    });

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this._onLockChange) this._onLockChange(this.locked);
    });

    addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });

    // Lose focus -> drop all keys so player doesn't "stick"
    addEventListener("blur", () => this.down.clear());
  }

  requestLock() {
    if (!this.locked && this.canvas.requestPointerLock) {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    }
  }
  exitLock() { if (document.exitPointerLock) document.exitPointerLock(); }
  onLockChange(cb) { this._onLockChange = cb; }

  held(code) { return this.down.has(code); }
  pressed(code) { return this.pressedThisFrame.has(code); }
  released(code) { return this.releasedThisFrame.has(code); }

  // Movement axes from WASD (camera-relative resolved elsewhere)
  moveAxis() {
    let x = 0, z = 0;
    if (this.down.has("KeyW") || this.down.has("ArrowUp")) z -= 1;
    if (this.down.has("KeyS") || this.down.has("ArrowDown")) z += 1;
    if (this.down.has("KeyA") || this.down.has("ArrowLeft")) x -= 1;
    if (this.down.has("KeyD") || this.down.has("ArrowRight")) x += 1;
    return { x, z };
  }

  // Consume accumulated mouse delta (returns radians of yaw/pitch change)
  consumeLook() {
    const k = this.sensitivity * this.sensScale;
    const dx = this.mouseDX * k;
    const dy = this.mouseDY * k * (this.invertY ? -1 : 1);
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  // Called at end of each game frame to clear edge sets
  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}
