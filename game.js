const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const jobNameEl = document.getElementById("jobName");
const jobStatusEl = document.getElementById("jobStatus");
const scoreEl = document.getElementById("score");
const progressFillEl = document.getElementById("progressFill");
const timeLeftEl = document.getElementById("timeLeft");
const damageTextEl = document.getElementById("damageText");
const damageFillEl = document.getElementById("damageFill");
const lineTextEl = document.getElementById("lineText");
const lineFillEl = document.getElementById("lineFill");
const ratingTextEl = document.getElementById("ratingText");
const creditsTextEl = document.getElementById("creditsText");
const toastEl = document.getElementById("toast");
const shopEl = document.getElementById("shop");
const shopCreditsEl = document.getElementById("shopCredits");
const nextTowEl = document.getElementById("nextTow");
const upgradeButtons = [...document.querySelectorAll("[data-upgrade]")];
const compassEl = document.querySelector(".compass");
const compassArrowEl = document.getElementById("compassArrow");
const compassDistanceEl = document.getElementById("compassDistance");
const emergencyEl = document.getElementById("emergency");
const emergencyTextEl = document.getElementById("emergencyText");
const introEl = document.getElementById("intro");
const startGameEl = document.getElementById("startGame");

const TAU = Math.PI * 2;
const keys = new Set();
const pointer = { x: 0, y: 0, worldX: 0, worldY: 0, active: false };
const camera = { x: 0, y: 0, zoom: 1 };

let width = 0;
let height = 0;
let dpr = 1;
let lastTime = performance.now();
let toastTimer = 0;
let routeComplete = false;
let shopOpen = false;
let introOpen = true;
let jobTimeRemaining = 70;
let cargoDamage = 0;
let lastRating = "--";
let weatherTimer = 12;
let meteorTimer = 0;
let emergencyTimer = 14;
let emergency = null;
let cargoBubbleTimer = 0;
let cargoBubbleText = "";
let cargoBubbleBody = null;
let cargoIdleTimer = 6;
let audioCtx = null;
let musicTimer = null;
let musicStep = 0;
let fireCooldown = 0;

const planet = {
  x: 0,
  y: 0,
  radius: 165,
  gravity: 190000,
};

const dropZones = [
  { id: "repair", label: "Repair Dock", x: 675, y: -430, radius: 84, color: "#5ce1e6" },
  { id: "market", label: "Snack Depot", x: -720, y: -515, radius: 78, color: "#f6c75f" },
  { id: "freight", label: "Freight Ring", x: 780, y: 455, radius: 88, color: "#9bd36d" },
  { id: "hotel", label: "Orbit Hotel", x: -610, y: 500, radius: 74, color: "#caa7ff" },
  { id: "quarantine", label: "Legal Dock", x: 995, y: -50, radius: 82, color: "#ef626c" },
];

const ship = {
  x: -1380,
  y: 680,
  vx: 90,
  vy: -40,
  angle: 0,
  radius: 16,
  mass: 1,
  boostHeat: 0,
  paint: "#f5f7ef",
};

let cable = {
  attached: null,
  length: 138,
  min: 62,
  max: 285,
  integrity: 55,
  hitCooldown: 0,
};

const upgrades = {
  hook: 0,
  cable: 0,
  thruster: 0,
  paint: 0,
};

const upgradeCatalog = {
  hook: { baseCost: 80, max: 3, label: "Long-range hook" },
  cable: { baseCost: 90, max: 3, label: "Reinforced line" },
  thruster: { baseCost: 100, max: 3, label: "Handling tune" },
  paint: { baseCost: 35, max: 6, label: "Ship paint" },
};

const shipPaints = ["#f5f7ef", "#5ce1e6", "#f6c75f", "#ef626c", "#9bd36d", "#caa7ff", "#ff9f6e"];

const jobs = [
  {
    id: "satellite",
    name: "Broken Satellite",
    status: "Navigate in from deep space, hook the satellite, and bring it to the repair dock.",
    reward: 120,
    duration: 96,
    dropZone: "repair",
  },
  {
    id: "vending",
    name: "Runaway Snack Machine",
    status: "Corporate wants it at the snack depot. Everyone else says it is cursed.",
    reward: 150,
    duration: 104,
    dropZone: "market",
  },
  {
    id: "crate",
    name: "Overpacked Cargo Crate",
    status: "It is heavier than it looks. Use the winch and haul it to the freight ring.",
    reward: 130,
    duration: 100,
    dropZone: "freight",
  },
  {
    id: "capsule",
    name: "Sleepy Tourist Capsule",
    status: "The passenger is fine. Probably. Tow gently to the orbit hotel.",
    reward: 160,
    duration: 110,
    dropZone: "hotel",
  },
  {
    id: "asteroid",
    name: "Suspiciously Legal Asteroid",
    status: "It has paperwork. That somehow makes this worse. Use the legal dock.",
    reward: 180,
    duration: 116,
    dropZone: "quarantine",
  },
];

const cargoPersonalities = {
  satellite: {
    hook: ["Signal restored. Please stop spinning.", "Tow lock detected. Try not to fold my panels."],
    idle: ["I miss stable orbit.", "My left panel is judging your angle."],
    damage: ["That was a structural opinion.", "Panel warranty status: nervous."],
    near: ["Repair dock ping acquired.", "Almost home. Fewer bumps, please."],
    emergency: ["My sensors dislike this weather."],
  },
  vending: {
    hook: ["Insert coin to continue towing.", "Snack machine custody transferred."],
    idle: ["I contain 11 warm sodas and one mystery.", "This route is not OSHA snack compliant."],
    damage: ["You dented the pretzel bay.", "The candy is airborne."],
    near: ["Snack depot ahead. Act natural.", "Corporate will hear about the scratches."],
    emergency: ["Refunds unavailable during emergencies."],
  },
  crate: {
    hook: ["Cargo manifest: heavy.", "Lift with your knees. Or rockets."],
    idle: ["Something inside just shifted.", "No, I will not tell you what I weigh."],
    damage: ["That sounded expensive.", "Corner integrity has entered negotiations."],
    near: ["Freight ring in sight.", "Park me label-side up."],
    emergency: ["The fragile stickers are screaming."],
  },
  capsule: {
    hook: ["Passenger nap in progress.", "Premium tourist capsule requests smooth towing."],
    idle: ["The passenger just asked if we are there yet.", "Please avoid scenic collisions."],
    damage: ["Guest satisfaction decreasing.", "That woke somebody up."],
    near: ["Orbit hotel beacon acquired.", "Five stars if we survive this."],
    emergency: ["This was not in the brochure."],
  },
  asteroid: {
    hook: ["Legally distinct rock attached.", "Paperwork says I am cargo."],
    idle: ["I have committed no crimes today.", "Please do not read the fine print."],
    damage: ["That was probably pre-existing.", "My lawyer felt that."],
    near: ["Legal dock ahead. Look innocent.", "Prepare the clipboard."],
    emergency: ["This complicates my alibi."],
  },
};

let currentJobIndex = 0;
let credits = 0;
let deliveredCount = 0;

const bodies = [
  makeTowable("satellite", -110, -430, 0, 52, 18, 2.1),
  makeTowable("vending", 420, 110, -58, -10, 20, 2.6),
  makeTowable("crate", -410, 260, 42, -40, 22, 3.0),
  makeTowable("capsule", 130, 455, 60, 8, 19, 2.3),
  makeTowable("asteroid", -535, -230, 18, 50, 25, 3.4),
];

const hazards = [
  makeHazard(272, 0.4, 0.62, 14, "#ef626c"),
  makeHazard(335, 1.4, -0.5, 13, "#9bd36d"),
  makeHazard(405, 2.3, -0.42, 18, "#f6c75f"),
  makeHazard(492, 3.6, 0.36, 15, "#5ce1e6"),
  makeHazard(585, 4.7, 0.28, 16, "#ef626c"),
  makeHazard(685, 5.4, -0.22, 20, "#f6c75f"),
];

