// --- Game Constants & State ---
const DOT_COUNT = 50000; // Significantly increased dot count for a "universe" effect
const INITIAL_DOTS_SPAWN = 5000; // Number of dots to spawn initially
const INITIAL_SPAWN_RANGE = 20000; // Initial world area size (from -10000 to +10000)

const PLAYER_SIZE = 10;
const RESOURCE_SIZE = 4;
const MOVEMENT_SPEED_BASE = 2.5; // Pixi units per frame
const GAME_IDLE_DELAY = 1000; // 1 second delay at base

// ** DYNAMIC WIDTH/HEIGHT: These are now variables initialized at runtime **
let currentWidth = window.innerWidth;
let currentHeight = window.innerHeight;

// Resource Spawning Constants
let spawnInterval = 1000; // 1 dot per second (1000ms)
let timeSinceLastSpawn = 0;

// Base Game Constants
const HARVESTER_RANGE = 200; // Maximum distance from nearest base
const MAX_BASE_LINK_DISTANCE = 500; // Max road length

const MIN_ZOOM = 0.05; // Allowing deep zoom out to see the universe
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.1;
let currentZoom = 1.0;
let worldContainer; // All game elements go here (The movable Camera/World)

// Panning State
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

// All game coordinates now operate in world space
let score = 0;
let collectedInTrip = 0; 
let collectedInTripMax = 10;
let resources = [];
let player = { sprite: null, x: 0, y: 0 }; // World coordinates
let targetResource = null;
let lastActionTime = 0;
let state = 'IDLE'; 

// Base State
let bases = [];
let currentBase = null;
let isDraggingBase = false;
let activeBase = null;
let roadGraphics = null; 

// Upgrade state
let speedLevel = 1;
let capacityLevel = 1;
let spawnLevel = 1;
let baseCount = 1;
let speedCost = 100;
let capacityCost = 150;
let spawnCost = 150;
let baseCost = 500; 

// DOM references
let scoreDisplay, dotCountDisplay, zoomLevelDisplay, container, app;
let speedButton, capacityButton, newBaseButton, spawnButton, snapButton; 
let speedLevelDisplay, capacityLevelDisplay, spawnLevelDisplay;
let speedCostDisplay, capacityCostDisplay, spawnCostDisplay;
let newBaseCostDisplay, baseCountDisplay; 

// Utility function to get distance between two points
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// --- PIXI Graphics Creation ---

function createResourceGraphic() {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0x69D2E7); 
    graphics.drawCircle(0, 0, RESOURCE_SIZE);
    graphics.endFill();
    return graphics;
}

function createBaseGraphic(color, initialX, initialY) {
    const baseGraphic = new PIXI.Graphics();
    baseGraphic.beginFill(color); 
    baseGraphic.drawCircle(0, 0, PLAYER_SIZE * 2);
    baseGraphic.endFill();
    
    baseGraphic.lineStyle(2, color, 0.2); 
    baseGraphic.drawCircle(0, 0, HARVESTER_RANGE);
    baseGraphic.endFill();
    
    baseGraphic.x = initialX; // World X
    baseGraphic.y = initialY; // World Y
    
    baseGraphic.eventMode = 'static';
    baseGraphic.cursor = 'grab'; 
    baseGraphic.on('pointerdown', onDragStart);
    baseGraphic.on('pointerup', onDragEnd);
    baseGraphic.on('pointerupoutside', onDragEnd);
    baseGraphic.on('pointermove', onDragMove);

    worldContainer.addChild(baseGraphic); 
    return baseGraphic;
}

// MODIFIED: Spawns resource randomly across a massive initial range
function createResource() {
    const sprite = createResourceGraphic();
    
    // Spawn within a large, fixed area around world center (0,0)
    sprite.x = (Math.random() - 0.5) * INITIAL_SPAWN_RANGE;
    sprite.y = (Math.random() - 0.5) * INITIAL_SPAWN_RANGE;
    
    const uniqueId = Math.random() * 1000000; 
    
    worldContainer.addChild(sprite); 

    return {
        id: uniqueId,
        sprite: sprite,
        x: sprite.x,
        y: sprite.y,
    };
}

