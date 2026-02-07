/**
 * XML Parser for Shijima mascot behaviors and actions
 */

import { Vec2 } from './math.js';

// Attribute name translations (Japanese -> English)
const TRANSLATIONS = {
  // Action attributes
  '種類': 'Type',
  '名前': 'Name',
  '条件': 'Condition',
  '枠': 'BorderType',
  '対象X': 'TargetX',
  '対象Y': 'TargetY',
  '初速X': 'InitialVX',
  '初速Y': 'InitialVY',
  '重力': 'Gravity',
  '空気抵抗X': 'RegistanceX',
  '空気抵抗Y': 'RegistanceY',
  '長さ': 'Duration',
  '目的地X': 'TargetX',
  '目的地Y': 'TargetY',
  '速度': 'Velocity',

  // Pose attributes
  '画像': 'Image',
  '右向き画像': 'ImageRight',
  '基準座標': 'ImageAnchor',
  '移動速度': 'Velocity',
  '音声': 'Sound',

  // Behavior attributes
  '頻度': 'Frequency',
  '隠れる': 'Hidden',

  // Values
  '床': 'Floor',
  '天井': 'Ceiling',
  '壁': 'Wall',
  '静止': 'Stay',
  '移動': 'Move',
  '組み込み': 'Embedded',
  '複合': 'Sequence',
  '選択': 'Select',
};

function translate(value) {
  return TRANSLATIONS[value] || value;
}

function parseVec2(str, defaultValue = '0,0') {
  const parts = (str || defaultValue).split(',').map(s => parseFloat(s.trim()));
  return new Vec2(parts[0] || 0, parts[1] || 0);
}

function getAttr(node, name, defaultValue = null) {
  const value = node.getAttribute(name) || node.getAttribute(translate(name));
  return value !== null ? translate(value) : defaultValue;
}

function getNumAttr(node, name, defaultValue = 0) {
  const value = getAttr(node, name);
  return value !== null ? parseFloat(value) : defaultValue;
}

