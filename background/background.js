// Firefox Tab Time Tracker background script
// Tracks active tab time and saves data to browser cache (local storage)

// Helper: Decide which URLs to ignore (null pages, internal, etc)
function isTrackableURL(url) {
  if (!url) return false;
  if (
    url.startsWith('about:blank') ||
    url.startsWith('about:newtab') ||
    url.startsWith('about:home') ||
    url.startsWith('moz-extension:') ||
    url === ''
  ) return false;
  return true;
}

// Load tab timings from cache (browser storage)
let tabTimings = {};
browser.storage.local.get("tabTimings").then((data) => {
  if (data.tabTimings) {
    tabTimings = data.tabTimings;
  }
});

// State tracking
let activeTabId = null;
let lastActivated = null;
let lastURL = null;

// Save tab timings to browser cache
function saveTabTimings() {
  browser.storage.local.set({ tabTimings });
}

// Get a tab's URL safely
async function getTabURL(tabId) {
  try {
    let tab = await browser.tabs.get(tabId);
    return tab.url;
  } catch (e) {
    return null;
  }
}

// Add elapsed time to a URL
function addElapsed(url, elapsed) {
  if (!isTrackableURL(url) || elapsed <= 0) return;
  tabTimings[url] = (tabTimings[url] || 0) + elapsed;
  saveTabTimings();
}

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

// URL changes in current tab
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

// Window focus change (pause/resume tracking)
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

// Handle idle state (pause/resume tracking)
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

// On extension startup: reload state from cache
browser.runtime.onStartup.addListener(() => {
  browser.storage.local.get("tabTimings").then((data) => {
    if (data.tabTimings) {
      tabTimings = data.tabTimings;
    }
  });
});

// Respond to popup requests for timings, clear all, and clear single url
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getTabTimings") {
    let result = {};
    for (const [url, ms] of Object.entries(tabTimings)) {
      if (isTrackableURL(url)) result[url] = ms;
    }
    if (activeTabId !== null && lastActivated !== null && isTrackableURL(lastURL)) {
      result[lastURL] = (result[lastURL] || 0) + (Date.now() - lastActivated);
    }
    sendResponse({ tabTimings: result });
  } else if (msg.action === "clearTimings") {
    tabTimings = {};
    saveTabTimings();
    sendResponse({ success: true });
  } else if (msg.action === "clearSingleUrl" && typeof msg.url === "string") {
    delete tabTimings[msg.url];
    saveTabTimings();
    sendResponse({ success: true });
  }
  return true;
});