const SHEET_API =
  "https://script.google.com/macros/s/AKfycbzYDZt0k1Jf85q1hOGRU6dG7Q-lEITOnbZhUi77CJGJvrtgdi3NHjpl-hspjkv1xH0/exec";

async function saveToSheet(payload) {
  await fetch(SHEET_API, {
    method: "POST",
    body: JSON.stringify({ payload })
  });
}

async function fetchVault() {
  const res = await fetch(SHEET_API);
  return res.json();
}
