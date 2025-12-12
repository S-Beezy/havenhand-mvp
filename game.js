/* game.js — Havenhand (Rebalanced Option B)
   - prayer = 60 minute cooldown
   - building upgrades take real time (tiers)
   - blessings currency (daily + milestone)
   - slower passive production
   - autosave + manual save
*/

const SAVE_KEY = "havenhand_save_v2";
const NOW = () => Date.now();

let state = {
  wood: 0,
  cap: 100,
  hope: 0,
  hutLv: 1,
  shopLv: 0,
  barnLv: 1,
  workers: 0,
  tilesUnlocked: 1,
  unlockedState: [],
  // upgrade queue: {id, building, fromLv, toLv, completesAt}
  pendingUpgrades: [],
  blessings: 0,
  lastDailyBlessingAt: 0,
  prayerAvailableAt: 0, // timestamp when next prayer allowed
  tutorialStep: 0,
  createdAt: NOW(),
  lastSave: 0
};

/* ---------- UTILS ---------- */
const el = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ---------- SAVE / LOAD ---------- */
function saveGame() {
  try {
    state.lastSave = NOW();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    // small console feedback
    console.log("Saved at", new Date(state.lastSave).toLocaleTimeString());
  } catch (e) {
    console.error("Save error", e);
  }
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.wood === "number") {
      // merge carefully so functions still exist
      state = Object.assign(state, parsed);
      initTiles();
      resumePendingUpgrades();
      checkDailyBlessing();
      updateUI();
      console.log("Loaded save.");
      return true;
    }
  } catch (e) {
    console.error("Load failed", e);
  }
  return false;
}

/* ---------- INITIALIZATION & TILES ---------- */
const GRID_SIZE = 4;
function initTiles() {
  const total = GRID_SIZE * GRID_SIZE;
  if (!Array.isArray(state.unlockedState) || state.unlockedState.length !== total) {
    state.unlockedState = new Array(total).fill(false);
  }
  // ensure first N tiles unlocked
  for (let i=0; i<total; i++) {
    state.unlockedState[i] = i < state.tilesUnlocked;
  }
}

/* ---------- UI UPDATES ---------- */
function updateUI() {
  el("woodCount").textContent = Math.floor(state.wood);
  el("capCount").textContent = Math.floor(state.cap);
  el("hopeCount").textContent = Math.floor(state.hope);
  el("hutLv").textContent = state.hutLv;
  el("shopLv").textContent = state.shopLv;
  el("barnLv").textContent = state.barnLv;
  el("workerCount").textContent = state.workers;
  el("blessingCount").textContent = state.blessings;

  renderTiles();
  renderPendingUpgrades();
  // update prayer button label with cooldown
  updatePrayerLabel();
  // update costs
  el("hutCost").textContent = calcHutCost();
  el("barnCost").textContent = calcBarnCost();
}

/* ---------- RENDER TILES ---------- */
function renderTiles() {
  const grid = el("mapGrid");
  grid.innerHTML = "";
  const total = GRID_SIZE * GRID_SIZE;
  for (let i=0;i<total;i++){
    const tile = document.createElement("div");
    tile.className = "tile " + (state.unlockedState[i] ? "" : "locked");
    tile.textContent = state.unlockedState[i] ? `Tile ${i+1}` : "Locked";
    grid.appendChild(tile);
  }
}

/* ---------- PENDING UPGRADES UI ---------- */
function renderPendingUpgrades(){
  const box = el("pendingUpgradesBox");
  const list = el("pendingUpgradesList");
  list.innerHTML = "";
  if (state.pendingUpgrades.length === 0) {
    box.style.display = "none";
    return;
  }
  box.style.display = "block";
  state.pendingUpgrades.forEach(u => {
    const div = document.createElement("div");
    const remaining = Math.max(0, Math.floor((u.completesAt - NOW())/1000));
    div.textContent = `${u.building} → Lv ${u.toLv} (in ${remaining}s)`;
    list.appendChild(div);
  });
}

/* ---------- COST FORMULAS ---------- */
function calcHutCost(){ return 10 + Math.floor((state.hutLv-1) * 12); }
function calcBarnCost(){ return 20 * state.barnLv; }

/* ---------- UPGRADE DURATIONS (seconds) ---------- */
/* level changes map to durations so higher tiers take much longer */
function upgradeDurationSeconds(targetLevel){
  // mapping by target level (approx)
  if (targetLevel <= 2) return 5;         // fast early
  if (targetLevel <= 3) return 30;        // small wait
  if (targetLevel <= 4) return 300;       // 5 minutes
  if (targetLevel <= 5) return 1800;      // 30 minutes
  return 7200;                            // 2 hours for higher tiers
}

