const fs = require('fs');
const path = require('path');
const os = require('os');

const VENDOR_CACHE_FILE = path.join(os.homedir(), '.lan-monitor', 'vendor-cache.json');

const OUI_DATABASE = {};

function loadDatabase() {
  try {
    if (Object.keys(OUI_DATABASE).length > 0) return;
    const ouiPath = path.join(__dirname, '..', 'data', 'oui.json');
    if (fs.existsSync(ouiPath)) {
      const data = JSON.parse(fs.readFileSync(ouiPath, 'utf8'));
      Object.assign(OUI_DATABASE, data);
    }
  } catch {}
}

function lookupVendor(mac) {
  if (!mac || mac === 'N/A') return 'Unknown';
  const prefix = mac.toUpperCase().replace(/[:\-]/g, '').substring(0, 6);
  loadDatabase();
  return OUI_DATABASE[prefix] || 'Unknown';
}

function getVendorsList() {
  loadDatabase();
  const result = [];
  const seen = new Set();
  for (const [prefix, name] of Object.entries(OUI_DATABASE)) {
    if (!seen.has(name)) {
      seen.add(name);
      result.push({ prefix, name });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { lookupVendor, getVendorsList, loadDatabase };
