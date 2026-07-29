const { execSync } = require('child_process');
const os = require('os');

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
      if (this.isWindows()) {
        const output = execSync('nslookup google.com 2>nul', { encoding: 'utf8', timeout: 5000 });
        const dnsMatch = output.match(/Address:\s+([0-9.]+)/);
        if (dnsMatch) return dnsMatch[1];
      } else {
        const output = execSync('cat /etc/resolv.conf', { encoding: 'utf8', timeout: 3000 });
        const match = output.match(/nameserver\s+(\S+)/);
        if (match) return match[1];
      }
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

  isValidHostname(str) {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(str);
  }
};

module.exports = network;