const meteors = [];
const projectiles = [];
const spaceRocks = [
  makeSpaceRock(-1080, 450, 28),
  makeSpaceRock(-880, 240, 36),
  makeSpaceRock(-620, 665, 24),
  makeSpaceRock(-430, -120, 32),
  makeSpaceRock(250, 720, 30),
  makeSpaceRock(1090, 250, 34),
  makeSpaceRock(-940, -520, 25),
];

const debrisFields = [
  makeDebrisField(-930, 520, 170, "#5ce1e6"),
  makeDebrisField(-250, 165, 145, "#f6c75f"),
  makeDebrisField(520, 700, 165, "#ef626c"),
];

const ufos = [
  makeUfo(-760, -210, 235, 0.72, "#caa7ff"),
  makeUfo(375, 610, 270, -0.55, "#9bd36d"),
  makeUfo(1080, -315, 220, 0.68, "#5ce1e6"),
];

const stars = Array.from({ length: 240 }, (_, index) => {
  const layer = index % 3;
  return {
    x: Math.random() * 3200 - 1600,
    y: Math.random() * 2400 - 1200,
    r: 0.7 + Math.random() * (layer + 0.7),
    a: 0.25 + Math.random() * 0.55,
    layer: 0.2 + layer * 0.24,
  };
});

function makeTowable(id, x, y, vx, vy, radius, mass) {
  return {
    id,
    x,
    y,
    vx,
    vy,
    radius,
    mass,
    delivered: false,
    dockTimer: 0,
    damageCooldown: 0,
    spin: Math.random() * TAU,
    spinSpeed: (Math.random() - 0.5) * 1.2,
  };
}

function makeHazard(orbitRadius, angle, speed, radius, color) {
  return {
    orbitRadius,
    angle,
    speed,
    radius,
    color,
    x: Math.cos(angle) * orbitRadius,
    y: Math.sin(angle) * orbitRadius,
    vx: 0,
    vy: 0,
  };
}

function makeSpaceRock(x, y, radius) {
  return {
    x,
    y,
    radius,
    spin: Math.random() * TAU,
    spinSpeed: (Math.random() - 0.5) * 0.7,
  };
}

function makeDebrisField(x, y, radius, color) {
  return {
    x,
    y,
    radius,
    color,
    swirl: Math.random() * TAU,
    specks: Array.from({ length: 26 }, () => ({
      angle: Math.random() * TAU,
      distance: Math.random() * radius,
      size: 1.5 + Math.random() * 3,
      speed: 0.15 + Math.random() * 0.28,
    })),
  };
}

function makeUfo(anchorX, anchorY, patrolRadius, speed, color) {
  return {
    anchorX,
    anchorY,
    patrolRadius,
    speed,
    color,
    phase: Math.random() * TAU,
    x: anchorX,
    y: anchorY,
    vx: 0,
    vy: 0,
    radius: 28,
    bumpCooldown: 0,
  };
}

function resize() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  width = Math.floor(window.innerWidth);
  height = Math.floor(window.innerHeight);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  camera.zoom = Math.max(0.72, Math.min(1.06, width / 1180));
}

function screenToWorld(x, y) {
  return {
    x: (x - width / 2) / camera.zoom + camera.x,
    y: (y - height / 2) / camera.zoom + camera.y,
  };
}

function worldToScreen(x, y) {
  return {
    x: (x - camera.x) * camera.zoom + width / 2,
    y: (y - camera.y) * camera.zoom + height / 2,
  };
}

function addListeners() {
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    ensureAudio();
    const key = event.key.toLowerCase();
    keys.add(key);

    if (introOpen && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      startRoute();
      return;
    }

    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }

    if (event.code === "Space" && !event.repeat) {
      toggleHook();
    }

    if (key === "f" && !event.repeat) {
      fireBlaster();
    }

    if (key === "r" && !event.repeat) {
      resetPrototype();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    const world = screenToWorld(pointer.x, pointer.y);
    pointer.worldX = world.x;
    pointer.worldY = world.y;
  });

  canvas.addEventListener("pointerdown", () => {
    ensureAudio();
    pointer.active = true;
    toggleHook();
  });

  canvas.addEventListener("pointerup", () => {
    pointer.active = false;
  });

  upgradeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      ensureAudio();
      buyUpgrade(button.dataset.upgrade);
    });
  });

  nextTowEl.addEventListener("click", () => {
    ensureAudio();
    launchNextTow();
  });

  startGameEl.addEventListener("click", startRoute);
}

function startRoute() {
  ensureAudio();
  introOpen = false;
  introEl.classList.add("hidden");
  lastTime = performance.now();
  showToast("Dispatch online. Navigate in from deep space.");
}

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    return;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  audioCtx = new AudioCtor();
  startMusic();
}

function playTone(freq, duration = 0.12, type = "sine", volume = 0.045, slideTo = null) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playNoise(duration = 0.12, volume = 0.04) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(now);
}

function startMusic() {
  if (musicTimer || !audioCtx) return;
  const notes = [146.83, 196, 220, 246.94, 293.66, 246.94, 220, 196];
  musicTimer = window.setInterval(() => {
    if (!audioCtx || audioCtx.state === "suspended") return;
    const freq = notes[musicStep % notes.length];
    playTone(freq, 0.38, "triangle", 0.018);
    if (musicStep % 4 === 0) playTone(freq / 2, 0.62, "sine", 0.015);
    musicStep += 1;
  }, 680);
}

function playSound(name) {
  if (!audioCtx) return;
  if (name === "hook") {
    playTone(520, 0.09, "triangle", 0.06, 720);
    playTone(260, 0.12, "sine", 0.035, 330);
  }
  if (name === "release") playTone(330, 0.11, "triangle", 0.05, 180);
  if (name === "damage") {
    playNoise(0.1, 0.055);
    playTone(120, 0.16, "sawtooth", 0.025, 72);
  }
  if (name === "line") playTone(190, 0.12, "square", 0.035, 90);
  if (name === "snap") {
    playNoise(0.22, 0.07);
    playTone(88, 0.2, "sawtooth", 0.035, 55);
  }
  if (name === "deliver") {
    [392, 523.25, 659.25].forEach((freq, index) => {
      window.setTimeout(() => playTone(freq, 0.16, "triangle", 0.045), index * 75);
    });
  }
  if (name === "buy") {
    playTone(440, 0.08, "sine", 0.035);
    window.setTimeout(() => playTone(660, 0.1, "sine", 0.035), 80);
  }
  if (name === "warning") {
    playTone(740, 0.11, "square", 0.038);
    window.setTimeout(() => playTone(520, 0.12, "square", 0.038), 140);
  }
  if (name === "fire") playTone(820, 0.08, "square", 0.032, 520);
  if (name === "destroy") {
    playNoise(0.12, 0.05);
    playTone(180, 0.12, "sawtooth", 0.03, 110);
  }
}

