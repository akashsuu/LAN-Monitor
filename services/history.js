const store = require('../config/store');

const historyService = {
  recordScan(devices) {
    const entry = {
      type: 'scan',
      deviceCount: devices.length,
      onlineCount: devices.filter(d => d.online || d.status).length,
      devices: devices.map(d => ({
        ip: d.ip,
        mac: d.mac,
        hostname: d.hostname || '',
        vendor: d.vendor || '',
        online: d.online || d.status || false
      }))
    };
    store.addHistoryEntry(entry);
  },

  recordDeviceChange(device, change) {
    const entry = {
      type: 'device_change',
      ip: device.ip,
      mac: device.mac,
      hostname: device.hostname || '',
      vendor: device.vendor || '',
      change
    };
    store.addHistoryEntry(entry);
  },

  recordWebsiteCheck(site, status, responseTime) {
    const entry = {
      type: 'website_check',
      url: site.url || site,
      status,
      responseTime
    };
    store.addHistoryEntry(entry);
  },

  recordServerCheck(server, port, status) {
    const entry = {
      type: 'server_check',
      ip: server.ip || server,
      port,
      status
    };
    store.addHistoryEntry(entry);
  },

  recordSpeedTest(result) {
    const entry = {
      type: 'speed_test',
      download: result.download,
      upload: result.upload,
      ping: result.ping
    };
    store.addHistoryEntry(entry);
  },

  recordAlert(alert) {
    store.addAlert(alert);
  },

  getByType(type, limit = 50) {
    const history = store.getHistory();
    return history.filter(h => h.type === type).slice(-limit);
  },

  getRecent(count = 20) {
    const history = store.getHistory();
    return history.slice(-count);
  },

  getTimeline(mac, limit = 100) {
    const history = store.getHistory();
    return history.filter(h => h.mac === mac || (h.devices && h.devices.some(d => d.mac === mac))).slice(-limit);
  },

  clear() {
    store.clearHistory();
  }
};

module.exports = historyService;
