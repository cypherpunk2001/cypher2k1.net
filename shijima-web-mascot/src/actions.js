/**
 * Action implementations for Shijima mascots
 */

import { Vec2 } from './math.js';

// Subtick count for smooth animation
const SUBTICK_COUNT = 4;

/**
 * Base Action class
 */
export class Action {
  constructor(mascot, actionDef) {
    this.mascot = mascot;
    this.def = actionDef;
    this.time = 0;
    this.animationIndex = 0;
    this.finished = false;
  }

  /**
   * Get the active animation based on conditions
   */
  getAnimation() {
    const animations = this.def.animations || [];
    for (let i = 0; i < animations.length; i++) {
      const anim = animations[i];
      if (this.mascot.evalCondition(anim.condition)) {
        if (this.animationIndex !== i) {
          this.animationIndex = i;
          this.time = 0;  // Reset time when animation changes
        }
        return anim;
      }
    }
    return animations[0] || null;
  }

  /**
   * Get the current pose from the animation
   */
  getCurrentPose() {
    const anim = this.getAnimation();
    if (!anim || anim.poses.length === 0) return null;

    const totalDuration = anim.totalDuration;
    if (totalDuration === 0) return anim.poses[0];

    let frameTime = this.time % totalDuration;
    for (const pose of anim.poses) {
      frameTime -= pose.duration;
      if (frameTime < 0) return pose;
    }
    return anim.poses[anim.poses.length - 1];
  }

  /**
   * Initialize the action
   */
  init() {
    this.time = 0;
    this.finished = false;
  }

  /**
   * Called each tick
   */
  tick() {
    this.time++;
    return !this.finished;
  }

  /**
   * Called each subtick for interpolation
   */
  subtick(index) {
    if (index === 0) {
      return this.tick();
    }
    return true;
  }

  /**
   * Whether this action needs interpolation
   */
  needsInterpolation() {
    return false;
  }
}

/**
 * Stay - mascot stays in place, plays animation
 */
export class StayAction extends Action {
  init() {
    super.init();
    // Duration can be an expression
    this.duration = this.mascot.evalVariable(this.def.duration) || 0;
  }

  tick() {
    super.tick();

    // Check border type - if we've left the border, finish early
    if (this.def.borderType) {
      if (!this.checkBorder()) {
        this.finished = true;
        this.mascot.queueBehavior('Fall');
        return false;
      }
    }

    // If duration is set, check if we've exceeded it
    if (this.duration > 0) {
      if (this.time >= this.duration) {
        this.finished = true;
      }
    } else if (this.def.animations && this.def.animations.length > 0) {
      // Single animation cycle
      const anim = this.getAnimation();
      if (anim && this.time >= anim.totalDuration) {
        this.finished = true;
      }
    }

    return !this.finished;
  }

  checkBorder() {
    const env = this.mascot.env;
    const borderType = this.def.borderType;

    if (borderType === 'Floor') {
      return env.isOnFloor(this.mascot.anchor);
    } else if (borderType === 'Ceiling') {
      return env.isOnCeiling(this.mascot.anchor);
    } else if (borderType === 'Wall') {
      return env.isOnWall(this.mascot.anchor, this.mascot.lookingRight);
    }
    return true;
  }
}

/**
 * Animate - plays animation without movement
 */
export class AnimateAction extends StayAction {
  // Same as Stay for our purposes
}

/**
 * Move - mascot moves while playing animation
 */
export class MoveAction extends Action {
  init() {
    super.init();
    this.targetX = this.mascot.evalVariable(this.def.targetX);
    this.targetY = this.mascot.evalVariable(this.def.targetY);
    this.hasTarget = this.def.targetX !== null || this.def.targetY !== null;
  }

