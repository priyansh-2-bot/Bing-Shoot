import * as THREE from 'three';

const PLAYER_HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.0;
const GRAVITY = -20;
const JUMP_FORCE = 8;
const MOVE_SPEED = 6;
const SPRINT_SPEED = 10;
const CROUCH_SPEED = 3;

const CITIES = [
    { name: 'Mumbai', ground: 0x2E3034, sky: 0x78AEE6, bld: 0x969BA8, accent: 0x1C3C6E },
    { name: 'Kolkata', ground: 0x483E30, sky: 0x96AFBE, bld: 0xCDAF5F, accent: 0x78281E },
    { name: 'Chennai', ground: 0xCDBE96, sky: 0x87C3E1, bld: 0xD7AA6E, accent: 0x285A3C },
    { name: 'Delhi', ground: 0x968278, sky: 0xC8B0A0, bld: 0xB95F3C, accent: 0x5A2D1E },
    { name: 'Chandigarh', ground: 0xB9B9B9, sky: 0x96BEE1, bld: 0xE1E1E1, accent: 0xC83C32 },
    { name: 'Bengaluru', ground: 0x5A7850, sky: 0x82AAC8, bld: 0xAAB4CD, accent: 0x1E783C },
    { name: 'Panjim', ground: 0xD7C8A0, sky: 0x78BEDC, bld: 0xE66E5F, accent: 0x5AA0A0 },
    { name: 'Jaipur', ground: 0xCDAF8C, sky: 0xE6BEA0, bld: 0xD78278, accent: 0x6E3C32 },
    { name: 'Lucknow', ground: 0xC8C3B9, sky: 0xAAC3D7, bld: 0xEBE1C8, accent: 0x006E82 },
    { name: 'Kanyakumari', ground: 0xCDC8AF, sky: 0xFFD296, bld: 0xE6733C, accent: 0x4646C8 },
];

const WEAPONS = [
    { id: 'revolver', name: 'REVOLVER .44', slot: 1, damage: 38, headMult: 2.5, fireRate: 300, mag: 6, reloadTime: 1100, spread: 0.01, auto: false, sfx: 'gunshot' },
    { id: 'mp5', name: 'MP5 SMG', slot: 2, damage: 16, headMult: 3.0, fireRate: 85, mag: 30, reloadTime: 1600, spread: 0.02, auto: true, sfx: 'smg' },
    { id: 'ak47', name: 'AK-47', slot: 3, damage: 27, headMult: 3.0, fireRate: 110, mag: 30, reloadTime: 1900, spread: 0.025, auto: true, sfx: 'rifle' },
    { id: 'm1014', name: 'M1014 SHOTGUN', slot: 4, damage: 9, headMult: 2.0, fireRate: 720, mag: 7, reloadTime: 2400, spread: 0.08, auto: false, pellets: 7, sfx: 'shotgun' },
];

const ENEMY_TYPES = {
    grunt: { hp: 100, speed: 3, damage: 8, fireRate: 1000, score: 30, color: 0x464E46 },
    rifle: { hp: 130, speed: 2.8, damage: 12, fireRate: 850, score: 45, color: 0x4E4A3C },
    soldier: { hp: 170, speed: 3, damage: 15, fireRate: 720, score: 60, color: 0x3C4252 },
    sniper: { hp: 120, speed: 2.2, damage: 35, fireRate: 2000, score: 90, color: 0x5C5852 },
    heavy: { hp: 280, speed: 1.5, damage: 22, fireRate: 1500, score: 140, color: 0x5F3A30 },
};

function getLevelEnemyCount(lvl) {
    if (lvl <= 1) return 3;
    if (lvl <= 2) return 5;
    if (lvl <= 3) return 7;
    return 5 + lvl * 2;
}

function getLevelEnemyTypes(lvl) {
    if (lvl <= 1) return ['grunt'];
    if (lvl <= 2) return ['grunt', 'grunt'];
    if (lvl <= 3) return ['grunt', 'grunt', 'rifle'];
    if (lvl <= 5) return ['grunt', 'rifle', 'soldier'];
    return ['grunt', 'rifle', 'soldier', 'sniper', 'heavy'];
}

function getLevelDamageScale(lvl) {
    if (lvl <= 1) return 0.5;
    if (lvl <= 2) return 0.65;
    if (lvl <= 3) return 0.8;
    return 1.0;
}

function getLevelFireRateScale(lvl) {
    if (lvl <= 1) return 1.8;
    if (lvl <= 2) return 1.5;
    if (lvl <= 3) return 1.2;
    return 1.0;
}

let scene, camera, renderer, clock;
let player = { pos: new THREE.Vector3(0, PLAYER_HEIGHT, 0), vel: new THREE.Vector3(), onGround: true, crouching: false, health: 100, medkits: 3 };
let weapons = WEAPONS.map(w => ({ ...w, ammo: w.mag, reloading: false, lastFire: 0 }));
let currentWeaponIdx = 0;
let enemies = [];
let projectiles = [];
let pickups = [];
let level = 1;
let score = 0;
let kills = 0;
let gameState = 'menu';
let minimapCtx;
let moveForward = false, moveBack = false, moveLeft = false, moveRight = false;
let sprinting = false, crouching = false;
let yaw = 0, pitch = 0;
let mouseDown = false;
let levelBuildings = [];
let buildingBoxes = [];
let settings = { sensitivity: 1.0, fov: 75, volume: 80, invertY: false, crosshair: true, minimap: true };
let paused = false;
let muzzleLight = null;
let muzzleFlash = null;
let muzzleFlashUntil = 0;
let recoilPitch = 0;
let viewmodels = {};
let gunTips = {};
let bobTime = 0;
let deathGroup = null;
let deathT = 0;
let deathCamFrom = null;
let deathCamTo = null;

function boxContains(box, x, z) {
    return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
}

