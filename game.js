/* Havenhand MVP - game.js
   Option C: fully-loaded MVP (mobile-first)
   - 4x4 grid
   - autosave + manual save
   - workers, shop, barn, hut, hope
   - guided tutorial (multi-step)
   - emoji icons (no image assets)
*/

/* -------------------------
   State (default / loadable)
   ------------------------- */
const SAVE_KEY = "havenhand_save_v1";

let state = {
  wood: 0,
  cap: 100,
  hope: 0,
  hutLv: 1,
  shopLv: 0,
  barnLv: 1,
  workers: 0,
  tilesUnlocked: 1,      // start with 1 tile unlocked
  unlockedState: [],     // will fill on init
  prayerCooldownUntil: 0,
  tutorialStep: 0,
  createdAt: Date.now()
};

/* -------------------------
   Utility helpers
   ------------------------- */
function el(id){ return document.getElementById(id); }
function now(){ return Date.now(); }

/* -------------------------
   Save / Load
   ------------------------- */
function saveGame() {
  try {
    state.lastSave = now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    toast("Saved ✔️");
  } catch (e) {
    console.error("Save failed", e);
    toast("Save failed");
  }
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    // simple validation
    if(parsed && typeof parsed.wood === "number") {
      state = Object.assign(state, parsed);
      initTiles(); // rebuild UI tiles array
      updateUI();
      toast("Loaded ✔️");
      return true;
    }
  } catch(e) {
    console.error("Load error", e);
  }
  return false;
}

/* -------------------------
   Toast (tiny messages)
   ------------------------- */
let toastTimer = 0;
function toast(msg){
  // small ephemeral notification in console and via alert-free DOM
  console.log("TOAST:",msg);
  // keep it minimal — we won't render a fancy toast element for MVP
}

/* -------------------------
   UI Update
   ------------------------- */
function updateUI(){
  el("woodCount").textContent = Math.floor(state.wood);
  el("capCount").textContent = Math.floor(state.cap);
  el("hopeCount").textContent = Math.floor(state.hope);
  el("hutLv").textContent = state.hutLv;
  el("shopLv").textContent = state.shopLv;
  el("barnLv").textContent = state.barnLv;
  el("workerCount").textContent = state.workers;
  // tile grid refresh (simple)
  renderTiles();
  // update costs
  el("hutCost").textContent = calcHutCost();
  el("barnCost").textContent = calcBarnCost();
}

/* -------------------------
   Costs & formulas
   ------------------------- */
function calcHutCost(){
  return 10 + Math.floor((state.hutLv-1) * 8);
}
function calcBarnCost(){
  return 20 * state.barnLv;
}

/* -------------------------
   Core actions
   ------------------------- */
function tapHut(){
  if(state.wood < state.cap){
    const gain = 1 * state.hutLv; // each hut level increases tap power
    state.wood += gain;
    if(state.wood > state.cap) state.wood = state.cap;
    updateUI();
  } else {
    // full storage -> might generate hope via passive check
  }
}

function upgradeHut(){
  const cost = calcHutCost();
  if(state.wood >= cost){
    state.wood -= cost;
    state.hutLv += 1;
    updateUI();
    toast("Hut upgraded!");
  } else toast("Not enough wood");
}

function buildShop(){
  if(state.shopLv === 0){
    if(state.wood >= 30){
      state.wood -=30;
      state.shopLv = 1;
      updateUI();
      toast("Woodshop built!");
    } else toast("Need 30 wood to build Woodshop");
  } else {
    toast("Woodshop already built");
  }
}

function upgradeBarn(){
  const cost = calcBarnCost();
  if(state.wood >= cost){
    state.wood -= cost;
    state.barnLv += 1;
    state.cap += 100; // each barn upgrade increases cap
    updateUI();
    toast("Barn upgraded, capacity +100");
  } else toast("Not enough wood");
}

/* -------------------------
   Workers
   ------------------------- */
function hireWorker(){
  if(state.wood >= 20){
    state.wood -= 20;
    state.workers += 1;
    updateUI();
    toast("Worker hired!");
  } else toast("Need 20 wood to hire");
}

/* Passive worker production (every 3s, each worker produces wood) */
setInterval(() => {
  if(state.workers > 0 && state.wood < state.cap){
    const production = state.workers * 1; // 1 wood per worker per tick
    state.wood += production;
    if(state.wood > state.cap) state.wood = state.cap;
    updateUI();
  }
}, 3000);

/* -------------------------
   Hope generation & prayer
   ------------------------- */
/* If wood is full, grant 1 hope every 5 seconds (passive) */
setInterval(() => {
  if(state.wood >= state.cap){
    state.hope += 1;
    updateUI();
  }
}, 5000);