function resetPrototype() {
  ship.x = -1380;
  ship.y = 680;
  ship.vx = 90;
  ship.vy = -40;
  cable.attached = null;
  cable.length = 138;
  cable.max = 285;
  cable.integrity = maxLineIntegrity();
  cable.hitCooldown = 0;
  credits = 0;
  deliveredCount = 0;
  currentJobIndex = 0;
  routeComplete = false;
  shopOpen = false;
  lastRating = "--";
  weatherTimer = 12;
  meteorTimer = 0;
  fireCooldown = 0;
  emergencyTimer = 14;
  emergency = null;
  emergencyEl.classList.add("hidden");
  cargoBubbleTimer = 0;
  cargoBubbleBody = null;
  meteors.length = 0;
  projectiles.length = 0;
  Object.keys(upgrades).forEach((key) => {
    upgrades[key] = 0;
  });
  ship.paint = shipPaints[0];
  startCurrentJob();
  hideShop();

  const starts = [
    [-110, -430, 0, 52],
    [420, 110, -58, -10],
    [-410, 260, 42, -40],
    [130, 455, 60, 8],
    [-535, -230, 18, 50],
  ];

  bodies.forEach((body, index) => {
    const start = starts[index];
    body.x = start[0];
    body.y = start[1];
    body.vx = start[2];
    body.vy = start[3];
    body.delivered = false;
    body.dockTimer = 0;
    body.damageCooldown = 0;
  });

  updateHud();
  showToast("Route reset. Navigate toward the planet and avoid deep-space traffic.");
}

function startCurrentJob() {
  const job = jobs[currentJobIndex];
  jobTimeRemaining = job?.duration || 70;
  cargoDamage = 0;
  cargoIdleTimer = 5 + Math.random() * 3;
  cargoBubbleTimer = 0;
}

function upgradeCost(type) {
  const item = upgradeCatalog[type];
  return item.baseCost + upgrades[type] * 45;
}

function buyUpgrade(type) {
  const item = upgradeCatalog[type];
  if (!item || !shopOpen) return;
  if (upgrades[type] >= item.max) {
    showToast(`${item.label} is fully upgraded`);
    return;
  }

  const cost = upgradeCost(type);
  if (credits < cost) {
    showToast("Not enough credits");
    return;
  }

  credits -= cost;
  upgrades[type] += 1;
  playSound("buy");

  if (type === "hook") {
    cable.max += 35;
  }
  if (type === "cable") {
    cable.max += 22;
    cable.integrity = maxLineIntegrity();
  }
  if (type === "paint") {
    ship.paint = shipPaints[upgrades.paint % shipPaints.length];
  }

  showToast(`${item.label} upgraded`);
  updateHud();
  updateShop();
}

function showShop() {
  shopOpen = true;
  emergency = null;
  emergencyEl.classList.add("hidden");
  shopEl.classList.remove("hidden");
  compassEl.classList.add("hidden");
  updateShop();
}

function hideShop() {
  shopOpen = false;
  shopEl.classList.add("hidden");
  compassEl.classList.remove("hidden");
}

function launchNextTow() {
  if (!shopOpen) return;
  hideShop();
  startCurrentJob();
  showToast(`Next tow: ${jobs[currentJobIndex].name}`);
}

function updateShop() {
  shopCreditsEl.textContent = `${credits} credits available`;
  upgradeButtons.forEach((button) => {
    const type = button.dataset.upgrade;
    const item = upgradeCatalog[type];
    const costEl = button.querySelector("span");
    const maxed = upgrades[type] >= item.max;
    const cost = upgradeCost(type);
    button.disabled = maxed || credits < cost;
    costEl.textContent = maxed ? "Maxed" : `${cost} credits`;
  });
}

function currentTarget() {
  return bodies.find((body) => body.id === jobs[currentJobIndex]?.id);
}

function currentDropZone() {
  const job = jobs[currentJobIndex];
  return dropZones.find((zone) => zone.id === job?.dropZone) || dropZones[0];
}

function activeDropZoneRadius(zone = currentDropZone()) {
  if (emergency?.type === "blackout" && zone === currentDropZone()) return zone.radius * 0.58;
  return zone.radius;
}

function hookRange() {
  return 250 + upgrades.hook * 55;
}

function maxLineIntegrity() {
  return 55 + upgrades.cable * 45;
}

function lineIntegrityPercent() {
  return Math.round((cable.integrity / maxLineIntegrity()) * 100);
}

function toggleHook() {
  if (routeComplete) {
    resetPrototype();
    return;
  }

  if (shopOpen) return;

  if (cable.attached) {
    cable.attached = null;
    cable.integrity = maxLineIntegrity();
    playSound("release");
    showToast("Hook released");
    return;
  }

  const target = currentTarget();
  if (!target || target.delivered) return;

  const nearest = bodies
    .filter((body) => !body.delivered)
    .map((body) => ({ body, distance: distance(ship, body) }))
    .filter((item) => item.distance <= hookRange())
    .sort((a, b) => a.distance - b.distance)[0];

  if (!nearest) {
    showToast("Tow target is still out of hook range");
    return;
  }

  cable.attached = nearest.body;
  cable.length = Math.max(cable.min, Math.min(cable.max, nearest.distance));
  cable.integrity = maxLineIntegrity();
  cable.hitCooldown = 0;
  playSound("hook");
  if (nearest.body.id === target.id) {
    showToast(`Hooked: ${jobs[currentJobIndex].name}`);
    sayCargo(nearest.body, "hook");
  } else {
    showToast("That is not today's tow, but physics allows it");
    showCargoBubble(nearest.body, "Wrong job, but I respect the confidence.");
  }
}

function fireBlaster() {
  if (introOpen || shopOpen || routeComplete || fireCooldown > 0) return;

  const speed = 720;
  const noseX = Math.cos(ship.angle);
  const noseY = Math.sin(ship.angle);
  projectiles.push({
    x: ship.x + noseX * 26,
    y: ship.y + noseY * 26,
    vx: ship.vx * 0.2 + noseX * speed,
    vy: ship.vy * 0.2 + noseY * speed,
    radius: 5,
    life: 0.95,
  });
  fireCooldown = 0.26;
  playSound("fire");
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("visible");
  toastTimer = 2.2;
}

function showCargoBubble(body, message) {
  if (!body) return;
  cargoBubbleBody = body;
  cargoBubbleText = message;
  cargoBubbleTimer = 2.55;
}

function sayCargo(body, mood) {
  const lines = cargoPersonalities[body?.id]?.[mood];
  if (!lines?.length) return;
  showCargoBubble(body, lines[Math.floor(Math.random() * lines.length)]);
}

function updateHud() {
  const job = jobs[currentJobIndex];
  if (routeComplete) {
    jobNameEl.textContent = "Route Complete";
    jobStatusEl.textContent = `Final payout: ${credits} credits. Press R or Space for a fresh route.`;
  } else if (shopOpen) {
    jobNameEl.textContent = "Tow Yard";
    jobStatusEl.textContent = `Spend credits, then launch ${job.name}.`;
  } else {
    jobNameEl.textContent = job.name;
    jobStatusEl.textContent = job.status;
  }

  scoreEl.textContent = `${deliveredCount}/5`;
  progressFillEl.style.width = `${Math.round((deliveredCount / jobs.length) * 100)}%`;
  timeLeftEl.textContent = routeComplete || shopOpen ? "--" : formatTime(jobTimeRemaining);
  damageTextEl.textContent = `${Math.round(cargoDamage)}%`;
  damageFillEl.style.width = `${Math.round(cargoDamage)}%`;
  lineTextEl.textContent = cable.attached ? `${lineIntegrityPercent()}%` : "Ready";
  lineFillEl.style.width = cable.attached ? `${lineIntegrityPercent()}%` : "100%";
  ratingTextEl.textContent = lastRating;
  creditsTextEl.textContent = String(credits);
  if (shopOpen) updateShop();
  updateCompass();
}