function pushOutOfBuildings(pos, radius) {
    for (const b of buildingBoxes) {
        const closestX = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const closestZ = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radius) {
            if (dist === 0) {
                const cx = (b.minX + b.maxX) / 2;
                const cz = (b.minZ + b.maxZ) / 2;
                const pushX = pos.x - cx;
                const pushZ = pos.z - cz;
                const pushDist = Math.sqrt(pushX * pushX + pushZ * pushZ) || 1;
                pos.x += (pushX / pushDist) * radius;
                pos.z += (pushZ / pushDist) * radius;
            } else {
                const overlap = radius - dist;
                pos.x += (dx / dist) * overlap;
                pos.z += (dz / dist) * overlap;
            }
        }
    }
}

function hasLineOfSight(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    dir.normalize();
    const ray = new THREE.Raycaster(from.clone(), dir, 0.1, dist);
    const hits = ray.intersectObjects(levelBuildings);
    return hits.length === 0;
}

let audioCtx;
function initAudio() { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    switch (type) {
        case 'gunshot':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now); osc.stop(now + 0.15); break;
        case 'smg':
            osc.type = 'square'; osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now); osc.stop(now + 0.08); break;
        case 'rifle':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now); osc.stop(now + 0.18); break;
        case 'shotgun':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now); osc.stop(now + 0.3); break;
        case 'hit':
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05); break;
        case 'headshot':
            osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now); osc.stop(now + 0.08); break;
        case 'hurt':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now); osc.stop(now + 0.2); break;
        case 'reload':
            osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now);
            osc.frequency.setValueAtTime(900, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now); osc.stop(now + 0.15); break;
        case 'pickup':
            osc.type = 'sine'; osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now); osc.stop(now + 0.2); break;
    }
}
function vmMat(color, emissive) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.55, emissive: emissive || 0x000000 });
}

function buildGunModel(id) {
    const g = new THREE.Group();
    const dark = vmMat(0x23262e);
    const mid = vmMat(0x3a3f4a);
    const wood = vmMat(0x6e4525);
    const grip = vmMat(0x1a1c22);
    const accent = vmMat(0x0e2a24, 0x00e5a0);
    const add = (geo, m, x, y, z, rx, ry, rz) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        if (rx) mesh.rotation.x = rx;
        if (ry) mesh.rotation.y = ry;
        if (rz) mesh.rotation.z = rz;
        g.add(mesh);
        return mesh;
    };
    // hands gripping (skin)
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.7 });
    if (id === 'revolver') {
        add(new THREE.BoxGeometry(0.07, 0.09, 0.22), dark, 0, 0, -0.1);
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 12), mid, 0, 0.01, -0.12).rotation.x = Math.PI / 2;
        add(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 10), dark, 0, 0.015, -0.3).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.06, 0.12, 0.07), wood, 0, -0.09, 0.0, 0.25, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.1), skin, 0, -0.08, -0.05);
        add(new THREE.BoxGeometry(0.012, 0.03, 0.012), accent, 0, 0.045, -0.2);
    } else if (id === 'mp5') {
        add(new THREE.BoxGeometry(0.075, 0.1, 0.45), dark, 0, 0, -0.2);
        add(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 10), mid, 0, 0.02, -0.5).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.06, 0.16, 0.08), grip, 0, -0.11, -0.1, 0.3, 0, 0);
        add(new THREE.BoxGeometry(0.055, 0.1, 0.09), grip, 0, -0.06, 0.12, -0.2, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.12), skin, 0, -0.08, -0.08);
        add(new THREE.BoxGeometry(0.02, 0.02, 0.06), accent, 0, 0.06, -0.25);
    } else if (id === 'ak47') {
        add(new THREE.BoxGeometry(0.075, 0.1, 0.5), dark, 0, 0, -0.2);
        add(new THREE.CylinderGeometry(0.024, 0.024, 0.32, 10), mid, 0, 0.02, -0.55).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.06, 0.09, 0.22), wood, 0, -0.01, -0.35);
        add(new THREE.BoxGeometry(0.055, 0.16, 0.07), wood, 0, -0.11, -0.05, 0.5, 0, 0);
        add(new THREE.BoxGeometry(0.06, 0.12, 0.08), wood, 0, -0.02, 0.14, -0.15, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.12), skin, 0, -0.08, -0.12);
        add(new THREE.BoxGeometry(0.014, 0.05, 0.014), grip, 0, 0.08, -0.35);
    } else {
        add(new THREE.BoxGeometry(0.085, 0.11, 0.55), dark, 0, 0, -0.2);
        add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), mid, 0, 0.03, -0.55).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.07, 0.08, 0.25), wood, 0, -0.06, -0.3);
        add(new THREE.BoxGeometry(0.06, 0.12, 0.09), wood, 0, -0.09, 0.1, 0.25, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.12), skin, 0, -0.08, -0.1);
        add(new THREE.BoxGeometry(0.02, 0.02, 0.08), accent, 0, 0.065, -0.28);
    }
    const tip = new THREE.Object3D();
    const tipZ = id === 'revolver' ? -0.42 : id === 'mp5' ? -0.68 : id === 'ak47' ? -0.73 : -0.78;
    tip.position.set(0, 0.02, tipZ);
    g.add(tip);
    return { group: g, tip };
}

function buildViewmodels() {
    const basePos = new THREE.Vector3(0.32, -0.28, -0.55);
    ['revolver', 'mp5', 'ak47', 'm1014'].forEach((id, i) => {
        const built = buildGunModel(id);
        built.group.position.copy(basePos);
        built.group.rotation.set(0, 0, 0);
        built.group.visible = (i === currentWeaponIdx);
        camera.add(built.group);
        viewmodels[id] = built.group;
        gunTips[id] = built.tip;
    });
}

