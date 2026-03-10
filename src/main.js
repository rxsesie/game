const TILE = 46;
const WORLD_W = 56;
const WORLD_H = 56;
const SAVE_KEY = "cozy-forest-save-v3";

kaboom({
  width: 1280,
  height: 820,
  background: [8, 20, 23],
  letterbox: true,
  crisp: false,
});

const statusEl = document.getElementById("status");
const timeEl = document.getElementById("time");
const weatherEl = document.getElementById("weather");
const discoveryEl = document.getElementById("discovery");
const skinSelect = document.getElementById("skinSelect");
const outfitSelect = document.getElementById("outfitSelect");
const petSelect = document.getElementById("petSelect");
const applyStyle = document.getElementById("applyStyle");

const baseSave = {
  customization: { skin: "warm", hair: "bun", outfit: "moss" },
  pet: "fox",
  affection: 0,
  bonsai: 1,
  pondFish: 0,
  inventory: { mushroom: 0, crystal: 0, scroll: 0, decor: 0 },
  discovered: {},
  journal: ["The forest greeted me with soft wind and warm tea."],
};

function loadSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return parsed ? { ...baseSave, ...parsed } : structuredClone(baseSave);
  } catch {
    return structuredClone(baseSave);
  }
}

const save = loadSave();

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

skinSelect.value = save.customization.skin;
outfitSelect.value = save.customization.outfit;
petSelect.value = save.pet;

function seeded(x, y, offset = 0) {
  const n = Math.sin((x + offset) * 14.873 + (y + offset) * 91.117) * 43758.5453;
  return n - Math.floor(n);
}

function biomeAt(x, y) {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist < 6) return "camp";
  const n = seeded(x * 0.14, y * 0.14);
  const m = seeded(x * 0.08, y * 0.08, 18);
  if (n > 0.8) return "water";
  if (m > 0.72) return "cliff";
  if (n < 0.29) return "meadow";
  return "forest";
}

const groundPalette = {
  camp: [rgb(99, 124, 103), rgb(116, 147, 121)],
  meadow: [rgb(83, 140, 96), rgb(126, 178, 111)],
  forest: [rgb(56, 108, 78), rgb(88, 132, 92)],
  cliff: [rgb(106, 113, 102), rgb(142, 148, 132)],
  water: [rgb(42, 95, 131), rgb(65, 130, 166)],
};

const worldTiles = [];
const props = [];
const paths = [];
const revealed = new Set(Object.keys(save.discovered));

for (let y = 0; y < WORLD_H; y++) {
  for (let x = 0; x < WORLD_W; x++) {
    const biome = biomeAt(x, y);
    const h = seeded(x * 0.21, y * 0.21, 4);
    const sparkle = seeded(x * 0.39, y * 0.39, 27);
    const key = `${x},${y}`;
    worldTiles.push({ x, y, biome, h, sparkle, key });

    if (biome === "forest" && seeded(x, y, 45) > 0.74) props.push({ x, y, kind: seeded(x, y, 88) > 0.5 ? "pine" : "bushy" });
    if (biome === "meadow" && seeded(x, y, 67) > 0.79) props.push({ x, y, kind: "flower" });
    if (biome === "cliff" && seeded(x, y, 14) > 0.71) props.push({ x, y, kind: "rock" });
    if (biome === "camp" && seeded(x, y, 9) > 0.88) props.push({ x, y, kind: "lantern" });
    if ((x === 27 || y === 28) && biome !== "water" && seeded(x, y, 73) > 0.35) paths.push({ x, y });
  }
}

const player = add([pos((WORLD_W / 2) * TILE, (WORLD_H / 2) * TILE), "player"]);
const pet = add([pos(player.pos.add(vec2(22, 12))), "pet"]);

const campfire = vec2((WORLD_W / 2) * TILE + 40, (WORLD_H / 2) * TILE + 12);
const bonsaiSpot = vec2((WORLD_W / 2) * TILE - 64, (WORLD_H / 2) * TILE + 14);
const pondSpot = vec2((WORLD_W / 2) * TILE + 182, (WORLD_H / 2) * TILE - 8);
const breathSpot = vec2((WORLD_W / 2) * TILE - 186, (WORLD_H / 2) * TILE - 48);

