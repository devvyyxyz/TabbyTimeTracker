let tabTimings = {};
let activeTabId = null;
let lastActivated = null;
let lastURL = null;

function initTracking() {
  // Load timings
  browser.storage.local.get("tabTimings").then((data) => {
    if (data.tabTimings) tabTimings = data.tabTimings;
  });

  // Tab activated
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const now = Date.now();
    if (activeTabId !== null && lastActivated !== null) {
      addElapsed(lastURL, now - lastActivated);
    }
    activeTabId = activeInfo.tabId;
    lastActivated = now;
    lastURL = await getTabURL(activeTabId);
    if (!isTrackableURL(lastURL)) {
      activeTabId = null;
      lastActivated = null;
    }
  });

  // Tab URL changes
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTabId && changeInfo.url) {
      const now = Date.now();
      addElapsed(lastURL, now - lastActivated);
      lastActivated = now;
      lastURL = changeInfo.url;
      if (!isTrackableURL(lastURL)) {
        activeTabId = null;
        lastActivated = null;
      }
    }
  });

  // Window focus
  browser.windows.onFocusChanged.addListener((windowId) => {
    const now = Date.now();
    if (activeTabId !== null && lastActivated !== null) {
      if (windowId === browser.windows.WINDOW_ID_NONE) {
        addElapsed(lastURL, now - lastActivated);
        lastActivated = null;
      } else {
        lastActivated = now;
      }
    }
  });

  // Idle state
  browser.idle.onStateChanged.addListener((newState) => {
    const now = Date.now();
    if (activeTabId !== null && lastActivated !== null) {
      if (newState !== "active") {
        addElapsed(lastURL, now - lastActivated);
        lastActivated = null;
      } else {
        lastActivated = now;
      }
    }
  });

  // Startup: reload timings/history
  browser.runtime.onStartup.addListener(() => {
    browser.storage.local.get(["tabTimings", "tabHistory"]).then((data) => {
      if (data.tabTimings) tabTimings = data.tabTimings;
      if (data.tabHistory) tabHistory = data.tabHistory;
    });
  });

  // Commands (shortcuts)
  browser.commands.onCommand.addListener((command) => {
    if (command === "clear-all") {
      tabTimings = {};
      saveTabTimings();
      tabHistory = {};
      saveTabHistory();
    }
  });
}

function saveTabTimings() {
  browser.storage.local.set({ tabTimings });
}

async function getTabURL(tabId) {
  try {
    let tab = await browser.tabs.get(tabId);
    return tab.url;
  } catch (e) {
    return null;
  }
}

// Core: add elapsed ms to tabTimings and tabHistory
function addElapsed(url, elapsed) {
  if (!isTrackableURL(url) || elapsed <= 0) return;
  tabTimings[url] = (tabTimings[url] || 0) + elapsed;
  // Per-day
  const dayKey = getDayKey(Date.now());
  if (!tabHistory[dayKey]) tabHistory[dayKey] = {};
  tabHistory[dayKey][url] = (tabHistory[dayKey][url] || 0) + elapsed;
  saveTabTimings();
  saveTabHistory();
}