const { exec } = require('child_process');
const network = require('../utils/network');
const dnsService = require('./dns');

function parsePingWindows(output) {
  const lines = output.split('\n');
  const replies = [];
  let average = null;
  let packetLoss = 0;

  for (const line of lines) {
    const timeMatch = line.match(/time[=<](\d+)ms/);
    if (timeMatch) {
      replies.push(parseInt(timeMatch[1], 10));
    }
    const lossMatch = line.match(/\((\d+)%\) loss/);
    if (lossMatch) {
      packetLoss = parseInt(lossMatch[1], 10);
    }
    const avgMatch = line.match(/Average = (\d+)ms/);
    if (avgMatch) {
      average = parseInt(avgMatch[1], 10);
    }
  }

  if (replies.length === 0 && lines.length > 0) {
    const simpleMatch = output.match(/Reply from.*?time[=<](\d+)ms/);
    if (simpleMatch) {
      replies.push(parseInt(simpleMatch[1], 10));
    }
  }

  if (average === null && replies.length > 0) {
    average = replies.reduce((a, b) => a + b, 0) / replies.length;
  }

  return { replies, average, packetLoss };
}

function parsePingLinux(output) {
  const lines = output.split('\n');
  const replies = [];
  let average = null;
  let packetLoss = 0;

  for (const line of lines) {
    const timeMatch = line.match(/time=(\d+\.?\d*)\s*ms/);
    if (timeMatch) {
      replies.push(parseFloat(timeMatch[1]));
    }
    const lossMatch = line.match(/(\d+)% packet loss/);
    if (lossMatch) {
      packetLoss = parseInt(lossMatch[1], 10);
    }
    const rttMatch = line.match(/rtt min\/avg\/max\/mdev = [\d.]+\/([\d.]+)/);
    if (rttMatch) {
      average = parseFloat(rttMatch[1]);
    }
  }

  if (average === null && replies.length > 0) {
    average = replies.reduce((a, b) => a + b, 0) / replies.length;
  }

  return { replies, average, packetLoss };
}

const pingService = {
  async ping(host, count = 4) {
    return new Promise((resolve) => {
      try {
        const isWin = network.isWindows();
        const pingCmd = isWin
          ? `ping -n ${count} ${host}`
          : `ping -c ${count} ${host}`;

        exec(pingCmd, { timeout: 30000 }, (error, stdout) => {
          if (error && !stdout) {
            resolve({ host, resolvedIP: null, replies: [], average: null, packetLoss: 100, online: false, error: error.message });
            return;
          }

          let result;
          if (isWin) {
            result = parsePingWindows(stdout);
          } else {
            result = parsePingLinux(stdout);
          }

          let resolvedIP = null;
          if (isWin) {
            const ipMatch = stdout.match(/\[([0-9.]+)\]/) || stdout.match(/Pinging\s+\S+\s+\[?([0-9.]+)\]?/);
            if (ipMatch) resolvedIP = ipMatch[1];
          } else {
            const ipMatch = stdout.match(/\(([0-9.]+)\)/);
            if (ipMatch) resolvedIP = ipMatch[1];
          }

          resolve({
            host,
            resolvedIP,
            replies: result.replies,
            average: result.average,
            packetLoss: result.packetLoss,
            online: result.packetLoss < 100,
            error: null
          });
        });
      } catch (err) {
        resolve({ host, resolvedIP: null, replies: [], average: null, packetLoss: 100, online: false, error: err.message });
      }
    });
  },

  async resolveDNS(host) {
    const result = await dnsService.lookup(host);
    return result.addresses[0] || null;
  }
};

module.exports = pingService;