// MODIFIED: Increased initial resource count and spread
function initResources() {
    resources.forEach(r => {
        if (r.sprite.parent) {
            worldContainer.removeChild(r.sprite);
        }
    });
    resources = []; 

    for (let i = 0; i < INITIAL_DOTS_SPAWN; i++) {
        resources.push(createResource());
    }
}

function initPlayer() {
    const initialX = 0;
    const initialY = 0;

    // 1. Initial Home Base (Pink circle) - Created at world center (0,0)
    const homeBase = createBaseGraphic(0xFF79C6, initialX, initialY); 
    homeBase.name = 'Base 1 (Home)';
    bases.push(homeBase); 

    // 2. Player sprite (Purple Harvester)
    player.sprite = new PIXI.Graphics();
    player.sprite.beginFill(0x8C7AE6); 
    player.sprite.drawCircle(0, 0, PLAYER_SIZE);
    player.sprite.endFill();
    
    player.sprite.x = initialX;
    player.sprite.y = initialY;
    worldContainer.addChild(player.sprite);

    player.x = initialX;
    player.y = initialY;
    
    currentBase = homeBase;
}

// --- Dragging Logic (Base Movement) ---

function onDragStart(event) {
    const base = event.target;
    if (state !== 'IDLE') {
        state = 'IDLE'; 
        lastActionTime = performance.now();
    }
    
    base.alpha = 0.5; 
    isDraggingBase = true;
    activeBase = base;
    
    activeBase.data = event.data; 
    activeBase.cursor = 'grabbing';
    
    isPanning = false; 
    app.view.style.cursor = 'default';
}

function onDragEnd() {
    if (!isDraggingBase || !activeBase) return;
    
    activeBase.alpha = 1; 
    activeBase.cursor = 'grab';
    isDraggingBase = false;
    activeBase.data = null;
    activeBase = null;
    drawBaseConnections();
}

function onDragMove() {
    if (isDraggingBase && activeBase && activeBase.data) {
        // Position relative to the worldContainer (world coordinates)
        const newPosition = activeBase.data.getLocalPosition(activeBase.parent);
        
        activeBase.x = newPosition.x;
        activeBase.y = newPosition.y;
        
        drawBaseConnections();
    }
}

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
}

// --- Game Logic ---

function findNextTargetBase() {
    let localResource = findLocalResource(currentBase);
    if (localResource) {
        return { type: 'RESOURCE', target: localResource, nextBase: currentBase };
    }

    for (const targetBase of bases) {
        if (targetBase === currentBase) continue; 

        const distToTargetBase = distance(currentBase, targetBase);
        if (distToTargetBase <= MAX_BASE_LINK_DISTANCE) {
            
            const remoteResource = findLocalResource(targetBase);
            if (remoteResource) {
                return { type: 'BASE_LINK', target: targetBase, nextBase: targetBase };
            }
        }
    }
    return null;
}

function findLocalResource(base) {
    let nearest = null;
    let minDistance = Infinity;

    for (const resource of resources) {
        const distToResource = distance(base, resource.sprite);
        
        if (distToResource <= HARVESTER_RANGE) {
            const distToPlayer = distance(player.sprite, resource.sprite);
            if (distToPlayer < minDistance) {
                minDistance = distToPlayer;
                nearest = resource;
            }
        }
    }
    return nearest;
}

function moveToTarget(target, onArrival) {
    // Harvester stops if dragging or panning
    if (!target || isDraggingBase || isPanning) return;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = distance(player, target);

    const speed = MOVEMENT_SPEED_BASE * (1 + (speedLevel - 1) * 0.5); 

    if (dist < speed) {
        player.x = target.x;
        player.y = target.y;
        onArrival();
        return;
    }

    const angle = Math.atan2(dy, dx);
    player.x += Math.cos(angle) * speed;
    player.y += Math.sin(angle) * speed;
    
    // Update PIXI sprite world position. NO CAMERA CENTERING.
    player.sprite.x = player.x;
    player.sprite.y = player.y;
}

