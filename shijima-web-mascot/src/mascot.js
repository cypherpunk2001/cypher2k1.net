/**
 * Mascot - represents a single mascot instance
 */

import { Vec2 } from './math.js';
import { createAction, DraggedAction, FallAction } from './actions.js';
import { showContextMenu } from './contextmenu.js';

/**
 * Mascot class - manages a single mascot's state and behavior
 */
export class Mascot {
  constructor(manager, data, options = {}) {
    this.manager = manager;
    this.data = data;
    this.env = manager.env;

    // State
    this.anchor = new Vec2(options.x ?? 100, options.y ?? 100);
    this.lookingRight = options.lookingRight ?? true;
    this.time = 0;
    this.destroyed = false;

    // Behavior state
    this.currentBehavior = null;
    this.currentAction = null;
    this.queuedBehavior = null;

    // Behavior history for oscillation detection
    this._behaviorHistory = [];
    this._behaviorHistoryMaxSize = 10;
    this._lastBehaviorChangeTime = 0;
    this._minBehaviorDuration = 5;  // Minimum ticks before allowing behavior change

    // Dragging state
    this.dragging = false;
    this.dragOffset = new Vec2(0, 0);
    this.dragAction = null;

    // DOM element
    this.element = null;
    this.imageElement = null;

    // Asset cache
    this.imageCache = new Map();

    // Create DOM element
    this._createElements();

    // Start with initial behavior
    const startBehavior = options.behavior || 'Fall';
    this.setBehavior(startBehavior);
  }

  _createElements() {
    // Container element
    this.element = document.createElement('div');
    this.element.className = 'shijima-mascot';
    this.element.style.cssText = `
      position: absolute;
      pointer-events: auto;
      cursor: grab;
      user-select: none;
      -webkit-user-drag: none;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    `;

    // Image element
    this.imageElement = document.createElement('img');
    this.imageElement.style.cssText = `
      display: block;
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
    `;
    this.imageElement.draggable = false;
    this.element.appendChild(this.imageElement);

    // Event listeners
    this.element.addEventListener('mousedown', this._onMouseDown.bind(this));
    this.element.addEventListener('contextmenu', this._onContextMenu.bind(this));

    // Global mouse events for dragging
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
  }

  _onMouseDown(e) {
    if (e.button === 0) {  // Left click
      e.preventDefault();
      this.startDrag(e);
    }
  }

  _onMouseMove(e) {
    if (this.dragging) {
      // Update cursor position in environment
      // Use viewport coordinates directly since mascot layer is position: fixed
      const newX = e.clientX;
      const newY = e.clientY;

      // Track velocity for throwing
      const now = performance.now();
      const dt = now - this._lastDragTime;
      if (dt > 0) {
        const vx = (newX - this._lastDragPos.x) / dt * 16; // Normalize to ~60fps
        const vy = (newY - this._lastDragPos.y) / dt * 16;

        this._dragVelocityBuffer.push({ x: vx, y: vy, t: now });

        // Keep only last 100ms of samples
        const cutoff = now - 100;
        this._dragVelocityBuffer = this._dragVelocityBuffer.filter(v => v.t > cutoff);
      }

      this._lastDragPos = { x: newX, y: newY };
      this._lastDragTime = now;

      this.env.cursor.x = newX;
      this.env.cursor.y = newY;
    }
  }

  _onMouseUp(e) {
    if (this.dragging && e.button === 0) {
      this.stopDrag();
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    // Show context menu
    showContextMenu(this, e.clientX, e.clientY);

    // Also call custom handler if provided
    if (this.manager && this.manager.onContextMenu) {
      this.manager.onContextMenu(this, e);
    }
  }

  startDrag(e) {
    this.dragging = true;
    this.element.style.cursor = 'grabbing';

    // Calculate offset from cursor to anchor
    // Use viewport coordinates directly since mascot layer is position: fixed
    const cursorX = e.clientX;
    const cursorY = e.clientY;
    this.dragOffset.x = this.anchor.x - cursorX;
    this.dragOffset.y = this.anchor.y - cursorY;

    // Initialize velocity tracking for throw
    this._dragVelocityBuffer = [];
    this._lastDragPos = { x: cursorX, y: cursorY };
    this._lastDragTime = performance.now();

    // Get or create dragged action
    const draggedBehavior = this.data.behaviors['Dragged'];
    if (draggedBehavior) {
      const actionDef = this.data.actions[draggedBehavior.action];
      if (actionDef) {
        this.dragAction = createAction(this, actionDef);
      }
    }

    if (!this.dragAction) {
      // Create default dragged action
      this.dragAction = new DraggedAction(this, {
        name: 'Dragged',
        type: 'Dragged',
        animations: this.currentAction?.def?.animations || [],
      });
    }

    this.dragAction.offsetX = this.dragOffset.x;
    this.dragAction.offsetY = this.dragOffset.y;
    this.dragAction.init();

    // Save current action to restore if needed
    this._savedAction = this.currentAction;
    this.currentAction = this.dragAction;

    // Add global listeners
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);
  }

