// Keyboard and mouse input: a held-key set, edge-triggered actions, and the
// mouse position in canvas pixels. The game reads this once per frame.

export const ACTION_CONFIRM = 1 << 0;
export const ACTION_PAUSE = 1 << 1;
export const ACTION_ENTER = 1 << 2;
export const ACTION_HORN = 1 << 3;
export const ACTION_RUN = 1 << 4;
export const ACTION_INTERACT = 1 << 5;
export const ACTION_MUTE = 1 << 6;
export const ACTION_RESTART = 1 << 7;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  function keyName(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!keys.has(keyName(e))) pressed.add(keyName(e));
    keys.add(keyName(e));
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouseDown = true;
      mouseClicked = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function held(code) {
    return keys.has(code);
  }

  return {
    // Movement axes: -1..1, from WASD or arrows.
    moveX() {
      let x = 0;
      if (held('KeyA') || held('ArrowLeft')) x -= 1;
      if (held('KeyD') || held('ArrowRight')) x += 1;
      return x;
    },
    moveY() {
      let y = 0;
      if (held('KeyW') || held('ArrowUp')) y -= 1;
      if (held('KeyS') || held('ArrowDown')) y += 1;
      return y;
    },
    get mouse() {
      return { x: mouseX, y: mouseY, down: mouseDown };
    },
    takeClick() {
      const c = mouseClicked;
      mouseClicked = false;
      return c;
    },
    // Edge-triggered actions, consumed once per frame.
    takeActions() {
      let actions = 0;
      const was = (code) => {
        if (pressed.has(code)) { pressed.delete(code); return true; }
        return false;
      };
      if (was('Space') || was('Enter')) actions |= ACTION_CONFIRM;
      if (was('Escape') || was('KeyP')) actions |= ACTION_PAUSE;
      if (was('KeyE')) actions |= ACTION_ENTER;
      if (was('KeyH')) actions |= ACTION_HORN;
      if (was('KeyM')) actions |= ACTION_MUTE;
      if (was('KeyR')) actions |= ACTION_RESTART;
      if (was('KeyF')) actions |= ACTION_INTERACT;
      if (held('ShiftLeft') || held('ShiftRight')) actions |= ACTION_RUN;
      pressed.clear();
      return actions;
    },
    clear() {
      keys.clear();
      pressed.clear();
    },
  };
}
