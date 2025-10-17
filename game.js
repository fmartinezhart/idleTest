// --- Game Constants & State ---
const DOT_COUNT = 50000; 
const INITIAL_DOTS_SPAWN = 100; 
const INITIAL_SPAWN_RANGE = 20000; 
const LOCAL_SPAWN_RADIUS = 5000;

const PLAYER_SIZE = 10;

// NEW: Dynamic resource sizes and fragment constants
const RESOURCE_SIZE_ASTEROID = 8; // The original, large resource
const RESOURCE_SIZE_FRAGMENT = 3; // The smaller, collectable fragments
const FRAGMENTS_PER_HIT = 5; // Number of fragments created per laser hit
const BASE_MOVEMENT_SPEED = 150; // Pixi units per second (for WASD movement)

// NEW: Bullet & Weapon Constants
const BULLET_SPEED = 500; // Pixi units per second
const FIRE_RATE_MS = 150; // Base fire rate (in milliseconds)
const BULLET_SPREAD_DEGREES = 5; // Base max angle deviation
const BASE_LASER_DAMAGE = 20; // NEW: Base damage dealt by one bullet

const MOVEMENT_SPEED_BASE = 2.5; // Pixi units per frame
const GAME_IDLE_DELAY = 1000; // 1 second delay at base

// ** DYNAMIC WIDTH/HEIGHT: These are now variables initialized at runtime **
let currentWidth = window.innerWidth;
let currentHeight = window.innerHeight;

// Resource Spawning Constants (Base value, used for calculation)
const SPAWN_INTERVAL_BASE = 1000; // 1 dot per second (1000ms)
let timeSinceLastSpawn = 0;

// NEW: Asteroid Size, Health, and Reward Scaling
const MIN_ASTEROID_SIZE_FACTOR = 0.5; // Smallest asteroid is half the size
const MAX_ASTEROID_SIZE_FACTOR = 2.5; // Largest asteroid is 2.5 times the size
const HEALTH_PER_SIZE = 40; // Base health for a 'size 1' asteroid (50 is the old base)
const REWARD_PER_SIZE = 5; // Base reward for a 'size 1' asteroid
const ASTEROID_COLORS = [0xD3D3D3, 0xA9A9A9, 0x808080, 0x696969, 0x505050]; // A palette of desaturated colors

// --- MULTI-HARVESTER CONSTANTS ---
let nextHarvesterId = 1;

// --- FUEL BAR GRAPHIC CONSTANTS ---
const FUEL_BAR_WIDTH = 40;
const FUEL_BAR_HEIGHT = 5;
const FUEL_BAR_OFFSET_Y = 20;

// --- GLOBAL HARVESTER ARRAY ---
let harvesters = [];
let activeHarvester = null; // Used for camera snapping/UI focus

// Base Game Constants

const HARVESTER_RANGE = 1000; 
const MAX_BASE_LINK_DISTANCE = 500; 
const BASE_LASER_RANGE = 5000; // Now the max travel distance for a bullet
const BASE_FUEL_CAPACITY = 100;  // Max fuel harvester can carry
const FUEL_CONSUMPTION_RATE = 0.05; // Fuel units consumed per unit of distance moved (per pixel)
const REFUEL_RATE_PER_SEC = 1000; // Fuel units restored per second
const REFUEL_RANGE = 50;

const MIN_ZOOM = 0.05; 
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.1;
let currentZoom = 1.0;
let worldContainer; 
let activeMainTab = 'upgrades'; // Can be 'upgrades' or 'research'

// Panning State
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

// All game coordinates now operate in world space
let score = 1000;
let collectedInTrip = 0; 

// Base State
let bases = [];
let currentBase = null;
let homeBase; // Reference to the main base object (bases[0])
// Base movement/firing state
let activeBase = null; // Tracks which base is selected for WASD movement/firing
let keyState = {}; // Tracks currently pressed keys

let currentFuel = BASE_FUEL_CAPACITY;
let maxFuel = BASE_FUEL_CAPACITY; 
let isHarvesterRefueling = false;
let refuelingRate = 50; // Fuel units restored per second

// NEW: Bullet State
let bullets = [];
let lastFireTime = 0;
let mouseWorldX = 0; // Mouse position in world coordinates
let mouseWorldY = 0; // Mouse position in world coordinates

// --- UPGRADE DATA STRUCTURE (The New Core with Grouping) ---
const UPGRADES = [
    {
        id: 'speed',
        name: 'Speed Boost',
        level: 1,
        baseCost: 100,
        cost: 100,
        group: 'ship',
        subgroup: 'Mobility & Hull',
        description: 'Increases movement speed by 50%',
        effect: (level) => MOVEMENT_SPEED_BASE * (1 + (level - 1) * 0.5), 
        costFormula: (cost) => Math.floor(cost * 1.5),
        currentValue: MOVEMENT_SPEED_BASE
    },
    {
        id: 'capacity',
        name: 'Cargo Capacity',
        level: 1,
        baseCost: 150,
        cost: 150,
        group: 'ship',
        subgroup: 'Mobility & Hull',
        description: 'Increases trip haul limit by 5',
        effect: (level) => 10 + (level - 1) * 5, 
        costFormula: (cost) => Math.floor(cost * 1.5),
        currentValue: 10
    },
    // NEW LASER UPGRADES
    {
        id: 'damage',
        name: 'Laser Damage',
        level: 1,
        baseCost: 250,
        cost: 250,
        group: 'ship',
        subgroup: 'Weapon Systems',
        description: 'Increases bullet damage by 20%',
        effect: (level) => BASE_LASER_DAMAGE * (1 + (level - 1) * 0.2), 
        costFormula: (cost) => Math.floor(cost * 1.8),
        currentValue: BASE_LASER_DAMAGE
    },
    {
        id: 'fire-rate',
        name: 'Rapid Fire',
        level: 1,
        baseCost: 300,
        cost: 300,
        group: 'ship',
        subgroup: 'Weapon Systems',
        description: 'Reduces fire cooldown by 10% (Faster shooting)',
        // Faster shooting means a smaller fire rate (cooldown)
        effect: (level) => FIRE_RATE_MS * Math.pow(0.9, level - 1), 
        costFormula: (cost) => Math.floor(cost * 2.0),
        currentValue: FIRE_RATE_MS
    },
    {
        id: 'accuracy',
        name: 'Precision Optics',
        level: 1,
        baseCost: 400,
        cost: 400,
        group: 'ship',
        subgroup: 'Weapon Systems',
        description: 'Reduces bullet spread by 15% (Tighter grouping)',
        // Tighter grouping means a smaller spread angle
        effect: (level) => BULLET_SPREAD_DEGREES * Math.pow(0.85, level - 1), 
        costFormula: (cost) => Math.floor(cost * 2.2),
        currentValue: BULLET_SPREAD_DEGREES
    },
    // END NEW LASER UPGRADES
    {
        id: 'large-haul',
        name: 'Large Haul Cargo Bay',
        level: 0, 
        baseCost: 500,
        cost: 500,
        group: 'ship', 
        subgroup: 'Ship Systems',
        description: 'Allows the harvester to collect large asteroids directly without base breakup.',
        effect: (level) => level > 0,
        costFormula: (cost) => null,
        currentValue: false
    },
    {
        id: 'spawn',
        name: 'Resource Spawning',
        level: 1,
        baseCost: 150,
        cost: 150,
        group: 'world',
        subgroup: 'Resource Generation',
        description: 'Reduces delay between new resource spawns',
        effect: (level) => Math.max(100, SPAWN_INTERVAL_BASE * Math.pow(0.9, level - 1)),
        costFormula: (cost) => Math.floor(cost * 2.5),
        currentValue: SPAWN_INTERVAL_BASE
    },
    {
        id: 'harvester-range',
        name: 'Harvester Range',
        level: 1,
        baseCost: 200,
        cost: 200,
        group: 'ship',
        subgroup: 'Ship Systems',
        description: 'Increases collection radius around bases',
        effect: (level) => HARVESTER_RANGE * (1 + (level - 1) * 0.2), 
        costFormula: (cost) => Math.floor(cost * 1.8),
        currentValue: HARVESTER_RANGE
    },
    {
        id: 'new-harvester',
        name: 'New Harvester',
        level: 1,
        baseCost: 200,
        cost: 200,
        group: 'ship types',
        subgroup: 'Ships',
        description: 'Deploys an additional autonomous Harvester unit.',
        effect: (level) => HARVESTER_RANGE * (1 + (level - 1) * 0.2), 
        costFormula: (cost) => Math.floor(cost * 2.5),
        currentValue: harvesters.length,
        maxLevel: 5 // Limit the number of available ships
    }
    
];

