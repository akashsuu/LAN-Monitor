const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.lan-monitor');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DEVICES_FILE = path.join(CONFIG_DIR, 'devices.json');
const WEBSITES_FILE = path.join(CONFIG_DIR, 'websites.json');
const SERVERS_FILE = path.join(CONFIG_DIR, 'servers.json');
const ALERTS_FILE = path.join(CONFIG_DIR, 'alerts.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');

const DEFAULTS = {
  interval: 60,
  theme: 'dark',
  autoScan: false,
  notifications: true,
  dashboardPort: 3000,
  alertsEnabled: true
};

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readJSON(filePath, defaultData) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch {
  }
  return defaultData;
}

function writeJSON(filePath, data) {
  try {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

const store = {
  getConfig() {
    return { ...DEFAULTS, ...readJSON(CONFIG_FILE, {}) };
  },

  setConfig(key, value) {
    const config = this.getConfig();
    config[key] = value;
    return writeJSON(CONFIG_FILE, config);
  },

  resetConfig() {
    return writeJSON(CONFIG_FILE, DEFAULTS);
  },

  getDevices() {
    return readJSON(DEVICES_FILE, []);
  },

  addDevice(device) {
    const devices = this.getDevices();
    const exists = devices.find(d => d.ip === device.ip);
    if (!exists) {
      devices.push({ ...device, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString() });
      return writeJSON(DEVICES_FILE, devices);
    }
    exists.lastSeen = new Date().toISOString();
    if (device.hostname) exists.hostname = device.hostname;
    if (device.vendor) exists.vendor = device.vendor;
    if (device.status !== undefined) exists.status = device.status;
    return writeJSON(DEVICES_FILE, devices);
  },

  updateDevice(ip, updates) {
    const devices = this.getDevices();
    const device = devices.find(d => d.ip === ip);
    if (device) {
      Object.assign(device, updates, { lastSeen: new Date().toISOString() });
      return writeJSON(DEVICES_FILE, devices);
    }
    return false;
  },

  getWebsites() {
    return readJSON(WEBSITES_FILE, []);
  },

  addWebsite(url) {
    const websites = this.getWebsites();
    const exists = websites.find(w => w.url === url);
    if (!exists) {
      const name = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      websites.push({ url, name, added: new Date().toISOString() });
      return writeJSON(WEBSITES_FILE, websites);
    }
    return false;
  },

  removeWebsite(name) {
    const websites = this.getWebsites();
    const filtered = websites.filter(w => w.name !== name && w.url !== name);
    if (filtered.length < websites.length) {
      return writeJSON(WEBSITES_FILE, filtered);
    }
    return false;
  },

  getServers() {
    return readJSON(SERVERS_FILE, []);
  },

  addServer(ip) {
    const servers = this.getServers();
    const exists = servers.find(s => s.ip === ip);
    if (!exists) {
      servers.push({ ip, name: ip, added: new Date().toISOString() });
      return writeJSON(SERVERS_FILE, servers);
    }
    return false;
  },

  removeServer(name) {
    const servers = this.getServers();
    const filtered = servers.filter(s => s.name !== name && s.ip !== name);
    if (filtered.length < servers.length) {
      return writeJSON(SERVERS_FILE, filtered);
    }
    return false;
  },

  getAlerts() {
    return readJSON(ALERTS_FILE, []);
  },

  addAlert(alert) {
    const alerts = this.getAlerts();
    alerts.unshift({ ...alert, timestamp: new Date().toISOString(), id: Date.now() });
    if (alerts.length > 100) alerts.length = 100;
    return writeJSON(ALERTS_FILE, alerts);
  },

  clearAlerts() {
    return writeJSON(ALERTS_FILE, []);
  },

  getHistory() {
    return readJSON(HISTORY_FILE, []);
  },

  addHistoryEntry(entry) {
    const history = this.getHistory();
    history.push({ ...entry, timestamp: new Date().toISOString() });
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    return writeJSON(HISTORY_FILE, history);
  }
};

module.exports = store;
