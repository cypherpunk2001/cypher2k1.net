/**
 * Math utilities for Shijima
 */

export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  add(other) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other) {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  mul(scalar) {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  div(scalar) {
    return new Vec2(this.x / scalar, this.y / scalar);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return this.div(len);
  }

  static fromObject(obj) {
    if (!obj) return new Vec2(0, 0);
    return new Vec2(obj.x || 0, obj.y || 0);
  }
}

export class Rect {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get top() { return this.y; }
  get bottom() { return this.y + this.height; }

  contains(point) {
    return point.x >= this.left && point.x <= this.right &&
           point.y >= this.top && point.y <= this.bottom;
  }

  clone() {
    return new Rect(this.x, this.y, this.width, this.height);
  }
}

export class Border {
  constructor(start, end, isVertical) {
    this.start = start;
    this.end = end;
    this.isVertical = isVertical;
  }

  isOn(point, threshold = 1) {
    if (this.isVertical) {
      return Math.abs(point.x - this.start.x) <= threshold &&
             point.y >= this.start.y && point.y <= this.end.y;
    } else {
      return Math.abs(point.y - this.start.y) <= threshold &&
             point.x >= this.start.x && point.x <= this.end.x;
    }
  }

  getValue() {
    return this.isVertical ? this.start.x : this.start.y;
  }
}