function updateCompass() {
  const zone = currentDropZone();
  const dx = zone.x - ship.x;
  const dy = zone.y - ship.y;
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  const meters = Math.round(Math.hypot(dx, dy) / 10);
  compassArrowEl.style.transform = `translate(-50%, -68%) rotate(${angle}rad)`;
  compassDistanceEl.textContent = `${meters}m`;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function calculateRating(job) {
  let rating = 3;
  if (cargoDamage > 20) rating -= 1;
  if (cargoDamage > 55) rating -= 1;
  if (jobTimeRemaining <= 0) rating -= 1;
  if (jobTimeRemaining > job.duration * 0.42 && cargoDamage < 8) rating = 3;
  return Math.max(1, Math.min(3, rating));
}

function calculatePayout(job, rating) {
  const timeRatio = Math.max(0, jobTimeRemaining / job.duration);
  const timeBonus = Math.round(job.reward * timeRatio * 0.35);
  const cleanBonus = cargoDamage < 8 ? 45 : cargoDamage < 22 ? 25 : cargoDamage < 45 ? 10 : 0;
  const ratingBonus = rating === 3 ? 35 : rating === 2 ? 10 : 0;
  return job.reward + timeBonus + cleanBonus + ratingBonus;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyGravity(body, dt) {
  const dx = planet.x - body.x;
  const dy = planet.y - body.y;
  const distSq = Math.max(planet.radius * planet.radius, dx * dx + dy * dy);
  const dist = Math.sqrt(distSq);
  const force = planet.gravity / distSq;
  body.vx += (dx / dist) * force * dt;
  body.vy += (dy / dist) * force * dt;
}

function addCargoDamage(amount, message) {
  if (routeComplete || amount <= 0) return;
  cargoDamage = Math.min(100, cargoDamage + amount);
  playSound("damage");
  sayCargo(currentTarget(), "damage");
  if (message && cargoDamage < 100) showToast(message);
  if (cargoDamage >= 100) showToast("Cargo is battered. Delivery still counts, but payout will suffer.");
}

function resolvePlanetCollision(body, bounce = 0.28) {
  const dx = body.x - planet.x;
  const dy = body.y - planet.y;
  const dist = Math.max(0.001, Math.hypot(dx, dy));
  const minDist = planet.radius + body.radius;

  if (dist >= minDist) return 0;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  body.x += nx * overlap;
  body.y += ny * overlap;

  const normalSpeed = body.vx * nx + body.vy * ny;
  if (normalSpeed < 0) {
    body.vx -= (1 + bounce) * normalSpeed * nx;
    body.vy -= (1 + bounce) * normalSpeed * ny;
  }

  body.vx *= 0.94;
  body.vy *= 0.94;
  return Math.abs(Math.min(0, normalSpeed));
}

function updateShip(dt) {
  applyGravity(ship, dt);

  let ax = 0;
  let ay = 0;
  if (keys.has("w") || keys.has("arrowup")) ay -= 1;
  if (keys.has("s") || keys.has("arrowdown")) ay += 1;
  if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
  if (keys.has("d") || keys.has("arrowright")) ax += 1;

  const mag = Math.hypot(ax, ay);
  const boosting = mag > 0;
  if (boosting) {
    ax /= mag;
    ay /= mag;
    const thrustBase = 245 + upgrades.thruster * 38;
    const thrust = keys.has("shift") ? thrustBase + 85 : thrustBase;
    ship.vx += ax * thrust * dt;
    ship.vy += ay * thrust * dt;
    ship.boostHeat = Math.min(1, ship.boostHeat + dt * 4);
  } else {
    ship.boostHeat = Math.max(0, ship.boostHeat - dt * 3);
  }

  ship.vx *= 0.998;
  ship.vy *= 0.998;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  resolvePlanetCollision(ship, 0.18);

  const aimX = pointer.worldX || ship.x + ship.vx;
  const aimY = pointer.worldY || ship.y + ship.vy;
  const desiredAngle = Math.atan2(aimY - ship.y, aimX - ship.x);
  ship.angle = lerpAngle(ship.angle, desiredAngle, 1 - Math.pow(0.001, dt));
}

function updateBodies(dt) {
  const target = currentTarget();
  bodies.forEach((body) => {
    if (body.delivered) return;
    body.damageCooldown = Math.max(0, body.damageCooldown - dt);
    applyGravity(body, dt);
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.vx *= 0.999;
    body.vy *= 0.999;
    body.spin += body.spinSpeed * dt;
    const impact = resolvePlanetCollision(body, 0.34);
    if (body === target && impact > 70 && body.damageCooldown <= 0) {
      addCargoDamage((impact - 55) * 0.14, "Cargo scraped the planet");
      body.damageCooldown = 0.8;
    }
  });
}

function updateHazards(dt) {
  hazards.forEach((hazard) => {
    const prevX = hazard.x;
    const prevY = hazard.y;
    hazard.angle += hazard.speed * dt;
    hazard.x = Math.cos(hazard.angle) * hazard.orbitRadius;
    hazard.y = Math.sin(hazard.angle) * hazard.orbitRadius;
    const safeDt = Math.max(0.001, dt);
    hazard.vx = (hazard.x - prevX) / safeDt;
    hazard.vy = (hazard.y - prevY) / safeDt;

    resolveHazardCollision(ship, hazard, 0.5);

    const target = currentTarget();
    if (target && !target.delivered) {
      const impact = resolveHazardCollision(target, hazard, 0.64);
      if (impact > 40 && target.damageCooldown <= 0) {
        addCargoDamage((impact - 32) * 0.18, "Cargo clipped orbiting debris");
        target.damageCooldown = 0.8;
      }
    }
  });
}

function resolveHazardCollision(body, hazard, bounce) {
  const dx = body.x - hazard.x;
  const dy = body.y - hazard.y;
  const dist = Math.max(0.001, Math.hypot(dx, dy));
  const minDist = body.radius + hazard.radius;
  if (dist >= minDist) return 0;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  body.x += nx * overlap;
  body.y += ny * overlap;

  const relVx = body.vx - hazard.vx;
  const relVy = body.vy - hazard.vy;
  const normalSpeed = relVx * nx + relVy * ny;
  if (normalSpeed < 0) {
    body.vx -= (1 + bounce) * normalSpeed * nx;
    body.vy -= (1 + bounce) * normalSpeed * ny;
  }

  return Math.abs(Math.min(0, normalSpeed));
}

function updateMeteors(dt) {
  weatherTimer -= dt;
  if (weatherTimer <= 0) {
    weatherTimer = 24 + Math.random() * 16;
    meteorTimer = 7.5;
    playSound("warning");
    showToast("Meteor shower inbound");
    sayCargo(cable.attached || currentTarget(), "emergency");
  }

  if (meteorTimer > 0) {
    meteorTimer -= dt;
    if (Math.random() < dt * 2.6) spawnMeteor();
  }

  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const meteor = meteors[i];
    meteor.life -= dt;
    meteor.x += meteor.vx * dt;
    meteor.y += meteor.vy * dt;
    meteor.spin += meteor.spinSpeed * dt;

    if (resolveMeteorCollision(ship, meteor, false)) {
      meteors.splice(i, 1);
      continue;
    }

    const target = currentTarget();
    if (target && !target.delivered && resolveMeteorCollision(target, meteor, true)) {
      meteors.splice(i, 1);
      continue;
    }

    if (meteor.life <= 0 || distance(meteor, planet) > 1200) {
      meteors.splice(i, 1);
    }
  }
}

function triggerEmergency(type = null) {
  const eventType = type || ["meteor", "ufo", "squall", "blackout"][Math.floor(Math.random() * 4)];
  const details = {
    meteor: { duration: 8, text: "Meteor wall crossing the route" },
    ufo: { duration: 10, text: "UFO convoy entering tow space" },
    squall: { duration: 12, text: "Magnetic squall pulling loose cargo" },
    blackout: { duration: 11, text: "Load zone signal blackout" },
  }[eventType];

  emergency = {
    type: eventType,
    timer: details.duration,
    text: details.text,
  };
  emergencyEl.classList.remove("hidden");
  emergencyTextEl.textContent = details.text;
  playSound("warning");
  showToast(details.text);
  sayCargo(cable.attached || currentTarget(), "emergency");

  if (eventType === "meteor") {
    meteorTimer = Math.max(meteorTimer, 8);
  }
  if (eventType === "ufo") {
    ufos.forEach((ufo) => {
      ufo.phase += Math.PI * 0.5;
    });
  }
}

function updateEmergency(dt) {
  emergencyTimer -= dt;
  if (!emergency && !routeComplete && !shopOpen && emergencyTimer <= 0) {
    emergencyTimer = 20 + Math.random() * 18;
    triggerEmergency();
  }

  if (!emergency) {
    emergencyEl.classList.add("hidden");
    return;
  }

  emergency.timer -= dt;
  emergencyTextEl.textContent = `${emergency.text} ${Math.ceil(emergency.timer)}s`;

  if (emergency.type === "meteor") {
    meteorTimer = Math.max(meteorTimer, 0.2);
    if (Math.random() < dt * 4.6) spawnMeteor();
  }

  if (emergency.type === "squall") {
    const target = cable.attached || currentTarget();
    [ship, target].forEach((body) => {
      if (!body || body.delivered) return;
      const dx = body.x - planet.x;
      const dy = body.y - planet.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      body.vx += (-dy / dist) * 58 * dt;
      body.vy += (dx / dist) * 58 * dt;
    });
  }

  if (emergency.type === "blackout") {
    const zone = currentDropZone();
    zone.blackoutPulse = Math.max(zone.blackoutPulse || 0, emergency.timer);
  }

  if (emergency.timer <= 0) {
    emergency = null;
    emergencyEl.classList.add("hidden");
  }
}

function updateProjectiles(dt) {
  fireCooldown = Math.max(0, fireCooldown - dt);

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.life -= dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    const hit = findProjectileHit(projectile);
    if (hit) {
      destroyHazardObject(hit.collection, hit.object);
      projectiles.splice(i, 1);
      continue;
    }

    if (projectile.life <= 0 || distance(projectile, ship) > 920) {
      projectiles.splice(i, 1);
    }
  }
}