// --- Harvester Camera Snap ---

function snapToHarvester() {
    if (!worldContainer) return;
    
    // Manually set the worldContainer's position (the camera offset) 
    // to place the player's world coordinates (player.x, player.y) at the center of the screen.
    currentWidth = window.innerWidth;
    currentHeight = window.innerHeight;

    worldContainer.position.set(
        currentWidth / 2 - player.x * currentZoom,
        currentHeight / 2 - player.y * currentZoom
    );
}


// --- Game Loop (Pixi Ticker) ---
function gameLoop(delta) {
    // 1. DYNAMIC RESOURCE SPAWNING LOGIC (only spawns up to DOT_COUNT)
    timeSinceLastSpawn += app.ticker.deltaMS; 

    const actualSpawnInterval = spawnInterval / (1 + (spawnLevel - 1) * 0.25);

    if (resources.length < DOT_COUNT && timeSinceLastSpawn >= actualSpawnInterval) {
        resources.push(createResource()); 
        timeSinceLastSpawn = 0; 
    }
    
    if (dotCountDisplay) {
        dotCountDisplay.textContent = resources.length.toLocaleString();
    }
    
    drawBaseConnections(); 
    
    // Stop logic if dragging or panning
    if (isDraggingBase || isPanning) return; 
    
    const now = performance.now();

    // 2. Game State Logic 
    if (state === 'IDLE') {
        updateUpgradeButtons(); 
        if (now - lastActionTime > GAME_IDLE_DELAY) {
            
            const nextAction = findNextTargetBase();

            if (nextAction) {
                currentBase = nextAction.nextBase; 

                if (nextAction.type === 'RESOURCE') {
                    targetResource = nextAction.target;
                    state = 'MOVING_TO_RESOURCE';
                } else if (nextAction.type === 'BASE_LINK') {
                    targetResource = {x: nextAction.target.x, y: nextAction.target.y}; 
                    state = 'MOVING_TO_BASE_LINK';
                }
            } else {
                lastActionTime = now;
            }
        }
    }

    // 3. Move/Collect
    if (state === 'MOVING_TO_RESOURCE' && targetResource) {
        moveToTarget(targetResource, () => {
            if (collectedInTrip >= collectedInTripMax) {
                state = 'RETURNING_TO_BASE';
                targetResource = null; 
                return;
            }
            targetResource = findLocalResource(currentBase); 
            if (!targetResource) {
                state = 'RETURNING_TO_BASE'; 
            }
        });

        // Continuous Collection
        let newlyCollectedIds = [];
        resources.forEach(resource => {
            const dist = distance(player.sprite, resource.sprite);
            const collectionRadius = PLAYER_SIZE + RESOURCE_SIZE;
            
            if (dist < collectionRadius) {
                worldContainer.removeChild(resource.sprite);
                newlyCollectedIds.push(resource.id); 
                collectedInTrip++;
            }
        });

        if (newlyCollectedIds.length > 0) {
            resources = resources.filter(r => !newlyCollectedIds.includes(r.id));
        }

        if (collectedInTrip >= collectedInTripMax) {
            state = 'RETURNING_TO_BASE';
            targetResource = null;
        }
    }
    
    // 4. Move to Linked Base
    if (state === 'MOVING_TO_BASE_LINK' && targetResource) {
        moveToTarget(targetResource, () => {
            targetResource = null;
            state = 'IDLE'; 
            lastActionTime = performance.now();
        });
    }

    // 5. Return to Base 
    if (state === 'RETURNING_TO_BASE') {
        const depositTarget = currentBase || bases[0]; 
        
        moveToTarget(depositTarget, () => {
            score += collectedInTrip;
            
            collectedInTrip = 0; 
            state = 'IDLE';
            lastActionTime = performance.now();
            updateUpgradeButtons();
        });
    }
    
    if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();
}

