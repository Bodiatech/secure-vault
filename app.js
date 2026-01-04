let MASTER_PASSWORD = null;
let autoLockTimer = null;

/* 🔓 Unlock Vault */
function unlock() {
  const mp = document.getElementById("master").value;
  if (!mp) return alert("Enter master password");
  MASTER_PASSWORD = mp;
  resetAutoLock();
  alert("Vault unlocked");
}

/* ⏱ Auto-lock after 2 minutes */
function resetAutoLock() {
  clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => {
    MASTER_PASSWORD = null;
    alert("Vault auto-locked");
  }, 2 * 60 * 1000);
}

document.addEventListener("mousemove", resetAutoLock);
document.addEventListener("keydown", resetAutoLock);

/* 🔐 Password Generator */
function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById("password").value = password;
}

/* 💾 Save Credential */
async function saveCredential() {
  if (!MASTER_PASSWORD) return alert("Unlock vault first");

  const editingId = document.getElementById("editingId").value;

  const entry = {
    id: editingId || crypto.randomUUID(),
    site: document.getElementById("site").value,
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    category: document.getElementById("category").value,
    updatedAt: new Date().toISOString()
  };

  if (!entry.site || !entry.username || !entry.password) {
    return alert("Fill all required fields");
  }

  const encryptedPayload = await encryptData(entry, MASTER_PASSWORD);
  await saveToSheet(encryptedPayload);

  document.getElementById("editingId").value = "";
  document.getElementById("msg").innerText = "✅ Saved securely";

  clearForm();
}

async function loadVault() {
  if (!MASTER_PASSWORD) return alert("Unlock vault first");

  const encryptedList = await fetchVault();
  const map = {}; // id → latest entry

  for (const item of encryptedList) {
    try {
      const data = await decryptData(item, MASTER_PASSWORD);

      if (
        !map[data.id] ||
        new Date(data.updatedAt) > new Date(map[data.id].updatedAt)
      ) {
        map[data.id] = data;
      }
    } catch {}
  }

  const container = document.getElementById("vault");
  container.innerHTML = "";

  Object.values(map).forEach(data => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.margin = "8px 0";

    div.innerHTML = `
      <b>${data.site}</b><br>
      👤 ${data.username}<br>
      📂 ${data.category}<br>
      <button onclick='editEntry(${JSON.stringify(data)})'>✏ Edit</button>
      <button onclick="copyText('${data.username}')">Copy Username</button>
      <button onclick="copyText('${data.password}')">Copy Password</button>
    `;

    container.appendChild(div);
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text);
  setTimeout(() => navigator.clipboard.writeText(""), 15000);
}
function editEntry(data) {
  document.getElementById("editingId").value = data.id;
  document.getElementById("site").value = data.site;
  document.getElementById("username").value = data.username;
  document.getElementById("password").value = data.password;
  document.getElementById("category").value = data.category;
}
function clearForm() {
  document.getElementById("site").value = "";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("category").value = "General";
}
