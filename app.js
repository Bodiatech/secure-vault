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

  const entry = {
    site: document.getElementById("site").value,
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    category: document.getElementById("category").value,
    createdAt: new Date().toISOString()
  };

  if (!entry.site || !entry.username || !entry.password) {
    return alert("Fill all required fields");
  }

  const encryptedPayload = await encryptData(entry, MASTER_PASSWORD);
  await saveToSheet(encryptedPayload);

  document.getElementById("msg").innerText = "✅ Saved securely";

  document.getElementById("site").value = "";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}
