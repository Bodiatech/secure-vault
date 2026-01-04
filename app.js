let MASTER = null;
let entryBeingEdited = null;
let VAULT_CACHE = [];

/* ---------- Unlock ---------- */
function unlock() {
  const mp = document.getElementById("master").value;
  if (!mp) return alert("Enter master password");
  MASTER = mp;
  alert("Vault unlocked");
}

/* ---------- Password Generator ---------- */
function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  document.getElementById("password").value = pass;
}

/* ---------- Save / Edit ---------- */
async function saveCredential() {
  if (!MASTER) return alert("Unlock vault first");

  const entry = {
    id: crypto.randomUUID(),
    site: document.getElementById("site").value.trim(),
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    category: document.getElementById("category").value,
    deleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!entry.site || !entry.username || !entry.password)
    return alert("Site, username and password required");

  if (entryBeingEdited) {
    entryBeingEdited.deleted = true;
    const oldEncrypted = await encryptData(entryBeingEdited, MASTER);
    await saveToSheet(oldEncrypted);
    entry.createdAt = entryBeingEdited.createdAt;
    entryBeingEdited = null;
  }

  const encrypted = await encryptData(entry, MASTER);
  await saveToSheet(encrypted);

  ["site", "username", "password"].forEach(
    id => (document.getElementById(id).value = "")
  );

  alert("Saved securely");
}

/* ---------- Load Vault ---------- */
async function loadVault() {
  if (!MASTER) return alert("Unlock vault first");

  document.getElementById("loading").style.display = "block";
  VAULT_CACHE = [];

  const encryptedList = await fetchVault();
  for (const item of encryptedList) {
    try {
      const data = await decryptData(item, MASTER);
      if (!data.deleted) VAULT_CACHE.push(data);
    } catch {}
  }

  renderVault(VAULT_CACHE);
  document.getElementById("loading").style.display = "none";
}

/* ---------- Render ---------- */
function renderVault(list) {
  const vault = document.getElementById("vault");
  vault.innerHTML = "";

  for (const data of list) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="site">${data.site}</div>
      <div class="meta">
        👤 ${data.username} • 📂 ${data.category}<br>
        🗓 ${new Date(data.createdAt).toLocaleDateString()}
      </div>

      <div id="pwd-${data.id}" class="password">••••••••</div>

      <div class="actions">
        <button onclick="togglePassword('${data.id}', '${data.password}')">👁 Show</button>
        <button onclick="copyText('${data.password}')">Copy</button>
        <button onclick='editEntry(${JSON.stringify(data)})'>✏ Edit</button>
        <button onclick='deleteEntry(${JSON.stringify(data)})'>🗑 Delete</button>
      </div>
    `;
    vault.appendChild(div);
  }
}

/* ---------- Search ---------- */
function searchVault() {
  const q = document.getElementById("searchBox").value.toLowerCase().trim();
  if (!q) return renderVault(VAULT_CACHE);

  renderVault(
    VAULT_CACHE.filter(v =>
      v.site.toLowerCase().includes(q) ||
      v.username.toLowerCase().includes(q) ||
      v.password.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q)
    )
  );
}

/* ---------- Helpers ---------- */
function togglePassword(id, password) {
  const el = document.getElementById("pwd-" + id);
  el.innerText = el.innerText.startsWith("•") ? password : "••••••••";
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}

function editEntry(entry) {
  document.getElementById("site").value = entry.site;
  document.getElementById("username").value = entry.username;
  document.getElementById("password").value = entry.password;
  document.getElementById("category").value = entry.category;
  entryBeingEdited = entry;
}

async function deleteEntry(entry) {
  if (!confirm("Delete this entry?")) return;
  entry.deleted = true;
  const encrypted = await encryptData(entry, MASTER);
  await saveToSheet(encrypted);
  loadVault();
}

/* ---------- CSV Import (Date Aware) ---------- */
async function importCSV() {
  if (!MASTER) return alert("Unlock vault first");

  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("Select CSV file");

  const reader = new FileReader();
  reader.onload = async e => {
    const rows = e.target.result.split("\n").slice(1);
    let count = 0;

    for (const row of rows) {
      if (!row.trim()) continue;
      const [site, username, password, note, rawDate] = row.split(",");

      if (!site || !username || !password) continue;

      const entry = {
        id: crypto.randomUUID(),
        site: site.trim(),
        username: username.trim(),
        password: password.trim(),
        category: "Imported",
        deleted: false,
        createdAt: parseImportedDate(rawDate),
        updatedAt: new Date().toISOString()
      };

      const encrypted = await encryptData(entry, MASTER);
      await saveToSheet(encrypted);
      count++;
    }

    alert(`Imported ${count} entries`);
    loadVault();
  };
  reader.readAsText(file);
}

function parseImportedDate(raw) {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}