// Special Purchase State
let baseCost = 500; 
let baseCount = 1;

// Harvester state
let collectedInTripMax = UPGRADES.find(u => u.id === 'capacity').currentValue;
let currentHarvesterRange = UPGRADES.find(u => u.id === 'harvester-range')?.currentValue || HARVESTER_RANGE;
let canHarvestLargeResources = getUpgrade('large-haul').currentValue;
let resources = [];
let targetResource = null;
let lastActionTime = 0;
let state = 'IDLE'; 

// Base State
let roadGraphics = null; 

// DOM references
let scoreDisplay, dotCountDisplay, zoomLevelDisplay, container, app;
let newBaseButton, snapButton, upgradePanelContent, tabContainer; 
let newBaseCostDisplay, baseCountDisplay; 
let activeTab = 'ship';

// NEW: Panel State & Reference
let isPanelOpen = true; // Start open by default
let panelHeader, panelInnerContent ;
const lastActiveSubgroup = { 
    'upgrades': 'SHIP', // Default to 'SHIP'
    'research': 'GENERAL' 
};

// --- Utility Functions ---

function getUpgrade(id) {
    return UPGRADES.find(u => u.id === id);
}

function distance(p1, p2) {
    // CRITICAL FIX: Check if either object is null/undefined or missing coordinates.
    // If the check fails, return Infinity to prevent the crash and signal 'unreachable'.
    if (!p1 || !p2 || p1.x === undefined || p2.x === undefined || p1.y === undefined || p2.y === undefined) {
        return Infinity; 
    }
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// --- PIXI Graphics Creation ---

// Update the function signature to accept actualSize
function createResourceGraphic(isFragment = false, actualSize = RESOURCE_SIZE_ASTEROID) { 
    const graphics = new PIXI.Graphics();
    
    // Determine size and color based on fragment status
    const size = isFragment ? RESOURCE_SIZE_FRAGMENT : actualSize; 
    let color;
    
    if (isFragment) {
        color = 0x69D2E7; // Fixed color for fragments
    } else {
        // Randomly pick a color from the defined palette
        color = ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)];
        graphics.lineStyle(1, 0xFFFFFF, 0.4); // Add a light border for definition
    }
    
    graphics.beginFill(color);
    
    // Check if it's a fragment (still a circle for simplicity)
    if (isFragment) {
        graphics.drawCircle(0, 0, size);
    } else {
        // --- ASTEROID POLYGON GENERATION ---
        
        // Use the calculated size as the base radius for drawing
        const baseRadius = size; 
        
        const numPoints = 6 + Math.floor(Math.random() * 5); 
        const points = [];
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2; 
            
            // Randomly vary the radius relative to the asteroid's actual size
            const randomRadius = baseRadius * (0.75 + Math.random() * 0.5); 
            
            const x = Math.cos(angle) * randomRadius;
            const y = Math.sin(angle) * randomRadius;
            
            points.push(x, y);
        }
        
        graphics.drawPolygon(points);
        // --- END ASTEROID POLYGON GENERATION ---
    }

    graphics.endFill();
    return graphics;
}

// Graphic for the slow-moving bullet
function createBulletGraphic() {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFF79C6); // Pink bullet
    graphics.drawCircle(0, 0, 3); // Small bullet size
    graphics.endFill();
    return graphics;
}

function createBaseGraphic(color, initialX, initialY) {
    const baseGraphic = new PIXI.Graphics();
    const outerRadius = PLAYER_SIZE * 3.5;
    const innerRadius = PLAYER_SIZE * 1.5;

    // 1. Draw the central glow
    baseGraphic.beginFill(color, 0.2); 
    baseGraphic.drawCircle(0, 0, outerRadius / 1.5);
    baseGraphic.endFill();

    // 2. Draw the core structure (8-pointed star)
    const points = [];
    const numPoints = 8;
    for (let i = 0; i < numPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / numPoints;
        points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    
    baseGraphic.beginFill(0x4A4E69, 1.0); 
    baseGraphic.drawPolygon(points);
    baseGraphic.endFill();

    // 3. Draw the center light/core
    baseGraphic.beginFill(color, 1.0);
    baseGraphic.drawCircle(0, 0, innerRadius / 2);
    baseGraphic.endFill();
    
    // 4. Draw the influence range (translucent circle)
    baseGraphic.lineStyle(2, color, 0.2); 
    baseGraphic.drawCircle(0, 0, currentHarvesterRange);
    baseGraphic.endFill();
    
    baseGraphic.x = initialX; 
    baseGraphic.y = initialY; 
    
    // Interaction setup for selection (replaces drag)
    baseGraphic.eventMode = 'static';
    baseGraphic.cursor = 'pointer'; 
    baseGraphic.on('pointerdown', onBaseSelect);

    return baseGraphic;
}

function createHarvesterGraphic() {
    const harvesterGraphic = new PIXI.Graphics();
    const bodyColor = 0x8C7AE6; 
    const thrusterColor = 0xFF8C00; 
    const shipSize = PLAYER_SIZE * 1.5;

    // 1. Draw the ship body (Delta Wing)
    harvesterGraphic.beginFill(bodyColor); 
    harvesterGraphic.moveTo(0, -shipSize);      
    harvesterGraphic.lineTo(shipSize * 0.7, shipSize * 0.5);   
    harvesterGraphic.lineTo(0, shipSize * 0.3); 
    harvesterGraphic.lineTo(-shipSize * 0.7, shipSize * 0.5);  
    harvesterGraphic.closePath();
    harvesterGraphic.endFill();

    // 2. Draw the thruster exhaust 
    harvesterGraphic.beginFill(thrusterColor);
    harvesterGraphic.drawRect(-3, shipSize * 0.5, 6, shipSize * 0.5);
    harvesterGraphic.endFill();

    return harvesterGraphic;
}

function createFuelBarGraphic() {
    const bar = new PIXI.Graphics();
    bar.lineStyle(1, 0x4A4E69); // Dark grey border
    bar.drawRect(0, 0, FUEL_BAR_WIDTH, FUEL_BAR_HEIGHT);
    bar.pivot.x = FUEL_BAR_WIDTH / 2; // Center the pivot for easier positioning
    bar.zIndex = 10;
    return bar;
}

function HarvesterFactory(x, y) {
    const harvester = {
        id: `harvester-${nextHarvesterId++}`,
        x: x,
        y: y,
        sprite: createHarvesterGraphic(),
        fuelBar: createFuelBarGraphic(),
        
        // Individual state for the harvester
        currentFuel: BASE_FUEL_CAPACITY, 
        maxFuel: BASE_FUEL_CAPACITY,
        isRefueling: false,
        
        state: 'IDLE', // IDLE, MOVING_TO_RESOURCE, RETURNING_TO_BASE, etc.
        targetResource: null,
        currentBase: homeBase,
        collectedInTrip: 0,
        lastActionTime: 0,
    };
    
    // Set initial position
    harvester.sprite.x = x;
    harvester.sprite.y = y;
    
    return harvester;
}

function createResource(x, y, isFragment = false, centerX = 0, centerY = 0) {    const uniqueId = Math.random() * 1000000; 

    // --- NEW LOGIC START ---
    let actualSize;
    let health;
    let maxHealth;
    let reward;
    
    if (isFragment) {
        actualSize = RESOURCE_SIZE_FRAGMENT;
        health = 1; 
        maxHealth = 1;
        reward = 1;
    } else {
        // 1. Generate a random size factor
        const sizeFactor = MIN_ASTEROID_SIZE_FACTOR + 
            Math.random() * (MAX_ASTEROID_SIZE_FACTOR - MIN_ASTEROID_SIZE_FACTOR);
            
        // 2. Calculate Size, Health, and Reward based on factor
        actualSize = RESOURCE_SIZE_ASTEROID * sizeFactor;
        health = Math.floor(sizeFactor * HEALTH_PER_SIZE); 
        maxHealth = health; // Store initial health
        reward = Math.floor(sizeFactor * REWARD_PER_SIZE); 
    }
    // --- NEW LOGIC END ---

    // Pass the calculated size to the graphic creator
    const sprite = createResourceGraphic(isFragment, actualSize); 
    
    if (x !== undefined && y !== undefined) {
        // Use explicit coordinates (used when spawning fragments)
        sprite.x = x;
        sprite.y = y;
    } else {
        // Spawn randomly within the local radius around the center point (used for new asteroids)
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * LOCAL_SPAWN_RADIUS;
        
        sprite.x = centerX + Math.cos(angle) * radius;
        sprite.y = centerY + Math.sin(angle) * radius;
    }
    
    worldContainer.addChild(sprite);

    // Update the returned resource object to store all properties
    return {
        id: uniqueId,
        sprite: sprite,
        x: sprite.x,
        y: sprite.y,
        isFragment: isFragment,
        size: actualSize, // NEW: Store size for collision checks
        health: health, 
        maxHealth: maxHealth, // NEW: Max Health for alpha calculation
        reward: reward, // NEW: Reward for collection
    };
}

function initResources() {
    resources.forEach(r => {
        if (r.sprite.parent) {
            worldContainer.removeChild(r.sprite);
        }
    });
    resources = []; 
    // Get the position of the first base (Home Base at 0, 0)
    const homeBase = bases[0] || {x: 0, y: 0};
    
    // Spawn around the home base
    for (let i = 0; i < INITIAL_DOTS_SPAWN; i++) {
        // Pass base coordinates as center X/Y
        resources.push(createResource(undefined, undefined, false, homeBase.x, homeBase.y));
    }
}

function initPlayer() {
    const initialX = 0;
    const initialY = 0;
    
    const homeBase = createBaseGraphic(0xFF79C6, initialX, initialY); 
    homeBase.name = 'Base 1 (Home)';
    bases.push(homeBase); 
    
    // Set the home base as the initial active base
    activeBase = homeBase;
    activeBase.alpha = 0.5; // Visually indicate active base

    player.sprite = createHarvesterGraphic();
    player.sprite.x = initialX;
    player.sprite.y = initialY;
    worldContainer.addChild(player.sprite);
    player.x = initialX;
    player.y = initialY;
    currentBase = homeBase;
}

// --- Base Selection & Movement Logic ---

function onBaseSelect(event) {
    const base = event.target;
    // Visually highlight the active base
    bases.forEach(b => b.alpha = 1.0);
    base.alpha = 0.5;
    
    // Set the new active base
    activeBase = base;
}

function setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
        keyState[e.code] = true;
        // Prevent default for WASD to avoid browser scroll
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', (e) => {
        keyState[e.code] = false;
    });
}

