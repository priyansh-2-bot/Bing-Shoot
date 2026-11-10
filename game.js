import * as THREE from 'three';

const PLAYER_HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.0;
const GRAVITY = -20;
const JUMP_FORCE = 8;
const MOVE_SPEED = 6;
const SPRINT_SPEED = 10;
const CROUCH_SPEED = 3;

const CITIES = [
    { name: 'Mumbai', place: 'Marine Drive', desc: 'Clear the promenade hostiles', ground: 0x2E3034, sky: 0x78AEE6, bld: 0x969BA8, accent: 0x1C3C6E },
    { name: 'Kolkata', place: 'Howrah Bridge', desc: 'Secure the bridge crossing', ground: 0x483E30, sky: 0x96AFBE, bld: 0xCDAF5F, accent: 0x78281E },
    { name: 'Chennai', place: 'Marina Beach', desc: 'Neutralize beachfront threats', ground: 0xCDBE96, sky: 0x87C3E1, bld: 0xD7AA6E, accent: 0x285A3C },
    { name: 'Delhi', place: 'India Gate', desc: 'Clear the monument grounds', ground: 0x968278, sky: 0xC8B0A0, bld: 0xB95F3C, accent: 0x5A2D1E },
    { name: 'Chandigarh', place: 'Sector 17 Plaza', desc: 'Secure the city plaza', ground: 0xB9B9B9, sky: 0x96BEE1, bld: 0xE1E1E1, accent: 0xC83C32 },
    { name: 'Bengaluru', place: 'MG Road', desc: 'Clear the commercial district', ground: 0x5A7850, sky: 0x82AAC8, bld: 0xAAB4CD, accent: 0x1E783C },
    { name: 'Panjim', place: 'Mandovi Riverfront', desc: 'Clear the riverfront sector', ground: 0xD7C8A0, sky: 0x78BEDC, bld: 0xE66E5F, accent: 0x5AA0A0 },
    { name: 'Jaipur', place: 'Hawa Mahal', desc: 'Secure the palace district', ground: 0xCDAF8C, sky: 0xE6BEA0, bld: 0xD78278, accent: 0x6E3C32 },
    { name: 'Lucknow', place: 'Bara Imambara', desc: 'Clear the historic complex', ground: 0xC8C3B9, sky: 0xAAC3D7, bld: 0xEBE1C8, accent: 0x006E82 },
    { name: 'Kanyakumari', place: 'Rock Memorial', desc: 'Final stand at the memorial', ground: 0xCDC8AF, sky: 0xFFD296, bld: 0xE6733C, accent: 0x4646C8 },
];

const WEAPONS = [
    { id: 'revolver', name: 'REVOLVER .44', slot: 1, unlock: 1, damage: 38, headMult: 2.5, fireRate: 300, mag: 6, reloadTime: 1100, spread: 0.01, auto: false, sfx: 'gunshot', adsZoom: 62, tracer: { color: 0xffd27a, width: 0.022, life: 90 } },
    { id: 'mp5', name: 'MP5 SMG', slot: 2, unlock: 2, damage: 16, headMult: 3.0, fireRate: 85, mag: 25, reloadTime: 1600, spread: 0.02, auto: true, sfx: 'smg', adsZoom: 58, tracer: { color: 0x7df9ff, width: 0.015, life: 60 } },
    { id: 'ak47', name: 'AK-47', slot: 3, unlock: 3, damage: 27, headMult: 3.0, fireRate: 110, mag: 47, reloadTime: 1900, spread: 0.025, auto: true, sfx: 'ak', adsZoom: 50, tracer: { color: 0xffb457, width: 0.018, life: 75 } },
    { id: 'm1014', name: 'M1014 SHOTGUN', slot: 4, unlock: 4, damage: 9, headMult: 2.0, fireRate: 720, mag: 10, reloadTime: 2400, spread: 0.08, auto: false, pellets: 7, sfx: 'shotgun', adsZoom: 62, tracer: { color: 0xfff2b0, width: 0.02, life: 70 } },
    { id: 'scar', name: 'SCAR-L', slot: 5, unlock: 5, damage: 30, headMult: 3.2, fireRate: 130, mag: 30, reloadTime: 1800, spread: 0.018, auto: true, sfx: 'scar', adsZoom: 42, tracer: { color: 0x9dff70, width: 0.017, life: 75 } },
    { id: 'awp', name: 'AWP SNIPER', slot: 6, unlock: 7, damage: 110, headMult: 2.0, fireRate: 1400, mag: 8, reloadTime: 2600, spread: 0.03, auto: false, sfx: 'awp', adsZoom: 18, scope: true, tracer: { color: 0xffffff, width: 0.013, life: 110 } },
    { id: 'rpg', name: 'RPG-7', slot: 7, unlock: 9, damage: 130, headMult: 1.0, fireRate: 1800, mag: 1, reloadTime: 2800, spread: 0.005, auto: false, sfx: 'rpg', adsZoom: 60, rocket: true, tracer: { color: 0xff6a3c, width: 0.04, life: 120 } },
];

// Weapon upgrade system: each weapon can be upgraded 5 times per stat
const UPGRADE_COSTS = [50, 100, 200, 400, 800]; // score cost per level
const UPGRADE_MAX = 5;
// weaponUpgrades: { weaponId: { damage: 0-5, reload: 0-5, mag: 0-5, recoil: 0-5, firerate: 0-5 } }
let weaponUpgrades = {};


function isUnlocked(idx) {
    return WEAPONS[idx].unlock <= level;
}

function showBanner(text, ms) {
    const el = document.getElementById('unlockBanner');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => el.classList.remove('show'), ms || 3500);
}

// All-time best, persisted across sessions
let highScore = 0;
try { highScore = parseInt(localStorage.getItem('bingShootBest') || '0', 10) || 0; } catch (e) {}

function saveBest() {
    let isNew = false;
    if (score > highScore) {
        highScore = score;
        isNew = score > 0;
        try { localStorage.setItem('bingShootBest', String(score)); } catch (e) {}
    }
    const mb = document.getElementById('menuBest');
    if (mb) mb.textContent = '★ BEST: ' + highScore + ' ★';
    return isNew;
}

function loadSettings() {
    try {
        const raw = localStorage.getItem('bingShootSettings');
        if (raw) {
            const s = JSON.parse(raw);
            for (const k in s) settings[k] = s[k];
        }
    } catch (e) {}
}

function saveSettings() {
    try { localStorage.setItem('bingShootSettings', JSON.stringify(settings)); } catch (e) {}
}

function loadWeaponUpgrades() {
    try {
        const raw = localStorage.getItem('bingShootUpgrades');
        if (raw) weaponUpgrades = JSON.parse(raw);
    } catch (e) {}
}

function saveWeaponUpgrades() {
    try { localStorage.setItem('bingShootUpgrades', JSON.stringify(weaponUpgrades)); } catch (e) {}
}

function getWeaponUpgrade(weaponId, stat) {
    const u = weaponUpgrades[weaponId];
    return u && u[stat] !== undefined ? u[stat] : 0;
}

function getWeaponStat(weaponId, stat) {
    const w = WEAPONS.find(w => w.id === weaponId);
    if (!w) return 0;
    const level = getWeaponUpgrade(weaponId, stat);
    if (level === 0) return w[stat];
    // damage: +10% per level, reload: -10% per level, mag: +2 per level, recoil: -15% per level, firerate: +10% per level
    switch (stat) {
        case 'damage': return w.damage * (1 + level * 0.10);
        case 'reload': return Math.max(500, w.reloadTime * (1 - level * 0.10));
        case 'mag': return w.mag + level * 2;
        case 'recoil': return level; // used as recoil reduction multiplier
        case 'firerate': return Math.max(100, w.fireRate * (1 - level * 0.10));
    }
    return w[stat];
}

function canAffordUpgrade(weaponId, stat) {
    const level = getWeaponUpgrade(weaponId, stat);
    if (level >= UPGRADE_MAX) return false;
    return score >= UPGRADE_COSTS[level];
}

function buyUpgrade(weaponId, stat) {
    if (!canAffordUpgrade(weaponId, stat)) return false;
    const level = getWeaponUpgrade(weaponId, stat);
    score -= UPGRADE_COSTS[level];
    if (!weaponUpgrades[weaponId]) weaponUpgrades[weaponId] = {};
    weaponUpgrades[weaponId][stat] = level + 1;
    saveWeaponUpgrades();
    // Apply mag upgrade immediately to weapon capacity
    if (stat === 'mag') {
        const w = weapons.find(w => w.id === weaponId);
        if (w) {
            const newMag = getWeaponStat(weaponId, 'mag');
            w.mag = Math.floor(newMag);
            if (w.ammo > w.mag) w.ammo = w.mag;
        }
    }
    updateHUD();
    return true;
}

function dimScene(on) {
    if (renderer && renderer.domElement) renderer.domElement.style.filter = on ? 'brightness(0.32)' : '';
}

const GUN_IDS = ['revolver', 'mp5', 'ak47', 'm1014', 'scar', 'awp', 'rpg'];

const ENEMY_TYPES = {
    grunt: { hp: 100, speed: 1.6, damage: 8, fireRate: 1000, score: 30, color: 0x464E46 },
    rifle: { hp: 130, speed: 1.5, damage: 12, fireRate: 850, score: 45, color: 0x4E4A3C },
    soldier: { hp: 170, speed: 1.7, damage: 15, fireRate: 720, score: 60, color: 0x3C4252 },
    sniper: { hp: 120, speed: 1.1, damage: 35, fireRate: 2000, score: 90, color: 0x5C5852 },
    heavy: { hp: 280, speed: 0.9, damage: 22, fireRate: 1500, score: 140, color: 0x5F3A30 },
};

// Boss types — spawn at campaign milestones (levels 5, 10)
const BOSS_TYPES = {
    warlord: {
        hp: 1500, speed: 1.2, damage: 35, fireRate: 900, score: 500,
        color: 0x8B0000, size: 1.4, attackPatterns: ['charge', 'volley', 'rage']
    },
    overlord: {
        hp: 3000, speed: 0.8, damage: 50, fireRate: 600, score: 1000,
        color: 0x2F1B0C, size: 1.8, attackPatterns: ['rocket_barrage', 'teleport', 'berserk']
    }
};

function getLevelEnemyCount(lvl) {
    // Scale enemy count with level: 6, 7, 8, 9, 10, then +2 per level after
    return Math.min(20, 5 + lvl);
}

function getLevelDodge(lvl) {
    return Math.min(1.0, 0.25 + lvl * 0.09);
}

function getLevelEnemyTypes(lvl) {
    if (lvl <= 1) return ['grunt'];
    if (lvl <= 2) return ['grunt', 'grunt'];
    if (lvl <= 3) return ['grunt', 'grunt', 'rifle'];
    if (lvl <= 5) return ['grunt', 'rifle', 'soldier'];
    return ['grunt', 'rifle', 'soldier', 'sniper', 'heavy'];
}

function getLevelDamageScale(lvl) {
    return Math.min(1.5, 0.5 + lvl * 0.1);
}

function getLevelFireRateScale(lvl) {
    return Math.max(0.55, 1.9 - lvl * 0.15);
}

let scene, camera, renderer, clock;
let dustParticles = null;
// Object pools to reduce GC pressure during intense combat
let tracerPool = [];
let impactPool = [];
let bloodPool = [];
let activeTracers = [];
let activeImpacts = [];
let activeBlood = [];
let player = { pos: new THREE.Vector3(0, PLAYER_HEIGHT, 0), vel: new THREE.Vector3(), onGround: true, crouching: false, health: 100, medkits: 3 };
let weapons = WEAPONS.map(w => ({ ...w, ammo: w.mag, reloading: false, lastFire: 0, lastReloadStart: 0 }));
let currentWeaponIdx = 0;
let enemies = [];
let projectiles = [];
let pickups = [];
let level = 1;
let score = 0;
let kills = 0;
let headshots = 0;
let shotsFired = 0;
let shotsHit = 0;
let gameMode = 'campaign'; // 'campaign' | 'survival'
let survivalWave = 0;
let survivalKills = 0;
let survivalTime = 0;
let waveActive = false;
let waveEnemiesRemaining = 0;
let gameState = 'menu';
// HUD dirty tracking to minimize DOM writes
let hudDirty = { ammo: true, health: true, weapon: true, kills: true, level: true, slots: true };
let minimapCtx;
let moveForward = false, moveBack = false, moveLeft = false, moveRight = false;
let sprinting = false, crouching = false;
let yaw = 0, pitch = 0;
let mouseDown = false;
let levelBuildings = [];
let buildingBoxes = [];
let settings = { sensitivity: 1.0, fov: 75, volume: 80, invertY: false, crosshair: true, minimap: true, difficulty: 'normal' };
const DEFAULT_SETTINGS = { sensitivity: 1.0, fov: 75, volume: 80, invertY: false, crosshair: true, minimap: true, difficulty: 'normal' };
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
let aiming = false;
let rmbDown = false;
let recoilKick = 0;
let gunKick = 0;
let screenShake = 0;
let throwables = { grenade: 3, molotov: 2 };
let footstepTime = 0;
let footstepInterval = 0.45;
let liveThrowables = [];
let fireZones = [];
let spawnProtUntil = 0;
let intermissionUntil = 0;
let lastCountShown = -1;
let levelRoofSnipers = 0;

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
let noiseBuf = null;
let masterGain = null;

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = (settings.volume || 80) / 100;
    masterGain.connect(audioCtx.destination);
    // shared 2s white-noise buffer — every gunshot is sculpted from this
    const len = audioCtx.sampleRate * 2;
    noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}

function masterVol() {
    if (masterGain && audioCtx) masterGain.gain.value = (settings.volume || 80) / 100;
}

// filtered noise burst: the "crack" / "body" of a real report
function noiseHit(when, dur, filterType, freq, vol, freqEnd) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = audioCtx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, when);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, when + dur);
    f.Q.value = 0.7;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(f); f.connect(g); g.connect(masterGain);
    src.start(when, Math.random() * 1.5);
    src.stop(when + dur + 0.05);
}

// low sine drop: chest-thump of the muzzle blast
function thump(when, f0, f1, dur, vol) {
    const o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), when + dur);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(masterGain);
    o.start(when); o.stop(when + dur + 0.05);
}

// short metallic action clang (AK twang, slide/bolt clack)
function clang(when, freq, dur, vol) {
    const o = audioCtx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, when);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(masterGain);
    o.start(when); o.stop(when + dur + 0.02);
}

// distant echo slap off the city
function echoSlap(when, delay, dur, freq, vol) {
    const t = when + delay;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = audioCtx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(masterGain);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
}