const collectibleKinds = ["mushroom", "crystal", "scroll", "decor"];
const collectibles = [];
for (let i = 0; i < 130; i++) {
  const x = randi(1, WORLD_W - 2);
  const y = randi(1, WORLD_H - 2);
  const biome = biomeAt(x, y);
  if (biome === "water" || biome === "camp") continue;
  const kind = collectibleKinds[randi(0, collectibleKinds.length)];
  collectibles.push({ x: x * TILE + 13 + rand(0, 18), y: y * TILE + 10 + rand(0, 20), kind, pulse: rand(0, 9) });
}

const skinColor = {
  warm: rgb(244, 195, 152),
  cool: rgb(220, 191, 174),
  deep: rgb(144, 97, 70),
};

const outfitColor = {
  moss: rgb(116, 162, 109),
  berry: rgb(188, 97, 142),
  dusk: rgb(106, 127, 188),
};

const petColor = {
  fox: rgb(219, 147, 100),
  cat: rgb(238, 220, 186),
  spirit: rgb(168, 206, 248),
};

function near(v, distance = 64) {
  return player.pos.dist(v) < distance;
}

function getDaySegment(value) {
  if (value < 0.25) return "Morning";
  if (value < 0.45) return "Day";
  if (value < 0.72) return "Sunset";
  return "Night";
}

function updateStatus(extra = "") {
  statusEl.textContent = `🧺 ${save.inventory.mushroom} 🍄 · 💎 ${save.inventory.crystal} · 📜 ${save.inventory.scroll} · 🪔 ${save.inventory.decor} · 🐾 ${save.affection} · 🌳 ${save.bonsai}/7 · 🐟 ${save.pondFish}${extra ? ` · ${extra}` : ""}`;
}

function updateDiscoveryChip() {
  const pct = Math.round((revealed.size / (WORLD_W * WORLD_H)) * 100);
  discoveryEl.textContent = `🧭 ${pct}%`;
}

updateStatus("wander gently");
updateDiscoveryChip();

let cycleT = 0;
let weather = "clear";
let weatherT = 0;

onUpdate(() => {
  let mv = vec2(0, 0);
  if (isKeyDown("left") || isKeyDown("a")) mv.x -= 1;
  if (isKeyDown("right") || isKeyDown("d")) mv.x += 1;
  if (isKeyDown("up") || isKeyDown("w")) mv.y -= 1;
  if (isKeyDown("down") || isKeyDown("s")) mv.y += 1;

  const dir = mv.len() > 0 ? mv.unit() : mv;
  player.move(dir.scale(182));
  player.pos.x = clamp(player.pos.x, 18, WORLD_W * TILE - 18);
  player.pos.y = clamp(player.pos.y, 18, WORLD_H * TILE - 18);

  pet.move(player.pos.sub(pet.pos).scale(2.8));
  camPos(player.pos);

  const tx = Math.floor(player.pos.x / TILE);
  const ty = Math.floor(player.pos.y / TILE);
  for (let y = ty - 3; y <= ty + 3; y++) {
    for (let x = tx - 3; x <= tx + 3; x++) {
      const key = `${x},${y}`;
      if (!revealed.has(key)) {
        revealed.add(key);
        save.discovered[key] = true;
      }
    }
  }
  updateDiscoveryChip();

  cycleT += dt() * 0.02;
  const cycle = (Math.sin(cycleT) + 1) / 2;
  timeEl.textContent = `🕰️ ${getDaySegment(cycle)}`;
  setBackground(rgb(10 + cycle * 42, 16 + cycle * 36, 22 + cycle * 24));

  weatherT += dt();
  if (weatherT > 22) {
    weatherT = 0;
    weather = choose(["clear", "clear", "clear", "mist", "drizzle"]);
  }
  weatherEl.textContent = weather === "clear" ? "☀️ clear" : weather === "mist" ? "🌫️ mist" : "🌧️ drizzle";
});

