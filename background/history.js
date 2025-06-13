let tabHistory = {};

function getDayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function initHistory() {
  browser.storage.local.get("tabHistory").then(data => {
    tabHistory = data.tabHistory || {};
  });
}

function saveTabHistory() {
  browser.storage.local.set({ tabHistory });
}