function showViewmodel(idx) {
    const ids = ['revolver', 'mp5', 'ak47', 'm1014'];
    ids.forEach((id, i) => {
        if (viewmodels[id]) viewmodels[id].visible = (i === idx);
    });
}

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x78AEE6);
    scene.fog = new THREE.Fog(0x78AEE6, 60, 180);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.copy(player.pos);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0x5A4E52, 0.6));
    const dl = new THREE.DirectionalLight(0xFFF4DE, 1.2);
    dl.position.set(50, 80, 30);
    dl.castShadow = true;
    dl.shadow.mapSize.set(2048, 2048);
    dl.shadow.camera.near = 0.5;
    dl.shadow.camera.far = 200;
    dl.shadow.camera.left = -60;
    dl.shadow.camera.right = 60;
    dl.shadow.camera.top = 60;
    dl.shadow.camera.bottom = -60;
    scene.add(dl);
    clock = new THREE.Clock();
    scene.add(camera);
    // Muzzle flash light + quad attached to camera (bottom-right, gun position)
    muzzleLight = new THREE.PointLight(0xffb457, 0, 12, 2);
    muzzleLight.position.set(0.35, -0.25, -0.8);
    camera.add(muzzleLight);
    const flashGeo = new THREE.PlaneGeometry(0.35, 0.35);
    const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffd27a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    muzzleFlash.position.set(0.35, -0.25, -0.9);
    camera.add(muzzleFlash);
    buildViewmodels();
    minimapCtx = document.getElementById('minimapCanvas').getContext('2d');
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function clearLevel() {
    levelBuildings.forEach(b => scene.remove(b));
    enemies.forEach(e => { if (e.mesh) scene.remove(e.mesh); });
    pickups.forEach(p => { if (p.mesh) scene.remove(p.mesh); });
    projectiles.forEach(p => { if (p.mesh) scene.remove(p.mesh); });
    levelBuildings = []; enemies = []; pickups = []; projectiles = [];
}

function generateLevel(lvl) {
    clearLevel();
    buildingBoxes = [];
    const cityIdx = (lvl - 1) % CITIES.length;
    const city = CITIES[cityIdx];
    scene.background = new THREE.Color(city.sky);
    scene.fog.color = new THREE.Color(city.sky);
    const gGeo = new THREE.PlaneGeometry(300, 300);
    const gMat = new THREE.MeshStandardMaterial({ color: city.ground, roughness: 0.9 });
    const gnd = new THREE.Mesh(gGeo, gMat);
    gnd.rotation.x = -Math.PI / 2;
    gnd.receiveShadow = true;
    scene.add(gnd);
    levelBuildings.push(gnd);
    const bCount = 20 + lvl * 3;
    const arena = 50 + lvl * 2;
    for (let i = 0; i < bCount; i++) {
        const w = 3 + Math.random() * 6;
        const h = 4 + Math.random() * 15;
        const d = 3 + Math.random() * 6;
        const x = (Math.random() - 0.5) * arena * 2;
        const z = (Math.random() - 0.5) * arena * 2;
        if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? city.bld : city.accent, roughness: 0.8 });
        const bld = new THREE.Mesh(geo, mat);
        bld.position.set(x, h / 2, z);
        bld.castShadow = true;
        bld.receiveShadow = true;
        scene.add(bld);
        levelBuildings.push(bld);
        buildingBoxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }
    for (let i = 0; i < 12 + lvl; i++) {
        const w = 1.5 + Math.random() * 2;
        const h = 0.8 + Math.random() * 1.2;
        const d = 1 + Math.random() * 2;
        const x = (Math.random() - 0.5) * arena * 1.5;
        const z = (Math.random() - 0.5) * arena * 1.5;
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 0.7 });
        const cv = new THREE.Mesh(geo, mat);
        cv.position.set(x, h / 2, z);
        cv.castShadow = true;
        scene.add(cv);
        levelBuildings.push(cv);
        buildingBoxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }
    const eCount = getLevelEnemyCount(lvl);
    const availTypes = getLevelEnemyTypes(lvl);
    const dmgScale = getLevelDamageScale(lvl);
    const rateScale = getLevelFireRateScale(lvl);
    for (let i = 0; i < eCount; i++) {
        const type = availTypes[Math.floor(Math.random() * availTypes.length)];
        const cfg = ENEMY_TYPES[type];
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * (arena - 15);
        const ex = Math.cos(angle) * dist;
        const ez = Math.sin(angle) * dist;
        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
            new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.6 })
        );
        body.position.set(ex, 1.0, ez);
        body.castShadow = true;
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x3A3A3A })
        );
        head.position.y = 1.0;
        body.add(head);
        const visor = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xFF2020 })
        );
        visor.position.set(0, 0.05, 0.28);
        head.add(visor);
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x2A2A2A })
        );
        arm.position.set(0.35, -0.1, 0.2);
        body.add(arm);
        scene.add(body);
        enemies.push({
            mesh: body, type, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed,
            damage: cfg.damage * dmgScale, fireRate: cfg.fireRate * rateScale, score: cfg.score,
            lastFire: 0, state: 'patrol',
            patrolTarget: new THREE.Vector3((Math.random()-0.5)*arena, 0, (Math.random()-0.5)*arena),
            alertTimer: 0, strafeDir: Math.random() > 0.5 ? 1 : -1, alive: true
        });
    }
    for (let i = 0; i < 5 + lvl; i++) {
        const px = (Math.random() - 0.5) * arena;
        const pz = (Math.random() - 0.5) * arena;
        const isMed = Math.random() > 0.4;
        const col = isMed ? 0x7CFF6B : 0xFFD740;
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3 })
        );
        mesh.position.set(px, 0.5, pz);
        mesh.castShadow = true;
        scene.add(mesh);
        pickups.push({ mesh, type: isMed ? 'medkit' : 'ammo' });
    }
    player.pos.set(0, PLAYER_HEIGHT, 0);
    player.vel.set(0, 0, 0);
    camera.position.copy(player.pos);
    yaw = 0;
    pitch = 0;
    updateHUD();
}