function moveActiveBase(deltaMS) {
    if (!activeBase) return;

    let dx = 0;
    let dy = 0;
    // Convert speed from units/second to units/frame
    const step = BASE_MOVEMENT_SPEED * (deltaMS / 1000); 

    if (keyState['KeyW']) dy -= step;
    if (keyState['KeyS']) dy += step;
    if (keyState['KeyA']) dx -= step;
    if (keyState['KeyD']) dx += step;

    if (dx !== 0 || dy !== 0) {
        activeBase.x += dx;
        activeBase.y += dy;
        
        // Snap camera to the base being moved
        snapTo(activeBase.x, activeBase.y); 
        
        // Important: force redraw of connections and range
        drawBaseConnections(); 
    }
    if (activeBase.sprite) {
        activeBase.sprite.x = activeBase.x;
        activeBase.sprite.y = activeBase.y;
    }
}


// --- Base Laser (Bullet) & Resource Splitting Logic (MODIFIED) ---

function splitResource(resource) {
    const originalPos = { x: resource.x, y: resource.y };
    
    // 1. Remove original resource
    if (resource.sprite.parent) {
        worldContainer.removeChild(resource.sprite);
    }
    resources = resources.filter(r => r.id !== resource.id);

    // 2. Create fragments around the position
    for (let i = 0; i < FRAGMENTS_PER_HIT; i++) {
        // Spawn fragments in a small circle around the hit point
        const angle = (i / FRAGMENTS_PER_HIT) * Math.PI * 2;
        const radius = RESOURCE_SIZE_ASTEROID * 1.5;
        const x = originalPos.x + Math.cos(angle) * radius * (Math.random() * 0.5 + 0.5); 
        const y = originalPos.y + Math.sin(angle) * radius * (Math.random() * 0.5 + 0.5);
        
        resources.push(createResource(x, y, true)); // true for isFragment
    }
}

// Fires a single bullet towards the target coordinates
function fireBullet(base, targetX, targetY) {
    const startX = base.x;
    const startY = base.y;

    // 1. Calculate the initial angle towards the mouse target
    let angle = Math.atan2(targetY - startY, targetX - startX);

    // 2. Apply spread deviation based on current Accuracy upgrade
    const actualSpread = getUpgrade('accuracy').currentValue; 
    // Random number between -actualSpread and +actualSpread
    const spreadAngle = (Math.random() * 2 - 1) * actualSpread;
    // Convert degrees to radians and add to the angle
    angle += spreadAngle * (Math.PI / 180); 

    // 3. Recalculate direction vector with the new, spread angle
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    const sprite = createBulletGraphic();
    sprite.x = startX;
    sprite.y = startY;
    worldContainer.addChild(sprite);

    bullets.push({
        sprite: sprite,
        x: startX,
        y: startY,
        dirX: dirX,
        dirY: dirY,
        initialX: startX, 
        initialY: startY, 
        maxRange: BASE_LASER_RANGE, 
        isAlive: true
    });
}

// Updates all bullets and checks for collisions
function updateBullets(deltaMS) {
    const step = BULLET_SPEED * (deltaMS / 1000); 
    const resourceCollectionRadius = RESOURCE_SIZE_ASTEROID * 0.75; // Small buffer for hit detection
    const laserDamage = getUpgrade('damage').currentValue; // Get current damage

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 1. Move
        bullet.x += bullet.dirX * step;
        bullet.y += bullet.dirY * step;
        
        bullet.sprite.x = bullet.x;
        bullet.sprite.y = bullet.y;
        bullet.sprite.rotation = Math.atan2(bullet.dirY, bullet.dirX) + Math.PI / 2;

        // 2. Range Check
        const distFromStart = distance({x: bullet.initialX, y: bullet.initialY}, bullet);
        if (distFromStart > bullet.maxRange) {
            bullet.isAlive = false;
        }

        // 3. Collision Check (Only check large resources/Asteroids)
        let hitResource = null;
            for (const resource of resources) {
                // Must be a large resource (Asteroid) and not a fragment
                if (!resource.isFragment) {
                    // ** CHANGE: Use the resource's stored size for collision radius **
                    const resourceCollectionRadius = resource.size * 0.75; 
                    const distToResource = distance(bullet, resource.sprite);
                    
                    if (distToResource < resourceCollectionRadius) {
                        hitResource = resource;
                        bullet.isAlive = false; // Destroy bullet on collision
                        break;
                    }
                }
            
            }
        
        // 4. Handle Hit/Cleanup
        if (hitResource) {
            const laserDamage = getUpgrade('damage').currentValue; // This line remains the same
            
            // Apply damage
            hitResource.health -= laserDamage;
            
            // Visual feedback: Adjust alpha based on remaining health
            // ** CHANGE: Use maxHealth (the initial health) for the ratio **
            hitResource.sprite.alpha = 0.5 + (hitResource.health / hitResource.maxHealth) * 0.5;

            // Check if destroyed
            if (hitResource.health <= 0) {
                splitResource(hitResource);
            }
        }

        // 5. Remove dead bullets
        if (!bullet.isAlive) {
            if (bullet.sprite.parent) {
                worldContainer.removeChild(bullet.sprite);
            }
            bullets.splice(i, 1);
        }
    }
}


