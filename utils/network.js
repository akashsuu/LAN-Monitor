const { execSync } = require('child_process');
const os = require('os');
const dns = require('dns');

const network = {
  isWindows() {
    return os.platform() === 'win32';
  },

  getDefaultInterface() {
    try {
      if (this.isWindows()) {
        const output = execSync('route print 0.0.0.0', { encoding: 'utf8', timeout: 5000 });
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('0.0.0.0') && line.includes('On-link')) continue;
          if (line.includes('0.0.0.0')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              return { gateway: parts[2], interface: parts[3], metric: parts[4] };
            }
          }
        }
      } else {
        const output = execSync('ip route | grep default', { encoding: 'utf8', timeout: 5000 });
        const parts = output.trim().split(/\s+/);
        return { gateway: parts[2], interface: parts[4] };
      }
    } catch {
    }
    return null;
  },

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  },

  getLocalIPv6() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv6' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '::1';
  },

  getMAC() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.mac;
        }
      }
    }
    return '00:00:00:00:00:00';
  },

  getDNS() {
    try {
      const servers = dns.getServers();
      if (servers.length > 0) return servers[0];
    } catch {
    }
    return 'Unknown';
  },

  getGateway() {
    const info = this.getDefaultInterface();
    return info ? info.gateway : 'Unknown';
  },

  isValidIP(str) {
    const parts = str.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  },

  isLocalIP(ip) {
    if (!ip) return false;
    if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') return true;
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.address === ip) return true;
      }
    }
    return false;
  },

  getLocalIPs() {
    const ips = ['127.0.0.1', 'localhost', '::1'];
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4') {
          ips.push(iface.address);
        }
      }
    }
    return [...new Set(ips)];
  },

  isValidHostname(str) {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(str);
  }
};

module.exports = network;
