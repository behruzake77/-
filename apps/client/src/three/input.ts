import * as THREE from "three";

export interface InputState {
  move: THREE.Vector2; // x: strafe, y: forward (−1..1)
  run: boolean;
  interact: boolean;
  cameraDelta: THREE.Vector2;
  pointerDown: boolean;
}

export function createInput(target: HTMLElement): { state: InputState; dispose: () => void } {
  const state: InputState = {
    move: new THREE.Vector2(0, 0),
    run: false,
    interact: false,
    cameraDelta: new THREE.Vector2(0, 0),
    pointerDown: false,
  };

  const keys = new Set<string>();
  const keyMap = (k: string) => k.toLowerCase();

  const onKeyDown = (e: KeyboardEvent) => {
    const k = keyMap(e.key);
    keys.add(k);
    if (k === "e" || k === "enter" || k === " ") state.interact = true;
    updateMove();
    if (k === "shift") state.run = true;
    // prevent scroll on space/arrows when canvas focused
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      // only if target is focused/hovered; we always have canvas covering app
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const k = keyMap(e.key);
    keys.delete(k);
    if (k === "shift") state.run = false;
    updateMove();
  };
  function updateMove() {
    let x = 0, y = 0;
    if (keys.has("w") || keys.has("arrowup")) y += 1;
    if (keys.has("s") || keys.has("arrowdown")) y -= 1;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    state.move.set(x, y);
    if (state.move.lengthSq() > 1) state.move.normalize();
  }

  // mouse drag for camera
  let dragging = false;
  let lastX = 0, lastY = 0;
  const onPointerDown = (e: PointerEvent) => {
    // right half drags camera, left half reserved for joystick? but we treat any drag on right 60% as camera
    const rect = target.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    if (nx > 0.42 || e.button === 2) {
      dragging = true;
      state.pointerDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    state.cameraDelta.x += dx;
    state.cameraDelta.y += dy;
    e.preventDefault();
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    state.pointerDown = false;
    try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
  };
  const onWheel = (e: WheelEvent) => {
    // zoom handled by camera system via delta
    // we map wheel to cameraDelta y for dolly? handled separately
    e.preventDefault();
  };

  // touch joystick synthesis: single touch on left area moves character
  let touchId: number | null = null;
  let touchOrigin = new THREE.Vector2();
  const JOY_STICK_RADIUS = 56;
  const onTouchStart = (e: TouchEvent) => {
    for (const t of Array.from(e.touches)) {
      const rect = target.getBoundingClientRect();
      const nx = (t.clientX - rect.left) / rect.width;
      if (nx < 0.42) {
        touchId = t.identifier;
        touchOrigin.set(t.clientX, t.clientY);
        e.preventDefault();
        break;
      }
    }
  };
  const onTouchMove = (e: TouchEvent) => {
    if (touchId === null) return;
    const t = Array.from(e.touches).find((x) => x.identifier === touchId);
    if (!t) return;
    const dx = t.clientX - touchOrigin.x;
    const dy = t.clientY - touchOrigin.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, JOY_STICK_RADIUS);
    const ang = Math.atan2(dy, dx);
    let mx = (Math.cos(ang) * clamped) / JOY_STICK_RADIUS;
    let my = -(Math.sin(ang) * clamped) / JOY_STICK_RADIUS;
    // joystick y→forward, x→strafe
    state.move.set(mx, my);
    if (state.move.lengthSq() > 1) state.move.normalize();
    e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchId === null) return;
    const still = Array.from(e.touches).some((t) => t.identifier === touchId);
    if (!still) {
      touchId = null;
      // restore keyboard move if any
      updateMove();
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  target.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  target.addEventListener("touchstart", onTouchStart, { passive: false });
  target.addEventListener("touchmove", onTouchMove, { passive: false });
  target.addEventListener("touchend", onTouchEnd);
  target.addEventListener("touchcancel", onTouchEnd);
  target.addEventListener("wheel", onWheel, { passive: false });
  // prevent context menu
  const onCtx = (e: MouseEvent) => e.preventDefault();
  target.addEventListener("contextmenu", onCtx);

  return {
    state,
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
      target.removeEventListener("touchcancel", onTouchEnd);
      target.removeEventListener("wheel", onWheel);
      target.removeEventListener("contextmenu", onCtx);
    },
  };
}
