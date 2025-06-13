import { getFavicon, getHostname, msToTime } from './utils.js';
import { render } from './render.js';

export function renderTable(data, label, parent, showRemove = true) {
  const urls = Object.keys(data).filter(url => data[url] > 0);
  if (!urls.length) {
    const div = document.createElement("div");
    div.className = "empty";
    div.textContent = `No data for ${label}.`;
    parent.appendChild(div);
    return;
  }
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr>
    <th>Site</th>
    <th>Time</th>
    ${showRemove ? "<th></th>" : ""}
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  urls.sort((a, b) => data[b] - data[a]);
  for (const url of urls) {
    const row = document.createElement("tr");
    const favicon = `<img src="${getFavicon(url)}" class="favicon" style="vertical-align:middle;width:18px;height:18px;margin-right:6px;" onerror="this.src='https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-lg-high-res.7ba3ceca0ab1.png'">`;
    row.innerHTML = `<td>${favicon}${getHostname(url)}</td>
      <td>${msToTime(data[url])}</td>
      ${showRemove ? `<td><button class="remove-url-btn" title="Clear this URL" data-url="${url}">×</button></td>` : ""}`;
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  parent.appendChild(table);

  if (showRemove) {
    parent.querySelectorAll(".remove-url-btn").forEach(btn => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        const url = btn.getAttribute("data-url");
        if (confirm(`Clear tracked time for:\n${url}?`)) {
          browser.runtime.sendMessage({ action: "clearSingleUrl", url }).then(() => {
            render();
          });
        }
      });
    });
  }
}