let inputReady = false;
function setupInput() {
    if (inputReady) return;
    inputReady = true;
    document.addEventListener('keydown', (e) => {
        if (gameState !== 'playing') return;
        if (paused && e.code !== 'Escape') return;
        switch (e.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyS': moveBack = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
            case 'ShiftLeft': sprinting = true; break;
            case 'ControlLeft': crouching = true; break;
            case 'Space':
                if (player.onGround) { player.vel.y = JUMP_FORCE; player.onGround = false; }
                break;
            case 'KeyR': reloadWeapon(); break;
            case 'KeyQ': useMedkit(); break;
            case 'Digit1': switchWeapon(0); break;
            case 'Digit2': switchWeapon(1); break;
            case 'Digit3': switchWeapon(2); break;
            case 'Digit4': switchWeapon(3); break;
            case 'Escape':
                e.preventDefault();
                if (paused) resumeGame();
                else pauseGame();
                break;
        }
    });
    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyS': moveBack = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
            case 'ShiftLeft': sprinting = false; break;
            case 'ControlLeft': crouching = false; break;
        }
    });
    document.addEventListener('mousedown', (e) => { if (e.button === 0 && !paused) mouseDown = true; });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
    document.addEventListener('wheel', (e) => {
        if (gameState !== 'playing' || paused) return;
        if (e.deltaY > 0) cycleWeapon(1);
        else if (e.deltaY < 0) cycleWeapon(-1);
    }, { passive: true });
    document.addEventListener('mousemove', (e) => {
        if (gameState !== 'playing' || !document.pointerLockElement || paused) return;
        // Standard FPS: mouse right (positive movementX) -> look right (yaw decreases
        // in three.js because +Y rotation turns left). Mouse up (negative movementY)
        // -> look up (pitch increases).
        yaw -= e.movementX * 0.002 * settings.sensitivity;
        const yFactor = settings.invertY ? -1 : 1;
        pitch -= e.movementY * 0.002 * settings.sensitivity * yFactor;
        pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
    });
}

function switchWeapon(idx) {
    if (idx >= 0 && idx < weapons.length && idx !== currentWeaponIdx) {
        currentWeaponIdx = idx;
        weapons[idx].reloading = false;
        showViewmodel(idx);
        playSound('reload');
        updateHUD();
    }
}

function cycleWeapon(dir) {
    const n = weapons.length;
    const next = (currentWeaponIdx + dir + n) % n;
    switchWeapon(next);
}

function reloadWeapon() {
    const w = weapons[currentWeaponIdx];
    if (w.reloading || w.ammo === w.mag) return;
    w.reloading = true;
    playSound('reload');
    setTimeout(() => {
        w.ammo = w.mag;
        w.reloading = false;
        updateHUD();
    }, w.reloadTime);
}

function useMedkit() {
    if (player.medkits > 0 && player.health < 100) {
        player.medkits--;
        player.health = Math.min(100, player.health + 40);
        playSound('pickup');
        updateHUD();
    }
}

function currentGunId() {
    return weapons[currentWeaponIdx].id;
}

function getMuzzleWorldPos() {
    const tip = gunTips[currentGunId()];
    if (tip) {
        tip.updateWorldMatrix(true, false);
        return new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld);
    }
    const v = new THREE.Vector3(0.35, -0.25, -0.9);
    camera.updateMatrixWorld();
    return camera.localToWorld(v);
}

function triggerMuzzleFlash(kick) {
    muzzleFlashUntil = Date.now() + 55;
    const tip = gunTips[currentGunId()];
    let flashPos = null;
    if (tip) {
        tip.updateWorldMatrix(true, false);
        flashPos = new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld);
        const local = camera.worldToLocal(flashPos.clone());
        muzzleFlash.position.copy(local);
        muzzleLight.position.copy(local);
    }
    if (muzzleFlash) {
        muzzleFlash.material.opacity = 0.95;
        muzzleFlash.rotation.z = Math.random() * Math.PI;
        const s = 0.8 + Math.random() * 0.6 + (kick || 0);
        muzzleFlash.scale.set(s, s, 1);
    }
    if (muzzleLight) muzzleLight.intensity = 6;
}

