const chalk = require('../utils/theme');
const scanService = require('../services/scan');
const store = require('../config/store');
const logger = require('../services/logging');
const historyService = require('../services/history');
const formatter = require('../utils/formatter');
const trafficService = require('../services/traffic');
const internetService = require('../services/internet');
const network = require('../utils/network');

function repeat(char, n) {
  return Array(Math.max(0, n + 1)).join(char);
}

function progressBar(pct, width = 12) {
  const filled = Math.max(0, Math.min(width, Math.round(pct / 100 * width)));
  const color = pct >= 90 ? chalk.red : pct >= 70 ? chalk.yellow : chalk.green;
  return color('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(width - filled));
}

function sparkline(values, width = 18) {
  const chars = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  if (!values || values.length === 0) return chalk.gray(repeat('\u2581', width));
  const slice = values.slice(-width);
  const max = Math.max.apply(null, slice.concat([1]));
  return slice.map(v => chars[Math.min(7, Math.floor((v / max) * 8))]).join('');
}

function shortMac(mac) {
  if (!mac || mac === 'N/A') return chalk.gray('-');
  const parts = String(mac).replace(/-/g, ':').split(':');
  return parts.slice(0, 3).join(':') + '\u2026';
}

function fmtTime(date) {
  return date.toLocaleTimeString();
}

function fmtElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const watchService = {
  async execute(options) {
    const interval = (options && options.interval) || store.getConfig().watchInterval || 10;
    const duration = options && options.duration ? options.duration * 60 * 1000 : Infinity;
    const startTime = Date.now();

    let scanCount = 0;
    let lastScanTime = null;
    let nextScanAt = startTime + interval * 1000;
    let scanning = false;
    const events = [];
    const onlineHistory = [];
    const previous = {};
    let deviceList = [];
    let counts = { online: 0, offline: 0, trusted: 0, unknown: 0, total: 0 };
    let traffic = null;
    let internet = { online: null, latency: null };
    let lastTrafficAt = 0;
    let lastInternetAt = 0;
    let alerts = [];

    const recordEvent = (type, device) => {
      events.unshift({
        time: new Date(),
        type,
        ip: device.ip,
        mac: device.mac,
        vendor: device.vendor,
        hostname: device.hostname
      });
      if (events.length > 8) events.length = 8;
    };

    const refreshTraffic = () => {
      const now = Date.now();
      if (now - lastTrafficAt >= 2000) {
        traffic = trafficService.getTrafficSnapshot() || traffic;
        lastTrafficAt = now;
      }
    };

    const refreshInternet = async () => {
      const now = Date.now();
      if (now - lastInternetAt >= interval * 1000) {
        lastInternetAt = now;
        const result = await internetService.checkConnectivity().catch(() => ({ online: false, latency: null }));
        internet = result;
      }
    };

    const buildDeviceList = (scanDevices) => {
      const scanMap = new Map();
      for (const d of scanDevices) scanMap.set(d.ip, d);
      const stored = store.getDevices();
      const list = [];
      const seen = new Set();
      for (const sd of scanDevices) {
        const st = stored.find(x => x.ip === sd.ip);
        list.push({ ...st, ...sd, online: true });
        seen.add(sd.ip);
      }
      for (const st of stored) {
        if (!seen.has(st.ip)) {
          list.push({ ...st, online: false });
        }
      }
      list.sort((a, b) => (b.online - a.online) || String(a.ip || '').localeCompare(String(b.ip || ''), undefined, { numeric: true }));
      return list;
    };

    const render = () => {
      const now = new Date();
      const width = Math.min(76, Math.max(46, process.stdout.columns || 76));
      const rule = chalk.bold.cyan(repeat('\u2594', width - 4));
      const nicknames = store.getNicknames();
      const out = [];

      out.push(`  ${rule}`);
      out.push(`  ${chalk.bold.cyan('WATCH MODE')} ${chalk.dim('\u2014 LIVE NETWORK MONITOR')}  ${chalk.dim(fmtTime(now))}`);
      out.push(`  ${rule}`);
      out.push('');

      const elapsed = Date.now() - startTime;
      const nextIn = Math.max(0, Math.ceil((nextScanAt - Date.now()) / 1000));
      out.push(`  ${chalk.dim('Scan')} #${scanCount}  ${chalk.dim('\u2502')}  ${chalk.dim('Interval')} ${interval}s  ${chalk.dim('\u2502')}  ${chalk.dim('Elapsed')} ${fmtElapsed(elapsed)}`);
      out.push(`  ${chalk.dim('Last scan')} ${lastScanTime ? chalk.white(fmtTime(lastScanTime)) : chalk.gray('--:--:--')}  ${chalk.dim('\u2502')}  ${chalk.dim('Next')} ${chalk.yellow(nextIn + 's')}`);
      out.push('');

      out.push(`  ${chalk.green('\u25CF')} Online  ${chalk.bold(String(counts.online).padStart(3))}    ${chalk.red('\u25CB')} Offline  ${chalk.bold(String(counts.offline).padStart(3))}    ${chalk.yellow('\u2605')} Trusted  ${chalk.bold(String(counts.trusted).padStart(3))}`);
      out.push(`  ${chalk.gray('\u003F')} Unknown  ${chalk.bold(String(counts.unknown).padStart(3))}    ${chalk.cyan('\u2261')} Total  ${chalk.bold(String(counts.total).padStart(3))}    ${chalk.dim('Trend')} ${sparkline(onlineHistory)}`);
      out.push('');

      out.push(`  ${chalk.bold('DEVICES')} ${chalk.gray(`(${counts.total})`)}`);
      out.push(`  ${chalk.gray('#'.padStart(3))}  ${chalk.gray('IP'.padEnd(15))} ${chalk.gray('NAME'.padEnd(20))} ${chalk.gray('VENDOR'.padEnd(18))} ${chalk.gray('SEEN')}`);
      out.push(`  ${chalk.gray(repeat('\u2500', width - 5))}`);
      if (deviceList.length === 0) {
        out.push(`  ${chalk.dim('No devices discovered yet...')}`);
      }
      for (let i = 0; i < Math.min(10, deviceList.length); i++) {
        const d = deviceList[i];
        const name = (d.mac && nicknames[d.mac.toUpperCase()]) || d.hostname || (d.vendor && d.vendor !== 'Unknown' ? chalk.dim(d.vendor) : chalk.gray('?'));
        const vendor = (d.vendor && d.vendor !== 'Unknown') ? d.vendor : chalk.gray('-');
        const seen = d.firstSeen ? new Date(d.firstSeen).toLocaleDateString() : chalk.gray('-');
        const ip = d.online ? formatter.deviceIP(d.ip) : chalk.gray(d.ip || '?');
        const mark = d.mac && store.isTrusted(d.mac) ? chalk.yellow(' \u2605') : '';
        const mac = d.mac ? ` ${chalk.dim(shortMac(d.mac))}` : '';
        out.push(`  ${chalk.gray(String(i + 1).padStart(3))}  ${String(ip).padEnd(15)} ${String(name).padEnd(20)} ${String(vendor).padEnd(18)} ${String(seen)}${mark}${mac}`);
      }
      if (deviceList.length > 10) {
        out.push(`  ${chalk.dim(`... and ${deviceList.length - 10} more`)}`);
      }
      out.push('');

      out.push(`  ${chalk.bold('RECENT EVENTS')}`);
      if (events.length === 0) {
        out.push(`  ${chalk.dim('Waiting for devices to join or leave...')}`);
      }
      for (const ev of events) {
        const sign = ev.type === 'join' ? chalk.green('+') : chalk.red('-');
        const label = ev.type === 'join' ? chalk.green('JOIN') : chalk.red('LEAVE');
        out.push(`  ${chalk.dim(fmtTime(ev.time))}  ${sign} ${label.padEnd(5)} ${formatter.deviceIP(ev.ip)}  ${chalk.dim(ev.vendor && ev.vendor !== 'Unknown' ? ev.vendor : '')}`);
      }
      out.push('');

      refreshTraffic();
      const up = traffic ? traffic.uploadSpeed : 0;
      const down = traffic ? traffic.downloadSpeed : 0;
      const cpu = traffic ? traffic.cpuPercent : 0;
      const mem = traffic ? traffic.memoryPercent : 0;
      out.push(`  ${chalk.bold('TRAFFIC')}`);
      out.push(`  ${chalk.cyan('\u2191')} Upload   ${chalk.white(formatter.bitsPerSecond(up).padStart(14))}   ${chalk.cyan('\u2193')} Download ${chalk.white(formatter.bitsPerSecond(down).padStart(14))}`);
      out.push(`  ${chalk.yellow('\u25A3')} CPU      ${progressBar(cpu)} ${String(cpu).padStart(3)}%    ${chalk.blue('\u25A3')} Memory   ${progressBar(mem)} ${String(mem).padStart(3)}%`);
      out.push('');

      const alertsList = alerts.slice(0, 2);
      if (alertsList.length > 0) {
        out.push(`  ${chalk.bold('ALERTS')}`);
        for (const a of alertsList) {
          out.push(`  ${chalk.yellow('\u26A0')} ${a.message || a.type}`);
        }
        out.push('');
      }

      const gw = network.getGateway();
      const internetTxt = internet.online === null
        ? chalk.dim('checking...')
        : internet.online
          ? chalk.green('\u2713 Connected') + (internet.latency ? chalk.dim(` (${internet.latency}ms)`) : '')
          : chalk.red('\u2717 Disconnected');
      out.push(`  ${chalk.bold('NETWORK')}   Internet: ${internetTxt}   ${chalk.dim('Gateway')} ${gw}`);
      out.push('');
      out.push(`  ${chalk.dim('Press Ctrl+C to stop')}`);
      out.push('');

      if (process.stdout.isTTY && process.stdout.cursorTo) {
        process.stdout.cursorTo(0, 0);
        process.stdout.write('\x1B[J');
      }
      process.stdout.write(out.join('\n'));
    };

    const doScan = async () => {
      if (scanning) return;
      scanning = true;
      try {
        const subnet = scanService.getLocalSubnet();
        const devices = await scanService.scanNetwork(subnet);

        const current = {};
        for (const d of devices) {
          current[d.ip] = { ip: d.ip, mac: d.mac, hostname: d.hostname, vendor: d.vendor, status: d.status };
        }

        const newDevices = [];
        const goneDevices = [];

        for (const ip of Object.keys(current)) {
          if (!previous[ip]) {
            newDevices.push(current[ip]);
          }
        }

        for (const ip of Object.keys(previous)) {
          if (!current[ip]) {
            goneDevices.push(previous[ip]);
          }
        }

        for (const d of newDevices) {
          recordEvent('join', d);
          store.addDevice({ ip: d.ip, mac: d.mac, hostname: d.hostname, vendor: d.vendor, status: true });
          historyService.recordDeviceChange(d, 'online');
        }

        for (const d of goneDevices) {
          recordEvent('leave', d);
          store.updateDevice(d.ip, { online: false });
          historyService.recordDeviceChange(d, 'offline');
        }

        Object.assign(previous, current);
        for (const ip of Object.keys(previous)) {
          if (!current[ip]) delete previous[ip];
        }

        deviceList = buildDeviceList(devices);
        const onlineCount = deviceList.filter(d => d.online).length;
        counts = {
          online: onlineCount,
          offline: deviceList.filter(d => !d.online).length,
          trusted: deviceList.filter(d => d.mac && store.isTrusted(d.mac)).length,
          unknown: deviceList.filter(d => !d.vendor || d.vendor === 'Unknown').length,
          total: deviceList.length
        };
        onlineHistory.push(onlineCount);
        if (onlineHistory.length > 60) onlineHistory.shift();
        alerts = store.getAlerts();

        scanCount++;
        lastScanTime = new Date();
        nextScanAt = Date.now() + interval * 1000;
      } catch (err) {
        logger.error('Watch scan failed', { error: err.message });
        lastScanTime = new Date();
        nextScanAt = Date.now() + interval * 1000;
      } finally {
        scanning = false;
      }
      render();
    };

    await refreshInternet();
    await doScan();
    const scanTimer = setInterval(doScan, interval * 1000);
    const ticker = setInterval(() => {
      refreshTraffic();
      render();
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(scanTimer);
        clearInterval(ticker);
        if (process.stdout.isTTY && process.stdout.cursorTo) {
          process.stdout.cursorTo(0, 0);
          process.stdout.write('\x1B[J');
        }
        console.log(chalk.yellow(`\n  Watch duration reached after ${fmtElapsed(elapsed)}. Scans: ${scanCount}. Events: ${events.length}.\n`));
        process.exit(0);
      }
    }, 1000);

    process.on('SIGINT', () => {
      clearInterval(scanTimer);
      clearInterval(ticker);
      if (process.stdout.isTTY && process.stdout.cursorTo) {
        process.stdout.cursorTo(0, 0);
        process.stdout.write('\x1B[J');
      }
      const elapsed = Date.now() - startTime;
      console.log(chalk.yellow(`\n  Watch mode stopped after ${fmtElapsed(elapsed)}. Scans: ${scanCount}. Events: ${events.length}.\n`));
      process.exit(0);
    });
  }
};

module.exports = watchService;