/* ---------- CORE ACTIONS ---------- */
function tapHut(){
  if (state.wood < state.cap) {
    const gain = 1 * state.hutLv; // scaling tap
    state.wood += gain;
    if (state.wood > state.cap) state.wood = state.cap;
    updateUI();
  }
}

/* begin timed upgrade */
function queueUpgrade(building){
  // building: 'hut' or 'barn' and for shop we 'build' rather than upgrade
  if (building === "hut") {
    const cost = calcHutCost();
    if (state.wood < cost) return alert("Not enough wood");
    state.wood -= cost;
    const toLv = state.hutLv + 1;
    const secs = upgradeDurationSeconds(toLv);
    state.pendingUpgrades.push({
      id: "u"+(NOW()),
      building: "Hut",
      key: "hutLv",
      fromLv: state.hutLv,
      toLv: toLv,
      completesAt: NOW() + secs*1000
    });
    updateUI();
    toast("Hut upgrade started");
  } else if (building === "barn") {
    const cost = calcBarnCost();
    if (state.wood < cost) return alert("Not enough wood");
    state.wood -= cost;
    const toLv = state.barnLv + 1;
    const secs = upgradeDurationSeconds(toLv);
    state.pendingUpgrades.push({
      id: "u"+(NOW()),
      building: "Barn",
      key: "barnLv",
      fromLv: state.barnLv,
      toLv: toLv,
      completesAt: NOW() + secs*1000
    });
    updateUI();
    toast("Barn upgrade started");
  }
}

/* immediate build for woodshop (first build gives blessing) */
function buildShop(){
  if (state.shopLv > 0) return toast("Woodshop already exists");
  if (state.wood < 30) return toast("Need 30 wood");
  state.wood -= 30;
  state.shopLv = 1;
  // milestone: grant a single blessing for building the shop (slow reward)
  state.blessings += 1;
  toast("Woodshop built — Blessing granted!");
  updateUI();
}

/* ---------- COMPLETE PENDING UPGRADES (called frequently) ---------- */
function completePendingUpgrades(){
  const now = NOW();
  let changed = false;
  for (let i = state.pendingUpgrades.length - 1; i >= 0; i--) {
    const u = state.pendingUpgrades[i];
    if (now >= u.completesAt) {
      // apply upgrade
      if (u.key === "hutLv") state.hutLv = u.toLv;
      if (u.key === "barnLv") {
        state.barnLv = u.toLv;
        state.cap += 100; // each barn level adds capacity
      }
      state.pendingUpgrades.splice(i,1);
      changed = true;
    }
  }
  if (changed) updateUI();
}

/* ---------- WORKER SYSTEM (slower production) ---------- */
function hireWorker(){
  if (state.wood < 20) return toast("Need 20 wood to hire");
  state.wood -= 20;
  state.workers += 1;
  updateUI();
  toast("Worker hired");
}

/* passive production tick (every 4s) */
setInterval(() => {
  if (state.workers > 0 && state.wood < state.cap) {
    // each worker yields 0.8 wood per tick (rebalanced)
    const prod = state.workers * 0.8;
    state.wood += prod;
    if (state.wood > state.cap) state.wood = state.cap;
    updateUI();
  }
}, 4000);

/* ---------- HOPE & PRAYER (60 min cooldown) ---------- */
function prayForHope(){
  const now = NOW();
  if (now < (state.prayerAvailableAt || 0)) {
    const secs = Math.ceil((state.prayerAvailableAt - now)/1000);
    return toast(`Prayer on cooldown: ${secs}s`);
  }
  // deep prayer: +1 hope, 60 min cooldown
  state.hope += 1;
  state.prayerAvailableAt = now + 60*60*1000; // 60 minutes
  updateUI();
  toast("You prayed and gained Hope");
}

/* show prayer cooldown text */
function updatePrayerLabel(){
  const btn = el("prayerBtn");
  const now = NOW();
  if (now >= (state.prayerAvailableAt || 0)) {
    btn.textContent = "🙏 Pray (Deep) — Ready";
  } else {
    const left = Math.ceil((state.prayerAvailableAt - now)/1000);
    // show mm:ss
    const mm = Math.floor(left/60);
    const ss = left % 60;
    btn.textContent = `🙏 Pray — ${mm}:${String(ss).padStart(2,'0')}`;
  }
}

/* passive hope when wood full: grant 1 hope every 5s (keeps but slower) */
setInterval(() => {
  if (state.wood >= state.cap) {
    state.hope += 1;
    updateUI();
  }
}, 5000);