// --- Dragging Logic ---

function drawBaseConnections() {
    if (!roadGraphics) return;
    roadGraphics.clear();
    if (bases.length < 2) return;
    roadGraphics.lineStyle(2, 0x4A4E69, 0.7); 

    for (let i = 0; i < bases.length; i++) {
        for (let j = i + 1; j < bases.length; j++) {
            const baseA = bases[i];
            const baseB = bases[j];
            const dist = distance(baseA, baseB);
            if (dist <= MAX_BASE_LINK_DISTANCE) {
                roadGraphics.moveTo(baseA.x, baseA.y);
                roadGraphics.lineTo(baseB.x, baseB.y);
            }
        }
    }
    // Update all base graphics to reflect new range instantly
    bases.forEach(base => {
        if (base.children.length > 0) { 
            const rangeCircle = base.children.find(child => child instanceof PIXI.Graphics && child.line.width > 0);
            if(rangeCircle) {
                rangeCircle.clear(); 
                rangeCircle.lineStyle(2, base.children[2].tint, 0.2);
                rangeCircle.drawCircle(0, 0, currentHarvesterRange);
                rangeCircle.endFill();
            }
        }
    });
}

// --- Game Logic ---

function findNextTargetBase(harvester) {
    // All properties (range, capacity) are now derived from the harvester's context
    const currentHarvesterRange = getUpgrade('harvester-range')?.currentValue || HARVESTER_RANGE;
    
    // Find a local resource near the harvester's current base
    // NEW: Pass the Harvester object to the helper function
    let localResource = findLocalResource(harvester, harvester.currentBase, currentHarvesterRange); 
    
    if (localResource) {
        return { type: 'RESOURCE', target: localResource, nextBase: harvester.currentBase };
    } 

    // Find a resource via a linked base (for bases outside of range)
    for (const targetBase of bases) {
        if (targetBase === harvester.currentBase) continue;
        
        const distToTargetBase = distance(harvester.currentBase, targetBase); 
        
        if (distToTargetBase <= MAX_BASE_LINK_DISTANCE) {
            // Find resource near the remote base
            const remoteResource = findLocalResource(harvester, targetBase, currentHarvesterRange); 
            if (remoteResource) {
                return { type: 'BASE_LINK', target: targetBase, nextBase: targetBase };
            }
        }
    }
    return null;
}

function isNearBase(harvester) {
    // REFUEL_RANGE is now a constant defined earlier
    for (const base of bases) { 
        if (distance(harvester, base) <= REFUEL_RANGE) {
            return true;
        }
    }
    return false;
}

function findLocalResource(harvester, base, range) {
    let nearest = null;
    let minDistance = Infinity;
    const canHarvestLargeResources = getUpgrade('large-haul').currentValue; // This remains a global capability for now

    for (const resource of resources) {
        // 1. SAFETY CHECK: Ensure the resource and its sprite are valid
        if (!resource || !resource.sprite) continue; 
        
        // 2. Check distance from the BASE (range limit)
        const distToResourceFromBase = distance(base, resource.sprite); 
        
        // 3. Check if the harvester *can* collect this resource type
        const canCollect = resource.isFragment || canHarvestLargeResources;

        if (canCollect && distToResourceFromBase <= range) {
            
            // 4. Determine which resource is closest to the HARVESTER (current location)
            const distToHarvester = distance(harvester.sprite, resource.sprite); 
            
            if (distToHarvester < minDistance) {
                minDistance = distToHarvester;
                nearest = resource;
            }
        }
    }
    return nearest;
}

function moveToTarget(harvester, target, onArrival) {
    if (!target || isPanning) return; // isPanning check is fine

    const dx = target.x - harvester.x;
    const dy = target.y - harvester.y;
    const dist = distance(harvester, target); // Assumes distance utility is available

    const speed = getUpgrade('speed').currentValue; // Speed is still a global upgrade
    
    const fullStepDistance = Math.min(dist, speed); 
    const fullFuelCost = fullStepDistance * FUEL_CONSUMPTION_RATE;

    if (dist < speed) {
        harvester.x = target.x;
        harvester.y = target.y;
        onArrival(harvester); // Pass harvester back to callback
        return;
    }
    
    // --- PER-SHIP FUEL LOGIC START ---
    let actualMoveDistance = fullStepDistance;
    let fuelCost = fullFuelCost;
    let outOfFuel = false;
    
    if (harvester.currentFuel < fullFuelCost) { // Check fuel on the harvester object
        actualMoveDistance = harvester.currentFuel / FUEL_CONSUMPTION_RATE;
        fuelCost = harvester.currentFuel;
        outOfFuel = true;
    }
    
    // Deduct fuel from the player object
    harvester.currentFuel -= fuelCost;    // --- PER-SHIP FUEL LOGIC END ---
    
    if (actualMoveDistance > 0) {
        const angle = Math.atan2(dy, dx);
        
        harvester.x += Math.cos(angle) * actualMoveDistance;
        harvester.y += Math.sin(angle) * actualMoveDistance;
        
        // Update both sprites
        harvester.sprite.x = harvester.x;
        harvester.sprite.y = harvester.y;
        
        harvester.sprite.rotation = angle + Math.PI / 2; 
    }

    if (outOfFuel) {
        harvester.currentFuel = 0;
        console.warn(`${harvester.id} ran out of fuel! Forcing return to base.`);
        
        // Update harvester's state
        harvester.state = 'RETURNING_TO_BASE';
        harvester.targetResource = null;
    }
}

function snapTo(x, y) {
    if (!worldContainer) return;
    currentWidth = window.innerWidth;
    currentHeight = window.innerHeight;

    worldContainer.position.set(
        currentWidth / 2 - x * currentZoom,
        currentHeight / 2 - y * currentZoom
    );
}

function snapToHomeBase() {
    snapTo(homeBase.x, homeBase.y);
}

function updateFuelBar(harvester) {
    const bar = harvester.fuelBar;
    bar.clear();
    
    // Position the bar relative to the ship
    bar.x = harvester.x;
    bar.y = harvester.y + FUEL_BAR_OFFSET_Y;

    const fuelRatio = harvester.currentFuel / harvester.maxFuel;
    const fuelColor = fuelRatio > 0.5 ? 0x00FF00 : // Green
                      fuelRatio > 0.2 ? 0xFFFF00 : // Yellow
                      0xFF0000;                      // Red

    // Draw background (empty fuel)
    bar.beginFill(0x333333);
    bar.drawRect(0, 0, FUEL_BAR_WIDTH, FUEL_BAR_HEIGHT);
    bar.endFill();

    // Draw filled fuel
    bar.beginFill(fuelColor);
    bar.drawRect(0, 0, FUEL_BAR_WIDTH * fuelRatio, FUEL_BAR_HEIGHT);
    bar.endFill();
    
    // Draw border
    bar.lineStyle(1, 0x4A4E69);
    bar.drawRect(0, 0, FUEL_BAR_WIDTH, FUEL_BAR_HEIGHT);
}


