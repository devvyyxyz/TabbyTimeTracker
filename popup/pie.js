import { getHostname, msToTime } from './utils.js';

const PIE_COLORS = [
  "#60a5fa", "#0ea5e9", "#38bdf8", "#7c3aed", "#f472b6",
  "#a5b4fc", "#10b981", "#fbbf24", "#f97316", "#f43f5e"
];

export function renderPieChart(data, parent, label) {
  let old = parent.querySelector('#pieChart');
  if (old) old.remove();

  const urls = Object.keys(data).filter(url => data[url] > 0);
  if (!urls.length) return;
  const total = urls.reduce((a, url) => a + data[url], 0);

  const sorted = urls.map(url => [url, data[url]])
    .sort((a, b) => b[1] - a[1]);
  let pieData = sorted.slice(0, 8);
  if (sorted.length > 8) {
    const sumOther = sorted.slice(8).reduce((a, x) => a + x[1], 0);
    pieData.push(["Other", sumOther]);
  }

  const W = 180, H = 180, R = 72;
  const cx = W / 2, cy = H / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.id = "pieChart";
  const ctx = canvas.getContext("2d");

  let start = -Math.PI / 2;
  for (let i = 0; i < pieData.length; ++i) {
    let [url, ms] = pieData[i];
    let frac = ms / total;
    let angle = frac * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, start + angle, false);
    ctx.closePath();
    ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
    ctx.fill();
    start += angle;
  }

  let legendHtml = "";
  for (let i = 0; i < pieData.length; ++i) {
    let [url, ms] = pieData[i];
    legendHtml += `<div style="display:flex;align-items:center;font-size:13px;margin-bottom:2px;">
      <span style="width:12px;height:12px;display:inline-block;border-radius:2px;background:${PIE_COLORS[i%PIE_COLORS.length]};margin-right:7px;"></span>
      <span title="${url === 'Other' ? '' : url}" style="flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;">${url === "Other" ? "Other" : getHostname(url)}</span>
      <span style="margin-left:7px;color:#b8bbe3;">${msToTime(ms)}</span>
    </div>`;
  }

  const wrap = document.createElement("div");
  wrap.id = "pie-wrap";
  wrap.appendChild(canvas);

  const legendDiv = document.createElement("div");
  legendDiv.style.marginLeft = "18px";
  legendDiv.innerHTML = legendHtml;
  legendDiv.style.display = "flex";
  legendDiv.style.flexDirection = "column";
  legendDiv.style.justifyContent = "center";
  wrap.appendChild(legendDiv);

  parent.appendChild(wrap);
}