function findProjectileHit(projectile) {
  const collections = [spaceRocks, hazards, meteors, ufos];
  for (const collection of collections) {
    const object = collection.find((item) => {
      if (item === cable.attached) return false;
      return Math.hypot(projectile.x - item.x, projectile.y - item.y) < projectile.radius + item.radius;
    });
    if (object) return { collection, object };
  }
  return null;
}

function destroyHazardObject(collection, object) {
  const index = collection.indexOf(object);
  if (index >= 0) collection.splice(index, 1);

  spawnSplitObjects(object, collection);
  playSound("destroy");
  showToast("Object destroyed. Two more entered the route.");
}

function spawnSplitObjects(source, sourceCollection) {
  const baseRadius = Math.max(9, (source.radius || 18) * 0.72);
  for (let i = 0; i < 2; i += 1) {
    const angle = Math.random() * TAU;
    const distanceOut = baseRadius * (3.2 + Math.random() * 2.4);
    const x = source.x + Math.cos(angle) * distanceOut;
    const y = source.y + Math.sin(angle) * distanceOut;

    if (sourceCollection === ufos) {
      ufos.push(makeUfo(x, y, 95 + Math.random() * 110, (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.4), source.color || "#caa7ff"));
    } else if (sourceCollection === hazards) {
      const orbitRadius = Math.max(230, Math.hypot(x, y));
      hazards.push(makeHazard(orbitRadius, Math.atan2(y, x), (Math.random() < 0.5 ? -1 : 1) * (0.24 + Math.random() * 0.42), baseRadius, source.color || "#f6c75f"));
    } else if (sourceCollection === meteors) {
      const angleToCenter = Math.atan2(planet.y - y, planet.x - x) + (Math.random() - 0.5) * 0.8;
      const speed = 185 + Math.random() * 170;
      meteors.push({
        x,
        y,
        vx: Math.cos(angleToCenter) * speed,
        vy: Math.sin(angleToCenter) * speed,
        radius: baseRadius,
        life: 7,
        spin: Math.random() * TAU,
        spinSpeed: (Math.random() - 0.5) * 6,
      });
    } else {
      const rock = makeSpaceRock(x, y, baseRadius);
      rock.spinSpeed += (Math.random() - 0.5) * 0.5;
      spaceRocks.push(rock);
    }
  }
}

function updateCargoPersonality(dt) {
  cargoBubbleTimer = Math.max(0, cargoBubbleTimer - dt);
  const target = cable.attached || currentTarget();
  if (!target || target.delivered || shopOpen || routeComplete) return;

  cargoIdleTimer -= dt;
  if (cargoIdleTimer <= 0) {
    cargoIdleTimer = 8 + Math.random() * 7;
    if (cable.attached) sayCargo(target, "idle");
  }

  if (cable.attached) {
    const zone = currentDropZone();
    const dockDistance = Math.hypot(target.x - zone.x, target.y - zone.y);
    if (dockDistance < activeDropZoneRadius(zone) * 2.3 && cargoBubbleTimer <= 0) {
      cargoIdleTimer = 9;
      sayCargo(target, "near");
    }
  }
}

function spawnMeteor() {
  const side = Math.floor(Math.random() * 4);
  const margin = 760;
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = camera.x - width / camera.zoom / 2 - margin;
    y = camera.y + (Math.random() - 0.5) * height / camera.zoom;
  } else if (side === 1) {
    x = camera.x + width / camera.zoom / 2 + margin;
    y = camera.y + (Math.random() - 0.5) * height / camera.zoom;
  } else if (side === 2) {
    x = camera.x + (Math.random() - 0.5) * width / camera.zoom;
    y = camera.y - height / camera.zoom / 2 - margin;
  } else {
    x = camera.x + (Math.random() - 0.5) * width / camera.zoom;
    y = camera.y + height / camera.zoom / 2 + margin;
  }

  const targetX = planet.x + (Math.random() - 0.5) * 980;
  const targetY = planet.y + (Math.random() - 0.5) * 780;
  const angle = Math.atan2(targetY - y, targetX - x);
  const speed = 285 + Math.random() * 190;
  meteors.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 10 + Math.random() * 8,
    life: 8,
    spin: Math.random() * TAU,
    spinSpeed: (Math.random() - 0.5) * 6,
  });
}

function resolveMeteorCollision(body, meteor, damagesCargo) {
  const dx = body.x - meteor.x;
  const dy = body.y - meteor.y;
  const dist = Math.max(0.001, Math.hypot(dx, dy));
  if (dist >= body.radius + meteor.radius) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  const impact = Math.hypot(body.vx - meteor.vx, body.vy - meteor.vy);
  body.vx += nx * Math.min(320, impact) * 0.42;
  body.vy += ny * Math.min(320, impact) * 0.42;

  if (damagesCargo) {
    addCargoDamage(12 + impact * 0.035, "Meteor hit the cargo");
  } else {
    showToast("Meteor knocked the tow ship");
  }

  return true;
}

function updateSpaceRocks(dt) {
  const target = currentTarget();
  spaceRocks.forEach((rock) => {
    rock.spin += rock.spinSpeed * dt;
    resolveRockCollision(ship, rock, false);
    if (target && !target.delivered) resolveRockCollision(target, rock, true);
  });
}

