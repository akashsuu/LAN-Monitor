const { exec } = require('child_process');
const network = require('../utils/network');
const vendor = require('./vendor');
const pingService = require('./ping');
const portService = require('./port');

const OS_SIGNATURES = [
  { name: 'Windows 11', ttlRange: [120, 130], portSignatures: [3389, 445, 139], macVendors: [], hostnamePatterns: [/desktop/i, /windows/i, /win/i, /pc/i] },
  { name: 'Windows 10', ttlRange: [120, 130], portSignatures: [3389, 445, 139], macVendors: [], hostnamePatterns: [/desktop/i, /windows/i, /win/i, /pc/i] },
  { name: 'Windows 7/8', ttlRange: [120, 130], portSignatures: [3389, 445], macVendors: [], hostnamePatterns: [/windows/i, /win/i] },
  { name: 'Linux', ttlRange: [60, 70], portSignatures: [22, 80, 443], macVendors: [], hostnamePatterns: [/linux/i, /ubuntu/i, /debian/i, /centos/i, /fedora/i] },
  { name: 'Ubuntu', ttlRange: [60, 70], portSignatures: [22, 80], macVendors: [], hostnamePatterns: [/ubuntu/i] },
  { name: 'Debian', ttlRange: [60, 70], portSignatures: [22], macVendors: [], hostnamePatterns: [/debian/i] },
  { name: 'CentOS', ttlRange: [60, 70], portSignatures: [22, 80], macVendors: [], hostnamePatterns: [/centos/i] },
  { name: 'macOS', ttlRange: [60, 70], portSignatures: [22, 88, 548], macVendors: ['APPLE'], hostnamePatterns: [/mac/i, /imac/i, /macbook/i, /apple/i] },
  { name: 'iPhone/iOS', ttlRange: [60, 70], portSignatures: [62078], macVendors: ['APPLE'], hostnamePatterns: [/iphone/i, /ipad/i, /ios/i] },
  { name: 'Android', ttlRange: [60, 70], portSignatures: [5555], macVendors: ['SAMSUNG', 'XIAOMI', 'ONEPLUS', 'GOOGLE'], hostnamePatterns: [/android/i, /phone/i, /mobile/i] },
  { name: 'RouterOS', ttlRange: [60, 70], portSignatures: [80, 443, 8291], macVendors: ['MIKROTIK'], hostnamePatterns: [/router/i, /routeros/i, /mikrotik/i] },
  { name: 'OpenWRT', ttlRange: [60, 70], portSignatures: [80, 443, 22], macVendors: [], hostnamePatterns: [/openwrt/i, /lede/i] },
  { name: 'NAS', ttlRange: [60, 70], portSignatures: [80, 443, 5000, 5001], macVendors: ['SYNOLOGY', 'QNAP', 'WESTERN'], hostnamePatterns: [/nas/i, /synology/i, /qnap/i, /diskstation/i] },
  { name: 'Network Switch', ttlRange: [60, 70], portSignatures: [80, 443, 23], macVendors: ['CISCO', 'NETGEAR', 'TP-LINK', 'D-LINK', 'UBIQUITI'], hostnamePatterns: [/switch/i, /sg\d+/i, /gs\d+/i] },
  { name: 'Printer', ttlRange: [60, 70], portSignatures: [80, 443, 631, 9100], macVendors: ['HP', 'CANON', 'EPSON', 'BROTHER'], hostnamePatterns: [/printer/i, /hp.*desk/i, /hp.*laser/i, /canon/i, /epson/i] },
  { name: 'Camera', ttlRange: [60, 70], portSignatures: [80, 443, 554, 8554], macVendors: ['HIKVISION', 'DAHUA', 'AXIS'], hostnamePatterns: [/camera/i, /cam/i, /ipcam/i, /dvr/i, /nvr/i] }
];