// --- Game Loop (Pixi Ticker) ---
// --- Game Loop (Pixi Ticker) ---
function gameLoop(delta) {
    const deltaMS = app.ticker.deltaMS;
    const deltaTime = deltaMS / 1000; // Delta in seconds
    const now = performance.now();
    
    // 0. Base Controls and Actions (Non-Harvester Specific)
    moveActiveBase(deltaMS); // Moves the currently selected base (if applicable)

    // Bullet Firing Logic (usually tied to a base/activeBase)
    const actualFireRate = getUpgrade('fire-rate').currentValue;
    if (activeBase && lastFireTime + actualFireRate < performance.now()) {
        // Assuming this fires from the activeBase towards mouseWorldX/Y
        fireBullet(activeBase, mouseWorldX, mouseWorldY);
        lastFireTime = performance.now();
    }
    
    updateBullets(deltaMS);
    
    // DYNAMIC RESOURCE SPAWNING LOGIC (Global)
    timeSinceLastSpawn += deltaMS; 
    const actualSpawnInterval = getUpgrade('spawn').currentValue;

    if (resources.length < DOT_COUNT && timeSinceLastSpawn >= actualSpawnInterval) {
        // Local spawning logic using a random base
        if (bases.length > 0) {
            const targetBase = bases[Math.floor(Math.random() * bases.length)];
            resources.push(createResource(undefined, undefined, false, targetBase.x, targetBase.y)); 
        } else {
            resources.push(createResource(undefined, undefined, false, homeBase.x, homeBase.y));
        }
        timeSinceLastSpawn = 0; 
    }
    
    drawBaseConnections(); 
    
    if (isPanning) return; // Stop game logic if the map is being dragged

    // ===============================================
    // START: HARVESTER LOOP (The Multi-Unit Engine)
    // ===============================================
    
    harvesters.forEach(harvester => {
        
        // --- 1. REFUELING CHECK & LOGIC ---
        const isNearBaseNow = isNearBase(harvester);
        
        if (isNearBaseNow) {
            harvester.isRefueling = true;
            
            if (harvester.currentFuel < harvester.maxFuel) {
                const fuelGained = REFUEL_RATE_PER_SEC * deltaTime;
                harvester.currentFuel = Math.min(harvester.maxFuel, harvester.currentFuel + fuelGained);
            }
            
            // Halt activity if refueling is necessary and in an idle state
            if (harvester.currentFuel < harvester.maxFuel && (harvester.state === 'IDLE' || harvester.state === 'RETURNING_TO_BASE')) {
                // Prevents unit from starting a new trip while low on fuel at base
                // Assumes game flow handles skipping movement below.
            }

        } else {
            harvester.isRefueling = false;
        }

        // --- 2. GAME STATE LOGIC ---
        if (harvester.state === 'IDLE') {
            
            // Check for low fuel & force return
            const MIN_FUEL_FOR_TRIP = harvester.maxFuel * 0.05; 
            if (harvester.currentFuel < MIN_FUEL_FOR_TRIP) {
                 // Force return to nearest base/home base
                 harvester.state = 'RETURNING_TO_BASE'; 
                 return; // Skip finding a resource this tick
            } 
            
            // Harvester is ready to work (Assuming a global GAME_IDLE_DELAY is still used for simplicity)
           if (now - harvester.lastActionTime > GAME_IDLE_DELAY || harvester.lastActionTime === 0) { 
                
                const nextAction = findNextTargetBase(harvester);

                if (nextAction) {
                    harvester.currentBase = nextAction.nextBase; 

                    if (nextAction.type === 'RESOURCE') {
                        harvester.targetResource = nextAction.target;
                        harvester.state = 'MOVING_TO_RESOURCE';
                        console.log(`[${harvester.id}] IDLE -> MOVING_TO_RESOURCE. Target found.`);
                    } else if (nextAction.type === 'BASE_LINK') {
                        harvester.targetResource = {x: nextAction.target.x, y: nextAction.target.y}; 
                        harvester.state = 'MOVING_TO_BASE_LINK';
                        console.log(`[${harvester.id}] IDLE -> MOVING_TO_BASE_LINK. Target found.`);
                    }
                } else {
                    // CRITICAL FIX: DO NOT reset lastActionTime here.
                    // If no target is found, let it check again next frame instantly 
                    // until a resource spawns or the player moves the base.
                    console.log(`[${harvester.id}] IDLE. No targets found. Checking again next frame.`);
                }
            }
        }

        // --- 3. Move/Collect ---
        if (harvester.state === 'MOVING_TO_RESOURCE' && harvester.targetResource) {

            // CRITICAL FIX: Validate target existence against the global resource list
            const targetStillExists = resources.some(r => r.id === harvester.targetResource.id);
            
            if (!targetStillExists) {
                // Target disappeared (collected by another unit or destroyed)
                harvester.targetResource = null;
                harvester.state = 'IDLE'; // Switch to IDLE to look for a new resource
                return; // Skip further movement logic this tick
            }
            
            // Move Harvester (Fuel consumption and out-of-fuel logic is inside moveToTarget)
            moveToTarget(harvester, harvester.targetResource, (arrivedHarvester) => {
                
                const collectedInTripMax = getUpgrade('cargo-capacity').currentValue; 
                
                // CRITICAL FIX: Check collectedInTrip on the correct object and correct property.
                if (arrivedHarvester.collectedInTrip >= collectedInTripMax) { 
                    // Case 1: Cargo full
                    arrivedHarvester.state = 'RETURNING_TO_BASE';
                    arrivedHarvester.targetResource = null; 
                    console.log(`[${arrivedHarvester.id}] Arrived & Full. State: RETURNING_TO_BASE.`);
                    return;
                }
                
                // Case 2: Arrived, cargo NOT full: look for a new local resource
                const currentHarvesterRange = getUpgrade('harvester-range').currentValue; 
                
                // Note: findLocalResource uses the harvester's current location/base as the reference point
                arrivedHarvester.targetResource = findLocalResource(arrivedHarvester, arrivedHarvester.currentBase, currentHarvesterRange); 
                
                if (arrivedHarvester.targetResource) {
                    // New target found: The state remains MOVING_TO_RESOURCE, and moveToTarget will run with the NEW target next frame.
                    console.log(`[${arrivedHarvester.id}] Arrived. Found new local target. Continuing move.`);
                } else {
                    // No new resource found nearby: return to base
                    arrivedHarvester.state = 'RETURNING_TO_BASE'; 
                    console.log(`[${arrivedHarvester.id}] Arrived. No new targets. State: RETURNING_TO_BASE.`);
                }
            });

            // Continuous Collection (Must update the global resources array)
            resources = resources.filter(resource => {
                
                // Distance check between harvester and resource
                const collectionRadius = PLAYER_SIZE + (resource.isFragment ? RESOURCE_SIZE_FRAGMENT : resource.size); 
                const dist = distance(harvester.sprite, resource.sprite); 
                
                const canCollect = resource.isFragment || canHarvestLargeResources;

                if (canCollect && dist < collectionRadius) {
                    worldContainer.removeChild(resource.sprite);
                    harvester.collectedInTrip += resource.reward; 
                    
                    // If the collected resource was THIS harvester's target, clear it
                    if (harvester.targetResource && harvester.targetResource.id === resource.id) {
                         harvester.targetResource = null; // Clear target immediately
                    }
                    
                    return false; // Remove the collected resource from the global array
                }
                return true; // Keep the resource
            });


            if (!harvester.targetResource) {
                // If the target was cleared during the continuous collection filter above, 
                // the harvester must immediately transition to look for the next action.
                harvester.state = 'IDLE'; 
                console.log(`[${harvester.id}] Target collected during filter. State: IDLE.`);
                // We use IDLE here, not RETURNING_TO_BASE, because it will immediately run the IDLE check next frame.
            } else if (harvester.collectedInTrip >= collectedInTripMax) {
                harvester.state = 'RETURNING_TO_BASE';
                harvester.targetResource = null;
                console.log(`[${harvester.id}] Max cargo check triggered. State: RETURNING_TO_BASE.`);
            }
        }
        
        // 4. Move to Linked Base
        if (harvester.state === 'MOVING_TO_BASE_LINK' && harvester.targetResource) {
            moveToTarget(harvester, harvester.targetResource, (arrivedHarvester) => {
                arrivedHarvester.targetResource = null;
                arrivedHarvester.state = 'IDLE'; 
                arrivedHarvester.lastActionTime = performance.now(); // <-- FIX: Reset individual timer
            });
        }

        // 5. Return to Base 
        if (harvester.state === 'RETURNING_TO_BASE') {
            
            // CRITICAL FIX: Define depositTarget before it's used
            const depositTarget = harvester.currentBase || homeBase; 
            
            // Log target for debugging (Optional, but good practice)
            console.log(`[${harvester.id}] Returning to: ${depositTarget.name || 'Home Base'}`);
            
            moveToTarget(harvester, depositTarget, (arrivedHarvester) => {
                // Deposit score
                score += arrivedHarvester.collectedInTrip;
                
                arrivedHarvester.collectedInTrip = 0; 
                arrivedHarvester.state = 'IDLE';
                arrivedHarvester.lastActionTime = performance.now(); 
                updateUpgradeButtons();
                console.log(`[${arrivedHarvester.id}] Deposit complete. State: IDLE.`);
            });
        }
        
        // --- 6. RENDER ---
        updateFuelBar(harvester);
    });
    
}