  tick() {
    super.tick();

    const pose = this.getCurrentPose();
    if (!pose) {
      this.finished = true;
      return false;
    }

    // Get velocity from pose, flip X if looking left
    let vx = pose.velocity.x;
    let vy = pose.velocity.y;

    if (!this.mascot.lookingRight) {
      vx = -vx;
    }

    // Move the mascot
    this.mascot.anchor.x += vx;
    this.mascot.anchor.y += vy;

    // Check if we've reached target
    if (this.hasTarget) {
      const reachedX = this.targetX === null ||
        (vx >= 0 && this.mascot.anchor.x >= this.targetX) ||
        (vx < 0 && this.mascot.anchor.x <= this.targetX);
      const reachedY = this.targetY === null ||
        (vy >= 0 && this.mascot.anchor.y >= this.targetY) ||
        (vy < 0 && this.mascot.anchor.y <= this.targetY);

      if (reachedX && reachedY) {
        this.finished = true;
      }
    }

    // Check boundaries based on border type
    this.checkBorders();

    return !this.finished;
  }

  checkBorders() {
    const env = this.mascot.env;
    const borderType = this.def.borderType;

    if (borderType === 'Floor' && !env.isOnFloor(this.mascot.anchor)) {
      this.finished = true;
      this.mascot.queueBehavior('Fall');
    } else if (borderType === 'Ceiling' && !env.isOnCeiling(this.mascot.anchor)) {
      this.finished = true;
      this.mascot.queueBehavior('Fall');
    } else if (borderType === 'Wall' && !env.isOnWall(this.mascot.anchor, this.mascot.lookingRight)) {
      this.finished = true;
      this.mascot.queueBehavior('Fall');
    }
  }

  needsInterpolation() {
    return true;
  }
}

/**
 * Fall - physics-based falling
 */
export class FallAction extends Action {
  init() {
    super.init();
    // Evaluate initial velocity (may be expressions)
    const vx = this.mascot.evalVariable(this.def.initialVX) || 0;
    const vy = this.mascot.evalVariable(this.def.initialVY) || 0;
    this.velocity = new Vec2(vx, vy);
    this.gravity = this.def.gravity ?? 2;
    this.resistanceX = this.def.resistanceX ?? 0.05;
    this.resistanceY = this.def.resistanceY ?? 0.1;
  }

  tick() {
    super.tick();

    const env = this.mascot.env;

    // Apply air resistance
    this.velocity.x -= this.velocity.x * this.resistanceX;
    this.velocity.y += this.gravity - this.velocity.y * this.resistanceY;

    // Store previous position for collision detection
    const prevAnchor = this.mascot.anchor.clone();

    // Apply velocity
    this.mascot.anchor.x += this.velocity.x;
    this.mascot.anchor.y += this.velocity.y;

    // Check boundaries and handle collisions
    const workArea = env.workArea;

    // Floor collision - check first as it's the normal landing
    if (this.mascot.anchor.y >= workArea.bottom) {
      this.mascot.anchor.y = workArea.bottom;
      this.velocity.y = 0;
      this.finished = true;
      return false;
    }

    // Ceiling collision
    if (this.mascot.anchor.y <= workArea.top) {
      this.mascot.anchor.y = workArea.top;
      this.velocity.y = Math.abs(this.velocity.y) * 0.5;  // Bounce down
    }

    // Wall collisions
    if (this.mascot.anchor.x <= workArea.left) {
      this.mascot.anchor.x = workArea.left;
      this.velocity.x = Math.abs(this.velocity.x) * 0.5;  // Bounce right
      this.mascot.lookingRight = true;
    } else if (this.mascot.anchor.x >= workArea.right) {
      this.mascot.anchor.x = workArea.right;
      this.velocity.x = -Math.abs(this.velocity.x) * 0.5;  // Bounce left
      this.mascot.lookingRight = false;
    }

    return !this.finished;
  }

  needsInterpolation() {
    return false;  // Fall uses its own physics
  }
}

/**
 * Jump - parabolic jump to target
 */
