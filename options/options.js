// --- Toast Helper ---
function showToast(msg, type = "info", duration = 2200) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.style.background = type === "error" ? "#b23" : "#222";
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, duration);
}

// --- Helper: Date and Range ---
function getTodayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function getNDaysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function getDateRangeArray(start, end) {
  const result = [];
  let d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    const iso = d.toISOString().slice(0, 10);
    result.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return result;
}

// --- Helpers to communicate with background for data ---
async function getAllData() {
  return browser.runtime.sendMessage({ action: "getTabTimings" });
}
async function setAllData(tabTimings, tabHistory) {
  return browser.runtime.sendMessage({
    action: "importTabTimings",
    tabTimings,
    tabHistory,
  });
}
async function clearAllData() {
  return browser.runtime.sendMessage({ action: "clearTimings" });
}
async function getRetentionDays() {
  const obj = await browser.storage.local.get("retentionDays");
  return obj.retentionDays || "";
}
async function setRetentionDays(days) {
  await browser.storage.local.set({ retentionDays: days });
}
async function getIgnoreList() {
  return (await browser.runtime.sendMessage({ action: "getIgnoreList" })).ignoreList || [];
}
async function setIgnoreList(ignoreList) {
  return browser.runtime.sendMessage({ action: "setIgnoreList", ignoreList });
}
async function resetSettingsToDefaults() {
  await setRetentionDays(90);
  await setIgnoreList([]);
  await setLimits({});
}
async function getLimits() {
  const obj = await browser.storage.local.get("siteLimits");
  return obj.siteLimits || {};
}
async function setLimits(limits) {
  await browser.storage.local.set({ siteLimits: limits });
}

// --- Formatting ---
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
function formatSeconds(secs) {
  if (!secs) return "--";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// --- Chart Drawing ---
function drawBarChart(days, dayTotals) {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Chart area
  const chartW = canvas.width - 60;
  const chartH = canvas.height - 40;
  const chartX = 40;
  const chartY = 10;

  // Axis
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartX, chartY);
  ctx.lineTo(chartX, chartY + chartH);
  ctx.lineTo(chartX + chartW, chartY + chartH);
  ctx.stroke();

  // Find max value
  const maxVal = Math.max(...dayTotals, 60) || 60;
  const barW = days.length > 0 ? chartW / days.length * 0.6 : chartW;
  const gap = days.length > 0 ? chartW / days.length * 0.4 : 0;

  // Bars
  for (let i = 0; i < days.length; ++i) {
    const x = chartX + i * (barW + gap) + gap / 2;
    const barH = (dayTotals[i] / maxVal) * (chartH - 8);
    ctx.fillStyle = "#60aaff";
    ctx.fillRect(x, chartY + chartH - barH, barW, barH);
    ctx.fillStyle = "#222";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(days[i].slice(5), x + barW / 2, chartY + chartH + 12);
    if (dayTotals[i] > 0) {
      ctx.fillStyle = "#273c6a";
      ctx.font = "11px sans-serif";
      ctx.fillText(Math.round(dayTotals[i] / 60) + "m", x + barW / 2, chartY + chartH - barH - 6);
    }
  }
  ctx.fillStyle = "#666";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("minutes", chartX + chartW, chartY + chartH + 24);
}

function drawSiteTrendChart(days, values, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const chartW = canvas.width - 60;
  const chartH = canvas.height - 40;
  const chartX = 40;
  const chartY = 10;

  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartX, chartY);
  ctx.lineTo(chartX, chartY + chartH);
  ctx.lineTo(chartX + chartW, chartY + chartH);
  ctx.stroke();

  const maxVal = Math.max(...values, 60) || 60;
  const ptW = days.length > 1 ? chartW / (days.length - 1) : chartW;
  ctx.strokeStyle = "#47a4f5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < days.length; ++i) {
    const x = chartX + i * ptW;
    const y = chartY + chartH - (values[i] / maxVal) * (chartH - 8);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#3066b5";
  for (let i = 0; i < days.length; ++i) {
    const x = chartX + i * ptW;
    const y = chartY + chartH - (values[i] / maxVal) * (chartH - 8);
    ctx.beginPath();
    ctx.arc(x, y, 3.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#444";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i < days.length; ++i) {
    const x = chartX + i * ptW;
    ctx.fillText(days[i].slice(5), x, chartY + chartH + 15);
  }
  ctx.fillStyle = "#666";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("seconds", chartX + chartW, chartY + chartH + 24);
}