function drawTree(worldPos, type) {
  drawEllipse({ pos: worldPos.add(vec2(0, 12)), width: 24, height: 10, color: rgb(18, 26, 24), opacity: 0.42 });
  drawRect({ pos: worldPos.add(vec2(-2, -2)), width: 5, height: 16, color: rgb(108, 75, 56), radius: 5 });
  if (type === "pine") {
    drawTriangle({ p1: worldPos.add(vec2(-12, 2)), p2: worldPos.add(vec2(12, 2)), p3: worldPos.add(vec2(0, -18)), color: rgb(82, 151, 106) });
    drawTriangle({ p1: worldPos.add(vec2(-10, -6)), p2: worldPos.add(vec2(10, -6)), p3: worldPos.add(vec2(0, -26)), color: rgb(97, 172, 116) });
  } else {
    drawCircle({ pos: worldPos.add(vec2(0, -12)), radius: 13, color: rgb(96, 168, 109) });
    drawCircle({ pos: worldPos.add(vec2(-9, -8)), radius: 8, color: rgb(86, 153, 104) });
    drawCircle({ pos: worldPos.add(vec2(8, -8)), radius: 8, color: rgb(82, 145, 99) });
  }
}

onDraw(() => {
  const cam = camPos();
  const topLeft = cam.sub(vec2(width() / 2 + TILE, height() / 2 + TILE));
  const bottomRight = cam.add(vec2(width() / 2 + TILE, height() / 2 + TILE));

  for (const tile of worldTiles) {
    const px = tile.x * TILE;
    const py = tile.y * TILE;
    if (px < topLeft.x || px > bottomRight.x || py < topLeft.y || py > bottomRight.y) continue;

    const [c1, c2] = groundPalette[tile.biome];
    const col = rgb(c1.r + (c2.r - c1.r) * tile.h, c1.g + (c2.g - c1.g) * tile.h, c1.b + (c2.b - c1.b) * tile.h);
    drawRect({ pos: vec2(px, py), width: TILE + 1, height: TILE + 1, color: col });
    drawRect({ pos: vec2(px, py + TILE * 0.68), width: TILE + 1, height: TILE * 0.32 + 1, color: rgb(col.r * 0.88, col.g * 0.86, col.b * 0.84), opacity: 0.5 });

    if (tile.biome === "water") {
      const wave = Math.sin(time() * 1.6 + tile.sparkle * 12) * 4;
      drawLine({ p1: vec2(px + 6, py + 18 + wave), p2: vec2(px + TILE - 8, py + 18 + wave), color: rgb(168, 226, 255), width: 1, opacity: 0.34 });
    }

    if (!revealed.has(tile.key)) {
      drawRect({ pos: vec2(px, py), width: TILE + 1, height: TILE + 1, color: rgb(4, 8, 12), opacity: 0.88 });
    }
  }

  for (const p of paths) {
    const key = `${p.x},${p.y}`;
    if (!revealed.has(key)) continue;
    const pPos = vec2(p.x * TILE + 2, p.y * TILE + TILE * 0.55);
    drawRect({ pos: pPos, width: TILE - 4, height: TILE * 0.33, color: rgb(167, 153, 122), opacity: 0.5, radius: 6 });
  }

  for (const p of props) {
    const pos = vec2(p.x * TILE + TILE * 0.5, p.y * TILE + TILE * 0.5);
    if (pos.x < topLeft.x || pos.x > bottomRight.x || pos.y < topLeft.y || pos.y > bottomRight.y) continue;
    if (!revealed.has(`${p.x},${p.y}`)) continue;

    if (p.kind === "pine" || p.kind === "bushy") drawTree(pos, p.kind);
    if (p.kind === "flower") {
      drawCircle({ pos: pos.add(vec2(0, 9)), radius: 4, color: rgb(130, 162, 89) });
      drawCircle({ pos: pos.add(vec2(-2, 5)), radius: 2.2, color: rgb(255, 219, 205) });
      drawCircle({ pos: pos.add(vec2(3, 5)), radius: 2.2, color: rgb(255, 239, 170) });
    }
    if (p.kind === "rock") {
      drawEllipse({ pos, width: 20, height: 11, color: rgb(120, 130, 121) });
      drawEllipse({ pos: pos.add(vec2(-3, -2)), width: 10, height: 5, color: rgb(160, 167, 151), opacity: 0.6 });
    }
    if (p.kind === "lantern") {
      drawRect({ pos: pos.add(vec2(-2, -6)), width: 4, height: 11, color: rgb(95, 70, 48) });
      drawCircle({ pos: pos.add(vec2(0, -8)), radius: 4, color: rgb(255, 208, 121), opacity: 0.9 });
      drawCircle({ pos: pos.add(vec2(0, -8)), radius: 11, color: rgb(255, 180, 105), opacity: 0.16 });
    }
  }

  for (const c of collectibles) {
    const tileKey = `${Math.floor(c.x / TILE)},${Math.floor(c.y / TILE)}`;
    if (!revealed.has(tileKey)) continue;
    const pulse = 0.75 + Math.sin(time() * 2.3 + c.pulse) * 0.25;
    if (c.kind === "mushroom") {
      drawRect({ pos: vec2(c.x - 1, c.y + 2), width: 2, height: 5, color: rgb(237, 222, 191) });
      drawEllipse({ pos: vec2(c.x, c.y), width: 13, height: 8, color: rgb(228, 101, 126) });
    }
    if (c.kind === "crystal") {
      drawTriangle({ p1: vec2(c.x - 5, c.y + 6), p2: vec2(c.x + 5, c.y + 6), p3: vec2(c.x, c.y - 6), color: rgb(120, 220, 255) });
      drawCircle({ pos: vec2(c.x, c.y), radius: 9 * pulse, color: rgb(116, 205, 255), opacity: 0.12 });
    }
    if (c.kind === "scroll") drawRect({ pos: vec2(c.x - 4, c.y - 3), width: 8, height: 10, color: rgb(245, 221, 157), radius: 3 });
    if (c.kind === "decor") {
      drawCircle({ pos: vec2(c.x, c.y), radius: 5, color: rgb(255, 194, 100) });
      drawCircle({ pos: vec2(c.x, c.y), radius: 9 * pulse, color: rgb(255, 194, 100), opacity: 0.1 });
    }
  }

  drawCircle({ pos: campfire, radius: 10, color: rgb(251, 146, 84) });
  drawTriangle({ p1: campfire.add(vec2(-8, 2)), p2: campfire.add(vec2(8, 2)), p3: campfire.add(vec2(0, -18)), color: rgb(255, 188, 102) });
  drawCircle({ pos: campfire, radius: 38 + Math.sin(time() * 4.1) * 2, color: rgb(255, 166, 102), opacity: 0.12 });

  drawRect({ pos: bonsaiSpot.add(vec2(-8, 10)), width: 16, height: 8, color: rgb(145, 94, 74), radius: 3 });
  drawRect({ pos: bonsaiSpot.add(vec2(-2, -8)), width: 4, height: 16, color: rgb(97, 74, 54) });
  const bonsaiScale = 1 + save.bonsai * 0.12;
  drawCircle({ pos: bonsaiSpot.add(vec2(0, -12)), radius: 10 * bonsaiScale, color: rgb(104, 178, 112) });
  drawCircle({ pos: bonsaiSpot.add(vec2(9, -10)), radius: 7 * bonsaiScale, color: rgb(96, 164, 102) });

  drawEllipse({ pos: pondSpot, width: 120, height: 75, color: rgb(64, 124, 164) });
  drawEllipse({ pos: pondSpot, width: 96, height: 56, color: rgb(81, 151, 188) });
  for (let i = 0; i < Math.min(22, save.pondFish); i++) {
    const angle = i * 0.9 + time() * (0.6 + (i % 3) * 0.1);
    const r = 12 + (i % 8) * 4;
    const fishPos = pondSpot.add(vec2(Math.cos(angle) * r, Math.sin(angle) * r * 0.6));
    drawCircle({ pos: fishPos, radius: 2, color: rgb(255, 232, 201), opacity: 0.75 });
  }

  drawEllipse({ pos: breathSpot, width: 72, height: 44, color: rgb(96, 115, 107) });
  drawCircle({ pos: breathSpot, radius: 18 + Math.sin(time() * 1.8) * 6, color: rgb(171, 203, 188), opacity: 0.2 });

  drawEllipse({ pos: player.pos.add(vec2(0, 14)), width: 24, height: 9, color: rgb(18, 25, 24), opacity: 0.45 });
  drawCircle({ pos: player.pos, radius: 12, color: skinColor[save.customization.skin] });
  drawRect({ pos: player.pos.add(vec2(-8, 8)), width: 16, height: 10, color: outfitColor[save.customization.outfit], radius: 4 });

  drawEllipse({ pos: pet.pos.add(vec2(0, 8)), width: 20, height: 7, color: rgb(20, 22, 21), opacity: 0.37 });
  drawCircle({ pos: pet.pos, radius: 8, color: petColor[save.pet] });

  const cycle = (Math.sin(cycleT) + 1) / 2;
  const nightOpacity = 0.28 + (1 - cycle) * 0.45;
  drawRect({ pos: cam.sub(vec2(width() / 2, height() / 2)), width: width(), height: height(), color: rgb(5, 12, 26), opacity: nightOpacity * 0.35 });

  if (weather === "mist") {
    drawRect({ pos: cam.sub(vec2(width() / 2, height() / 2)), width: width(), height: height(), color: rgb(210, 228, 216), opacity: 0.11 });
  }
  if (weather === "drizzle") {
    for (let i = 0; i < 90; i++) {
      const p = vec2(rand(0, width()), rand(0, height()));
      const base = cam.sub(vec2(width() / 2, height() / 2)).add(p);
      drawLine({ p1: base, p2: base.add(vec2(-4, 12)), color: rgb(174, 214, 228), width: 1, opacity: 0.45 });
    }
  }

  for (let i = 0; i < 26; i++) {
    const firefly = vec2((Math.sin(time() * 0.25 + i * 1.8) + 1) * width() * 0.5, (Math.cos(time() * 0.19 + i * 2.4) + 1) * height() * 0.5);
    drawCircle({ pos: cam.sub(vec2(width() / 2, height() / 2)).add(firefly), radius: 1.5, color: rgb(255, 244, 179), opacity: 0.5 });
  }
});

