let userSettings = { darkMode: true, ignoreDomains: [] };

function initSettings() {
  browser.storage.local.get(['darkMode', 'ignoreDomains']).then(data => {
    if ('darkMode' in data) userSettings.darkMode = !!data.darkMode;
    if (Array.isArray(data.ignoreDomains)) userSettings.ignoreDomains = data.ignoreDomains;
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if ('darkMode' in changes) userSettings.darkMode = !!changes.darkMode.newValue;
      if ('ignoreDomains' in changes) userSettings.ignoreDomains = changes.ignoreDomains.newValue || [];
    }
  });
}

// Utility
function isTrackableURL(url) {
  if (!url) return false;
  if (
    url.startsWith('about:blank') ||
    url.startsWith('about:newtab') ||
    url.startsWith('about:home') ||
    url.startsWith('moz-extension:') ||
    url === ''
  ) return false;
  try {
    const host = new URL(url).hostname;
    if (userSettings.ignoreDomains.some(domain =>
      host === domain ||
      host.endsWith('.' + domain)
    )) return false;
  } catch (_) {}
  return true;
}