const os = require('os');
const { execSync, spawnSync } = require('child_process');

const system = {
  getUptime() {
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  },

  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      total,
      free,
      used,
      percentage: (used / total) * 100
    };
  },

  getCPUUsage() {
    try {
      if (process.platform === 'win32') {
        const result = spawnSync('wmic', ['cpu', 'get', 'loadpercentage'], { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] });
        if (result.status === 0 && result.stdout) {
          const match = result.stdout.match(/(\d+)/);
          if (match) return parseInt(match[1], 10);
        }
      } else {
        const output = execSync("top -bn1 | grep 'Cpu(s)'", { encoding: 'utf8', timeout: 3000 });
        const match = output.match(/(\d+\.\d+)\s*id/);
        if (match) return parseFloat((100 - parseFloat(match[1])).toFixed(1));
      }
    } catch {
    }
    return os.cpus().reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / os.cpus().length;
  },

  getOSInfo() {
    return {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      arch: os.arch(),
      type: os.type()
    };
  },

  getNodeVersion() {
    return process.version;
  },

  getNetworkInterfaces() {
    return os.networkInterfaces();
  }
};

module.exports = system;