function spawnTracer(from, to, colorHex, lifeMs) {
    const dist = from.distanceTo(to);
    if (dist < 0.5) return;
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const geo = new THREE.BoxGeometry(0.03, 0.03, dist);
    const mat = new THREE.MeshBasicMaterial({
        color: colorHex, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.lookAt(to);
    scene.add(mesh);
    const born = Date.now();
    const life = lifeMs || 70;
    projectiles.push({
        mesh, type: 'tracer', born,
        update: () => {
            const t = (Date.now() - born) / life;
            mat.opacity = Math.max(0, 0.9 * (1 - t));
            if (t >= 1 && mesh.parent) scene.remove(mesh);
        }
    });
}

function shoot() {
    const w = weapons[currentWeaponIdx];
    const now = Date.now();
    if (w.reloading || w.ammo <= 0 || now - w.lastFire < w.fireRate) return;
    w.lastFire = now;
    w.ammo--;
    playSound(w.sfx);
    const muzzlePos = getMuzzleWorldPos();
    triggerMuzzleFlash(w.id === 'm1014' ? 0.7 : w.id === 'revolver' ? 0.4 : 0.15);
    // Camera kick: sharper for shotgun/revolver, small for SMG
    const kick = w.id === 'm1014' ? 0.028 : w.id === 'revolver' ? 0.02 : w.id === 'ak47' ? 0.011 : 0.007;
    recoilPitch += kick;
    yaw += (Math.random() - 0.5) * kick * 0.4;
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(camera.quaternion);
        dir.x += (Math.random() - 0.5) * w.spread;
        dir.y += (Math.random() - 0.5) * w.spread;
        dir.z += (Math.random() - 0.5) * w.spread;
        dir.normalize();
        const ray = new THREE.Raycaster(camera.position.clone(), dir, 0.1, 200);
        let hitEnemy = false;
        let endPoint = camera.position.clone().add(dir.clone().multiplyScalar(120));
        for (const e of enemies) {
            if (!e.alive) continue;
            const hits = ray.intersectObject(e.mesh, true);
            if (hits.length > 0) {
                endPoint = hits[0].point.clone();
                const isHead = hits[0].object === e.mesh.children[0] || (hits[0].object.parent && hits[0].object.parent === e.mesh.children[0]);
                const dmg = isHead ? w.damage * w.headMult : w.damage;
                e.hp -= dmg;
                playSound(isHead ? 'headshot' : 'hit');
                showHitMarker();
                spawnImpact(hits[0].point, hits[0].face ? hits[0].face.normal : new THREE.Vector3(0, 1, 0));
                if (e.hp <= 0) {
                    e.alive = false;
                    scene.remove(e.mesh);
                    score += e.score;
                    kills++;
                    spawnDeathEffect(e.mesh.position.clone());
                }
                hitEnemy = true;
                break;
            }
        }
        if (!hitEnemy) {
            const groundHits = ray.intersectObjects(levelBuildings);
            if (groundHits.length > 0) {
                endPoint = groundHits[0].point.clone();
                spawnImpact(groundHits[0].point, groundHits[0].face.normal);
            }
        }
        spawnTracer(muzzlePos.clone(), endPoint, w.id === 'm1014' ? 0xffd27a : 0xfff2b0, 80);
    }
    if (w.ammo <= 0) reloadWeapon();
    updateHUD();
}

function spawnDeathEffect(pos) {
    const geo = new THREE.SphereGeometry(0.3, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xFF4444, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const start = Date.now();
    projectiles.push({
        mesh, type: 'effect', born: start,
        update: () => {
            const t = (Date.now() - start) / 1000;
            mesh.scale.setScalar(1 + t * 3);
            mat.opacity = Math.max(0, 1 - t);
            if (t > 1) scene.remove(mesh);
        }
    });
}

function spawnImpact(pos, normal) {
    for (let i = 0; i < 3; i++) {
        const geo = new THREE.SphereGeometry(0.05, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
        const spark = new THREE.Mesh(geo, mat);
        spark.position.copy(pos);
        scene.add(spark);
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 2 + normal.x,
            Math.random() * 2 + normal.y,
            (Math.random() - 0.5) * 2 + normal.z
        );
        const start = Date.now();
        projectiles.push({
            mesh: spark, type: 'spark', born: start,
            update: () => {
                const dt = 0.016;
                spark.position.add(vel.clone().multiplyScalar(dt));
                vel.y -= 9.8 * dt;
                if (Date.now() - start > 300) scene.remove(spark);
            }
        });
    }
}

function updateEnemies(dt) {
    const now = Date.now();
    for (const e of enemies) {
        if (!e.alive) continue;
        const toPlayer = new THREE.Vector3().subVectors(player.pos, e.mesh.position);
        const dist = toPlayer.length();
        const dirToPlayer = toPlayer.normalize();
        if (dist < 40) {
            e.state = 'combat';
            e.alertTimer = 3;
            const head = e.mesh.children[0];
            if (head) {
                const lookDir = dirToPlayer.clone();
                head.lookAt(e.mesh.position.x + lookDir.x, e.mesh.position.y + 1.0 + lookDir.y, e.mesh.position.z + lookDir.z);
            }
            if (dist > 8) {
                const newX = e.mesh.position.x + dirToPlayer.x * e.speed * dt;
                const newZ = e.mesh.position.z + dirToPlayer.z * e.speed * dt;
                const testPos = { x: newX, z: newZ };
                pushOutOfBuildings(testPos, 0.5);
                e.mesh.position.x = testPos.x;
                e.mesh.position.z = testPos.z;
            } else if (dist < 5) {
                const newX = e.mesh.position.x - dirToPlayer.x * e.speed * 0.5 * dt;
                const newZ = e.mesh.position.z - dirToPlayer.z * e.speed * 0.5 * dt;
                const testPos = { x: newX, z: newZ };
                pushOutOfBuildings(testPos, 0.5);
                e.mesh.position.x = testPos.x;
                e.mesh.position.z = testPos.z;
            }
            const strafeVec = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).multiplyScalar(e.strafeDir);
            const strafeX = e.mesh.position.x + strafeVec.x * e.speed * 0.4 * dt;
            const strafeZ = e.mesh.position.z + strafeVec.z * e.speed * 0.4 * dt;
            const strafePos = { x: strafeX, z: strafeZ };
            pushOutOfBuildings(strafePos, 0.5);
            e.mesh.position.x = strafePos.x;
            e.mesh.position.z = strafePos.z;
            if (Math.random() < 0.005) e.strafeDir *= -1;
            if (now - e.lastFire > e.fireRate && dist < 35) {
                const gunPos = new THREE.Vector3().copy(e.mesh.position);
                gunPos.y += 0.8;
                const playerAim = new THREE.Vector3().copy(player.pos);
                if (hasLineOfSight(gunPos, playerAim)) {
                    e.lastFire = now;
                    const hitChance = Math.max(0.1, 0.8 - dist * 0.015);
                    if (Math.random() < hitChance) {
                        const dmg = e.damage * (0.8 + Math.random() * 0.4);
                        player.health -= dmg;
                        playSound('hurt');
                        showDamageOverlay();
                        if (player.health <= 0) {
                            player.health = 0;
                            gameOver();
                        }
                        updateHUD();
                    }
                    spawnEnemyBullet(e.mesh.position.clone());
                }
            }
        } else {
            e.alertTimer -= dt;
            if (e.alertTimer <= 0) {
                e.state = 'patrol';
                const tp = e.patrolTarget;
                const toTarget = new THREE.Vector3(tp.x - e.mesh.position.x, 0, tp.z - e.mesh.position.z);
                if (toTarget.length() < 2) {
                    e.patrolTarget.set(
                        (Math.random() - 0.5) * 100,
                        0,
                        (Math.random() - 0.5) * 100
                    );
                } else {
                    toTarget.normalize();
                    const newX = e.mesh.position.x + toTarget.x * e.speed * 0.3 * dt;
                    const newZ = e.mesh.position.z + toTarget.z * e.speed * 0.3 * dt;
                    const testPos = { x: newX, z: newZ };
                    pushOutOfBuildings(testPos, 0.5);
                    e.mesh.position.x = testPos.x;
                    e.mesh.position.z = testPos.z;
                }
            }
        }
        e.mesh.position.y = 1.0;
    }
}

function spawnEnemyBullet(from) {
    // Elongated glowing tracer oriented along travel direction - reads as a real round
    const geo = new THREE.BoxGeometry(0.05, 0.05, 0.7);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xff7043, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    mesh.position.y += 0.2;
    const dir = new THREE.Vector3().subVectors(player.pos, from).normalize();
    mesh.lookAt(mesh.position.clone().add(dir));
    // Enemy muzzle pop so you can see where the shot came from
    spawnTracer(mesh.position.clone(), mesh.position.clone().add(dir.clone().multiplyScalar(1.5)), 0xff8a50, 60);
    scene.add(mesh);
    const start = Date.now();
    let blocked = false;
    projectiles.push({
        mesh, type: 'bullet', born: start,
        update: () => {
            if (blocked) return;
            const spd = 60;
            const prevPos = mesh.position.clone();
            mesh.position.x += dir.x * spd * 0.016;
            mesh.position.y += dir.y * spd * 0.016;
            mesh.position.z += dir.z * spd * 0.016;
            const ray = new THREE.Raycaster(prevPos, dir, 0, spd * 0.016 + 0.1);
            const hits = ray.intersectObjects(levelBuildings);
            if (hits.length > 0) {
                mesh.position.copy(hits[0].point);
                blocked = true;
                mat.color.setHex(0x888888);
            }
            if (Date.now() - start > 2000) scene.remove(mesh);
        }
    });
}

function updatePlayer(dt) {
    const speed = crouching ? CROUCH_SPEED : (sprinting ? SPRINT_SPEED : MOVE_SPEED);
    const eyeHeight = crouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
    player.pos.y = eyeHeight;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const move = new THREE.Vector3();
    if (moveForward) move.add(forward);
    if (moveBack) move.sub(forward);
    if (moveRight) move.add(right);
    if (moveLeft) move.sub(right);
    if (move.length() > 0) {
        move.normalize().multiplyScalar(speed * dt);
        player.pos.add(move);
    }
    player.vel.y += GRAVITY * dt;
    player.pos.y += player.vel.y * dt;
    if (player.pos.y <= PLAYER_HEIGHT) {
        player.pos.y = PLAYER_HEIGHT;
        player.vel.y = 0;
        player.onGround = true;
    }
    // Recoil recovery: kick decays, applied on top of aim pitch
    if (recoilPitch > 0) {
        const recover = recoilPitch * Math.min(1, dt * 10);
        recoilPitch -= recover;
        pitch += recover * 0.6;
        if (recoilPitch < 0.0005) recoilPitch = 0;
    } else {
        pitch += recoilPitch;
        recoilPitch = 0;
    }
    camera.position.copy(player.pos);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch + recoilPitch;
    // Muzzle flash fade
    if (muzzleFlash && Date.now() > muzzleFlashUntil) {
        muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 12);
        if (muzzleLight) muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 80);
    }
    // Gun bob + recoil kick on viewmodels
    const moving = move.length() > 0 && player.onGround;
    if (moving) bobTime += dt * (sprinting ? 11 : 8);
    const bobY = moving ? Math.sin(bobTime) * 0.012 : Math.sin(Date.now() * 0.002) * 0.004;
    const bobX = moving ? Math.cos(bobTime * 0.5) * 0.008 : 0;
    const ids = ['revolver', 'mp5', 'ak47', 'm1014'];
    const cur = viewmodels[currentGunId()];
    if (cur) {
        cur.position.set(0.32 + bobX, -0.28 + bobY, -0.55 + recoilPitch * 1.2);
        cur.rotation.x = recoilPitch * 2.2;
    }
    ids.forEach(id => {
        if (id !== currentGunId() && viewmodels[id]) {
            viewmodels[id].position.set(0.32, -0.28, -0.55);
            viewmodels[id].rotation.x = 0;
        }
    });
    player.pos.x = Math.max(-140, Math.min(140, player.pos.x));
    player.pos.z = Math.max(-140, Math.min(140, player.pos.z));
    pushOutOfBuildings(player.pos, 0.4);
    if (mouseDown) shoot();
}

