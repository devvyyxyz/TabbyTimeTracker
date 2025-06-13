// Tab Time Tracker Background Script

// In-memory storage (will be synced to storage.local)
let tabTimings = {};
let tabHistory = {};
let ignoreList = [];

// Helper to get today's key for history
function getDayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}
function getTodayKey() { return getDayKey(Date.now()); }

// Load data from storage.local at startup
async function loadData() {
  const data = await browser.storage.local.get(["tabTimings", "tabHistory", "ignoreList"]);
  tabTimings = data.tabTimings || {};
  tabHistory = data.tabHistory || {};
  ignoreList = data.ignoreList || [];
}
loadData();

// Save all data to storage.local
function saveData() {
  browser.storage.local.set({
    tabTimings: tabTimings,
    tabHistory: tabHistory,
    ignoreList: ignoreList,
  });
}

// --- Tab tracking logic ---

let currentTabId = null;
let currentTabUrl = null;
let lastSwitchTime = Date.now();

function isIgnored(url) {
  if (!url) return true;
  if (!/^https?:\/\//.test(url)) return true;
  return ignoreList.some(pattern => {
    try {
      if (pattern.startsWith("/") && pattern.endsWith("/")) {
        // Regex pattern
        const regex = new RegExp(pattern.slice(1, -1));
        return regex.test(url);
      } else {
        // Simple substring match
        return url.includes(pattern);
      }
    } catch {
      return false;
    }
  });
}

// Call this when the active tab changes or is updated
async function trackTab(tabId, url) {
  const now = Date.now();

  // Save previous tab's time
  if (currentTabId !== null && currentTabUrl && !isIgnored(currentTabUrl)) {
    const elapsed = now - lastSwitchTime;
    if (elapsed > 0 && elapsed < 1000 * 60 * 60 * 8) { // Ignore absurd long times
      // Add to all-time
      tabTimings[currentTabUrl] = (tabTimings[currentTabUrl] || 0) + elapsed;
      // Add to today
      const todayKey = getTodayKey();
      if (!tabHistory[todayKey]) tabHistory[todayKey] = {};
      tabHistory[todayKey][currentTabUrl] = (tabHistory[todayKey][currentTabUrl] || 0) + elapsed;
      saveData();
    }
  }

  currentTabId = tabId;
  currentTabUrl = url;
  lastSwitchTime = now;
}

// Show onboarding/welcome page on install or update
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    browser.tabs.create({ url: browser.runtime.getURL("welcome.html") });
  }
});

// Listen for tab activation
browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (!tab.incognito) {
      trackTab(tab.id, tab.url);
    }
  } catch (e) {}
});

// Listen for tab updates (url changes)
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url && !tab.incognito) {
    trackTab(tabId, changeInfo.url);
  }
});

// Listen for window focus changes
browser.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    // All windows blurred
    trackTab(null, null);
  } else {
    try {
      const [tab] = await browser.tabs.query({ active: true, windowId });
      if (tab && !tab.incognito) {
        trackTab(tab.id, tab.url);
      }
    } catch (e) {}
  }
});

// On browser startup, reset currentTabId
browser.runtime.onStartup.addListener(() => {
  currentTabId = null;
  currentTabUrl = null;
  lastSwitchTime = Date.now();
  loadData();
});

// On browser shutdown, save the current state
browser.runtime.onSuspend && browser.runtime.onSuspend.addListener(() => {
  saveData();
});

