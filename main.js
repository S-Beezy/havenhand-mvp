// ===== BASE STATE =====
let resources = {
  wood: 0,
  hope: 0
};

let levels = {
  hut: 1,
  shop: 0,
  barn: 1
};

let costs = {
  hutUpgrade: 10,
  shopBuild: 30,
  barnUpgrade: 20
};

let cap = 100;



// ===== UI UPDATE =====
function updateUI() {
  document.getElementById("wood").textContent = resources.wood;
  document.getElementById("cap").textContent = cap;
  document.getElementById("hope").textContent = resources.hope;

  document.getElementById("hutLv").textContent = levels.hut;
  document.getElementById("shopLv").textContent = levels.shop;
  document.getElementById("barnLv").textContent = levels.barn;

  document.getElementById("hutCost").textContent = costs.hutUpgrade;
  document.getElementById("barnCost").textContent = costs.barnUpgrade;
}



// ===== TAP HUT FOR WOOD =====
function tapHut() {
  if (resources.wood < cap) {
    resources.wood += 1;
    updateUI();
  }
}



// ===== UPGRADE HUT =====
function upgradeHut() {
  if (resources.wood >= costs.hutUpgrade) {
    resources.wood -= costs.hutUpgrade;
    levels.hut += 1;
    costs.hutUpgrade = Math.floor(costs.hutUpgrade * 1.5);
    updateUI();
  }
}



// ===== BUILD WOODSHOP =====
function buildShop() {
  if (levels.shop === 0 && resources.wood >= costs.shopBuild) {
    resources.wood -= costs.shopBuild;
    levels.shop = 1;
    updateUI();
  }
}



// ===== UPGRADE BARN (INCREASE CAP) =====
function upgradeBarn() {
  if (resources.wood >= costs.barnUpgrade) {
    resources.wood -= costs.barnUpgrade;
    levels.barn += 1;
    cap += 50;
    costs.barnUpgrade = Math.floor(costs.barnUpgrade * 2);
    updateUI();
  }
}



// ===== PASSIVE WOOD FROM SHOP WORKER =====
setInterval(() => {
  if (levels.shop > 0 && resources.wood < cap) {
    resources.wood += 1;
    updateUI();
  }
}, 2000);



// ===== MAP TILE UNLOCK (Costs Hope) =====
function unlockTile() {
  if (resources.hope >= 5) {
    resources.hope -= 5;

    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.textContent = "New Tile";

    document.getElementById("mapGrid").appendChild(tile);
    updateUI();
  }
}



// ===== INITIALIZE BUTTONS =====
window.onload = () => {
  document.getElementById("tapBtn").onclick = tapHut;
  document.getElementById("upgradeHut").onclick = upgradeHut;
  document.getElementById("buildShop").onclick = buildShop;
  document.getElementById("upgradeBarn").onclick = upgradeBarn;
  document.getElementById("unlockTile").onclick = unlockTile;

  updateUI();
};