function updatePickups() {
    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        if (!p.mesh) continue;
        p.mesh.rotation.y += 0.02;
        p.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.15;
        const dist = player.pos.distanceTo(p.mesh.position);
        if (dist < 1.5) {
            if (p.type === 'medkit') {
                player.medkits++;
            } else {
                weapons[currentWeaponIdx].ammo = weapons[currentWeaponIdx].mag;
            }
            playSound('pickup');
            scene.remove(p.mesh);
            pickups.splice(i, 1);
            updateHUD();
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        if (Date.now() - projectiles[i].born > 3000) {
            if (projectiles[i].mesh.parent) scene.remove(projectiles[i].mesh);
            projectiles.splice(i, 1);
        }
    }
}

function showHitMarker() {
    const el = document.getElementById('hitmarker');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 100);
}

function showDamageOverlay() {
    const el = document.getElementById('damageOverlay');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 200);
}

function updateHUD() {
    const w = weapons[currentWeaponIdx];
    document.getElementById('hudWeapon').textContent = w.name;
    document.getElementById('hudAmmo').textContent = w.ammo;
    document.querySelector('.hud-ammo small').textContent = '/ ' + w.mag;
    document.getElementById('hudLevel').textContent = 'LEVEL ' + level + ' - ' + CITIES[(level - 1) % CITIES.length].name.toUpperCase();
    document.getElementById('hudScore').textContent = 'SCORE: ' + score;
    document.getElementById('hudKills').textContent = 'KILLS: ' + kills;
    document.getElementById('medkitIndicator').textContent = 'MEDKITS: ' + player.medkits;
    const hpPct = Math.max(0, player.health);
    document.getElementById('healthFill').style.width = hpPct + '%';
    document.getElementById('healthText').textContent = Math.round(hpPct) + ' HP';
    const slotsEl = document.getElementById('weaponSlots');
    slotsEl.innerHTML = '';
    weapons.forEach((wp, i) => {
        const slot = document.createElement('div');
        slot.className = 'weapon-slot' + (i === currentWeaponIdx ? ' active' : '');
        slot.textContent = wp.slot;
        slotsEl.appendChild(slot);
    });
}

