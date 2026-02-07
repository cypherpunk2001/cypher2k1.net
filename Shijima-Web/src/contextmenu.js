/**
 * Context menu for Shijima mascots
 */

let activeMenu = null;

/**
 * Create and show context menu
 */
export function showContextMenu(mascot, x, y, options = {}) {
  // Close any existing menu
  hideContextMenu();

  const menu = document.createElement('div');
  menu.className = 'shijima-context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 6px;
    padding: 4px 0;
    min-width: 150px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #e0e0e0;
    user-select: none;
  `;

  // Menu items
  const items = [];

  // Only show Spawn Another if breeding is allowed
  if (mascot.manager?.allowBreeding !== false) {
    items.push({
      label: 'Spawn Another',
      action: () => {
        if (mascot.manager) {
          // Check maxMascots limit
          if (mascot.manager.mascots.length >= mascot.manager.maxMascots) {
            return;
          }
          mascot.manager.spawn(mascot.data.baseUrl, {
            x: mascot.anchor.x + 50,
            y: Math.max(0, mascot.anchor.y - 100),
          });
        }
      }
    });
    items.push({ type: 'separator' });
  }

  items.push({
    label: 'Dismiss',
    action: () => {
      mascot.destroy();
    }
  });

  // Only show Dismiss All if there are multiple mascots
  if (mascot.manager && mascot.manager.mascots.length > 1) {
    items.push({
      label: 'Dismiss All',
      action: () => {
        mascot.manager.dismissAll();
      }
    });
  }

  // Add custom items if provided
  if (options.items) {
    items.unshift(...options.items, { type: 'separator' });
  }

  // Create menu items
  for (const item of items) {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.style.cssText = `
        height: 1px;
        background: #404040;
        margin: 4px 8px;
      `;
      menu.appendChild(sep);
    } else {
      const menuItem = document.createElement('div');
      menuItem.textContent = item.label;
      menuItem.style.cssText = `
        padding: 6px 12px;
        cursor: pointer;
        transition: background 0.1s;
      `;
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#3d3d3d';
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent';
      });
      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        hideContextMenu();
        if (item.action) {
          item.action();
        }
      });
      menu.appendChild(menuItem);
    }
  }

  document.body.appendChild(menu);
  activeMenu = menu;

  // Adjust position if menu goes off screen
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = (window.innerHeight - rect.height - 10) + 'px';
  }

  // Close on click outside
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      hideContextMenu();
      document.removeEventListener('mousedown', closeHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', closeHandler);
  }, 0);

  // Close on escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  return menu;
}

/**
 * Hide the active context menu
 */
export function hideContextMenu() {
  if (activeMenu && activeMenu.parentNode) {
    activeMenu.parentNode.removeChild(activeMenu);
  }
  activeMenu = null;
}
