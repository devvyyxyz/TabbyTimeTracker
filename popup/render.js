import { fetchAllData, tabTimings, tabHistory, getTodayKey } from './storage.js';
import { renderPieChart } from './pie.js';
import { renderStatsSummary } from './stats.js';
import { renderSettings } from './settings.js';

let currentTab = "all";
let currentPastKey = null;
let refreshInterval = null;
let selectedSite = null;
let selectedScope = {
  tab: "all",
  dayKey: null
};
let selectedSiteTable = null;

function handleSiteRowClick(domain, tableEl) {
  if (selectedSiteTable && selectedSiteTable.classList) {
    selectedSiteTable.classList.remove('selected');
  }
  selectedSite = domain;
  selectedScope = {
    tab: currentTab,
    dayKey: currentTab === "past" ? currentPastKey : null
  };
  selectedSiteTable = tableEl;
  tableEl.classList.add('selected');

  const qa = document.getElementById('quick-actions');
  if (qa) {
    qa.style.display = '';
    setupQuickActionsForDomain(domain);
  }
}

let setupQuickActionsForDomain = () => {};
export function setQuickActionDomainHandler(fn) {
  setupQuickActionsForDomain = fn;
}

export function setActiveTab(tab) {
  document.querySelectorAll(".tab").forEach(el => el.classList.remove("selected"));
  tab.classList.add("selected");
  currentTab = tab.dataset.tab;
  if (currentTab !== "past") currentPastKey = null;

  if (
    !selectedScope ||
    selectedScope.tab !== currentTab ||
    (currentTab === "past" && selectedScope.dayKey !== currentPastKey)
  ) {
    selectedSite = null;
    if (selectedSiteTable && selectedSiteTable.classList) selectedSiteTable.classList.remove('selected');
    selectedSiteTable = null;
  }
  render(currentTab, currentPastKey);
}

export async function render(selectedTab = currentTab, pastDayKey = currentPastKey) {
  await fetchAllData();

  const content = document.getElementById("tab-content");
  content.innerHTML = "";

  if (selectedTab === "settings") {
    renderSettings(content);
    return;
  }
  if (selectedTab === "past") {
    renderPastDays(content, pastDayKey);
    return;
  }

  const left = document.createElement("div");
  left.className = "pie-summary-wrap";
  const right = document.createElement("div");
  right.className = "table-container";

  let data, label;
  if (selectedTab === "all") {
    data = tabTimings; label = "All Time";
  } else if (selectedTab === "today") {
    data = tabHistory[getTodayKey()] || {}; label = "Today";
  }

  renderPieChart(data, left, label);
  renderStatsSummary(data, label, left);
  renderSelectableTable(data, label, right, selectedTab, pastDayKey);

  content.appendChild(left);
  content.appendChild(right);
}

function renderPastDays(parent, selectedKey = null) {
  const dayKeys = Object.keys(tabHistory).filter(k => k !== getTodayKey()).sort().reverse();
  if (!dayKeys.length) {
    const div = document.createElement("div");
    div.className = "empty";
    div.innerHTML = `<span class="emoji">🕒</span>No data for past days.`;
    parent.appendChild(div);
    return;
  }
  let dayKey = selectedKey || dayKeys[0];
  currentPastKey = dayKey;

  parent.innerHTML = '';
  const left = document.createElement("div");
  left.className = "pie-summary-wrap";
  const right = document.createElement("div");
  right.className = "table-container";

  const selectDiv = document.createElement("div");
  selectDiv.style.margin = "7px 0";
  selectDiv.innerHTML = `Day: 
    <select id="pastDaysSelector">
      ${dayKeys.map(k => `<option value="${k}"${k===dayKey?" selected":""}>${k}</option>`).join("")}
    </select>`;
  left.appendChild(selectDiv);

  renderPieChart(tabHistory[dayKey] || {}, left, dayKey);
  renderStatsSummary(tabHistory[dayKey] || {}, dayKey, left);
  renderSelectableTable(tabHistory[dayKey] || {}, dayKey, right, "past", dayKey);

  parent.appendChild(left);
  parent.appendChild(right);

  selectDiv.querySelector("#pastDaysSelector").addEventListener("change", function () {
    currentPastKey = this.value;
    render("past", this.value);
  });
}