function resolveRockCollision(body, rock, damagesCargo) {
  const dx = body.x - rock.x;
  const dy = body.y - rock.y;
  const dist = Math.max(0.001, Math.hypot(dx, dy));
  const minDist = body.radius + rock.radius;
  if (dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  body.x += nx * overlap;
  body.y += ny * overlap;

  const normalSpeed = body.vx * nx + body.vy * ny;
  if (normalSpeed < 0) {
    body.vx -= 1.55 * normalSpeed * nx;
    body.vy -= 1.55 * normalSpeed * ny;
  }

  if (damagesCargo && Math.abs(normalSpeed) > 35) {
    addCargoDamage(5 + Math.abs(normalSpeed) * 0.08, "Cargo hit an asteroid");
  } else if (!damagesCargo && Math.abs(normalSpeed) > 45) {
    showToast("Asteroid knocked the ship off course");
  }
}

function updateDebrisFields(dt) {
  debrisFields.forEach((field) => {
    field.swirl += dt * 0.36;
    applyDebrisField(ship, field, dt, false);
    const target = currentTarget();
    if (target && !target.delivered) applyDebrisField(target, field, dt, true);
  });
}

function applyDebrisField(body, field, dt, damagesCargo) {
  const dx = body.x - field.x;
  const dy = body.y - field.y;
  const dist = Math.hypot(dx, dy);
  if (dist > field.radius) return;

  const strength = 1 - dist / field.radius;
  const tangentX = -dy / Math.max(1, dist);
  const tangentY = dx / Math.max(1, dist);
  body.vx += tangentX * strength * 74 * dt;
  body.vy += tangentY * strength * 74 * dt;
  body.vx *= 1 - strength * 0.015;
  body.vy *= 1 - strength * 0.015;

  if (damagesCargo && Math.random() < dt * strength * 0.4) {
    addCargoDamage(1.8, "Debris field scratched the cargo");
  }
}

function updateUfos(dt) {
  const target = currentTarget();
  ufos.forEach((ufo) => {
    const prevX = ufo.x;
    const prevY = ufo.y;
    const speedBoost = emergency?.type === "ufo" ? 1.9 : 1;
    ufo.phase += ufo.speed * speedBoost * dt;
    ufo.x = ufo.anchorX + Math.cos(ufo.phase) * ufo.patrolRadius;
    ufo.y = ufo.anchorY + Math.sin(ufo.phase * 1.3) * ufo.patrolRadius * 0.52;
    ufo.vx = (ufo.x - prevX) / Math.max(0.001, dt);
    ufo.vy = (ufo.y - prevY) / Math.max(0.001, dt);
    ufo.bumpCooldown = Math.max(0, ufo.bumpCooldown - dt);

    resolveUfoCollision(ship, ufo, false);
    if (target && !target.delivered) resolveUfoCollision(target, ufo, true);
  });
}

function resolveUfoCollision(body, ufo, damagesCargo) {
  const dx = body.x - ufo.x;
  const dy = body.y - ufo.y;
  const dist = Math.max(0.001, Math.hypot(dx, dy));
  if (dist >= body.radius + ufo.radius) return;

  const nx = dx / dist;
  const ny = dy / dist;
  body.x += nx * 8;
  body.y += ny * 8;
  const shove = emergency?.type === "ufo" ? 255 : 185;
  body.vx += nx * shove + ufo.vx * 0.24;
  body.vy += ny * shove + ufo.vy * 0.24;

  if (ufo.bumpCooldown <= 0) {
    showToast(damagesCargo ? "UFO clipped the cargo" : "UFO shoved you off course");
    if (damagesCargo) addCargoDamage(9, "UFO clipped the cargo");
    ufo.bumpCooldown = 1.6;
  }
}

function updateCableBreaks(dt) {
  const body = cable.attached;
  if (!body) return;

  cable.hitCooldown = Math.max(0, cable.hitCooldown - dt);
  const breakRadius = Math.max(7, 13 - upgrades.cable * 2);
  const lineHit = [...hazards, ...meteors, ...spaceRocks, ...ufos].find((object) => {
    return distanceToSegment(object.x, object.y, ship.x, ship.y, body.x, body.y) < object.radius + breakRadius;
  });

  if (!lineHit || cable.hitCooldown > 0) return;

  const damage = lineHitDamage(lineHit);
  cable.integrity = Math.max(0, cable.integrity - damage);
  cable.hitCooldown = 0.65;

  if (cable.integrity <= 0) {
    cable.attached = null;
    cable.integrity = maxLineIntegrity();
    playSound("snap");
    addCargoDamage(6, "Tow line snapped");
    return;
  }

  playSound("line");
  showToast(`Line hit: ${lineIntegrityPercent()}% integrity`);
}

function lineHitDamage(object) {
  if (meteors.includes(object)) return 70;
  if (spaceRocks.includes(object)) return 62;
  if (ufos.includes(object)) return 52;
  return 42;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lengthSq = vx * vx + vy * vy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lengthSq));
  const x = ax + vx * t;
  const y = ay + vy * t;
  return Math.hypot(px - x, py - y);
}

function updateCable(dt) {
  if (keys.has("q")) cable.length = Math.max(cable.min, cable.length - 82 * dt);
  if (keys.has("e")) cable.length = Math.min(cable.max, cable.length + 82 * dt);

  const body = cable.attached;
  if (!body || body.delivered) {
    cable.attached = null;
    return;
  }

  const dx = body.x - ship.x;
  const dy = body.y - ship.y;
  const dist = Math.max(0.001, Math.hypot(dx, dy));
  const nx = dx / dist;
  const ny = dy / dist;
  const stretch = dist - cable.length;
  const relVx = body.vx - ship.vx;
  const relVy = body.vy - ship.vy;
  const relAlong = relVx * nx + relVy * ny;
  const spring = stretch * 9 + relAlong * 1.8;
  const force = Math.max(-80, Math.min(260, spring));

  ship.vx += nx * force * dt * 0.64;
  ship.vy += ny * force * dt * 0.64;
  body.vx -= nx * force * dt / body.mass;
  body.vy -= ny * force * dt / body.mass;

  if (dist > cable.max + 210) {
    cable.attached = null;
    showToast("Cable snapped loose");
  }
}

function updateDelivery(dt) {
  const target = currentTarget();
  if (!target || target.delivered || routeComplete) return;

  const zone = currentDropZone();
  const dockDistance = Math.hypot(target.x - zone.x, target.y - zone.y);
  const speed = Math.hypot(target.vx, target.vy);
  const dockRadius = activeDropZoneRadius(zone);

  if (dockDistance < dockRadius && speed < 145) {
    target.dockTimer += dt;
  } else {
    target.dockTimer = Math.max(0, target.dockTimer - dt * 1.4);
  }

  if (target.dockTimer > 0.65) {
    const job = jobs[currentJobIndex];
    const rating = calculateRating(job);
    const payout = calculatePayout(job, rating);
    target.delivered = true;
    cable.attached = null;
    deliveredCount += 1;
    credits += payout;
    lastRating = `${rating}/3`;
    playSound("deliver");
    showCargoBubble(target, rating === 3 ? "Honestly? Impressive." : "I have notes.");
    showToast(`Delivered: ${rating}/3 stars, ${payout} credits.`);
    currentJobIndex += 1;

    if (currentJobIndex >= jobs.length) {
      currentJobIndex = jobs.length - 1;
      routeComplete = true;
      showToast(`Route complete. Total payout: ${credits} credits.`);
    } else {
      showShop();
    }
    updateHud();
  }
}

function updateJobClock(dt) {
  if (routeComplete || shopOpen) return;
  jobTimeRemaining = Math.max(0, jobTimeRemaining - dt);
}

function updateCamera(dt) {
  const target = cable.attached
    ? {
        x: (ship.x * 0.62 + cable.attached.x * 0.38),
        y: (ship.y * 0.62 + cable.attached.y * 0.38),
      }
    : ship;

  camera.x += (target.x - camera.x) * (1 - Math.pow(0.001, dt));
  camera.y += (target.y - camera.y) * (1 - Math.pow(0.001, dt));
}

