function totalTime(tabTimings) {
  let total = 0;
  for (const ms of Object.values(tabTimings)) total += ms;
  return total;
}

function renderChart(tabTimings) {
  const chart = document.getElementById('chart');
  chart.innerHTML = '';
  const entries = Object.entries(tabTimings).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    chart.innerHTML = '<div class="empty"><i>No time tracked yet.</i></div>';
    document.getElementById('summary').innerHTML = '';
    return;
  }
  // Find max time for scaling
  const max = Math.max(...entries.map(e => e[1]));
  for (const [url, ms] of entries) {
    const card = document.createElement('div');
    card.className = 'bar-card';
    card.setAttribute('data-url', url);

    const fav = document.createElement('img');
    fav.className = 'favicon';
    fav.src = getFavicon(url);
    fav.onerror = function() {
      this.src = "https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-lg-high-res.7ba3ceca0ab1.png";
    };

    const labelArea = document.createElement('span');
    labelArea.className = 'bar-label-area';

    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';

    const host = document.createElement('span');
    host.className = 'hostname';
    host.textContent = getHostname(url);

    const tip = document.createElement('span');
    tip.className = 'tooltiptext';
    tip.textContent = url;

    tooltip.appendChild(host);
    tooltip.appendChild(tip);
    labelArea.appendChild(fav);
    labelArea.appendChild(tooltip);

    // Per-URL delete button (hidden by default, visible on hover)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-url-btn';
    removeBtn.title = "Clear this URL";
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (confirm(`Clear tracked time for:\n${url}?`)) {
        browser.runtime.sendMessage({ action: "clearSingleUrl", url }).then(() => {
          fetchAndRender();
        });
      }
    };

    const visual = document.createElement('div');
    visual.className = 'bar-visual';
    let percent = (ms / max) * 100;
    visual.style.width = percent + '%';

    // Color gradient by percent
    if (percent > 80) {
      visual.style.background = "linear-gradient(90deg, #4ade80 60%, #16a34a)";
    } else if (percent > 45) {
      visual.style.background = "linear-gradient(90deg, #60a5fa 30%, #22d3ee)";
    } else {
      visual.style.background = "linear-gradient(90deg, #a5b4fc, #60a5fa 80%)";
    }

    const time = document.createElement('span');
    time.className = 'bar-time';
    time.textContent = msToTime(ms);

    card.appendChild(labelArea);
    card.appendChild(visual);
    card.appendChild(time);
    card.appendChild(removeBtn);

    chart.appendChild(card);
  }
  // Total summary
  const sum = msToTime(totalTime(tabTimings));
  document.getElementById('summary').innerHTML = `Total time tracked: <span class="summary-time">${sum}</span>`;
}

function fetchAndRender() {
  browser.runtime.sendMessage({ action: "getTabTimings" }).then((resp) => {
    renderChart(resp.tabTimings);
  });
}

document.getElementById('clear').onclick = () => {
  if (confirm('Clear all tracked tab times?')) {
    browser.runtime.sendMessage({ action: "clearTimings" }).then(() => {
      fetchAndRender();
    });
  }
};

fetchAndRender();
setInterval(fetchAndRender, 1000);