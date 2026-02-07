/**
 * Shijima Web - Desktop mascots for the web
 *
 * A JavaScript library for displaying animated mascot characters on web pages.
 * Based on the Shijima-Qt desktop mascot application.
 *
 * @example
 * // Basic usage
 * import { ShijimaManager } from 'shijima-web';
 *
 * const manager = new ShijimaManager();
 * await manager.spawn('/path/to/mascot/');
 *
 * @example
 * // With options
 * const manager = new ShijimaManager({
 *   container: document.getElementById('mascot-area'),
 *   tickInterval: 40,
 *   allowBreeding: false,  // Disable mascot duplication
 *   maxMascots: 5,         // Limit maximum mascots
 * });
 *
 * await manager.spawn('/mascots/shimeji/', {
 *   x: 100,
 *   y: 200,
 *   behavior: 'Walk',
 * });
 *
 * @example
 * // Single mascot only (no duplication)
 * const manager = new ShijimaManager({ allowBreeding: false });
 * await manager.spawn('/mascot/');
 */

import { ShijimaManager } from './manager.js';
import { Mascot } from './mascot.js';
import { Environment } from './environment.js';
import { loadMascot, parseActions, parseBehaviors } from './parser.js';
import { Vec2, Rect, Border } from './math.js';
import { showContextMenu, hideContextMenu } from './contextmenu.js';

// Re-export everything
export { ShijimaManager, Mascot, Environment, loadMascot, parseActions, parseBehaviors, Vec2, Rect, Border };
export { showContextMenu, hideContextMenu };
export * from './actions.js';

// Version
export const VERSION = '1.0.0';

// Convenience function for quick setup
export async function createShijima(mascotUrl, options = {}) {
  const manager = new ShijimaManager(options);
  await manager.spawn(mascotUrl, options);
  return manager;
}

// Default export
export default { ShijimaManager, Mascot, Environment, createShijima, VERSION };