export class JumpAction extends Action {
  init() {
    super.init();
    this.targetX = this.mascot.evalVariable(this.def.targetX) ?? this.mascot.anchor.x;
    this.targetY = this.mascot.evalVariable(this.def.targetY) ?? this.mascot.anchor.y;
    this.velocity = this.def.velocity || 20;

    // Calculate initial velocity for parabolic trajectory
    const dx = this.targetX - this.mascot.anchor.x;
    const dy = this.targetY - this.mascot.anchor.y;

    // Parabolic jump: y offset includes height based on distance
    const distance = new Vec2(dx, dy - Math.abs(dx));
    const len = distance.length();

    if (len > 0) {
      this.velVec = distance.normalize().mul(this.velocity);
    } else {
      this.velVec = new Vec2(0, -this.velocity);
    }
  }

  tick() {
    super.tick();

    // Move towards target with parabolic curve
    this.mascot.anchor.x += this.velVec.x;
    this.mascot.anchor.y += this.velVec.y;

    // Check if we've reached/passed target
    const dx = this.targetX - this.mascot.anchor.x;
    const dy = this.targetY - this.mascot.anchor.y;

    const reachedX = (this.velVec.x >= 0 && dx <= 0) || (this.velVec.x < 0 && dx >= 0) || Math.abs(dx) < 5;
    const reachedY = (this.velVec.y >= 0 && dy <= 0) || (this.velVec.y < 0 && dy >= 0) || Math.abs(dy) < 5;

    if (reachedX && reachedY) {
      this.mascot.anchor.x = this.targetX;
      this.mascot.anchor.y = this.targetY;
      this.finished = true;
    }

    return !this.finished;
  }

  needsInterpolation() {
    return true;
  }
}

/**
 * Dragged - follows cursor when being dragged
 */
export class DraggedAction extends Action {
  init() {
    super.init();
    this.offsetX = 0;
    this.offsetY = 0;
    this.velocityBuffer = [];
    this.bufferSize = 5;
  }

  tick() {
    super.tick();

    // Follow cursor
    const cursor = this.mascot.env.cursor;
    this.mascot.anchor.x = cursor.x + this.offsetX;
    this.mascot.anchor.y = cursor.y + this.offsetY;

    // Track velocity for throw
    this.velocityBuffer.push(this.mascot.env.cursorDelta.clone());
    if (this.velocityBuffer.length > this.bufferSize) {
      this.velocityBuffer.shift();
    }

    // Face cursor direction
    if (this.mascot.env.cursorDelta.x > 1) {
      this.mascot.lookingRight = true;
    } else if (this.mascot.env.cursorDelta.x < -1) {
      this.mascot.lookingRight = false;
    }

    return true;  // Dragged never finishes on its own
  }

  getAverageVelocity() {
    if (this.velocityBuffer.length === 0) return new Vec2(0, 0);

    let sumX = 0, sumY = 0;
    for (const v of this.velocityBuffer) {
      sumX += v.x;
      sumY += v.y;
    }
    return new Vec2(
      sumX / this.velocityBuffer.length,
      sumY / this.velocityBuffer.length
    );
  }
}

/**
 * Look - change facing direction
 */
export class LookAction extends Action {
  init() {
    super.init();
    const lookRight = this.mascot.evalVariable(this.def.targetX);
    if (lookRight !== null) {
      this.mascot.lookingRight = lookRight > this.mascot.anchor.x;
    }
    this.finished = true;  // Instant action
  }

  tick() {
    return false;  // Instant
  }
}

/**
 * Turn - turn to face opposite direction
 */
export class TurnAction extends Action {
  init() {
    super.init();
  }

  tick() {
    super.tick();

    const anim = this.getAnimation();
    if (anim && this.time >= anim.totalDuration) {
      this.mascot.lookingRight = !this.mascot.lookingRight;
      this.finished = true;
    }

    return !this.finished;
  }
}

/**
 * Offset - instantly move by offset
 */