function update(dt) {
  if (introOpen) {
    updateHud();
    return;
  }

  if (shopOpen) {
    updateHud();
    cargoBubbleTimer = Math.max(0, cargoBubbleTimer - dt);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.remove("visible");
    }
    return;
  }

  updateJobClock(dt);
  updateShip(dt);
  updateBodies(dt);
  updateHazards(dt);
  updateSpaceRocks(dt);
  updateDebrisFields(dt);
  updateUfos(dt);
  updateMeteors(dt);
  updateEmergency(dt);
  updateCargoPersonality(dt);
  updateProjectiles(dt);
  updateCableBreaks(dt);
  updateCable(dt);
  updateDelivery(dt);
  updateCamera(dt);
  updateHud();

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove("visible");
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawSpace();

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  drawPlanet();
  drawDropZones();
  drawDebrisFields();
  drawSpaceRocks();
  drawHazards();
  drawUfos();
  drawMeteors();
  drawProjectiles();
  drawTowGuide();
  drawBodies();
  drawCable();
  drawShip();
  drawCargoBubble();

  ctx.restore();
  drawVignette();
}

function drawSpace() {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#06131c");
  gradient.addColorStop(0.44, "#0b0f1e");
  gradient.addColorStop(1, "#140b18");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  stars.forEach((star) => {
    const sx = ((star.x - camera.x * star.layer) * camera.zoom + width / 2) % (width + 80);
    const sy = ((star.y - camera.y * star.layer) * camera.zoom + height / 2) % (height + 80);
    ctx.globalAlpha = star.a;
    ctx.fillStyle = "#f8fbff";
    ctx.beginPath();
    ctx.arc(sx < -40 ? sx + width + 80 : sx, sy < -40 ? sy + height + 80 : sy, star.r, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPlanet() {
  const grd = ctx.createRadialGradient(-42, -58, 10, 0, 0, planet.radius);
  grd.addColorStop(0, "#8ed782");
  grd.addColorStop(0.44, "#348f78");
  grd.addColorStop(0.78, "#215e6e");
  grd.addColorStop(1, "#102f46");

  ctx.save();
  ctx.shadowColor = "rgba(92, 225, 230, 0.32)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius - 4, 0, TAU);
  ctx.stroke();

  drawPlanetDetail(-72, -44, 34, "#d3e17a");
  drawPlanetDetail(38, -86, 26, "#f1c764");
  drawPlanetDetail(72, 40, 42, "#9bd36d");
  drawPlanetDetail(-34, 78, 24, "#58b08b");
  drawPlanetCity();
  ctx.restore();
}

function drawPlanetDetail(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.46;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.58, Math.sin(x) * 1.8, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPlanetCity() {
  ctx.save();
  ctx.rotate(-0.38);
  ctx.fillStyle = "rgba(246, 199, 95, 0.78)";
  for (let i = -2; i <= 2; i += 1) {
    ctx.fillRect(i * 13 - 4, -planet.radius + 18 - Math.abs(i) * 3, 8, 18 + Math.abs(i) * 4);
  }
  ctx.strokeStyle = "rgba(246, 199, 95, 0.38)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, planet.radius - 26, -1.52, -0.94);
  ctx.stroke();
  ctx.restore();
}

function drawDropZones() {
  const activeZone = currentDropZone();
  dropZones.forEach((zone) => {
    const active = zone === activeZone && !routeComplete;
    ctx.save();
    ctx.translate(zone.x, zone.y);

    ctx.strokeStyle = active ? hexToRgba(zone.color, 0.48) : "rgba(245, 247, 239, 0.12)";
    ctx.lineWidth = active ? 3 : 2;
    ctx.setLineDash(active ? [10, 11] : [5, 12]);
    ctx.beginPath();
    const zoneRadius = activeDropZoneRadius(zone);
    ctx.arc(0, 0, zoneRadius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    const pulse = 0.72 + Math.sin(performance.now() * 0.004 + zone.x * 0.01) * 0.12;
    ctx.fillStyle = hexToRgba(zone.color, active ? 0.1 * pulse : 0.035);
    ctx.beginPath();
    ctx.arc(0, 0, zoneRadius, 0, TAU);
    ctx.fill();

    ctx.rotate((zone.x + zone.y) * 0.001);
    ctx.fillStyle = active ? "#f5f7ef" : "rgba(245, 247, 239, 0.62)";
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = active ? 4 : 2;
    roundRect(-42, -22, 84, 44, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = zone.color;
    ctx.fillRect(-30, -8, 60, 16);
    ctx.fillStyle = "#1d2630";
    ctx.fillRect(-22, -4, 44, 8);

    if (active) {
      ctx.rotate(-(zone.x + zone.y) * 0.001);
      ctx.fillStyle = "#f5f7ef";
      ctx.font = "700 14px Inter, sans-serif";
      ctx.textAlign = "center";
      if (emergency?.type === "blackout" && zone === activeZone) {
        ctx.strokeStyle = "rgba(239, 98, 108, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, zone.radius, 0, TAU);
        ctx.stroke();
      }
      ctx.fillText(zone.label, 0, -zoneRadius - 18);
    }

    ctx.restore();
  });
}

function drawDebrisFields() {
  debrisFields.forEach((field) => {
    ctx.save();
    ctx.translate(field.x, field.y);
    ctx.strokeStyle = hexToRgba(field.color, 0.26);
    ctx.fillStyle = hexToRgba(field.color, 0.035);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, field.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();

    field.specks.forEach((speck) => {
      const angle = speck.angle + field.swirl * speck.speed;
      const x = Math.cos(angle) * speck.distance;
      const y = Math.sin(angle) * speck.distance;
      ctx.fillStyle = hexToRgba(field.color, 0.42);
      ctx.beginPath();
      ctx.arc(x, y, speck.size, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  });
}

function drawSpaceRocks() {
  spaceRocks.forEach((rock) => {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.spin);
    ctx.fillStyle = "#81798b";
    ctx.strokeStyle = "rgba(245, 247, 239, 0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * TAU;
      const radius = rock.radius * (0.78 + ((i * 7) % 5) * 0.07);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.25, -rock.radius * 0.1, rock.radius * 0.18, 0, TAU);
    ctx.arc(rock.radius * 0.22, rock.radius * 0.24, rock.radius * 0.13, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

function drawUfos() {
  ufos.forEach((ufo) => {
    ctx.save();
    ctx.translate(ufo.x, ufo.y);
    ctx.rotate(Math.sin(ufo.phase) * 0.2);
    ctx.shadowColor = ufo.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = hexToRgba(ufo.color, 0.82);
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(245, 247, 239, 0.86)";
    ctx.beginPath();
    ctx.ellipse(0, -6, 16, 11, 0, Math.PI, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#081118";
    ctx.beginPath();
    ctx.arc(-13, 2, 3, 0, TAU);
    ctx.arc(0, 4, 3, 0, TAU);
    ctx.arc(13, 2, 3, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
}

function drawHazards() {
  ctx.save();
  ctx.strokeStyle = "rgba(245, 247, 239, 0.08)";
  ctx.lineWidth = 1.5;
  hazards.forEach((hazard) => {
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, hazard.orbitRadius, 0, TAU);
    ctx.stroke();
  });

  hazards.forEach((hazard, index) => {
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.rotate(hazard.angle * 2.4);
    ctx.shadowColor = hazard.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = hazard.color;
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU;
      const radius = i % 2 === 0 ? hazard.radius : hazard.radius * 0.66;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(8, 17, 24, 0.72)";
    ctx.beginPath();
    ctx.arc(0, 0, hazard.radius * 0.32, 0, TAU);
    ctx.fill();

    if (index === 0) {
      ctx.strokeStyle = "rgba(239, 98, 108, 0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, hazard.radius + 8, 0, TAU);
      ctx.stroke();
    }

    ctx.restore();
  });
  ctx.restore();
}

function drawMeteors() {
  ctx.save();
  meteors.forEach((meteor) => {
    const speed = Math.max(1, Math.hypot(meteor.vx, meteor.vy));
    const tailX = meteor.x - (meteor.vx / speed) * 44;
    const tailY = meteor.y - (meteor.vy / speed) * 44;

    ctx.strokeStyle = "rgba(246, 199, 95, 0.42)";
    ctx.lineWidth = meteor.radius * 0.7;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(meteor.x, meteor.y);
    ctx.stroke();

    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.spin);
    ctx.fillStyle = "#c98548";
    ctx.strokeStyle = "#f6c75f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * TAU;
      const radius = meteor.radius * (0.74 + (i % 2) * 0.28);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  if (meteorTimer > 0) {
    ctx.fillStyle = "rgba(239, 98, 108, 0.12)";
    ctx.fillRect(camera.x - width / camera.zoom, camera.y - height / camera.zoom, (width / camera.zoom) * 2, (height / camera.zoom) * 2);
  }

  ctx.restore();
}

function drawProjectiles() {
  ctx.save();
  projectiles.forEach((projectile) => {
    const speed = Math.max(1, Math.hypot(projectile.vx, projectile.vy));
    const tailX = projectile.x - (projectile.vx / speed) * 24;
    const tailY = projectile.y - (projectile.vy / speed) * 24;

    ctx.strokeStyle = "rgba(92, 225, 230, 0.64)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(projectile.x, projectile.y);
    ctx.stroke();

    ctx.fillStyle = "#f5f7ef";
    ctx.shadowColor = "#5ce1e6";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

function drawTowGuide() {
  if (cable.attached || routeComplete) return;

  const target = currentTarget();
  if (!target || target.delivered) return;

  const d = distance(ship, target);
  ctx.save();
  ctx.strokeStyle = d < hookRange() ? "rgba(92, 225, 230, 0.42)" : "rgba(246, 199, 95, 0.24)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(ship.x, ship.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(92, 225, 230, 0.13)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, hookRange(), 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = "rgba(246, 199, 95, 0.52)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.radius + 11 + Math.sin(performance.now() * 0.006) * 3, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawBodies() {
  bodies.forEach((body) => {
    if (body.delivered) return;

    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.spin);

    const isTarget = currentTarget()?.id === body.id && !routeComplete;
    if (isTarget) {
      ctx.strokeStyle = "rgba(246, 199, 95, 0.58)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, body.radius + 10, 0, TAU);
      ctx.stroke();
    }

    if (body.id === "satellite") drawSatellite(body);
    if (body.id === "vending") drawVending(body);
    if (body.id === "crate") drawCrate(body);
    if (body.id === "capsule") drawCapsule(body);
    if (body.id === "asteroid") drawAsteroid(body);

    ctx.restore();
  });
}

function drawSatellite() {
  ctx.fillStyle = "#5ce1e6";
  ctx.fillRect(-42, -10, 24, 20);
  ctx.fillRect(18, -10, 24, 20);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-42, -10, 24, 20);
  ctx.strokeRect(18, -10, 24, 20);
  ctx.fillStyle = "#e6eef4";
  roundRect(-14, -15, 28, 30, 4);
  ctx.fill();
  ctx.fillStyle = "#f6c75f";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
}

function drawVending() {
  ctx.fillStyle = "#ef626c";
  roundRect(-16, -25, 32, 50, 6);
  ctx.fill();
  ctx.fillStyle = "#fff5d5";
  ctx.fillRect(-9, -16, 18, 18);
  ctx.fillStyle = "#202733";
  ctx.fillRect(-9, 7, 18, 8);
  ctx.fillStyle = "#5ce1e6";
  ctx.beginPath();
  ctx.arc(8, -2, 3, 0, TAU);
  ctx.fill();
}

function drawCrate() {
  ctx.fillStyle = "#c98548";
  roundRect(-23, -22, 46, 44, 5);
  ctx.fill();
  ctx.strokeStyle = "#6e452a";
  ctx.lineWidth = 4;
  ctx.strokeRect(-16, -15, 32, 30);
  ctx.beginPath();
  ctx.moveTo(-18, -18);
  ctx.lineTo(18, 18);
  ctx.moveTo(18, -18);
  ctx.lineTo(-18, 18);
  ctx.stroke();
}

function drawCapsule() {
  ctx.fillStyle = "#f4f0e3";
  roundRect(-30, -15, 60, 30, 15);
  ctx.fill();
  ctx.fillStyle = "#5ce1e6";
  ctx.beginPath();
  ctx.ellipse(5, -1, 13, 9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ef626c";
  ctx.fillRect(-27, -6, 8, 12);
}

function drawAsteroid() {
  ctx.fillStyle = "#8b8190";
  ctx.beginPath();
  for (let i = 0; i < 11; i += 1) {
    const angle = (i / 11) * TAU;
    const r = 20 + Math.sin(i * 2.1) * 7;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(-7, -4, 5, 0, TAU);
  ctx.arc(9, 8, 4, 0, TAU);
  ctx.fill();
}

function drawCable() {
  if (!cable.attached) return;

  const body = cable.attached;
  ctx.save();
  ctx.strokeStyle = "rgba(245, 247, 239, 0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ship.x, ship.y);

  const midX = (ship.x + body.x) / 2;
  const midY = (ship.y + body.y) / 2;
  const sag = Math.min(34, Math.max(-34, (distance(ship, body) - cable.length) * 0.16));
  ctx.quadraticCurveTo(midX, midY + sag, body.x, body.y);
  ctx.stroke();

  ctx.fillStyle = "#f6c75f";
  ctx.beginPath();
  ctx.arc(body.x, body.y, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  if (ship.boostHeat > 0.02) {
    ctx.fillStyle = `rgba(246, 199, 95, ${0.38 + ship.boostHeat * 0.34})`;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-42 - Math.random() * 14 * ship.boostHeat, -8);
    ctx.lineTo(-35 - Math.random() * 12 * ship.boostHeat, 0);
    ctx.lineTo(-42 - Math.random() * 14 * ship.boostHeat, 8);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = ship.paint;
  ctx.strokeStyle = "#182b3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-15, -15);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-15, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#5ce1e6";
  ctx.beginPath();
  ctx.ellipse(4, 0, 8, 5, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#f6c75f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-24, 0);
  ctx.stroke();

  ctx.restore();
}

function drawCargoBubble() {
  if (cargoBubbleTimer <= 0 || !cargoBubbleBody || !cargoBubbleText) return;

  const body = cargoBubbleBody;
  ctx.save();
  ctx.translate(body.x, body.y - body.radius - 34);
  ctx.globalAlpha = Math.min(1, cargoBubbleTimer / 0.35);

  const textWidth = Math.min(260, Math.max(126, cargoBubbleText.length * 7.1));
  ctx.fillStyle = "rgba(8, 17, 24, 0.86)";
  ctx.strokeStyle = "rgba(246, 199, 95, 0.42)";
  ctx.lineWidth = 1.5;
  roundRect(-textWidth / 2, -20, textWidth, 36, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f5f7ef";
  ctx.font = "700 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cargoBubbleText, 0, -2);

  ctx.beginPath();
  ctx.moveTo(-8, 16);
  ctx.lineTo(0, 26);
  ctx.lineTo(8, 16);
  ctx.closePath();
  ctx.fillStyle = "rgba(8, 17, 24, 0.86)";
  ctx.fill();
  ctx.restore();
}

function drawVignette() {
  const grd = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.22, width / 2, height / 2, Math.max(width, height) * 0.72);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function lerpAngle(a, b, t) {
  const delta = ((b - a + Math.PI) % TAU) - Math.PI;
  return a + delta * t;
}

function loop(now) {
  const rawDt = (now - lastTime) / 1000;
  const dt = Math.min(0.033, rawDt);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

resize();
addListeners();
startCurrentJob();
updateHud();
requestAnimationFrame(loop);