function updateMinimap() {
    if (!minimapCtx) return;
    const ctx = minimapCtx;
    const size = 140;
    ctx.fillStyle = 'rgba(8,16,30,0.95)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(0,229,160,0.3)';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    const scale = 0.4;
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = '#00E5A0';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00E5A0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.sin(yaw) * 8, cy - Math.cos(yaw) * 8);
    ctx.stroke();
    enemies.forEach(e => {
        if (!e.alive) return;
        const dx = (e.mesh.position.x - player.pos.x) * scale;
        const dz = (e.mesh.position.z - player.pos.z) * scale;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < size / 2 - 5) {
            ctx.fillStyle = e.state === 'combat' ? '#FF4444' : '#FF8844';
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dz, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function buildProtagonist(gunId) {
    const grp = new THREE.Group();
    const skinM = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.6 });
    const shirtM = new THREE.MeshStandardMaterial({ color: 0x2e4a3e, roughness: 0.8 });
    const pantsM = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.8 });
    const hairM = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.9 });
    const bootM = new THREE.MeshStandardMaterial({ color: 0x1a140f, roughness: 0.85 });
    const add = (geo, m, x, y, z) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        grp.add(mesh);
        return mesh;
    };
    // legs (sturdy)
    add(new THREE.BoxGeometry(0.22, 0.85, 0.24), pantsM, -0.14, 0.43, 0);
    add(new THREE.BoxGeometry(0.22, 0.85, 0.24), pantsM, 0.14, 0.43, 0);
    add(new THREE.BoxGeometry(0.24, 0.14, 0.34), bootM, -0.14, 0.07, 0.04);
    add(new THREE.BoxGeometry(0.24, 0.14, 0.34), bootM, 0.14, 0.07, 0.04);
    // torso - broad shoulders, tapering waist (physique)
    add(new THREE.BoxGeometry(0.62, 0.35, 0.34), shirtM, 0, 1.05, 0);
    add(new THREE.BoxGeometry(0.52, 0.35, 0.3), shirtM, 0, 0.72, 0);
    // vest straps
    add(new THREE.BoxGeometry(0.12, 0.4, 0.36), pantsM, -0.18, 1.0, 0);
    add(new THREE.BoxGeometry(0.12, 0.4, 0.36), pantsM, 0.18, 1.0, 0);
    // arms - muscular, holding gun forward
    const armL = add(new THREE.BoxGeometry(0.16, 0.16, 0.55), skinM, -0.2, 1.05, 0.35);
    const armR = add(new THREE.BoxGeometry(0.16, 0.16, 0.55), skinM, 0.2, 1.0, 0.35);
    armL.rotation.y = 0.12;
    armR.rotation.y = -0.12;
    add(new THREE.BoxGeometry(0.3, 0.14, 0.14), skinM, -0.32, 1.05, 0.05);
    add(new THREE.BoxGeometry(0.3, 0.14, 0.14), skinM, 0.32, 1.0, 0.05);
    // head
    add(new THREE.SphereGeometry(0.19, 14, 12), skinM, 0, 1.45, 0);
    // long hair: back mass + side locks down to shoulders
    add(new THREE.BoxGeometry(0.42, 0.55, 0.16), hairM, 0, 1.2, -0.2);
    add(new THREE.BoxGeometry(0.1, 0.45, 0.12), hairM, -0.22, 1.2, -0.05);
    add(new THREE.BoxGeometry(0.1, 0.45, 0.12), hairM, 0.22, 1.2, -0.05);
    add(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, 1.2), hairM, 0, 1.48, -0.03);
    // gun in hands (reuse gun builder, world-scale clone)
    const built = buildGunModel(gunId || 'ak47');
    built.group.scale.setScalar(1.6);
    built.group.position.set(0, 1.02, 0.75);
    built.group.rotation.set(0, 0, 0);
    grp.add(built.group);
    return grp;
}

function startDeathAnim() {
    gameState = 'dying';
    mouseDown = false;
    moveForward = moveBack = moveLeft = moveRight = false;
    Object.values(viewmodels).forEach(v => { v.visible = false; });
    if (deathGroup) { scene.remove(deathGroup); deathGroup = null; }
    deathGroup = buildProtagonist(currentGunId());
    const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    deathGroup.position.set(
        player.pos.x + fwd.x * 1.2,
        0,
        player.pos.z + fwd.z * 1.2
    );
    deathGroup.rotation.y = yaw + Math.PI;
    scene.add(deathGroup);
    deathT = 0;
    deathCamFrom = camera.position.clone();
    const back = fwd.clone().multiplyScalar(-2.6);
    deathCamTo = new THREE.Vector3(
        deathGroup.position.x + back.x,
        2.0,
        deathGroup.position.z + back.z
    );
    document.exitPointerLock();
}