// per-weapon recipes tuned to each gun's real-world signature
function gunRecipe(id, now) {
    switch (id) {
        case 'revolver': // .44 Magnum — heavy contained BANG, deep boom, short
            noiseHit(now, 0.09, 'highpass', 1700, 0.55);
            noiseHit(now, 0.22, 'lowpass', 900, 0.55);
            thump(now, 120, 38, 0.25, 0.55);
            echoSlap(now, 0.18, 0.25, 1200, 0.12);
            break;
        case 'mp5': // 9mm SMG — light high-pitched PAP, little bass
            noiseHit(now, 0.055, 'bandpass', 2900, 0.42);
            noiseHit(now, 0.1, 'lowpass', 1500, 0.3);
            thump(now, 210, 95, 0.08, 0.26);
            echoSlap(now, 0.12, 0.12, 1800, 0.06);
            break;
        case 'ak': // 7.62x39 — deep aggressive BARK + stamped-steel twang
            noiseHit(now, 0.1, 'bandpass', 1500, 0.55);
            noiseHit(now, 0.28, 'lowpass', 700, 0.6);
            thump(now, 110, 36, 0.3, 0.6);
            clang(now + 0.03, 620, 0.06, 0.09);
            echoSlap(now, 0.2, 0.3, 900, 0.15);
            break;
        case 'shotgun': // 12-gauge — cannon BOOM, long gut-punch tail
            noiseHit(now, 0.12, 'highpass', 1100, 0.55);
            noiseHit(now, 0.45, 'lowpass', 480, 0.65);
            thump(now, 90, 28, 0.5, 0.65);
            echoSlap(now, 0.22, 0.4, 750, 0.18);
            break;
        case 'scar': // 5.56 — crisp tight crack, brighter than the AK
            noiseHit(now, 0.08, 'bandpass', 2400, 0.5);
            noiseHit(now, 0.16, 'lowpass', 1100, 0.45);
            thump(now, 160, 60, 0.14, 0.42);
            clang(now + 0.02, 900, 0.04, 0.06);
            echoSlap(now, 0.16, 0.2, 1400, 0.1);
            break;
        case 'awp': // magnum sniper — thunderclap + long rolling echo
            noiseHit(now, 0.14, 'highpass', 1900, 0.6);
            noiseHit(now, 0.5, 'lowpass', 750, 0.6);
            thump(now, 100, 30, 0.55, 0.6);
            echoSlap(now, 0.25, 0.45, 900, 0.2);
            echoSlap(now, 0.55, 0.5, 600, 0.1);
            break;
        case 'rpg': // launch: rising WHOOSH + deep launcher whump
            noiseHit(now, 0.45, 'lowpass', 350, 0.5, 2600);
            thump(now, 75, 30, 0.5, 0.55);
            echoSlap(now, 0.3, 0.3, 700, 0.12);
            break;
        default:
            noiseHit(now, 0.09, 'bandpass', 1800, 0.45);
            noiseHit(now, 0.2, 'lowpass', 900, 0.45);
            thump(now, 130, 45, 0.2, 0.45);
            break;
    }
}

function playSound(type, pitch = 1, volume = 1) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    const now = audioCtx.currentTime;
    const vol = (settings.volume || 80) / 100 * volume;
    switch (type) {
        case 'gunshot': gunRecipe('revolver', now); break;
        case 'smg': gunRecipe('mp5', now); break;
        case 'rifle': gunRecipe('scar', now); break;
        case 'ak': gunRecipe('ak', now); break;
        case 'scar': gunRecipe('scar', now); break;
        case 'awp': gunRecipe('awp', now); break;
        case 'rpg': gunRecipe('rpg', now); break;
        case 'shotgun': gunRecipe('shotgun', now); break;
        case 'hit':
            osc.type = 'sine'; osc.frequency.setValueAtTime(800 * pitch, now);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05); break;
        case 'headshot':
            osc.type = 'sine'; osc.frequency.setValueAtTime(1200 * pitch, now);
            gain.gain.setValueAtTime(0.2 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now); osc.stop(now + 0.08); break;
        case 'hurt':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200 * pitch, now);
            osc.frequency.exponentialRampToValueAtTime(80 * pitch, now + 0.15);
            gain.gain.setValueAtTime(0.2 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now); osc.stop(now + 0.2); break;
        case 'explosion':
            noiseHit(now, 0.5, 'lowpass', 400, 0.7 * vol);
            noiseHit(now, 0.15, 'highpass', 900, 0.4 * vol);
            thump(now, 70, 24, 0.8, 0.7 * vol);
            echoSlap(now, 0.3, 0.6, 500, 0.2 * vol);
            break;
        case 'throw':
            osc.type = 'sine'; osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now); osc.stop(now + 0.15); break;
        case 'fire':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
            gain.gain.setValueAtTime(0.12 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now); osc.stop(now + 0.35); break;
        case 'reload':
            osc.type = 'triangle'; osc.frequency.setValueAtTime(600 * pitch, now);
            osc.frequency.setValueAtTime(900 * pitch, now + 0.1);
            gain.gain.setValueAtTime(0.1 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now); osc.stop(now + 0.15); break;
        case 'pickup':
            osc.type = 'sine'; osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now); osc.stop(now + 0.2); break;
        case 'death':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150 * pitch, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
            gain.gain.setValueAtTime(0.25 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now); osc.stop(now + 0.5); break;
        case 'enemy_die':
            osc.type = 'sine'; osc.frequency.setValueAtTime(100 * pitch, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now); osc.stop(now + 0.4); break;
        case 'footstep':
            osc.type = 'triangle'; osc.frequency.setValueAtTime(120 * pitch, now);
            osc.frequency.exponentialRampToValueAtTime(90 * pitch, now + 0.08);
            gain.gain.setValueAtTime(0.08 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now); osc.stop(now + 0.1); break;
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
    } else if (id === 'm1014') {
        add(new THREE.BoxGeometry(0.085, 0.11, 0.55), dark, 0, 0, -0.2);
        add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), mid, 0, 0.03, -0.55).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.07, 0.08, 0.25), wood, 0, -0.06, -0.3);
        add(new THREE.BoxGeometry(0.06, 0.12, 0.09), wood, 0, -0.09, 0.1, 0.25, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.12), skin, 0, -0.08, -0.1);
        add(new THREE.BoxGeometry(0.02, 0.02, 0.08), accent, 0, 0.065, -0.28);
    } else if (id === 'scar') {
        add(new THREE.BoxGeometry(0.078, 0.105, 0.52), mid, 0, 0, -0.2);
        add(new THREE.CylinderGeometry(0.024, 0.024, 0.34, 10), dark, 0, 0.02, -0.55).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.06, 0.15, 0.07), grip, 0, -0.11, -0.08, 0.35, 0, 0);
        add(new THREE.BoxGeometry(0.06, 0.09, 0.12), grip, 0, -0.05, 0.12, -0.15, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.12), skin, 0, -0.08, -0.1);
        add(new THREE.BoxGeometry(0.075, 0.025, 0.3), dark, 0, 0.065, -0.2);
        add(new THREE.BoxGeometry(0.016, 0.04, 0.016), accent, 0, 0.09, -0.3);
    } else if (id === 'awp') {
        const green = vmMat(0x3d5a3a);
        add(new THREE.BoxGeometry(0.07, 0.1, 0.5), green, 0, 0, -0.15);
        add(new THREE.CylinderGeometry(0.026, 0.026, 0.5, 12), dark, 0, 0.02, -0.6).rotation.x = Math.PI / 2;
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12), grip, 0, 0.1, -0.15).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.05, 0.05, 0.02), vmMat(0x101418), 0, 0.1, -0.05);
        add(new THREE.BoxGeometry(0.055, 0.14, 0.07), green, 0, -0.1, -0.05, 0.4, 0, 0);
        add(new THREE.BoxGeometry(0.06, 0.1, 0.1), green, 0, -0.04, 0.15, -0.2, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.12), skin, 0, -0.08, -0.08);
        add(new THREE.BoxGeometry(0.05, 0.06, 0.02), dark, 0, -0.05, -0.42);
    } else {
        add(new THREE.CylinderGeometry(0.055, 0.055, 0.85, 12), mid, 0, 0, -0.25).rotation.x = Math.PI / 2;
        add(new THREE.SphereGeometry(0.075, 10, 8), dark, 0, 0, -0.62);
        add(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 10), grip, 0, 0.02, -0.72).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.07, 0.1, 0.2), wood, 0, -0.06, 0.1, 0.2, 0, 0);
        add(new THREE.BoxGeometry(0.09, 0.07, 0.12), skin, 0, -0.08, -0.05);
        add(new THREE.BoxGeometry(0.02, 0.03, 0.02), accent, 0, 0.06, -0.2);
    }
    const tip = new THREE.Object3D();
    const tipZ = id === 'revolver' ? -0.42 : id === 'mp5' ? -0.68 : id === 'ak47' ? -0.73 : id === 'm1014' ? -0.78 : id === 'scar' ? -0.75 : id === 'awp' ? -0.88 : -0.8;
    tip.position.set(0, 0.02, tipZ);
    g.add(tip);
    return { group: g, tip };
}

function buildViewmodels() {
    const basePos = new THREE.Vector3(0.32, -0.28, -0.55);
    GUN_IDS.forEach((id, i) => {
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
    GUN_IDS.forEach((id, i) => {
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
    // Ambient dust particles
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 80;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
        dustPos[i] = (Math.random() - 0.5) * 100;
        dustPos[i + 1] = Math.random() * 20 + 2;
        dustPos[i + 2] = (Math.random() - 0.5) * 100;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.4 });
    dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);
    muzzleLight = new THREE.PointLight(0xffb457, 0, 8, 2);
    muzzleLight.position.set(0.35, -0.25, -0.8);
    camera.add(muzzleLight);
    const flashGeo = new THREE.PlaneGeometry(0.2, 0.2);
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
    liveThrowables.forEach(t => scene.remove(t.mesh));
    // Return pooled objects to pools and hide them
    activeTracers.forEach(p => { p.item.mesh.visible = false; p.item.active = false; tracerPool.push(p.item); });
    activeImpacts.forEach(p => { p.item.mesh.visible = false; p.item.active = false; impactPool.push(p.item); });
    activeBlood.forEach(p => { p.item.mesh.visible = false; p.item.active = false; bloodPool.push(p.item); });
    activeTracers = []; activeImpacts = []; activeBlood = [];
    levelBuildings = []; enemies = []; pickups = []; projectiles = [];
    liveThrowables = []; fireZones = [];
}

function lmMat(color, emissive, ei) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: emissive || 0x000000, emissiveIntensity: ei || 0 });
}

function lmBox(x, y, z, w, h, d, color, collide, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lmMat(color));
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    levelBuildings.push(m);
    if (collide) buildingBoxes.push({ minX: x - w / 2 - 0.2, maxX: x + w / 2 + 0.2, minZ: z - d / 2 - 0.2, maxZ: z + d / 2 + 0.2, h, cx: x, cz: z });
    return m;
}

function lmFlat(x, z, w, d, color, y) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lmMat(color));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y || 0.02, z);
    m.receiveShadow = true;
    scene.add(m);
    levelBuildings.push(m);
    return m;
}

function lmCyl(x, y, z, rt, rb, h, color, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), lmMat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    scene.add(m);
    levelBuildings.push(m);
    return m;
}

// Triumphal arch monument (Gateway / India Gate style)
function lmArch(x, z, s, color, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    if (ry) g.rotation.y = ry;
    const mk = (w, h, d, px, py, pz, c) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lmMat(c || color));
        m.position.set(px, py, pz);
        m.castShadow = true;
        g.add(m);
        return m;
    };
    mk(0.22 * s, 0.7 * s, 0.9 * s, -0.39 * s, 0.35 * s, 0);
    mk(0.22 * s, 0.7 * s, 0.9 * s, 0.39 * s, 0.35 * s, 0);
    mk(1.0 * s, 0.22 * s, 0.95 * s, 0, 0.78 * s, 0);
    mk(0.7 * s, 0.12 * s, 0.7 * s, 0, 0.95 * s, 0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), lmMat(color));
    dome.position.set(0, 1.0 * s, 0);
    dome.castShadow = true;
    g.add(dome);
    for (let i = -1; i <= 1; i++) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.25 * s, 6), lmMat(color));
        t.position.set(i * 0.3 * s, 1.05 * s, 0.3 * s);
        g.add(t);
    }
    scene.add(g);
    g.traverse(o => { if (o.isMesh) levelBuildings.push(o); });
    buildingBoxes.push({ minX: x - 0.55 * s, maxX: x + 0.55 * s, minZ: z - 0.55 * s, maxZ: z + 0.55 * s, h: 1.0 * s, cx: x, cz: z });
}

// Striped tower (lighthouse / minaret)
function lmTower(x, z, w, h, c1, c2) {
    const bands = 6;
    for (let i = 0; i < bands; i++) {
        lmBox(x, (h / bands) * (i + 0.5), z, w * (1 - i * 0.06), h / bands + 0.05, w * (1 - i * 0.06), i % 2 ? c1 : c2, i === 0);
    }
    lmCyl(x, h + 0.5, z, 0.4, 0.4, 1.0, 0x2a2d36);
    const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe9a3 }));
    lampM.position.set(x, h + 1.1, z);
    scene.add(lampM);
    levelBuildings.push(lampM);
}

// Truss bridge across a river strip
function lmBridge(cx, cz, len, alongX) {
    const deckW = 7, deckH = 1.2;
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    if (!alongX) g.rotation.y = Math.PI / 2;
    const steel = lmMat(0x7a4a3a);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, deckH, deckW), lmMat(0x3c3f48));
    deck.position.y = 3.6;
    deck.castShadow = true;
    g.add(deck);
    for (const sz of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 1.0, 0.3), steel);
        rail.position.set(0, 4.4, sz * (deckW / 2));
        g.add(rail);
        for (let i = -3; i <= 3; i++) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), steel);
            post.position.set(i * len / 7, 5.6, sz * (deckW / 2));
            post.rotation.z = -i * 0.18 * sz;
            g.add(post);
        }
        const arc = new THREE.Mesh(new THREE.TorusGeometry(len * 0.32, 0.35, 6, 14, Math.PI), steel);
        arc.position.set(0, 4.4, sz * (deckW / 2));
        g.add(arc);
    }
    for (let i = -1; i <= 1; i++) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(2, 4.6, deckW + 1), lmMat(0x8a8d96));
        pier.position.set(i * len / 3, 1.0, 0);
        g.add(pier);
    }
    scene.add(g);
    g.traverse(o => { if (o.isMesh) levelBuildings.push(o); });
}

// Circular fountain plaza
function lmFountain(x, z) {
    lmCyl(x, 0.4, z, 5, 5.4, 0.8, 0xb9bdc8, 16);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x3f9fd8, roughness: 0.2 }));
    w.position.set(x, 0.85, z);
    scene.add(w);
    levelBuildings.push(w);
    lmCyl(x, 1.6, z, 0.5, 0.8, 2.4, 0x9aa0ac, 10);
    lmCyl(x, 2.9, z, 1.4, 0.4, 0.5, 0x9aa0ac, 10);
    lmFlat(x - 9, z, 6, 12, 0xa8adb8);
    lmFlat(x + 9, z, 6, 12, 0xa8adb8);
}

// Palm / tree / lamp props (no collision except trunk skip - small)
function lmPalm(x, z, s) {
    s = s || 1;
    lmCyl(x, 2.2 * s, z, 0.16 * s, 0.22 * s, 4.4 * s, 0x6e4f30, 7);
    for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.4 * s, 0.7 * s),
            new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.9, side: THREE.DoubleSide }));
        const a = (i / 5) * Math.PI * 2;
        leaf.position.set(x + Math.cos(a) * 1.0 * s, 4.5 * s, z + Math.sin(a) * 1.0 * s);
        leaf.rotation.y = -a;
        leaf.rotation.z = 0.5;
        scene.add(leaf);
        levelBuildings.push(leaf);
    }
}