function collectNearby() {
  let picked = 0;
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    if (player.pos.dist(vec2(c.x, c.y)) < 23) {
      save.inventory[c.kind] += 1;
      if (c.kind === "scroll") save.journal.push("A memory scroll says: 'You don’t need to rush to bloom.'");
      collectibles.splice(i, 1);
      picked++;
    }
  }
  if (picked > 0) updateStatus(`collected ${picked} item${picked > 1 ? "s" : ""}`);
}

onUpdate(collectNearby);

applyStyle.addEventListener("click", () => {
  save.customization.skin = skinSelect.value;
  save.customization.outfit = outfitSelect.value;
  save.pet = petSelect.value;
  updateStatus("style refreshed");
  persist();
});

onKeyPress("h", () => {
  if (near(pet.pos, 70)) {
    save.affection += 1;
    add([text("♥", { size: 18 }), pos(pet.pos.x, pet.pos.y - 26), color(255, 130, 157), lifespan(0.8), move(UP, 32)]);
    updateStatus("your companion nuzzles closer");
    persist();
  }
});

onKeyPress("t", () => {
  if (near(bonsaiSpot, 85)) {
    save.bonsai = Math.min(7, save.bonsai + 1);
    updateStatus("bonsai watered and gently shaped");
    persist();
  }
});