export class OffsetAction extends Action {
  init() {
    super.init();
    const ox = this.mascot.evalVariable(this.def.targetX) || 0;
    const oy = this.mascot.evalVariable(this.def.targetY) || 0;

    if (!this.mascot.lookingRight) {
      this.mascot.anchor.x -= ox;
    } else {
      this.mascot.anchor.x += ox;
    }
    this.mascot.anchor.y += oy;

    this.finished = true;
  }

  tick() {
    return false;
  }
}

/**
 * Sequence - execute child actions in order
 */
export class SequenceAction extends Action {
  init() {
    super.init();
    this.childIndex = 0;
    this.currentChild = null;
    this.initCurrentChild();
  }

  initCurrentChild() {
    const children = this.def.children || [];
    if (this.childIndex >= children.length) {
      this.finished = true;
      return;
    }

    let childDef = children[this.childIndex];
    let overrides = {};

    // Resolve references and capture overrides
    if (childDef.type === 'reference') {
      // Store overrides from the reference
      overrides = {
        duration: childDef.duration,
        targetX: childDef.targetX,
        targetY: childDef.targetY,
        initialVX: childDef.initialVX,
        initialVY: childDef.initialVY,
        x: childDef.x,
        y: childDef.y,
      };
      // Remove undefined overrides
      Object.keys(overrides).forEach(k => overrides[k] === undefined && delete overrides[k]);

      childDef = this.mascot.getAction(childDef.name);
    }

    if (childDef) {
      // Merge overrides with the action definition
      const mergedDef = { ...childDef, ...overrides };
      this.currentChild = createAction(this.mascot, mergedDef);
      this.currentChild.init();
    } else {
      this.childIndex++;
      this.initCurrentChild();
    }
  }

  tick() {
    if (this.finished) return false;

    if (this.currentChild) {
      const continuing = this.currentChild.tick();
      if (!continuing || this.currentChild.finished) {
        this.childIndex++;
        this.initCurrentChild();
      }
    }

    return !this.finished;
  }

  subtick(index) {
    if (this.currentChild && this.currentChild.needsInterpolation()) {
      return this.currentChild.subtick(index);
    }
    return super.subtick(index);
  }

  getCurrentPose() {
    if (this.currentChild) {
      return this.currentChild.getCurrentPose();
    }
    return super.getCurrentPose();
  }

  needsInterpolation() {
    return this.currentChild ? this.currentChild.needsInterpolation() : false;
  }
}

/**
 * Select - choose one child action based on conditions
 */
export class SelectAction extends Action {
  init() {
    super.init();
    this.selectedChild = null;

    const children = this.def.children || [];
    for (let child of children) {
      let childDef = child;
      let overrides = {};
      let refCondition = 'true';

      // Resolve references and capture overrides
      if (child.type === 'reference') {
        refCondition = child.condition || 'true';
        overrides = {
          duration: child.duration,
          targetX: child.targetX,
          targetY: child.targetY,
          initialVX: child.initialVX,
          initialVY: child.initialVY,
        };
        Object.keys(overrides).forEach(k => overrides[k] === undefined && delete overrides[k]);
        childDef = this.mascot.getAction(child.name);
      }

      // Check condition (use reference condition if available, then action condition)
      const condition = refCondition !== 'true' ? refCondition : (childDef?.condition || 'true');

      if (childDef && this.mascot.evalCondition(condition)) {
        const mergedDef = { ...childDef, ...overrides };
        this.selectedChild = createAction(this.mascot, mergedDef);
        this.selectedChild.init();
        break;
      }
    }

    if (!this.selectedChild) {
      this.finished = true;
    }
  }

  tick() {
    if (this.selectedChild) {
      const continuing = this.selectedChild.tick();
      if (!continuing || this.selectedChild.finished) {
        this.finished = true;
      }
    }
    return !this.finished;
  }

  subtick(index) {
    if (this.selectedChild) {
      return this.selectedChild.subtick(index);
    }
    return super.subtick(index);
  }