function updateDeathAnim(dt) {
    if (!deathGroup) return 1;
    deathT += dt;
    const t = Math.min(1, deathT / 2.0);
    // fall backward: rotate to ground, sink slightly, head drops last
    const ease = t * t * (3 - 2 * t);
    deathGroup.rotation.x = -ease * Math.PI / 2.15;
    deathGroup.position.y = -ease * 0.35;
    if (camera && deathCamFrom && deathCamTo) {
        camera.position.lerpVectors(deathCamFrom, deathCamTo, Math.min(1, deathT / 1.2));
        camera.lookAt(deathGroup.position.x, 1.0 - ease * 0.6, deathGroup.position.z);
    }
    if (muzzleFlash) muzzleFlash.material.opacity = 0;
    if (muzzleLight) muzzleLight.intensity = 0;
    return t;
}

function gameOver() {
    if (gameState === 'dying' || gameState === 'gameover') return;
    startDeathAnim();
}

function winLevel() {
    if (level >= 10) {
        gameState = 'win';
        document.getElementById('winScreen').classList.add('show');
        document.getElementById('winScore').textContent = 'FINAL SCORE: ' + score;
        document.exitPointerLock();
    } else {
        level++;
        player.health = 100;
        player.medkits = Math.min(player.medkits + 1, 5);
        weapons.forEach(w => w.ammo = w.mag);
        generateLevel(level);
        updateHUD();
    }
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('winScreen').classList.remove('show');
    if (deathGroup) { scene.remove(deathGroup); deathGroup = null; }
    deathT = 0;
    level = 1;
    score = 0;
    kills = 0;
    player.health = 100;
    player.medkits = 3;
    weapons.forEach(w => { w.ammo = w.mag; w.reloading = false; });
    currentWeaponIdx = 0;
    generateLevel(level);
    showViewmodel(0);
    gameState = 'playing';
    document.getElementById('blocker').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.body.requestPointerLock();
}
window.restartGame = restartGame;

function pauseGame() {
    if (gameState !== 'playing') return;
    paused = true;
    document.exitPointerLock();
    document.getElementById('pauseScreen').classList.add('show');
}

function resumeGame() {
    paused = false;
    document.getElementById('pauseScreen').classList.remove('show');
    document.getElementById('settingsScreen').classList.remove('show');
    document.body.requestPointerLock();
}

function openSettings() {
    document.getElementById('pauseScreen').classList.remove('show');
    document.getElementById('settingsScreen').classList.add('show');
    refreshSettingsUI();
}

function closeSettings() {
    document.getElementById('settingsScreen').classList.remove('show');
    document.getElementById('pauseScreen').classList.add('show');
}

function quitToMenu() {
    paused = false;
    gameState = 'menu';
    document.getElementById('pauseScreen').classList.remove('show');
    document.getElementById('settingsScreen').classList.remove('show');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('blocker').classList.remove('show');
    document.getElementById('blocker').classList.remove('hidden');
    document.exitPointerLock();
}

function refreshSettingsUI() {
    document.getElementById('sensitivityVal').textContent = settings.sensitivity.toFixed(1);
    document.getElementById('fovVal').textContent = settings.fov;
    document.getElementById('volumeVal').textContent = settings.volume + '%';
    const iyBtn = document.getElementById('invertYBtn');
    iyBtn.textContent = settings.invertY ? 'ON' : 'OFF';
    iyBtn.classList.toggle('off', !settings.invertY);
    const chBtn = document.getElementById('crosshairBtn');
    chBtn.textContent = settings.crosshair ? 'ON' : 'OFF';
    chBtn.classList.toggle('off', !settings.crosshair);
    document.querySelector('.crosshair').style.display = settings.crosshair ? '' : 'none';
    const mmBtn = document.getElementById('minimapBtn');
    mmBtn.textContent = settings.minimap ? 'ON' : 'OFF';
    mmBtn.classList.toggle('off', !settings.minimap);
    document.querySelector('.hud-minimap').style.display = settings.minimap ? '' : 'none';
    if (camera) camera.fov = settings.fov;
    if (camera) camera.updateProjectionMatrix();
}

window.adjustSetting = function(key, delta) {
    if (key === 'sensitivity') {
        settings.sensitivity = Math.max(0.2, Math.min(3.0, +(settings.sensitivity + delta).toFixed(1)));
    } else if (key === 'fov') {
        settings.fov = Math.max(50, Math.min(110, settings.fov + delta));
    } else if (key === 'volume') {
        settings.volume = Math.max(0, Math.min(100, settings.volume + delta));
    }
    refreshSettingsUI();
};

window.toggleSetting = function(key) {
    settings[key] = !settings[key];
    refreshSettingsUI();
};

document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsBackBtn').addEventListener('click', closeSettings);
document.getElementById('quitBtn').addEventListener('click', quitToMenu);

function startGame() {
    initAudio();
    initThree();
    setupInput();
    generateLevel(level);
    gameState = 'playing';
    document.getElementById('blocker').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.body.requestPointerLock();
    gameLoop();
}

document.getElementById('startBtn').addEventListener('click', startGame);

document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && gameState === 'playing' && !paused) {
        pauseGame();
    }
});

function gameLoop() {
    requestAnimationFrame(gameLoop);
    if (paused) return;
    if (gameState === 'dying') {
        const dt = Math.min(clock.getDelta(), 0.05);
        updateProjectiles();
        const t = updateDeathAnim(dt);
        updateMinimap();
        renderer.render(scene, camera);
        if (t >= 1 && gameState === 'dying') {
            gameState = 'gameover';
            document.getElementById('gameOverScreen').classList.add('show');
            document.getElementById('finalScore').textContent = 'SCORE: ' + score;
            const fb = document.getElementById('finalBreath');
            if (fb) fb.textContent = 'FINAL BREATH — ' + weapons[currentWeaponIdx].name + ' IN HAND';
        }
        return;
    }
    if (gameState !== 'playing') return;
    const dt = Math.min(clock.getDelta(), 0.05);
    updatePlayer(dt);
    updateEnemies(dt);
    updatePickups();
    updateProjectiles();
    updateMinimap();
    const alive = enemies.filter(e => e.alive).length;
    if (alive === 0 && enemies.length > 0) {
        winLevel();
    }
    renderer.render(scene, camera);
}
