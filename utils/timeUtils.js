function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor(duration / (1000 * 60 * 60));
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  
  function getFavicon(url) {
    try {
      const u = new URL(url);
      return `${u.origin}/favicon.ico`;
    } catch {
      return "https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-lg-high-res.7ba3ceca0ab1.png";
    }
  }
  
  function getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url.slice(0, 32) + (url.length > 35 ? "..." : "");
    }
  }