function prayForHope(){
  const nowTs = now();
  if(nowTs < (state.prayerCooldownUntil || 0)){
    const remaining = Math.ceil((state.prayerCooldownUntil - nowTs)/1000);
    toast(`Prayer cooldown: ${remaining}s`);
    return;
  }
  state.hope += 1;
  state.prayerCooldownUntil = nowTs + 60000; // 60s cooldown
  updateUI();
  toast("You prayed and gained Hope");
}

/* -------------------------
   Tile system (4x4 grid)
   ------------------------- */
const GRID_SIZE = 4; // 4x4 grid

function initTiles(){
  // ensure unlockedState array length equals GRID_SIZE^2
  const total = GRID_SIZE * GRID_SIZE;
  if(!Array.isArray(state.unlockedState) || state.unlockedState.length !== total){
    state.unlockedState = new Array(total).fill(false);
    // default unlock first N tiles
    for(let i=0;i<state.tilesUnlocked && i<total;i++){
      state.unlockedState[i] = true;
    }
  } else {
    // if tilesUnlocked value changed, ensure leading tiles set true
    let unlockedCount = state.tilesUnlocked || 1;
    for(let i=0;i<total;i++){
      state.unlockedState[i] = i < unlockedCount;
    }
  }
}

function renderTiles(){
  const grid = el("mapGrid");
  grid.innerHTML = "";
  const total = GRID_SIZE*GRID_SIZE;
  for(let i=0;i<total;i++){
    const d = document.createElement("div");
    d.className = "tile " + (state.unlockedState[i] ? "" : "locked");
    if(state.unlockedState[i]){
      d.textContent = `Tile ${i+1}`;
    } else {
      d.textContent = "Locked";
    }
    grid.appendChild(d);
  }
}

function unlockTile(){
  if(state.hope < 5){
    toast("Need 5 Hope to unlock a tile");
    return;
  }
  // find first locked tile
  const idx = state.unlockedState.indexOf(false);
  if(idx === -1){
    toast("All tiles unlocked");
    return;
  }
  state.hope -= 5;
  state.unlockedState[idx] = true;
  state.tilesUnlocked += 1;
  updateUI();
  toast("Tile unlocked!");
}

/* -------------------------
   Tutorial (multi-step)
   ------------------------- */
const tutorialSteps = [
  "Welcome to Havenhand. Your small outpost needs care and attention. Tap the Hut to gather wood.",
  "Great! Use wood to build and upgrade. Try upgrading your Hut once you have enough wood.",
  "Pray to gain Hope (once every 60s). Hope unlocks new tiles and blessings.",
  "Hire workers to automate wood gathering. Unlock tiles to expand your village. Good luck!"
];

function startTutorial(){
  state.tutorialStep = 0;
  showTutorialStep();
}

function showTutorialStep(){
  const overlay = el("tutorialOverlay");
  const text = el("tutorialText");
  overlay.classList.remove("hidden");
  text.textContent = tutorialSteps[state.tutorialStep] || "Tutorial complete!";
  // change next button text on last step
  el("tutorialNextBtn").textContent = (state.tutorialStep < tutorialSteps.length-1) ? "Next" : "Finish";
}

function advanceTutorial(){
  state.tutorialStep++;
  if(state.tutorialStep >= tutorialSteps.length){
    el("tutorialOverlay").classList.add("hidden");
    toast("Tutorial complete");
    saveGame();
    return;
  }
  showTutorialStep();
}

/* -------------------------
   Autosave interval
   ------------------------- */
setInterval(() => {
  saveGame();
}, 10000); // every 10 seconds

/* -------------------------
   Initial setup & button wiring
   ------------------------- */
window.addEventListener("load", () => {
  // init tiles and UI
  initTiles();
  // try load automatically if present
  loadGame();
  updateUI();

  // buttons
  el("tapBtn").addEventListener("click", () => { tapHut(); updateUI(); });
  el("upgradeHutBtn").addEventListener("click", upgradeHut);
  el("buildShopBtn").addEventListener("click", buildShop);
  el("upgradeBarnBtn").addEventListener("click", upgradeBarn);
  el("hireWorkerBtn").addEventListener("click", hireWorker);

  el("prayerBtn").addEventListener("click", () => { prayForHope(); updateUI(); });
  el("unlockTileBtn").addEventListener("click", unlockTile);

  el("saveBtn").addEventListener("click", saveGame);
  el("loadBtn").addEventListener("click", () => { loadGame(); updateUI(); });

  // tutorial
  el("tutorialNextBtn").addEventListener("click", () => {
    advanceTutorial();
  });

  // start tutorial on first run only
  if(!localStorage.getItem(SAVE_KEY)){
    startTutorial();
  } else {
    // if player has state and tutorial not finished, show step
    if(state.tutorialStep > -1 && state.tutorialStep < tutorialSteps.length){
      // prompt to continue tutorial? we auto-continue in this MVP
      // showTutorialStep();
    }
  }
});