/* ---------- TILE UNLOCK (needs Hope + Wood now) ---------- */
function unlockTile(){
  if (state.hope < 5) return toast("Need 5 Hope");
  if (state.wood < 200) return toast("Need 200 Wood to expand");
  // find locked
  const idx = state.unlockedState.indexOf(false);
  if (idx === -1) return toast("All tiles unlocked");
  state.hope -= 5;
  state.wood -= 200;
  state.unlockedState[idx] = true;
  state.tilesUnlocked += 1;
  updateUI();
  toast("Territory expanded!");
}

/* ---------- BLESSINGS: daily + milestone ---------- */
function checkDailyBlessing(){
  const last = state.lastDailyBlessingAt || 0;
  const now = NOW();
  // if more than 24 hours passed since lastDailyBlessingAt, grant one
  if (now - last >= 24*60*60*1000) {
    state.blessings += 1;
    state.lastDailyBlessingAt = now;
    toast("Daily Blessing awarded");
    updateUI();
  }
}

/* Use a blessing to instantly finish the oldest pending upgrade */
function speedUpWithBlessing(){
  if (state.blessings <= 0) return toast("No Blessings available");
  if (state.pendingUpgrades.length === 0) return toast("No upgrade to speed up");
  // finish the earliest upgrade
  state.blessings -= 1;
  const u = state.pendingUpgrades.shift();
  if (u.key === "hutLv") state.hutLv = u.toLv;
  if (u.key === "barnLv") {
    state.barnLv = u.toLv;
    state.cap += 100;
  }
  toast("Upgrade finished using Blessing");
  updateUI();
}

/* ---------- PENDING UPGRADE RESUMPTION (after load) ---------- */
function resumePendingUpgrades(){
  // during load we keep pendingUpgrades; this function just cleans completed ones
  completePendingUpgrades();
}

/* ---------- TUTORIAL (unchanged short steps) ---------- */
const tutorialSteps = [
  "Welcome to Havenhand. Tap the Hut to gather wood.",
  "Great! Queue an upgrade to see timed progress. You can speed upgrades with Blessings.",
  "Pray to gain Hope (deep prayer — 60 minute cooldown). Hope unlocks new tiles.",
  "Hire workers to automate wood gathering. Good luck!"
];

function startTutorial(){
  state.tutorialStep = 0;
  showTutorialStep();
}

function showTutorialStep(){
  const overlay = el("tutorialOverlay");
  const text = el("tutorialText");
  overlay.classList.remove("hidden");
  text.textContent = tutorialSteps[state.tutorialStep] || "Tutorial done!";
  el("tutorialNextBtn").textContent = (state.tutorialStep < tutorialSteps.length-1) ? "Next" : "Finish";
}

function advanceTutorial(){
  state.tutorialStep++;
  if (state.tutorialStep >= tutorialSteps.length){
    el("tutorialOverlay").classList.add("hidden");
    toast("Tutorial completed");
    saveGame();
    return;
  }
  showTutorialStep();
}

/* ---------- AUTOSAVE ---------- */
setInterval(saveGame, 10000);

/* ---------- PENDING UPGRADE CHECK ---------- */
setInterval(completePendingUpgrades, 1000);

/* ---------- DAILY BLESSING CHECK ---------- */
setInterval(checkDailyBlessing, 60*1000); // once a minute check for daily blessing eligibility

/* ---------- BUTTON HOOKS & INIT ---------- */
window.addEventListener("load", () => {
  initTiles();
  loadGame();
  updateUI();

  el("tapBtn").addEventListener("click", () => { tapHut(); updateUI(); });
  el("upgradeHutBtn").addEventListener("click", () => queueUpgrade("hut"));
  el("buildShopBtn").addEventListener("click", buildShop);
  el("upgradeBarnBtn").addEventListener("click", () => queueUpgrade("barn"));
  el("hireWorkerBtn").addEventListener("click", () => { hireWorker(); updateUI(); });
  el("prayerBtn").addEventListener("click", () => { prayForHope(); updateUI(); });
  el("unlockTileBtn").addEventListener("click", () => { unlockTile(); updateUI(); });

  el("saveBtn").addEventListener("click", saveGame);
  el("loadBtn").addEventListener("click", () => { loadGame(); updateUI(); });

  el("speedUpBtn").addEventListener("click", () => { speedUpWithBlessing(); });

  el("tutorialNextBtn").addEventListener("click", () => { advanceTutorial(); });

  // start tutorial for new players
  if(!localStorage.getItem(SAVE_KEY)){
    startTutorial();
    saveGame();
  }
});
