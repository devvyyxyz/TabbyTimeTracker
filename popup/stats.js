import { getHostname, msToTime } from './utils.js';

export function renderStatsSummary(data, label, parent) {
  const urls = Object.keys(data).filter(url => data[url] > 0);
  if (!urls.length) return;
  const total = urls.reduce((a, url) => a + data[url], 0);
  const most = urls.reduce((a, b) => data[a] > data[b] ? a : b);

  const div = document.createElement("div");
  div.id = "stats-summary";
  div.innerHTML = `
    <b>${label} total:</b> <span class='summary-time'>${msToTime(total)}</span><br>
    <b>Most active site:</b> <span style="color:#60aaff;">${getHostname(most)}</span> (${msToTime(data[most])})
  `;
  parent.appendChild(div);
}