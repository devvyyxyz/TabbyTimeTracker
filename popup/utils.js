export function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)));
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  export function getFavicon(url) {
    try {
      const u = new URL(url);
      return `${u.origin}/favicon.ico`;
    } catch {
      return "https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-lg-high-res.7ba3ceca0ab1.png";
    }
  }
  export function getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url.slice(0, 32) + (url.length > 35 ? "..." : "");
    }
  }
  export function getDayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  }