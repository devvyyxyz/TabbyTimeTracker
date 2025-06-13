function initMessaging() {
    browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "getTabTimings") {
        let result = {};
        for (const [url, ms] of Object.entries(tabTimings)) {
          if (isTrackableURL(url)) result[url] = ms;
        }
        if (activeTabId !== null && lastActivated !== null && isTrackableURL(lastURL)) {
          result[lastURL] = (result[lastURL] || 0) + (Date.now() - lastActivated);
        }
        sendResponse({ tabTimings: result, tabHistory });
      } else if (msg.action === "clearTimings") {
        tabTimings = {};
        tabHistory = {};
        saveTabTimings();
        saveTabHistory();
        sendResponse({ success: true });
      } else if (msg.action === "clearSingleUrl" && typeof msg.url === "string") {
        delete tabTimings[msg.url];
        for (const k in tabHistory) {
          if (tabHistory[k] && tabHistory[k][msg.url]) {
            delete tabHistory[k][msg.url];
          }
        }
        saveTabTimings();
        saveTabHistory();
        sendResponse({ success: true });
      }
      return true;
    });
  }