(function autoSaveFromExtension() {
  const params = new URLSearchParams(window.location.search);
  const auto = params.get("autosave");
  if (!auto) return;

  const data = JSON.parse(auto);

  window.addEventListener("load", () => {
    alert("Unlock vault to save login");

    document.getElementById("site").value = data.site;
    document.getElementById("username").value = data.username;
    document.getElementById("password").value = data.password;
    document.getElementById("category").value = "Auto-Saved";

    // User unlocks → clicks Save manually (security)
  });
})();

/* =========================
   GLOBAL STATE
========================= */

let MASTER = null;
let entryBeingEdited = null;

/* =========================
   UNLOCK VAULT
========================= */

function unlock() {
  const mp = document.getElementById("master").value;
  if (!mp) {
    alert("Enter master password");
    return;
  }
  MASTER = mp;
  alert("Vault unlocked");
}

/* =========================
   PASSWORD GENERATOR
========================= */

function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  document.getElementById("password").value = pass;
}

/* =========================
   SAVE / UPDATE CREDENTIAL
========================= */

async function saveCredential() {
  if (!MASTER) {
    alert("Unlock vault first");
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    site: document.getElementById("site").value,
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    category: document.getElementById("category").value,
    deleted: false,
    updatedAt: new Date().toISOString()
  };

  if (!entry.site || !entry.username || !entry.password) {
    alert("Fill all required fields");
    return;
  }

  // If editing, mark old entry as deleted
  if (entryBeingEdited) {
    entryBeingEdited.deleted = true;
    entryBeingEdited.updatedAt = new Date().toISOString();

    const oldEncrypted = await encryptData(entryBeingEdited, MASTER);
    await saveToSheet(oldEncrypted);

    entryBeingEdited = null;
  }

  const encrypted = await encryptData(entry, MASTER);
  await saveToSheet(encrypted);

  document.getElementById("site").value = "";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";

  alert("Saved securely");
}

/* =========================
   LOAD VAULT
========================= */

async function loadVault() {
  if (!MASTER) {
    alert("Unlock vault first");
    return;
  }

  document.getElementById("loading").style.display = "block";

  const encryptedList = await fetchVault();
  const vault = document.getElementById("vault");
  vault.innerHTML = "";

  for (const item of encryptedList) {
    try {
      const data = await decryptData(item, MASTER);
      if (data.deleted) continue;

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <div class="site">${data.site}</div>
        <div class="meta">👤 ${data.username} • 📂 ${data.category}</div>

        <div id="pwd-${data.id}" class="password">••••••••</div>

        <div class="actions">
          <button onclick="togglePassword('${data.id}', '${data.password}')">👁 Show</button>
          <button onclick="copyText('${data.password}')">Copy</button>
          <button onclick='editEntry(${JSON.stringify(data)})'>✏ Edit</button>
          <button onclick='deleteEntry(${JSON.stringify(data)})'>🗑 Delete</button>
        </div>
      `;

      vault.appendChild(div);
    } catch (e) {
      console.warn("Failed to decrypt one entry");
    }
  }

  document.getElementById("loading").style.display = "none";
}

/* =========================
   SHOW / HIDE PASSWORD
========================= */

function togglePassword(id, password) {
  const el = document.getElementById("pwd-" + id);
  if (!el) return;

  if (el.innerText.startsWith("•")) {
    el.innerText = password;
  } else {
    el.innerText = "••••••••";
  }
}

/* =========================
   COPY TO CLIPBOARD
========================= */

function copyText(text) {
  navigator.clipboard.writeText(text);
  setTimeout(() => navigator.clipboard.writeText(""), 15000);
}

/* =========================
   EDIT ENTRY
========================= */

function editEntry(entry) {
  document.getElementById("site").value = entry.site;
  document.getElementById("username").value = entry.username;
  document.getElementById("password").value = entry.password;
  document.getElementById("category").value = entry.category;

  entryBeingEdited = entry;
}

/* =========================
   DELETE ENTRY (SOFT DELETE)
========================= */

async function deleteEntry(entry) {
  if (!confirm("Delete this entry?")) return;

  entry.deleted = true;
  entry.updatedAt = new Date().toISOString();

  const encrypted = await encryptData(entry, MASTER);
  await saveToSheet(encrypted);

  loadVault();
}
