/**
 * ShijimaManager - main manager for mascots on a page
 */

import { Environment } from './environment.js';
import { Mascot } from './mascot.js';
import { loadMascot } from './parser.js';

// Default tick interval (ms)
const TICK_INTERVAL = 40;

/**
 * ShijimaManager - manages all mascots on a page
 */
export class ShijimaManager {
  constructor(options = {}) {
    // Container element (defaults to document.body)
    this.container = options.container || document.body;

    // Create environment
    this.env = new Environment(this.container);

    // Mascot data cache
    this.mascotDataCache = new Map();

    // Active mascots
    this.mascots = [];

    // Animation state
    this.running = false;
    this.tickInterval = options.tickInterval || TICK_INTERVAL;
    this.animationFrame = null;
    this.lastTick = 0;

    // Breeding/duplication options
    this.allowBreeding = options.allowBreeding !== false;  // Default: true
    this.maxMascots = options.maxMascots || Infinity;  // Optional limit

    // Event callbacks
    this.onBreed = options.onBreed || this._defaultOnBreed.bind(this);
    this.onContextMenu = options.onContextMenu || null;

    // Create container for mascots if needed
    this._setupContainer();
  }

  _setupContainer() {
    // If using document.body, we need to make sure mascots are positioned correctly
    if (this.container === document.body) {
      // Ensure body can contain absolutely positioned elements
      if (getComputedStyle(this.container).position === 'static') {
        this.container.style.position = 'relative';
      }
    }

    // Create a layer for mascots
    this.mascotLayer = document.createElement('div');
    this.mascotLayer.className = 'shijima-layer';
    this.mascotLayer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
      overflow: hidden;
    `;
    document.body.appendChild(this.mascotLayer);
  }

  /**
   * Load mascot data from a URL
   */
  async loadMascotData(baseUrl) {
    if (this.mascotDataCache.has(baseUrl)) {
      return this.mascotDataCache.get(baseUrl);
    }

    const data = await loadMascot(baseUrl);
    this.mascotDataCache.set(baseUrl, data);
    return data;
  }

  /**
   * Spawn a new mascot
   */
  async spawn(baseUrl, options = {}) {
    // Load mascot data
    const data = await this.loadMascotData(baseUrl);

    // Default position: random along top of screen, will fall
    const x = options.x ?? Math.random() * this.env.workArea.width;
    const y = options.y ?? 0;
    const behavior = options.behavior ?? 'Fall';

    // Create mascot
    const mascot = new Mascot(this, data, {
      x,
      y,
      behavior,
      lookingRight: options.lookingRight ?? Math.random() > 0.5,
    });

    // Add to list and DOM
    this.mascots.push(mascot);
    this.mascotLayer.appendChild(mascot.element);

    // Start animation loop if not running
    if (!this.running) {
      this.start();
    }

    return mascot;
  }

  /**
   * Default breed handler - spawns a new mascot of the same type
   */
  _defaultOnBreed(parentMascot, options) {
    // Check if breeding is allowed
    if (!this.allowBreeding) {
      return null;
    }

    // Check mascot limit
    if (this.mascots.length >= this.maxMascots) {
      return null;
    }

    const data = parentMascot.data;

    const mascot = new Mascot(this, data, {
      x: options.x,
      y: options.y,
      behavior: options.behavior || 'Fall',
      lookingRight: Math.random() > 0.5,
    });

    this.mascots.push(mascot);
    this.mascotLayer.appendChild(mascot.element);

    return mascot;
  }

  /**
   * Remove a mascot from the manager
   */
  _removeMascot(mascot) {
    const index = this.mascots.indexOf(mascot);
    if (index !== -1) {
      this.mascots.splice(index, 1);
    }

    // Stop if no mascots left
    if (this.mascots.length === 0) {
      this.stop();
    }
  }

  /**
   * Dismiss all mascots
   */
  dismissAll() {
    const mascots = [...this.mascots];
    for (const mascot of mascots) {
      mascot.destroy();
    }
    this.mascots = [];
    this.stop();
  }

  /**
   * Dismiss a specific mascot
   */
  dismiss(mascot) {
    mascot.destroy();
  }

  /**
   * Start the animation loop
   */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTick = performance.now();
    this._tick();
  }

  /**
   * Stop the animation loop
   */
  stop() {
    this.running = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Animation tick
   */
  _tick() {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastTick;

    // Run tick if enough time has passed
    if (delta >= this.tickInterval) {
      this.lastTick = now - (delta % this.tickInterval);

      // Update all mascots
      for (const mascot of this.mascots) {
        if (!mascot.destroyed) {
          mascot.tick();
        }
      }

      // Clean up destroyed mascots
      this.mascots = this.mascots.filter(m => !m.destroyed);
    }

    // Schedule next frame
    this.animationFrame = requestAnimationFrame(() => this._tick());
  }

  /**
   * Get mascot count
   */
  get count() {
    return this.mascots.length;
  }

  /**
   * Destroy the manager and all mascots
   */
  destroy() {
    this.dismissAll();
    this.env.destroy();

    if (this.mascotLayer && this.mascotLayer.parentNode) {
      this.mascotLayer.parentNode.removeChild(this.mascotLayer);
    }
  }
}