// --- Upgrade Functions ---

function setActiveTab(tabName) {
    
    
    if (activeTab === tabName) return;
    
    // NEW: Save the state for the current main tab
    if (activeMainTab === 'upgrades' || activeMainTab === 'research') {
         lastActiveSubgroup[activeMainTab] = tabName;
    }
    // Select all tab buttons to update their classes
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('tab-active');
        } else {
            button.classList.remove('tab-active');
        }
    });

    // Re-render the content for the new tab (This is what draws the subgroups)
    activeTab = tabName;
    renderUpgradePanel();
}

function toggleUpgradePanel() {
    isPanelOpen = !isPanelOpen;
    
    // 1. Get the main panel element
    const panel = document.getElementById('game-panel');
    if (!panel) return; 

    // 2. Toggle the visual state
    if (isPanelOpen) {
        // OPEN: Remove the class to trigger the full-screen expansion CSS
        panel.classList.remove('panel-collapsed');
        // No icon change here; the button text handles it.
        
        // CRITICAL: Render the content of the currently active main tab when opening
        renderUpgradePanel(); 
    } else {
        // CLOSE: Add the class to shrink it back to the top-right
        panel.classList.add('panel-collapsed');
        // No icon change here.
    }
    

}



function updateUpgradeButtons() {
    if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();

    UPGRADES.forEach(upgrade => {
        const button = document.getElementById(`upgrade-${upgrade.id}`);
        const costDisplay = document.getElementById(`${upgrade.id}-cost`);
        const levelDisplay = document.getElementById(`${upgrade.id}-level`);
        const buttons = upgradePanelContent.querySelectorAll('.upgrade-button');
        const isDisabled = upgrade.cost === Infinity || score < upgrade.cost;
        
        buttons.forEach(button => {
            const key = button.getAttribute('data-key');
            const upgrade = getUpgradeById(key); // Use utility to get the object
            
            // Safety check for null/undefined before accessing properties
            if (!upgrade) {
                button.disabled = true; 
                button.textContent = "Error";
                return;
            }
        });
        if (button) {
            button.disabled = isDisabled;
            if (upgrade.id === 'large-haul' && upgrade.level > 0) {
                button.textContent = 'PURCHASED';
            } else if(costDisplay) {
                 button.innerHTML = `Cost: <span id="${upgrade.id}-cost">${upgrade.cost.toLocaleString()}</span> Crystals`;
            }
        }
        if (costDisplay) {
            costDisplay.textContent = upgrade.cost.toLocaleString();
        }
        if (levelDisplay) {
            levelDisplay.textContent = upgrade.level;
        }
    });

    // Handle special purchase (New Base)
    if (newBaseButton) {
        newBaseButton.disabled = score < baseCost;
    }
    if (newBaseCostDisplay) {
        newBaseCostDisplay.textContent = baseCost.toLocaleString();
    }
    if (baseCountDisplay) {
        baseCountDisplay.textContent = baseCount;
    }
    if (zoomLevelDisplay) { 
        zoomLevelDisplay.textContent = `${currentZoom.toFixed(2)}x`;
    }
}
function handleUpgradePurchase(event) {
    // 1. Get the ID string from the button's data-key attribute
    const upgradeId = event.currentTarget.getAttribute('data-key');
    
    // 2. Call your purchase logic using the ID
    purchaseUpgrade(upgradeId); 
    
    // 3. The purchase logic updates buttons, but we need to ensure the card visually updates:
    renderUpgradePanel(); 
}

function handleUpgradePurchase(event) {
    // CRITICAL FIX: We MUST extract the STRING ID from the button's data attribute.
    const upgradeId = event.currentTarget.getAttribute('data-key');
    
    // Safety check: ensure we got a string
    if (typeof upgradeId !== 'string' || !upgradeId) {
        console.error("Button is missing the upgrade ID (data-key attribute).");
        return;
    }
    
    // Now pass the clean ID string to the purchase logic
    purchaseUpgrade(upgradeId); 
    
    // Re-render the panel to show the new level/cost
    renderUpgradePanel(); 
}

function purchaseUpgrade(upgradeId) {
    const upgrade = getUpgradeById(upgradeId);

    if (!upgrade) {
        // This log confirms the [object Object] error is now fixed,
        // as it will only log if the ID is truly missing (which it shouldn't be now)
        console.error(`Upgrade with ID ${upgradeId} not found.`); 
        return;
    }

    
        
    if (score >= upgrade.cost) {
        score -= upgrade.cost;
        upgrade.level++;
        
        upgrade.currentValue = upgrade.effect(upgrade.level);
        
        // SPECIAL CASE: Update game state variables
        if (upgradeId === 'capacity') {
            collectedInTripMax = upgrade.currentValue;
        } else if (upgradeId === 'harvester-range') {
            currentHarvesterRange = upgrade.currentValue;
        } else if (upgradeId === 'large-haul') { 
            canHarvestLargeResources = upgrade.currentValue;
            upgrade.cost = Infinity; 
        }

        if (upgradeId === 'new-harvester') {
            spawnNewHarvester()
            upgrade.currentValue = harvesters.length;
        } else {
            upgrade.currentValue = calculateUpgradeValue(upgrade); 
        }

        // 2. Recalculate the next cost
        if (upgrade.costFormula) {
             upgrade.cost = upgrade.costFormula(upgrade.cost);
        }
        
        updateUpgradeButtons();
        drawBaseConnections(); 
    }
}

function purchaseNewBase() {
    if (score >= baseCost) {
        score -= baseCost;
        baseCount++;
        const newBase = createBaseGraphic(0xFFE470, homeBase.x + 400, homeBase.y + 400); 
        newBase.name = `Base ${baseCount}`;
        bases.push(newBase);
        baseCost = Math.floor(baseCost * 2.5); 
        updateUpgradeButtons();
        drawBaseConnections(); 
        
        onBaseSelect({ target: newBase });
    }
}

let nextBaseCount = 1;

function createBase(x, y, color) {
    // Assuming createBaseGraphic() handles the PIXI sprite creation and returns the sprite object.
    const sprite = createBaseGraphic(color, x, y); 
    
    // Create the base object, linking the PIXI sprite to the game state.
    const base = {
        id: `base-${nextBaseCount++}`,
        name: `Base ${nextBaseCount - 1}`, // Names will be 1-indexed
        x: x,
        y: y,
        sprite: sprite, // The PIXI sprite object
        isActive: false,
        // Add any other properties a base needs (e.g., links, defense rating, etc.)
    };

    // If this is the very first base (Home Base), give it a special ID and name.
    if (bases.length === 0) {
        base.id = 'base-home';
        base.name = 'Home Base';
    }
    
    // Set the base's position to the PIXI sprite's position (redundant if done by createBaseGraphic, but safe)
    base.sprite.x = x;
    base.sprite.y = y;
    
    // No need to push to 'bases' here; the calling function (init/purchase) handles that.
    if (worldContainer) {
        worldContainer.addChild(base.sprite);
    } else {
        // Fallback or error state, but it should be defined if called from initializePixi
        console.error("worldContainer not defined when trying to add base sprite!");
    }
    return base;
}

// --- Dynamic HTML Rendering for Upgrades (UNCHANGED) ---