function lmTree(x, z, s) {
    s = s || 1;
    lmCyl(x, 1.0 * s, z, 0.18 * s, 0.24 * s, 2.0 * s, 0x5a4028, 7);
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.5 * s, 8, 7),
        lmMat(0x2f6e35));
    c.position.set(x, 2.8 * s, z);
    c.castShadow = true;
    scene.add(c);
    levelBuildings.push(c);
}

function lmLamp(x, z) {
    lmCyl(x, 2.2, z, 0.08, 0.1, 4.4, 0x30343e, 6);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe9a3 }));
    b.position.set(x, 4.5, z);
    scene.add(b);
    levelBuildings.push(b);
}

// White church with tower + cross (Panjim)
function lmChurch(x, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry || 0;
    const W = 0xf2efe8;
    const mk = (w, h, d, px, py, pz, c) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lmMat(c || W));
        m.position.set(px, py, pz);
        m.castShadow = true;
        g.add(m);
        return m;
    };
    mk(10, 5, 14, 0, 2.5, 0);
    mk(11, 0.4, 15, 0, 5.2, 0, 0xb0503c);
    mk(3, 9, 3, 0, 4.5, 8);
    mk(3.6, 0.5, 3.6, 0, 9.2, 8, 0xb0503c);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), lmMat(0x6e4525));
    crossV.position.set(0, 10.2, 8);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.25), lmMat(0x6e4525));
    crossH.position.set(0, 10.2, 8);
    g.add(crossV); g.add(crossH);
    mk(2.2, 3.2, 0.3, 0, 1.6, 7.1, 0x4a3220);
    for (let i = -1; i <= 1; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8),
            new THREE.MeshBasicMaterial({ color: 0x9fd4e8 }));
        win.position.set(i * 3, 3, 7.06);
        g.add(win);
    }
    scene.add(g);
    g.traverse(o => { if (o.isMesh) levelBuildings.push(o); });
    buildingBoxes.push({ minX: x - 6, maxX: x + 6, minZ: z - 8, maxZ: z + 8, h: 9, cx: x, cz: z });
}

// Pink facade wall with window rows (Hawa Mahal style)
function lmFacade(x, z, w, h, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry || 0;
    const pink = 0xd7746e;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.2), lmMat(pink));
    wall.position.y = h / 2;
    wall.castShadow = true;
    g.add(wall);
    for (let r = 0; r < Math.floor(h / 2.2); r++) {
        for (let i = 0; i < Math.floor(w / 1.6); i++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9),
                new THREE.MeshBasicMaterial({ color: 0xfff2cf }));
            win.position.set(-w / 2 + 1 + i * 1.6, 1.8 + r * 2.2, 0.65);
            g.add(win);
        }
    }
    for (let i = 0; i <= Math.floor(w / 2); i++) {
        const mer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.3), lmMat(0xb85a54));
        mer.position.set(-w / 2 + i * 2, h + 0.4, 0);
        g.add(mer);
    }
    scene.add(g);
    g.traverse(o => { if (o.isMesh) levelBuildings.push(o); });
    buildingBoxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - 1.5, maxZ: z + 1.5, h, cx: x, cz: z });
}

// Hill with fort wall (Jaipur backdrop)
function lmHillFort(x, z, r) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.7, 12), lmMat(0x9a7a52));
    hill.position.set(x, r * 0.32, z);
    scene.add(hill);
    levelBuildings.push(hill);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.5, 3, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xc0836a, roughness: 0.9, side: THREE.DoubleSide }));
    wall.position.set(x, r * 0.66, z);
    scene.add(wall);
    levelBuildings.push(wall);
}

// Rock island memorial in the sea (Kanyakumari)
function lmMemorial(x, z) {
    const rock = new THREE.Mesh(new THREE.ConeGeometry(9, 7, 9), lmMat(0x6e5a50));
    rock.position.set(x, 1.5, z);
    rock.castShadow = true;
    scene.add(rock);
    levelBuildings.push(rock);
    lmBox(x, 5.6, z, 7, 1.2, 7, 0xc8b088, true);
    lmBox(x - 2, 7.5, z, 1.2, 2.6, 1.2, 0xb09a78, false);
    lmBox(x + 2, 7.5, z, 1.2, 2.6, 1.2, 0xb09a78, false);
    lmBox(x, 9.2, z, 6, 0.8, 4.5, 0xa88a68, false);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 8), lmMat(0x8a6a4a));
    st.position.set(x, 10.6, z);
    scene.add(st);
    levelBuildings.push(st);
}

// Big arched hall + minarets (Bara Imambara style)
function lmImambara(x, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry || 0;
    const C = 0xe8dcc0;
    const mk = (w, h, d, px, py, pz, c) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lmMat(c || C));
        m.position.set(px, py, pz);
        m.castShadow = true;
        g.add(m);
        return m;
    };
    mk(16, 7, 8, 0, 3.5, 0);
    mk(4.5, 5.5, 0.6, 0, 2.75, 4.0, 0x3a3f48); // arch recess (dark)
    mk(17, 1.0, 9, 0, 7.5, 0, 0xd8ccb0);
    for (const sx of [-1, 1]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 9, 8), lmMat(C));
        t.position.set(sx * 9.5, 4.5, 3);
        t.castShadow = true;
        g.add(t);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), lmMat(0x9a8a70));
        cap.position.set(sx * 9.5, 9, 3);
        g.add(cap);
    }
    scene.add(g);
    g.traverse(o => { if (o.isMesh) levelBuildings.push(o); });
    buildingBoxes.push({ minX: x - 11, maxX: x + 11, minZ: z - 5, maxZ: z + 5, h: 8, cx: x, cz: z });
}

function buildCitySet(ci, arena) {
    const excl = [];
    const keep = (x, z, r) => excl.push({ x, z, r });
    // crossing roads through the middle
    lmFlat(0, 0, arena * 2.4, 6, 0x33363e);
    lmFlat(0, 0, 6, arena * 2.4, 0x33363e);
    const lampLine = (n, alongX, fixed) => {
        for (let i = 0; i < n; i++) {
            const t = -arena + (i + 0.5) * (2 * arena / n);
            if (Math.abs(t) < 6) continue;
            lmLamp(alongX ? t : fixed, alongX ? fixed : t);
        }
    };
    if (ci === 0) {
        // MUMBAI - Marine Drive: sea to the north, curved promenade, Gateway arch
        lmFlat(0, -arena - 45, 340, 110, 0x2a6a9a, 0.04);
        lmFlat(0, -arena - 6, 200, 8, 0xc8bfa8, 0.03);
        for (let i = 0; i < 9; i++) lmPalm(-80 + i * 20, -arena - 2, 1);
        lmArch(0, -arena * 0.42, 9, 0xc8a86a);
        keep(0, -arena * 0.42, 10);
        lampLine(8, true, 5);
        for (let i = 0; i < 6; i++) lmPalm(-arena + 10 + i * 22, 8, 0.9);
    } else if (ci === 1) {
        // KOLKATA - Howrah Bridge over the Hooghly (river strip north-south)
        lmFlat(28, 0, 26, 320, 0x2a5a7a, 0.04);
        lmBridge(28, 0, 36, true);
        keep(28, 0, 16);
        lampLine(8, false, 5);
        for (let i = 0; i < 7; i++) { lmTree(-arena + 12 + i * 20, -10 - (i % 2) * 14, 1); }
    } else if (ci === 2) {
        // CHENNAI - Marina Beach: sand foreground, sea east, lighthouse
        lmFlat(arena + 40, 0, 120, 340, 0xd8c090, 0.03);
        lmFlat(arena + 110, 0, 120, 340, 0x2a7a9e, 0.04);
        lmTower(-arena * 0.4, arena * 0.3, 4, 16, 0xc23c2e, 0xe8e4da);
        keep(-arena * 0.4, arena * 0.3, 7);
        for (let i = 0; i < 8; i++) lmPalm(-arena + 14 + i * 18, -arena * 0.5 + (i % 3) * 12, 1);
        lampLine(6, true, -5);
    } else if (ci === 3) {
        // DELHI - India Gate on the lawns
        lmFlat(0, -arena * 0.1, 60, arena * 1.4, 0x4a7a3f, 0.025);
        lmArch(0, -arena * 0.42, 11, 0xc86a4a);
        keep(0, -arena * 0.42, 11);
        lmBox(-arena * 0.5, 1.5, -arena * 0.42, 14, 3, 2, 0xa85438, true);
        lmBox(arena * 0.5, 1.5, -arena * 0.42, 14, 3, 2, 0xa85438, true);
        for (let i = 0; i < 8; i++) { lmTree(-36 + i * 10, -arena * 0.1 + ((i % 2) ? 18 : -18), 1.1); }
        lampLine(8, true, 5);
    } else if (ci === 4) {
        // CHANDIGARH - Sector 17 plaza + fountain
        lmFountain(0, -arena * 0.35);
        keep(0, -arena * 0.35, 9);
        lmFlat(0, -arena * 0.35, 30, 30, 0xc4c8d0, 0.025);
        lampLine(8, true, 5);
        lampLine(8, false, 5);
        for (let i = 0; i < 8; i++) { lmTree(-arena + 12 + i * 17, arena * 0.45, 0.9); }
    } else if (ci === 5) {
        // BENGALURU - MG Road: glass towers + trees
        lmTower(-arena * 0.35, -arena * 0.35, 7, 22, 0x7ab8d4, 0x2a4a5a);
        keep(-arena * 0.35, -arena * 0.35, 7);
        lmTower(arena * 0.4, arena * 0.25, 6, 17, 0x8ac4dc, 0x304a5e);
        keep(arena * 0.4, arena * 0.25, 6);
        for (let i = 0; i < 10; i++) { lmTree(-arena + 10 + i * 15, -12 + (i % 2) * 24, 1.2); }
        lampLine(8, false, -5);
    } else if (ci === 6) {
        // PANJIM - Mandovi riverfront + white church
        lmFlat(0, -arena - 40, 340, 100, 0x2a7a8a, 0.04);
        lmFlat(0, -arena - 4, 200, 6, 0xd8cba8, 0.03);
        lmChurch(arena * 0.3, -arena * 0.35, -0.3);
        keep(arena * 0.3, -arena * 0.35, 11);
        for (let i = 0; i < 9; i++) lmPalm(-90 + i * 22, -arena + 6, 1.1);
        lampLine(7, true, 5);
    } else if (ci === 7) {
        // JAIPUR - Hawa Mahal facade + fort hill behind
        lmFacade(0, -arena * 0.45, 26, 12, 0);
        keep(0, -arena * 0.45, 12);
        lmHillFort(0, -arena - 55, 42);
        for (let i = 0; i < 6; i++) { lmTree(-arena + 14 + i * 22, arena * 0.4, 0.9); }
        lampLine(7, true, 5);
    } else if (ci === 8) {
        // LUCKNOW - Bara Imambara + gardens
        lmImambara(0, -arena * 0.4, 0);
        keep(0, -arena * 0.4, 13);
        lmFlat(0, -arena * 0.4 + 16, 44, 12, 0x4a7a3f, 0.025);
        for (let i = 0; i < 8; i++) { lmTree(-30 + i * 9, -arena * 0.4 + 16 + ((i % 2) ? 4 : -4), 0.8); }
        lampLine(7, true, -5);
    } else {
        // KANYAKUMARI - sea + Rock Memorial + sunset palms
        lmFlat(0, -arena - 55, 340, 130, 0xc86a3c, 0.04);
        lmMemorial(18, -arena - 45);
        keep(18, -arena - 45, 12);
        for (let i = 0; i < 8; i++) lmPalm(-84 + i * 24, -arena + 4, 1);
        lampLine(6, true, 5);
    }
    return excl;
}

function buildEnemyMesh(cfg) {
    const skinM = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.7 });
    const vestM = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.6 });
    const gunM = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.5, metalness: 0.6 });

    const body = new THREE.Group();
    body.castShadow = true;
    body.userData.hpBar = null;
    body.userData.hpFill = null;
    body.userData.parts = null;
    body.userData.walkTime = 0;

    // ---- Head ----
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6 })
    );
    head.position.set(0, 1.28, 0);
    head.userData.zone = 'head';
    head.castShadow = true;
    body.add(head);

    const visor = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.13),
        new THREE.MeshBasicMaterial({ color: 0xff2020 })
    );
    visor.position.set(0, 0.03, 0.27);
    head.add(visor);

    // helmet for soldier / sniper / heavy
    if (cfg.type === 'soldier' || cfg.type === 'sniper' || cfg.type === 'heavy') {
        const helmet = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.4, metalness: 0.6 })
        );
        helmet.position.set(0, 0.02, 0);
        helmet.scale.setScalar(1.06);
        head.add(helmet);
        body.userData.helmet = helmet;
    }

    // ---- Torso ----
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.75, 0.34),
        vestM
    );
    torso.position.set(0, 0.82, 0);
    torso.userData.zone = 'torso';
    torso.castShadow = true;
    body.add(torso);

    const chest = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.42, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.5 })
    );
    chest.position.set(0, 0.9, 0.19);
    torso.add(chest);

    // ---- Hips ----
    const hips = new THREE.Group();
    hips.position.set(0, 0.38, 0);
    body.add(hips);

    // ---- Legs: thigh + shin + foot ----
    function buildLeg(side) {
        const hip = new THREE.Group();
        hip.position.set(side * 0.2, 0.38, 0);
        hips.add(hip);

        const thigh = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.62, 0.2),
            skinM
        );
        thigh.position.set(0, -0.34, 0);
        thigh.userData.zone = 'leg';
        thigh.castShadow = true;
        hip.add(thigh);

        const shin = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.62, 0.18),
            skinM
        );
        shin.position.set(0, -0.66, 0);
        shin.userData.zone = 'leg';
        shin.castShadow = true;
        thigh.add(shin);

        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.12, 0.34),
            new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.8 })
        );
        foot.position.set(0, -1.0, 0.06);
        foot.userData.zone = 'leg';
        foot.castShadow = true;
        shin.add(foot);

        return { hip, thigh, shin, foot };
    }

    const legL = buildLeg(-1);
    const legR = buildLeg(1);

    // ---- Arms: upper arm + forearm + hand ----
    function buildArm(side) {
        const shoulder = new THREE.Group();
        shoulder.position.set(side * 0.34, 1.0, 0);
        body.add(shoulder);

        const upperArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.5, 0.18),
            skinM
        );
        upperArm.position.set(0, -0.28, 0);
        upperArm.userData.zone = 'arm';
        upperArm.castShadow = true;
        shoulder.add(upperArm);

        const foreArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.5, 0.16),
            skinM
        );
        foreArm.position.set(0, -0.55, 0);
        foreArm.userData.zone = 'arm';
        foreArm.castShadow = true;
        upperArm.add(foreArm);

        const hand = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.12, 0.14),
            skinM
        );
        hand.position.set(0, -0.56, 0);
        hand.userData.zone = 'arm';
        hand.castShadow = true;
        foreArm.add(hand);

        return { shoulder, upperArm, foreArm, hand };
    }

    const armL = buildArm(-1);
    const armR = buildArm(1);

    // ---- Visible carried gun (right hand) ----
    const gunId = cfg.type === 'sniper' ? 'awp' : cfg.type === 'heavy' ? 'rpg' : 'ak47';
    const builtGun = buildGunModel(gunId);
    const enemyGun = builtGun.group.clone();
    enemyGun.scale.setScalar(0.7);
    enemyGun.position.set(0, -0.02, 0.22);
    enemyGun.rotation.set(0, Math.PI / 2, 0);
    armR.hand.add(enemyGun);
    body.userData.enemyGun = enemyGun;

    // ---- HP bar (billboard) ----
    const barGroup = new THREE.Group();
    barGroup.position.set(0, 1.5, 0);
    const barBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.09),
        new THREE.MeshBasicMaterial({ color: 0x101418, transparent: true, opacity: 0.75, depthWrite: false })
    );
    const barFill = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.055),
        new THREE.MeshBasicMaterial({ color: 0x4dff5e, depthWrite: false })
    );
    barFill.position.z = 0.001;
    barGroup.add(barBg);
    barGroup.add(barFill);
    barGroup.traverse(o => { o.raycast = function() {}; });
    body.add(barGroup);
    body.userData.hpBar = barGroup;
    body.userData.hpFill = barFill;

    body.userData.parts = { head, torso, hips, legL, legR, armL, armR };

    return body;
}

