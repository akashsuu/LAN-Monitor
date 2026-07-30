const fs = require('fs');
const path = require('path');
const os = require('os');
const store = require('../config/store');
const network = require('../utils/network');

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const htmlReportService = {
  generate() {
    const devices = store.getDevices();
    const websites = store.getWebsites();
    const servers = store.getServers();
    const alerts = store.getAlerts();
    const history = store.getHistory();
    const groups = store.getGroups();
    const nicknames = store.getNicknames();

    const online = devices.filter(d => d.online || d.status);
    const offline = devices.filter(d => !d.online && !d.status);

    const vendorStats = {};
    for (const d of devices) {
      const v = d.vendor || 'Unknown';
      vendorStats[v] = (vendorStats[v] || 0) + 1;
    }
    const vendorEntries = Object.entries(vendorStats).sort((a, b) => b[1] - a[1]);

    const now = new Date();
    const reportDir = path.join(os.homedir(), '.lan-monitor', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const filename = `report-${now.toISOString().split('T')[0]}.html`;
    const filePath = path.join(reportDir, filename);

    const healthScore = Math.max(0, Math.min(100, 100 - (offline.length * 5) + (online.length > 0 ? 10 : 0)));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LAN Monitor Report - ${now.toLocaleDateString()}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 40px 20px; }
  .container { max-width: 1200px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #161b22, #0d1117); border: 1px solid #30363d; border-radius: 12px; }
  .header h1 { color: #58a6ff; font-size: 28px; margin-bottom: 8px; }
  .header .meta { color: #8b949e; font-size: 14px; }
  .header .score { display: inline-block; margin-top: 12px; padding: 6px 20px; border-radius: 20px; font-size: 18px; font-weight: bold; background: ${healthScore >= 80 ? '#1a3a2a' : healthScore >= 50 ? '#3a2a1a' : '#3a1a1a'}; color: ${healthScore >= 80 ? '#3fb950' : healthScore >= 50 ? '#d29922' : '#f85149'}; border: 1px solid ${healthScore >= 80 ? '#238636' : healthScore >= 50 ? '#9e6a03' : '#da3633'}; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
  .card h2 { color: #58a6ff; font-size: 16px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #30363d; }
  .card .stat { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .card .stat .val { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  th { background: #21262d; color: #58a6ff; padding: 8px 12px; text-align: left; border: 1px solid #30363d; }
  td { padding: 8px 12px; border: 1px solid #30363d; }
  tr:nth-child(even) { background: #0d1117; }
  tr:hover { background: #1c2128; }
  .online { color: #3fb950; }
  .offline { color: #f85149; }
  .section { margin-bottom: 30px; }
  .section h2 { color: #58a6ff; font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #30363d; }
  .alert-item { padding: 8px 12px; margin: 4px 0; background: #1c2128; border-left: 3px solid #d29922; border-radius: 4px; }
  .chart-bar { display: inline-block; height: 12px; border-radius: 4px; margin-right: 6px; vertical-align: middle; }
  .footer { text-align: center; color: #484f58; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #30363d; }
  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>LAN Monitor Report</h1>
    <div class="meta">Generated: ${now.toLocaleString()} | Host: ${escapeHtml(os.hostname())} | Local IP: ${network.getLocalIP()}</div>
    <div class="score">Health Score: ${healthScore}%</div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Devices</h2>
      <div class="stat"><span>Total</span><span class="val">${devices.length}</span></div>
      <div class="stat"><span>Online</span><span class="val online">${online.length}</span></div>
      <div class="stat"><span>Offline</span><span class="val offline">${offline.length}</span></div>
      <div class="stat"><span>Websites</span><span class="val">${websites.length}</span></div>
      <div class="stat"><span>Servers</span><span class="val">${servers.length}</span></div>
      <div class="stat"><span>Alerts</span><span class="val">${alerts.length}</span></div>
    </div>
    <div class="card">
      <h2>Network</h2>
      <div class="stat"><span>Gateway</span><span class="val">${network.getGateway() || 'N/A'}</span></div>
      <div class="stat"><span>DNS</span><span class="val">${network.getDNS() || 'N/A'}</span></div>
      <div class="stat"><span>Groups</span><span class="val">${Object.keys(groups).length}</span></div>
      <div class="stat"><span>Events</span><span class="val">${history.length}</span></div>
    </div>
    <div class="card">
      <h2>Vendor Distribution</h2>
      ${vendorEntries.slice(0, 8).map(([v, c]) => {
        const pct = devices.length > 0 ? (c / devices.length * 100).toFixed(1) : 0;
        return `<div class="stat"><span>${escapeHtml(v)}</span><span class="val">${c} (${pct}%)</span></div>`;
      }).join('')}
    </div>
  </div>

  <div class="section">
    <h2>Devices (${devices.length})</h2>
    ${devices.length > 0 ? `
    <table>
      <thead><tr><th>IP</th><th>MAC</th><th>Hostname</th><th>Vendor</th><th>Status</th><th>First Seen</th><th>Last Seen</th></tr></thead>
      <tbody>
        ${devices.slice(0, 100).map(d => `
          <tr>
            <td>${escapeHtml(d.ip)}</td>
            <td>${escapeHtml(d.mac) || '-'}</td>
            <td>${escapeHtml(d.hostname) || '-'}</td>
            <td>${escapeHtml(d.vendor) || '-'}</td>
            <td class="${d.online || d.status ? 'online' : 'offline'}">${d.online || d.status ? 'Online' : 'Offline'}</td>
            <td>${d.firstSeen ? new Date(d.firstSeen).toLocaleString() : '-'}</td>
            <td>${d.lastSeen ? new Date(d.lastSeen).toLocaleString() : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p>No devices found.</p>'}
  </div>

  <div class="section">
    <h2>Recent Alerts (${Math.min(alerts.length, 20)})</h2>
    ${alerts.slice(0, 20).map(a => `
      <div class="alert-item">${escapeHtml(a.message || a.type)} - <span style="color:#8b949e;font-size:12px">${a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span></div>
    `).join('') || '<p>No alerts.</p>'}
  </div>

  <div class="section">
    <h2>Recent Events</h2>
    <table>
      <thead><tr><th>Type</th><th>Timestamp</th></tr></thead>
      <tbody>
        ${history.slice(-50).reverse().map(h => `
          <tr><td>${escapeHtml(h.type)}</td><td>${h.timestamp ? new Date(h.timestamp).toLocaleString() : '-'}</td></tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    LAN Monitor Report &mdash; Generated by ln report html<br>
    <span style="color:#484f58">${now.toISOString()}</span>
  </div>
</div>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }
};

module.exports = htmlReportService;