// --- Messaging for popup/options ---

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === "getTabTimings") {
    await loadData();
    return {
      tabTimings,
      tabHistory
    };
  }
  if (msg.action === "clearTimings") {
    tabTimings = {};
    tabHistory = {};
    saveData();
    return { ok: true };
  }
  if (msg.action === "clearSingleUrl") {
    const url = msg.url;
    if (tabTimings[url]) delete tabTimings[url];
    for (const day in tabHistory) {
      if (tabHistory[day][url]) delete tabHistory[day][url];
    }
    saveData();
    return { ok: true };
  }
  if (msg.action === "importTabTimings") {
    if (msg.tabTimings && msg.tabHistory) {
      tabTimings = msg.tabTimings;
      tabHistory = msg.tabHistory;
      saveData();
      return { ok: true };
    }
    return { ok: false, error: "Missing keys" };
  }
  if (msg.action === "getIgnoreList") {
    return { ignoreList };
  }
  if (msg.action === "setIgnoreList") {
    ignoreList = msg.ignoreList || [];
    saveData();
    return { ok: true };
  }
});

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === "getTabTimings") {
    await loadData();
    return {
      tabTimings,
      tabHistory
    };
  }
  if (msg.action === "clearTimings") {
    tabTimings = {};
    tabHistory = {};
    saveData();
    return { ok: true };
  }
  if (msg.action === "clearSingleUrl") {
    const url = msg.url;
    if (tabTimings[url]) delete tabTimings[url];
    for (const day in tabHistory) {
      if (tabHistory[day][url]) delete tabHistory[day][url];
    }
    saveData();
    return { ok: true };
  }
  if (msg.action === "importTabTimings") {
    if (msg.tabTimings && msg.tabHistory) {
      tabTimings = msg.tabTimings;
      tabHistory = msg.tabHistory;
      saveData();
      return { ok: true };
    }
    return { ok: false, error: "Missing keys" };
  }
  if (msg.action === "getIgnoreList") {
    return { ignoreList };
  }
  if (msg.action === "setIgnoreList") {
    ignoreList = msg.ignoreList || [];
    saveData();
    return { ok: true };
  }
});

browser.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !("retentionDays" in changes)) return;
  const { newValue: retentionDays } = changes.retentionDays;
  if (!retentionDays) return;
  await loadData();
  const now = Date.now();
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  for (const dayKey of Object.keys(tabHistory)) {
    const dt = new Date(dayKey);
    if (isNaN(dt)) continue;
    if (dt.getTime() < cutoff) delete tabHistory[dayKey];
  }
  saveData();
});

// ====== TIME LIMITS & NOTIFICATIONS ======
let siteLimits = {}; // { domain: minutes }
let notifiedToday = {}; // { domain: true } to avoid spamming

async function loadLimits() {
  const obj = await browser.storage.local.get("siteLimits");
  siteLimits = obj.siteLimits || {};
}
loadLimits();
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.siteLimits) {
    siteLimits = changes.siteLimits.newValue || {};
  }
});

// Each time time is tracked, check limits
async function checkLimits(url, dayKey) {
  if (!url) return;
  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  if (!siteLimits[domain]) return;
  // Get today's usage for this domain
  await loadData();
  const today = tabHistory[dayKey] || {};
  let total = 0;
  for (const [u, secs] of Object.entries(today)) {
    if ((new URL(u).hostname) === domain) total += secs;
  }
  if (total >= siteLimits[domain]*60 && !notifiedToday[domain]) {
    // Notify user
    browser.notifications && browser.notifications.create("tab-limit-" + domain, {
      "type": "basic",
      "iconUrl": browser.runtime.getURL("icon-128.png"),
      "title": "Time Limit Reached",
      "message": `You've spent ${Math.round(total/60)} minutes on ${domain} today (limit: ${siteLimits[domain]} min).`
    });
    notifiedToday[domain] = true;
  }
}

// Reset notifications at midnight
function resetNotifiedAtMidnight() {
  const now = new Date();
  const msTillMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 0, 0) - now;
  setTimeout(() => {
    notifiedToday = {};
    resetNotifiedAtMidnight();
  }, msTillMidnight + 1000);
}
resetNotifiedAtMidnight();

// Call checkLimits in your tab tracking function, after updating tabHistory:
async function trackTab(tabId, url) {
  const now = Date.now();
  if (currentTabId !== null && currentTabUrl && !isIgnored(currentTabUrl)) {
    const elapsed = now - lastSwitchTime;
    if (elapsed > 0 && elapsed < 1000 * 60 * 60 * 8) {
      tabTimings[currentTabUrl] = (tabTimings[currentTabUrl] || 0) + elapsed;
      const todayKey = getTodayKey();
      if (!tabHistory[todayKey]) tabHistory[todayKey] = {};
      tabHistory[todayKey][currentTabUrl] = (tabHistory[todayKey][currentTabUrl] || 0) + elapsed;
      saveData();
      // ---- Add this! ----
      await checkLimits(currentTabUrl, todayKey);
    }
  }
  currentTabId = tabId;
  currentTabUrl = url;
  lastSwitchTime = now;
}