// --- Top sites state (pagination, search, range) ---
let statsRange = { start: null, end: null };
let topSitesCurrentPage = 1;
let topSitesPerPage = 10;
let topSitesSorted = [];
let topSitesSearchTerm = "";
let firstLoad = true;

// --- Render top sites table (with pagination & search) ---
function renderTopSitesTable(sorted, page = 1, perPage = topSitesPerPage, searchTerm = "", days = [], tabHistory = {}) {
  const tbody = document.getElementById("stats-table")?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let filtered = sorted;
  if (searchTerm && searchTerm.trim().length > 0) {
    filtered = sorted.filter(([url]) => getDomain(url).toLowerCase().includes(searchTerm.toLowerCase()));
  }
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  page = Math.max(1, Math.min(page, totalPages));
  const start = (page - 1) * perPage;
  const end = Math.min(page * perPage, filtered.length);

  for (let i = start; i < end; ++i) {
    const [url, secs] = filtered[i];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="url" tabindex="0" role="button" data-domain="${getDomain(url)}">${getDomain(url)}</td><td>${formatSeconds(Math.round(secs))}</td>`;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".url").forEach(cell => {
    cell.onclick = () => openSiteTrendModal(cell.dataset.domain);
    cell.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") openSiteTrendModal(cell.dataset.domain); };
  });

  // Pagination controls
  const pagDiv = document.getElementById("top-sites-pagination");
  if (pagDiv) {
    if (filtered.length > perPage) {
      pagDiv.innerHTML = `
        <button id="prevTopSitesPage" ${page === 1 ? "disabled" : ""}>&lt;</button>
        <span>Page ${page} of ${totalPages}</span>
        <button id="nextTopSitesPage" ${page === totalPages ? "disabled" : ""}>&gt;</button>
        <select id="topSitesPerPage">
          ${[5, 10, 20, 50].map(v => `<option value="${v}"${v === perPage ? " selected" : ""}>${v}/page</option>`).join("")}
        </select>
      `;
      document.getElementById("prevTopSitesPage").onclick = () => {
        topSitesCurrentPage = Math.max(1, topSitesCurrentPage - 1);
        renderTopSitesTable(topSitesSorted, topSitesCurrentPage, topSitesPerPage, topSitesSearchTerm, days, tabHistory);
      };
      document.getElementById("nextTopSitesPage").onclick = () => {
        topSitesCurrentPage = Math.min(totalPages, topSitesCurrentPage + 1);
        renderTopSitesTable(topSitesSorted, topSitesCurrentPage, topSitesPerPage, topSitesSearchTerm, days, tabHistory);
      };
      document.getElementById("topSitesPerPage").onchange = (e) => {
        topSitesPerPage = parseInt(e.target.value, 10);
        topSitesCurrentPage = 1;
        renderTopSitesTable(topSitesSorted, topSitesCurrentPage, topSitesPerPage, topSitesSearchTerm, days, tabHistory);
      };
    } else {
      pagDiv.innerHTML = `
        <span>Page ${page} of ${totalPages}</span>
        <select id="topSitesPerPage">
          ${[5, 10, 20, 50].map(v => `<option value="${v}"${v === perPage ? " selected" : ""}>${v}/page</option>`).join("")}
        </select>
      `;
      document.getElementById("topSitesPerPage").onchange = (e) => {
        topSitesPerPage = parseInt(e.target.value, 10);
        topSitesCurrentPage = 1;
        renderTopSitesTable(topSitesSorted, topSitesCurrentPage, topSitesPerPage, topSitesSearchTerm, days, tabHistory);
      };
    }
    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="2" style="text-align:center;color:#888;">No results</td>`;
      tbody.appendChild(tr);
    }
  }
}

