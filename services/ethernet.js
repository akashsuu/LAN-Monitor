const { execSync, exec, spawnSync } = require('child_process');
const os = require('os');
const network = require('../utils/network');

const ethernetService = {
  getAdapterInfo() {
    const interfaces = os.networkInterfaces();
    const result = { name: '', ipv4: '', ipv6: '', mac: '', gateway: '', dns: '', speed: 'Unknown' };

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          result.name = name;
          result.ipv4 = iface.address;
          result.mac = iface.mac;
        }
        if (iface.family === 'IPv6' && !iface.internal) {
          result.ipv6 = iface.address;
        }
      }
    }

    result.gateway = network.getGateway();
    result.dns = network.getDNS();

    try {
      if (network.isWindows()) {
        const proc = spawnSync('wmic', ['nic', 'where', 'NetEnabled=true', 'get', 'Name,Speed'], { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] });
        if (proc.status === 0 && proc.stdout) {
          const lines = proc.stdout.split('\n').filter(l => l.trim());
          for (const line of lines) {
            if (!line.includes('Name') && !line.includes('Speed')) {
              const parts = line.trim().split(/\s{2,}/);
              if (parts.length >= 2 && parts[1].trim()) {
                const speedBps = parseInt(parts[1].trim(), 10);
                result.speed = speedBps ? `${(speedBps / 1000000000).toFixed(1)} Gbps` : 'Unknown';
              }
            }
          }
        }
      }
    } catch {
    }

    try {
      if (network.isWindows()) {
        const proc = spawnSync('wmic', ['nic', 'where', 'NetEnabled=true', 'get', 'Name,AdapterTypeId'], { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] });
        if (proc.status === 0 && proc.stdout) {
          if (proc.stdout.includes('Ethernet') || proc.stdout.includes('eth')) {
            result.type = 'Ethernet';
          } else if (proc.stdout.includes('Wireless') || proc.stdout.includes('Wi-Fi') || proc.stdout.includes('wlan')) {
            result.type = 'Wi-Fi';
          } else {
            result.type = 'Unknown';
          }
        }
      }
    } catch {
      result.type = 'Ethernet';
    }

    return result;
  },

  getStats() {
    const stats = { sent: 0, received: 0, upload: 0, download: 0, packetsSent: 0, packetsReceived: 0 };

    try {
      if (network.isWindows()) {
        const output = execSync('netstat -e', { encoding: 'utf8', timeout: 5000 });
        const lines = output.split('\n');
        for (const line of lines) {
          const bytesMatch = line.match(/Bytes\s+=\s+(\d+)\s+\((\d+)/);
          if (bytesMatch) {
            stats.received = parseInt(bytesMatch[1], 10);
            stats.sent = parseInt(bytesMatch[2], 10);
          }
          const packetsMatch = line.match(/(\d+)\s+(\d+)\s+(\d+)/);
          if (packetsMatch && line.includes('Unicast')) {
            stats.packetsSent = parseInt(packetsMatch[2], 10);
            stats.packetsReceived = parseInt(packetsMatch[1], 10);
          }
        }
      }
    } catch {
    }

    return stats;
  },

  resetAdapter() {
    return new Promise((resolve) => {
      try {
        if (network.isWindows()) {
          exec('ipconfig /release', (err1) => {
            if (err1) {
              resolve({ success: false, error: err1.message });
              return;
            }
            setTimeout(() => {
              exec('ipconfig /renew', (err2) => {
                if (err2) {
                  resolve({ success: false, error: err2.message });
                  return;
                }
                resolve({ success: true, error: null });
              });
            }, 2000);
          });
        } else {
          exec('sudo systemctl restart NetworkManager', (err) => {
            if (err) {
              resolve({ success: false, error: err.message });
              return;
            }
            resolve({ success: true, error: null });
          });
        }
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }
};

module.exports = ethernetService;
