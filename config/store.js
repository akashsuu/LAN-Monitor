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
const NICKNAMES_FILE = path.join(CONFIG_DIR, 'nicknames.json');
const TRUST_FILE = path.join(CONFIG_DIR, 'trust.json');
const GROUPS_FILE = path.join(CONFIG_DIR, 'groups.json');
const BLOCKED_SITES_FILE = path.join(CONFIG_DIR, 'blocked-sites.json');
const LOG_DIR = path.join(CONFIG_DIR, 'logs');

const DEFAULTS = {
  interval: 60,
  scanTimeout: 30,
  pingCount: 4,
  theme: 'dark',
  autoScan: false,
  notifications: true,
  dashboardPort: 3000,
  alertsEnabled: true,
  logLevel: 'info',
  maxLogDays: 30,
  maxHistoryEntries: 1000,
  concurrency: 100,
  trustOnFirstScan: false,
  watchInterval: 10,
  speedTestServer: 'speedtest.tele2.net',
  subnetScanPorts: [80, 443, 22, 8080, 8443]
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(filePath, defaultData) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch {}
  return defaultData;
}

function writeJSON(filePath, data) {
  try {
    ensureDir(CONFIG_DIR);
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
      devices.push({ ...device, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), online: true });
      return writeJSON(DEVICES_FILE, devices);
    }
    exists.lastSeen = new Date().toISOString();
    if (device.hostname) exists.hostname = device.hostname;
    if (device.vendor) exists.vendor = device.vendor;
    if (device.mac) exists.mac = device.mac;
    if (device.status !== undefined) exists.status = device.status;
    if (device.online !== undefined) exists.online = device.online;
    if (device.deviceType) exists.deviceType = device.deviceType;
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

  removeDevice(ip) {
    const devices = this.getDevices();
    const filtered = devices.filter(d => d.ip !== ip);
    if (filtered.length < devices.length) {
      return writeJSON(DEVICES_FILE, filtered);
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

  updateWebsite(name, updates) {
    const websites = this.getWebsites();
    const site = websites.find(w => w.name === name || w.url === name);
    if (site) {
      Object.assign(site, updates);
      return writeJSON(WEBSITES_FILE, websites);
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

  updateServer(name, updates) {
    const servers = this.getServers();
    const server = servers.find(s => s.name === name || s.ip === name);
    if (server) {
      Object.assign(server, updates);
      return writeJSON(SERVERS_FILE, servers);
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

  markAlertRead(id) {
    const alerts = this.getAlerts();
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alert.read = true;
      return writeJSON(ALERTS_FILE, alerts);
    }
    return false;
  },

  getHistory() {
    return readJSON(HISTORY_FILE, []);
  },

  addHistoryEntry(entry) {
    const history = this.getHistory();
    history.push({ ...entry, timestamp: new Date().toISOString() });
    const config = this.getConfig();
    const max = config.maxHistoryEntries || 1000;
    if (history.length > max) {
      history.splice(0, history.length - max);
    }
    return writeJSON(HISTORY_FILE, history);
  },

  clearHistory() {
    return writeJSON(HISTORY_FILE, []);
  },

  getNicknames() {
    return readJSON(NICKNAMES_FILE, {});
  },

  setNickname(mac, name) {
    const nicknames = this.getNicknames();
    nicknames[mac.toUpperCase()] = name;
    return writeJSON(NICKNAMES_FILE, nicknames);
  },

  removeNickname(mac) {
    const nicknames = this.getNicknames();
    delete nicknames[mac.toUpperCase()];
    return writeJSON(NICKNAMES_FILE, nicknames);
  },

  getTrusted() {
    return readJSON(TRUST_FILE, []);
  },

  addTrusted(mac, label) {
    const trusted = this.getTrusted();
    if (!trusted.find(t => t.mac === mac)) {
      trusted.push({ mac: mac.toUpperCase(), label: label || mac, added: new Date().toISOString() });
      return writeJSON(TRUST_FILE, trusted);
    }
    return false;
  },

  removeTrusted(mac) {
    const trusted = this.getTrusted();
    const filtered = trusted.filter(t => t.mac !== mac.toUpperCase());
    if (filtered.length < trusted.length) {
      return writeJSON(TRUST_FILE, filtered);
    }
    return false;
  },

  isTrusted(mac) {
    if (!mac) return false;
    const trusted = this.getTrusted();
    return trusted.some(t => t.mac === mac.toUpperCase());
  },

  getGroups() {
    return readJSON(GROUPS_FILE, {});
  },

  createGroup(name) {
    const groups = this.getGroups();
    if (groups[name]) return false;
    groups[name] = { name, devices: [], created: new Date().toISOString() };
    return writeJSON(GROUPS_FILE, groups);
  },

  deleteGroup(name) {
    const groups = this.getGroups();
    if (!groups[name]) return false;
    delete groups[name];
    return writeJSON(GROUPS_FILE, groups);
  },

  addDeviceToGroup(groupName, ip) {
    const groups = this.getGroups();
    if (!groups[groupName]) return false;
    if (groups[groupName].devices.includes(ip)) return false;
    groups[groupName].devices.push(ip);
    return writeJSON(GROUPS_FILE, groups);
  },

  removeDeviceFromGroup(groupName, ip) {
    const groups = this.getGroups();
    if (!groups[groupName]) return false;
    groups[groupName].devices = groups[groupName].devices.filter(d => d !== ip);
    return writeJSON(GROUPS_FILE, groups);
  },

  getDevicesInGroup(groupName) {
    const groups = this.getGroups();
    if (!groups[groupName]) return [];
    const allDevices = this.getDevices();
    return allDevices.filter(d => groups[groupName].devices.includes(d.ip));
  },

  getBlockedSites() {
    return readJSON(BLOCKED_SITES_FILE, []);
  },

  addBlockedSite(site) {
    const sites = this.getBlockedSites();
    const cleaned = site.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!sites.includes(cleaned)) {
      sites.push(cleaned);
      return writeJSON(BLOCKED_SITES_FILE, sites);
    }
    return false;
  },

  removeBlockedSite(site) {
    const sites = this.getBlockedSites();
    const cleaned = site.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const filtered = sites.filter(s => s !== cleaned);
    if (filtered.length < sites.length) {
      return writeJSON(BLOCKED_SITES_FILE, filtered);
    }
    return false;
  },

  getLogDir() {
    ensureDir(LOG_DIR);
    return LOG_DIR;
  }
};

module.exports = store;