function updateEnemyHpBar(e) {
    const fill = e.mesh && e.mesh.userData.hpFill;
    if (!fill) return;
    const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
    fill.scale.x = Math.max(0.001, pct);
    fill.position.x = -(1 - pct) * 0.43;
    fill.material.color.setHSL(pct * 0.33, 0.9, 0.5);
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
    // drop the player in a random map corner, facing the center — never mid-map
    const corner = Math.floor(Math.random() * 4);
    const spawnX = (corner % 2 === 0 ? -1 : 1) * arena * 0.45;
    const spawnZ = (corner < 2 ? -1 : 1) * arena * 0.45;
    const excl = buildCitySet(cityIdx, arena);
    const nearExcl = (x, z, pad) => excl.some(e => Math.hypot(x - e.x, z - e.z) < e.r + (pad || 0));
    for (let i = 0; i < bCount; i++) {
        const w = 3 + Math.random() * 6;
        const h = 4 + Math.random() * 15;
        const d = 3 + Math.random() * 6;
        const x = (Math.random() - 0.5) * arena * 2;
        const z = (Math.random() - 0.5) * arena * 2;
        if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
        if (Math.hypot(x - spawnX, z - spawnZ) < 7) continue;
        if (nearExcl(x, z, Math.max(w, d) / 2)) continue;
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? city.bld : city.accent, roughness: 0.8 });
        const bld = new THREE.Mesh(geo, mat);
        bld.position.set(x, h / 2, z);
        bld.castShadow = true;
        bld.receiveShadow = true;
        scene.add(bld);
        levelBuildings.push(bld);
        buildingBoxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h, cx: x, cz: z });
    }
    for (let i = 0; i < 12 + lvl; i++) {
        const w = 1.5 + Math.random() * 2;
        const h = 0.8 + Math.random() * 1.2;
        const d = 1 + Math.random() * 2;
        const x = (Math.random() - 0.5) * arena * 1.5;
        const z = (Math.random() - 0.5) * arena * 1.5;
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
        if (Math.hypot(x - spawnX, z - spawnZ) < 5) continue;
        if (nearExcl(x, z, 2)) continue;
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 0.7 });
        const cv = new THREE.Mesh(geo, mat);
        cv.position.set(x, h / 2, z);
        cv.castShadow = true;
        scene.add(cv);
        levelBuildings.push(cv);
        buildingBoxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h, cx: x, cz: z });
    }
    const eCount = getLevelEnemyCount(lvl);
    const availTypes = getLevelEnemyTypes(lvl);
    const dmgScale = getLevelDamageScale(lvl);
    const rateScale = getLevelFireRateScale(lvl);
    // Difficulty multipliers
    const diffMult = settings.difficulty === 'easy' ? 0.7 : settings.difficulty === 'hard' ? 1.4 : 1.0;
    const diffSpeed = settings.difficulty === 'easy' ? 0.85 : settings.difficulty === 'hard' ? 1.15 : 1.0;
    const diffDmg = settings.difficulty === 'easy' ? 0.7 : settings.difficulty === 'hard' ? 1.4 : 1.0;
    if (gameMode !== 'survival') {
        for (let i = 0; i < eCount; i++) {
        const type = availTypes[Math.floor(Math.random() * availTypes.length)];
        const cfg = ENEMY_TYPES[type];
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * (arena - 15);
        let ex = Math.cos(angle) * dist;
        let ez = Math.sin(angle) * dist;
        // nobody spawns on top of the player — min 25m from the drop point
        const fromSpawn = Math.hypot(ex - spawnX, ez - spawnZ);
        if (fromSpawn < 25) {
            const push = 25 - fromSpawn;
            ex += ((ex - spawnX) / (fromSpawn || 1)) * push;
            ez += ((ez - spawnZ) / (fromSpawn || 1)) * push;
        }
        cfg.type = type;
        const body = buildEnemyMesh(cfg);
        body.position.set(ex, 1.0, ez);
        scene.add(body);
        enemies.push({
            mesh: body, type, hp: Math.floor(cfg.hp * dmgScale * diffMult), maxHp: Math.floor(cfg.hp * dmgScale * diffMult), speed: cfg.speed * diffSpeed,
            damage: cfg.damage * diffDmg, fireRate: cfg.fireRate * rateScale, score: cfg.score,
            lastFire: 0, state: 'patrol',
            patrolTarget: new THREE.Vector3((Math.random()-0.5)*arena, 0, (Math.random()-0.5)*arena),
            alertTimer: 0, strafeDir: Math.random() > 0.5 ? 1 : -1, alive: true, roof: false, dodge: getLevelDodge(lvl),
            walkTime: 0, dying: false, hitReact: 0, hitDir: null
        });
    }
    }
    // Rooftop snipers: max 2 per level, from level 4. Stationary, long range.
    levelRoofSnipers = 0;
    if (lvl >= 4) {
        const roofs = buildingBoxes
            .filter(b => (b.h || 0) >= 8 && Math.hypot(b.cx || 0, b.cz || 0) > 12)
            .sort((a, b) => b.h - a.h);
        const spots = [];
        for (const r of roofs) {
            if (spots.length >= 2) break;
            if (spots.some(s => Math.hypot(s.cx - r.cx, s.cz - r.cz) < 20)) continue;
            spots.push(r);
        }
        const scfg = ENEMY_TYPES.sniper;
        for (const s of spots) {
        scfg.type = 'sniper';
            const body = buildEnemyMesh(scfg);
            const roofY = s.h + 1.0;
            body.position.set(s.cx, roofY, s.cz);
            scene.add(body);
            enemies.push({
                mesh: body, type: 'sniper', hp: Math.floor(scfg.hp * dmgScale * diffMult), maxHp: Math.floor(scfg.hp * dmgScale * diffMult), speed: 0,
                damage: scfg.damage * diffDmg, fireRate: scfg.fireRate * rateScale, score: scfg.score + 20,
                lastFire: 0, state: 'roof',
                patrolTarget: new THREE.Vector3(s.cx, 0, s.cz),
                alertTimer: 0, strafeDir: 1, alive: true, roof: true, roofY, dodge: getLevelDodge(lvl),
                walkTime: 0, dying: false, hitReact: 0, hitDir: null
            });
        }
        levelRoofSnipers = spots.length;
    }
    // Boss battles at campaign milestones
    if (gameMode === 'campaign') {
        if (lvl === 5) {
            spawnBoss('warlord', arena);
        } else if (lvl === 10) {
            spawnBoss('overlord', arena);
        }
    }
    for (let i = 0; i < 5 + lvl; i++) {
        const px = (Math.random() - 0.5) * arena;
        const pz = (Math.random() - 0.5) * arena;
        const roll = Math.random();
        const ptype = roll > 0.75 ? 'medkit' : roll > 0.5 ? 'ammo' : roll > 0.35 ? 'grenade' : roll > 0.2 ? 'molotov' : 'ammo';
        const col = ptype === 'medkit' ? 0x7CFF6B : ptype === 'ammo' ? 0xFFD740 : ptype === 'grenade' ? 0x3a7a3a : 0xff7a1e;
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3 })
        );
        mesh.position.set(px, 0.5, pz);
        mesh.castShadow = true;
        scene.add(mesh);
        pickups.push({ mesh, type: ptype });
    }
    player.pos.set(spawnX, PLAYER_HEIGHT, spawnZ);
    player.vel.set(0, 0, 0);
    camera.position.copy(player.pos);
    yaw = Math.atan2(spawnX, spawnZ);
    pitch = 0;
    spawnProtUntil = Date.now() + 3000;
    updateHUD();
}

function spawnSurvivalWave(waveNum) {
    const arena = 50 + level * 2;
    const enemyCount = Math.min(20, 4 + waveNum * 2);
    const types = waveNum <= 2 ? ['grunt'] : waveNum <= 4 ? ['grunt', 'rifle'] : waveNum <= 6 ? ['grunt', 'rifle', 'soldier'] : ['grunt', 'rifle', 'soldier', 'sniper', 'heavy'];
    const dmgScale = Math.min(2.0, 0.5 + waveNum * 0.1);
    const diffMult = settings.difficulty === 'easy' ? 0.7 : settings.difficulty === 'hard' ? 1.4 : 1.0;
    const diffSpeed = settings.difficulty === 'easy' ? 0.85 : settings.difficulty === 'hard' ? 1.15 : 1.0;
    const diffDmg = settings.difficulty === 'easy' ? 0.7 : settings.difficulty === 'hard' ? 1.4 : 1.0;
    const spawns = [];
    const attempts = 0;
    while (spawns.length < enemyCount && attempts < 200) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * (arena - 20);
        const ex = Math.cos(angle) * dist;
        const ez = Math.sin(angle) * dist;
        if (Math.hypot(ex - player.pos.x, ez - player.pos.z) < 25) continue;
        spawns.push({ x: ex, z: ez });
        attempts++;
    }
    for (const s of spawns) {
        const type = types[Math.floor(Math.random() * types.length)];
        const cfg = ENEMY_TYPES[type];
        cfg.type = type;
        const body = buildEnemyMesh(cfg);
        body.position.set(s.x, 1.0, s.z);
        scene.add(body);
        enemies.push({
            mesh: body, type, hp: Math.floor(cfg.hp * dmgScale * diffMult), maxHp: Math.floor(cfg.hp * dmgScale * diffMult), speed: cfg.speed * diffSpeed,
            damage: cfg.damage * diffDmg, fireRate: cfg.fireRate * 0.9, score: cfg.score,
            lastFire: Date.now() + Math.random() * 2000, state: 'patrol',
            patrolTarget: new THREE.Vector3(s.x, 0, s.z),
            alertTimer: 0, strafeDir: Math.random() > 0.5 ? 1 : -1, alive: true, roof: false, dodge: Math.min(1.0, 0.25 + waveNum * 0.05),
            walkTime: 0, dying: false, hitReact: 0, hitDir: null
        });
    }
    waveEnemiesRemaining = enemyCount;
    survivalTime = Date.now();
    waveActive = true;
    showBanner('WAVE ' + waveNum + ' — ' + enemyCount + ' HOSTILES', 2500);
}

function spawnBoss(bossKey, arena) {
    const bcfg = BOSS_TYPES[bossKey];
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * (arena - 30);
    const ex = Math.cos(angle) * dist;
    const ez = Math.sin(angle) * dist;
    const body = buildEnemyMesh(bcfg);
    // Scale boss up
    body.scale.setScalar(bcfg.size);
    body.position.set(ex, 1.0, ez);
    scene.add(body);
    const boss = {
        mesh: body, type: bossKey, isBoss: true,
        hp: Math.floor(bcfg.hp * 1.5), maxHp: Math.floor(bcfg.hp * 1.5),
        speed: bcfg.speed * 0.8, damage: bcfg.damage * 1.2,
        fireRate: bcfg.fireRate, score: bcfg.score,
        lastFire: 0, state: 'combat',
        patrolTarget: new THREE.Vector3(ex, 0, ez),
        alertTimer: 0, strafeDir: 1, alive: true, roof: false, dodge: 0.5,
        walkTime: 0, dying: false, hitReact: 0, hitDir: null,
        attackPattern: 0, patternTimer: 0, phase: 1
    };
    enemies.push(boss);
    // Show boss health bar
    const bh = document.getElementById('bossHealthBar');
    if (bh) {
        bh.style.display = 'block';
        document.getElementById('bossName').textContent = bossKey.toUpperCase() + ' — BOSS';
        document.getElementById('bossHealthFill').style.width = '100%';
    }
    showBanner('⚠ BOSS ENCOUNTER: ' + bossKey.toUpperCase(), 3000);
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
            case 'Digit5': switchWeapon(4); break;
            case 'Digit6': switchWeapon(5); break;
            case 'Digit7': switchWeapon(6); break;
            case 'KeyG': throwGrenade(); break;
            case 'KeyF': throwMolotov(); break;
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
    document.addEventListener('mousedown', (e) => {
        if (paused || gameState !== 'playing') return;
        if (e.button === 0) mouseDown = true;
        if (e.button === 2) { rmbDown = true; aiming = true; }
    });
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) mouseDown = false;
        if (e.button === 2) { rmbDown = false; aiming = false; }
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
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
    if (idx < 0 || idx >= weapons.length || idx === currentWeaponIdx) return;
    if (!isUnlocked(idx)) {
        showBanner('LOCKED — REACH LEVEL ' + WEAPONS[idx].unlock + ' TO UNLOCK ' + WEAPONS[idx].name, 2200);
        return;
    }
    currentWeaponIdx = idx;
    weapons[idx].reloading = false;
    aiming = false;
    rmbDown = false;
    const sc = document.getElementById('scopeOverlay');
    if (sc) sc.classList.remove('show');
    showViewmodel(idx);
    playSound('reload', 0.8, 0.3);
    updateHUD();
}

function cycleWeapon(dir) {
    const n = weapons.length;
    for (let step = 1; step <= n; step++) {
        const next = (currentWeaponIdx + dir * step + n * 10) % n;
        if (isUnlocked(next)) { switchWeapon(next); return; }
    }
}

