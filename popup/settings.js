export function renderSettings(parent) {
    const section = document.createElement("div");
    section.className = "settings-section";
    section.innerHTML = `
      <button id="resetAllBtn">Reset all data</button>
      <button id="openOptionsBtn">Open Extension Settings</button>
      <div style="margin-top:7px; color:#82aaff;">Version: <span id="extensionVersion"></span></div>
      <div style="color:#b8bbe3;font-size:12px;margin-top:10px;">Pie chart: Top 8 sites, others grouped as "Other".</div>
    `;
    parent.appendChild(section);
  
    const manifest = browser.runtime.getManifest();
    section.querySelector("#extensionVersion").textContent = manifest.version;
  
    section.querySelector("#resetAllBtn").onclick = () => {
      if (confirm("Reset ALL tracked times (including history)?")) {
        browser.runtime.sendMessage({ action: "clearTimings" }).then(() => {
          location.reload();
        });
      }
    };
  
    section.querySelector("#openOptionsBtn").onclick = () => {
      if (browser.runtime.openOptionsPage) {
        browser.runtime.openOptionsPage();
      } else {
        window.open("../options/options.html");
      }
    };
  }