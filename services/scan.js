const { exec } = require('child_process');
const os = require('os');
const network = require('../utils/network');

function extractMacVendor(mac) {
  const vendors = {
    '00:11:22': 'Dell',
    '00:1A:2B': 'Intel',
    '00:50:56': 'VMware',
    '00:0C:29': 'VMware',
    '00:15:5D': 'Microsoft',
    '00:1B:21': 'HP',
    '00:24:E8': 'Asus',
    '00:26:18': 'Apple',
    '00:1E:C2': 'Acer',
    '00:23:8E': 'Samsung',
    'F8:32:E4': 'TP-Link',
    '00:1D:7E': 'Netgear',
    '00:1A:6B': 'Linksys',
    '00:E0:4C': 'Realtek',
    '00:25:90': 'Toshiba',
    '14:10:9F': 'ASUS',
    '34:02:86': 'Google',
    '00:9A:CD': 'Huawei',
    '70:8B:CD': 'Xiaomi',
    '00:23:54': 'D-Link'
  };
  const prefix = mac.toUpperCase().replace(/:/g, '').substring(0, 6);
  const formatted = prefix.replace(/(.{2})(.{2})(.{2})/, '$1:$2:$3');
  return vendors[formatted] || 'Unknown';
}

const scanService = {
  async scanNetwork(subnet) {
    const results = [];
    if (!subnet) {
      subnet = this.getLocalSubnet();
    }
    if (network.isWindows()) {
      try {
        const devices = await this.scanArp();
        for (const device of devices) {
          if (!subnet || device.ip.startsWith(subnet.replace('.0/24', '').replace('.0', ''))) {
            results.push(device);
          }
        }
      } catch {
        results.push({ ip: 'N/A', hostname: 'Scan failed', mac: 'N/A', vendor: 'N/A', latency: null, status: false, deviceType: 'Error' });
      }
    } else {
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet.replace('/24', '').replace(/\.\d+$/, '')}.${i}`;
        results.push({ ip, hostname: '', mac: '', vendor: '', latency: null, status: false, deviceType: 'Unknown' });
      }
    }
    const selfIP = network.getLocalIP();
    return results.filter(d => {
      if (d.ip === selfIP || d.ip === 'N/A') return false;
      const firstOctet = parseInt(d.ip.split('.')[0], 10);
      if (firstOctet >= 224 && firstOctet <= 239) return false;
      if (d.ip === '255.255.255.255') return false;
      return true;
    });
  },

  async scanArp() {
    const isPrivateIP = (ip) => {
      const firstOctet = parseInt(ip.split('.')[0], 10);
      if (firstOctet >= 224 && firstOctet <= 239) return false;
      if (ip === '255.255.255.255' || ip === '0.0.0.0') return false;
      const parts = ip.split('.');
      if (parts.length === 4 && parseInt(parts[3], 10) === 255) return false;
      return true;
    };
    return new Promise((resolve) => {
      exec('arp -a', { timeout: 10000 }, (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        const devices = [];
        const lines = stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F:-]{17})\s+(dynamic|static)/);
          if (match) {
            const ip = match[1];
            if (!isPrivateIP(ip)) continue;
            const mac = match[2].replace(/-/g, ':');
            const vendor = extractMacVendor(mac);
            devices.push({ ip, hostname: '', mac, vendor, latency: null, status: true, deviceType: 'Unknown' });
          }
        }
        resolve(devices);
      });
    });
  },

  getLocalSubnet() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const parts = iface.address.split('.');
          parts[3] = '0';
          return parts.join('.') + '/24';
        }
      }
    }
    return '192.168.1.0/24';
  }
};

module.exports = scanService;