  getCurrentPose() {
    if (this.selectedChild) {
      return this.selectedChild.getCurrentPose();
    }
    return super.getCurrentPose();
  }

  needsInterpolation() {
    return this.selectedChild ? this.selectedChild.needsInterpolation() : false;
  }
}

/**
 * SelfDestruct - remove the mascot
 */
export class SelfDestructAction extends Action {
  init() {
    super.init();
  }

  tick() {
    super.tick();

    const anim = this.getAnimation();
    if (!anim || this.time >= anim.totalDuration) {
      this.mascot.destroy();
      this.finished = true;
    }

    return !this.finished;
  }
}

/**
 * Breed - spawn a new mascot
 */
export class BreedAction extends Action {
  init() {
    super.init();
    this.bred = false;
  }

  tick() {
    super.tick();

    const anim = this.getAnimation();
    if (anim && this.time >= anim.totalDuration / 2 && !this.bred) {
      this.bred = true;
      // Spawn new mascot
      const bornX = this.mascot.anchor.x + (this.def.bornX || 0);
      const bornY = this.mascot.anchor.y + (this.def.bornY || 0);
      const bornBehavior = this.def.bornBehavior || 'Fall';

      if (this.mascot.manager && this.mascot.manager.onBreed) {
        this.mascot.manager.onBreed(this.mascot, {
          x: bornX,
          y: bornY,
          behavior: bornBehavior,
          mascotName: this.def.bornMascot,
          transient: this.def.bornTransient,
        });
      }
    }

    if (!anim || this.time >= anim.totalDuration) {
      this.finished = true;
    }

    return !this.finished;
  }
}

/**
 * Get embedded action type from class name
 */
function getEmbeddedType(className) {
  if (!className) return null;
  // Extract class name from full path like "com.group_finity.mascot.action.Fall"
  const parts = className.split('.');
  return parts[parts.length - 1];
}

/**
 * Create an action instance from a definition
 */
export function createAction(mascot, actionDef) {
  if (!actionDef) return null;

  let type = actionDef.type;

  // For Embedded type, check the Class attribute
  if (type === 'Embedded' && actionDef.className) {
    const embeddedType = getEmbeddedType(actionDef.className);
    if (embeddedType) {
      type = embeddedType;
    }
  }

  switch (type) {
    case 'Stay':
      return new StayAction(mascot, actionDef);
    case 'Animate':
      return new AnimateAction(mascot, actionDef);
    case 'Move':
      return new MoveAction(mascot, actionDef);
    case 'Fall':
      return new FallAction(mascot, actionDef);
    case 'Jump':
      return new JumpAction(mascot, actionDef);
    case 'Dragged':
      return new DraggedAction(mascot, actionDef);
    case 'Look':
      return new LookAction(mascot, actionDef);
    case 'Turn':
      return new TurnAction(mascot, actionDef);
    case 'Offset':
      return new OffsetAction(mascot, actionDef);
    case 'Sequence':
      return new SequenceAction(mascot, actionDef);
    case 'Select':
      return new SelectAction(mascot, actionDef);
    case 'SelfDestruct':
      return new SelfDestructAction(mascot, actionDef);
    case 'Breed':
      return new BreedAction(mascot, actionDef);
    case 'Resist':
      return new StayAction(mascot, actionDef);  // Resist is like stay with animation
    case 'Embedded':
      // Fallback for unknown embedded types - check name
      if (actionDef.name?.includes('Fall') || actionDef.name === 'Falling') {
        return new FallAction(mascot, actionDef);
      }
      if (actionDef.name?.includes('Drag') || actionDef.name === 'Pinched') {
        return new DraggedAction(mascot, actionDef);
      }
      if (actionDef.name?.includes('Breed') || actionDef.name?.includes('Divide')) {
        return new BreedAction(mascot, actionDef);
      }
      return new StayAction(mascot, actionDef);
    default:
      // Default to Stay for unknown types
      return new StayAction(mascot, actionDef);
  }
}