// --- Export filtered table data as CSV ---
function exportFilteredTableAsCSV() {
  let filtered = topSitesSorted;
  if (topSitesSearchTerm && topSitesSearchTerm.trim().length > 0) {
    filtered = topSitesSorted.filter(([url]) =>
      getDomain(url).toLowerCase().includes(topSitesSearchTerm.toLowerCase())
    );
  }
  const start = (topSitesCurrentPage - 1) * topSitesPerPage;
  const end = Math.min(topSitesCurrentPage * topSitesPerPage, filtered.length);
  const visibleRows = filtered.slice(start, end);

  let csv = "Domain,Time (seconds)\n";
  for (const [url, secs] of visibleRows) {
    csv += `"${getDomain(url)}",${Math.round(secs)}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tab-time-tracker-table.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

// --- Chart & top sites section render, now supports custom range ---
async function renderTrendChartAndTopSites() {
  const loadingDiv = document.getElementById("trendChartLoading");
  if (firstLoad && loadingDiv) loadingDiv.style.display = "";

  const tbody = document.getElementById("stats-table")?.querySelector("tbody");
  if (firstLoad && tbody) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#888;">Loading...</td></tr>`;
  }

  const { tabHistory } = await getAllData();

  // Custom range support
  let days;
  if (statsRange.start && statsRange.end) {
    days = getDateRangeArray(statsRange.start, statsRange.end);
  } else {
    // fallback: last 7 days
    days = [];
    for (let i = 6; i >= 0; --i) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      days.push(key);
    }
  }

  // Per-day totals
  const dayTotals = days.map(day =>
    tabHistory[day]
      ? Object.values(tabHistory[day]).reduce((a, b) => a + b, 0)
      : 0
  );

  drawBarChart(days, dayTotals);

  if (firstLoad && loadingDiv) loadingDiv.style.display = "none";
  firstLoad = false;

  // Aggregate top sites for range
  const urlTotals = {};
  for (const day of days) {
    const sites = tabHistory[day] || {};
    for (const [url, secs] of Object.entries(sites)) {
      urlTotals[url] = (urlTotals[url] || 0) + secs;
    }
  }
  topSitesSorted = Object.entries(urlTotals)
    .sort((a, b) => b[1] - a[1]);
  if (!topSitesSearchTerm) topSitesCurrentPage = 1;
  renderTopSitesTable(topSitesSorted, topSitesCurrentPage, topSitesPerPage, topSitesSearchTerm, days, tabHistory);
}

// --- Per-site modal trend ---
function openSiteTrendModal(domain) {
  const modal = document.getElementById("modal-bg");
  const chart = document.getElementById("siteTrendChart");
  const domainLabel = document.getElementById("modalDomain");
  domainLabel.textContent = domain;
  modal.classList.add("show");
  getAllData().then(({ tabHistory }) => {
    const days = getDateRangeArray(statsRange.start, statsRange.end);
    const perDay = days.map(day =>
      tabHistory[day]?.[domain] ? tabHistory[day][domain] : 0
    );
    drawSiteTrendChart(days, perDay, chart);
  });
}
document.getElementById("modalCloseBtn").onclick = () => {
  document.getElementById("modal-bg").classList.remove("show");
};
document.getElementById("modal-bg").onclick = (e) => {
  if (e.target === document.getElementById("modal-bg")) document.getElementById("modal-bg").classList.remove("show");
};

// ========== AUTO-REFRESH SETUP ==========
let autoRefreshInterval = null;
function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(renderTrendChartAndTopSites, 5000);
}
function stopAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = null;
}