function reloadWeapon() {
    const w = weapons[currentWeaponIdx];
    if (w.reloading || w.ammo === w.mag) return;
    w.reloading = true;
    w.lastReloadStart = Date.now();
    playSound('reload');
    const effectiveReload = getWeaponStat(w.id, 'reload');
    setTimeout(() => {
        w.ammo = w.mag;
        w.reloading = false;
        updateHUD();
    }, effectiveReload);
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
    muzzleFlashUntil = Date.now() + 45;
    const tip = gunTips[currentGunId()];
    if (tip) {
        tip.updateWorldMatrix(true, false);
        const flashPos = new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld);
        const local = camera.worldToLocal(flashPos.clone());
        muzzleFlash.position.copy(local);
        muzzleLight.position.copy(local);
    }
    if (muzzleFlash) {
        muzzleFlash.material.opacity = 0.8;
        muzzleFlash.rotation.z = Math.random() * Math.PI;
        const s = 0.45 + Math.random() * 0.25 + (kick || 0) * 0.35;
        muzzleFlash.scale.set(s, s, 1);
    }
    if (muzzleLight) muzzleLight.intensity = 3.0;
}

function spawnTracer(from, to, colorHex, lifeMs, width) {
    const dist = from.distanceTo(to);
    if (dist < 0.5) return;
    // Get from pool or create new
    let item = tracerPool.pop();
    if (!item) {
        const geo = new THREE.BoxGeometry(0.03, 0.03, 1);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xfff2b0, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        item = { mesh, mat, active: false };
    }
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const th = width || 0.03;
    item.mesh.scale.set(th, th, dist);
    item.mesh.position.copy(mid);
    item.mesh.lookAt(to);
    item.mesh.material.color.setHex(colorHex);
    item.mesh.material.opacity = 0.9;
    item.mesh.visible = true;
    item.active = true;
    const born = Date.now();
    const life = lifeMs || 70;
    activeTracers.push({ item, born, life });
}

function spawnImpact(pos, normal) {
    for (let i = 0; i < 2; i++) {
        let item = impactPool.pop();
        if (!item) {
            const geo = new THREE.SphereGeometry(0.03, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC, transparent: true, opacity: 0.85 });
            const spark = new THREE.Mesh(geo, mat);
            scene.add(spark);
            item = { mesh: spark, mat, active: false, vel: new THREE.Vector3() };
        }
        const spark = item.mesh;
        const vel = item.vel;
        spark.position.copy(pos);
        vel.set(
            (Math.random() - 0.5) * 1.4 + normal.x,
            Math.random() * 1.4 + normal.y,
            (Math.random() - 0.5) * 1.4 + normal.z
        );
        spark.material.opacity = 0.85;
        spark.visible = true;
        item.active = true;
        const start = Date.now();
        activeImpacts.push({ item, start, vel });
    }
}

function spawnBlood(pos, count) {
    for (let i = 0; i < count; i++) {
        let item = bloodPool.pop();
        if (!item) {
            const geo = new THREE.SphereGeometry(0.04, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0x8B0000, transparent: true, opacity: 0.9 });
            const blood = new THREE.Mesh(geo, mat);
            scene.add(blood);
            item = { mesh: blood, mat, active: false, vel: new THREE.Vector3() };
        }
        const blood = item.mesh;
        const vel = item.vel;
        blood.position.copy(pos);
        vel.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2 + 1,
            (Math.random() - 0.5) * 2
        );
        blood.material.opacity = 0.9;
        blood.visible = true;
        item.active = true;
        const start = Date.now();
        activeBlood.push({ item, start, vel });
    }
}

function damageEnemy(e, dmg, point, zone) {
    if (!e.alive || e.dying) return;

    // Head = 1 shot kill. Torso = 1 shot kill. Arms and legs = 2 shots from full health.
    // Zone-based override only applies to player gunshots (dmg <= 0 means "compute from zone").
    // Explosion / fire pass their own dmg values (> 0) and are used as-is.
    if (dmg <= 0) {
        if (zone === 'head' || zone === 'torso') {
            dmg = e.hp; // instant kill
        } else {
            dmg = e.maxHp * 0.5; // arms & legs take exactly 2 shots
        }
    }

    e.hp = Math.max(0, e.hp - dmg);
    updateEnemyHpBar(e);
    playSound(zone === 'head' ? 'headshot' : 'hit');
    showHitMarker();
    if (point) spawnImpact(point, new THREE.Vector3(0, 1, 0));
    if (point) spawnBlood(point, zone === 'head' ? 8 : 4);
    showDamageNumber(null, dmg, zone === 'head');
    shotsHit++;
    if (zone === 'head') headshots++;

    // Hit reaction: enemies flinch when hit but not killed
    if (e.hp > 0 && point) {
        e.hitReact = 0.3;
        const hitDir = new THREE.Vector3().subVectors(e.mesh.position, point).normalize();
        e.hitDir = hitDir;
    }

    if (e.hp <= 0) {
        e.dying = true;
        e.deathTime = 0;
        e.deathZone = zone === 'head' ? 'head' : 'body'; // 'head' | 'body'
        e.fallDir = Math.random() > 0.5 ? 1 : -1;
        e.limpVel = {
            lthigh: (Math.random() - 0.5) * 2.5,
            rthigh: (Math.random() - 0.5) * 2.5,
            larm: (Math.random() - 0.5) * 2.5,
            rarm: (Math.random() - 0.5) * 2.5,
        };
        score += e.score;
        kills++;
        survivalKills++;
        updateHUD();
        playSound('enemy_die', 0.8 + Math.random() * 0.4, 0.5);
        addKillFeed(e.type, e.deathZone === 'head');
        if (e.deathZone === 'head') showHeadshotText();
        if (gameMode === 'survival' && waveEnemiesRemaining > 0) {
            waveEnemiesRemaining--;
            if (waveEnemiesRemaining <= 0) {
                winLevel();
            }
        }
        // Boss death rewards
        if (e.isBoss) {
            score += 500;
            kills += 5;
            updateHUD();
            const bh = document.getElementById('bossHealthBar');
            if (bh) bh.style.display = 'none';
            showBanner('BOSS DEFEATED — +500 BONUS', 3000);
            if (gameMode === 'campaign' && level >= 10) {
                gameState = 'win';
                const isNew = saveBest();
                document.getElementById('winScreen').classList.add('show');
                document.getElementById('winScore').textContent = 'FINAL SCORE: ' + score;
                document.getElementById('winBest').textContent = 'BEST: ' + highScore;
                document.getElementById('winRecord').style.display = isNew ? '' : 'none';
                dimScene(true);
                document.exitPointerLock();
            }
        }
        // mesh stays in scene; death animation runs in updateEnemies
    }
}

function explode(pos, radius, maxDmg) {
    playSound('explosion');
    screenShake = Math.min(1.0, screenShake + 0.4);
    // flash sphere
    const geo = new THREE.SphereGeometry(0.6, 12, 10);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffa63c, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const light = new THREE.PointLight(0xff8a3c, 8, radius * 3, 2);
    light.position.copy(pos);
    light.position.y += 1;
    scene.add(light);
    const born = Date.now();
    projectiles.push({
        mesh, type: 'explosion', born,
        update: () => {
            const t = (Date.now() - born) / 450;
            mesh.scale.setScalar(1 + t * (radius * 0.9));
            mat.opacity = Math.max(0, 1 - t);
            light.intensity = Math.max(0, 8 * (1 - t));
            if (t >= 1) { if (mesh.parent) scene.remove(mesh); scene.remove(light); }
        }
    });
    // smoke puffs
    for (let i = 0; i < 6; i++) {
        const sgeo = new THREE.SphereGeometry(0.25 + Math.random() * 0.3, 6, 6);
        const smat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.7 });
        const s = new THREE.Mesh(sgeo, smat);
        s.position.copy(pos);
        s.position.x += (Math.random() - 0.5) * 2;
        s.position.y += Math.random() * 1.5;
        s.position.z += (Math.random() - 0.5) * 2;
        scene.add(s);
        const sb = Date.now();
        const vy = 1 + Math.random() * 2;
        projectiles.push({
            mesh: s, type: 'smoke', born: sb,
            update: () => {
                const t = (Date.now() - sb) / 1200;
                s.position.y += vy * 0.016;
                s.scale.setScalar(1 + t * 2);
                smat.opacity = Math.max(0, 0.7 * (1 - t));
                if (t >= 1 && s.parent) scene.remove(s);
            }
        });
    }
    for (const e of enemies) {
        if (!e.alive) continue;
        const d = e.mesh.position.distanceTo(pos);
        if (d < radius) {
            const fall = 1 - (d / radius) * 0.6;
            damageEnemy(e, maxDmg * fall, null, 'torso');
        }
    }
    updateHUD();
}

function fireRocket() {
    const w = weapons[currentWeaponIdx];
    const muzzlePos = getMuzzleWorldPos();
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    dir.normalize();
    const geo = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(muzzlePos);
    const warhead = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xff3c1e })
    );
    warhead.position.z = -0.35;
    warhead.rotation.x = -Math.PI / 2;
    mesh.add(warhead);
    mesh.lookAt(muzzlePos.clone().add(dir));
    scene.add(mesh);
    const born = Date.now();
    const vel = dir.clone().multiplyScalar(38);
    projectiles.push({
        mesh, type: 'rocket', born,
        update: () => {
            const dt = 0.016;
            const prev = mesh.position.clone();
            mesh.position.add(vel.clone().multiplyScalar(dt));
            // smoke trail
            if (Math.random() < 0.7) {
                const sgeo = new THREE.SphereGeometry(0.12, 5, 5);
                const smat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 });
                const s = new THREE.Mesh(sgeo, smat);
                s.position.copy(mesh.position);
                scene.add(s);
                const sb = Date.now();
                projectiles.push({
                    mesh: s, type: 'trail', born: sb,
                    update: () => {
                        const t = (Date.now() - sb) / 600;
                        smat.opacity = Math.max(0, 0.6 * (1 - t));
                        s.scale.setScalar(1 + t);
                        if (t >= 1 && s.parent) scene.remove(s);
                    }
                });
            }
            // hit enemy?
            for (const e of enemies) {
                if (!e.alive) continue;
                if (mesh.position.distanceTo(e.mesh.position) < 1.2) {
                    explode(mesh.position.clone(), 7, getWeaponStat(w.id, 'damage'));
                    if (mesh.parent) scene.remove(mesh);
                    projectiles.splice(projectiles.findIndex(p => p.mesh === mesh), 1);
                    return;
                }
            }
            const ray = new THREE.Raycaster(prev, vel.clone().normalize(), 0, vel.length() * dt + 0.3);
            const hits = ray.intersectObjects(levelBuildings);
            if (hits.length > 0 || Date.now() - born > 4000) {
                explode(hits.length ? hits[0].point.clone() : mesh.position.clone(), 7, getWeaponStat(w.id, 'damage'));
                if (mesh.parent) scene.remove(mesh);
                projectiles.splice(projectiles.findIndex(p => p.mesh === mesh), 1);
            }
        }
    });
}

function throwDir(power) {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    dir.normalize();
    dir.y += 0.35;
    dir.normalize();
    return dir.multiplyScalar(power || 14);
}

function throwGrenade() {
    if (gameState !== 'playing' || paused) return;
    if (throwables.grenade <= 0) return;
    throwables.grenade--;
    playSound('throw');
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 0.5, metalness: 0.4 })
    );
    mesh.position.copy(camera.position);
    scene.add(mesh);
    liveThrowables.push({
        mesh, kind: 'grenade', vel: throwDir(15), fuse: Date.now() + 2000, bounces: 0
    });
    updateHUD();
}

function throwMolotov() {
    if (gameState !== 'playing' || paused) return;
    if (throwables.molotov <= 0) return;
    throwables.molotov--;
    playSound('throw');
    const mesh = new THREE.Group();
    const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a7a2a, transparent: true, opacity: 0.85, roughness: 0.2 })
    );
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.16, 6),
        new THREE.MeshBasicMaterial({ color: 0xffa63c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
    );
    flame.position.y = 0.2;
    mesh.add(bottle);
    mesh.add(flame);
    mesh.position.copy(camera.position);
    scene.add(mesh);
    liveThrowables.push({
        mesh, kind: 'molotov', vel: throwDir(13), fuse: Date.now() + 5000, bounces: 0
    });
    updateHUD();
}

function spawnFireZone(pos) {
    playSound('fire');
    fireZones.push({ pos: pos.clone(), until: Date.now() + 7000 });
    for (let i = 0; i < 10; i++) {
        const fgeo = new THREE.ConeGeometry(0.2 + Math.random() * 0.25, 0.8 + Math.random() * 0.8, 6);
        const fmat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.4 ? 0xff7a1e : 0xffd23c,
            transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const f = new THREE.Mesh(fgeo, fmat);
        f.position.set(pos.x + (Math.random() - 0.5) * 3, 0.5, pos.z + (Math.random() - 0.5) * 3);
        scene.add(f);
        const born = Date.now();
        projectiles.push({
            mesh: f, type: 'flame', born,
            update: () => {
                const alive = Date.now() < fireZones[fireZones.length - 1].until;
                const t = (Date.now() - born) / 400;
                if (t > 1) {
                    // respawn flicker while zone alive
                    if (Date.now() < fireZones.find(z => z.pos.distanceTo(pos) < 0.5)?.until || alive) {
                        f.position.set(pos.x + (Math.random() - 0.5) * 3.4, 0.4 + Math.random() * 0.4, pos.z + (Math.random() - 0.5) * 3.4);
                        fmat.opacity = 0.9;
                        f.scale.setScalar(0.7 + Math.random() * 0.7);
                    } else if (f.parent) scene.remove(f);
                    return;
                }
                fmat.opacity = 0.9 * (1 - t * 0.3);
                f.scale.y = 1 + Math.sin(Date.now() * 0.02 + f.position.x) * 0.2;
            }
        });
    }
}

function updateThrowables(dt) {
    for (let i = liveThrowables.length - 1; i >= 0; i--) {
        const t = liveThrowables[i];
        t.vel.y -= 22 * dt;
        t.mesh.position.add(t.vel.clone().multiplyScalar(dt));
        // ground bounce
        if (t.mesh.position.y < 0.15) {
            t.mesh.position.y = 0.15;
            if (Math.abs(t.vel.y) > 2) {
                t.vel.y *= -0.45;
                t.vel.x *= 0.7;
                t.vel.z *= 0.7;
                playSound('hit');
            } else {
                t.vel.y = 0;
                t.vel.x *= 0.9;
                t.vel.z *= 0.9;
            }
        }
        // wall stop
        const test = { x: t.mesh.position.x, z: t.mesh.position.z };
        const bx = test.x, bz = test.z;
        pushOutOfBuildings(test, 0.15);
        if (test.x !== bx || test.z !== bz) {
            t.mesh.position.x = test.x;
            t.mesh.position.z = test.z;
            t.vel.x *= -0.4;
            t.vel.z *= -0.4;
        }
        if (t.kind === 'grenade' && Date.now() > t.fuse) {
            explode(t.mesh.position.clone(), 8, 120);
            scene.remove(t.mesh);
            liveThrowables.splice(i, 1);
        } else if (t.kind === 'molotov' && (Date.now() > t.fuse || t.mesh.position.y <= 0.16)) {
            spawnFireZone(t.mesh.position.clone());
            scene.remove(t.mesh);
            liveThrowables.splice(i, 1);
        }
    }
    // fire zone damage
    const now = Date.now();
    for (let i = fireZones.length - 1; i >= 0; i--) {
        const z = fireZones[i];
        if (now > z.until) { fireZones.splice(i, 1); continue; }
        for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.mesh.position.x - z.pos.x, e.mesh.position.z - z.pos.z);
            if (d < 3.2) damageEnemy(e, 55 * dt, null, false);
        }
    }
}