onKeyPress("f", () => {
  if (near(pondSpot, 96)) {
    if (rand() > 0.38) {
      save.pondFish += randi(1, 3);
      updateStatus("fish caught and released into your pond");
    } else {
      updateStatus("the line slipped — breathe, then try again");
    }
    persist();
  }
});

onKeyPress("r", () => {
  if (near(breathSpot, 92)) {
    const quote = choose(["Inhale calm. Exhale pressure.", "Soft steps still move you forward.", "The forest honors slow growth."]);
    save.journal.push(`Breathing corner: ${quote}`);
    updateStatus(quote);
    persist();
  } else {
    updateStatus("find the breathing stone west of camp");
  }
});

onKeyPress("j", () => {
  const latest = save.journal.slice(-4).join("\n");
  add([rect(560, 205, { radius: 14 }), pos(26, 110), color(15, 31, 29), opacity(0.92), fixed(), lifespan(4)]);
  add([text(`Journal\n\n${latest}`, { size: 20, width: 520 }), pos(46, 130), color(224, 244, 230), fixed(), lifespan(4)]);
});

onKeyPress("e", () => {
  if (near(campfire, 84)) {
    save.customization.outfit = choose(["moss", "berry", "dusk"]);
    outfitSelect.value = save.customization.outfit;
    updateStatus(`rested at campfire · outfit ${save.customization.outfit}`);
    persist();
  }
});

setInterval(persist, 10000);
