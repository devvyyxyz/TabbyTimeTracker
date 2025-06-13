import { getDayKey } from './utils.js';

export let tabTimings = {};
export let tabHistory = {};

export function getTodayKey() { return getDayKey(Date.now()); }

export function fetchAllData() {
  return browser.runtime.sendMessage({ action: "getTabTimings" }).then(data => {
    tabTimings = data.tabTimings || {};
    tabHistory = data.tabHistory || {};
  });
}

// Export all data as JSON file
export async function exportAllData() {
  const data = await browser.runtime.sendMessage({ action: "getTabTimings" });
  const json = JSON.stringify({
    tabTimings: data.tabTimings || {},
    tabHistory: data.tabHistory || {},
  }, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tab-time-tracker-data.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

// Import all data from JSON file
export async function importAllData(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid JSON file.");
  }
  if (
    typeof parsed !== "object" || !parsed ||
    !("tabTimings" in parsed) || !("tabHistory" in parsed)
  ) {
    throw new Error("File missing keys tabTimings/tabHistory.");
  }
  return browser.runtime.sendMessage({
    action: "importTabTimings",
    tabTimings: parsed.tabTimings,
    tabHistory: parsed.tabHistory,
  });
}