function createUpgradeCardHTML(id, upgrade) { 
    // CRITICAL SAFETY CHECK: If the upgrade object is missing, stop rendering the card.
    if (!upgrade || typeof upgrade !== 'object') {
        console.error(`Cannot render upgrade card: Missing data for ID: ${id}`);
        return ''; 
    }
    
    // --- NEW LOGIC TO CHECK AFFORDABILITY ---
    // Assumes 'score' is a globally accessible variable holding player resources.
    const canAfford = (score >= upgrade.cost); 
    
    // Apply the 'disabled' attribute and CSS class conditionally
    const disabledAttr = canAfford ? '' : 'disabled';
    
    // Use the variable that is guaranteed to be a number (0 if cost was missing)
    const currentCost = upgrade.cost || 0; 
    const costFormatted = currentCost.toLocaleString('en-US'); 

    const currentLevel = upgrade.level || 0;
    const levelFormatted = currentLevel.toLocaleString('en-US'); 
    
    // ... rest of the function ...
    
    return `
        <div id="upgrade-${id}" class="upgrade-card">
            <h4>${upgrade.name} (Lvl ${levelFormatted})</h4>
            <p>Effect: ${upgrade.description}</p>
            <p>Cost: ${costFormatted} <span class="text-yellow-400">Crystals</span></p>
            
            <button class="upgrade-button" data-key="${id}" ${disabledAttr}>
                Buy
            </button>
        </div>
    `;
}

function createTabs() {
    tabContainer.innerHTML = '';
    
    if (activeMainTab !== 'upgrades') {
        tabContainer.innerHTML = ''; // Clear sub-tabs if we are on Research
        return;
    }

    // NEW: Get tabs dynamically from the data
    const tabs = getUniqueTabNames(); 
    
    tabs.forEach(tabName => {
        const button = document.createElement('button');
        button.className = 'tab-button';
        // Capitalize the first letter for display
        button.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1); 
        button.setAttribute('data-tab', tabName);
        
        // Attach the listener
        button.addEventListener('click', () => setActiveTab(tabName));
        tabContainer.appendChild(button);
    });
}

// --- Utility to get unique tab names from upgrades data ---
function getUniqueTabNames() {
    const tabNames = new Set();
    // Use the global array UPGRADES
    if (typeof UPGRADES === 'undefined' || UPGRADES.length === 0) {
        return [];
    }
    
    UPGRADES.forEach(upgrade => {
        if (upgrade.group) { // Use 'group' property for tab name
            tabNames.add(upgrade.group);
        }
    });
    
    // Convert Set to Array and sort for consistent order
    return Array.from(tabNames).sort();
}

function toggleMainTab(newMainTab) {
    
    // --- Logic 1: Toggle the panel if clicking the already active tab ---
    if (newMainTab === activeMainTab) {
        // Toggles isPanelOpen and the panel class
        toggleUpgradePanel(); 
        return;
    }

    // --- Logic 2: Switch the tab if clicking an inactive tab ---
    
    // a. Switch the tab state
    activeMainTab = newMainTab;
    
    // b. Update button visuals (Use CSS classes/color, no arrow)
    const upgradesBtn = document.getElementById('tab-upgrades');
    const researchBtn = document.getElementById('tab-research');
    
    upgradesBtn.classList.remove('tab-active');
    researchBtn.classList.remove('tab-active');
    document.getElementById(`tab-${newMainTab}`).classList.add('tab-active');

    // c. Manage sub-tab visibility and content + RESTORE SUBGROUP STATE
    if (activeMainTab === 'upgrades') {
        // Show SHIP/WORLD sub-tabs
        tabContainer.style.display = 'flex';
        
        // Restore the last active subgroup for 'upgrades'
        const uniqueNames = getUniqueTabNames(); 
        const restoredTab = lastActiveSubgroup['upgrades'];
        activeTab = uniqueNames.includes(restoredTab) ? restoredTab : uniqueNames[0];
        
        createTabs(); // Must be called after activeTab is set
    } else if (activeMainTab === 'research') {
        // Hide sub-tabs for Research
        tabContainer.style.display = 'none';
        tabContainer.innerHTML = '';
        
        // Restore the last active subgroup for 'research'
        const restoredTab = lastActiveSubgroup['research'];
        activeTab = restoredTab || 'GENERAL'; 
    }
    
    // d. CRITICAL FIX: Ensure the panel is OPEN when switching to a NEW tab.
    if (!isPanelOpen) {
        // If the panel was closed, open it now by toggling.
        toggleUpgradePanel(); 
    } else {
        // If the panel was already open, just re-render the new content.
        renderUpgradePanel();
    }
}

function spawnNewHarvester() {
    // Assuming bases[0] is the primary spawn point
    if (!homeBase) {
        console.error("Cannot spawn new harvester: Home Base is not defined.");
        return null;
    }
    // 1. Create the new harvester at the Home Base's location
    const newHarvester = HarvesterFactory(homeBase.x, homeBase.y); 

    // 2. Add it to the global array
    harvesters.push(newHarvester);

    // 3. Add its graphics (sprite and fuel bar) to the world container
    worldContainer.addChild(newHarvester.sprite);
    worldContainer.addChild(newHarvester.fuelBar);
    
    // Note: The HarvesterFactory should ensure its state is 'IDLE' and currentBase is 'homeBase'.
    
    console.log(`New Harvester spawned: ${newHarvester.id}. Total Harvesters: ${harvesters.length}`);
    
    return newHarvester;
}

// --- Utility to get upgrade object by ID ---
function getUpgradeById(id) {
    if (typeof UPGRADES === 'undefined') return null;
    return UPGRADES.find(upgrade => upgrade.id === id);
}

