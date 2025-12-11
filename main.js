// ====== Base Game State ======
let resources = {
    wood: 0,
    hope: 0,
};

let limits = {
    wood: 100
};

// ====== Utility: Update Resource Display ======
function updateUI() {
    document.getElementById("woodDisplay").textContent = `wood ${resources.wood}/${limits.wood}`;
    document.getElementById("hopeDisplay").textContent = `hope ${resources.hope}`;
}

// ====== Tap Hut: Gain Wood ======
function tapHut() {
    if (resources.wood < limits.wood) {
        resources.wood += 1;
        updateUI();
    }
}

// ====== Connect Buttons After Page Loads ======
window.onload = () => {
    document.getElementById("tapHutBtn").onclick = tapHut;
    updateUI(); // show initial values
};
