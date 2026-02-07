/**
 * Environment - represents the screen/container boundaries
 */

import { Vec2, Rect, Border } from './math.js';

export class Environment {
  constructor(container) {
    this.container = container;
    this.cursor = new Vec2(0, 0);
    this.cursorDelta = new Vec2(0, 0);
    this._lastCursor = new Vec2(0, 0);
    this.scale = 1.0;

    // Track cursor movement
    this._setupCursorTracking();
    this._updateBounds();

    // Update bounds on resize
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._updateBounds());
      this._resizeObserver.observe(container);
    }
    window.addEventListener('resize', () => this._updateBounds());
  }

  _setupCursorTracking() {
    const target = this.container === document.body ? document : this.container;
    target.addEventListener('mousemove', (e) => {
      // Use viewport coordinates directly since mascot layer is position: fixed
      const newX = e.clientX;
      const newY = e.clientY;

      this.cursorDelta.x = newX - this.cursor.x;
      this.cursorDelta.y = newY - this.cursor.y;
      this.cursor.x = newX;
      this.cursor.y = newY;
    });
  }

  _updateBounds() {
    const rect = this.container.getBoundingClientRect();

    // Margin to keep mascot sprite fully visible (half sprite width)
    const margin = 64;

    // For document.body, use viewport dimensions
    if (this.container === document.body) {
      this.workArea = new Rect(margin, 0, window.innerWidth - margin * 2, window.innerHeight);
    } else {
      this.workArea = new Rect(margin, 0, rect.width - margin * 2, rect.height);
    }

    // Create borders
    this.floor = new Border(
      new Vec2(this.workArea.left, this.workArea.bottom),
      new Vec2(this.workArea.right, this.workArea.bottom),
      false
    );

    this.ceiling = new Border(
      new Vec2(this.workArea.left, this.workArea.top),
      new Vec2(this.workArea.right, this.workArea.top),
      false
    );

    this.leftWall = new Border(
      new Vec2(this.workArea.left, this.workArea.top),
      new Vec2(this.workArea.left, this.workArea.bottom),
      true
    );

    this.rightWall = new Border(
      new Vec2(this.workArea.right, this.workArea.top),
      new Vec2(this.workArea.right, this.workArea.bottom),
      true
    );
  }

  // Check if point is on floor
  isOnFloor(point, threshold = 2) {
    return point.y >= this.workArea.bottom - threshold;
  }

  // Check if point is on ceiling
  isOnCeiling(point, threshold = 2) {
    return point.y <= this.workArea.top + threshold;
  }

  // Check if point is on left wall
  isOnLeftWall(point, threshold = 2) {
    return point.x <= this.workArea.left + threshold;
  }

  // Check if point is on right wall
  isOnRightWall(point, threshold = 2) {
    return point.x >= this.workArea.right - threshold;
  }

  // Check if point is on any wall (based on looking direction)
  isOnWall(point, lookingRight, threshold = 2) {
    return lookingRight ? this.isOnRightWall(point, threshold) : this.isOnLeftWall(point, threshold);
  }

  // Clamp position to work area
  clamp(position) {
    const x = Math.max(this.workArea.left, Math.min(this.workArea.right, position.x));
    const y = Math.max(this.workArea.top, Math.min(this.workArea.bottom, position.y));
    return new Vec2(x, y);
  }

  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }
}