// ========== MAIN: Wait for DOM, then wire up ==========
document.addEventListener("DOMContentLoaded", () => {
  // Date range picker
  const rangeStart = document.getElementById("rangeStart");
  const rangeEnd = document.getElementById("rangeEnd");
  const today = getTodayISO();
  const weekAgo = getNDaysAgoISO(6);
  rangeStart.value = weekAgo;
  rangeEnd.value = today;
  statsRange.start = weekAgo;
  statsRange.end = today;

  document.getElementById("applyRangeBtn").onclick = () => {
    if (rangeStart.value && rangeEnd.value && rangeEnd.value >= rangeStart.value) {
      statsRange.start = rangeStart.value;
      statsRange.end = rangeEnd.value;
      renderTrendChartAndTopSites();
    }
  };

  renderTrendChartAndTopSites();
  startAutoRefresh();
  renderLimits();
  window.addEventListener('beforeunload', stopAutoRefresh);

  // --- SEARCH BAR FOR TOP SITES ---
  const searchInput = document.getElementById("topSitesSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      topSitesSearchTerm = e.target.value;
      topSitesCurrentPage = 1;
      renderTopSitesTable(topSitesSorted, topSitesCurrentPage, topSitesPerPage, topSitesSearchTerm,
        getDateRangeArray(statsRange.start, statsRange.end));
    });
  }

  // --- Export filtered table ---
  document.getElementById("exportFilteredBtn")?.addEventListener("click", () => {
    exportFilteredTableAsCSV();
    showToast("Exported filtered table as CSV!", "info");
  });

  // Import/Export logic
  document.getElementById('exportBtn')?.addEventListener('click', async () => {
    const data = await getAllData();
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
    showToast("Exported all data!", "info");
  });

  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');
  const importStatus = document.getElementById('import-status');

  importBtn?.addEventListener('click', () => {
    if (importFileInput) {
      importFileInput.value = '';
      importFileInput.click();
    }
  });

  importFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed = JSON.parse(text);
      if (
        typeof parsed !== "object" || !parsed ||
        !("tabTimings" in parsed) || !("tabHistory" in parsed)
      ) {
        throw new Error("File missing keys tabTimings/tabHistory.");
      }
      await setAllData(parsed.tabTimings, parsed.tabHistory);
      if (importStatus) importStatus.textContent = "Import successful!";
      showToast("Import successful!", "info");
      renderTrendChartAndTopSites();
    } catch (err) {
      if (importStatus) importStatus.textContent = "Import failed: " + (err.message || err.toString());
      showToast("Import failed: " + (err.message || err.toString()), "error", 3500);
    }
    setTimeout(() => { if (importStatus) importStatus.textContent = ""; }, 3500);
  });

  // Data retention logic (unchanged)
  const retentionInput = document.getElementById("retentionDays");
  const retentionBtn = document.getElementById("saveRetentionBtn");
  const retentionSaved = document.getElementById("retentionSaved");
  const retentionError = document.getElementById("retention-error");
  (async () => {
    if (retentionInput) retentionInput.value = await getRetentionDays();
  })();
  retentionBtn?.addEventListener("click", async () => {
    const days = parseInt(retentionInput.value, 10);
    if (isNaN(days) || days < 1 || days > 3650) {
      retentionInput.classList.add("input-error");
      if (retentionError) {
        retentionError.style.display = "";
        retentionError.textContent = "Please enter a valid number of days (1-3650).";
      }
      showToast("Invalid retention days.", "error");
      return;
    }
    retentionInput.classList.remove("input-error");
    if (retentionError) retentionError.style.display = "none";
    await setRetentionDays(days);
    if (retentionSaved) {
      retentionSaved.style.display = "";
      setTimeout(() => retentionSaved.style.display = "none", 1800);
    }
    showToast("Retention days updated!", "info");
  });
  retentionInput?.addEventListener("input", () => {
    retentionInput.classList.remove("input-error");
    if (retentionError) retentionError.style.display = "none";
  });

  // Ignore list
  const ignoreListTA = document.getElementById("ignoreList");
  const ignoreBtn = document.getElementById("saveIgnoreBtn");
  const ignoreSaved = document.getElementById("ignoreSaved");
  const ignoreError = document.getElementById("ignore-error");
  (async () => {
    const ignoreList = await getIgnoreList();
    if (ignoreListTA) ignoreListTA.value = ignoreList.join("\n");
  })();

  function validateDomainList(list) {
    // Accepts lines like: google.com, www.stackoverflow.com, etc.
    const domainRegex = /^[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})$/;
    for (const dom of list) {
      if (dom && !domainRegex.test(dom)) return dom;
    }
    return null;
  }

  ignoreBtn?.addEventListener("click", async () => {
    if (!ignoreListTA) return;
    const list = ignoreListTA.value.split("\n").map(s => s.trim()).filter(Boolean);
    const invalid = validateDomainList(list);
    if (invalid) {
      ignoreListTA.classList.add("input-error");
      if (ignoreError) {
        ignoreError.style.display = "";
        ignoreError.textContent = `Invalid domain: ${invalid}`;
      }
      showToast("Invalid domain in ignore list.", "error");
      return;
    }
    ignoreListTA.classList.remove("input-error");
    if (ignoreError) ignoreError.style.display = "none";
    await setIgnoreList(list);
    if (ignoreSaved) {
      ignoreSaved.style.display = "";
      setTimeout(() => ignoreSaved.style.display = "none", 1800);
    }
    showToast("Ignore list saved!", "info");
  });
  ignoreListTA?.addEventListener("input", () => {
    ignoreListTA.classList.remove("input-error");
    if (ignoreError) ignoreError.style.display = "none";
  });

  // Danger zone - Delete all
  const deleteBtn = document.getElementById("deleteAllBtn");
  const deleteStatus = document.getElementById("deleteStatus");
  deleteBtn?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete ALL tracked data? This cannot be undone.")) return;
    await clearAllData();
    if (deleteStatus) deleteStatus.textContent = "Deleted!";
    showToast("All data deleted.", "info");
    renderTrendChartAndTopSites();
    setTimeout(() => { if (deleteStatus) deleteStatus.textContent = ""; }, 1800);
  });

  // Time limits
  const limitsError = document.getElementById("limits-error");
  async function renderLimits() {
    const table = document.getElementById("limits-table")?.getElementsByTagName("tbody")[0];
    if (!table) return;
    table.innerHTML = "";
    const limits = await getLimits();
    Object.entries(limits).forEach(([domain, min]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${domain}</td>
        <td>${min}</td>
        <td><button data-domain="${domain}" class="delLimitBtn" title="Remove">&#x1F5D1;</button></td>
      `;
      table.appendChild(tr);
    });
    table.querySelectorAll(".delLimitBtn").forEach(btn => {
      btn.onclick = async () => {
        const limits = await getLimits();
        delete limits[btn.dataset.domain];
        await setLimits(limits);
        renderLimits();
      };
    });
  }
  renderLimits();

  document.getElementById("addLimitForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const limitDomain = document.getElementById("limitDomain");
    const limitMinutes = document.getElementById("limitMinutes");
    const limitsSaved = document.getElementById("limitsSaved");
    if (!limitDomain || !limitMinutes) return;
    const domain = limitDomain.value.trim().toLowerCase();
    const min = parseInt(limitMinutes.value, 10);
    const domainRegex = /^[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})$/;
    if (!domain || !domainRegex.test(domain)) {
      limitDomain.classList.add("input-error");
      if (limitsError) {
        limitsError.style.display = "";
        limitsError.textContent = "Please enter a valid domain (e.g. facebook.com)";
      }
      showToast("Invalid domain for limit.", "error");
      return;
    }
    if (isNaN(min) || min < 1) {
      limitMinutes.classList.add("input-error");
      if (limitsError) {
        limitsError.style.display = "";
        limitsError.textContent = "Please enter a valid number of minutes (>=1).";
      }
      showToast("Invalid minutes for limit.", "error");
      return;
    }
    limitDomain.classList.remove("input-error");
    limitMinutes.classList.remove("input-error");
    if (limitsError) limitsError.style.display = "none";
    const limits = await getLimits();
    limits[domain] = min;
    await setLimits(limits);
    limitDomain.value = "";
    limitMinutes.value = "";
    if (limitsSaved) {
      limitsSaved.style.display = "";
      setTimeout(() => limitsSaved.style.display = "none", 1300);
    }
    showToast("Limit added!", "info");
    renderLimits();
  });
  document.getElementById("limitDomain")?.addEventListener("input", () => {
    document.getElementById("limitDomain").classList.remove("input-error");
    if (limitsError) limitsError.style.display = "none";
  });
  document.getElementById("limitMinutes")?.addEventListener("input", () => {
    document.getElementById("limitMinutes").classList.remove("input-error");
    if (limitsError) limitsError.style.display = "none";
  });

  // Reset to Defaults
  document.getElementById("resetDefaultsBtn")?.addEventListener("click", async () => {
    if (!confirm("This will reset all settings to default values (but NOT delete your tab history). Continue?")) return;
    await resetSettingsToDefaults();
    showToast("Settings reset to defaults.", "info");
    // Re-load settings in UI
    (async () => {
      if (retentionInput) retentionInput.value = await getRetentionDays();
      const ignoreList = await getIgnoreList();
      if (ignoreListTA) ignoreListTA.value = ignoreList.join("\n");
      renderLimits();
    })();
  });

  // Dev/Test Area: Test Notifications Button
  const testBtn = document.getElementById("testNotifBtn");
  if (testBtn) {
    testBtn.addEventListener("click", async () => {
      if (typeof browser !== "undefined" && browser.notifications) {
        browser.notifications.create({
          "type": "basic",
          "iconUrl": browser.runtime.getURL("icon128.png"),
          "title": "Tab Time Tracker: Test Notification",
          "message": "This is a test notification from the options page.",
        });
      } else if (typeof chrome !== "undefined" && chrome.notifications) {
        chrome.notifications.create({
          "type": "basic",
          "iconUrl": chrome.runtime.getURL("icon128.png"),
          "title": "Tab Time Tracker: Test Notification",
          "message": "This is a test notification from the options page.",
        });
      } else {
        showToast("Notification API not available.", "error");
      }
    });
  }

  const openWelcomeLink = document.getElementById("openWelcomeLink");
  if (openWelcomeLink) {
    openWelcomeLink.onclick = function () {
      window.open(browser.runtime.getURL("welcome.html"));
      return false;
    };
  }
});