function summarizeDomainInfo(data, allHistory) {
  const domainInfo = new Map();

  for (const [url, secs] of Object.entries(data)) {
    if (typeof secs !== "number" || secs <= 0) continue;
    let domain = "";
    try { domain = new URL(url).hostname; } catch { domain = url; }
    if (!domainInfo.has(domain)) {
      domainInfo.set(domain, { secs: 0, sessionCount: 0, first: null, last: null });
    }
    const info = domainInfo.get(domain);
    info.secs += secs;
    info.sessionCount += 1;
  }

  for (const [date, dayData] of Object.entries(allHistory)) {
    for (const url of Object.keys(dayData)) {
      let domain = "";
      try { domain = new URL(url).hostname; } catch { domain = url; }
      if (!domainInfo.has(domain)) continue;
      const info = domainInfo.get(domain);
      if (!info.first || date < info.first) info.first = date;
      if (!info.last || date > info.last) info.last = date;
    }
  }

  return domainInfo;
}

function renderSelectableTable(data, label, parent, tabScope = currentTab, dayKey = currentPastKey) {
  let allHistory = {};
  try {
    allHistory = JSON.parse(localStorage.getItem("tabHistory") || "{}");
  } catch {}
  if (!Object.keys(allHistory).length && typeof tabHistory === "object") allHistory = tabHistory;

  const domainInfo = summarizeDomainInfo(data, allHistory);

  const totalSecs = Array.from(domainInfo.values()).reduce((a, b) => a + b.secs, 0);

  const rows = Array.from(domainInfo.entries()).sort((a, b) => b[1].secs - a[1].secs);

  if (!rows.length) {
    const div = document.createElement("div");
    div.className = "empty";
    div.innerHTML = `
      <span class="emoji">🕒</span>
      No browsing data tracked yet.<br>
      Start browsing to see your stats!
    `;
    parent.appendChild(div);
    return;
  }

  const table = document.createElement("table");
  let extraHeaders = "";
  if (tabScope === "all") {
    extraHeaders = "<th>Sessions</th><th>First visit</th><th>Last visit</th><th>Avg/day</th>";
  } else {
    extraHeaders = "<th>Sessions</th><th>% of total</th>";
  }
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr>
    <th>Site</th>
    <th>Time</th>
    ${extraHeaders}
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  rows.forEach(([domain, info]) => {
    const tr = document.createElement("tr");
    tr.className = "site-row";
    tr.tabIndex = 0;
    tr.setAttribute("data-domain", domain);

    const faviconUrl = "https://icons.duckduckgo.com/ip3/" + domain + ".ico";
    const faviconImg = `<img src="${faviconUrl}" alt="" class="favicon" onerror="this.style.display='none'">`;

    let extraCells = "";
    if (tabScope === "all") {
      const uniqueDays = Object.keys(allHistory).length || 1;
      const avgPerDay = formatSeconds(Math.round(info.secs / uniqueDays));
      extraCells = `<td>${info.sessionCount}</td>
        <td>${info.first || "-"}</td>
        <td>${info.last || "-"}</td>
        <td>${avgPerDay}</td>`;
    } else {
      const percent = totalSecs ? ((info.secs / totalSecs) * 100).toFixed(1) : "0.0";
      extraCells = `<td>${info.sessionCount}</td><td>${percent}%</td>`;
    }

    tr.innerHTML = `<td>${faviconImg}${domain}</td>
      <td>${formatSeconds(info.secs)}</td>
      ${extraCells}`;

    tr.onclick = () => handleSiteRowClick(domain, tr);
    tr.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        handleSiteRowClick(domain, tr);
        e.preventDefault();
      }
    };

    if (
      selectedSite &&
      selectedScope &&
      selectedSite === domain &&
      selectedScope.tab === tabScope &&
      (tabScope !== "past" || selectedScope.dayKey === dayKey)
    ) {
      tr.classList.add("selected");
      selectedSiteTable = tr;
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  parent.innerHTML = '';
  parent.appendChild(table);

  if (
    selectedSite &&
    selectedScope &&
    selectedScope.tab === tabScope &&
    (tabScope !== "past" || selectedScope.dayKey === dayKey) &&
    !rows.some(([domain]) => domain === selectedSite)
  ) {
    selectedSite = null;
    selectedSiteTable = null;
  }
}

function formatSeconds(secs) {
  if (!secs) return "--";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

export function getSelectedDomain() {
  return selectedSite;
}

export function startRealtimeUpdates() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    render(currentTab, currentPastKey);
  }, 1000);
}
export function stopRealtimeUpdates() {
  if (refreshInterval) clearInterval(refreshInterval);
}