function renderUpgradePanel() {
    
    // CRITICAL: Filter UPGRADES array based on activeMainTab before grouping
    const upgradesToRender = UPGRADES.filter(upgrade => {
        // Assuming UPGRADES have a 'mainGroup' property set to 'upgrades' or 'research'
        // If your existing UPGRADES only have 'group' (SHIP/WORLD), assume they belong to the 'upgrades' mainGroup.
        const mainGroup = upgrade.mainGroup || 'upgrades'; 
        
        return mainGroup === activeMainTab;
    });

    // 2. Group Upgrades by Subgroup for the Active Tab
    const groupedUpgrades = {};
    
    // Use the filtered array
    upgradesToRender.forEach(upgrade => {
        
        // Use 'group' property for comparison (e.g., SHIP, WORLD)
        if (upgrade.group === activeTab) { 
            
            // ... (rest of the grouping logic remains the same) ...
            const subgroupName = upgrade.subgroup || 'General'; 
            
            if (!groupedUpgrades[subgroupName]) {
                groupedUpgrades[subgroupName] = [];
            }
            groupedUpgrades[subgroupName].push(upgrade);
        }
    });

    // 3. Render Columns (One column per subgroup)
    upgradePanelContent.innerHTML = '';
    
    // Create the container for the new columns
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'upgrade-columns'; // This CSS class still provides the flex layout
    upgradePanelContent.appendChild(columnsContainer);
    
    // Get all subgroup names and sort them (optional, but good for consistent UI)
    const subgroupNames = Object.keys(groupedUpgrades).sort();
    
    subgroupNames.forEach(groupName => {
        const column = document.createElement('div');
        column.className = 'upgrade-column'; 
        
        // Add a header for the subgroup
        const groupHeader = document.createElement('h3');
        groupHeader.className = 'text-lg font-semibold text-indigo-300 mb-2 border-b border-indigo-500/50 pb-1';
        groupHeader.textContent = groupName;
        column.appendChild(groupHeader);
        
        // Add all upgrade cards for this subgroup
        // FIX IS HERE: We iterate over 'upgrade' objects directly, not destructured properties
        groupedUpgrades[groupName].forEach(upgrade => {
            // FIX IS HERE: We pass upgrade.id (as the key) and the upgrade object itself
            const cardHTML = createUpgradeCardHTML(upgrade.id, upgrade); 
            column.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        columnsContainer.appendChild(column);
    });
    
    // 4. Update button states and listeners
    updateUpgradeButtons();
    attachUpgradeListeners(); 
}

function attachUpgradeListeners() {
    // Select all buy buttons inside the dynamically rendered panel content
    const buttons = upgradePanelContent.querySelectorAll('.upgrade-button');
    
    buttons.forEach(button => {
        // Correct: Pass the function reference.
        // The event object is passed automatically when the button is clicked.
        button.removeEventListener('click', handleUpgradePurchase); 
        button.addEventListener('click', handleUpgradePurchase);
        
        // **ERROR SCENARIO WE ARE AVOIDING:** // DO NOT use button.addEventListener('click', purchaseUpgrade(upgrade.id)) 
        // as this executes purchaseUpgrade immediately.
    });
}

function handleUpgradePurchase(event) {
    // The clicked element is event.currentTarget (the <button>).
    
    // We get the STRING ID from the button's attribute.
    const upgradeId = event.currentTarget.getAttribute('data-key');
    
    // Safety check: log what we found before passing it on
    // console.log("Attempting to purchase upgrade with ID:", upgradeId); 
    
    if (typeof upgradeId === 'string' && upgradeId) {
        // Success path: We have the ID string
        purchaseUpgrade(upgradeId); 
        renderUpgradePanel(); 
    } else {
        // Failure path: This is why you see the error.
        console.error("Purchase failed: Could not extract valid string ID from button's data-key attribute.");
        // Log the element for debugging: console.log(event.currentTarget);
    }
}

// --- Initialization & Resizing ---

function handleZoom(event) {
    event.preventDefault(); 
    const direction = event.deltaY < 0 ? 1 : -1; 
    let newZoom = currentZoom + direction * ZOOM_STEP * currentZoom; 
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom !== currentZoom) {
        const oldZoom = currentZoom;
        const scaleChange = newZoom / oldZoom;
        currentZoom = newZoom;
        
        const point = {
            x: event.clientX - app.view.getBoundingClientRect().left - currentWidth / 2,
            y: event.clientY - app.view.getBoundingClientRect().top - currentHeight / 2
        };

        worldContainer.position.x = currentWidth / 2 + (worldContainer.position.x - currentWidth / 2 - point.x) * scaleChange + point.x;
        worldContainer.position.y = currentHeight / 2 + (worldContainer.position.y - currentHeight / 2 - point.y) * scaleChange + point.y;
        
        worldContainer.scale.set(currentZoom);
        
        if (zoomLevelDisplay) {
             zoomLevelDisplay.textContent = `${currentZoom.toFixed(2)}x`;
        }
    }
}


// Function to track mouse position in world coordinates
function onMouseMove(event) {
    if (worldContainer) {
        // Calculate mouse position relative to the world container's origin
        mouseWorldX = (event.clientX - worldContainer.position.x) / currentZoom;
        mouseWorldY = (event.clientY - worldContainer.position.y) / currentZoom;
    }
}

function onPanStart(event) {
    const isOverHUD = !!event.target.closest('#hud-container');
    if (isOverHUD) return;
    isPanning = true;
    lastPanX = event.clientX;
    lastPanY = event.clientY;

}

function onPanEnd() {
    isPanning = false;
}

function onPanMove(event) {
    if (!isPanning) {
        // Always update mouse world position, even when not panning
        onMouseMove(event);
        return;
    }

    const dx = event.clientX - lastPanX;
    const dy = event.clientY - lastPanY;
    worldContainer.position.x += dx;
    worldContainer.position.y += dy;
    lastPanX = event.clientX;
    lastPanY = event.clientY;
    
    // Important: Update mouse world position while panning
    onMouseMove(event); 
}

function initializePixi() {
    try {
        currentWidth = window.innerWidth;
        currentHeight = window.innerHeight;

        app = new PIXI.Application({
            width: currentWidth,
            height: currentHeight,
            background: '#0b0a1a',
            resizeTo: window, 
        });
        
        
        const canvasElement = app.view; 

        if (canvasElement && canvasElement instanceof Node) {
            container.appendChild(canvasElement);
        } else {
            console.error("Pixi failed to create a valid canvas element.");
            return;
        }

        window.addEventListener('resize', handleResize);

       

        worldContainer = new PIXI.Container(); 
        app.stage.addChild(worldContainer);

        initResources(); 
        
        const HOME_BASE_COLOR = 0x8C7AE6; 
        const initialBase = createBase(0, 0, HOME_BASE_COLOR); 
        bases.push(initialBase);
        homeBase = initialBase; 
        
        // FIX 2: Set the home base as the active base immediately
        activeBase = initialBase; // <-- CRITICAL FIX

        roadGraphics = new PIXI.Graphics();
        worldContainer.addChild(roadGraphics); 

        // 2. Spawn the initial harvester at the Home Base
        const initialHarvester = HarvesterFactory(homeBase.x, homeBase.y);
        harvesters.push(initialHarvester);

        worldContainer.addChild(initialHarvester.sprite);
        worldContainer.addChild(initialHarvester.fuelBar);
        
        activeHarvester = initialHarvester;

        

        app.ticker.add(gameLoop);

        snapToHomeBase(); 

        app.view.addEventListener('pointerdown', onPanStart); 
        app.view.addEventListener('pointerup', onPanEnd);
        app.view.addEventListener('pointerupoutside', onPanEnd);
        // MODIFIED: Use the onPanMove for all mouse movement to track world position
        app.view.addEventListener('pointermove', onPanMove);
        app.view.addEventListener('wheel', handleZoom, { passive: false }); 


        setupKeyboardControls();

    } catch (e) {
        console.error("PixiJS Initialization failed:", e);
    }
}



function handleResize() {
    if (app) {
        currentWidth = window.innerWidth;
        currentHeight = window.innerHeight;
        snapToHomeBase(); 
        state = 'IDLE';
        lastActionTime = performance.now();
    }
}


window.onload = function() {
    // Define DOM references
    scoreDisplay = document.getElementById('score-display');
    dotCountDisplay = document.getElementById('dot-count-display');
    zoomLevelDisplay = document.getElementById('zoom-level-display'); 
    snapButton = document.getElementById('snap-to-homebase');
    container = document.getElementById('pixi-canvas-container');
    
    // --- NEW/MODIFIED REFERENCES FOR THE UNIFIED PANEL ---
    const gamePanel = document.getElementById('game-panel'); 
    const researchTabButton = document.getElementById('tab-research');
    const upgradesTabButton = document.getElementById('tab-upgrades');
    const subTabContainer = document.getElementById('sub-tab-container'); 
    
    tabContainer = subTabContainer; 
    panelHeader = document.getElementById('game-panel-header');
    
    upgradePanelContent = document.getElementById('upgrade-panel-content');
    panelInnerContent = document.getElementById('upgrade-panel-inner-content'); 
    // The panelToggleIcon variable is no longer needed since the buttons are the toggle
    // ---------------------------------------------------

    // RENDER ALL UPGRADES AND ATTACH LISTENERS
    if (tabContainer && upgradePanelContent) {
        // Initialize sub-tabs (SHIP/WORLD)
        createTabs(); 
        
        // Set initial active tab dynamically (uses 'SHIP' from lastActiveSubgroup by default)
        activeTab = lastActiveSubgroup[activeMainTab]; 
        
        // Ensure default main tab is active on load
        if (upgradesTabButton) {
            upgradesTabButton.classList.add('tab-active');
        }
    } else {
        console.error("Upgrade panel DOM elements not found. Check index.html.");
    }

    // --- Tab Button Click Handler Attachment ---
    
    const tabClickHandler = (event, tabName) => {
        event.stopPropagation(); 
        toggleMainTab(tabName); // Use the unified toggle/switch function
    };

    if (upgradesTabButton) {
        upgradesTabButton.addEventListener('click', (event) => tabClickHandler(event, 'upgrades'));
    }
    
    if (researchTabButton) {
        researchTabButton.addEventListener('click', (event) => tabClickHandler(event, 'research'));
    }
    
    if (snapButton) {
        snapButton.addEventListener('click', snapToHomeBase);
    }
    
    // CRITICAL FIX: Explicitly set the initial state
    isPanelOpen = false; 
    if (gamePanel) {
        gamePanel.classList.add('panel-collapsed'); 
    }

    if (container) {
        initializePixi(); 
    } else {
        console.error("Game container #pixi-canvas-container not found!");
    }

    
    
    updateUpgradeButtons();
    setActiveTab(activeTab);
};