function shoot() {
    const w = weapons[currentWeaponIdx];
    const now = Date.now();
    const effectiveFireRate = getWeaponStat(w.id, 'firerate');
    if (w.reloading || w.ammo <= 0 || now - w.lastFire < effectiveFireRate) return;
    w.lastFire = now;
    w.ammo--;
    shotsFired++;
    playSound(w.sfx);
    if (w.rocket) {
        triggerMuzzleFlash(1.2);
        recoilPitch += 0.06;
        recoilKick = 0.05;
        fireRocket();
        if (w.ammo <= 0) reloadWeapon();
        updateHUD();
        return;
    }
    const muzzlePos = getMuzzleWorldPos();
    const kickMult = w.id === 'm1014' ? 1.4 : w.id === 'revolver' ? 1.2 : w.id === 'awp' ? 1.6 : w.id === 'ak47' ? 1.0 : w.id === 'scar' ? 0.9 : w.id === 'mp5' ? 0.7 : 1.0;
    triggerMuzzleFlash(w.id === 'm1014' ? 0.9 : w.id === 'revolver' ? 0.6 : w.id === 'awp' ? 1.0 : 0.25);
    // Camera kick: sharper for shotgun/revolver/AWP, small for SMG
    const kick = w.id === 'm1014' ? 0.035 : w.id === 'revolver' ? 0.025 : w.id === 'awp' ? 0.055 : w.id === 'ak47' ? 0.014 : w.id === 'scar' ? 0.016 : w.id === 'mp5' ? 0.009 : 0.012;
    recoilPitch += kick;
    recoilKick = kick * 2;
    yaw += (Math.random() - 0.5) * kick * 0.5;
    // Visual gun kick
    gunKick = 1.0;
    const spreadMul = aiming ? 0.35 : 1.0;
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(camera.quaternion);
        dir.x += (Math.random() - 0.5) * w.spread * spreadMul;
        dir.y += (Math.random() - 0.5) * w.spread * spreadMul;
        dir.z += (Math.random() - 0.5) * w.spread * spreadMul;
        dir.normalize();
        const ray = new THREE.Raycaster(camera.position.clone(), dir, 0.1, 200);
        let hitEnemy = false;
        let endPoint = camera.position.clone().add(dir.clone().multiplyScalar(120));
        for (const e of enemies) {
            if (!e.alive) continue;
            const hits = ray.intersectObject(e.mesh, true);
            if (hits.length > 0) {
                endPoint = hits[0].point.clone();
                // walk up the parent chain to find which body part was hit
                let zone = 'torso';
                let hitObj = hits[0].object;
                while (hitObj && hitObj !== e.mesh) {
                    if (hitObj.userData && hitObj.userData.zone) {
                        zone = hitObj.userData.zone;
                        break;
                    }
                    hitObj = hitObj.parent;
                }
                damageEnemy(e, 0, hits[0].point, zone);
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
        const ts = w.tracer || { color: 0xfff2b0, width: 0.03, life: 80 };
        spawnTracer(muzzlePos.clone(), endPoint, ts.color, ts.life, ts.width);
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
    for (let i = 0; i < 2; i++) {
        const geo = new THREE.SphereGeometry(0.03, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC, transparent: true, opacity: 0.85 });
        const spark = new THREE.Mesh(geo, mat);
        spark.position.copy(pos);
        scene.add(spark);
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 1.4 + normal.x,
            Math.random() * 1.4 + normal.y,
            (Math.random() - 0.5) * 1.4 + normal.z
        );
        const start = Date.now();
        projectiles.push({
            mesh: spark, type: 'spark', born: start,
            update: () => {
                const dt = 0.016;
                spark.position.add(vel.clone().multiplyScalar(dt));
                vel.y -= 9.8 * dt;
                mat.opacity = Math.max(0, 0.85 * (1 - (Date.now() - start) / 220));
                if (Date.now() - start > 220) scene.remove(spark);
            }
        });
    }
}

function spawnBlood(pos, count) {
    for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.04, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8B0000, transparent: true, opacity: 0.9 });
        const blood = new THREE.Mesh(geo, mat);
        blood.position.copy(pos);
        scene.add(blood);
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2 + 1,
            (Math.random() - 0.5) * 2
        );
        const start = Date.now();
        projectiles.push({
            mesh: blood, type: 'blood', born: start,
            update: () => {
                const dt = 0.016;
                blood.position.add(vel.clone().multiplyScalar(dt));
                vel.y -= 12 * dt;
                mat.opacity = Math.max(0, 0.9 * (1 - (Date.now() - start) / 600));
                if (Date.now() - start > 600) scene.remove(blood);
            }
        });
    }
}

// Walk / idle animation for the enemy body parts
function animateEnemy(e, dt, moving) {
    const p = e.mesh.userData.parts;
    if (!p) return;
    const t = e.mesh.userData.walkTime;
    const speedFactor = e.speed || 1.5;
    const isHeavy = e.type === 'heavy';
    const isSniper = e.type === 'sniper';

    // Hit reaction: flinch away from impact
    if (e.hitReact > 0 && e.hitDir) {
        e.hitReact = Math.max(0, e.hitReact - dt * 4);
        const flinch = e.hitReact * 0.5;
        p.torso.rotation.x += e.hitDir.y * flinch;
        p.torso.rotation.z += e.hitDir.x * flinch;
        p.head.rotation.x += e.hitDir.y * flinch * 0.5;
        if (e.hitReact <= 0) {
            e.hitReact = 0;
            e.hitDir = null;
        }
    }

    if (moving) {
        e.mesh.userData.walkTime = t + dt * 2 * speedFactor;
    } else {
        // idle breathing — only when not alert/tracking the player
        e.mesh.userData.walkTime = t + dt * 1.5;
        const breath = Math.sin(e.mesh.userData.walkTime * 2) * 0.012;
        e.mesh.scale.setScalar(1 + breath);
        if (!e.alert) {
            p.torso.rotation.x = Math.sin(e.mesh.userData.walkTime) * 1.5 * (Math.PI / 180);
            p.head.rotation.x = Math.sin(e.mesh.userData.walkTime * 1.5) * 2 * (Math.PI / 180);
        }
        e.mesh.position.y = 1.0 + Math.sin(e.mesh.userData.walkTime) * 0.015;
        return;
    }

    const wt = e.mesh.userData.walkTime;
    const legAmp = isHeavy ? 22 : isSniper ? 10 : 24;
    const legFreq = isHeavy ? 2 : isSniper ? 2.5 : 3;

    // Legs: thighs swing opposite, shins bend at knees
    const thighSwing = Math.sin(wt * legFreq) * legAmp;
    p.legL.thigh.rotation.x = -thighSwing * (Math.PI / 180);
    p.legR.thigh.rotation.x = thighSwing * (Math.PI / 180);
    p.legL.shin.rotation.x = Math.sin(wt * legFreq + Math.PI) * (legAmp * 0.9) * (Math.PI / 180);
    p.legR.shin.rotation.x = -Math.sin(wt * legFreq + Math.PI) * (legAmp * 0.9) * (Math.PI / 180);

    // Hip sway + small dip
    p.hips.rotation.z = Math.sin(wt * legFreq * 0.5) * 5 * (Math.PI / 180);
    p.hips.rotation.x = Math.cos(wt * legFreq) * 2 * (Math.PI / 180);

    // Torso counter-rotates opposite hips, slight bob
    p.torso.rotation.y = -Math.sin(wt * legFreq * 0.5) * 6 * (Math.PI / 180);
    p.torso.rotation.x = Math.sin(wt * legFreq) * 2.5 * (Math.PI / 180);

    // Arms swing opposite to legs
    const armSwing = Math.sin(wt * legFreq + Math.PI) * (legAmp * 0.7);
    p.armL.upperArm.rotation.x = -armSwing * (Math.PI / 180);
    p.armR.upperArm.rotation.x = armSwing * (Math.PI / 180);

    // Body bob on step cycle
    e.mesh.position.y = 1.0 + Math.abs(Math.sin(wt * legFreq * 2)) * 0.035;
    p.head.position.y = 1.28 + Math.abs(Math.sin(wt * legFreq * 2)) * 0.02;
}

// Death animation: impact flinch -> fall over -> fade out
function updateDeath(e, dt) {
    e.deathTime += dt;
    const t = e.deathTime;
    const m = e.mesh;
    const p = m.userData.parts;
    const dir = e.fallDir || 1;

    if (t < 0.3) {
        // impact flinch / snap
        if (e.deathZone === 'head') {
            m.rotation.x = Math.sin(t * 60) * 0.6 * dir; // headshot snap back
        } else {
            m.rotation.z = Math.sin(t * 60) * 0.35 * dir; // body shot stagger
        }
    } else if (t < 1.5) {
        // fall over onto ground
        const f = (t - 0.3) / 1.2;
        const ease = f * f * (3 - 2 * f);
        m.rotation.x = ease * (dir * (Math.PI / 2 + 0.4));
        m.rotation.z = ease * ((Math.random() - 0.5) * 0.6);
        m.position.y = 1.0 - ease * 0.95;
        // limbs go limp with random flail
        p.legL.thigh.rotation.x = ease * e.limpVel.lthigh;
        p.legR.thigh.rotation.x = ease * e.limpVel.rthigh;
        p.armL.upperArm.rotation.x = ease * e.limpVel.larm;
        p.armR.upperArm.rotation.x = ease * e.limpVel.rarm;
    } else if (t < 2.5) {
        // fade out
        const fade = (t - 1.5) / 1.0;
        m.traverse(o => {
            if (o.isMesh) o.material.opacity = Math.max(0, 1 - fade);
        });
    } else {
        if (m.parent) scene.remove(m);
        e.mesh = null;
        e.alive = false;
    }
}

function updateBoss(e, dt, now) {
    const m = e.mesh;
    const p = m.userData.parts;
    const toPlayer = new THREE.Vector3().subVectors(player.pos, m.position);
    const dist = toPlayer.length();
    const dirToPlayer = toPlayer.normalize();
    
    // Boss always tracks player
    const head = m.children[0];
    if (head) {
        head.lookAt(m.position.x + dirToPlayer.x, m.position.y + 1.2 + dirToPlayer.y, m.position.z + dirToPlayer.z);
    }
    
    // Boss movement: slowly approach, maintain distance
    let moving = false;
    const minDist = 12, maxDist = 25;
    if (dist > maxDist) {
        moving = true;
        const newX = m.position.x + dirToPlayer.x * e.speed * dt * 0.6;
        const newZ = m.position.z + dirToPlayer.z * e.speed * dt * 0.6;
        const testPos = { x: newX, z: newZ };
        pushOutOfBuildings(testPos, 0.6);
        m.position.x = testPos.x;
        m.position.z = testPos.z;
    } else if (dist < minDist) {
        moving = true;
        const newX = m.position.x - dirToPlayer.x * e.speed * dt * 0.5;
        const newZ = m.position.z - dirToPlayer.z * e.speed * dt * 0.5;
        const testPos = { x: newX, z: newZ };
        pushOutOfBuildings(testPos, 0.5);
        m.position.x = testPos.x;
        m.position.z = testPos.z;
    }
    
    // Boss idle animation (slow breathing)
    e.walkTime += dt * 1.5;
    const breath = Math.sin(e.walkTime * 2) * 0.02;
    m.scale.setScalar(e.type === 'warlord' ? 1.4 + breath : 1.8 + breath);
    
    // Boss attack patterns
    e.patternTimer += dt;
    if (now - e.lastFire > e.fireRate && dist < 40) {
        const gunPos = new THREE.Vector3().copy(m.position);
        gunPos.y += 1.2;
        if (hasLineOfSight(gunPos, new THREE.Vector3().copy(player.pos))) {
            e.lastFire = now;
            const acc = Math.min(0.9, Math.max(0.3, 0.8 - dist * 0.01));
            const dmg = e.damage * (0.9 + Math.random() * 0.4);
            spawnEnemyBullet(gunPos, dmg, acc);
            
            // Boss muzzle flash effect
            playSound('rpg', 0.8, 0.6);
            
            // Pattern-based special attacks
            if (e.type === 'warlord' && e.patternTimer > 3) {
                e.patternTimer = 0;
                // Charge volley: 3 rapid shots
                setTimeout(() => {
                    if (e.alive && hasLineOfSight(gunPos, new THREE.Vector3().copy(player.pos))) {
                        spawnEnemyBullet(gunPos, dmg, acc);
                    }
                }, 400);
                setTimeout(() => {
                    if (e.alive && hasLineOfSight(gunPos, new THREE.Vector3().copy(player.pos))) {
                        spawnEnemyBullet(gunPos, dmg, acc);
                    }
                }, 800);
            }
            if (e.type === 'overlord' && e.patternTimer > 4) {
                e.patternTimer = 0;
                // Rocket barrage: spawn rocket at player
                setTimeout(() => {
                    if (e.alive) {
                        const rocketPos = player.pos.clone();
                        rocketPos.y += 10;
                        explode(rocketPos, 5, e.damage * 0.7);
                    }
                }, 600);
            }
        }
    }
    
    animateEnemy(e, dt, moving);
    
    // Phase transition at 50% health
    if (e.hp <= e.maxHp * 0.5 && e.phase === 1) {
        e.phase = 2;
        e.fireRate = Math.max(400, e.fireRate * 0.7);
        e.speed = Math.min(2.0, e.speed * 1.3);
        showBanner('BOSS PHASE 2 — ENRAGED', 2500);
    }
}