// --- Zoom Handler (Zoom focused on cursor position) ---

function handleZoom(event) {
    event.preventDefault(); 

    const direction = event.deltaY < 0 ? 1 : -1; 
    let newZoom = currentZoom + direction * ZOOM_STEP * currentZoom; 

    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom !== currentZoom) {
        const oldZoom = currentZoom;
        const scaleChange = newZoom / oldZoom;
        currentZoom = newZoom;
        
        // Use currentWidth/Height which are updated on resize
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

// --- Panning Logic (Decoupled from Harvester) ---

function onPanStart(event) {
    if (isDraggingBase) return; 
    // Only start pan if the click isn't on an interactive HUD element
    const isOverHUD = !!event.target.closest('#hud-container');
    if (isOverHUD) return;

    isPanning = true;
    lastPanX = event.clientX;
    lastPanY = event.clientY;
    app.view.style.cursor = 'move';
}

function onPanEnd() {
    isPanning = false;
    if (!isDraggingBase) {
        app.view.style.cursor = 'default';
    }
}

function onPanMove(event) {
    if (!isPanning) return;
    
    const dx = event.clientX - lastPanX;
    const dy = event.clientY - lastPanY;

    // Only move the camera offset (worldContainer position)
    worldContainer.position.x += dx;
    worldContainer.position.y += dy;
    
    // Harvester is decoupled, so no player position updates here.

    lastPanX = event.clientX;
    lastPanY = event.clientY;
}


// --- Upgrade Functions ---
function updateUpgradeButtons() {
    // ... (logic remains the same)
    if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();
    if (speedButton) {
        speedButton.disabled = score < speedCost;
        speedCostDisplay.textContent = speedCost.toLocaleString();
        speedLevelDisplay.textContent = speedLevel;
    }
    if (capacityButton) {
        capacityButton.disabled = score < capacityCost;
        capacityCostDisplay.textContent = capacityCost.toLocaleString();
        capacityLevelDisplay.textContent = capacityLevel;
    }
    if (spawnButton) {
        spawnButton.disabled = score < spawnCost;
        spawnCostDisplay.textContent = spawnCost.toLocaleString();
        spawnLevelDisplay.textContent = spawnLevel;
    }
    if (newBaseButton) {
        newBaseButton.disabled = score < baseCost;
        newBaseCostDisplay.textContent = baseCost.toLocaleString();
    }
    if (baseCountDisplay) {
        baseCountDisplay.textContent = baseCount;
    }
    if (zoomLevelDisplay) { 
        zoomLevelDisplay.textContent = `${currentZoom.toFixed(2)}x`;
    }
}

function purchaseSpeedUpgrade() {
    if (score >= speedCost) {
        score -= speedCost;
        speedLevel++;
        speedCost = Math.floor(speedCost * 1.5);
        updateUpgradeButtons();
    }
}

function purchaseCapacityUpgrade() {
    if (score >= capacityCost) {
        score -= capacityCost;
        capacityLevel++;
        collectedInTripMax = 10 + (capacityLevel - 1) * 5;
        capacityCost = Math.floor(capacityCost * 1.5);
        updateUpgradeButtons();
    }
}

function purchaseSpawnUpgrade() {
    if (score >= spawnCost) {
        score -= spawnCost;
        spawnLevel++;
        // Keep spawnInterval > 0
        spawnInterval = Math.max(100, spawnInterval - 100); 
        spawnCost = Math.floor(spawnCost * 2.5);
        updateUpgradeButtons();
    }
}

function purchaseNewBase() {
    if (score >= baseCost) {
        score -= baseCost;
        baseCount++;
        // Spawn the new base near the player's current world position
        const newBase = createBaseGraphic(0xFFE470, player.x + 100, player.y + 100); 
        newBase.name = `Base ${baseCount}`;
        bases.push(newBase);
        baseCost = Math.floor(baseCost * 2.5); 
        updateUpgradeButtons();
        drawBaseConnections(); 
    }
}

// --- Initialization & Resizing ---

function initializePixi() {
    try {
        // Update the global dimensions based on current window size
        currentWidth = window.innerWidth;
        currentHeight = window.innerHeight;

        app = new PIXI.Application({
            width: currentWidth,
            height: currentHeight,
            background: '#0b0a1a',
            resizeTo: window, // Tell Pixi to automatically resize with the window
        });
        
        const canvasElement = app.view; 

        if (canvasElement && canvasElement instanceof Node) {
            container.appendChild(canvasElement);
        } else {
            console.error("Pixi failed to create a valid canvas element. Got:", canvasElement);
            return;
        }

        // Set up the window resize listener
        window.addEventListener('resize', handleResize);

        worldContainer = new PIXI.Container(); 
        app.stage.addChild(worldContainer);
        
        roadGraphics = new PIXI.Graphics();
        worldContainer.addChild(roadGraphics); 

        initPlayer(); 
        initResources(); 

        app.ticker.add(gameLoop);

        snapToHarvester(); // Initial snap

        // Add pan and zoom listeners
        app.view.addEventListener('pointerdown', onPanStart); 
        app.view.addEventListener('pointerup', onPanEnd);
        app.view.addEventListener('pointerupoutside', onPanEnd);
        app.view.addEventListener('pointermove', onPanMove);
        app.view.addEventListener('wheel', handleZoom, { passive: false }); 

    } catch (e) {
        console.error("PixiJS Initialization failed:", e);
    }
}

function handleResize() {
    if (app) {
        // Pixi's resizeTo: window handles the canvas resize,
        // we just update our global dimensions and re-snap the camera.
        currentWidth = window.innerWidth;
        currentHeight = window.innerHeight;
        
        // This keeps the camera centered on the current view when the window size changes.
        snapToHarvester(); 
        
        // Ensure the game logic doesn't get stuck during a resize
        state = 'IDLE';
        lastActionTime = performance.now();
    }
}


window.onload = function() {
    // Define DOM references
    scoreDisplay = document.getElementById('score-display');
    dotCountDisplay = document.getElementById('dot-count-display');
    zoomLevelDisplay = document.getElementById('zoom-level-display'); 
    snapButton = document.getElementById('snap-to-harvester');
    container = document.getElementById('pixi-canvas-container');
    
    // Upgrade button references
    speedButton = document.getElementById('upgrade-speed');
    capacityButton = document.getElementById('upgrade-capacity');
    spawnButton = document.getElementById('upgrade-spawn');
    newBaseButton = document.getElementById('buy-new-base'); 
    
    speedLevelDisplay = document.getElementById('speed-level');
    capacityLevelDisplay = document.getElementById('capacity-level');
    spawnLevelDisplay = document.getElementById('spawn-level');
    speedCostDisplay = document.getElementById('speed-cost');
    capacityCostDisplay = document.getElementById('capacity-cost');
    spawnCostDisplay = document.getElementById('spawn-cost');
    newBaseCostDisplay = document.getElementById('new-base-cost'); 
    baseCountDisplay = document.getElementById('base-count'); 
    
    // Attach event listeners
    if (speedButton) {
        speedButton.addEventListener('click', purchaseSpeedUpgrade);
    }
    if (capacityButton) {
        capacityButton.addEventListener('click', purchaseCapacityUpgrade);
    }
    if (spawnButton) {
        spawnButton.addEventListener('click', purchaseSpawnUpgrade);
    }
    if (newBaseButton) { 
        newBaseButton.addEventListener('click', purchaseNewBase);
    }
    if (snapButton) {
        snapButton.addEventListener('click', snapToHarvester);
    }

    if (container) {
        initializePixi();
    } else {
        console.error("Game container #pixi-canvas-container not found!");
    }
    
    updateUpgradeButtons();
};
