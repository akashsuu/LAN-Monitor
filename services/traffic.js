const { execSync } = require('child_process');
const os = require('os');
const network = require('../utils/network');

const SAMPLE_HISTORY = [];
const MAX_SAMPLES = 60;

let previousStats = null;

function getWindowsNetStats() {
  try {
    const output = execSync('cmd /c "netstat -e"', { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = output.split('\n');
    let bytesSent = 0;
    let bytesRecv = 0;
    for (const line of lines) {
      const bytesMatch = line.match(/Bytes\s+(\d+)\s+(\d+)/i);
      if (bytesMatch) {
        bytesRecv = parseInt(bytesMatch[1], 10);
        bytesSent = parseInt(bytesMatch[2], 10);
        break;
      }
    }
    return { bytesSent, bytesRecv, timestamp: Date.now() };
  } catch {
    return null;
  }
}

function getLinuxNetStats() {
  try {
    const iface = network.getDefaultInterface();
    const ifName = iface ? iface.interface : 'eth0';
    const output = execSync(`cat /sys/class/net/${ifName}/statistics/tx_bytes /sys/class/net/${ifName}/statistics/rx_bytes 2>/dev/null`, { encoding: 'utf8', timeout: 3000 });
    const parts = output.trim().split('\n');
    const bytesSent = parseInt(parts[0], 10);
    const bytesRecv = parseInt(parts[1], 10);
    return { bytesSent, bytesRecv, timestamp: Date.now() };
  } catch {
    return null;
  }
}

function getNetStats() {
  if (network.isWindows()) {
    return getWindowsNetStats();
  }
  return getLinuxNetStats();
}

function getCPUUsage() {
  try {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
  } catch {
    return null;
  }
}

let previousCPU = null;

function calculateCPUPercent() {
  const current = getCPUUsage();
  if (!current || !previousCPU) {
    previousCPU = current;
    return 0;
  }
  const idleDelta = current.idle - previousCPU.idle;
  const totalDelta = current.total - previousCPU.total;
  previousCPU = current;
  if (totalDelta === 0) return 0;
  return Math.round((1 - idleDelta / totalDelta) * 100);
}

const trafficService = {
  getTrafficSnapshot() {
    const stats = getNetStats();
    if (!stats) return null;

    let uploadSpeed = 0;
    let downloadSpeed = 0;

    if (previousStats) {
      const timeDelta = (stats.timestamp - previousStats.timestamp) / 1000;
      if (timeDelta > 0) {
        uploadSpeed = Math.max(0, (stats.bytesSent - previousStats.bytesSent) / timeDelta);
        downloadSpeed = Math.max(0, (stats.bytesRecv - previousStats.bytesRecv) / timeDelta);
      }
    }

    previousStats = stats;

    const snapshot = {
      timestamp: stats.timestamp,
      bytesSent: stats.bytesSent,
      bytesRecv: stats.bytesRecv,
      uploadSpeed,
      downloadSpeed,
      cpuPercent: calculateCPUPercent(),
      memoryPercent: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      totalMem: os.totalmem(),
      freeMem: os.freemem()
    };

    SAMPLE_HISTORY.push(snapshot);
    if (SAMPLE_HISTORY.length > MAX_SAMPLES) SAMPLE_HISTORY.shift();

    return snapshot;
  },

  getHistory() {
    return [...SAMPLE_HISTORY];
  },

  getAverage() {
    if (SAMPLE_HISTORY.length === 0) return { upload: 0, download: 0 };
    const sum = SAMPLE_HISTORY.reduce((acc, s) => {
      acc.upload += s.uploadSpeed;
      acc.download += s.downloadSpeed;
      return acc;
    }, { upload: 0, download: 0 });
    return {
      upload: sum.upload / SAMPLE_HISTORY.length,
      download: sum.download / SAMPLE_HISTORY.length
    };
  },

  getPeak() {
    if (SAMPLE_HISTORY.length === 0) return { upload: 0, download: 0 };
    let upPeak = 0;
    let downPeak = 0;
    for (const s of SAMPLE_HISTORY) {
      if (s.uploadSpeed > upPeak) upPeak = s.uploadSpeed;
      if (s.downloadSpeed > downPeak) downPeak = s.downloadSpeed;
    }
    return { upload: upPeak, download: downPeak };
  },

  getTotalSent() {
    return previousStats ? previousStats.bytesSent : 0;
  },

  getTotalReceived() {
    return previousStats ? previousStats.bytesRecv : 0;
  },

  reset() {
    previousStats = null;
    SAMPLE_HISTORY.length = 0;
  }
};

module.exports = trafficService;