function updateEnemies(dt) {
    const now = Date.now();
    for (const e of enemies) {
        if (e.mesh === null) continue;
        if (!e.alive && !e.dying) continue;
        if (e.dying) {
            updateDeath(e, dt);
            continue;
        }
        const hb = e.mesh.userData.hpBar;
        if (hb) hb.quaternion.copy(camera.quaternion);
        if (e.isBoss) {
            updateBoss(e, dt, now);
            continue;
        }
        if (e.roof) {
            // Stationary rooftop sniper: holds position, tracks and fires at long range
            const toPlayer = new THREE.Vector3().subVectors(player.pos, e.mesh.position);
            const dist = toPlayer.length();
            const dirToPlayer = toPlayer.normalize();
            const head = e.mesh.children[0];
            if (head) {
                head.lookAt(e.mesh.position.x + dirToPlayer.x, e.mesh.position.y + 1.0 + dirToPlayer.y, e.mesh.position.z + dirToPlayer.z);
            }
            e.alert = true; // rooftop snipers always track the player
            animateEnemy(e, dt, false); // rooftop sniper: idle breathing
            if (dist < 80 && now - e.lastFire > e.fireRate) {
                const gunPos = new THREE.Vector3().copy(e.mesh.position);
                gunPos.y += 0.8;
                if (hasLineOfSight(gunPos, new THREE.Vector3().copy(player.pos))) {
                    e.lastFire = now;
                    const acc = Math.min(0.95, Math.max(0.2, 0.85 - dist * 0.006) + level * 0.006);
                    const dmg = e.damage * (0.85 + Math.random() * 0.3);
                    spawnEnemyBullet(e.mesh.position.clone(), dmg, acc);
                }
            }
            e.mesh.position.y = e.roofY;
            continue;
        }
        const toPlayer = new THREE.Vector3().subVectors(player.pos, e.mesh.position);
        const dist = toPlayer.length();
        const dirToPlayer = toPlayer.normalize();
        let moving = false;
        // Detection range: heavier enemies see further, all detect within 50m
        const detectRange = e.type === 'heavy' ? 55 : e.type === 'sniper' ? 70 : 50;
        if (dist < detectRange) {
            e.state = 'combat';
            e.alertTimer = 3;
            const head = e.mesh.children[0];
            if (head) {
                const lookDir = dirToPlayer.clone();
                head.lookAt(e.mesh.position.x + lookDir.x, e.mesh.position.y + 1.0 + lookDir.y, e.mesh.position.z + lookDir.z);
            }
            // Combat distance logic per type
            const minDist = e.type === 'sniper' ? 22 : e.type === 'heavy' ? 10 : e.type === 'grunt' ? 6 : 9;
            const maxDist = e.type === 'sniper' ? 45 : e.type === 'heavy' ? 14 : e.type === 'grunt' ? 12 : 16;
            if (dist > maxDist) {
                moving = true;
                // Advance toward player but stop at maxDist
                const approachDist = dist - maxDist;
                const newX = e.mesh.position.x + dirToPlayer.x * e.speed * dt * 0.8;
                const newZ = e.mesh.position.z + dirToPlayer.z * e.speed * dt * 0.8;
                const testPos = { x: newX, z: newZ };
                pushOutOfBuildings(testPos, 0.5);
                e.mesh.position.x = testPos.x;
                e.mesh.position.z = testPos.z;
            } else if (dist < minDist) {
                moving = true;
                // Back away if too close
                const newX = e.mesh.position.x - dirToPlayer.x * e.speed * 0.6 * dt;
                const newZ = e.mesh.position.z - dirToPlayer.z * e.speed * 0.6 * dt;
                const testPos = { x: newX, z: newZ };
                pushOutOfBuildings(testPos, 0.5);
                e.mesh.position.x = testPos.x;
                e.mesh.position.z = testPos.z;
            }
            // Strafe while in combat
            const strafeVec = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).multiplyScalar(e.strafeDir);
            const strafeMul = 0.3 + (e.dodge || 0.3) * 0.7;
            const strafeX = e.mesh.position.x + strafeVec.x * e.speed * strafeMul * dt;
            const strafeZ = e.mesh.position.z + strafeVec.z * e.speed * strafeMul * dt;
            if (Math.abs(strafeX - e.mesh.position.x) > 0.001 || Math.abs(strafeZ - e.mesh.position.z) > 0.001) moving = true;
            const strafePos = { x: strafeX, z: strafeZ };
            pushOutOfBuildings(strafePos, 0.5);
            e.mesh.position.x = strafePos.x;
            e.mesh.position.z = strafePos.z;
            if (Math.random() < 0.002 + (e.dodge || 0.3) * 0.006) e.strafeDir *= -1;
            // Fire when in range and have line of sight
            const fireDist = e.type === 'sniper' ? 60 : e.type === 'heavy' ? 18 : 25;
            if (now - e.lastFire > e.fireRate && dist < fireDist) {
                const gunPos = new THREE.Vector3().copy(e.mesh.position);
                gunPos.y += 0.8;
                const playerAim = new THREE.Vector3().copy(player.pos);
                if (hasLineOfSight(gunPos, playerAim)) {
                    e.lastFire = now;
                    const acc = Math.min(0.92, Math.max(0.08, 0.82 - dist * 0.012) + level * 0.006);
                    const dmg = e.damage * (0.8 + Math.random() * 0.4);
                    spawnEnemyBullet(e.mesh.position.clone(), dmg, acc);
                    // Muzzle flash for enemy
                    playSound('hit', 1.0, 0.15);
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
                    moving = true;
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
        animateEnemy(e, dt, moving);
    }
}

function spawnEnemyBullet(from, damage, acc) {
    // Elongated glowing tracer oriented along travel direction - reads as a real round.
    // Damage applies ONLY if the round physically reaches the player: walls stop it cold.
    const geo = new THREE.BoxGeometry(0.035, 0.035, 0.5);
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
    let done = false;
    projectiles.push({
        mesh, type: 'bullet', born: start,
        update: () => {
            if (done) return;
            const spd = 60;
            const prevPos = mesh.position.clone();
            mesh.position.x += dir.x * spd * 0.016;
            mesh.position.y += dir.y * spd * 0.016;
            mesh.position.z += dir.z * spd * 0.016;
            const ray = new THREE.Raycaster(prevPos, dir, 0, spd * 0.016 + 0.1);
            const hits = ray.intersectObjects(levelBuildings);
            if (hits.length > 0) {
                // stopped by a wall — harmless spark, no damage through cover
                mesh.position.copy(hits[0].point);
                done = true;
                mat.color.setHex(0x888888);
                mat.opacity = 0.4;
                return;
            }
            if (mesh.position.distanceTo(player.pos) < 1.1) {
                done = true;
                if (mesh.parent) scene.remove(mesh);
                if (Date.now() >= spawnProtUntil && Math.random() < (acc === undefined ? 0.5 : acc)) {
                    player.health -= damage || 8;
                    playSound('hurt');
                    showDamageOverlay();
                    if (player.health <= 0) {
                        player.health = 0;
                        gameOver();
                    }
                    updateHUD();
                }
                return;
            }
            if (Date.now() - start > 2000 && mesh.parent) scene.remove(mesh);
        }
    });
}

function updatePlayer(dt) {
    const w = weapons[currentWeaponIdx];
    const adsSlow = aiming ? 0.55 : 1.0;
    const speed = (crouching ? CROUCH_SPEED : (sprinting && !aiming ? SPRINT_SPEED : MOVE_SPEED)) * adsSlow;
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
    camera.rotation.x = pitch + recoilPitch + shakeY;
    camera.rotation.y = yaw + shakeX;
    // Muzzle flash fade
    if (muzzleFlash && Date.now() > muzzleFlashUntil) {
        muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 12);
        if (muzzleLight) muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 80);
    }
    // ADS: lerp FOV toward weapon zoom, center the gun, show scope for AWP
    const targetFov = aiming ? (w.adsZoom || 55) : settings.fov;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12);
    camera.updateProjectionMatrix();
    const scopeEl = document.getElementById('scopeOverlay');
    const isScoped = aiming && w.scope;
    if (scopeEl) scopeEl.classList.toggle('show', !!isScoped);
    const chEl = document.querySelector('.crosshair');
    if (chEl) chEl.style.opacity = isScoped ? '0' : (aiming ? '0.4' : '1');
    Object.values(viewmodels).forEach(v => { if (v) v.visible = !isScoped && v === viewmodels[currentGunId()]; });
    // Gun bob + recoil kick on viewmodels (suppressed while aiming)
    const moving = move.length() > 0 && player.onGround;
    if (moving) bobTime += dt * (sprinting ? 11 : 8);
    // Reload animation: gun dips down and back
    const reloadTime = w.reloadTime / 1000;
    const reloadProgress = w.reloading ? Math.min(1, (Date.now() - w.lastReloadStart) / reloadTime) : 0;
    const reloadDip = w.reloading ? Math.sin(reloadProgress * Math.PI) * 0.15 : 0;
    // Visual recoil kick decay
    recoilKick = Math.max(0, recoilKick - dt * 15);
    gunKick = Math.max(0, gunKick - dt * 10);
    screenShake = Math.max(0, screenShake - dt * 2);
    const kickBack = recoilKick * 0.06;
    const kickUp = recoilKick * 0.04;
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 0.05 : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 0.05 : 0;
    const bobAmp = aiming ? 0.25 : 1.0;
    const bobY = (moving ? Math.sin(bobTime) * 0.012 : Math.sin(Date.now() * 0.002) * 0.004) * bobAmp;
    const bobX = (moving ? Math.cos(bobTime * 0.5) * 0.008 : 0) * bobAmp;
    const ids = GUN_IDS;
    const cur = viewmodels[currentGunId()];
    const gunBaseX = aiming ? 0.0 : 0.32;
    const gunBaseY = aiming ? -0.215 : -0.28;
    if (cur) {
        cur.position.set(gunBaseX + bobX, gunBaseY + bobY - reloadDip - kickBack, -0.55 + recoilPitch * 1.2 + gunKick * 0.5);
        cur.rotation.x = recoilPitch * 2.2 + kickUp;
        cur.rotation.z = (Math.random() - 0.5) * gunKick * 0.02;
    }
    ids.forEach(id => {
        if (id !== currentGunId() && viewmodels[id]) {
            viewmodels[id].position.set(0.32, -0.28, -0.55);
            viewmodels[id].rotation.x = 0;
            viewmodels[id].rotation.z = 0;
        }
    });
    updateThrowables(dt);
    player.pos.x = Math.max(-140, Math.min(140, player.pos.x));
    player.pos.z = Math.max(-140, Math.min(140, player.pos.z));
    pushOutOfBuildings(player.pos, 0.4);
    // Footstep sounds
    const isMoving = move.length() > 0 && player.onGround;
    if (isMoving) {
        const moveSpeed = crouching ? CROUCH_SPEED : (sprinting && !aiming ? SPRINT_SPEED : MOVE_SPEED);
        const stepInterval = crouching ? 0.6 : (sprinting && !aiming ? 0.28 : 0.42);
        footstepTime += dt;
        if (footstepTime >= stepInterval) {
            footstepTime = 0;
            playSound('footstep', 1, 0.15);
        }
    } else {
        footstepTime = 0;
    }
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
            } else if (p.type === 'grenade') {
                throwables.grenade = Math.min(throwables.grenade + 1, 6);
            } else if (p.type === 'molotov') {
                throwables.molotov = Math.min(throwables.molotov + 1, 5);
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
    // Regular projectiles (rockets, bullets, explosions, smoke, flames)
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        if (Date.now() - projectiles[i].born > 3000) {
            if (projectiles[i].mesh.parent) scene.remove(projectiles[i].mesh);
            projectiles.splice(i, 1);
        }
    }
    // Pooled tracers
    for (let i = activeTracers.length - 1; i >= 0; i--) {
        const p = activeTracers[i];
        const t = (Date.now() - p.born) / p.life;
        p.item.mesh.material.opacity = Math.max(0, 0.9 * (1 - t));
        if (t >= 1) {
            p.item.mesh.visible = false;
            p.item.active = false;
            tracerPool.push(p.item);
            activeTracers.splice(i, 1);
        }
    }
    // Pooled impacts
    for (let i = activeImpacts.length - 1; i >= 0; i--) {
        const p = activeImpacts[i];
        const dt = 0.016;
        p.item.mesh.position.add(p.vel.clone().multiplyScalar(dt));
        p.vel.y -= 9.8 * dt;
        const age = Date.now() - p.start;
        p.item.mesh.material.opacity = Math.max(0, 0.85 * (1 - age / 220));
        if (age > 220) {
            p.item.mesh.visible = false;
            p.item.active = false;
            impactPool.push(p.item);
            activeImpacts.splice(i, 1);
        }
    }
    // Pooled blood
    for (let i = activeBlood.length - 1; i >= 0; i--) {
        const p = activeBlood[i];
        const dt = 0.016;
        p.item.mesh.position.add(p.vel.clone().multiplyScalar(dt));
        p.vel.y -= 12 * dt;
        const age = Date.now() - p.start;
        p.item.mesh.material.opacity = Math.max(0, 0.9 * (1 - age / 600));
        if (age > 600) {
            p.item.mesh.visible = false;
            p.item.active = false;
            bloodPool.push(p.item);
            activeBlood.splice(i, 1);
        }
    }
}

function showHitMarker() {
    const el = document.getElementById('hitmarker');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 100);
}

function showHeadshotText() {
    const el = document.createElement('div');
    el.textContent = 'HEADSHOT';
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '30%';
    el.style.color = '#FFD700';
    el.style.fontWeight = '900';
    el.style.fontSize = '32px';
    el.style.textShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '60';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.textAlign = 'center';
    el.style.animation = 'headshotPop 0.6s ease-out forwards';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
}

function showDamageNumber(pos, dmg, isHead) {
    const el = document.createElement('div');
    el.textContent = isHead ? 'HEADSHOT\n-' + Math.round(dmg) : '-' + Math.round(dmg);
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.color = isHead ? '#FFD700' : '#FFFFFF';
    el.style.fontWeight = '900';
    el.style.fontSize = isHead ? '24px' : '18px';
    el.style.textShadow = '0 0 8px rgba(0,0,0,0.8)';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '50';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.textAlign = 'center';
    document.body.appendChild(el);
    let t = 0;
    const animate = () => {
        t += 0.016;
        el.style.top = (50 - t * 60) + '%';
        el.style.opacity = String(Math.max(0, 1 - t));
        if (t < 1) requestAnimationFrame(animate);
        else el.remove();
    };
    requestAnimationFrame(animate);
}