  stopDrag() {
    this.dragging = false;
    this.element.style.cursor = 'grab';

    // Remove global listeners
    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);

    // Calculate throw velocity from our tracking buffer
    let throwVelocity = new Vec2(0, 0);
    const sampleCount = this._dragVelocityBuffer?.length || 0;
    if (this._dragVelocityBuffer && sampleCount > 0) {
      let sumX = 0, sumY = 0;
      for (const v of this._dragVelocityBuffer) {
        sumX += v.x;
        sumY += v.y;
      }
      throwVelocity.x = sumX / sampleCount;
      throwVelocity.y = sumY / sampleCount;
    }

    this.dragAction = null;
    this._dragVelocityBuffer = [];

    // Store throw velocity for use in expression evaluation
    this._throwVelocity = throwVelocity;

    console.log('Throw velocity:', throwVelocity.x.toFixed(2), throwVelocity.y.toFixed(2), 'samples:', sampleCount);

    // Check if we should use Thrown behavior
    const thrownBehavior = this.data.behaviors['Thrown'];
    const hasVelocity = Math.abs(throwVelocity.x) > 0.5 || Math.abs(throwVelocity.y) > 0.5;

    if (thrownBehavior && hasVelocity) {
      // Temporarily override cursor delta with throw velocity
      // so ${mascot.environment.cursor.dx/dy} picks it up
      this.env.cursorDelta.x = throwVelocity.x * 5;
      this.env.cursorDelta.y = throwVelocity.y * 5;
      console.log('Using Thrown behavior with velocity:', this.env.cursorDelta.x.toFixed(2), this.env.cursorDelta.y.toFixed(2));
      this.setBehavior('Thrown');
    } else {
      // Just fall
      console.log('Using Fall behavior (low velocity)');
      this.setBehavior('Fall');
    }
  }

  /**
   * Get an action definition by name
   */
  getAction(name) {
    return this.data.actions[name] || null;
  }

  /**
   * Evaluate a condition expression
   */
  evalCondition(condition) {
    if (!condition || condition === 'true') return true;
    if (condition === 'false') return false;

    // Replace all #{...} and ${...} wrappers with just the expression inside
    let expr = condition;
    // Handle #{expr} and ${expr} patterns - replace with just expr
    expr = expr.replace(/[#$]\{([^}]+)\}/g, '($1)');

    // If expression still starts with ${ or #{, strip it
    if (expr.startsWith('${') || expr.startsWith('#{')) {
      expr = expr.slice(2, -1);
    }

    try {
      // Create evaluation context
      const mascot = this;
      const env = this.env;

      // Build context object
      const ctx = {
        mascot: {
          anchor: { x: mascot.anchor.x, y: mascot.anchor.y },
          lookingRight: mascot.lookingRight,
          lookRight: mascot.lookingRight,  // Alias
          dragging: mascot.dragging,
          time: mascot.time,
          totalCount: mascot.manager?.mascots?.length || 1,
          environment: {
            cursor: {
              x: env.cursor.x,
              y: env.cursor.y,
              dx: env.cursorDelta.x,
              dy: env.cursorDelta.y,
            },
            screen: {
              width: env.workArea.width,
              height: env.workArea.height,
            },
            floor: {
              isOn: (pt) => env.isOnFloor(pt || mascot.anchor),
            },
            ceiling: {
              isOn: (pt) => env.isOnCeiling(pt || mascot.anchor),
            },
            workArea: {
              left: env.workArea.left,
              right: env.workArea.right,
              top: env.workArea.top,
              bottom: env.workArea.bottom,
              width: env.workArea.width,
              height: env.workArea.height,
              leftBorder: {
                isOn: (pt) => env.isOnLeftWall(pt || mascot.anchor),
              },
              rightBorder: {
                isOn: (pt) => env.isOnRightWall(pt || mascot.anchor),
              },
            },
            // Stub for IE (interactive element/window) - not supported in web
            activeIE: {
              visible: () => false,
              topBorder: { isOn: () => false },
              bottomBorder: { isOn: () => false },
              leftBorder: { isOn: () => false },
              rightBorder: { isOn: () => false },
              left: 0, right: 0, top: 0, bottom: 0,
              width: 0, height: 0,
            },
            allowsBreeding: true,
            allowsHotspots: true,
          },
          getX: () => mascot.anchor.x,
          getY: () => mascot.anchor.y,
        },
      };

      // Use Function constructor for safe-ish evaluation
      const fn = new Function('mascot', `with(mascot) { return ${expr}; }`);
      return !!fn(ctx.mascot);
    } catch (e) {
      // Silently fail - many conditions will fail due to IE/window features not supported
      // Only log in debug mode
      if (this.manager?.debug) {
        console.warn('Condition evaluation failed:', condition, e);
      }
      return false;
    }
  }

  /**
   * Evaluate a variable that might be a constant or expression
   */
  evalVariable(value) {
    if (value === null || value === undefined) return null;

    // If it's already a number, return it
    if (typeof value === 'number') return value;

    // Check if it's a numeric string constant
    const num = parseFloat(value);
    if (!isNaN(num) && !value.includes('$') && !value.includes('#')) return num;

    // Check if it's an expression
    if (typeof value === 'string' && (value.includes('${') || value.includes('#{'))) {
      // Replace all #{...} and ${...} patterns
      let expr = value.replace(/[#$]\{([^}]+)\}/g, '($1)');
      try {
        const mascot = this;
        const env = this.env;

        const ctx = {
          mascot: {
            anchor: { x: mascot.anchor.x, y: mascot.anchor.y },
            lookRight: mascot.lookingRight,
            lookingRight: mascot.lookingRight,
            environment: {
              cursor: {
                x: env.cursor.x,
                y: env.cursor.y,
                dx: env.cursorDelta.x,
                dy: env.cursorDelta.y,
              },
              workArea: env.workArea,
              screen: {
                width: env.workArea.width,
                height: env.workArea.height,
              },
              activeIE: {
                left: 0, right: 0, top: 0, bottom: 0,
                width: 0, height: 0,
              },
            },
          },
          Math: Math,
        };

        const fn = new Function('mascot', 'Math', `with(mascot) { return ${expr}; }`);
        return fn(ctx.mascot, Math);
      } catch (e) {
        console.warn('Variable evaluation failed:', value, e);
        return 0;
      }
    }

    return value;
  }

  /**
   * Queue a behavior to switch to
   */
  queueBehavior(behaviorName) {
    this.queuedBehavior = behaviorName;
  }

  /**
   * Set the current behavior
   */
  setBehavior(behaviorName, actionOverrides = {}) {
    const behavior = this.data.behaviors[behaviorName];
    if (!behavior) {
      // Only warn once per missing behavior
      this._warnedBehaviors = this._warnedBehaviors || new Set();
      if (!this._warnedBehaviors.has(behaviorName)) {
        this._warnedBehaviors.add(behaviorName);
        console.warn('Unknown behavior:', behaviorName);
      }
      // Fallback to Fall
      if (behaviorName !== 'Fall') {
        this.setBehavior('Fall');
      }
      return;
    }

    // Track behavior history for oscillation detection
    this._behaviorHistory.push({ name: behaviorName, time: this.time });
    if (this._behaviorHistory.length > this._behaviorHistoryMaxSize) {
      this._behaviorHistory.shift();
    }

    this.currentBehavior = behavior;

    // Get the action for this behavior
    const actionDef = this.data.actions[behavior.action];
    if (actionDef) {
      // Apply any overrides
      const mergedDef = { ...actionDef, ...actionOverrides };
      this.currentAction = createAction(this, mergedDef);
      this.currentAction.init();
    } else {
      // Only warn once per missing action
      this._warnedActions = this._warnedActions || new Set();
      if (!this._warnedActions.has(behavior.action)) {
        this._warnedActions.add(behavior.action);
        console.warn('Unknown action:', behavior.action);
      }
      this.currentAction = null;
    }

    this.queuedBehavior = null;
  }

  /**
   * Detect if we're oscillating between behaviors
   */
  _isOscillating() {
    if (this._behaviorHistory.length < 3) return false;

    // Check if the last few behaviors are rapidly switching between just 2-3 states
    const recent = this._behaviorHistory.slice(-6);
    const recentNames = recent.map(b => b.name);
    const uniqueNames = new Set(recentNames);

    // If only 2-3 unique behaviors in last 6, and all happened within 30 ticks
    if (uniqueNames.size <= 3 && recent.length >= 3) {
      const timeDiff = recent[recent.length - 1].time - recent[0].time;
      if (timeDiff < 30) {
        console.log('Oscillation detected:', Array.from(uniqueNames), 'in', timeDiff, 'ticks');
        return true;
      }
    }
    return false;
  }

  /**
   * Check if mascot is in a corner position
   */
  _isInCorner() {
    const env = this.env;
    const onCeiling = env.isOnCeiling(this.anchor);
    const onFloor = env.isOnFloor(this.anchor);
    const onLeftWall = env.isOnLeftWall(this.anchor);
    const onRightWall = env.isOnRightWall(this.anchor);

    return (onCeiling || onFloor) && (onLeftWall || onRightWall);
  }

  /**
   * Select the next behavior based on the current behavior's next list
   */
  selectNextBehavior() {
    if (!this.currentBehavior) {
      this.setBehavior('Fall');
      return;
    }

    // Detect and break oscillation loops
    if (this._isOscillating()) {
      const env = this.env;
      console.log('Breaking oscillation at', this.anchor.x.toFixed(0), this.anchor.y.toFixed(0));

      // Push away from edges to break the cycle
      let moved = false;
      if (this.anchor.x < env.workArea.left + 30) {
        this.anchor.x = env.workArea.left + 50;
        moved = true;
      } else if (this.anchor.x > env.workArea.right - 30) {
        this.anchor.x = env.workArea.right - 50;
        moved = true;
      }
      if (this.anchor.y < env.workArea.top + 30) {
        this.anchor.y = env.workArea.top + 50;
        moved = true;
      }

      this._behaviorHistory = [];  // Clear history
      this.setBehavior('Fall');
      return;
    }

    // Get candidate behaviors
    let candidates = this._collectNextBehaviors(this.currentBehavior);

    if (candidates.length === 0) {
      // No valid next behaviors, fall back
      this.setBehavior('Fall');
      return;
    }

    // When near top corners, filter out conflicting wall/ceiling behaviors
    // to prevent oscillation - prefer ceiling over wall
    const env = this.env;
    const nearTopCorner = this.anchor.y < env.workArea.top + 100 &&
      (this.anchor.x < env.workArea.left + 30 || this.anchor.x > env.workArea.right - 30);

    if (nearTopCorner || this._isInCorner()) {
      const ceilingBehaviors = candidates.filter(c =>
        c.name.toLowerCase().includes('ceiling'));
      const wallBehaviors = candidates.filter(c =>
        c.name.toLowerCase().includes('wall'));

      // If we have both ceiling and wall behaviors, prefer ceiling
      if (ceilingBehaviors.length > 0 && wallBehaviors.length > 0) {
        candidates = candidates.filter(c =>
          !c.name.toLowerCase().includes('wall'));
      }
    }

    if (candidates.length === 0) {
      this.setBehavior('Fall');
      return;
    }

    // Weighted random selection
    const totalFreq = candidates.reduce((sum, b) => sum + b.frequency, 0);
    if (totalFreq === 0) {
      this.setBehavior(candidates[0].name);
      return;
    }

    let roll = Math.random() * totalFreq;
    for (const candidate of candidates) {
      roll -= candidate.frequency;
      if (roll <= 0) {
        this.setBehavior(candidate.name);
        return;
      }
    }

    // Fallback to first candidate
    this.setBehavior(candidates[0].name);
  }

  _collectNextBehaviors(behavior) {
    const candidates = [];
    const nextList = behavior.nextBehaviors;

    if (!nextList || !nextList.behaviors) {
      // Use all non-hidden behaviors
      for (const [name, b] of Object.entries(this.data.behaviors)) {
        if (!b.hidden && b.frequency > 0 && this.evalCondition(b.condition)) {
          candidates.push({ name, frequency: b.frequency });
        }
      }
      return candidates;
    }

    // Process next behavior list
    const processList = (list) => {
      for (const item of list) {
        if (item.type === 'reference') {
          if (this.evalCondition(item.condition)) {
            const targetBehavior = this.data.behaviors[item.name];
            if (targetBehavior && this.evalCondition(targetBehavior.condition)) {
              candidates.push({ name: item.name, frequency: item.frequency });
            }
          }
        } else if (item.type === 'condition') {
          if (this.evalCondition(item.condition)) {
            processList(item.behaviors);
          }
        }
      }
    };

    processList(nextList.behaviors);

    // If Add is true, also include general behaviors
    if (nextList.add !== false && candidates.length > 0) {
      for (const [name, b] of Object.entries(this.data.behaviors)) {
        if (!b.hidden && b.frequency > 0 && this.evalCondition(b.condition)) {
          if (!candidates.find(c => c.name === name)) {
            candidates.push({ name, frequency: b.frequency });
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Update the mascot state (called each tick)
   */
  tick() {
    if (this.destroyed) return;

    this.time++;

    // Check for queued behavior
    if (this.queuedBehavior) {
      this.setBehavior(this.queuedBehavior);
    }

    // Update current action
    if (this.currentAction) {
      const continuing = this.currentAction.tick();
      if (!continuing || this.currentAction.finished) {
        // Action finished, select next behavior
        this.selectNextBehavior();
      }
    } else {
      // No action, select a behavior
      this.selectNextBehavior();
    }

    // Clamp to bounds (before render, after movement)
    this.anchor = this.env.clamp(this.anchor);

    // Emergency corner escape - if we're stuck in a top corner, push out
    const env = this.env;
    const inTopLeftCorner = this.anchor.x < env.workArea.left + 15 && this.anchor.y < env.workArea.top + 15;
    const inTopRightCorner = this.anchor.x > env.workArea.right - 15 && this.anchor.y < env.workArea.top + 15;

    if (inTopLeftCorner || inTopRightCorner) {
      // Track how long we've been in a corner
      this._cornerStuckTime = (this._cornerStuckTime || 0) + 1;

      if (this._cornerStuckTime > 10) {
        // We've been stuck in corner too long, force escape
        console.log('Emergency corner escape');
        this.anchor.y = env.workArea.top + 100;
        if (inTopLeftCorner) {
          this.anchor.x = env.workArea.left + 50;
        } else {
          this.anchor.x = env.workArea.right - 50;
        }
        this._cornerStuckTime = 0;
        this._behaviorHistory = [];
        this.setBehavior('Fall');
      }
    } else {
      this._cornerStuckTime = 0;
    }

    // Update rendering
    this.render();
  }

  /**
   * Get the current image to display
   */
  getCurrentImage() {
    if (!this.currentAction) return null;

    const pose = this.currentAction.getCurrentPose();
    if (!pose) return null;

    // Get image name based on direction
    let imageName = pose.image;
    if (!this.lookingRight && pose.imageRight) {
      imageName = pose.imageRight;
    }

    return {
      name: imageName,
      anchor: pose.anchor,
      mirror: !this.lookingRight && !pose.imageRight,
    };
  }

  /**
   * Load an image (with caching)
   */
  loadImage(name) {
    if (this.imageCache.has(name)) {
      return Promise.resolve(this.imageCache.get(name));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(name, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = this.data.baseUrl + 'img/' + name;
    });
  }

  /**
   * Render the mascot
   */
  render() {
    const imageInfo = this.getCurrentImage();

    // Fallback to default image if no pose available
    const imageName = imageInfo?.name || 'shime1.png';
    const anchorX = imageInfo?.anchor?.x || 64;
    const anchorY = imageInfo?.anchor?.y || 128;
    const mirror = imageInfo?.mirror || false;

    // Update image source if changed
    const imgSrc = this.data.baseUrl + 'img/' + imageName;
    if (this._lastImgSrc !== imgSrc) {
      this._lastImgSrc = imgSrc;
      this.imageElement.src = imgSrc;
    }

    // Apply mirroring
    if (mirror) {
      this.imageElement.style.transform = 'scaleX(-1)';
    } else {
      this.imageElement.style.transform = '';
    }

    // Position element (anchor point is at mascot's feet)
    this.element.style.left = (this.anchor.x - anchorX) + 'px';
    this.element.style.top = (this.anchor.y - anchorY) + 'px';
  }

  /**
   * Destroy the mascot
   */
  destroy() {
    this.destroyed = true;

    // Remove event listeners
    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    // Notify manager
    if (this.manager) {
      this.manager._removeMascot(this);
    }
  }
}