function getBoolAttr(node, name, defaultValue = false) {
  const value = getAttr(node, name);
  if (value === null) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse a Pose element
 */
function parsePose(node) {
  const image = getAttr(node, 'Image', '');
  const imageRight = getAttr(node, 'ImageRight', '');
  const anchor = parseVec2(getAttr(node, 'ImageAnchor', '64,128'));
  const velocity = parseVec2(getAttr(node, 'Velocity', '0,0'));
  const duration = getNumAttr(node, 'Duration', 1);
  const sound = getAttr(node, 'Sound', null);

  return {
    image: image.replace(/^\//, ''),  // Remove leading slash
    imageRight: imageRight.replace(/^\//, ''),
    anchor,
    velocity,
    duration,
    sound
  };
}

/**
 * Parse a Hotspot element
 */
function parseHotspot(node) {
  const shape = getAttr(node, 'Shape', 'Rectangle').toLowerCase();
  const origin = parseVec2(getAttr(node, 'Origin', '0,0'));
  const size = parseVec2(getAttr(node, 'Size', '0,0'));
  const behavior = getAttr(node, 'Behavior', '');

  return { shape, origin, size, behavior };
}

/**
 * Parse an Animation element
 */
function parseAnimation(node) {
  const condition = getAttr(node, 'Condition', 'true');
  const poses = [];
  const hotspots = [];

  for (const child of node.children) {
    if (isTag(child, 'Pose')) {
      poses.push(parsePose(child));
    } else if (isTag(child, 'Hotspot')) {
      hotspots.push(parseHotspot(child));
    }
  }

  // Calculate total duration
  const totalDuration = poses.reduce((sum, pose) => sum + pose.duration, 0);

  return { condition, poses, hotspots, totalDuration };
}

/**
 * Parse an Action element
 */
function parseAction(node, actions) {
  const name = getAttr(node, 'Name', '');
  const type = getAttr(node, 'Type', 'Stay');
  const borderType = getAttr(node, 'BorderType', '');
  const condition = getAttr(node, 'Condition', 'true');

  const action = {
    name,
    type,
    borderType,
    condition,
    className: getAttr(node, 'Class', ''),  // For Embedded type
    loop: getBoolAttr(node, 'Loop', true),
    animations: [],
    children: [],
    // Additional properties based on type
    targetX: getAttr(node, 'TargetX'),
    targetY: getAttr(node, 'TargetY'),
    initialVX: getNumAttr(node, 'InitialVX', 0),
    initialVY: getNumAttr(node, 'InitialVY', 0),
    gravity: getNumAttr(node, 'Gravity', 2),
    resistanceX: getNumAttr(node, 'RegistanceX', 0.05),
    resistanceY: getNumAttr(node, 'RegistanceY', 0.1),
    duration: getNumAttr(node, 'Duration', 0),
    velocity: getNumAttr(node, 'Velocity', 0),
    affordance: getAttr(node, 'Affordance', ''),
    bornX: getNumAttr(node, 'BornX', 0),
    bornY: getNumAttr(node, 'BornY', 0),
    bornBehavior: getAttr(node, 'BornBehavior', ''),
    bornMascot: getAttr(node, 'BornMascot', ''),
    bornTransient: getBoolAttr(node, 'BornTransient', true),
    iejumpMultiplier: getNumAttr(node, 'IesOffsetMultiplier', 1.0),
    x: getAttr(node, 'X'),
    y: getAttr(node, 'Y'),
  };

  for (const child of node.children) {
    if (isTag(child, 'Animation')) {
      action.animations.push(parseAnimation(child));
    } else if (isTag(child, 'ActionReference')) {
      // Capture all override attributes from the reference
      action.children.push({
        type: 'reference',
        name: getAttr(child, 'Name', ''),
        duration: getAttr(child, 'Duration'),  // Keep as string for expression eval
        condition: getAttr(child, 'Condition', 'true'),
        targetX: getAttr(child, 'TargetX'),
        targetY: getAttr(child, 'TargetY'),
        initialVX: getAttr(child, 'InitialVX'),
        initialVY: getAttr(child, 'InitialVY'),
        x: getAttr(child, 'X'),
        y: getAttr(child, 'Y'),
      });
    } else if (isTag(child, 'Action')) {
      // Inline nested action
      const nested = parseAction(child, actions);
      action.children.push(nested);
    }
  }

  return action;
}

/**
 * Parse a Behavior element
 */
function parseBehavior(node) {
  const name = getAttr(node, 'Name', '');
  const frequency = getNumAttr(node, 'Frequency', 1);
  const condition = getAttr(node, 'Condition', 'true');
  const hidden = getBoolAttr(node, 'Hidden', false);

  const behavior = {
    name,
    frequency,
    condition,
    hidden,
    action: name,  // Default: action name = behavior name
    nextBehaviors: [],
  };

  for (const child of node.children) {
    if (isTag(child, 'ActionReference') || isTag(child, 'Action')) {
      behavior.action = getAttr(child, 'Name', '') || name;
    }
    // Support both NextBehavior and NextBehaviorList
    if (isTag(child, 'NextBehaviorList') || isTag(child, 'NextBehavior')) {
      const add = getBoolAttr(child, 'Add', true);
      behavior.nextBehaviors = {
        add,
        behaviors: parseNextBehaviorList(child),
      };
    }
  }

  return behavior;
}

/**
 * Parse NextBehaviorList children
 */
function parseNextBehaviorList(node) {
  const behaviors = [];

  for (const child of node.children) {
    if (isTag(child, 'BehaviorReference')) {
      behaviors.push({
        type: 'reference',
        name: getAttr(child, 'Name', ''),
        frequency: getNumAttr(child, 'Frequency', 1),
        condition: getAttr(child, 'Condition', 'true'),
      });
    } else if (isTag(child, 'Condition')) {
      const condition = getAttr(child, 'Condition', 'true');
      const nested = parseNextBehaviorList(child);
      behaviors.push({
        type: 'condition',
        condition,
        behaviors: nested,
      });
    }
  }

  return behaviors;
}

/**
 * Get element tag name (handles namespaces)
 */
function getTag(node) {
  return node.localName || node.tagName;
}

/**
 * Check if element matches tag name
 */
function isTag(node, name) {
  const tag = node.localName || node.tagName;
  return tag === name;
}

/**
 * Find element by local name (ignores namespace)
 */
function findByLocalName(parent, localName) {
  for (const child of parent.children) {
    if (isTag(child, localName)) {
      return child;
    }
  }
  return null;
}

/**
 * Find all elements by local name (ignores namespace)
 */
function findAllByLocalName(parent, localName) {
  const results = [];
  for (const child of parent.children) {
    if (isTag(child, localName)) {
      results.push(child);
    }
  }
  return results;
}

/**
 * Parse the actions.xml file
 */
export function parseActions(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const actions = {};

  // Handle namespaced XML - find ALL ActionList elements
  const root = doc.documentElement;
  const actionLists = findAllByLocalName(root, 'ActionList');
  if (actionLists.length === 0) {
    console.warn('No ActionList found in actions.xml');
    return actions;
  }

  let count = 0;
  for (const actionList of actionLists) {
    for (const actionNode of actionList.children) {
      const tag = actionNode.localName || actionNode.tagName;
      if (tag === 'Action') {
        try {
          const action = parseAction(actionNode, actions);
          if (action.name) {
            actions[action.name] = action;
            count++;
          }
        } catch (e) {
          console.error('Error parsing action:', e, actionNode);
        }
      }
    }
  }

  console.log('Parsed actions:', count, 'from', actionLists.length, 'ActionLists. First 10:', Object.keys(actions).slice(0, 10));
  return actions;
}

/**
 * Parse the behaviors.xml file
 */
export function parseBehaviors(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const behaviors = {};
  const constants = {};

  // Handle namespaced XML
  const root = doc.documentElement;
  const behaviorList = findByLocalName(root, 'BehaviorList');
  if (!behaviorList) {
    console.warn('No BehaviorList found in behaviors.xml');
    return { behaviors, constants };
  }

  for (const child of behaviorList.children) {
    const tag = child.localName || child.tagName;
    if (tag === 'Constant') {
      const name = getAttr(child, 'Name', '');
      const value = getAttr(child, 'Value', '');
      constants[name] = value;
    } else if (tag === 'Behavior') {
      const behavior = parseBehavior(child);
      behaviors[behavior.name] = behavior;
    } else if (tag === 'Condition') {
      // Top-level conditions contain nested behaviors
      const condition = getAttr(child, 'Condition', 'true');
      for (const behaviorNode of child.children) {
        const btag = behaviorNode.localName || behaviorNode.tagName;
        if (btag === 'Behavior') {
          const behavior = parseBehavior(behaviorNode);
          // Wrap condition
          if (behavior.condition === 'true') {
            behavior.condition = condition;
          } else {
            behavior.condition = `(${condition}) && (${behavior.condition})`;
          }
          behaviors[behavior.name] = behavior;
        }
      }
    }
  }

  console.log('Parsed behaviors:', Object.keys(behaviors).length, Object.keys(behaviors).slice(0, 10));
  return { behaviors, constants };
}

/**
 * Load and parse a mascot from a directory/URL base
 */
export async function loadMascot(baseUrl) {
  // Normalize URL
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  const [actionsXml, behaviorsXml] = await Promise.all([
    fetch(baseUrl + 'actions.xml').then(r => r.text()),
    fetch(baseUrl + 'behaviors.xml').then(r => r.text()),
  ]);

  const actions = parseActions(actionsXml);
  const { behaviors, constants } = parseBehaviors(behaviorsXml);

  return {
    baseUrl,
    actions,
    behaviors,
    constants,
  };
}