function addKillFeed(enemyType, isHead) {
    const feed = document.getElementById('killFeed');
    if (!feed) return;
    const el = document.createElement('div');
    el.className = 'kill-item' + (isHead ? ' headshot' : '');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
    el.innerHTML = '<span class="time">[' + timeStr + ']</span> ' +
        (isHead ? '💥 HEADSHOT' : '✓ ELIMINATED') + ' — ' + enemyType.toUpperCase();
    feed.insertBefore(el, feed.firstChild);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }, 4000);
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
    const cityNow = CITIES[(level - 1) % CITIES.length];
    document.getElementById('hudLevel').textContent = 'LEVEL ' + level + ' — ' + cityNow.name.toUpperCase() + (cityNow.place ? ' · ' + cityNow.place.toUpperCase() : '');
    document.getElementById('hudScore').textContent = 'SCORE: ' + score;
    document.getElementById('hudKills').textContent = 'KILLS: ' + kills;
    const acc = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
    document.getElementById('hudKills').textContent = 'KILLS: ' + kills + '  •  HS: ' + headshots + '  •  ACC: ' + acc + '%';
    document.getElementById('medkitIndicator').textContent = 'MEDKITS: ' + player.medkits;
    const thEl = document.getElementById('throwableIndicator');
    if (thEl) thEl.textContent = 'G:GRENADE×' + throwables.grenade + '  F:FIRE×' + throwables.molotov;
    if (gameMode === 'survival') {
        document.getElementById('hudLevel').textContent = 'SURVIVAL — WAVE ' + (survivalWave + 1);
        const survTime = Math.floor((Date.now() - survivalTime) / 1000);
        const m = Math.floor(survTime / 60).toString().padStart(2, '0');
        const s = (survTime % 60).toString().padStart(2, '0');
        document.getElementById('hudScore').textContent = 'WAVE ' + (survivalWave + 1) + '  •  TIME: ' + m + ':' + s + '  •  KILLS: ' + survivalKills;
    } else {
        const cityNow = CITIES[(level - 1) % CITIES.length];
        document.getElementById('hudLevel').textContent = 'LEVEL ' + level + ' — ' + cityNow.name.toUpperCase() + (cityNow.place ? ' · ' + cityNow.place.toUpperCase() : '');
        document.getElementById('hudScore').textContent = 'SCORE: ' + score;
    }
    document.getElementById('hudKills').textContent = 'KILLS: ' + kills + '  •  HS: ' + headshots + '  •  ACC: ' + acc + '%';
    const hpPct = Math.max(0, player.health);
    document.getElementById('healthFill').style.width = hpPct + '%';
    document.getElementById('healthText').textContent = Math.round(hpPct) + ' HP';
    const slotsEl = document.getElementById('weaponSlots');
    slotsEl.innerHTML = '';
    weapons.forEach((wp, i) => {
        const slot = document.createElement('div');
        const locked = !isUnlocked(i);
        slot.className = 'weapon-slot' + (i === currentWeaponIdx ? ' active' : '') + (locked ? ' locked' : '');
        slot.textContent = locked ? '🔒' : wp.slot;
        slot.title = locked ? (wp.name + ' — unlocks at level ' + wp.unlock) : wp.name;
        slotsEl.appendChild(slot);
    });
    // Boss health bar
    const boss = enemies.find(e => e.isBoss && e.alive);
    const bhEl = document.getElementById('bossHealthBar');
    if (boss && bhEl) {
        bhEl.style.display = 'block';
        const pct = Math.max(0, boss.hp / boss.maxHp);
        document.getElementById('bossHealthFill').style.width = Math.round(pct * 100) + '%';
    } else if (bhEl) {
        bhEl.style.display = 'none';
    }
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
            if (e.isBoss) {
                ctx.fillStyle = '#8B0000';
                ctx.beginPath();
                ctx.arc(cx + dx, cy + dz, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.strokeStyle = '#00E5A0';
                ctx.lineWidth = 1;
            } else {
                ctx.fillStyle = e.state === 'combat' ? '#FF4444' : '#FF8844';
                ctx.beginPath();
                ctx.arc(cx + dx, cy + dz, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
    // Pickups on minimap
    ctx.fillStyle = '#7CFF6B';
    pickups.forEach(p => {
        if (!p.mesh) return;
        const dx = (p.mesh.position.x - player.pos.x) * scale;
        const dz = (p.mesh.position.z - player.pos.z) * scale;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < size / 2 - 5) {
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dz, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    // Throwables (grenades/molotovs in air)
    ctx.fillStyle = '#FFB457';
    liveThrowables.forEach(t => {
        const dx = (t.mesh.position.x - player.pos.x) * scale;
        const dz = (t.mesh.position.z - player.pos.z) * scale;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < size / 2 - 5) {
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dz, 1.5, 0, Math.PI * 2);
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
    aiming = false;
    rmbDown = false;
    const sc0 = document.getElementById('scopeOverlay');
    if (sc0) sc0.classList.remove('show');
    const pr0 = document.getElementById('protIndicator');
    if (pr0) pr0.style.display = 'none';
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
    // fall backward onto solid ground: pivot at feet, rest body ON the floor
    const ease = t * t * (3 - 2 * t);
    deathGroup.rotation.x = -ease * Math.PI / 2.05;
    deathGroup.position.y = ease * 0.32;
    if (camera && deathCamFrom && deathCamTo) {
        camera.position.lerpVectors(deathCamFrom, deathCamTo, Math.min(1, deathT / 1.2));
        camera.lookAt(deathGroup.position.x, 0.7 - ease * 0.35, deathGroup.position.z);
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
    if (gameMode === 'survival') {
        survivalWave++;
        waveActive = false;
        waveEnemiesRemaining = 0;
        gameState = 'intermission';
        intermissionUntil = Date.now() + 5000;
        lastCountShown = -1;
        document.getElementById('interLevel').textContent = 'WAVE ' + (survivalWave + 1);
        document.getElementById('interPlace').textContent = 'SURVIVAL MODE — WAVE ' + (survivalWave + 1);
        document.getElementById('interUnlock').textContent = 'Wave cleared · ' + survivalKills + ' kills';
        document.getElementById('intermission').classList.add('show');
        updateHUD();
        return;
    }
    if (level >= 10) {
        gameState = 'win';
        const isNew = saveBest();
        document.getElementById('winScreen').classList.add('show');
        document.getElementById('winScore').textContent = 'FINAL SCORE: ' + score;
        document.getElementById('winBest').textContent = 'BEST: ' + highScore;
        document.getElementById('winRecord').style.display = isNew ? '' : 'none';
        dimScene(true);
        document.exitPointerLock();
    } else {
        level++;
        player.health = 100;
        player.medkits = Math.min(player.medkits + 1, 5);
        throwables.grenade = Math.min(throwables.grenade + 1, 5);
        throwables.molotov = Math.min(throwables.molotov + 1, 4);
        weapons.forEach(w => w.ammo = w.mag);
        // keep the player's current weapon — just tell them what's new
        aiming = false; rmbDown = false; mouseDown = false;
        moveForward = moveBack = moveLeft = moveRight = false;
        const sc0 = document.getElementById('scopeOverlay');
        if (sc0) sc0.classList.remove('show');
        generateLevel(level);
        // 5-second breather before the drop — new map renders behind, enemies frozen
        gameState = 'intermission';
        intermissionUntil = Date.now() + 5000;
        lastCountShown = -1;
        const ncity = CITIES[(level - 1) % CITIES.length];
        document.getElementById('interLevel').textContent = 'LEVEL ' + level;
        document.getElementById('interPlace').textContent = ncity.name.toUpperCase() + ' — ' + ncity.desc;
        const fresh = WEAPONS.filter(w => w.unlock === level);
        const bits = [];
        if (fresh.length > 0) bits.push('★ NEW WEAPON: ' + fresh.map(w => w.name + ' — press ' + w.slot).join(' · '));
        if (levelRoofSnipers > 0) bits.push('⚠ ' + levelRoofSnipers + ' SNIPER' + (levelRoofSnipers > 1 ? 'S' : '') + ' ON THE ROOFTOPS');
        document.getElementById('interUnlock').textContent = bits.join('   ·   ');
        document.getElementById('intermission').classList.add('show');
        updateHUD();
    }
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('winScreen').classList.remove('show');
    document.getElementById('intermission').classList.remove('show');
    dimScene(false);
    if (deathGroup) { scene.remove(deathGroup); deathGroup = null; }
    deathT = 0;
    if (gameMode === 'survival') {
        survivalWave = 0;
        survivalKills = 0;
        survivalTime = 0;
        waveActive = false;
        waveEnemiesRemaining = 0;
    }
    level = 1;
    score = 0;
    kills = 0;
    headshots = 0;
    shotsFired = 0;
    shotsHit = 0;
    player.health = 100;
    player.medkits = 3;
    throwables = { grenade: 3, molotov: 2 };
    liveThrowables.forEach(t => scene.remove(t.mesh));
    liveThrowables = [];
    fireZones = [];
    aiming = false;
    rmbDown = false;
    const sc = document.getElementById('scopeOverlay');
    if (sc) sc.classList.remove('show');
    weapons.forEach(w => { w.ammo = w.mag; w.reloading = false; w.lastReloadStart = 0; });
    currentWeaponIdx = 0;
    generateLevel(level);
    showViewmodel(0);
    gameState = 'playing';
    document.getElementById('blocker').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('bg-character').classList.add('bg-hidden');
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
    document.getElementById('bg-character').classList.remove('bg-hidden');
    document.exitPointerLock();
}

function refreshSettingsUI() {
    document.getElementById('sensitivityVal').textContent = settings.sensitivity.toFixed(1);
    document.getElementById('fovVal').textContent = settings.fov;
    document.getElementById('volumeVal').textContent = settings.volume + '%';
    const diffLabels = document.querySelectorAll('.settings-ctrl button');
    // Find difficulty row buttons (3 buttons after the row)
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
    // Update difficulty button states
    const allBtns = document.querySelectorAll('.settings-ctrl button');
    allBtns.forEach(b => {
        b.classList.toggle('active', b.textContent === settings.difficulty.toUpperCase());
    });
    if (camera) camera.fov = settings.fov;
    if (camera) camera.updateProjectionMatrix();
}

window.setDifficulty = function(d) {
    settings.difficulty = d;
    refreshSettingsUI();
    saveSettings();
};

window.adjustSetting = function(key, delta) {
    if (key === 'sensitivity') {
        settings.sensitivity = Math.max(0.2, Math.min(3.0, +(settings.sensitivity + delta).toFixed(1)));
    } else if (key === 'fov') {
        settings.fov = Math.max(50, Math.min(110, settings.fov + delta));
    } else if (key === 'volume') {
        settings.volume = Math.max(0, Math.min(100, settings.volume + delta));
        masterVol();
    }
    refreshSettingsUI();
    saveSettings();
};

window.toggleSetting = function(key) {
    settings[key] = !settings[key];
    refreshSettingsUI();
    saveSettings();
};

window.restoreDefaults = function() {
    for (const k in DEFAULT_SETTINGS) {
        settings[k] = DEFAULT_SETTINGS[k];
    }
    refreshSettingsUI();
    saveSettings();
    if (camera) {
        camera.fov = settings.fov;
        camera.updateProjectionMatrix();
    }
    masterVol();
};

document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsBackBtn').addEventListener('click', closeSettings);
document.getElementById('quitBtn').addEventListener('click', quitToMenu);

// Expose inline onclick handlers to window (module scope isolation)
window.restartGame = restartGame;
window.quitToMenu = quitToMenu;

// Global error handler — display initialization/runtime errors on screen
window.addEventListener('error', (e) => {
    console.error('Uncaught error:', e.error || e.message);
    const blocker = document.getElementById('blocker');
    if (blocker && !blocker.classList.contains('hidden')) {
        blocker.innerHTML = '<div style="color:#fff;padding:40px;text-align:center;"><h2>Game Error</h2><p style="color:#FF5252;">' + (e.error ? e.error.message : e.message) + '</p><p style="margin-top:16px;font-size:13px;color:#9ab;">Check browser console (F12) for details.</p><button style="margin-top:20px;padding:12px 24px;background:#00C896;color:#fff;border:none;border-radius:6px;cursor:pointer;" onclick="location.reload()">RETRY</button></div>';
        blocker.classList.remove('hidden');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

function startGame(mode = 'campaign') {
    gameMode = mode;
    // WebGL compatibility check
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            document.getElementById('blocker').innerHTML = '<div style="color:#fff;padding:40px;text-align:center;"><h2>WebGL Not Supported</h2><p>Your browser does not support WebGL, which is required to run BING SHOOT.</p><p>Please try Google Chrome, Microsoft Edge, or Mozilla Firefox.</p></div>';
            document.getElementById('blocker').classList.remove('hidden');
            return;
        }
    } catch (e) {
        // WebGL check failed
    }
    if (mode === 'survival') {
        survivalWave = 0;
        survivalKills = 0;
        survivalTime = 0;
        waveActive = false;
        waveEnemiesRemaining = 0;
        level = 1;
        score = 0;
        kills = 0;
        headshots = 0;
        shotsFired = 0;
        shotsHit = 0;
    }
    try {
        initAudio();
        initThree();
        setupInput();
        generateLevel(level);
    } catch (err) {
        console.error('Game initialization failed:', err);
        document.getElementById('blocker').innerHTML = '<div style="color:#fff;padding:40px;text-align:center;"><h2>Initialization Error</h2><p>Failed to start the game. Check the browser console for details.</p><p style="margin-top:20px;color:#FF5252;">' + err.message + '</p><button style="margin-top:20px;padding:12px 24px;background:#00C896;color:#fff;border:none;border-radius:6px;cursor:pointer;" onclick="location.reload()">RETRY</button></div>';
        document.getElementById('blocker').classList.remove('hidden');
        return;
    }
    gameState = 'playing';
    // Signal loading screen that engine is ready
    if (typeof window.__bingShootLoadingReady === 'function') {
        window.__bingShootLoadingReady();
    }
    document.getElementById('blocker').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('bg-character').classList.add('bg-hidden');
    document.body.requestPointerLock();
    gameLoop();
}

document.getElementById('btnCampaign').addEventListener('click', () => startGame('campaign'));
document.getElementById('btnSurvival').addEventListener('click', () => startGame('survival'));
saveBest();
loadSettings();
loadWeaponUpgrades();

document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && gameState === 'playing' && !paused) {
        pauseGame();
    }
});

// Pause when tab becomes invisible (user switches tabs, etc.)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing' && !paused) {
        pauseGame();
    }
});

// Handle window blur (click outside game)
window.addEventListener('blur', () => {
    if (gameState === 'playing' && !paused && document.pointerLockElement) {
        pauseGame();
    }
});

// Audio context resume on user interaction (browser autoplay policy)
const _resumeAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
};
document.addEventListener('click', _resumeAudio, { once: true });
document.addEventListener('keydown', _resumeAudio, { once: true });

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
            const isNew = saveBest();
            document.getElementById('gameOverScreen').classList.add('show');
            document.getElementById('finalScore').textContent = 'SCORE: ' + score;
            const fb = document.getElementById('finalBreath');
            if (fb) fb.textContent = 'FINAL BREATH — ' + weapons[currentWeaponIdx].name + ' IN HAND';
            document.getElementById('bestScore').textContent = 'BEST: ' + highScore;
            document.getElementById('newRecord').style.display = isNew ? '' : 'none';
            dimScene(true);
        }
        return;
    }
    if (gameState === 'intermission') {
        const remain = Math.max(0, intermissionUntil - Date.now());
        const sec = Math.ceil(remain / 1000);
        if (sec !== lastCountShown) {
            lastCountShown = sec;
            document.getElementById('interCount').textContent = sec > 0 ? sec : 'GO';
        }
        updateMinimap();
        renderer.render(scene, camera);
        if (remain <= 0) {
            document.getElementById('intermission').classList.remove('show');
            gameState = 'playing';
            spawnProtUntil = Date.now() + 3000;
            const stagger = Date.now();
            enemies.forEach(e => { e.lastFire = stagger + Math.random() * 1200; });
            if (gameMode === 'survival') {
                spawnSurvivalWave(survivalWave + 1);
            }
        }
        return;
    }
    if (gameState !== 'playing') return;
    const dt = Math.min(clock.getDelta(), 0.05);
    // Animate dust particles
    if (dustParticles) {
        const positions = dustParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += dt * 0.3;
            if (positions[i] > 25) positions[i] = 2;
        }
        dustParticles.geometry.attributes.position.needsUpdate = true;
    }
    updatePlayer(dt);
    updateEnemies(dt);
    updatePickups();
    updateProjectiles();
    // Update minimap every 3rd frame to reduce CPU cost
    if (Math.floor(Date.now() / 50) % 3 === 0) updateMinimap();
    const protEl = document.getElementById('protIndicator');
    if (protEl) protEl.style.display = (Date.now() < spawnProtUntil) ? 'block' : 'none';
    const alive = enemies.filter(e => e.alive).length;
    if (alive === 0 && enemies.length > 0 && gameMode !== 'survival') {
        winLevel();
    }
    // Survival mode timer
    if (gameMode === 'survival' && waveActive) {
        survivalTime += dt;
    }
    renderer.render(scene, camera);
}
