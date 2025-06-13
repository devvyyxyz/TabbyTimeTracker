import { render, setActiveTab, startRealtimeUpdates, stopRealtimeUpdates, getSelectedDomain, setQuickActionDomainHandler } from './render.js';

// Tab switching logic
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", function() {
    if (tab.dataset.tab === "settings") {
      // Open the extension's preferences (options) page
      if (browser.runtime.openOptionsPage) {
        browser.runtime.openOptionsPage();
      } else if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        // Fallback: Open about:addons manage page (Firefox)
        if (browser.tabs) browser.tabs.create({ url: "about:addons" });
      }
      return;
    }
    setActiveTab(this);
  });
});

render("all");
startRealtimeUpdates();

window.addEventListener('unload', () => {
  stopRealtimeUpdates();
});

function showQuickActions(domain) {
  const qa = document.getElementById("quick-actions");
  if (!qa) return;
  qa.style.display = !!domain ? "" : "none";
}

// This function will be called from render.js with the selected domain from the table
function setupQuickActionsForDomain(domain) {
  showQuickActions(domain);

  // Ignore this site
  document.getElementById("ignoreThisSiteBtn").onclick = async () => {
    if (!domain) return;
    let { ignoreList } = await browser.runtime.sendMessage({ action: "getIgnoreList" });
    ignoreList = ignoreList || [];
    if (!ignoreList.includes(domain)) ignoreList.push(domain);
    await browser.runtime.sendMessage({ action: "setIgnoreList", ignoreList });
    alert("Domain added to ignore list: " + domain);
  };

  // Add daily limit
  document.getElementById("addLimitThisSiteBtn").onclick = async () => {
    if (!domain) return;
    let min = prompt("Set daily limit (minutes) for " + domain + ":", "30");
    min = parseInt(min, 10);
    if (isNaN(min) || min < 1) return;
    const siteLimits = (await browser.storage.local.get("siteLimits")).siteLimits || {};
    siteLimits[domain] = min;
    await browser.storage.local.set({ siteLimits });
    alert(`Set daily limit for ${domain}: ${min} min`);
  };
}

// Wire up the quick actions handler for table selection
setQuickActionDomainHandler(setupQuickActionsForDomain);

// On initial popup open, show quick actions for current tab if nothing is selected
async function setupQuickActions() {
  // If nothing is selected in the table, fallback to active tab domain
  let domain = getSelectedDomain();
  if (!domain) {
    // fallback: use active tab domain
    try {
      let [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      domain = new URL(tab.url).hostname;
    } catch { domain = ""; }
  }
  showQuickActions(domain);

  // Setup quick actions for the domain (this will set up the correct handlers)
  setupQuickActionsForDomain(domain);
}

// Show quick actions for first (default) tab, and whenever popup is opened
setupQuickActions();