function normalizeVendor(v) {
  if (!v) return '';
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function checkWindowsVersion(banners) {
  for (const b of banners) {
    if (b && b.includes('10.0')) {
      return /22h2|23h2|24h2|10\.0\.22/i.test(b) ? 'Windows 11' : 'Windows 10';
    }
  }
  return null;
}

const osDetection = {
  async detect(ip) {
    const result = {
      ip,
      os: 'Unknown',
      confidence: 0,
      reasons: [],
      ttl: null,
      openPorts: [],
      vendor: '',
      hostname: '',
      banners: []
    };

    const pingResult = await pingService.ping(ip, 2);
    if (pingResult.average !== null) {
      result.ttl = pingResult.replies[0] ? 128 - Math.round(pingResult.average / 2) : null;
      if (result.ttl) {
        const absTTL = Math.abs(result.ttl);
        if (absTTL <= 128 && absTTL >= 120) result.ttl = 128;
        else if (absTTL <= 64 && absTTL >= 55) result.ttl = 64;
        else if (absTTL <= 255 && absTTL >= 245) result.ttl = 255;
        result.reasons.push('TTL');
      }
    }

    try {
      result.hostname = await network.getHostname(ip);
      if (result.hostname) result.reasons.push('Hostname');
    } catch {}

    const stored = require('../config/store').getDevices().find(d => d.ip === ip);
    if (stored) {
      result.vendor = stored.vendor || '';
      if (stored.mac) {
        const macVendor = vendor.lookupVendor(stored.mac);
        if (macVendor !== 'Unknown') result.vendor = macVendor;
      }
    }

    const topCommon = [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 389, 443, 445, 993, 995, 1433, 1521, 2049, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 8291, 5000, 5001, 5555, 62078, 631, 9100, 554, 8554, 27017, 25565, 548, 88];
    const portResults = await Promise.all(
      topCommon.map(p => portService.checkPort(ip, p, 1500))
    );

    const openPorts = portResults.filter(r => r.open);
    result.openPorts = openPorts.map(r => r.port);

    if (openPorts.length > 0) {
      result.reasons.push('Ports');
      const bannerPromises = openPorts.map(r => portService.grabBanner(ip, r.port, 1500));
      const banners = await Promise.all(bannerPromises);
      result.banners = banners.filter(Boolean);
      if (result.banners.length > 0) result.reasons.push('Banner');
    }

    const scores = [];
    for (const os of OS_SIGNATURES) {
      let score = 0;
      const reasons = [];

      if (result.ttl !== null && os.ttlRange[0] <= result.ttl && result.ttl <= os.ttlRange[1]) {
        score += 30;
        reasons.push('TTL range match');
      }

      if (result.openPorts.length > 0 && os.portSignatures.length > 0) {
        const matchedPorts = os.portSignatures.filter(p => result.openPorts.includes(p));
        if (matchedPorts.length > 0) {
          score += matchedPorts.length * 15;
          reasons.push(`Ports: ${matchedPorts.join(', ')}`);
        }
      }

      if (os.macVendors.length > 0 && result.vendor) {
        const norm = normalizeVendor(result.vendor);
        if (os.macVendors.some(v => norm.includes(v.toUpperCase()))) {
          score += 20;
          reasons.push('MAC vendor match');
        }
      }

      if (os.hostnamePatterns.length > 0 && result.hostname) {
        if (os.hostnamePatterns.some(p => p.test(result.hostname))) {
          score += 20;
          reasons.push('Hostname pattern match');
        }
      }

      if (result.banners.length > 0) {
        const winVersion = checkWindowsVersion(result.banners);
        if (winVersion && os.name === winVersion) {
          score += 25;
          reasons.push('Banner version match');
        }
      }

      scores.push({ os: os.name, score, reasons, ttlMatch: result.ttl !== null && os.ttlRange[0] <= result.ttl && result.ttl <= os.ttlRange[1] });
    }

    scores.sort((a, b) => b.score - a.score);

    if (scores.length > 0 && scores[0].score > 0) {
      const top = scores[0];
      const second = scores[1] ? scores[1].score : 0;
      const maxScore = scores.reduce((max, s) => Math.max(max, s.score), 0);
      result.confidence = Math.min(Math.round(top.score / 85 * 100), 99);
      result.os = top.os;
      if (result.confidence < 50 && top.score > 0) {
        result.os = scores.filter(s => s.score > 0).map(s => s.os).join(' / ') || 'Unknown';
      }
      if (second > 0 && (top.score - second) < 10) {
        result.os += ` (or ${second.os})`;
        result.confidence = Math.max(Math.round(top.score / 85 * 100) - 20, 10);
      }
    }

    if (pingResult.average === null && openPorts.length === 0) {
      result.os = 'Offline / Unknown';
      result.confidence = 0;
    }

    return result;
  }
};

module.exports = osDetection;
