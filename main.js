// ===============================
// HAVENHAND: IDLE KINGDOM REBORN
// MAIN GAME LOGIC (MVP BUILD)
// ===============================

// ===== RESOURCE STATE =====
let resources = {
    wood: 0,
    hope: 0
};

// Storage capacity
let cap = 100;

// Unlocked tiles counter
let unlockedTiles = 0;


// ===============================
// TAP ACTIONS
// ===============================

// Tap to gather wood
function tapWood() {
    if (resources.wood < cap) {
        resources.wood++;
    }
    updateUI();
}


// ===============================
// TILE UNLOCKING
// ===============================

function unlockTile() {
    if (resources.hope >= 5) {
        resources.hope -= 5;
        unlockedTiles++;
        updateUI();
    } else {
        alert("Not enough Hope!");
    }
}


// ===============================
// HOPE GENERATION
// ===============================

// Gain 1 Hope whenever wood storage is full (check every 5 seconds)
setInterval(() => {
    if (resources.wood >= cap) {
        resources.hope += 1;
        updateUI();
    }
}, 5000);


// Daily Prayer mechanic
let prayerCooldown = false;

function prayForHope() {
    if (prayerCooldown) return;

    resources.hope += 1;
    updateUI();

    prayerCooldown = true;

    // Reset cooldown after 60 seconds
    setTimeout(() => {
        prayerCooldown = false;
    }, 60000);
}


// ===============================
// UI UPDATE
// ===============================

function updateUI() {
    document.getElementById("woodCount").innerText = `${resources.wood}/${cap}`;
    document.getElementById("hopeCount").innerText = resources.hope;
    document.getElementById("tileCount").innerText = unlockedTiles;
}


// ===============================
// BUTTON HOOKS
// ===============================

document.getElementById("tapWoodBtn").onclick = tapWood;
document.getElementById("unlockTileBtn").onclick = unlockTile;
document.getElementById("prayerBtn").onclick = prayForHope;


// Initial UI draw
updateUI();
